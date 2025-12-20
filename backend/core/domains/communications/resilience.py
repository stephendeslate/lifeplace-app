# backend/core/domains/communications/resilience.py

import logging
import time
from abc import ABC, abstractmethod
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any

from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .exceptions import CommunicationProviderError
from .config import communication_config

logger = logging.getLogger(__name__)


class CircuitBreakerState:
    """Circuit breaker states"""
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Circuit is open, failing fast
    HALF_OPEN = "half_open"  # Testing if service is back


class CircuitBreaker:
    """Circuit breaker pattern for communication providers"""
    
    def __init__(self, provider_name: str, failure_threshold: int = 5, 
                 recovery_timeout: int = 60, test_timeout: int = 30):
        self.provider_name = provider_name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.test_timeout = test_timeout
        
        # Circuit breaker state is stored in cache for persistence across requests
        self.state_key = f"circuit_breaker:{provider_name}:state"
        self.failure_key = f"circuit_breaker:{provider_name}:failures"
        self.last_failure_key = f"circuit_breaker:{provider_name}:last_failure"
        self.last_test_key = f"circuit_breaker:{provider_name}:last_test"
    
    def get_state(self) -> str:
        """Get current circuit breaker state"""
        state = cache.get(self.state_key, CircuitBreakerState.CLOSED)
        
        if state == CircuitBreakerState.OPEN:
            # Check if recovery timeout has passed
            last_failure = cache.get(self.last_failure_key, 0)
            if time.time() - last_failure > self.recovery_timeout:
                self.set_state(CircuitBreakerState.HALF_OPEN)
                return CircuitBreakerState.HALF_OPEN
        
        return state
    
    def set_state(self, state: str):
        """Set circuit breaker state"""
        cache.set(self.state_key, state, timeout=3600)  # 1 hour
        logger.info(f"Circuit breaker for {self.provider_name} changed to {state}")
    
    def record_success(self):
        """Record successful operation"""
        state = self.get_state()
        
        if state == CircuitBreakerState.HALF_OPEN:
            # Success in half-open state means we can close the circuit
            self.set_state(CircuitBreakerState.CLOSED)
            cache.delete(self.failure_key)
            logger.info(f"Circuit breaker for {self.provider_name} recovered")
        elif state == CircuitBreakerState.CLOSED:
            # Reset failure count on success
            cache.delete(self.failure_key)
    
    def record_failure(self):
        """Record failed operation"""
        current_failures = cache.get(self.failure_key, 0) + 1
        cache.set(self.failure_key, current_failures, timeout=3600)
        cache.set(self.last_failure_key, time.time(), timeout=3600)
        
        state = self.get_state()
        
        if state == CircuitBreakerState.CLOSED and current_failures >= self.failure_threshold:
            self.set_state(CircuitBreakerState.OPEN)
            logger.warning(f"Circuit breaker for {self.provider_name} opened after {current_failures} failures")
        elif state == CircuitBreakerState.HALF_OPEN:
            # Failed test, go back to open
            self.set_state(CircuitBreakerState.OPEN)
            logger.warning(f"Circuit breaker for {self.provider_name} failed test, back to open")
    
    def can_execute(self) -> bool:
        """Check if operation can be executed"""
        state = self.get_state()
        
        if state == CircuitBreakerState.CLOSED:
            return True
        elif state == CircuitBreakerState.OPEN:
            return False
        elif state == CircuitBreakerState.HALF_OPEN:
            # Allow one test call
            last_test = cache.get(self.last_test_key, 0)
            if time.time() - last_test > self.test_timeout:
                cache.set(self.last_test_key, time.time(), timeout=3600)
                return True
            return False
        
        return False
    
    def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection"""
        if not self.can_execute():
            raise CommunicationProviderError(
                f"Circuit breaker for {self.provider_name} is open"
            )
        
        try:
            result = func(*args, **kwargs)
            self.record_success()
            return result
        except Exception as e:
            self.record_failure()
            raise e


class RetryStrategy:
    """Retry strategy with exponential backoff"""
    
    def __init__(self, max_retries: int = 3, base_delay: float = 1.0, 
                 max_delay: float = 60.0, backoff_factor: float = 2.0):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.backoff_factor = backoff_factor
    
    def execute(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with retry logic"""
        last_exception = None
        
        for attempt in range(self.max_retries + 1):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                
                if attempt < self.max_retries:
                    delay = min(
                        self.base_delay * (self.backoff_factor ** attempt),
                        self.max_delay
                    )
                    logger.warning(f"Attempt {attempt + 1} failed, retrying in {delay}s: {str(e)}")
                    time.sleep(delay)
                else:
                    logger.error(f"All {self.max_retries + 1} attempts failed")
        
        raise last_exception


class ProviderManager:
    """Manages multiple communication providers with fallback logic"""
    
    def __init__(self):
        self.providers = {}
        self.circuit_breakers = {}
        self.retry_strategy = RetryStrategy(
            max_retries=communication_config.get_rate_limit('MAX_RETRIES') or 3
        )
        self.load_providers()
    
    def load_providers(self):
        """Load available providers based on configuration"""
        from .providers import MockProvider, BrevoProvider

        # Use dynamic provider configuration based on environment
        provider_configs = communication_config.get_provider_config_dict()
        
        for provider_name, config in provider_configs.items():
            if not config.get('enabled', False):
                continue
            
            try:
                if provider_name == 'MOCK':
                    provider = MockProvider()
                elif provider_name == 'BREVO':
                    provider = BrevoProvider()
                else:
                    logger.warning(f"Unknown provider: {provider_name}")
                    continue
                
                self.providers[provider_name] = {
                    'instance': provider,
                    'config': config,
                    'fallback_order': config.get('fallback_order', 999)
                }
                
                # Create circuit breaker with configurable thresholds
                from .config import CommunicationConfig
                self.circuit_breakers[provider_name] = CircuitBreaker(
                    provider_name,
                    failure_threshold=CommunicationConfig.get_circuit_breaker_config('FAILURE_THRESHOLD'),
                    recovery_timeout=CommunicationConfig.get_circuit_breaker_config('RECOVERY_TIMEOUT_SECONDS'),
                )
                logger.info(f"Loaded communication provider: {provider_name}")
                
            except Exception as e:
                logger.error(f"Failed to load provider {provider_name}: {str(e)}")
    
    def get_ordered_providers(self) -> List[str]:
        """Get providers ordered by fallback preference"""
        return sorted(
            self.providers.keys(),
            key=lambda x: self.providers[x]['fallback_order']
        )
    
    def send_with_fallback(self, method: str, *args, **kwargs) -> tuple[str, str]:
        """
        Send communication with provider fallback
        Returns: (external_message_id, provider_used)
        """
        ordered_providers = self.get_ordered_providers()
        last_exception = None
        
        for provider_name in ordered_providers:
            provider_data = self.providers[provider_name]
            provider = provider_data['instance']
            circuit_breaker = self.circuit_breakers[provider_name]
            
            if not circuit_breaker.can_execute():
                logger.info(f"Skipping {provider_name} - circuit breaker open")
                continue
            
            try:
                # Execute with retry and circuit breaker protection
                def execute_send():
                    if method == 'send_email':
                        return provider.send_email(*args, **kwargs)
                    elif method == 'send_sms':
                        return provider.send_sms(*args, **kwargs)
                    else:
                        raise ValueError(f"Unknown method: {method}")
                
                # Use circuit breaker
                message_id = circuit_breaker.call(
                    self.retry_strategy.execute,
                    execute_send
                )
                
                logger.info(f"Successfully sent via {provider_name}")
                return message_id, provider_name
                
            except Exception as e:
                last_exception = e
                logger.warning(f"Provider {provider_name} failed: {str(e)}")
                continue
        
        # All providers failed
        if last_exception:
            raise CommunicationProviderError(
                f"All communication providers failed. Last error: {str(last_exception)}"
            )
        else:
            raise CommunicationProviderError("No available communication providers")
    
    def get_provider_health(self) -> Dict[str, Dict]:
        """Get health status of all providers"""
        health_status = {}
        
        for provider_name in self.providers:
            circuit_breaker = self.circuit_breakers[provider_name]
            state = circuit_breaker.get_state()
            
            failures = cache.get(circuit_breaker.failure_key, 0)
            last_failure = cache.get(circuit_breaker.last_failure_key, None)
            
            health_status[provider_name] = {
                'state': state,
                'failures': failures,
                'last_failure': datetime.fromtimestamp(last_failure) if last_failure else None,
                'healthy': state == CircuitBreakerState.CLOSED
            }
        
        return health_status
    
    def reset_provider(self, provider_name: str):
        """Reset circuit breaker for a specific provider"""
        if provider_name in self.circuit_breakers:
            circuit_breaker = self.circuit_breakers[provider_name]
            circuit_breaker.set_state(CircuitBreakerState.CLOSED)
            cache.delete(circuit_breaker.failure_key)
            cache.delete(circuit_breaker.last_failure_key)
            logger.info(f"Reset circuit breaker for {provider_name}")


class DeliveryQueue:
    """Queue for handling failed deliveries with retry"""

    def __init__(self):
        self.queue_key = "communication_delivery_queue"
        self.processing_key = "communication_processing_queue"
        # Use configurable cache timeout (default 24 hours = 86400 seconds)
        from .config import CommunicationConfig
        self.cache_timeout = CommunicationConfig.get_cache_timeout('DELIVERY_QUEUE') or 86400
    
    def add_failed_delivery(self, delivery_data: Dict):
        """Add failed delivery to retry queue"""
        delivery_data['queued_at'] = timezone.now().isoformat()
        delivery_data['retry_count'] = delivery_data.get('retry_count', 0)
        delivery_data['next_retry'] = self._calculate_next_retry(
            delivery_data['retry_count']
        ).isoformat()
        
        # Add to queue (using cache as simple queue)
        queue = cache.get(self.queue_key, [])
        queue.append(delivery_data)
        cache.set(self.queue_key, queue, timeout=self.cache_timeout)
        
        logger.info(f"Added failed delivery to retry queue: {delivery_data.get('record_id')}")
    
    def get_ready_deliveries(self) -> List[Dict]:
        """Get deliveries ready for retry"""
        queue = cache.get(self.queue_key, [])
        ready_deliveries = []
        remaining_deliveries = []
        
        now = timezone.now()
        
        for delivery in queue:
            next_retry = datetime.fromisoformat(delivery['next_retry'].replace('Z', '+00:00'))
            
            if next_retry <= now and delivery['retry_count'] < 5:  # Max 5 retries
                ready_deliveries.append(delivery)
            elif delivery['retry_count'] < 5:
                remaining_deliveries.append(delivery)
            # else: drop deliveries that exceeded max retries
        
        # Update queue
        cache.set(self.queue_key, remaining_deliveries, timeout=self.cache_timeout)
        
        return ready_deliveries
    
    def _calculate_next_retry(self, retry_count: int) -> datetime:
        """Calculate next retry time with exponential backoff"""
        delay_minutes = min(2 ** retry_count, 60)  # Max 1 hour
        return timezone.now() + timedelta(minutes=delay_minutes)


# Global instances
provider_manager = ProviderManager()
delivery_queue = DeliveryQueue()