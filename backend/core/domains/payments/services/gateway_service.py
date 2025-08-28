# backend/core/domains/payments/services/gateway_service.py
import logging

from django.db import transaction
from django.utils import timezone

from ..exceptions import (
    PaymentAlreadyCompletedException,
    PaymentGatewayException,
    PaymentMethodNotFoundException,
    PaymentNotFoundException,
)
from ..models import (
    Payment,
    PaymentGateway,
    PaymentMethod,
    PaymentTransaction,
)

logger = logging.getLogger(__name__)


class PaymentGatewayService:
    """Service for processing payments through gateways"""

    @staticmethod
    def _get_payment_currency(payment):
        """
        Determine the currency for a payment.
        Priority:
        1. Payment currency field
        2. Currency from event's product options
        3. Default to PHP (95% of business is in Philippines)
        """
        # Use payment's currency field (now available)
        if payment.currency:
            return payment.currency
        
        # Try to get currency from event's product options as fallback
        if payment.event and hasattr(payment.event, 'product_options'):
            # Get the first product's currency if available
            product_option = payment.event.product_options.first()
            if product_option and hasattr(product_option, 'currency'):
                return product_option.currency
        
        # Default to PHP since 95% of business is in Philippines
        return 'PHP'

    @staticmethod
    def process_gateway_payment(payment_id, gateway_code, payment_data, user):
        """Process payment through any gateway - routes to appropriate processor"""
        
        # Route to appropriate gateway processor
        if gateway_code == 'stripe':
            return PaymentGatewayService._process_stripe_payment(payment_id, payment_data, user)
        elif gateway_code == 'paypal':
            return PaymentGatewayService._process_paypal_payment(payment_id, payment_data, user)
        elif gateway_code == 'square':
            return PaymentGatewayService._process_square_payment(payment_id, payment_data, user)
        else:
            raise PaymentGatewayException(f"Unsupported gateway: {gateway_code}")

    @staticmethod
    def process_payment(payment_id, payment_data, user):
        """Legacy method - process a payment through a payment gateway"""
        try:
            payment = Payment.objects.get(pk=payment_id)
        except Payment.DoesNotExist:
            raise PaymentNotFoundException(f"Payment with ID {payment_id} not found")
        
        # Check if already completed
        if payment.status == 'COMPLETED':
            raise PaymentAlreadyCompletedException("This payment is already completed")
        
        # Get payment method and gateway
        payment_method_id = payment_data.get('payment_method')
        if payment_method_id:
            try:
                payment_method = PaymentMethod.objects.get(pk=payment_method_id)
                payment.payment_method = payment_method
                payment.save(update_fields=['payment_method'])
            except PaymentMethod.DoesNotExist:
                raise PaymentMethodNotFoundException(f"Payment method with ID {payment_method_id} not found")
        
            # Get the gateway from the payment method
            gateway = payment_method.gateway
        else:
            # Get gateway directly from payment data
            gateway_id = payment_data.get('gateway_id')
            if not gateway_id:
                raise PaymentGatewayException("No payment gateway or method specified")
            
            try:
                gateway = PaymentGateway.objects.get(id=gateway_id, is_active=True)
            except PaymentGateway.DoesNotExist:
                raise PaymentGatewayException(f"Payment gateway with ID {gateway_id} not found or inactive")
        
        if not gateway:
            raise PaymentGatewayException("No payment gateway configured")
        
        # Route to appropriate gateway processor
        return PaymentGatewayService.process_gateway_payment(
            payment_id, gateway.code, payment_data, user
        )

    @staticmethod
    def _process_stripe_payment(payment_id, payment_data, user):
        """Process payment through Stripe gateway"""
        import stripe
        
        try:
            payment = Payment.objects.get(pk=payment_id)
        except Payment.DoesNotExist:
            raise PaymentNotFoundException(f"Payment with ID {payment_id} not found")
        
        # Get Stripe gateway config
        gateway_id = payment_data.get('gateway_id')
        if gateway_id:
            gateway = PaymentGateway.objects.get(id=gateway_id, code='stripe')
        elif payment.payment_method and payment.payment_method.gateway:
            gateway = payment.payment_method.gateway
        else:
            # Fallback to first active Stripe gateway
            gateway = PaymentGateway.objects.filter(code='stripe', is_active=True).first()
            if not gateway:
                raise PaymentGatewayException("No active Stripe gateway found")
        
        stripe.api_key = gateway.config['secret_key']
        
        with transaction.atomic():
            try:
                # Determine currency for payment
                payment_currency = PaymentGatewayService._get_payment_currency(payment)
                
                # Create payment intent with Stripe
                intent_data = {
                    'amount': int(payment.amount * 100),  # Convert to cents
                    'currency': payment_currency.lower(),
                    'confirmation_method': 'manual',
                    'confirm': True,
                }
                
                # Add payment method
                if payment_data.get('payment_method_token'):
                    intent_data['payment_method'] = payment_data['payment_method_token']
                elif payment_data.get('payment_method_id'):
                    # Use existing payment method
                    intent_data['payment_method'] = payment_data['payment_method_id']
                
                # Add metadata
                intent_data['metadata'] = {
                    'payment_id': payment.id,
                    'event_id': payment.event.id,
                    'client_email': payment.event.client.email if payment.event.client else '',
                }
                
                intent = stripe.PaymentIntent.create(**intent_data)
                
                # Record transaction
                transaction_record = PaymentTransaction.objects.create(
                    payment=payment,
                    gateway=gateway,
                    transaction_id=intent.id,
                    amount=payment.amount,
                    currency=payment_currency,
                    status='PROCESSING',
                    response_data=intent,
                    is_test=payment_data.get('is_test', False)
                )
                
                # Handle Stripe response
                if intent.status == 'succeeded':
                    transaction_record.status = 'COMPLETED'
                    transaction_record.save()
                    payment.complete_payment()
                elif intent.status == 'requires_action':
                    # Handle 3D Secure or other authentication
                    transaction_record.status = 'PENDING'
                    transaction_record.response_data = {
                        **intent,
                        'client_secret': intent.client_secret,
                        'next_action': intent.next_action
                    }
                    transaction_record.save()
                else:
                    transaction_record.status = 'FAILED'
                    transaction_record.error_message = f"Payment intent status: {intent.status}"
                    transaction_record.save()
                    payment.status = 'FAILED'
                    payment.save()
                
                return transaction_record
                
            except stripe.error.StripeError as e:
                # Handle Stripe errors
                transaction_record = PaymentTransaction.objects.create(
                    payment=payment,
                    gateway=gateway,
                    transaction_id='',
                    amount=payment.amount,
                    currency=payment_currency,
                    status='FAILED',
                    error_message=str(e),
                    response_data={'error': str(e), 'error_type': type(e).__name__},
                    is_test=payment_data.get('is_test', False)
                )
                
                payment.status = 'FAILED'
                payment.save()
                
                raise PaymentGatewayException(f"Stripe error: {str(e)}")

    @staticmethod
    def _process_paypal_payment(payment_id, payment_data, user):
        """Process payment through PayPal gateway"""
        # PayPal implementation would go here
        raise PaymentGatewayException("PayPal integration not yet implemented")

    @staticmethod
    def _process_square_payment(payment_id, payment_data, user):
        """Process payment through Square gateway"""
        # Square implementation would go here
        raise PaymentGatewayException("Square integration not yet implemented")

    @staticmethod
    def create_gateway(data, user):
        """Create a new payment gateway configuration"""
        # Only staff can create gateways
        if not user.is_staff:
            raise PermissionError("Only staff members can manage payment gateways")
        
        # Check for required fields
        if not data.get('name') or not data.get('code'):
            raise ValueError("Name and code are required for payment gateways")
        
        # Check if code already exists
        if PaymentGateway.objects.filter(code=data.get('code')).exists():
            raise ValueError(f"Payment gateway with code {data.get('code')} already exists")
        
        # Create gateway
        gateway = PaymentGateway.objects.create(
            name=data.get('name'),
            code=data.get('code'),
            is_active=data.get('is_active', True),
            config=data.get('config', {}),
            description=data.get('description', '')
        )
        
        return gateway
    
    @staticmethod
    def update_gateway(gateway_id, data, user):
        """Update a payment gateway configuration"""
        # Only staff can update gateways
        if not user.is_staff:
            raise PermissionError("Only staff members can manage payment gateways")
        
        try:
            gateway = PaymentGateway.objects.get(pk=gateway_id)
        except PaymentGateway.DoesNotExist:
            raise ValueError(f"Payment gateway with ID {gateway_id} not found")
        
        # Update fields
        for field in ['name', 'is_active', 'config', 'description']:
            if field in data:
                setattr(gateway, field, data[field])
        
        # Code can only be updated if not used in any payment methods
        if 'code' in data and data['code'] != gateway.code:
            has_methods = PaymentMethod.objects.filter(gateway=gateway).exists()
            if has_methods:
                raise ValueError("Cannot change code for a gateway that is in use")
            gateway.code = data['code']
        
        gateway.save()
        return gateway
    
    @staticmethod
    def delete_gateway(gateway_id, user):
        """Delete a payment gateway"""
        # Only staff can delete gateways
        if not user.is_staff:
            raise PermissionError("Only staff members can manage payment gateways")
        
        try:
            gateway = PaymentGateway.objects.get(pk=gateway_id)
        except PaymentGateway.DoesNotExist:
            raise ValueError(f"Payment gateway with ID {gateway_id} not found")
        
        # Check if gateway is used in any payment methods
        has_methods = PaymentMethod.objects.filter(gateway=gateway).exists()
        if has_methods:
            raise ValueError("Cannot delete a gateway that is in use")
        
        gateway.delete()