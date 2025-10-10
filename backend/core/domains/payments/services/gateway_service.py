# backend/core/domains/payments/services/gateway_service.py
import logging
import time
from decimal import Decimal

import stripe

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

# Configure Stripe client timeout (in seconds)
# Set to 60s to prevent indefinite hangs while allowing reasonable API response time
stripe.max_network_retries = 2
stripe.default_http_client = stripe.http_client.RequestsClient(timeout=60)

# Stripe minimum charge amounts by currency
# Based on Stripe's $0.50 USD minimum requirement
STRIPE_MINIMUM_CHARGE = {
    'PHP': Decimal('29.00'),   # ~$0.50 USD at ₱58 = $1
    'USD': Decimal('0.50'),
    'EUR': Decimal('0.50'),
    'GBP': Decimal('0.30'),
    'SGD': Decimal('0.70'),
    'MYR': Decimal('2.20'),
    'AUD': Decimal('0.50'),
    'CAD': Decimal('0.50'),
    'JPY': Decimal('50'),      # Zero-decimal currency
}


def get_stripe_minimum(currency: str) -> Decimal:
    """Get minimum charge for Stripe in given currency"""
    return STRIPE_MINIMUM_CHARGE.get(currency, Decimal('0.50'))


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
        gateway = None

        if payment_method_id:
            try:
                payment_method = PaymentMethod.objects.get(pk=payment_method_id)
                payment.payment_method = payment_method
                payment.save(update_fields=['payment_method'])
            except PaymentMethod.DoesNotExist:
                raise PaymentMethodNotFoundException(f"Payment method with ID {payment_method_id} not found")

            # Get the gateway from the payment method
            gateway = payment_method.gateway

            # If payment method doesn't have a gateway, try to infer it
            if not gateway:
                logger.warning(f"Payment method {payment_method_id} has no gateway configured. Attempting to infer gateway.")

                # For saved payment methods with token_reference, assume Stripe
                if payment_method.token_reference:
                    gateway = PaymentGateway.objects.filter(code='stripe', is_active=True).first()
                    if gateway:
                        logger.info(f"Inferred Stripe gateway for payment method {payment_method_id} based on token_reference")
                    else:
                        logger.error("No active Stripe gateway found for payment method with token_reference")
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
                elif payment_data.get('payment_method'):
                    # Use saved payment method from database
                    from ..models import PaymentMethod
                    try:
                        saved_payment_method = PaymentMethod.objects.get(id=payment_data['payment_method'])
                        logger.info(f"Found saved payment method: {saved_payment_method.nickname or saved_payment_method.get_type_display()}")

                        # Extract the Stripe payment method ID from the saved payment method
                        if saved_payment_method.token_reference:
                            stripe_payment_method_id = saved_payment_method.token_reference
                            logger.info(f"Using saved payment method token reference: {stripe_payment_method_id}")

                            # For saved payment methods, we need to ensure they're attached to a customer
                            # Create or get a Stripe customer for this user
                            user_email = payment.event.client.email if payment.event.client else ''
                            user_name = f"{payment.event.client.first_name} {payment.event.client.last_name}".strip() if payment.event.client else ''

                            logger.info(f"Creating/getting Stripe customer for user: {user_email}")

                            try:
                                # Try to find existing customer by email
                                start_time = time.time()
                                logger.info(f"⏱️  Starting Stripe Customer.list API call for {user_email}")
                                customers = stripe.Customer.list(email=user_email, limit=1)
                                elapsed = time.time() - start_time
                                logger.info(f"⏱️  Stripe Customer.list completed in {elapsed:.2f}s")
                                if customers.data:
                                    customer = customers.data[0]
                                    logger.info(f"Found existing Stripe customer: {customer.id}")
                                else:
                                    # Create new customer
                                    start_time = time.time()
                                    logger.info(f"⏱️  Starting Stripe Customer.create API call for {user_email}")
                                    customer = stripe.Customer.create(
                                        email=user_email,
                                        name=user_name,
                                        metadata={
                                            'user_id': payment.event.client.id if payment.event.client else '',
                                            'created_by': 'lifeplace_invoice_payment'
                                        }
                                    )
                                    elapsed = time.time() - start_time
                                    logger.info(f"⏱️  Stripe Customer.create completed in {elapsed:.2f}s")
                                    logger.info(f"Created new Stripe customer: {customer.id}")

                                # Attach payment method to customer if not already attached
                                try:
                                    start_time = time.time()
                                    logger.info(f"⏱️  Starting Stripe PaymentMethod.retrieve API call")
                                    payment_method_obj = stripe.PaymentMethod.retrieve(stripe_payment_method_id)
                                    elapsed = time.time() - start_time
                                    logger.info(f"⏱️  Stripe PaymentMethod.retrieve completed in {elapsed:.2f}s")

                                    if not payment_method_obj.customer:
                                        start_time = time.time()
                                        logger.info(f"⏱️  Starting Stripe PaymentMethod.attach API call")
                                        stripe.PaymentMethod.attach(
                                            stripe_payment_method_id,
                                            customer=customer.id
                                        )
                                        elapsed = time.time() - start_time
                                        logger.info(f"⏱️  Stripe PaymentMethod.attach completed in {elapsed:.2f}s")
                                        logger.info(f"Attached payment method {stripe_payment_method_id} to customer {customer.id}")
                                    else:
                                        logger.info(f"Payment method {stripe_payment_method_id} already attached to customer")

                                except stripe.error.StripeError as attach_error:
                                    logger.warning(f"Could not attach payment method to customer: {attach_error}")
                                    # Continue anyway - maybe it's already attached

                                # Use the customer in the payment intent
                                intent_data['customer'] = customer.id
                                intent_data['payment_method'] = stripe_payment_method_id

                            except stripe.error.StripeError as customer_error:
                                logger.error(f"Failed to create/get Stripe customer: {customer_error}")
                                # Fallback: try without customer (may fail, but let's try)
                                intent_data['payment_method'] = stripe_payment_method_id

                        else:
                            logger.error(f"Saved payment method {saved_payment_method.id} has no token_reference")
                            raise PaymentGatewayException(f"Saved payment method has no external Stripe ID")
                    except PaymentMethod.DoesNotExist:
                        logger.error(f"Payment method with ID {payment_data['payment_method']} not found")
                        raise PaymentGatewayException(f"Payment method with ID {payment_data['payment_method']} not found")
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
                    start_time = time.time()
                    logger.info(f"⏱️  Starting Stripe PaymentIntent.create API call")
                    intent = stripe.PaymentIntent.create(**intent_data)
                    elapsed = time.time() - start_time
                    logger.info(f"⏱️  Stripe PaymentIntent.create completed in {elapsed:.2f}s")
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

                    # Save payment method if requested and not already saved
                    if payment_data.get('save_payment_method', False) and intent.payment_method:
                        PaymentGatewayService._save_stripe_payment_method(
                            intent.payment_method, payment.event.client, gateway
                        )

                    # Defer payment completion until after atomic transaction
                    transaction.on_commit(lambda: payment.complete_payment())
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
        for field in ['name', 'is_active', 'description']:
            if field in data:
                setattr(gateway, field, data[field])

        # Handle config updates more carefully - merge with existing config
        if 'config' in data:
            existing_config = gateway.get_decrypted_config() or {}
            new_config = data['config'] or {}

            # Merge configurations, allowing new values to overwrite existing ones
            # but preserving existing values when new ones are empty/None
            merged_config = existing_config.copy()

            for key, value in new_config.items():
                if value is not None and value != '':
                    merged_config[key] = value
                # Don't remove existing keys if new value is empty

            gateway.config = merged_config

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

    @staticmethod
    def create_setup_intent(user, gateway_code='stripe'):
        """Create a setup intent for saving payment methods"""
        try:
            # Get the specified gateway
            try:
                gateway = PaymentGateway.objects.get(code=gateway_code, is_active=True)
            except PaymentGateway.DoesNotExist:
                raise PaymentGatewayException(f"Gateway '{gateway_code}' not found or inactive")

            if gateway_code.lower() == 'stripe':
                return PaymentGatewayService._create_stripe_setup_intent(user, gateway)
            else:
                raise PaymentGatewayException(f"Setup intent not supported for gateway '{gateway_code}'")

        except Exception as e:
            logger.error(f"Failed to create setup intent: {str(e)}")
            raise

    @staticmethod
    def _create_stripe_setup_intent(user, gateway):
        """Create Stripe setup intent for saving payment methods"""
        try:
            # Get Stripe configuration from gateway
            config = gateway.get_decrypted_config()
            stripe_secret_key = config.get('secret_key')

            if not stripe_secret_key:
                raise PaymentGatewayException("Stripe secret key not configured")

            stripe.api_key = stripe_secret_key

            # Create setup intent for future payments
            # This will create a reusable payment method
            setup_intent = stripe.SetupIntent.create(
                usage='off_session',  # For future payments
                payment_method_types=['card'],  # Specify payment method types
                metadata={
                    'user_id': user.id,
                    'user_email': user.email,
                    'purpose': 'save_payment_method'
                }
            )

            logger.info(f"Created Stripe setup intent {setup_intent.id} for user {user.id}")

            return {
                'success': True,
                'setup_intent_id': setup_intent.id,
                'client_secret': setup_intent.client_secret,
                'status': setup_intent.status,
                'gateway': gateway.code
            }

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating setup intent: {str(e)}")
            raise PaymentGatewayException(f"Stripe error: {str(e)}")
        except Exception as e:
            logger.error(f"Error creating Stripe setup intent: {str(e)}")
            raise PaymentGatewayException(f"Failed to create setup intent: {str(e)}")

    @staticmethod
    def _save_stripe_payment_method(stripe_payment_method_id, user, gateway):
        """Save Stripe payment method for future use"""
        try:
            from .payment_method_service import PaymentMethodService

            # Get Stripe configuration from gateway
            config = gateway.get_decrypted_config()
            stripe_secret_key = config.get('secret_key')

            if not stripe_secret_key:
                logger.error("Stripe secret key not configured")
                return

            stripe.api_key = stripe_secret_key

            # Retrieve payment method from Stripe
            stripe_pm = stripe.PaymentMethod.retrieve(stripe_payment_method_id)

            # Check if we already have this payment method saved
            existing_pm = PaymentMethod.objects.filter(
                user=user,
                token_reference=stripe_payment_method_id,
                gateway=gateway
            ).first()

            if existing_pm:
                logger.info(f"Payment method {stripe_payment_method_id} already exists for user {user.id}")
                return existing_pm

            # Determine payment method type
            pm_type = 'CREDIT_CARD'
            if stripe_pm.type == 'card':
                pm_type = 'CREDIT_CARD'
            elif stripe_pm.type in ['us_bank_account', 'sepa_debit']:
                pm_type = 'BANK_TRANSFER'

            # Extract card information if available
            last_four = ''
            card_brand = ''
            exp_month = None
            exp_year = None

            if stripe_pm.card:
                last_four = stripe_pm.card.last4
                card_brand = stripe_pm.card.brand
                exp_month = stripe_pm.card.exp_month
                exp_year = stripe_pm.card.exp_year

            # Create payment method data
            pm_data = {
                'type': pm_type,
                'user': user.id,
                'gateway': gateway.id,
                'token_reference': stripe_payment_method_id,
                'last_four': last_four,
                'nickname': f"{card_brand.capitalize()} ending in {last_four}" if card_brand and last_four else "Saved Payment Method",
                'is_default': not PaymentMethod.objects.filter(user=user).exists(),  # First payment method is default
                'metadata': {
                    'card_brand': card_brand,
                    'exp_month': exp_month,
                    'exp_year': exp_year,
                    'stripe_payment_method_type': stripe_pm.type
                },
                'exp_month': exp_month,
                'exp_year': exp_year
            }

            # Create the payment method
            payment_method = PaymentMethodService.create_payment_method(pm_data, user)

            logger.info(f"Successfully saved Stripe payment method {stripe_payment_method_id} for user {user.id}")
            return payment_method

        except Exception as e:
            logger.error(f"Failed to save Stripe payment method: {str(e)}", exc_info=True)
            # Don't raise exception - saving payment method failure shouldn't break payment flow
            return None