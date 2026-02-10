# backend/core/domains/payments/client_views.py

import logging
from decimal import Decimal
from django.db import models
from django.db.models import OuterRef, Prefetch, Subquery
from django.db.models.functions import Coalesce
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
    PaymentMethod,
    PaymentTransaction,
    Refund,
)
from .serializers import (
    InvoicePaymentRequestSerializer,
    InvoiceSerializer,
    PaymentIntentResponseSerializer,
    PaymentSerializer,
    PaymentMethodSerializer,
    RefundSerializer,
)
from .services import (
    PaymentMethodService,
    PaymentService,
)
from .services.invoice_service import InvoiceService
from .services.gateway_service import PaymentGatewayService
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
        ).defer(
            'payment_method__gateway__config',  # Avoid decrypting gateway secrets not needed for display
        ).prefetch_related(
            Prefetch(
                'transactions',
                queryset=PaymentTransaction.objects.select_related('gateway').defer('gateway__config'),
            ),
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
        """Get payment summary for client

        Returns summary based on:
        - total_paid: Sum of COMPLETED payments (accurate)
        - total_pending: Sum of remaining balance on unpaid/partially paid invoices (invoice-based)
        - total_overdue: Sum of remaining balance on overdue invoices (invoice-based)

        This provides an accurate view of outstanding balance based on invoices,
        not just payment record status.
        """
        queryset = self.get_queryset()

        # Get completed payments total
        total_paid = queryset.filter(status='COMPLETED').aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0.00')

        # Get invoice-based outstanding balance for accurate pending/overdue amounts
        # This is more accurate than counting PENDING payment records
        if self.request.user.role == 'ADMIN' or self.request.user.is_superuser:
            invoice_queryset = Invoice.objects.all()
        else:
            invoice_queryset = Invoice.objects.filter(client=self.request.user)

        # Filter to only unpaid/partially paid invoices (exclude PAID and CANCELLED)
        unpaid_invoices = invoice_queryset.filter(
            status__in=['ISSUED', 'PARTIALLY_PAID']
        )

        # Calculate remaining balance for each invoice using annotation
        # paid_amount and remaining_amount are properties, so we need to compute them
        # by summing related completed payments and subtracting from total_amount

        # Subquery to calculate paid amount for each invoice
        paid_subquery = Payment.objects.filter(
            invoice=OuterRef('pk'),
            status='COMPLETED'
        ).values('invoice').annotate(
            paid_sum=models.Sum('amount')
        ).values('paid_sum')[:1]

        # Annotate invoices with calculated remaining balance
        unpaid_invoices_with_balance = unpaid_invoices.annotate(
            calculated_paid=Coalesce(Subquery(paid_subquery), Decimal('0.00')),
            calculated_remaining=models.F('total_amount') - Coalesce(Subquery(paid_subquery), Decimal('0.00'))
        )

        # Calculate total pending (remaining balance on all unpaid invoices)
        total_pending = unpaid_invoices_with_balance.aggregate(
            total=models.Sum('calculated_remaining')
        )['total'] or Decimal('0.00')

        # Calculate total overdue (remaining balance on overdue invoices)
        total_overdue = unpaid_invoices_with_balance.filter(
            due_date__lt=timezone.now().date()
        ).aggregate(
            total=models.Sum('calculated_remaining')
        )['total'] or Decimal('0.00')

        summary = {
            'total_paid': total_paid,
            'total_pending': total_pending,
            'total_overdue': total_overdue,
            'payment_count': queryset.count(),
            'completed_count': queryset.filter(status='COMPLETED').count(),
            'pending_count': unpaid_invoices.count(),  # Count of unpaid invoices
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
        """Process invoice payment (supports full and deposit payments)"""
        try:
            invoice = self.get_object()

            # Validate invoice can be paid (allow PARTIALLY_PAID for subsequent payments)
            if invoice.status not in ['ISSUED', 'PARTIALLY_PAID']:
                return Response(
                    {"detail": f"Cannot pay invoice with status {invoice.get_status_display()}. Only issued or partially paid invoices can be paid."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate payment data (now includes payment_type field)
            serializer = InvoicePaymentRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            payment_data = serializer.validated_data

            # OVER-PAYMENT PREVENTION: Pre-validate payment amount against remaining balance
            payment_type = payment_data.get('payment_type', 'FULL')

            # Calculate requested payment amount
            if payment_type == 'DEPOSIT':
                # Use PaymentTermsResolver to get effective deposit percentage
                # (booking flow override or global default)
                from .services.payment_terms_resolver import PaymentTermsResolver
                terms = PaymentTermsResolver.get_terms_for_event(invoice.event_id)
                deposit_percentage = Decimal(str(terms.get('deposit_percentage', 50)))
                requested_amount = (invoice.total_amount * deposit_percentage) / Decimal('100')
            else:
                # For FULL payment type, use remaining amount
                requested_amount = payment_data.get('amount', invoice.remaining_amount)

            # Validate minimum payment amount (prevent zero-amount payments)
            MINIMUM_PAYMENT_AMOUNT = Decimal('50.00')  # Minimum payment of 50 PHP
            if requested_amount <= Decimal('0'):
                return Response({
                    'success': False,
                    'error': 'Payment amount must be greater than zero',
                    'error_code': 'INVALID_AMOUNT',
                }, status=status.HTTP_400_BAD_REQUEST)

            if requested_amount < MINIMUM_PAYMENT_AMOUNT:
                return Response({
                    'success': False,
                    'error': f'Payment amount must be at least {MINIMUM_PAYMENT_AMOUNT}',
                    'error_code': 'BELOW_MINIMUM',
                    'details': {
                        'minimum_amount': str(MINIMUM_PAYMENT_AMOUNT),
                        'requested_amount': str(requested_amount)
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

            # Validate against remaining balance
            if requested_amount > invoice.remaining_amount:
                return Response({
                    'success': False,
                    'error': 'Payment amount exceeds remaining balance',
                    'error_code': 'EXCEEDS_BALANCE',
                    'details': {
                        'requested_amount': str(requested_amount),
                        'remaining_balance': str(invoice.remaining_amount),
                        'total_amount': str(invoice.total_amount),
                        'paid_amount': str(invoice.paid_amount)
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

            try:
                # Process invoice payment using service (handles both FULL and DEPOSIT)
                payment_result = InvoiceService.process_invoice_payment(
                    invoice, payment_data, request.user
                )

                if payment_result.get('success'):
                    payment = payment_result.get('payment')
                    # Refresh invoice from DB to get updated status
                    invoice.refresh_from_db()
                    return Response({
                        'success': True,
                        'message': payment_result.get('message', 'Payment processed successfully'),
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
        """Create payment intent for invoice payment with Stripe/gateway (supports deposit)"""
        try:
            invoice = self.get_object()

            # Validate invoice can be paid (allow PARTIALLY_PAID for subsequent payments)
            if invoice.status not in ['ISSUED', 'PARTIALLY_PAID']:
                return Response(
                    {"detail": f"Cannot create payment intent for invoice with status {invoice.get_status_display()}"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get gateway code, payment type, and custom amount from request
            gateway_code = request.data.get('gateway_code', 'stripe')
            payment_type = request.data.get('payment_type', 'FULL')
            custom_amount = request.data.get('amount')  # For CUSTOM payment type

            try:
                # Create payment intent using service (with payment_type and custom amount support)
                intent_result = InvoiceService.create_payment_intent_for_invoice(
                    invoice, gateway_code, payment_type, custom_amount
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

        return queryset.select_related('user', 'gateway').defer('gateway__config').order_by('-is_default', '-created_at')

    def create(self, request, *args, **kwargs):
        """Create a new payment method"""
        # Prepare data with user validation
        data = request.data.copy()

        # Ensure user can only create payment methods for themselves
        if request.user.role != 'ADMIN' and not request.user.is_superuser:
            data['user'] = request.user.id

        try:
            method = PaymentMethodService.create_payment_method(data, request.user)
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

    @action(detail=False, methods=['post'])
    def setup_intent(self, request):
        """Create a setup intent for saving payment methods"""
        try:
            # Get gateway code from request, default to stripe
            gateway_code = request.data.get('gateway_code', 'stripe')

            # Create setup intent using the gateway service
            setup_intent_result = PaymentGatewayService.create_setup_intent(
                request.user, gateway_code
            )

            if setup_intent_result.get('success'):
                # Import the serializer at the function level to avoid circular imports
                from .serializers import SetupIntentResponseSerializer

                # Serialize and return the response
                response_data = SetupIntentResponseSerializer({
                    'setup_intent_id': setup_intent_result.get('setup_intent_id'),
                    'client_secret': setup_intent_result.get('client_secret'),
                    'status': setup_intent_result.get('status'),
                    'gateway': setup_intent_result.get('gateway')
                }).data

                return Response(response_data, status=status.HTTP_200_OK)
            else:
                return Response(
                    {"detail": "Failed to create setup intent"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Error creating setup intent: {str(e)}")
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


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