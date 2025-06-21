# backend/core/domains/payments/views.py
from core.utils.permissions import IsAdmin
from django.db import models
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import (
    Invoice,
    InvoiceLineItem,
    InvoiceTax,
    Payment,
    PaymentGateway,
    PaymentInstallment,
    PaymentMethod,
    PaymentNotification,
    PaymentPlan,
    PaymentTransaction,
    Refund,
    TaxRate,
)
from .serializers import (
    InvoiceLineItemSerializer,
    InvoiceSerializer,
    InvoiceTaxSerializer,
    PaymentGatewaySerializer,
    PaymentInstallmentSerializer,
    PaymentMethodSerializer,
    PaymentNotificationSerializer,
    PaymentPlanSerializer,
    PaymentSerializer,
    PaymentTransactionSerializer,
    RefundSerializer,
    TaxRateSerializer,
)
from .services import (
    InvoiceService,
    PaymentGatewayService,
    PaymentMethodService,
    PaymentPlanService,
    PaymentService,
    TaxRateService,
)


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payments"""
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-created_at')
        
        # Apply filters
        event_id = self.request.query_params.get('event', None)
        status = self.request.query_params.get('status', None)
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        search = self.request.query_params.get('search', None)
        payment_method = self.request.query_params.get('payment_method', None)
        is_manual = self.request.query_params.get('is_manual', None)
        amount_min = self.request.query_params.get('amount_min', None)
        amount_max = self.request.query_params.get('amount_max', None)
        
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        if start_date:
            queryset = queryset.filter(due_date__gte=start_date)
        
        if end_date:
            queryset = queryset.filter(due_date__lte=end_date)
        
        if search:
            queryset = queryset.filter(
                payment_number__icontains=search
            )
        
        if payment_method:
            queryset = queryset.filter(payment_method_id=payment_method)
        
        if is_manual:
            is_manual = is_manual.lower() == 'true'
            queryset = queryset.filter(is_manual=is_manual)
        
        if amount_min:
            queryset = queryset.filter(amount__gte=amount_min)
        
        if amount_max:
            queryset = queryset.filter(amount__lte=amount_max)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new payment"""
        try:
            payment = PaymentService.create_payment(request.data, request.user)
            serializer = self.get_serializer(payment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update an existing payment"""
        try:
            payment = PaymentService.update_payment(
                kwargs.get('pk'), request.data, request.user
            )
            serializer = self.get_serializer(payment)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """Process a payment through a payment gateway"""
        try:
            payment = PaymentService.process_payment(pk, request.data, request.user)
            serializer = self.get_serializer(payment)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def send_receipt(self, request, pk=None):
        """Send payment receipt to client"""
        try:
            payment = self.get_object()
            success = payment.send_receipt_notification()
            if success:
                return Response({"detail": "Receipt sent successfully"})
            else:
                return Response(
                    {"detail": "Receipt could not be sent"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentGatewayViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment gateways"""
    queryset = PaymentGateway.objects.all()
    serializer_class = PaymentGatewaySerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('name')
        
        # Apply filters
        is_active = self.request.query_params.get('is_active', None)
        search = self.request.query_params.get('search', None)
        
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active)
        
        if search:
            queryset = queryset.filter(
                models.Q(name__icontains=search) |
                models.Q(code__icontains=search)
            )
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new payment gateway"""
        try:
            gateway = PaymentGatewayService.create_gateway(request.data, request.user)
            serializer = self.get_serializer(gateway)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update an existing payment gateway"""
        try:
            gateway = PaymentGatewayService.update_gateway(
                kwargs.get('pk'), request.data, request.user
            )
            serializer = self.get_serializer(gateway)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a payment gateway"""
        try:
            PaymentGatewayService.delete_gateway(kwargs.get('pk'), request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TaxRateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tax rates"""
    queryset = TaxRate.objects.all()
    serializer_class = TaxRateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-is_default', 'name')
        
        # Apply filters
        is_default = self.request.query_params.get('is_default', None)
        region = self.request.query_params.get('region', None)
        search = self.request.query_params.get('search', None)
        
        if is_default is not None:
            is_default = is_default.lower() == 'true'
            queryset = queryset.filter(is_default=is_default)
        
        if region:
            queryset = queryset.filter(region__icontains=region)
        
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new tax rate"""
        try:
            tax_rate = TaxRateService.create_tax_rate(request.data, request.user)
            serializer = self.get_serializer(tax_rate)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update an existing tax rate"""
        try:
            tax_rate = TaxRateService.update_tax_rate(
                kwargs.get('pk'), request.data, request.user
            )
            serializer = self.get_serializer(tax_rate)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a tax rate"""
        try:
            TaxRateService.delete_tax_rate(kwargs.get('pk'), request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment methods"""
    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-is_default', '-created_at')
        
        # Non-admin users can only see their own payment methods
        if not self.request.user.is_staff and self.request.user.role != 'ADMIN':
            queryset = queryset.filter(user=self.request.user)
        
        # Apply filters
        user_id = self.request.query_params.get('user', None)
        method_type = self.request.query_params.get('type', None)
        is_default = self.request.query_params.get('is_default', None)
        gateway_id = self.request.query_params.get('gateway', None)
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        if method_type:
            queryset = queryset.filter(type=method_type)
        
        if is_default is not None:
            is_default = is_default.lower() == 'true'
            queryset = queryset.filter(is_default=is_default)
        
        if gateway_id:
            queryset = queryset.filter(gateway_id=gateway_id)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new payment method"""
        try:
            # Non-admin users can only create payment methods for themselves
            if not request.user.is_staff and request.user.role != 'ADMIN':
                if 'user' in request.data and int(request.data['user']) != request.user.id:
                    return Response(
                        {"detail": "You can only create payment methods for yourself"}, 
                        status=status.HTTP_403_FORBIDDEN
                    )
            
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
    
    @action(detail=False, methods=['get'])
    def for_user(self, request):
        """Get payment methods for a specific user"""
        user_id = self.request.query_params.get('user_id', None)
        
        # Non-admin users can only get their own methods
        if not request.user.is_staff and request.user.role != 'ADMIN':
            user_id = request.user.id
        
        if not user_id:
            return Response(
                {"detail": "user_id parameter is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(user_id=user_id)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class PaymentPlanViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment plans"""
    queryset = PaymentPlan.objects.all()
    serializer_class = PaymentPlanSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-created_at')
        
        # Apply filters
        event_id = self.request.query_params.get('event', None)
        
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new payment plan"""
        try:
            plan = PaymentPlanService.create_payment_plan(request.data, request.user)
            serializer = self.get_serializer(plan)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        """Update a payment plan (limited fields)"""
        try:
            plan = PaymentPlanService.update_payment_plan(
                kwargs.get('pk'), request.data, request.user
            )
            serializer = self.get_serializer(plan)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentInstallmentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment installments"""
    queryset = PaymentInstallment.objects.all()
    serializer_class = PaymentInstallmentSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('due_date')
        
        # Apply filters
        payment_plan_id = self.request.query_params.get('payment_plan', None)
        status = self.request.query_params.get('status', None)
        due_date_start = self.request.query_params.get('due_date_start', None)
        due_date_end = self.request.query_params.get('due_date_end', None)
        
        if payment_plan_id:
            queryset = queryset.filter(payment_plan_id=payment_plan_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        if due_date_start:
            queryset = queryset.filter(due_date__gte=due_date_start)
        
        if due_date_end:
            queryset = queryset.filter(due_date__lte=due_date_end)
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def create_payment(self, request, pk=None):
        """Create a payment for this installment"""
        try:
            payment = PaymentPlanService.create_payment_from_installment(
                pk, request.data, request.user
            )
            serializer = PaymentSerializer(payment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoices"""
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-created_at')
        
        # Apply filters
        event_id = self.request.query_params.get('event', None)
        client_id = self.request.query_params.get('client', None)
        status = self.request.query_params.get('status', None)
        search = self.request.query_params.get('search', None)
        
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        if search:
            queryset = queryset.filter(invoice_id__icontains=search)
        
        return queryset


class PaymentTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment transactions"""
    queryset = PaymentTransaction.objects.all()
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-created_at')
        
        # Apply filters
        payment_id = self.request.query_params.get('payment', None)
        gateway_id = self.request.query_params.get('gateway', None)
        status = self.request.query_params.get('status', None)
        
        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)
        
        if gateway_id:
            queryset = queryset.filter(gateway_id=gateway_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset


class RefundViewSet(viewsets.ModelViewSet):
    """ViewSet for managing refunds"""
    queryset = Refund.objects.all()
    serializer_class = RefundSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-created_at')
        
        # Apply filters
        payment_id = self.request.query_params.get('payment', None)
        status = self.request.query_params.get('status', None)
        
        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        return queryset


class InvoiceLineItemViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoice line items"""
    queryset = InvoiceLineItem.objects.all()
    serializer_class = InvoiceLineItemSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('id')
        
        # Apply filters
        invoice_id = self.request.query_params.get('invoice', None)
        
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)
        
        return queryset


class InvoiceTaxViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoice taxes"""
    queryset = InvoiceTax.objects.all()
    serializer_class = InvoiceTaxSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('id')
        
        # Apply filters
        invoice_id = self.request.query_params.get('invoice', None)
        
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)
        
        return queryset


class PaymentNotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment notifications"""
    queryset = PaymentNotification.objects.all()
    serializer_class = PaymentNotificationSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get_queryset(self):
        queryset = super().get_queryset().order_by('-created_at')
        
        # Apply filters
        payment_id = self.request.query_params.get('payment', None)
        notification_type = self.request.query_params.get('notification_type', None)
        is_successful = self.request.query_params.get('is_successful', None)
        
        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)
        
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        if is_successful is not None:
            is_successful = is_successful.lower() == 'true'
            queryset = queryset.filter(is_successful=is_successful)
        
        return queryset