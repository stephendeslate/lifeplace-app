"""
Redis caching service for Products domain
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


class ProductCacheService(VersionedCacheService):
    """
    Centralized caching service for Products domain
    Uses versioned caching - invalidation is O(1) via version increment
    """

    # Domain identifier for cache keys
    domain = "products"

    # Version groups - invalidating a group increments its version
    version_groups = {
        "categories": ["categories", "tree"],  # Category lists and tree
        "products": ["list", "featured", "active", "by_category", "batch", "rates_page"],  # Product lists
        "discounts": ["discounts"],  # Discount lists
        "pricing": ["pricing"],  # Pricing calculations
    }

    # Versioned cache key patterns
    CATEGORY_TREE_KEY = "categories:tree"
    CATEGORY_LIST_KEY = "categories:list:{query_hash}"
    PRODUCT_LIST_KEY = "list:{query_hash}"
    PRODUCT_FEATURED_KEY = "featured"
    PRODUCT_ACTIVE_KEY = "active"
    PRODUCT_BY_CATEGORY_KEY = "by_category:{category_id}"
    PRODUCT_BATCH_KEY = "batch:{ids_hash}"
    DISCOUNT_LIST_KEY = "discounts:list:{query_hash}"
    DISCOUNT_VALID_KEY = "discounts:valid"
    DISCOUNT_BY_TYPE_KEY = "discounts:by_type:{discount_type}"
    RATES_PAGE_KEY = "rates_page"
    PRICING_CALCULATION_KEY = "pricing:{product_ids_hash}:{params_hash}"

    # Non-versioned keys (specific to individual entities - direct deletion)
    CATEGORY_DETAIL_KEY = "products:category:detail:{category_id}"
    PRODUCT_DETAIL_KEY = "products:detail:{product_id}"
    DISCOUNT_DETAIL_KEY = "products:discount:detail:{discount_id}"

    # Cache timeout configurations (in seconds)
    TIMEOUT_SHORT = 300  # 5 minutes - frequently changing data
    TIMEOUT_MEDIUM = 1800  # 30 minutes - moderate changes
    TIMEOUT_LONG = 3600  # 1 hour - stable data
    TIMEOUT_VERY_LONG = 14400  # 4 hours - very stable data

    # === CATEGORY CACHING ===

    def cache_categories_tree(self, categories_data: list[dict]) -> str:
        """Cache the categories tree structure (versioned)"""
        key = self._versioned_key("categories", self.CATEGORY_TREE_KEY)
        self.cache.set(key, categories_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached categories tree: {key}")
        return key

    def get_cached_categories_tree(self) -> list[dict] | None:
        """Get cached categories tree"""
        key = self._versioned_key("categories", self.CATEGORY_TREE_KEY)
        return self.cache.get(key)

    def cache_category_list(self, categories_data: list[dict], query_params: dict = None) -> str:
        """Cache category list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("categories", self.CATEGORY_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, categories_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached category list: {key}")
        return key

    def get_cached_category_list(self, query_params: dict = None) -> list[dict] | None:
        """Get cached category list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("categories", self.CATEGORY_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_category_detail(self, category_id: int, category_data: dict) -> str:
        """Cache individual category detail (non-versioned)"""
        key = self.CATEGORY_DETAIL_KEY.format(category_id=category_id)
        self.cache.set(key, category_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached category detail: {key}")
        return key

    def get_cached_category_detail(self, category_id: int) -> dict | None:
        """Get cached category detail"""
        key = self.CATEGORY_DETAIL_KEY.format(category_id=category_id)
        return self.cache.get(key)

    # === PRODUCT CACHING ===

    def cache_product_list(self, products_data: list[dict], query_params: dict = None) -> str:
        """Cache product list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("products", self.PRODUCT_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, products_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached product list: {key}")
        return key

    def get_cached_product_list(self, query_params: dict = None) -> list[dict] | None:
        """Get cached product list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("products", self.PRODUCT_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_product_detail(self, product_id: int, product_data: dict) -> str:
        """Cache individual product detail (non-versioned)"""
        key = self.PRODUCT_DETAIL_KEY.format(product_id=product_id)
        self.cache.set(key, product_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached product detail: {key}")
        return key

    def get_cached_product_detail(self, product_id: int) -> dict | None:
        """Get cached product detail"""
        key = self.PRODUCT_DETAIL_KEY.format(product_id=product_id)
        return self.cache.get(key)

    def cache_product_batch(self, product_ids: list[int], products_data: list[dict]) -> str:
        """Cache batch product data (versioned)"""
        ids_hash = self._generate_ids_hash(product_ids)
        key = self._versioned_key("products", self.PRODUCT_BATCH_KEY.format(ids_hash=ids_hash))
        self.cache.set(key, products_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached product batch: {key}")
        return key

    def get_cached_product_batch(self, product_ids: list[int]) -> list[dict] | None:
        """Get cached batch product data"""
        ids_hash = self._generate_ids_hash(product_ids)
        key = self._versioned_key("products", self.PRODUCT_BATCH_KEY.format(ids_hash=ids_hash))
        return self.cache.get(key)

    def cache_featured_products(self, products_data: list[dict]) -> str:
        """Cache featured products (versioned)"""
        key = self._versioned_key("products", self.PRODUCT_FEATURED_KEY)
        self.cache.set(key, products_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached featured products: {key}")
        return key

    def get_cached_featured_products(self) -> list[dict] | None:
        """Get cached featured products"""
        key = self._versioned_key("products", self.PRODUCT_FEATURED_KEY)
        return self.cache.get(key)

    def cache_active_products(self, products_data: list[dict]) -> str:
        """Cache active products (versioned)"""
        key = self._versioned_key("products", self.PRODUCT_ACTIVE_KEY)
        self.cache.set(key, products_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached active products: {key}")
        return key

    def get_cached_active_products(self) -> list[dict] | None:
        """Get cached active products"""
        key = self._versioned_key("products", self.PRODUCT_ACTIVE_KEY)
        return self.cache.get(key)

    def cache_products_by_category(self, category_id: int, products_data: list[dict]) -> str:
        """Cache products by category (versioned)"""
        key = self._versioned_key("products", self.PRODUCT_BY_CATEGORY_KEY.format(category_id=category_id))
        self.cache.set(key, products_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached products by category: {key}")
        return key

    def get_cached_products_by_category(self, category_id: int) -> list[dict] | None:
        """Get cached products by category"""
        key = self._versioned_key("products", self.PRODUCT_BY_CATEGORY_KEY.format(category_id=category_id))
        return self.cache.get(key)

    # === DISCOUNT CACHING ===

    def cache_discount_list(self, discounts_data: list[dict], query_params: dict = None) -> str:
        """Cache discount list with query parameters (versioned)"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("discounts", self.DISCOUNT_LIST_KEY.format(query_hash=query_hash))
        self.cache.set(key, discounts_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached discount list: {key}")
        return key

    def get_cached_discount_list(self, query_params: dict = None) -> list[dict] | None:
        """Get cached discount list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self._versioned_key("discounts", self.DISCOUNT_LIST_KEY.format(query_hash=query_hash))
        return self.cache.get(key)

    def cache_discount_detail(self, discount_id: int, discount_data: dict) -> str:
        """Cache individual discount detail (non-versioned)"""
        key = self.DISCOUNT_DETAIL_KEY.format(discount_id=discount_id)
        self.cache.set(key, discount_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached discount detail: {key}")
        return key

    def get_cached_discount_detail(self, discount_id: int) -> dict | None:
        """Get cached discount detail"""
        key = self.DISCOUNT_DETAIL_KEY.format(discount_id=discount_id)
        return self.cache.get(key)

    def cache_valid_discounts(self, discounts_data: list[dict]) -> str:
        """Cache currently valid discounts (versioned)"""
        key = self._versioned_key("discounts", self.DISCOUNT_VALID_KEY)
        self.cache.set(key, discounts_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached valid discounts: {key}")
        return key

    def get_cached_valid_discounts(self) -> list[dict] | None:
        """Get cached valid discounts"""
        key = self._versioned_key("discounts", self.DISCOUNT_VALID_KEY)
        return self.cache.get(key)

    def cache_discounts_by_type(self, discount_type: str, discounts_data: list[dict]) -> str:
        """Cache discounts by type (versioned)"""
        key = self._versioned_key("discounts", self.DISCOUNT_BY_TYPE_KEY.format(discount_type=discount_type))
        self.cache.set(key, discounts_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached discounts by type: {key}")
        return key

    def get_cached_discounts_by_type(self, discount_type: str) -> list[dict] | None:
        """Get cached discounts by type"""
        key = self._versioned_key("discounts", self.DISCOUNT_BY_TYPE_KEY.format(discount_type=discount_type))
        return self.cache.get(key)

    # === PRICING CACHING ===

    def cache_pricing_calculation(self, product_ids: list[int], calculation_params: dict, pricing_result: dict) -> str:
        """Cache pricing calculation result (versioned)"""
        ids_hash = self._generate_ids_hash(product_ids)
        params_hash = self._generate_query_hash(calculation_params)
        key = self._versioned_key(
            "pricing", self.PRICING_CALCULATION_KEY.format(product_ids_hash=ids_hash, params_hash=params_hash)
        )
        self.cache.set(key, pricing_result, self.TIMEOUT_SHORT)
        logger.debug(f"Cached pricing calculation: {key}")
        return key

    def get_cached_pricing_calculation(self, product_ids: list[int], calculation_params: dict) -> dict | None:
        """Get cached pricing calculation"""
        ids_hash = self._generate_ids_hash(product_ids)
        params_hash = self._generate_query_hash(calculation_params)
        key = self._versioned_key(
            "pricing", self.PRICING_CALCULATION_KEY.format(product_ids_hash=ids_hash, params_hash=params_hash)
        )
        return self.cache.get(key)

    # === CACHE INVALIDATION (Version-based - O(1) operations) ===

    def invalidate_category_caches(self, category_id: int = None):
        """
        Invalidate category-related caches.

        Uses version increment for category list caches (O(1)).
        Also invalidates products since categories affect product listings.
        """
        # Increment version for category and product caches
        self._invalidate_version_group("categories")
        self._invalidate_version_group("products")  # Categories affect product listings

        # Delete specific category key if provided
        if category_id:
            self._delete_specific_key(self.CATEGORY_DETAIL_KEY.format(category_id=category_id))

        logger.info(f"Invalidated category caches for category_id: {category_id}")

    def invalidate_product_caches(self, product_id: int = None):
        """
        Invalidate product-related caches.

        Uses version increment for product and pricing caches (O(1)).
        """
        # Increment version for product and pricing caches
        self._invalidate_version_group("products")
        self._invalidate_version_group("pricing")

        # Delete specific product key if provided
        if product_id:
            self._delete_specific_key(self.PRODUCT_DETAIL_KEY.format(product_id=product_id))

        logger.info(f"Invalidated product caches for product_id: {product_id}")

    def invalidate_discount_caches(self, discount_id: int = None):
        """
        Invalidate discount-related caches.

        Uses version increment for discount and pricing caches (O(1)).
        """
        # Increment version for discount and pricing caches
        self._invalidate_version_group("discounts")
        self._invalidate_version_group("pricing")  # Discounts affect pricing

        # Delete specific discount key if provided
        if discount_id:
            self._delete_specific_key(self.DISCOUNT_DETAIL_KEY.format(discount_id=discount_id))

        logger.info(f"Invalidated discount caches for discount_id: {discount_id}")

    def invalidate_all_product_caches(self):
        """Invalidate all product-related caches (4 INCR operations)"""
        self._invalidate_all_groups()
        logger.info("Invalidated all product domain caches")

    # === UTILITY METHODS ===

    def _generate_query_hash(self, query_params: dict) -> str:
        """Generate hash for query parameters"""
        sorted_params = sorted(query_params.items())
        query_string = json.dumps(sorted_params, sort_keys=True, default=str)
        return hashlib.md5(query_string.encode()).hexdigest()[:8]

    def _generate_ids_hash(self, ids: list[int]) -> str:
        """Generate hash for list of IDs"""
        sorted_ids = sorted(ids)
        ids_string = ",".join(map(str, sorted_ids))
        return hashlib.md5(ids_string.encode()).hexdigest()[:8]

    def cache_queryset(self, queryset: QuerySet, cache_key: str, timeout: int = None) -> list[dict]:
        """
        Cache a Django queryset as JSON data
        Returns the cached data as a list of dictionaries
        """
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM

        # Serialize queryset to JSON
        cached_data = []
        for obj in queryset:
            if hasattr(obj, "to_dict"):
                cached_data.append(obj.to_dict())
            else:
                # Fallback to model_to_dict
                from django.forms.models import model_to_dict

                item_dict = model_to_dict(obj)
                # Convert Decimal fields to string for JSON serialization
                for key, value in item_dict.items():
                    if isinstance(value, Decimal):
                        item_dict[key] = str(value)
                cached_data.append(item_dict)

        self.cache.set(cache_key, cached_data, timeout)
        logger.debug(f"Cached queryset with {len(cached_data)} items: {cache_key}")
        return cached_data

    def get_or_set(self, key: str, callable_func, timeout: int = None) -> Any:
        """
        Get from cache or set if not exists (cache-aside pattern)
        """
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM

        data = self.cache.get(key)
        if data is None:
            data = callable_func()
            self.cache.set(key, data, timeout)
            logger.debug(f"Set cache key: {key}")
        else:
            logger.debug(f"Cache hit for key: {key}")

        return data

    def warm_cache_for_products(self, product_ids: list[int] = None):
        """
        Warm cache for frequently accessed products
        """
        from django.db import models

        from .models import ProductOption
        from .serializers import ProductOptionSerializer

        if product_ids:
            products = ProductOption.objects.filter(id__in=product_ids, is_active=True)
        else:
            # Cache featured and active products
            products = (
                ProductOption.objects.filter(models.Q(is_featured=True) | models.Q(is_active=True))
                .select_related("category")
                .prefetch_related("event_types")
            )

        for product in products:
            serializer = ProductOptionSerializer(product)
            self.cache_product_detail(product.id, serializer.data)

        logger.info(f"Warmed cache for {products.count()} products")

    def get_cache_stats(self) -> dict:
        """Get cache statistics for monitoring"""
        try:
            cache_info = {
                "cache_type": "Redis (Versioned)",
                "domain": self.domain,
                "version_groups": self.version_groups,
                "current_versions": self.get_version_info(),
                "key_patterns": {
                    "versioned": ["categories", "products", "discounts", "pricing"],
                    "direct": ["category:detail", "product:detail", "discount:detail"],
                },
            }
            return cache_info

        except Exception as e:
            return {"error": f"Could not retrieve cache stats: {e}"}


# Global service instance
product_cache_service = ProductCacheService()
