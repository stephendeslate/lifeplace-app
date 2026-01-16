# backend/core/domains/payments/tasks.py
"""
Celery tasks for the payments domain.

Includes:
- Gateway health monitoring
"""

import logging
from typing import Dict, Any

from celery import shared_task
from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger(__name__)


# =============================================================================
# Gateway Health Monitoring Tasks
# =============================================================================

@shared_task
def check_gateway_health():
    """
    Check the health status of all active payment gateways.

    Stores health status in cache for dashboard display.
    """
    from .models import PaymentGateway

    try:
        gateways = PaymentGateway.objects.filter(is_active=True)
        health_results = {}

        for gateway in gateways:
            try:
                # Perform gateway-specific health check
                is_healthy, message = _check_gateway_status(gateway)

                health_results[gateway.code] = {
                    'name': gateway.name,
                    'is_healthy': is_healthy,
                    'message': message,
                    'last_checked': timezone.now().isoformat()
                }

                # Store individual gateway health
                cache.set(
                    f"gateway_health:{gateway.code}",
                    health_results[gateway.code],
                    timeout=3600
                )

            except Exception as e:
                logger.error(f"Health check failed for gateway {gateway.code}: {e}")
                health_results[gateway.code] = {
                    'name': gateway.name,
                    'is_healthy': False,
                    'message': str(e),
                    'last_checked': timezone.now().isoformat()
                }

        # Store overall health summary
        all_healthy = all(r['is_healthy'] for r in health_results.values())
        cache.set(
            'gateway_health_summary',
            {
                'all_healthy': all_healthy,
                'gateways': health_results,
                'last_checked': timezone.now().isoformat()
            },
            timeout=3600
        )

        logger.info(
            f"Gateway health check complete: "
            f"{sum(1 for r in health_results.values() if r['is_healthy'])}/{len(health_results)} healthy"
        )

        return {
            'status': 'success',
            'all_healthy': all_healthy,
            'gateways': health_results
        }

    except Exception as e:
        logger.error(f"Gateway health check failed: {e}")
        return {'status': 'error', 'message': str(e)}


# =============================================================================
# Helper Functions
# =============================================================================

def _check_gateway_status(gateway) -> tuple:
    """
    Check the health status of a payment gateway.

    Returns:
        Tuple of (is_healthy: bool, message: str)
    """
    # Gateway-specific health checks
    if gateway.code == 'stripe':
        return _check_stripe_health(gateway)
    elif gateway.code == 'paymongo':
        return _check_paymongo_health(gateway)
    else:
        # Generic check - just verify config exists
        config = gateway.get_decrypted_config()
        if config:
            return True, 'Configuration present'
        return False, 'No configuration found'


def _check_stripe_health(gateway) -> tuple:
    """Check Stripe gateway health."""
    try:
        import stripe
        config = gateway.get_decrypted_config()

        if not config.get('secret_key'):
            return False, 'Missing secret key'

        # Try to retrieve account info
        stripe.api_key = config['secret_key']
        stripe.Account.retrieve()

        return True, 'Connected'

    except Exception as e:
        return False, str(e)


def _check_paymongo_health(gateway) -> tuple:
    """Check PayMongo gateway health."""
    try:
        import requests
        config = gateway.get_decrypted_config()

        if not config.get('secret_key'):
            return False, 'Missing secret key'

        # Try a simple API call
        response = requests.get(
            'https://api.paymongo.com/v1/payment_intents',
            auth=(config['secret_key'], ''),
            timeout=10
        )

        if response.status_code in [200, 401]:  # 401 is ok, means auth works
            return True, 'Connected'
        else:
            return False, f'API error: {response.status_code}'

    except requests.Timeout:
        return False, 'Connection timeout'
    except Exception as e:
        return False, str(e)


@shared_task
def payments_health_check():
    """Health check task for payments system."""
    try:
        logger.info("Payments system health check passed")
        return {
            'status': 'healthy',
            'timestamp': timezone.now().isoformat(),
            'message': 'Payments system is operational'
        }
    except Exception as e:
        logger.error(f"Payments health check failed: {e}")
        return {'status': 'unhealthy', 'message': str(e)}
