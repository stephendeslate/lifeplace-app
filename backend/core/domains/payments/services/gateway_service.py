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
            logger.info(f"process_payment: gateway_id={gateway_id} (type: {type(gateway_id)})")
            if not gateway_id:
                raise PaymentGatewayException("No payment gateway or method specified")
            
            try:
                # CRITICAL FIX: Ensure gateway_id is integer for database lookup
                if isinstance(gateway_id, str) and gateway_id.isdigit():
                    gateway_id = int(gateway_id)
                elif isinstance(gateway_id, str) and not gateway_id.isdigit():
                    logger.warning(f"Invalid gateway_id format: '{gateway_id}', trying to find gateway by code")
                    # Try to find gateway by code if it's a string like 'stripe'
                    gateway = PaymentGateway.objects.filter(code=gateway_id, is_active=True).first()
                    if not gateway:
                        raise PaymentGatewayException(f"No active gateway found with code: {gateway_id}")
                    logger.info(f"Found gateway by code: {gateway.name}")
                else:
                    # gateway_id should be integer at this point
                    pass
                
                if not isinstance(gateway_id, str) or gateway_id.isdigit():
                    gateway = PaymentGateway.objects.get(id=int(gateway_id), is_active=True)
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
        
        logger.info(f"Starting Stripe payment processing for payment_id={payment_id}")
        logger.info(f"Stripe payment data: {payment_data}")
        logger.info(f"User: {user}")
        
        try:
            payment = Payment.objects.get(pk=payment_id)
            logger.info(f"Found payment record: {payment} (amount: {payment.amount} {payment.currency})")
        except Payment.DoesNotExist:
            logger.error(f"Payment with ID {payment_id} not found")
            raise PaymentNotFoundException(f"Payment with ID {payment_id} not found")
        
        # Get Stripe gateway config
        gateway_id = payment_data.get('gateway_id')
        logger.info(f"Getting Stripe gateway with ID: {gateway_id} (type: {type(gateway_id)})")
        
        gateway = None
        if gateway_id and isinstance(gateway_id, (int, str)) and str(gateway_id).isdigit():
            try:
                # Ensure gateway_id is integer for database lookup
                gateway_id_int = int(gateway_id)
                gateway = PaymentGateway.objects.get(id=gateway_id_int, code='stripe')
                logger.info(f"Found gateway by ID: {gateway.name}")
            except PaymentGateway.DoesNotExist:
                logger.error(f"Gateway with ID {gateway_id} not found")
                raise PaymentGatewayException(f"Gateway with ID {gateway_id} not found")
            except ValueError:
                logger.warning(f"Invalid gateway_id format: {gateway_id}, falling back to default")
                gateway = None
        
        if not gateway and payment.payment_method and payment.payment_method.gateway:
            gateway = payment.payment_method.gateway
            logger.info(f"Using gateway from payment method: {gateway.name}")
        
        if not gateway:
            # Fallback to first active Stripe gateway
            gateway = PaymentGateway.objects.filter(code='stripe', is_active=True).first()
            if not gateway:
                logger.error("No active Stripe gateway found")
                raise PaymentGatewayException("No active Stripe gateway found")
            logger.info(f"Using fallback gateway: {gateway.name}")
        
        # Check if gateway config exists
        if not gateway.config or 'secret_key' not in gateway.config:
            logger.error(f"Gateway {gateway.name} missing secret_key in config")
            raise PaymentGatewayException(f"Gateway {gateway.name} not properly configured")
        
        stripe.api_key = gateway.config['secret_key']
        logger.info(f"Set Stripe API key from gateway: {gateway.name}")
        
        with transaction.atomic():
            try:
                # Determine currency for payment
                payment_currency = PaymentGatewayService._get_payment_currency(payment)
                logger.info(f"Payment currency: {payment_currency}")
                
                # Create payment intent with Stripe
                intent_data = {
                    'amount': int(payment.amount * 100),  # Convert to cents
                    'currency': payment_currency.lower(),
                    'confirm': True,
                    'return_url': 'https://lifeplacealfonso.com/booking/complete',  # Required for redirect methods
                    'automatic_payment_methods': {
                        'enabled': True,
                        'allow_redirects': 'never'  # Disable redirect methods to avoid return_url requirement
                    }
                }
                
                logger.info(f"Base intent data: amount={intent_data['amount']}, currency={intent_data['currency']}")
                
                # Add payment method
                if payment_data.get('payment_method_token'):
                    intent_data['payment_method'] = payment_data['payment_method_token']
                    logger.info(f"Using payment method token: {payment_data['payment_method_token']}")
                elif payment_data.get('payment_method_id'):
                    # Use existing payment method
                    intent_data['payment_method'] = payment_data['payment_method_id']
                    logger.info(f"Using payment method ID: {payment_data['payment_method_id']}")
                else:
                    logger.error("No payment method provided in payment data")
                    raise PaymentGatewayException("No payment method provided")
                
                # Add metadata
                intent_data['metadata'] = {
                    'payment_id': payment.id,
                    'event_id': payment.event.id,
                    'client_email': payment.event.client.email if payment.event.client else '',
                }
                
                logger.info(f"Creating Stripe PaymentIntent with data: {intent_data}")
                
                try:
                    intent = stripe.PaymentIntent.create(**intent_data)
                    logger.info(f"PaymentIntent created successfully: {intent.id} (status: {intent.status})")
                except stripe.error.StripeError as stripe_error:
                    logger.error(f"Stripe API error: {stripe_error}")
                    raise
                
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