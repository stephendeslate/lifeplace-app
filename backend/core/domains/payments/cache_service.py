"""
Redis caching service for Payments domain
Uses versioned caching for efficient invalidation (no KEYS/SCAN operations)
"""

import hashlib
import json
import logging
from decimal import Decimal
from typing import Any

from django.db.models import QuerySet

from core.utils.cache import VersionedCacheService

logger = logging.getLogger(__name__)


class PaymentsCacheService(VersionedCacheService):
    """
    Centralized caching service for Payments domain
    Uses versioned caching - invalidation is O(1) via version increment
    """

    # Domain identifier for cache keys
    domain = "payments"

    # Version groups - invalidating a group increments its version
    version_groups = {
        "payments": ["list", "by_status", "overdue", "pending"],  # Payment lists
        "invoices": ["invoices"],  # Invoice lists
        "refunds": ["refunds"],  # Refund lists
        "transactions": ["transactions"],  # Transaction lists
        "methods": ["methods"],  # Payment method lists
        "gateways": ["gateways"],  # Gateway lists
        "tax_rates": ["tax_rates"],  # Tax rate lists
        "analytics": ["analytics"],  # Financial analytics
        "notifications": ["notifications"],  # Payment notifications
    }

    # Versioned cache key patterns
    PAYMENT_LIST_KEY = "list:{query_hash}"
    PAYMENT_BY_STATUS_KEY = "by_status:{status}"
    PAYMENT_OVERDUE_KEY = "overdue"
    PAYMENT_PENDING_KEY = "pending"
    INVOICE_LIST_KEY = "invoices:list:{query_hash}"
    INVOICE_BY_STATUS_KEY = "invoices:by_status:{status}"
    REFUND_LIST_KEY = "refunds:list:{query_hash}"
    TRANSACTION_LIST_KEY = "transactions:list:{query_hash}"
    PAYMENT_GATEWAY_LIST_KEY = "gateways:list"
    PAYMENT_GATEWAY_ACTIVE_KEY = "gateways:active"
    TAX_RATE_LIST_KEY = "tax_rates:list"
    TAX_RATE_ACTIVE_KEY = "tax_rates:active"
    TAX_RATE_DEFAULT_KEY = "tax_rates:default"
    NOTIFICATION_LIST_KEY = "notifications:list:{query_hash}"

    # Financial Analytics (versioned)
    FINANCIAL_STATS_KEY = "analytics:financial_stats:{period}"
    REVENUE_STATS_KEY = "analytics:revenue:{period}"
    PAYMENT_STATS_KEY = "analytics:payment_stats:{period}"
    OUTSTANDING_PAYMENTS_KEY = "analytics:outstanding"
    CASH_FLOW_KEY = "analytics:cash_flow:{period}"
    GATEWAY_PERFORMANCE_KEY = "analytics:gateway_performance:{period}"

    # Non-versioned keys (specific to individual entities - direct deletion)
    PAYMENT_DETAIL_KEY = "payments:detail:{payment_id}"
    PAYMENT_BY_EVENT_KEY = "payments:by_event:{event_id}"
    PAYMENT_BY_CLIENT_KEY = "payments:by_client:{client_id}"
    INVOICE_DETAIL_KEY = "payments:invoice:detail:{invoice_id}"
    INVOICE_BY_EVENT_KEY = "payments:invoice:by_event:{event_id}"
    INVOICE_BY_CLIENT_KEY = "payments:invoice:by_client:{client_id}"
    PAYMENT_METHOD_LIST_KEY = "payments:methods:list:{user_id}"
    PAYMENT_METHOD_DETAIL_KEY = "payments:method:detail:{method_id}"
    PAYMENT_GATEWAY_DETAIL_KEY = "payments:gateway:detail:{gateway_id}"
    REFUND_DETAIL_KEY = "payments:refund:detail:{refund_id}"
    REFUND_BY_PAYMENT_KEY = "payments:refunds:by_payment:{payment_id}"
    TRANSACTION_BY_PAYMENT_KEY = "payments:transactions:by_payment:{payment_id}"
    NOTIFICATION_BY_PAYMENT_KEY = "payments:notifications:by_payment:{payment_id}"

    # Cache timeout configurations (in seconds)
    TIMEOUT_SHORT = 300  # 5 minutes - frequently changing data
    TIMEOUT_MEDIUM = 1800  # 30 minutes - moderate changes
    TIMEOUT_LONG = 3600  # 1 hour - stable data
    TIMEOUT_VERY_LONG = 14400  # 4 hours - very stable data

    # === PAYMENT CACHING ===

    def cache_payment_list(self, payments_data: list[dict], query_params: dict = None) -> str:
        """Cache payment list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("payments", self.PAYMENT_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, payments_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached payment list: {key}")
        return key

    def get_cached_payment_list(self, query_params: dict = None) -> list[dict] | None:
        """Get cached payment list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("payments", self.PAYMENT_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_payment_detail(self, payment_id: int, payment_data: dict) -> str:
        """Cache individual payment detail (non-versioned)"""
        key = self.PAYMENT_DETAIL_KEY.format(payment_id=payment_id)
        self.cache.set(key, payment_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached payment detail: {key}")
        return key

    def get_cached_payment_detail(self, payment_id: int) -> dict | None:
        """Get cached payment detail"""
        key = self.PAYMENT_DETAIL_KEY.format(payment_id=payment_id)
        return self.cache.get(key)

    def cache_payments_by_event(self, event_id: int, payments_data: list[dict]) -> str:
        """Cache payments for a specific event (non-versioned)"""
        key = self.PAYMENT_BY_EVENT_KEY.format(event_id=event_id)
        self.cache.set(key, payments_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached payments by event: {key}")
        return key

    def get_cached_payments_by_event(self, event_id: int) -> list[dict] | None:
        """Get cached payments by event"""
        key = self.PAYMENT_BY_EVENT_KEY.format(event_id=event_id)
        return self.cache.get(key)

    def cache_payments_by_status(self, status: str, payments_data: list[dict]) -> str:
        """Cache payments by status (versioned)"""
        key = self._versioned_key("payments", self.PAYMENT_BY_STATUS_KEY.format(status=status))
        self.cache.set(key, payments_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached payments by status: {key}")
        return key

    def get_cached_payments_by_status(self, status: str) -> list[dict] | None:
        """Get cached payments by status"""
        key = self._versioned_key("payments", self.PAYMENT_BY_STATUS_KEY.format(status=status))
        return self.cache.get(key)

    def cache_payments_by_client(self, client_id: int, payments_data: list[dict]) -> str:
        """Cache payments for a specific client (non-versioned)"""
        key = self.PAYMENT_BY_CLIENT_KEY.format(client_id=client_id)
        self.cache.set(key, payments_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached payments by client: {key}")
        return key

    def get_cached_payments_by_client(self, client_id: int) -> list[dict] | None:
        """Get cached payments by client"""
        key = self.PAYMENT_BY_CLIENT_KEY.format(client_id=client_id)
        return self.cache.get(key)

    def cache_overdue_payments(self, overdue_data: list[dict]) -> str:
        """Cache overdue payments list (versioned)"""
        key = self._versioned_key("payments", self.PAYMENT_OVERDUE_KEY)
        self.cache.set(key, overdue_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached overdue payments: {key}")
        return key

    def get_cached_overdue_payments(self) -> list[dict] | None:
        """Get cached overdue payments"""
        key = self._versioned_key("payments", self.PAYMENT_OVERDUE_KEY)
        return self.cache.get(key)

    def cache_pending_payments(self, pending_data: list[dict]) -> str:
        """Cache pending payments list (versioned)"""
        key = self._versioned_key("payments", self.PAYMENT_PENDING_KEY)
        self.cache.set(key, pending_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached pending payments: {key}")
        return key

    def get_cached_pending_payments(self) -> list[dict] | None:
        """Get cached pending payments"""
        key = self._versioned_key("payments", self.PAYMENT_PENDING_KEY)
        return self.cache.get(key)

    # === INVOICE CACHING ===

    def cache_invoice_list(self, invoices_data: list[dict], query_params: dict = None) -> str:
        """Cache invoice list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("invoices", self.INVOICE_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, invoices_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached invoice list: {key}")
        return key

    def get_cached_invoice_list(self, query_params: dict = None) -> list[dict] | None:
        """Get cached invoice list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("invoices", self.INVOICE_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_invoice_detail(self, invoice_id: int, invoice_data: dict) -> str:
        """Cache individual invoice detail (non-versioned)"""
        key = self.INVOICE_DETAIL_KEY.format(invoice_id=invoice_id)
        self.cache.set(key, invoice_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached invoice detail: {key}")
        return key

    def get_cached_invoice_detail(self, invoice_id: int) -> dict | None:
        """Get cached invoice detail"""
        key = self.INVOICE_DETAIL_KEY.format(invoice_id=invoice_id)
        return self.cache.get(key)

    def cache_invoices_by_event(self, event_id: int, invoices_data: list[dict]) -> str:
        """Cache invoices for a specific event (non-versioned)"""
        key = self.INVOICE_BY_EVENT_KEY.format(event_id=event_id)
        self.cache.set(key, invoices_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached invoices by event: {key}")
        return key

    def get_cached_invoices_by_event(self, event_id: int) -> list[dict] | None:
        """Get cached invoices by event"""
        key = self.INVOICE_BY_EVENT_KEY.format(event_id=event_id)
        return self.cache.get(key)

    def cache_invoices_by_client(self, client_id: int, invoices_data: list[dict]) -> str:
        """Cache invoices for a specific client (non-versioned)"""
        key = self.INVOICE_BY_CLIENT_KEY.format(client_id=client_id)
        self.cache.set(key, invoices_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached invoices by client: {key}")
        return key

    def get_cached_invoices_by_client(self, client_id: int) -> list[dict] | None:
        """Get cached invoices by client"""
        key = self.INVOICE_BY_CLIENT_KEY.format(client_id=client_id)
        return self.cache.get(key)

    def cache_invoices_by_status(self, status: str, invoices_data: list[dict]) -> str:
        """Cache invoices by status (versioned)"""
        key = self._versioned_key("invoices", self.INVOICE_BY_STATUS_KEY.format(status=status))
        self.cache.set(key, invoices_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached invoices by status: {key}")
        return key

    def get_cached_invoices_by_status(self, status: str) -> list[dict] | None:
        """Get cached invoices by status"""
        key = self._versioned_key("invoices", self.INVOICE_BY_STATUS_KEY.format(status=status))
        return self.cache.get(key)

    # === PAYMENT METHOD & GATEWAY CACHING ===

    def cache_payment_methods(self, user_id: int, methods_data: list[dict]) -> str:
        """Cache payment methods for a user (non-versioned)"""
        key = self.PAYMENT_METHOD_LIST_KEY.format(user_id=user_id)
        self.cache.set(key, methods_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached payment methods: {key}")
        return key

    def get_cached_payment_methods(self, user_id: int) -> list[dict] | None:
        """Get cached payment methods for a user"""
        key = self.PAYMENT_METHOD_LIST_KEY.format(user_id=user_id)
        return self.cache.get(key)

    def cache_payment_method_detail(self, method_id: int, method_data: dict) -> str:
        """Cache individual payment method detail (non-versioned)"""
        key = self.PAYMENT_METHOD_DETAIL_KEY.format(method_id=method_id)
        self.cache.set(key, method_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached payment method detail: {key}")
        return key

    def get_cached_payment_method_detail(self, method_id: int) -> dict | None:
        """Get cached payment method detail"""
        key = self.PAYMENT_METHOD_DETAIL_KEY.format(method_id=method_id)
        return self.cache.get(key)

    def cache_payment_gateways(self, gateways_data: list[dict]) -> str:
        """Cache payment gateways list (versioned)"""
        key = self._versioned_key("gateways", self.PAYMENT_GATEWAY_LIST_KEY)
        self.cache.set(key, gateways_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached payment gateways: {key}")
        return key

    def get_cached_payment_gateways(self) -> list[dict] | None:
        """Get cached payment gateways"""
        key = self._versioned_key("gateways", self.PAYMENT_GATEWAY_LIST_KEY)
        return self.cache.get(key)

    def cache_active_payment_gateways(self, gateways_data: list[dict]) -> str:
        """Cache active payment gateways (versioned)"""
        key = self._versioned_key("gateways", self.PAYMENT_GATEWAY_ACTIVE_KEY)
        self.cache.set(key, gateways_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached active payment gateways: {key}")
        return key

    def get_cached_active_payment_gateways(self) -> list[dict] | None:
        """Get cached active payment gateways"""
        key = self._versioned_key("gateways", self.PAYMENT_GATEWAY_ACTIVE_KEY)
        return self.cache.get(key)

    # === TAX RATE CACHING ===

    def cache_tax_rates(self, tax_rates_data: list[dict]) -> str:
        """Cache tax rates list (versioned)"""
        key = self._versioned_key("tax_rates", self.TAX_RATE_LIST_KEY)
        self.cache.set(key, tax_rates_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached tax rates: {key}")
        return key

    def get_cached_tax_rates(self) -> list[dict] | None:
        """Get cached tax rates"""
        key = self._versioned_key("tax_rates", self.TAX_RATE_LIST_KEY)
        return self.cache.get(key)

    def cache_active_tax_rates(self, tax_rates_data: list[dict]) -> str:
        """Cache active tax rates (versioned)"""
        key = self._versioned_key("tax_rates", self.TAX_RATE_ACTIVE_KEY)
        self.cache.set(key, tax_rates_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached active tax rates: {key}")
        return key

    def get_cached_active_tax_rates(self) -> list[dict] | None:
        """Get cached active tax rates"""
        key = self._versioned_key("tax_rates", self.TAX_RATE_ACTIVE_KEY)
        return self.cache.get(key)

    def cache_default_tax_rate(self, tax_rate_data: dict) -> str:
        """Cache default tax rate (versioned)"""
        key = self._versioned_key("tax_rates", self.TAX_RATE_DEFAULT_KEY)
        self.cache.set(key, tax_rate_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached default tax rate: {key}")
        return key

    def get_cached_default_tax_rate(self) -> dict | None:
        """Get cached default tax rate"""
        key = self._versioned_key("tax_rates", self.TAX_RATE_DEFAULT_KEY)
        return self.cache.get(key)

    # === REFUND CACHING ===

    def cache_refund_list(self, refunds_data: list[dict], query_params: dict = None) -> str:
        """Cache refund list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("refunds", self.REFUND_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, refunds_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached refund list: {key}")
        return key

    def get_cached_refund_list(self, query_params: dict = None) -> list[dict] | None:
        """Get cached refund list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("refunds", self.REFUND_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_refund_detail(self, refund_id: int, refund_data: dict) -> str:
        """Cache individual refund detail (non-versioned)"""
        key = self.REFUND_DETAIL_KEY.format(refund_id=refund_id)
        self.cache.set(key, refund_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached refund detail: {key}")
        return key

    def get_cached_refund_detail(self, refund_id: int) -> dict | None:
        """Get cached refund detail"""
        key = self.REFUND_DETAIL_KEY.format(refund_id=refund_id)
        return self.cache.get(key)

    def cache_refunds_by_payment(self, payment_id: int, refunds_data: list[dict]) -> str:
        """Cache refunds for a specific payment (non-versioned)"""
        key = self.REFUND_BY_PAYMENT_KEY.format(payment_id=payment_id)
        self.cache.set(key, refunds_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached refunds by payment: {key}")
        return key

    def get_cached_refunds_by_payment(self, payment_id: int) -> list[dict] | None:
        """Get cached refunds by payment"""
        key = self.REFUND_BY_PAYMENT_KEY.format(payment_id=payment_id)
        return self.cache.get(key)

    # === TRANSACTION CACHING ===

    def cache_transaction_list(self, transactions_data: list[dict], query_params: dict = None) -> str:
        """Cache transaction list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("transactions", self.TRANSACTION_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, transactions_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached transaction list: {key}")
        return key

    def get_cached_transaction_list(self, query_params: dict = None) -> list[dict] | None:
        """Get cached transaction list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("transactions", self.TRANSACTION_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_transactions_by_payment(self, payment_id: int, transactions_data: list[dict]) -> str:
        """Cache transactions for a specific payment (non-versioned)"""
        key = self.TRANSACTION_BY_PAYMENT_KEY.format(payment_id=payment_id)
        self.cache.set(key, transactions_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached transactions by payment: {key}")
        return key

    def get_cached_transactions_by_payment(self, payment_id: int) -> list[dict] | None:
        """Get cached transactions by payment"""
        key = self.TRANSACTION_BY_PAYMENT_KEY.format(payment_id=payment_id)
        return self.cache.get(key)

    # === FINANCIAL ANALYTICS CACHING ===

    def cache_financial_stats(self, period: str, stats_data: dict) -> str:
        """Cache financial statistics (versioned)"""
        key = self._versioned_key("analytics", self.FINANCIAL_STATS_KEY.format(period=period))
        self.analytics.set(key, stats_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached financial stats: {key}")
        return key

    def get_cached_financial_stats(self, period: str) -> dict | None:
        """Get cached financial statistics"""
        key = self._versioned_key("analytics", self.FINANCIAL_STATS_KEY.format(period=period))
        return self.analytics.get(key)

    def cache_revenue_stats(self, period: str, revenue_data: dict) -> str:
        """Cache revenue statistics (versioned)"""
        key = self._versioned_key("analytics", self.REVENUE_STATS_KEY.format(period=period))
        self.analytics.set(key, revenue_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached revenue stats: {key}")
        return key

    def get_cached_revenue_stats(self, period: str) -> dict | None:
        """Get cached revenue statistics"""
        key = self._versioned_key("analytics", self.REVENUE_STATS_KEY.format(period=period))
        return self.analytics.get(key)

    def cache_payment_stats(self, period: str, payment_stats_data: dict) -> str:
        """Cache payment statistics (versioned)"""
        key = self._versioned_key("analytics", self.PAYMENT_STATS_KEY.format(period=period))
        self.analytics.set(key, payment_stats_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached payment stats: {key}")
        return key

    def get_cached_payment_stats(self, period: str) -> dict | None:
        """Get cached payment statistics"""
        key = self._versioned_key("analytics", self.PAYMENT_STATS_KEY.format(period=period))
        return self.analytics.get(key)

    def cache_outstanding_payments(self, outstanding_data: dict) -> str:
        """Cache outstanding payments summary (versioned)"""
        key = self._versioned_key("analytics", self.OUTSTANDING_PAYMENTS_KEY)
        self.analytics.set(key, outstanding_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached outstanding payments: {key}")
        return key

    def get_cached_outstanding_payments(self) -> dict | None:
        """Get cached outstanding payments summary"""
        key = self._versioned_key("analytics", self.OUTSTANDING_PAYMENTS_KEY)
        return self.analytics.get(key)

    def cache_cash_flow(self, period: str, cash_flow_data: dict) -> str:
        """Cache cash flow data (versioned)"""
        key = self._versioned_key("analytics", self.CASH_FLOW_KEY.format(period=period))
        self.analytics.set(key, cash_flow_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached cash flow: {key}")
        return key

    def get_cached_cash_flow(self, period: str) -> dict | None:
        """Get cached cash flow data"""
        key = self._versioned_key("analytics", self.CASH_FLOW_KEY.format(period=period))
        return self.analytics.get(key)

    def cache_gateway_performance(self, period: str, performance_data: dict) -> str:
        """Cache payment gateway performance metrics (versioned)"""
        key = self._versioned_key("analytics", self.GATEWAY_PERFORMANCE_KEY.format(period=period))
        self.analytics.set(key, performance_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached gateway performance: {key}")
        return key

    def get_cached_gateway_performance(self, period: str) -> dict | None:
        """Get cached payment gateway performance"""
        key = self._versioned_key("analytics", self.GATEWAY_PERFORMANCE_KEY.format(period=period))
        return self.analytics.get(key)

    # === NOTIFICATION CACHING ===

    def cache_notification_list(self, notifications_data: list[dict], query_params: dict = None) -> str:
        """Cache notification list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("notifications", self.NOTIFICATION_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, notifications_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached notification list: {key}")
        return key

    def get_cached_notification_list(self, query_params: dict = None) -> list[dict] | None:
        """Get cached notification list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("notifications", self.NOTIFICATION_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_notifications_by_payment(self, payment_id: int, notifications_data: list[dict]) -> str:
        """Cache notifications for a specific payment (non-versioned)"""
        key = self.NOTIFICATION_BY_PAYMENT_KEY.format(payment_id=payment_id)
        self.cache.set(key, notifications_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached notifications by payment: {key}")
        return key

    def get_cached_notifications_by_payment(self, payment_id: int) -> list[dict] | None:
        """Get cached notifications by payment"""
        key = self.NOTIFICATION_BY_PAYMENT_KEY.format(payment_id=payment_id)
        return self.cache.get(key)

    # === CACHE INVALIDATION (Version-based - O(1) operations) ===

    def invalidate_payment_gateway_caches(self, gateway_id: int) -> None:
        """Invalidate payment gateway caches"""
        self._invalidate_version_group("gateways")
        self._invalidate_version_group("analytics")  # Gateway changes affect analytics

        # Delete specific gateway detail
        self._delete_specific_key(self.PAYMENT_GATEWAY_DETAIL_KEY.format(gateway_id=gateway_id))
        logger.info(f"Invalidated payment gateway caches for gateway_id: {gateway_id}")

    def invalidate_payment_caches(self, payment_id: int = None, event_id: int = None, client_id: int = None):
        """Invalidate payment-related caches"""
        # Increment versions for payment and analytics caches
        self._invalidate_version_group("payments")
        self._invalidate_version_group("analytics")

        # Delete specific keys
        if payment_id:
            keys_to_delete = [
                self.PAYMENT_DETAIL_KEY.format(payment_id=payment_id),
                self.TRANSACTION_BY_PAYMENT_KEY.format(payment_id=payment_id),
                self.REFUND_BY_PAYMENT_KEY.format(payment_id=payment_id),
                self.NOTIFICATION_BY_PAYMENT_KEY.format(payment_id=payment_id),
            ]
            self._delete_specific_keys(keys_to_delete)

        if event_id:
            keys_to_delete = [
                self.PAYMENT_BY_EVENT_KEY.format(event_id=event_id),
                self.INVOICE_BY_EVENT_KEY.format(event_id=event_id),
            ]
            self._delete_specific_keys(keys_to_delete)

        if client_id:
            keys_to_delete = [
                self.PAYMENT_BY_CLIENT_KEY.format(client_id=client_id),
                self.INVOICE_BY_CLIENT_KEY.format(client_id=client_id),
            ]
            self._delete_specific_keys(keys_to_delete)

        logger.info(f"Invalidated payment caches for payment_id: {payment_id}, event_id: {event_id}")

    def invalidate_invoice_caches(self, invoice_id: int = None, event_id: int = None, client_id: int = None):
        """Invalidate invoice-related caches"""
        # Increment versions for invoice and analytics caches
        self._invalidate_version_group("invoices")
        self._invalidate_version_group("analytics")

        # Delete specific keys
        if invoice_id:
            self._delete_specific_key(self.INVOICE_DETAIL_KEY.format(invoice_id=invoice_id))

        if event_id:
            self._delete_specific_key(self.INVOICE_BY_EVENT_KEY.format(event_id=event_id))

        if client_id:
            self._delete_specific_key(self.INVOICE_BY_CLIENT_KEY.format(client_id=client_id))

        logger.info(f"Invalidated invoice caches for invoice_id: {invoice_id}")

    def invalidate_transaction_caches(self, transaction_id: int = None, payment_id: int = None, gateway_id: int = None):
        """Invalidate transaction-related caches"""
        self._invalidate_version_group("transactions")

        if payment_id:
            self._delete_specific_key(self.TRANSACTION_BY_PAYMENT_KEY.format(payment_id=payment_id))

        logger.info(f"Invalidated transaction caches for transaction_id: {transaction_id}, payment_id: {payment_id}")

    def invalidate_refund_caches(self, refund_id: int = None, payment_id: int = None):
        """Invalidate refund-related caches"""
        self._invalidate_version_group("refunds")

        if refund_id:
            self._delete_specific_key(self.REFUND_DETAIL_KEY.format(refund_id=refund_id))

        if payment_id:
            self._delete_specific_key(self.REFUND_BY_PAYMENT_KEY.format(payment_id=payment_id))

        logger.info(f"Invalidated refund caches for refund_id: {refund_id}, payment_id: {payment_id}")

    def invalidate_payment_method_caches(self, method_id: int = None, user_id: int = None, gateway_id: int = None):
        """Invalidate payment method caches"""
        self._invalidate_version_group("methods")

        if method_id:
            self._delete_specific_key(self.PAYMENT_METHOD_DETAIL_KEY.format(method_id=method_id))

        if user_id:
            self._delete_specific_key(self.PAYMENT_METHOD_LIST_KEY.format(user_id=user_id))

        logger.info(f"Invalidated payment method caches for method_id: {method_id}")

    def invalidate_gateway_caches(self):
        """Invalidate payment gateway caches"""
        self._invalidate_version_group("gateways")
        self._invalidate_version_group("analytics")
        logger.info("Invalidated payment gateway caches")

    def invalidate_tax_rate_caches(self):
        """Invalidate tax rate caches"""
        self._invalidate_version_group("tax_rates")
        logger.info("Invalidated tax rate caches")

    def invalidate_financial_analytics_caches(self):
        """Invalidate all financial analytics caches"""
        self._invalidate_version_group("analytics")
        logger.info("Invalidated financial analytics caches")

    def invalidate_all_financial_analytics_caches(self):
        """Invalidate all financial analytics caches (alias for backward compatibility)"""
        self.invalidate_financial_analytics_caches()

    def invalidate_all_payment_caches(self):
        """Invalidate all payment-related caches"""
        self._invalidate_all_groups()
        logger.info("Invalidated all payment domain caches")

    # === UTILITY METHODS ===

    def _generate_query_hash(self, query_params: dict) -> str:
        """Generate hash for query parameters"""
        sorted_params = sorted(query_params.items())
        query_string = json.dumps(sorted_params, sort_keys=True, default=str)
        return hashlib.md5(query_string.encode()).hexdigest()[:8]

    def cache_queryset(self, queryset: QuerySet, cache_key: str, timeout: int = None) -> list[dict]:
        """
        Cache a Django queryset as JSON data
        Returns the cached data as a list of dictionaries
        """
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM

        # Serialize queryset to JSON with related data optimization
        cached_data = []
        for obj in queryset:
            if hasattr(obj, "to_dict"):
                cached_data.append(obj.to_dict())
            else:
                from django.forms.models import model_to_dict

                item_dict = model_to_dict(obj)
                for key, value in item_dict.items():
                    if isinstance(value, Decimal):
                        item_dict[key] = str(value)
                    elif hasattr(value, "isoformat"):
                        item_dict[key] = value.isoformat()
                cached_data.append(item_dict)

        self.cache.set(cache_key, cached_data, timeout)
        logger.debug(f"Cached queryset with {len(cached_data)} items: {cache_key}")
        return cached_data

    def get_or_set(self, key: str, callable_func, timeout: int = None, use_analytics_cache: bool = False) -> Any:
        """
        Get from cache or set if not exists (cache-aside pattern)
        """
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM

        cache_backend = self.analytics if use_analytics_cache else self.cache

        data = cache_backend.get(key)
        if data is None:
            data = callable_func()
            cache_backend.set(key, data, timeout)
            logger.debug(f"Set cache key: {key}")
        else:
            logger.debug(f"Cache hit for key: {key}")

        return data

    def warm_cache_for_payments(self, payment_ids: list[int] = None):
        """
        Warm cache for frequently accessed payments
        """
        from .models import Payment
        from .serializers import PaymentSerializer

        if payment_ids:
            payments = Payment.objects.filter(id__in=payment_ids)
        else:
            payments = (
                Payment.objects.filter(status__in=["PENDING", "COMPLETED"])
                .select_related("event", "payment_method")
                .order_by("-created_at")[:50]
            )

        for payment in payments:
            serializer = PaymentSerializer(payment)
            self.cache_payment_detail(payment.id, serializer.data)

        logger.info(f"Warmed cache for {payments.count()} payments")

    def get_cache_stats(self) -> dict:
        """Get cache statistics for monitoring"""
        try:
            cache_info = {
                "cache_type": "Redis (Versioned)",
                "domain": self.domain,
                "version_groups": self.version_groups,
                "current_versions": self.get_version_info(),
                "key_patterns": {
                    "versioned": [
                        "payments",
                        "invoices",
                        "refunds",
                        "transactions",
                        "gateways",
                        "tax_rates",
                        "analytics",
                    ],
                    "direct": ["detail", "by_event", "by_client", "by_payment"],
                },
            }
            return cache_info

        except Exception as e:
            return {"error": f"Could not retrieve cache stats: {e}"}


# Global service instance
payments_cache_service = PaymentsCacheService()
