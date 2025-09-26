# backend/core/domains/payments/services/payment_gateway_factory.py

import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class PaymentGatewayResponse:
    """
    Standardized response from payment gateway operations.

    This provides a consistent interface across all payment gateways.
    """
    def __init__(self, success: bool, transaction_id: str = None,
                 status: str = None, message: str = None,
                 requires_action: bool = False, client_secret: str = None,
                 response_data: Dict = None, error_code: str = None):
        self.success = success
        self.transaction_id = transaction_id
        self.status = status  # PENDING, COMPLETED, FAILED, CANCELLED
        self.message = message
        self.requires_action = requires_action
        self.client_secret = client_secret
        self.response_data = response_data or {}
        self.error_code = error_code

    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary for API serialization"""
        return {
            'success': self.success,
            'transaction_id': self.transaction_id,
            'status': self.status,
            'message': self.message,
            'requires_action': self.requires_action,
            'client_secret': self.client_secret,
            'response_data': self.response_data,
            'error_code': self.error_code
        }


class BasePaymentGateway(ABC):
    """
    Abstract base class for payment gateway implementations.

    All payment gateways must implement these methods to ensure
    consistent behavior across different providers.
    """

    def __init__(self, gateway_config: Dict[str, Any]):
        self.config = gateway_config
        self.gateway_code = self.config.get('code')
        self.is_test_mode = self.config.get('test_mode', False)

    @abstractmethod
    def create_payment_intent(self, amount: Decimal, currency: str,
                            payment_data: Dict[str, Any]) -> PaymentGatewayResponse:
        """
        Create a payment intent for the specified amount.

        Args:
            amount: Payment amount
            currency: Payment currency (ISO 4217 code)
            payment_data: Additional payment data

        Returns:
            PaymentGatewayResponse with payment intent details
        """
        pass

    @abstractmethod
    def confirm_payment(self, transaction_id: str,
                       payment_data: Dict[str, Any]) -> PaymentGatewayResponse:
        """
        Confirm a payment using the transaction ID.

        Args:
            transaction_id: Gateway transaction identifier
            payment_data: Payment confirmation data

        Returns:
            PaymentGatewayResponse with confirmation results
        """
        pass

    @abstractmethod
    def cancel_payment(self, transaction_id: str,
                      reason: str = None) -> PaymentGatewayResponse:
        """
        Cancel a payment.

        Args:
            transaction_id: Gateway transaction identifier
            reason: Reason for cancellation

        Returns:
            PaymentGatewayResponse with cancellation results
        """
        pass

    @abstractmethod
    def refund_payment(self, transaction_id: str, amount: Decimal = None,
                      reason: str = None) -> PaymentGatewayResponse:
        """
        Refund a payment (full or partial).

        Args:
            transaction_id: Gateway transaction identifier
            amount: Refund amount (None for full refund)
            reason: Reason for refund

        Returns:
            PaymentGatewayResponse with refund results
        """
        pass

    @abstractmethod
    def get_payment_status(self, transaction_id: str) -> PaymentGatewayResponse:
        """
        Get current status of a payment.

        Args:
            transaction_id: Gateway transaction identifier

        Returns:
            PaymentGatewayResponse with current status
        """
        pass

    @abstractmethod
    def save_payment_method(self, payment_data: Dict[str, Any]) -> PaymentGatewayResponse:
        """
        Save payment method for future use.

        Args:
            payment_data: Payment method data

        Returns:
            PaymentGatewayResponse with saved payment method details
        """
        pass

    @abstractmethod
    def process_webhook(self, webhook_data: Dict[str, Any],
                       signature: str = None) -> Dict[str, Any]:
        """
        Process webhook from payment gateway.

        Args:
            webhook_data: Webhook payload
            signature: Webhook signature for verification

        Returns:
            Dict with processed webhook information
        """
        pass

    @abstractmethod
    def validate_config(self) -> Tuple[bool, List[str]]:
        """
        Validate gateway configuration.

        Returns:
            Tuple of (is_valid, error_messages)
        """
        pass

    def format_amount(self, amount: Decimal, currency: str) -> int:
        """
        Format amount for gateway API (usually cents for most gateways).

        Args:
            amount: Decimal amount
            currency: Currency code

        Returns:
            Integer amount in smallest currency unit
        """
        # Most gateways expect amounts in cents/minor units
        # Some currencies like JPY don't have minor units
        zero_decimal_currencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']

        if currency.upper() in zero_decimal_currencies:
            return int(amount)
        else:
            return int(amount * 100)

    def is_healthy(self) -> bool:
        """
        Check if gateway is healthy and operational.

        Returns:
            bool: True if gateway is operational
        """
        try:
            # Override in specific gateway implementations
            return True
        except Exception:
            return False


class StripePaymentGateway(BasePaymentGateway):
    """Stripe payment gateway implementation"""

    def __init__(self, gateway_config: Dict[str, Any]):
        super().__init__(gateway_config)
        self._initialize_stripe()

    def _initialize_stripe(self):
        """Initialize Stripe with configuration"""
        try:
            import stripe
            stripe.api_key = self.config.get('secret_key')
            self.stripe = stripe
        except ImportError:
            raise ImportError("Stripe library not installed. Run: pip install stripe")

    def create_payment_intent(self, amount: Decimal, currency: str,
                            payment_data: Dict[str, Any]) -> PaymentGatewayResponse:
        """Create Stripe payment intent"""
        try:
            intent_data = {
                'amount': self.format_amount(amount, currency),
                'currency': currency.lower(),
                'metadata': payment_data.get('metadata', {}),
                'automatic_payment_methods': {'enabled': True}
            }

            # Add customer if provided
            if 'customer_id' in payment_data:
                intent_data['customer'] = payment_data['customer_id']

            # Add payment method if provided
            if 'payment_method' in payment_data:
                intent_data['payment_method'] = payment_data['payment_method']

            intent = self.stripe.PaymentIntent.create(**intent_data)

            return PaymentGatewayResponse(
                success=True,
                transaction_id=intent.id,
                status='PENDING',
                client_secret=intent.client_secret,
                response_data={
                    'stripe_intent_id': intent.id,
                    'client_secret': intent.client_secret,
                    'status': intent.status
                }
            )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(
                success=False,
                message=str(e),
                error_code=e.code if hasattr(e, 'code') else 'stripe_error',
                response_data={'stripe_error': str(e)}
            )

    def confirm_payment(self, transaction_id: str,
                       payment_data: Dict[str, Any]) -> PaymentGatewayResponse:
        """Confirm Stripe payment"""
        try:
            intent = self.stripe.PaymentIntent.retrieve(transaction_id)

            if intent.status == 'succeeded':
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status='COMPLETED',
                    message='Payment completed successfully'
                )
            elif intent.status == 'requires_action':
                return PaymentGatewayResponse(
                    success=True,
                    transaction_id=transaction_id,
                    status='PENDING',
                    requires_action=True,
                    client_secret=intent.client_secret,
                    message='Payment requires additional authentication'
                )
            else:
                return PaymentGatewayResponse(
                    success=False,
                    transaction_id=transaction_id,
                    status='FAILED',
                    message=f'Payment failed with status: {intent.status}'
                )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(
                success=False,
                transaction_id=transaction_id,
                message=str(e),
                error_code='stripe_error'
            )

    def cancel_payment(self, transaction_id: str,
                      reason: str = None) -> PaymentGatewayResponse:
        """Cancel Stripe payment"""
        try:
            intent = self.stripe.PaymentIntent.cancel(
                transaction_id,
                cancellation_reason=reason or 'requested_by_customer'
            )

            return PaymentGatewayResponse(
                success=True,
                transaction_id=transaction_id,
                status='CANCELLED',
                message='Payment cancelled successfully'
            )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(
                success=False,
                transaction_id=transaction_id,
                message=str(e),
                error_code='stripe_error'
            )

    def refund_payment(self, transaction_id: str, amount: Decimal = None,
                      reason: str = None) -> PaymentGatewayResponse:
        """Refund Stripe payment"""
        try:
            refund_data = {'payment_intent': transaction_id}

            if amount:
                # Get the original intent to determine currency
                intent = self.stripe.PaymentIntent.retrieve(transaction_id)
                refund_data['amount'] = self.format_amount(amount, intent.currency)

            if reason:
                refund_data['reason'] = reason

            refund = self.stripe.Refund.create(**refund_data)

            return PaymentGatewayResponse(
                success=True,
                transaction_id=refund.id,
                status='COMPLETED',
                message='Refund processed successfully',
                response_data={'refund_id': refund.id}
            )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(
                success=False,
                message=str(e),
                error_code='stripe_error'
            )

    def get_payment_status(self, transaction_id: str) -> PaymentGatewayResponse:
        """Get Stripe payment status"""
        try:
            intent = self.stripe.PaymentIntent.retrieve(transaction_id)

            status_mapping = {
                'succeeded': 'COMPLETED',
                'canceled': 'CANCELLED',
                'processing': 'PROCESSING',
                'requires_payment_method': 'PENDING',
                'requires_confirmation': 'PENDING',
                'requires_action': 'PENDING'
            }

            status = status_mapping.get(intent.status, 'UNKNOWN')

            return PaymentGatewayResponse(
                success=True,
                transaction_id=transaction_id,
                status=status,
                response_data={
                    'stripe_status': intent.status,
                    'amount': intent.amount,
                    'currency': intent.currency
                }
            )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(
                success=False,
                message=str(e),
                error_code='stripe_error'
            )

    def save_payment_method(self, payment_data: Dict[str, Any]) -> PaymentGatewayResponse:
        """Save Stripe payment method"""
        try:
            # Create or attach payment method to customer
            customer_id = payment_data.get('customer_id')
            payment_method_id = payment_data.get('payment_method_id')

            if customer_id and payment_method_id:
                payment_method = self.stripe.PaymentMethod.attach(
                    payment_method_id,
                    customer=customer_id
                )

                return PaymentGatewayResponse(
                    success=True,
                    message='Payment method saved successfully',
                    response_data={
                        'payment_method_id': payment_method.id,
                        'type': payment_method.type,
                        'card': payment_method.card if payment_method.type == 'card' else None
                    }
                )

        except self.stripe.error.StripeError as e:
            return PaymentGatewayResponse(
                success=False,
                message=str(e),
                error_code='stripe_error'
            )

    def process_webhook(self, webhook_data: Dict[str, Any],
                       signature: str = None) -> Dict[str, Any]:
        """Process Stripe webhook"""
        try:
            if signature and self.config.get('webhook_secret'):
                event = self.stripe.Webhook.construct_event(
                    webhook_data,
                    signature,
                    self.config.get('webhook_secret')
                )
            else:
                # For testing without signature verification
                event = webhook_data

            return {
                'success': True,
                'event_type': event.get('type'),
                'event_id': event.get('id'),
                'data': event.get('data', {})
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def validate_config(self) -> Tuple[bool, List[str]]:
        """Validate Stripe configuration"""
        errors = []

        required_fields = ['secret_key', 'publishable_key']
        for field in required_fields:
            if not self.config.get(field):
                errors.append(f"Missing required field: {field}")

        # Test API connection
        try:
            self.stripe.Account.retrieve()
        except Exception as e:
            errors.append(f"Failed to connect to Stripe API: {e}")

        return len(errors) == 0, errors

    def is_healthy(self) -> bool:
        """Check Stripe gateway health"""
        try:
            self.stripe.Account.retrieve()
            return True
        except Exception:
            return False


class PayPalPaymentGateway(BasePaymentGateway):
    """PayPal payment gateway implementation (placeholder for future implementation)"""

    def create_payment_intent(self, amount: Decimal, currency: str,
                            payment_data: Dict[str, Any]) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False,
            message="PayPal integration not yet implemented",
            error_code='not_implemented'
        )

    def confirm_payment(self, transaction_id: str,
                       payment_data: Dict[str, Any]) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False,
            message="PayPal integration not yet implemented",
            error_code='not_implemented'
        )

    def cancel_payment(self, transaction_id: str,
                      reason: str = None) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False,
            message="PayPal integration not yet implemented",
            error_code='not_implemented'
        )

    def refund_payment(self, transaction_id: str, amount: Decimal = None,
                      reason: str = None) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False,
            message="PayPal integration not yet implemented",
            error_code='not_implemented'
        )

    def get_payment_status(self, transaction_id: str) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False,
            message="PayPal integration not yet implemented",
            error_code='not_implemented'
        )

    def save_payment_method(self, payment_data: Dict[str, Any]) -> PaymentGatewayResponse:
        return PaymentGatewayResponse(
            success=False,
            message="PayPal integration not yet implemented",
            error_code='not_implemented'
        )

    def process_webhook(self, webhook_data: Dict[str, Any],
                       signature: str = None) -> Dict[str, Any]:
        return {
            'success': False,
            'error': 'PayPal integration not yet implemented'
        }

    def validate_config(self) -> Tuple[bool, List[str]]:
        return False, ['PayPal integration not yet implemented']


class PaymentGatewayFactory:
    """
    Factory for creating payment gateway instances.

    This factory provides a centralized way to create and manage
    payment gateway instances with proper configuration.
    """

    _gateway_classes = {
        'stripe': StripePaymentGateway,
        'paypal': PayPalPaymentGateway,
    }

    _gateway_cache = {}

    @classmethod
    def create_gateway(cls, gateway_code: str, force_refresh: bool = False) -> BasePaymentGateway:
        """
        Create a payment gateway instance.

        Args:
            gateway_code: Gateway identifier (stripe, paypal, etc.)
            force_refresh: Force refresh of cached gateway

        Returns:
            BasePaymentGateway instance

        Raises:
            ValueError: If gateway is not supported or configuration is invalid
        """
        if force_refresh and gateway_code in cls._gateway_cache:
            del cls._gateway_cache[gateway_code]

        # Return cached instance if available
        if gateway_code in cls._gateway_cache:
            return cls._gateway_cache[gateway_code]

        # Get gateway configuration
        gateway_config = cls._get_gateway_config(gateway_code)

        if not gateway_config:
            raise ValueError(f"No configuration found for gateway: {gateway_code}")

        # Get gateway class
        gateway_class = cls._gateway_classes.get(gateway_code)
        if not gateway_class:
            raise ValueError(f"Unsupported gateway: {gateway_code}")

        # Create gateway instance
        gateway = gateway_class(gateway_config)

        # Validate configuration
        is_valid, errors = gateway.validate_config()
        if not is_valid:
            raise ValueError(f"Invalid gateway configuration for {gateway_code}: {errors}")

        # Cache the instance
        cls._gateway_cache[gateway_code] = gateway

        logger.info(f"Created payment gateway instance for {gateway_code}")
        return gateway

    @classmethod
    def get_available_gateways(cls) -> List[str]:
        """
        Get list of available payment gateways.

        Returns:
            List of gateway codes
        """
        from ..models import PaymentGateway

        # Get active gateways from database
        active_gateways = PaymentGateway.objects.filter(
            is_active=True
        ).values_list('code', flat=True)

        # Return only gateways that have implementations
        return [
            gateway_code for gateway_code in active_gateways
            if gateway_code in cls._gateway_classes
        ]

    @classmethod
    def get_healthy_gateways(cls) -> List[str]:
        """
        Get list of healthy payment gateways.

        Returns:
            List of gateway codes that are operational
        """
        healthy_gateways = []

        for gateway_code in cls.get_available_gateways():
            try:
                gateway = cls.create_gateway(gateway_code)
                if gateway.is_healthy():
                    healthy_gateways.append(gateway_code)
            except Exception as e:
                logger.warning(f"Gateway {gateway_code} is not healthy: {e}")

        return healthy_gateways

    @classmethod
    def get_primary_gateway(cls) -> str:
        """
        Get the primary payment gateway.

        Returns:
            Primary gateway code
        """
        healthy_gateways = cls.get_healthy_gateways()

        if not healthy_gateways:
            raise ValueError("No healthy payment gateways available")

        # Return first healthy gateway (could be enhanced with priority logic)
        return healthy_gateways[0]

    @classmethod
    def _get_gateway_config(cls, gateway_code: str) -> Optional[Dict[str, Any]]:
        """
        Get configuration for a payment gateway.

        Args:
            gateway_code: Gateway identifier

        Returns:
            Gateway configuration dictionary or None
        """
        try:
            from ..models import PaymentGateway

            gateway = PaymentGateway.objects.get(code=gateway_code, is_active=True)
            config = gateway.get_decrypted_config()
            config['code'] = gateway.code
            config['test_mode'] = config.get('test_mode', False)

            return config

        except PaymentGateway.DoesNotExist:
            logger.error(f"Gateway configuration not found for {gateway_code}")
            return None

    @classmethod
    def register_gateway_class(cls, gateway_code: str, gateway_class: type):
        """
        Register a new gateway class.

        Args:
            gateway_code: Gateway identifier
            gateway_class: Gateway class implementing BasePaymentGateway
        """
        if not issubclass(gateway_class, BasePaymentGateway):
            raise ValueError("Gateway class must inherit from BasePaymentGateway")

        cls._gateway_classes[gateway_code] = gateway_class
        logger.info(f"Registered gateway class for {gateway_code}")

    @classmethod
    def clear_cache(cls):
        """Clear the gateway cache."""
        cls._gateway_cache.clear()
        logger.info("Cleared payment gateway cache")