# backend/core/domains/payments/services/payment_method_service.py
from django.db import transaction

from ..exceptions import PaymentMethodNotFoundException
from ..models import Payment, PaymentGateway, PaymentMethod


class PaymentMethodService:
    """Service for managing payment methods"""
    
    @staticmethod
    def create_payment_method(data, user):
        """Create a new payment method"""
        user_id = data.get('user', user.id)
        
        # Validate type
        method_type = data.get('type')
        if not method_type or method_type not in [choice[0] for choice in PaymentMethod._meta.get_field('type').choices]:
            raise ValueError(f"Invalid payment method type: {method_type}")
        
        # Handle credit card validation if needed
        if method_type == 'CREDIT_CARD':
            if not data.get('last_four'):
                raise ValueError("Last four digits required for credit card")
        
        # Get gateway if provided
        gateway = None
        gateway_id = data.get('gateway')
        if gateway_id:
            try:
                gateway = PaymentGateway.objects.get(pk=gateway_id)
            except PaymentGateway.DoesNotExist:
                raise ValueError(f"Payment gateway with ID {gateway_id} not found")
        
        # Create the payment method
        with transaction.atomic():
            payment_method = PaymentMethod.objects.create(
                user_id=user_id,
                type=method_type,
                is_default=data.get('is_default', False),
                nickname=data.get('nickname', ''),
                instructions=data.get('instructions', ''),
                gateway=gateway,
                token_reference=data.get('token_reference', ''),
                last_four=data.get('last_four', ''),
                expiry_date=data.get('expiry_date'),
                metadata=data.get('metadata', {})
            )
            
            return payment_method
    
    @staticmethod
    def update_payment_method(method_id, data, user):
        """Update a payment method"""
        try:
            payment_method = PaymentMethod.objects.get(pk=method_id)
        except PaymentMethod.DoesNotExist:
            raise PaymentMethodNotFoundException(f"Payment method with ID {method_id} not found")
        
        # Verify user has access to this payment method
        if payment_method.user.id != user.id and not user.is_staff:
            raise PermissionError("You don't have permission to modify this payment method")
        
        # Update allowed fields
        for field in ['nickname', 'is_default', 'instructions', 'expiry_date']:
            if field in data:
                setattr(payment_method, field, data[field])
        
        payment_method.save()
        return payment_method
    
    @staticmethod
    def delete_payment_method(method_id, user):
        """Delete a payment method"""
        try:
            payment_method = PaymentMethod.objects.get(pk=method_id)
        except PaymentMethod.DoesNotExist:
            raise PaymentMethodNotFoundException(f"Payment method with ID {method_id} not found")
        
        # Verify user has access to this payment method
        if payment_method.user.id != user.id and not user.is_staff:
            raise PermissionError("You don't have permission to delete this payment method")
        
        # Check if method is used in pending payments
        has_pending_payments = Payment.objects.filter(
            payment_method=payment_method, 
            status='PENDING'
        ).exists()
        
        if has_pending_payments:
            raise ValueError("Cannot delete a payment method with pending payments")
        
        payment_method.delete()