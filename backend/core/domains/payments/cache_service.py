"""
Redis caching service for Payments domain
Handles payments, invoices, payment plans, refunds, gateways, and financial analytics
"""
import json
import logging
import hashlib
from typing import Any, List, Optional, Dict, Union
from django.core.cache import caches
from django.db.models import QuerySet
from datetime import datetime, timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)

# Use the default Redis cache and analytics cache for financial data
redis_cache = caches['default']
analytics_cache = caches['analytics']


class PaymentsCacheService:
    """
    Centralized caching service for Payments domain
    Handles payments, invoices, plans, transactions, and financial analytics
    """
    
    def __init__(self):
        self.cache = redis_cache
        self.analytics = analytics_cache
    
    # Cache key patterns
    PAYMENT_LIST_KEY = "payments:list:{query_hash}"
    PAYMENT_DETAIL_KEY = "payments:detail:{payment_id}"
    PAYMENT_BY_EVENT_KEY = "payments:by_event:{event_id}"
    PAYMENT_BY_STATUS_KEY = "payments:by_status:{status}"
    PAYMENT_BY_CLIENT_KEY = "payments:by_client:{client_id}"
    PAYMENT_OVERDUE_KEY = "payments:overdue"
    PAYMENT_PENDING_KEY = "payments:pending"
    
    INVOICE_LIST_KEY = "payments:invoices:list:{query_hash}"
    INVOICE_DETAIL_KEY = "payments:invoice:detail:{invoice_id}"
    INVOICE_BY_EVENT_KEY = "payments:invoice:by_event:{event_id}"
    INVOICE_BY_CLIENT_KEY = "payments:invoice:by_client:{client_id}"
    INVOICE_BY_STATUS_KEY = "payments:invoice:by_status:{status}"
    
    PAYMENT_PLAN_KEY = "payments:plan:detail:{plan_id}"
    PAYMENT_PLAN_BY_EVENT_KEY = "payments:plan:by_event:{event_id}"
    PAYMENT_INSTALLMENTS_KEY = "payments:installments:{plan_id}"
    
    PAYMENT_METHOD_LIST_KEY = "payments:methods:list:{user_id}"
    PAYMENT_METHOD_DETAIL_KEY = "payments:method:detail:{method_id}"
    PAYMENT_GATEWAY_LIST_KEY = "payments:gateways:list"
    PAYMENT_GATEWAY_ACTIVE_KEY = "payments:gateways:active"
    PAYMENT_GATEWAY_DETAIL_KEY = "payments:gateway:detail:{gateway_id}"
    
    REFUND_LIST_KEY = "payments:refunds:list:{query_hash}"
    REFUND_DETAIL_KEY = "payments:refund:detail:{refund_id}"
    REFUND_BY_PAYMENT_KEY = "payments:refunds:by_payment:{payment_id}"
    
    TRANSACTION_LIST_KEY = "payments:transactions:list:{query_hash}"
    TRANSACTION_BY_PAYMENT_KEY = "payments:transactions:by_payment:{payment_id}"
    
    TAX_RATE_LIST_KEY = "payments:tax_rates:list"
    TAX_RATE_ACTIVE_KEY = "payments:tax_rates:active"
    TAX_RATE_DEFAULT_KEY = "payments:tax_rates:default"
    
    # Financial Analytics
    FINANCIAL_STATS_KEY = "payments:analytics:financial_stats:{period}"
    REVENUE_STATS_KEY = "payments:analytics:revenue:{period}"
    PAYMENT_STATS_KEY = "payments:analytics:payment_stats:{period}"
    OUTSTANDING_PAYMENTS_KEY = "payments:analytics:outstanding"
    CASH_FLOW_KEY = "payments:analytics:cash_flow:{period}"
    GATEWAY_PERFORMANCE_KEY = "payments:analytics:gateway_performance:{period}"
    
    NOTIFICATION_LIST_KEY = "payments:notifications:list:{query_hash}"
    NOTIFICATION_BY_PAYMENT_KEY = "payments:notifications:by_payment:{payment_id}"
    
    # Cache timeout configurations (in seconds)
    TIMEOUT_SHORT = 300      # 5 minutes - frequently changing data (payments, transactions)
    TIMEOUT_MEDIUM = 1800    # 30 minutes - moderate changes (invoices, plans)
    TIMEOUT_LONG = 3600      # 1 hour - stable data (gateways, tax rates)
    TIMEOUT_VERY_LONG = 14400  # 4 hours - very stable data (analytics, reports)
    
    # === PAYMENT CACHING ===
    
    def cache_payment_list(self, payments_data: List[Dict], 
                          query_params: Dict = None) -> str:
        """Cache payment list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.PAYMENT_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, payments_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached payment list: {key}")
        return key
    
    def get_cached_payment_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached payment list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.PAYMENT_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_payment_detail(self, payment_id: int, payment_data: Dict) -> str:
        """Cache individual payment detail"""
        key = self.PAYMENT_DETAIL_KEY.format(payment_id=payment_id)
        self.cache.set(key, payment_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached payment detail: {key}")
        return key
    
    def get_cached_payment_detail(self, payment_id: int) -> Optional[Dict]:
        """Get cached payment detail"""
        key = self.PAYMENT_DETAIL_KEY.format(payment_id=payment_id)
        return self.cache.get(key)
    
    def cache_payments_by_event(self, event_id: int, payments_data: List[Dict]) -> str:
        """Cache payments for a specific event"""
        key = self.PAYMENT_BY_EVENT_KEY.format(event_id=event_id)
        self.cache.set(key, payments_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached payments by event: {key}")
        return key
    
    def get_cached_payments_by_event(self, event_id: int) -> Optional[List[Dict]]:
        """Get cached payments by event"""
        key = self.PAYMENT_BY_EVENT_KEY.format(event_id=event_id)
        return self.cache.get(key)
    
    def cache_payments_by_status(self, status: str, payments_data: List[Dict]) -> str:
        """Cache payments by status"""
        key = self.PAYMENT_BY_STATUS_KEY.format(status=status)
        self.cache.set(key, payments_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached payments by status: {key}")
        return key
    
    def get_cached_payments_by_status(self, status: str) -> Optional[List[Dict]]:
        """Get cached payments by status"""
        key = self.PAYMENT_BY_STATUS_KEY.format(status=status)
        return self.cache.get(key)
    
    def cache_payments_by_client(self, client_id: int, payments_data: List[Dict]) -> str:
        """Cache payments for a specific client"""
        key = self.PAYMENT_BY_CLIENT_KEY.format(client_id=client_id)
        self.cache.set(key, payments_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached payments by client: {key}")
        return key
    
    def get_cached_payments_by_client(self, client_id: int) -> Optional[List[Dict]]:
        """Get cached payments by client"""
        key = self.PAYMENT_BY_CLIENT_KEY.format(client_id=client_id)
        return self.cache.get(key)
    
    def cache_overdue_payments(self, overdue_data: List[Dict]) -> str:
        """Cache overdue payments list"""
        key = self.PAYMENT_OVERDUE_KEY
        self.cache.set(key, overdue_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached overdue payments: {key}")
        return key
    
    def get_cached_overdue_payments(self) -> Optional[List[Dict]]:
        """Get cached overdue payments"""
        return self.cache.get(self.PAYMENT_OVERDUE_KEY)
    
    def cache_pending_payments(self, pending_data: List[Dict]) -> str:
        """Cache pending payments list"""
        key = self.PAYMENT_PENDING_KEY
        self.cache.set(key, pending_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached pending payments: {key}")
        return key
    
    def get_cached_pending_payments(self) -> Optional[List[Dict]]:
        """Get cached pending payments"""
        return self.cache.get(self.PAYMENT_PENDING_KEY)
    
    # === INVOICE CACHING ===
    
    def cache_invoice_list(self, invoices_data: List[Dict], 
                          query_params: Dict = None) -> str:
        """Cache invoice list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.INVOICE_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, invoices_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached invoice list: {key}")
        return key
    
    def get_cached_invoice_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached invoice list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.INVOICE_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_invoice_detail(self, invoice_id: int, invoice_data: Dict) -> str:
        """Cache individual invoice detail"""
        key = self.INVOICE_DETAIL_KEY.format(invoice_id=invoice_id)
        self.cache.set(key, invoice_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached invoice detail: {key}")
        return key
    
    def get_cached_invoice_detail(self, invoice_id: int) -> Optional[Dict]:
        """Get cached invoice detail"""
        key = self.INVOICE_DETAIL_KEY.format(invoice_id=invoice_id)
        return self.cache.get(key)
    
    def cache_invoices_by_event(self, event_id: int, invoices_data: List[Dict]) -> str:
        """Cache invoices for a specific event"""
        key = self.INVOICE_BY_EVENT_KEY.format(event_id=event_id)
        self.cache.set(key, invoices_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached invoices by event: {key}")
        return key
    
    def get_cached_invoices_by_event(self, event_id: int) -> Optional[List[Dict]]:
        """Get cached invoices by event"""
        key = self.INVOICE_BY_EVENT_KEY.format(event_id=event_id)
        return self.cache.get(key)
    
    def cache_invoices_by_client(self, client_id: int, invoices_data: List[Dict]) -> str:
        """Cache invoices for a specific client"""
        key = self.INVOICE_BY_CLIENT_KEY.format(client_id=client_id)
        self.cache.set(key, invoices_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached invoices by client: {key}")
        return key
    
    def get_cached_invoices_by_client(self, client_id: int) -> Optional[List[Dict]]:
        """Get cached invoices by client"""
        key = self.INVOICE_BY_CLIENT_KEY.format(client_id=client_id)
        return self.cache.get(key)
    
    def cache_invoices_by_status(self, status: str, invoices_data: List[Dict]) -> str:
        """Cache invoices by status"""
        key = self.INVOICE_BY_STATUS_KEY.format(status=status)
        self.cache.set(key, invoices_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached invoices by status: {key}")
        return key
    
    def get_cached_invoices_by_status(self, status: str) -> Optional[List[Dict]]:
        """Get cached invoices by status"""
        key = self.INVOICE_BY_STATUS_KEY.format(status=status)
        return self.cache.get(key)
    
    # === PAYMENT PLAN CACHING ===
    
    def cache_payment_plan(self, plan_id: int, plan_data: Dict) -> str:
        """Cache payment plan detail"""
        key = self.PAYMENT_PLAN_KEY.format(plan_id=plan_id)
        self.cache.set(key, plan_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached payment plan: {key}")
        return key
    
    def get_cached_payment_plan(self, plan_id: int) -> Optional[Dict]:
        """Get cached payment plan"""
        key = self.PAYMENT_PLAN_KEY.format(plan_id=plan_id)
        return self.cache.get(key)
    
    def cache_payment_plan_by_event(self, event_id: int, plan_data: Dict) -> str:
        """Cache payment plan for a specific event"""
        key = self.PAYMENT_PLAN_BY_EVENT_KEY.format(event_id=event_id)
        self.cache.set(key, plan_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached payment plan by event: {key}")
        return key
    
    def get_cached_payment_plan_by_event(self, event_id: int) -> Optional[Dict]:
        """Get cached payment plan by event"""
        key = self.PAYMENT_PLAN_BY_EVENT_KEY.format(event_id=event_id)
        return self.cache.get(key)
    
    def cache_payment_installments(self, plan_id: int, installments_data: List[Dict]) -> str:
        """Cache installments for a payment plan"""
        key = self.PAYMENT_INSTALLMENTS_KEY.format(plan_id=plan_id)
        self.cache.set(key, installments_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached payment installments: {key}")
        return key
    
    def get_cached_payment_installments(self, plan_id: int) -> Optional[List[Dict]]:
        """Get cached payment installments"""
        key = self.PAYMENT_INSTALLMENTS_KEY.format(plan_id=plan_id)
        return self.cache.get(key)
    
    # === PAYMENT METHOD & GATEWAY CACHING ===
    
    def cache_payment_methods(self, user_id: int, methods_data: List[Dict]) -> str:
        """Cache payment methods for a user"""
        key = self.PAYMENT_METHOD_LIST_KEY.format(user_id=user_id)
        self.cache.set(key, methods_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached payment methods: {key}")
        return key
    
    def get_cached_payment_methods(self, user_id: int) -> Optional[List[Dict]]:
        """Get cached payment methods for a user"""
        key = self.PAYMENT_METHOD_LIST_KEY.format(user_id=user_id)
        return self.cache.get(key)
    
    def cache_payment_method_detail(self, method_id: int, method_data: Dict) -> str:
        """Cache individual payment method detail"""
        key = self.PAYMENT_METHOD_DETAIL_KEY.format(method_id=method_id)
        self.cache.set(key, method_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached payment method detail: {key}")
        return key
    
    def get_cached_payment_method_detail(self, method_id: int) -> Optional[Dict]:
        """Get cached payment method detail"""
        key = self.PAYMENT_METHOD_DETAIL_KEY.format(method_id=method_id)
        return self.cache.get(key)
    
    def cache_payment_gateways(self, gateways_data: List[Dict]) -> str:
        """Cache payment gateways list"""
        key = self.PAYMENT_GATEWAY_LIST_KEY
        self.cache.set(key, gateways_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached payment gateways: {key}")
        return key
    
    def get_cached_payment_gateways(self) -> Optional[List[Dict]]:
        """Get cached payment gateways"""
        return self.cache.get(self.PAYMENT_GATEWAY_LIST_KEY)
    
    def cache_active_payment_gateways(self, gateways_data: List[Dict]) -> str:
        """Cache active payment gateways"""
        key = self.PAYMENT_GATEWAY_ACTIVE_KEY
        self.cache.set(key, gateways_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached active payment gateways: {key}")
        return key
    
    def get_cached_active_payment_gateways(self) -> Optional[List[Dict]]:
        """Get cached active payment gateways"""
        return self.cache.get(self.PAYMENT_GATEWAY_ACTIVE_KEY)
    
    # === TAX RATE CACHING ===
    
    def cache_tax_rates(self, tax_rates_data: List[Dict]) -> str:
        """Cache tax rates list"""
        key = self.TAX_RATE_LIST_KEY
        self.cache.set(key, tax_rates_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached tax rates: {key}")
        return key
    
    def get_cached_tax_rates(self) -> Optional[List[Dict]]:
        """Get cached tax rates"""
        return self.cache.get(self.TAX_RATE_LIST_KEY)
    
    def cache_active_tax_rates(self, tax_rates_data: List[Dict]) -> str:
        """Cache active tax rates"""
        key = self.TAX_RATE_ACTIVE_KEY
        self.cache.set(key, tax_rates_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached active tax rates: {key}")
        return key
    
    def get_cached_active_tax_rates(self) -> Optional[List[Dict]]:
        """Get cached active tax rates"""
        return self.cache.get(self.TAX_RATE_ACTIVE_KEY)
    
    def cache_default_tax_rate(self, tax_rate_data: Dict) -> str:
        """Cache default tax rate"""
        key = self.TAX_RATE_DEFAULT_KEY
        self.cache.set(key, tax_rate_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached default tax rate: {key}")
        return key
    
    def get_cached_default_tax_rate(self) -> Optional[Dict]:
        """Get cached default tax rate"""
        return self.cache.get(self.TAX_RATE_DEFAULT_KEY)
    
    # === REFUND CACHING ===
    
    def cache_refund_list(self, refunds_data: List[Dict], 
                         query_params: Dict = None) -> str:
        """Cache refund list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.REFUND_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, refunds_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached refund list: {key}")
        return key
    
    def get_cached_refund_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached refund list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.REFUND_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_refund_detail(self, refund_id: int, refund_data: Dict) -> str:
        """Cache individual refund detail"""
        key = self.REFUND_DETAIL_KEY.format(refund_id=refund_id)
        self.cache.set(key, refund_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached refund detail: {key}")
        return key
    
    def get_cached_refund_detail(self, refund_id: int) -> Optional[Dict]:
        """Get cached refund detail"""
        key = self.REFUND_DETAIL_KEY.format(refund_id=refund_id)
        return self.cache.get(key)
    
    def cache_refunds_by_payment(self, payment_id: int, refunds_data: List[Dict]) -> str:
        """Cache refunds for a specific payment"""
        key = self.REFUND_BY_PAYMENT_KEY.format(payment_id=payment_id)
        self.cache.set(key, refunds_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached refunds by payment: {key}")
        return key
    
    def get_cached_refunds_by_payment(self, payment_id: int) -> Optional[List[Dict]]:
        """Get cached refunds by payment"""
        key = self.REFUND_BY_PAYMENT_KEY.format(payment_id=payment_id)
        return self.cache.get(key)
    
    # === TRANSACTION CACHING ===
    
    def cache_transaction_list(self, transactions_data: List[Dict], 
                              query_params: Dict = None) -> str:
        """Cache transaction list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.TRANSACTION_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, transactions_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached transaction list: {key}")
        return key
    
    def get_cached_transaction_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached transaction list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.TRANSACTION_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_transactions_by_payment(self, payment_id: int, transactions_data: List[Dict]) -> str:
        """Cache transactions for a specific payment"""
        key = self.TRANSACTION_BY_PAYMENT_KEY.format(payment_id=payment_id)
        self.cache.set(key, transactions_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached transactions by payment: {key}")
        return key
    
    def get_cached_transactions_by_payment(self, payment_id: int) -> Optional[List[Dict]]:
        """Get cached transactions by payment"""
        key = self.TRANSACTION_BY_PAYMENT_KEY.format(payment_id=payment_id)
        return self.cache.get(key)
    
    # === FINANCIAL ANALYTICS CACHING ===
    
    def cache_financial_stats(self, period: str, stats_data: Dict) -> str:
        """Cache financial statistics"""
        key = self.FINANCIAL_STATS_KEY.format(period=period)
        self.analytics.set(key, stats_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached financial stats: {key}")
        return key
    
    def get_cached_financial_stats(self, period: str) -> Optional[Dict]:
        """Get cached financial statistics"""
        key = self.FINANCIAL_STATS_KEY.format(period=period)
        return self.analytics.get(key)
    
    def cache_revenue_stats(self, period: str, revenue_data: Dict) -> str:
        """Cache revenue statistics"""
        key = self.REVENUE_STATS_KEY.format(period=period)
        self.analytics.set(key, revenue_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached revenue stats: {key}")
        return key
    
    def get_cached_revenue_stats(self, period: str) -> Optional[Dict]:
        """Get cached revenue statistics"""
        key = self.REVENUE_STATS_KEY.format(period=period)
        return self.analytics.get(key)
    
    def cache_payment_stats(self, period: str, payment_stats_data: Dict) -> str:
        """Cache payment statistics"""
        key = self.PAYMENT_STATS_KEY.format(period=period)
        self.analytics.set(key, payment_stats_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached payment stats: {key}")
        return key
    
    def get_cached_payment_stats(self, period: str) -> Optional[Dict]:
        """Get cached payment statistics"""
        key = self.PAYMENT_STATS_KEY.format(period=period)
        return self.analytics.get(key)
    
    def cache_outstanding_payments(self, outstanding_data: Dict) -> str:
        """Cache outstanding payments summary"""
        key = self.OUTSTANDING_PAYMENTS_KEY
        self.analytics.set(key, outstanding_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached outstanding payments: {key}")
        return key
    
    def get_cached_outstanding_payments(self) -> Optional[Dict]:
        """Get cached outstanding payments summary"""
        return self.analytics.get(self.OUTSTANDING_PAYMENTS_KEY)
    
    def cache_cash_flow(self, period: str, cash_flow_data: Dict) -> str:
        """Cache cash flow data"""
        key = self.CASH_FLOW_KEY.format(period=period)
        self.analytics.set(key, cash_flow_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached cash flow: {key}")
        return key
    
    def get_cached_cash_flow(self, period: str) -> Optional[Dict]:
        """Get cached cash flow data"""
        key = self.CASH_FLOW_KEY.format(period=period)
        return self.analytics.get(key)
    
    def cache_gateway_performance(self, period: str, performance_data: Dict) -> str:
        """Cache payment gateway performance metrics"""
        key = self.GATEWAY_PERFORMANCE_KEY.format(period=period)
        self.analytics.set(key, performance_data, self.TIMEOUT_VERY_LONG)
        logger.debug(f"Cached gateway performance: {key}")
        return key
    
    def get_cached_gateway_performance(self, period: str) -> Optional[Dict]:
        """Get cached payment gateway performance"""
        key = self.GATEWAY_PERFORMANCE_KEY.format(period=period)
        return self.analytics.get(key)
    
    # === NOTIFICATION CACHING ===
    
    def cache_notification_list(self, notifications_data: List[Dict], 
                               query_params: Dict = None) -> str:
        """Cache notification list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.NOTIFICATION_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, notifications_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached notification list: {key}")
        return key
    
    def get_cached_notification_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached notification list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.NOTIFICATION_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_notifications_by_payment(self, payment_id: int, notifications_data: List[Dict]) -> str:
        """Cache notifications for a specific payment"""
        key = self.NOTIFICATION_BY_PAYMENT_KEY.format(payment_id=payment_id)
        self.cache.set(key, notifications_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached notifications by payment: {key}")
        return key
    
    def get_cached_notifications_by_payment(self, payment_id: int) -> Optional[List[Dict]]:
        """Get cached notifications by payment"""
        key = self.NOTIFICATION_BY_PAYMENT_KEY.format(payment_id=payment_id)
        return self.cache.get(key)
    
    # === CACHE INVALIDATION ===
    
    def invalidate_payment_gateway_caches(self, gateway_id: int) -> None:
        """Invalidate payment gateway caches"""
        keys_to_delete = [
            self.PAYMENT_GATEWAY_DETAIL_KEY.format(gateway_id=gateway_id),
            self.PAYMENT_GATEWAY_LIST_KEY,
            self.PAYMENT_GATEWAY_ACTIVE_KEY,
        ]
        
        self.cache.delete_many(keys_to_delete)
        logger.info(f"Invalidated payment gateway caches for gateway_id: {gateway_id}")
    
    def invalidate_installment_caches(self, installment_id: int, plan_id: int) -> None:
        """Invalidate installment caches"""
        keys_to_delete = [
            self.PAYMENT_INSTALLMENTS_KEY.format(plan_id=plan_id),
            f"payments:installment:detail:{installment_id}"
        ]
        self.cache.delete_many(keys_to_delete)
        logger.info(f"Invalidated installment caches for installment_id: {installment_id}, plan_id: {plan_id}")
    
    def invalidate_payment_caches(self, payment_id: int = None, event_id: int = None, 
                                 client_id: int = None):
        """Invalidate payment-related caches"""
        patterns_to_invalidate = [
            f"payments:list:*",
            f"payments:by_status:*",
            self.PAYMENT_OVERDUE_KEY,
            self.PAYMENT_PENDING_KEY,
            f"payments:analytics:*"  # Payments affect financial analytics
        ]
        
        if payment_id:
            patterns_to_invalidate.extend([
                self.PAYMENT_DETAIL_KEY.format(payment_id=payment_id),
                self.TRANSACTION_BY_PAYMENT_KEY.format(payment_id=payment_id),
                self.REFUND_BY_PAYMENT_KEY.format(payment_id=payment_id),
                self.NOTIFICATION_BY_PAYMENT_KEY.format(payment_id=payment_id)
            ])
        
        if event_id:
            patterns_to_invalidate.extend([
                self.PAYMENT_BY_EVENT_KEY.format(event_id=event_id),
                self.INVOICE_BY_EVENT_KEY.format(event_id=event_id),
                self.PAYMENT_PLAN_BY_EVENT_KEY.format(event_id=event_id)
            ])
        
        if client_id:
            patterns_to_invalidate.extend([
                self.PAYMENT_BY_CLIENT_KEY.format(client_id=client_id),
                self.INVOICE_BY_CLIENT_KEY.format(client_id=client_id)
            ])
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated payment caches for payment_id: {payment_id}, event_id: {event_id}")
    
    def invalidate_invoice_caches(self, invoice_id: int = None, event_id: int = None, 
                                 client_id: int = None):
        """Invalidate invoice-related caches"""
        patterns_to_invalidate = [
            f"payments:invoices:list:*",
            f"payments:invoice:by_status:*",
            f"payments:analytics:*"  # Invoices affect financial analytics
        ]
        
        if invoice_id:
            patterns_to_invalidate.append(
                self.INVOICE_DETAIL_KEY.format(invoice_id=invoice_id)
            )
        
        if event_id:
            patterns_to_invalidate.append(
                self.INVOICE_BY_EVENT_KEY.format(event_id=event_id)
            )
        
        if client_id:
            patterns_to_invalidate.append(
                self.INVOICE_BY_CLIENT_KEY.format(client_id=client_id)
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated invoice caches for invoice_id: {invoice_id}")
    
    def invalidate_payment_plan_caches(self, plan_id: int = None, event_id: int = None):
        """Invalidate payment plan-related caches"""
        patterns_to_invalidate = []
        
        if plan_id:
            patterns_to_invalidate.extend([
                self.PAYMENT_PLAN_KEY.format(plan_id=plan_id),
                self.PAYMENT_INSTALLMENTS_KEY.format(plan_id=plan_id)
            ])
        
        if event_id:
            patterns_to_invalidate.append(
                self.PAYMENT_PLAN_BY_EVENT_KEY.format(event_id=event_id)
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated payment plan caches for plan_id: {plan_id}")
    
    def invalidate_transaction_caches(self, transaction_id: int = None, payment_id: int = None, gateway_id: int = None):
        """Invalidate transaction-related caches"""
        patterns_to_invalidate = [
            f"payments:transactions:list:*"
        ]
        
        if payment_id:
            patterns_to_invalidate.append(
                self.TRANSACTION_BY_PAYMENT_KEY.format(payment_id=payment_id)
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated transaction caches for transaction_id: {transaction_id}, payment_id: {payment_id}")
    
    def invalidate_refund_caches(self, refund_id: int = None, payment_id: int = None):
        """Invalidate refund-related caches"""
        patterns_to_invalidate = [
            f"payments:refunds:list:*"
        ]
        
        if refund_id:
            patterns_to_invalidate.append(
                self.REFUND_DETAIL_KEY.format(refund_id=refund_id)
            )
        
        if payment_id:
            patterns_to_invalidate.append(
                self.REFUND_BY_PAYMENT_KEY.format(payment_id=payment_id)
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated refund caches for refund_id: {refund_id}, payment_id: {payment_id}")

    def invalidate_payment_method_caches(self, method_id: int = None, user_id: int = None, gateway_id: int = None):
        """Invalidate payment method caches"""
        patterns_to_invalidate = []
        
        if method_id:
            patterns_to_invalidate.append(
                self.PAYMENT_METHOD_DETAIL_KEY.format(method_id=method_id)
            )
        
        if user_id:
            patterns_to_invalidate.append(
                self.PAYMENT_METHOD_LIST_KEY.format(user_id=user_id)
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated payment method caches for method_id: {method_id}")
    
    def invalidate_gateway_caches(self):
        """Invalidate payment gateway caches"""
        patterns_to_invalidate = [
            self.PAYMENT_GATEWAY_LIST_KEY,
            self.PAYMENT_GATEWAY_ACTIVE_KEY,
            f"payments:analytics:gateway_performance:*"
        ]
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info("Invalidated payment gateway caches")
    
    def invalidate_tax_rate_caches(self):
        """Invalidate tax rate caches"""
        patterns_to_invalidate = [
            self.TAX_RATE_LIST_KEY,
            self.TAX_RATE_ACTIVE_KEY,
            self.TAX_RATE_DEFAULT_KEY
        ]
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info("Invalidated tax rate caches")
    
    def invalidate_financial_analytics_caches(self):
        """Invalidate all financial analytics caches"""
        patterns_to_invalidate = [
            f"payments:analytics:*"
        ]
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info("Invalidated financial analytics caches")
    
    def invalidate_all_financial_analytics_caches(self):
        """Invalidate all financial analytics caches (alias for backward compatibility)"""
        self.invalidate_financial_analytics_caches()
    
    def invalidate_all_payment_caches(self):
        """Invalidate all payment-related caches"""
        patterns_to_invalidate = [f"payments:*"]
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info("Invalidated all payment domain caches")
    
    # === UTILITY METHODS ===
    
    def _generate_query_hash(self, query_params: Dict) -> str:
        """Generate hash for query parameters"""
        # Sort parameters for consistent hashing
        sorted_params = sorted(query_params.items())
        query_string = json.dumps(sorted_params, sort_keys=True, default=str)
        return hashlib.md5(query_string.encode()).hexdigest()[:8]
    
    def _invalidate_cache_patterns(self, patterns: List[str]):
        """Invalidate cache keys matching patterns"""
        for pattern in patterns:
            if '*' in pattern:
                # For pattern matching, we'd need to use Redis SCAN
                try:
                    keys = self.cache.keys(pattern)
                    if keys:
                        self.cache.delete_many(keys)
                        logger.debug(f"Invalidated {len(keys)} keys matching {pattern}")
                    
                    # Also check analytics cache for analytics patterns
                    if 'analytics' in pattern:
                        analytics_keys = self.analytics.keys(pattern)
                        if analytics_keys:
                            self.analytics.delete_many(analytics_keys)
                            logger.debug(f"Invalidated {len(analytics_keys)} analytics keys matching {pattern}")
                            
                except Exception as e:
                    logger.warning(f"Could not invalidate pattern {pattern}: {e}")
            else:
                # Direct key deletion
                self.cache.delete(pattern)
                if 'analytics' in pattern:
                    self.analytics.delete(pattern)
                logger.debug(f"Invalidated cache key: {pattern}")
    
    def cache_queryset(self, queryset: QuerySet, cache_key: str, 
                      timeout: int = None) -> List[Dict]:
        """
        Cache a Django queryset as JSON data
        Returns the cached data as a list of dictionaries
        """
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM
            
        # Serialize queryset to JSON with related data optimization
        cached_data = []
        for obj in queryset.select_related('event', 'payment_method', 'gateway'):
            if hasattr(obj, 'to_dict'):
                cached_data.append(obj.to_dict())
            else:
                # Fallback to model_to_dict
                from django.forms.models import model_to_dict
                item_dict = model_to_dict(obj)
                
                # Convert Decimal fields to string for JSON serialization
                for key, value in item_dict.items():
                    if isinstance(value, Decimal):
                        item_dict[key] = str(value)
                    elif hasattr(value, 'isoformat'):  # datetime objects
                        item_dict[key] = value.isoformat()
                cached_data.append(item_dict)
        
        self.cache.set(cache_key, cached_data, timeout)
        logger.debug(f"Cached queryset with {len(cached_data)} items: {cache_key}")
        return cached_data
    
    def get_or_set(self, key: str, callable_func, timeout: int = None, 
                   use_analytics_cache: bool = False) -> Any:
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
    
    def warm_cache_for_payments(self, payment_ids: List[int] = None):
        """
        Warm cache for frequently accessed payments
        """
        from .models import Payment
        from .serializers import PaymentSerializer
        
        if payment_ids:
            payments = Payment.objects.filter(id__in=payment_ids)
        else:
            # Cache recent pending and completed payments
            payments = Payment.objects.filter(
                status__in=['PENDING', 'COMPLETED']
            ).select_related('event', 'payment_method').order_by('-created_at')[:50]
        
        for payment in payments:
            serializer = PaymentSerializer(payment)
            self.cache_payment_detail(payment.id, serializer.data)
        
        logger.info(f"Warmed cache for {payments.count()} payments")
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics for monitoring"""
        try:
            cache_info = {
                'cache_type': 'Redis',
                'backend': str(self.cache.__class__),
                'analytics_backend': str(self.analytics.__class__),
                'key_patterns': {
                    'payments': ['payments:list:*', 'payments:detail:*', 'payments:by_event:*'],
                    'invoices': ['payments:invoices:*', 'payments:invoice:*'],
                    'plans': ['payments:plan:*', 'payments:installments:*'],
                    'methods': ['payments:methods:*', 'payments:gateways:*'],
                    'refunds': ['payments:refunds:*'],
                    'transactions': ['payments:transactions:*'],
                    'analytics': ['payments:analytics:*'],
                    'notifications': ['payments:notifications:*']
                }
            }
            
            # Try to get some sample keys
            sample_keys = []
            for pattern in ['payments:gateways:active', 'payments:tax_rates:default']:
                if self.cache.get(pattern) is not None:
                    sample_keys.append(pattern)
            
            cache_info['sample_cached_keys'] = sample_keys
            cache_info['sample_keys_count'] = len(sample_keys)
            
            return cache_info
            
        except Exception as e:
            return {'error': f'Could not retrieve cache stats: {e}'}


# Global service instance
payments_cache_service = PaymentsCacheService()