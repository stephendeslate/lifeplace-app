# backend/core/domains/payments/services/payment_method_service.py
from django.db import transaction

from ..exceptions import PaymentMethodNotFoundException
from ..models import Payment, PaymentGateway, PaymentMethod


class PaymentMethodService:
    """Service for managing payment methods"""
    
    @staticmethod
    def create_payment_method(data, user):
        """Create a new payment method"""
        import logging
        logger = logging.getLogger(__name__)
        # Log only safe fields - never log tokens or full data
        logger.debug(f"PaymentMethodService.create_payment_method - type={data.get('type')}, user_id={user.id}")

        user_id = data.get('user', user.id)

        # Validate type
        method_type = data.get('type')
        if not method_type or method_type not in [choice[0] for choice in PaymentMethod._meta.get_field('type').choices]:
            raise ValueError(f"Invalid payment method type: {method_type}")

        # Handle credit card validation if needed
        if method_type == 'CREDIT_CARD':
            # For Stripe payment methods, we don't require last_four if we have stripe_payment_method_id
            has_stripe_payment_method = data.get('stripe_payment_method_id')
            last_four = data.get('last_four')

            logger.info(f"Credit card validation - last_four: '{last_four}', has_stripe_payment_method: '{has_stripe_payment_method}'")

            # Be more lenient for Stripe payment methods - if we have a Stripe payment method ID,
            # we should allow it even if last_four is empty (Stripe may not always provide it)
            if not has_stripe_payment_method and not last_four:
                logger.error(f"Validation failed - missing stripe_payment_method_id and last_four")
                raise ValueError("Either Stripe payment method ID or last four digits required for credit card")

            # If we have a Stripe payment method but no last_four, try to get it from metadata or allow empty
            if has_stripe_payment_method and not last_four:
                logger.info(f"Stripe payment method provided but no last_four - this is acceptable")
                # Could attempt to extract from metadata if available
                metadata = data.get('metadata', {})
                if 'last_four' in metadata:
                    data['last_four'] = metadata['last_four']
                    logger.info(f"Extracted last_four from metadata: {metadata['last_four']}")
        
        # Get gateway if provided
        gateway = None
        gateway_id = data.get('gateway')
        if gateway_id:
            try:
                gateway = PaymentGateway.objects.get(pk=gateway_id)
            except PaymentGateway.DoesNotExist:
                raise ValueError(f"Payment gateway with ID {gateway_id} not found")
        
        # Handle Stripe payment method data
        stripe_payment_method_id = data.get('stripe_payment_method_id')
        token_reference = data.get('token_reference', stripe_payment_method_id or '')

        # Build metadata for additional card information
        metadata = data.get('metadata', {})
        if data.get('card_brand'):
            metadata['card_brand'] = data.get('card_brand')
        if data.get('exp_month'):
            metadata['exp_month'] = data.get('exp_month')
        if data.get('exp_year'):
            metadata['exp_year'] = data.get('exp_year')

        # Set expiry date from exp_month and exp_year if provided
        expiry_date = data.get('expiry_date')
        if not expiry_date and data.get('exp_month') and data.get('exp_year'):
            from datetime import date
            try:
                expiry_date = date(int(data.get('exp_year')), int(data.get('exp_month')), 1)
            except (ValueError, TypeError):
                pass

        # Create the payment method
        with transaction.atomic():
            payment_method = PaymentMethod.objects.create(
                user_id=user_id,
                type=method_type,
                is_default=data.get('is_default', False),
                nickname=data.get('nickname', ''),
                instructions=data.get('instructions', ''),
                gateway=gateway,
                token_reference=token_reference,
                last_four=data.get('last_four', ''),
                expiry_date=expiry_date,
                metadata=metadata
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