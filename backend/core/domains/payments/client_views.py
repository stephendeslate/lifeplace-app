# backend/core/domains/payments/client_views.py

import logging
from decimal import Decimal
from django.db import models
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from core.utils.permissions import IsClientOwnerOrAdmin
from core.utils.pagination import StandardResultsSetPagination

from .models import (
    Invoice,
    Payment,
    PaymentInstallment,
    PaymentMethod,
    PaymentPlan,
    Refund,
)
from .serializers import (
    InvoicePaymentRequestSerializer,
    InvoiceSerializer,
    PaymentIntentResponseSerializer,
    PaymentPlanRequestSerializer,
    PaymentSerializer,
    PaymentInstallmentSerializer,
    PaymentMethodSerializer,
    PaymentPlanSerializer,
    RefundSerializer,
)
from .services import (
    PaymentMethodService,
    PaymentService,
)
from .services.invoice_service import InvoiceService
from .services.gateway_service import PaymentGatewayService
from .services.payment_plan_service import PaymentPlanService
from .pdf_service import PaymentReceiptPDFService

logger = logging.getLogger(__name__)


class ClientPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """Client access to their payment history"""
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsClientOwnerOrAdmin]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['created_at', 'due_date', 'paid_on', 'amount']
    ordering = ['-created_at']
    search_fields = ['payment_number', 'description', 'reference_number']

    def get_queryset(self):
        """Return payments for events where user is the client"""
        if not self.request.user.is_authenticated:
            return Payment.objects.none()

        # Admins see all payments
        if self.request.user.role == 'ADMIN' or self.request.user.is_superuser:
            queryset = Payment.objects.all()
        else:
            # Clients see only their payments
            queryset = Payment.objects.filter(event__client=self.request.user)

        return queryset.select_related(
            'event',
            'event__client',
            'event__event_type',
            'payment_method',
            'payment_method__gateway',
            'payment_method__user',
            'processed_by',
            'quote',
            'invoice',
            'installment',
            'installment__payment_plan'
        ).prefetch_related(
            'transactions__gateway',  # Include gateway information for transaction-based inference
            'notifications',
            'refunds'
        )

    def list(self, request, *args, **kwargs):
        """List payments with optional filtering"""
        queryset = self.get_queryset()
        
        # Apply additional filters
        status_filter = request.query_params.get('status')
        event_id = request.query_params.get('event')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if event_id:
            queryset = queryset.filter(event_id=event_id)
            
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
            
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)

        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def download_receipt(self, request, pk=None):
        """Download payment receipt PDF"""
        try:
            payment = self.get_object()
            
            # Validate payment has been completed
            if payment.status != 'COMPLETED':
                return Response(
                    {"detail": "Receipt is only available for completed payments"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate PDF receipt
            try:
                pdf_buffer = PaymentReceiptPDFService.generate_receipt_pdf(payment)
            except Exception as pdf_error:
                logger.error(f"PDF generation failed for payment {pk}: {pdf_error}", exc_info=True)
                return Response(
                    {"detail": "Failed to generate PDF. Please try again later or contact support."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Create response
            response = HttpResponse(
                pdf_buffer.getvalue(),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="receipt-{payment.payment_number}.pdf"'
            
            return response
            
        except Payment.DoesNotExist:
            return Response(
                {"detail": "Payment not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error downloading receipt for payment {pk}: {e}", exc_info=True)
            return Response(
                {"detail": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get payment summary for client"""
        queryset = self.get_queryset()
        
        summary = {
            'total_paid': queryset.filter(status='COMPLETED').aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0.00'),
            'total_pending': queryset.filter(status='PENDING').aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0.00'),
            'total_overdue': queryset.filter(
                status='PENDING',
                due_date__lt=timezone.now().date()
            ).aggregate(
                total=models.Sum('amount')
            )['total'] or Decimal('0.00'),
            'payment_count': queryset.count(),
            'completed_count': queryset.filter(status='COMPLETED').count(),
            'pending_count': queryset.filter(status='PENDING').count(),
        }
        
        return Response(summary)


class ClientInvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    """Client access to their invoices"""
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsClientOwnerOrAdmin]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    ordering_fields = ['created_at', 'issue_date', 'due_date', 'total_amount']
    ordering = ['-created_at']
    search_fields = ['invoice_id', 'notes']

    def get_queryset(self):
        """Return invoices for user"""
        if not self.request.user.is_authenticated:
            return Invoice.objects.none()

        # Admins see all invoices
        if self.request.user.role == 'ADMIN' or self.request.user.is_superuser:
            queryset = Invoice.objects.all()
        else:
            # Clients see only their invoices
            queryset = Invoice.objects.filter(client=self.request.user)

        return queryset.select_related(
            'event',
            'event__client',
            'event__event_type',
            'client',
            'quote',
            'quote__event',
            'quote__template'
        ).prefetch_related(
            'line_items',
            'line_items__product',
            'taxes',
            'taxes__tax_rate',
            'related_payments',
            'related_payments__payment_method'
        )

    def list(self, request, *args, **kwargs):
        """List invoices with optional filtering"""
        queryset = self.get_queryset()
        
        # Apply additional filters
        status_filter = request.query_params.get('status')
        event_id = request.query_params.get('event')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if event_id:
            queryset = queryset.filter(event_id=event_id)

        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def download_pdf(self, request, pk=None):
        """Download invoice PDF"""
        try:
            invoice = self.get_object()
            
            # Check if pre-generated PDF exists
            if invoice.invoice_pdf and hasattr(invoice.invoice_pdf, 'url'):
                try:
                    # If PDF already exists, redirect to it
                    from django.shortcuts import redirect
                    return redirect(invoice.invoice_pdf.url)
                except Exception as redirect_error:
                    logger.warning(f"Failed to redirect to invoice PDF URL: {redirect_error}")
            
            # Try to generate PDF using the PDF service
            try:
                from .pdf_service import PaymentReceiptPDFService
                pdf_buffer = PaymentReceiptPDFService.generate_invoice_receipt_pdf(invoice)
                
                # Create response
                response = HttpResponse(
                    pdf_buffer.getvalue(),
                    content_type='application/pdf'
                )
                response['Content-Disposition'] = f'attachment; filename="invoice-{invoice.invoice_id}.pdf"'
                
                return response
                
            except Exception as pdf_error:
                logger.error(f"PDF generation failed for invoice {pk}: {pdf_error}", exc_info=True)
                return Response(
                    {"detail": "Failed to generate invoice PDF. Please contact support."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Invoice.DoesNotExist:
            return Response(
                {"detail": "Invoice not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error downloading invoice PDF for invoice {pk}: {e}", exc_info=True)
            return Response(
                {"detail": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def pay(self, request, pk=None):
        """Process full invoice payment"""
        try:
            invoice = self.get_object()

            # Validate invoice can be paid
            if invoice.status != 'ISSUED':
                return Response(
                    {"detail": f"Cannot pay invoice with status {invoice.get_status_display()}. Only issued invoices can be paid."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate payment data
            serializer = InvoicePaymentRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            payment_data = serializer.validated_data

            try:
                # Process invoice payment using service
                payment_result = InvoiceService.process_invoice_payment(
                    invoice, payment_data, request.user
                )

                if payment_result.get('success'):
                    payment = payment_result.get('payment')
                    return Response({
                        'success': True,
                        'message': 'Payment processed successfully',
                        'payment': PaymentSerializer(payment).data,
                        'invoice': InvoiceSerializer(invoice).data
                    }, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'success': False,
                        'message': payment_result.get('error', 'Payment processing failed'),
                        'error_details': payment_result.get('details')
                    }, status=status.HTTP_400_BAD_REQUEST)

            except Exception as e:
                logger.error(f"Payment processing failed for invoice {pk}: {e}", exc_info=True)
                return Response({
                    'success': False,
                    'message': 'Payment processing failed',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)

        except Invoice.DoesNotExist:
            return Response(
                {"detail": "Invoice not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error processing payment for invoice {pk}: {e}", exc_info=True)
            return Response(
                {"detail": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def create_payment_intent(self, request, pk=None):
        """Create payment intent for invoice payment with Stripe/gateway"""
        try:
            invoice = self.get_object()

            # Validate invoice can be paid
            if invoice.status != 'ISSUED':
                return Response(
                    {"detail": f"Cannot create payment intent for invoice with status {invoice.get_status_display()}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get gateway code from request
            gateway_code = request.data.get('gateway_code', 'stripe')

            try:
                # Create payment intent using service
                intent_result = InvoiceService.create_payment_intent_for_invoice(
                    invoice, gateway_code
                )

                if intent_result.get('success'):
                    # Return payment intent data for frontend
                    response_data = PaymentIntentResponseSerializer({
                        'client_secret': intent_result.get('client_secret'),
                        'payment_intent_id': intent_result.get('payment_intent_id'),
                        'status': intent_result.get('status'),
                        'requires_action': intent_result.get('requires_action', False),
                        'next_action': intent_result.get('next_action'),
                        'payment_id': intent_result.get('payment_id'),
                        'transaction_id': intent_result.get('transaction_id')
                    }).data

                    return Response(response_data, status=status.HTTP_200_OK)
                else:
                    return Response({
                        'success': False,
                        'message': intent_result.get('error', 'Failed to create payment intent'),
                        'error_details': intent_result.get('details')
                    }, status=status.HTTP_400_BAD_REQUEST)

            except Exception as e:
                logger.error(f"Payment intent creation failed for invoice {pk}: {e}", exc_info=True)
                return Response({
                    'success': False,
                    'message': 'Failed to create payment intent',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)

        except Invoice.DoesNotExist:
            return Response(
                {"detail": "Invoice not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error creating payment intent for invoice {pk}: {e}", exc_info=True)
            return Response(
                {"detail": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def setup_payment_plan(self, request, pk=None):
        """Create payment plan for invoice"""
        try:
            invoice = self.get_object()

            # Validate invoice can have payment plan
            if invoice.status not in ['ISSUED']:
                return Response(
                    {"detail": f"Cannot create payment plan for invoice with status {invoice.get_status_display()}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if payment plan already exists for this event
            if hasattr(invoice.event, 'payment_plan'):
                return Response(
                    {"detail": "A payment plan already exists for this event"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate payment plan data
            serializer = PaymentPlanRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            plan_data = serializer.validated_data

            try:
                # Create payment plan using service
                payment_plan = InvoiceService.setup_payment_plan_for_invoice(
                    invoice, plan_data, request.user
                )

                return Response({
                    'success': True,
                    'message': 'Payment plan created successfully',
                    'payment_plan': PaymentPlanSerializer(payment_plan).data,
                    'invoice': InvoiceSerializer(invoice).data
                }, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.error(f"Payment plan creation failed for invoice {pk}: {e}", exc_info=True)
                return Response({
                    'success': False,
                    'message': 'Failed to create payment plan',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)

        except Invoice.DoesNotExist:
            return Response(
                {"detail": "Invoice not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Unexpected error creating payment plan for invoice {pk}: {e}", exc_info=True)
            return Response(
                {"detail": "An unexpected error occurred. Please try again later."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class ClientPaymentPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """Client access to their payment plans"""
    serializer_class = PaymentPlanSerializer
    permission_classes = [IsAuthenticated, IsClientOwnerOrAdmin]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Return payment plans for user's events"""
        if not self.request.user.is_authenticated:
            return PaymentPlan.objects.none()

        # Admins see all payment plans
        if self.request.user.role == 'ADMIN' or self.request.user.is_superuser:
            queryset = PaymentPlan.objects.all()
        else:
            # Clients see only their payment plans
            queryset = PaymentPlan.objects.filter(event__client=self.request.user)

        return queryset.select_related(
            'event',
            'event__client',
            'quote'
        ).prefetch_related(
            'installments',
            'installments__payment'
        )

    @action(detail=True, methods=['post'])
    def pay_installment(self, request, pk=None):
        """Make a payment for a specific installment"""
        try:
            payment_plan = self.get_object()
            installment_id = request.data.get('installment_id')
            
            if not installment_id:
                return Response(
                    {"detail": "installment_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the installment
            try:
                installment = payment_plan.installments.get(id=installment_id)
            except PaymentInstallment.DoesNotExist:
                return Response(
                    {"detail": "Installment not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Check if already paid
            if installment.status == 'PAID':
                return Response(
                    {"detail": "Installment already paid"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create payment for installment
            payment_data = {
                'event': payment_plan.event.id,
                'amount': str(installment.amount),
                'currency': payment_plan.currency,
                'due_date': installment.due_date,
                'description': f"Payment for {installment.description}",
                'installment': installment.id,
                **request.data  # Include any additional payment data
            }
            
            # Create payment using service
            payment = PaymentService.create_payment(payment_data, request.user)
            
            return Response(
                PaymentSerializer(payment).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Failed to create installment payment: {e}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ClientPaymentMethodViewSet(viewsets.ModelViewSet):
    """Client management of their payment methods"""
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated, IsClientOwnerOrAdmin]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Return payment methods for user"""
        if not self.request.user.is_authenticated:
            return PaymentMethod.objects.none()

        # Admins see all payment methods, clients see only their own
        if self.request.user.role == 'ADMIN' or self.request.user.is_superuser:
            queryset = PaymentMethod.objects.all()
        else:
            queryset = PaymentMethod.objects.filter(user=self.request.user)

        return queryset.select_related('user', 'gateway').order_by('-is_default', '-created_at')

    def create(self, request, *args, **kwargs):
        """Create a new payment method"""
        # Ensure user can only create payment methods for themselves
        if request.user.role != 'ADMIN' and not request.user.is_superuser:
            request.data['user'] = request.user.id

        try:
            method = PaymentMethodService.create_payment_method(request.data, request.user)
            serializer = self.get_serializer(method)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Update a payment method"""
        try:
            method = PaymentMethodService.update_payment_method(
                kwargs.get('pk'), request.data, request.user
            )
            serializer = self.get_serializer(method)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Delete a payment method"""
        try:
            PaymentMethodService.delete_payment_method(kwargs.get('pk'), request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class ClientRefundViewSet(viewsets.ReadOnlyModelViewSet):
    """Client access to their refunds"""
    serializer_class = RefundSerializer
    permission_classes = [IsAuthenticated, IsClientOwnerOrAdmin]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['created_at', 'amount']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return refunds for user's payments"""
        if not self.request.user.is_authenticated:
            return Refund.objects.none()

        # Admins see all refunds
        if self.request.user.role == 'ADMIN' or self.request.user.is_superuser:
            queryset = Refund.objects.all()
        else:
            # Clients see only refunds for their payments
            queryset = Refund.objects.filter(payment__event__client=self.request.user)

        return queryset.select_related(
            'payment',
            'payment__event',
            'payment__event__client',
            'refunded_by'
        )

    def list(self, request, *args, **kwargs):
        """List refunds with optional filtering"""
        queryset = self.get_queryset()
        
        # Apply additional filters
        status_filter = request.query_params.get('status')
        payment_id = request.query_params.get('payment')
        
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)

        # Apply pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class ClientPaymentInstallmentViewSet(viewsets.ReadOnlyModelViewSet):
    """Client access to payment installments"""
    serializer_class = PaymentInstallmentSerializer
    permission_classes = [IsAuthenticated, IsClientOwnerOrAdmin]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        """Return installments for user's payment plans"""
        if not self.request.user.is_authenticated:
            return PaymentInstallment.objects.none()

        # Admins see all installments
        if self.request.user.role == 'ADMIN' or self.request.user.is_superuser:
            queryset = PaymentInstallment.objects.all()
        else:
            # Clients see only their installments
            queryset = PaymentInstallment.objects.filter(
                payment_plan__event__client=self.request.user
            )

        return queryset.select_related(
            'payment_plan',
            'payment_plan__event',
            'payment_plan__event__client'
        ).prefetch_related('payment')

    @action(detail=True, methods=['post'])
    def create_payment(self, request, pk=None):
        """Create a payment for this installment"""
        try:
            installment = self.get_object()
            
            # Check if already paid
            if installment.status == 'PAID':
                return Response(
                    {"detail": "Installment already paid"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create payment for installment
            payment_data = {
                'event': installment.payment_plan.event.id,
                'amount': str(installment.amount),
                'currency': installment.payment_plan.currency,
                'due_date': installment.due_date,
                'description': f"Payment for {installment.description}",
                'installment': installment.id,
                **request.data  # Include any additional payment data
            }
            
            # Create payment using service
            payment = PaymentService.create_payment(payment_data, request.user)
            
            return Response(
                PaymentSerializer(payment).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            logger.error(f"Failed to create installment payment: {e}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )