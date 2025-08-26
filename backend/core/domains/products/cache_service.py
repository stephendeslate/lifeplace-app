"""
Redis caching service for Products domain
Handles product categories, products, discounts, and pricing calculations
"""
import json
import logging
import hashlib
from typing import Any, List, Optional, Dict, Union
from django.core.cache import caches
from django.core.serializers import serialize
from django.db.models import QuerySet
from decimal import Decimal

logger = logging.getLogger(__name__)

# Use the default Redis cache
redis_cache = caches['default']
analytics_cache = caches['analytics']


class ProductCacheService:
    """
    Centralized caching service for Products domain
    Handles categories, products, discounts, and pricing
    """
    
    def __init__(self):
        self.cache = redis_cache
        self.analytics = analytics_cache
    
    # Cache key patterns
    CATEGORY_TREE_KEY = "products:categories:tree"
    CATEGORY_LIST_KEY = "products:categories:list:{query_hash}"
    CATEGORY_DETAIL_KEY = "products:category:detail:{category_id}"
    
    PRODUCT_LIST_KEY = "products:list:{query_hash}"
    PRODUCT_DETAIL_KEY = "products:detail:{product_id}"
    PRODUCT_BATCH_KEY = "products:batch:{ids_hash}"
    PRODUCT_FEATURED_KEY = "products:featured"
    PRODUCT_ACTIVE_KEY = "products:active"
    PRODUCT_BY_CATEGORY_KEY = "products:by_category:{category_id}"
    
    DISCOUNT_LIST_KEY = "products:discounts:list:{query_hash}"
    DISCOUNT_DETAIL_KEY = "products:discount:detail:{discount_id}"
    DISCOUNT_VALID_KEY = "products:discounts:valid"
    DISCOUNT_BY_TYPE_KEY = "products:discounts:by_type:{discount_type}"
    
    PRICING_CALCULATION_KEY = "products:pricing:{product_ids_hash}:{params_hash}"
    
    # Cache timeout configurations (in seconds)
    TIMEOUT_SHORT = 300      # 5 minutes - frequently changing data
    TIMEOUT_MEDIUM = 1800    # 30 minutes - moderate changes
    TIMEOUT_LONG = 3600      # 1 hour - stable data
    TIMEOUT_VERY_LONG = 14400  # 4 hours - very stable data
    
    # === CATEGORY CACHING ===
    
    def cache_categories_tree(self, categories_data: List[Dict]) -> str:
        """Cache the categories tree structure"""
        key = self.CATEGORY_TREE_KEY
        self.cache.set(key, categories_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached categories tree: {key}")
        return key
    
    def get_cached_categories_tree(self) -> Optional[List[Dict]]:
        """Get cached categories tree"""
        return self.cache.get(self.CATEGORY_TREE_KEY)
    
    def cache_category_list(self, categories_data: List[Dict], 
                           query_params: Dict = None) -> str:
        """Cache category list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.CATEGORY_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, categories_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached category list: {key}")
        return key
    
    def get_cached_category_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached category list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.CATEGORY_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_category_detail(self, category_id: int, category_data: Dict) -> str:
        """Cache individual category detail"""
        key = self.CATEGORY_DETAIL_KEY.format(category_id=category_id)
        self.cache.set(key, category_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached category detail: {key}")
        return key
    
    def get_cached_category_detail(self, category_id: int) -> Optional[Dict]:
        """Get cached category detail"""
        key = self.CATEGORY_DETAIL_KEY.format(category_id=category_id)
        return self.cache.get(key)
    
    # === PRODUCT CACHING ===
    
    def cache_product_list(self, products_data: List[Dict], 
                          query_params: Dict = None) -> str:
        """Cache product list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.PRODUCT_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, products_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached product list: {key}")
        return key
    
    def get_cached_product_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached product list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.PRODUCT_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_product_detail(self, product_id: int, product_data: Dict) -> str:
        """Cache individual product detail"""
        key = self.PRODUCT_DETAIL_KEY.format(product_id=product_id)
        self.cache.set(key, product_data, self.TIMEOUT_LONG)
        logger.debug(f"Cached product detail: {key}")
        return key
    
    def get_cached_product_detail(self, product_id: int) -> Optional[Dict]:
        """Get cached product detail"""
        key = self.PRODUCT_DETAIL_KEY.format(product_id=product_id)
        return self.cache.get(key)
    
    def cache_product_batch(self, product_ids: List[int], products_data: List[Dict]) -> str:
        """Cache batch product data"""
        ids_hash = self._generate_ids_hash(product_ids)
        key = self.PRODUCT_BATCH_KEY.format(ids_hash=ids_hash)
        self.cache.set(key, products_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached product batch: {key}")
        return key
    
    def get_cached_product_batch(self, product_ids: List[int]) -> Optional[List[Dict]]:
        """Get cached batch product data"""
        ids_hash = self._generate_ids_hash(product_ids)
        key = self.PRODUCT_BATCH_KEY.format(ids_hash=ids_hash)
        return self.cache.get(key)
    
    def cache_featured_products(self, products_data: List[Dict]) -> str:
        """Cache featured products"""
        key = self.PRODUCT_FEATURED_KEY
        self.cache.set(key, products_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached featured products: {key}")
        return key
    
    def get_cached_featured_products(self) -> Optional[List[Dict]]:
        """Get cached featured products"""
        return self.cache.get(self.PRODUCT_FEATURED_KEY)
    
    def cache_active_products(self, products_data: List[Dict]) -> str:
        """Cache active products"""
        key = self.PRODUCT_ACTIVE_KEY
        self.cache.set(key, products_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached active products: {key}")
        return key
    
    def get_cached_active_products(self) -> Optional[List[Dict]]:
        """Get cached active products"""
        return self.cache.get(self.PRODUCT_ACTIVE_KEY)
    
    def cache_products_by_category(self, category_id: int, products_data: List[Dict]) -> str:
        """Cache products by category"""
        key = self.PRODUCT_BY_CATEGORY_KEY.format(category_id=category_id)
        self.cache.set(key, products_data, self.TIMEOUT_MEDIUM)
        logger.debug(f"Cached products by category: {key}")
        return key
    
    def get_cached_products_by_category(self, category_id: int) -> Optional[List[Dict]]:
        """Get cached products by category"""
        key = self.PRODUCT_BY_CATEGORY_KEY.format(category_id=category_id)
        return self.cache.get(key)
    
    # === DISCOUNT CACHING ===
    
    def cache_discount_list(self, discounts_data: List[Dict], 
                           query_params: Dict = None) -> str:
        """Cache discount list with query parameters"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.DISCOUNT_LIST_KEY.format(query_hash=query_hash)
        self.cache.set(key, discounts_data, self.TIMEOUT_SHORT)  # Discounts change more frequently
        logger.debug(f"Cached discount list: {key}")
        return key
    
    def get_cached_discount_list(self, query_params: Dict = None) -> Optional[List[Dict]]:
        """Get cached discount list"""
        query_hash = self._generate_query_hash(query_params or {})
        key = self.DISCOUNT_LIST_KEY.format(query_hash=query_hash)
        return self.cache.get(key)
    
    def cache_discount_detail(self, discount_id: int, discount_data: Dict) -> str:
        """Cache individual discount detail"""
        key = self.DISCOUNT_DETAIL_KEY.format(discount_id=discount_id)
        self.cache.set(key, discount_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached discount detail: {key}")
        return key
    
    def get_cached_discount_detail(self, discount_id: int) -> Optional[Dict]:
        """Get cached discount detail"""
        key = self.DISCOUNT_DETAIL_KEY.format(discount_id=discount_id)
        return self.cache.get(key)
    
    def cache_valid_discounts(self, discounts_data: List[Dict]) -> str:
        """Cache currently valid discounts"""
        key = self.DISCOUNT_VALID_KEY
        self.cache.set(key, discounts_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached valid discounts: {key}")
        return key
    
    def get_cached_valid_discounts(self) -> Optional[List[Dict]]:
        """Get cached valid discounts"""
        return self.cache.get(self.DISCOUNT_VALID_KEY)
    
    def cache_discounts_by_type(self, discount_type: str, discounts_data: List[Dict]) -> str:
        """Cache discounts by type"""
        key = self.DISCOUNT_BY_TYPE_KEY.format(discount_type=discount_type)
        self.cache.set(key, discounts_data, self.TIMEOUT_SHORT)
        logger.debug(f"Cached discounts by type: {key}")
        return key
    
    def get_cached_discounts_by_type(self, discount_type: str) -> Optional[List[Dict]]:
        """Get cached discounts by type"""
        key = self.DISCOUNT_BY_TYPE_KEY.format(discount_type=discount_type)
        return self.cache.get(key)
    
    # === PRICING CACHING ===
    
    def cache_pricing_calculation(self, product_ids: List[int], 
                                 calculation_params: Dict, 
                                 pricing_result: Dict) -> str:
        """Cache pricing calculation result"""
        ids_hash = self._generate_ids_hash(product_ids)
        params_hash = self._generate_query_hash(calculation_params)
        key = self.PRICING_CALCULATION_KEY.format(
            product_ids_hash=ids_hash, 
            params_hash=params_hash
        )
        self.cache.set(key, pricing_result, self.TIMEOUT_SHORT)
        logger.debug(f"Cached pricing calculation: {key}")
        return key
    
    def get_cached_pricing_calculation(self, product_ids: List[int], 
                                      calculation_params: Dict) -> Optional[Dict]:
        """Get cached pricing calculation"""
        ids_hash = self._generate_ids_hash(product_ids)
        params_hash = self._generate_query_hash(calculation_params)
        key = self.PRICING_CALCULATION_KEY.format(
            product_ids_hash=ids_hash, 
            params_hash=params_hash
        )
        return self.cache.get(key)
    
    # === CACHE INVALIDATION ===
    
    def invalidate_category_caches(self, category_id: int = None):
        """Invalidate category-related caches"""
        patterns_to_invalidate = [
            self.CATEGORY_TREE_KEY,
            f"products:categories:list:*",
            f"products:by_category:*"  # Categories affect product listings
        ]
        
        if category_id:
            patterns_to_invalidate.append(
                self.CATEGORY_DETAIL_KEY.format(category_id=category_id)
            )
            patterns_to_invalidate.append(
                self.PRODUCT_BY_CATEGORY_KEY.format(category_id=category_id)
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated category caches for category_id: {category_id}")
    
    def invalidate_product_caches(self, product_id: int = None):
        """Invalidate product-related caches"""
        patterns_to_invalidate = [
            f"products:list:*",
            self.PRODUCT_FEATURED_KEY,
            self.PRODUCT_ACTIVE_KEY,
            f"products:by_category:*",
            f"products:batch:*",
            f"products:pricing:*"
        ]
        
        if product_id:
            patterns_to_invalidate.append(
                self.PRODUCT_DETAIL_KEY.format(product_id=product_id)
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated product caches for product_id: {product_id}")
    
    def invalidate_discount_caches(self, discount_id: int = None):
        """Invalidate discount-related caches"""
        patterns_to_invalidate = [
            f"products:discounts:list:*",
            self.DISCOUNT_VALID_KEY,
            f"products:discounts:by_type:*",
            f"products:pricing:*"  # Discounts affect pricing
        ]
        
        if discount_id:
            patterns_to_invalidate.append(
                self.DISCOUNT_DETAIL_KEY.format(discount_id=discount_id)
            )
        
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info(f"Invalidated discount caches for discount_id: {discount_id}")
    
    def invalidate_all_product_caches(self):
        """Invalidate all product-related caches"""
        patterns_to_invalidate = [
            f"products:*"
        ]
        self._invalidate_cache_patterns(patterns_to_invalidate)
        logger.info("Invalidated all product domain caches")
    
    # === UTILITY METHODS ===
    
    def _generate_query_hash(self, query_params: Dict) -> str:
        """Generate hash for query parameters"""
        # Sort parameters for consistent hashing
        sorted_params = sorted(query_params.items())
        query_string = json.dumps(sorted_params, sort_keys=True, default=str)
        return hashlib.md5(query_string.encode()).hexdigest()[:8]
    
    def _generate_ids_hash(self, ids: List[int]) -> str:
        """Generate hash for list of IDs"""
        sorted_ids = sorted(ids)
        ids_string = ','.join(map(str, sorted_ids))
        return hashlib.md5(ids_string.encode()).hexdigest()[:8]
    
    def _invalidate_cache_patterns(self, patterns: List[str]):
        """Invalidate cache keys matching patterns"""
        for pattern in patterns:
            if '*' in pattern:
                # For pattern matching, we'd need to use Redis SCAN
                # For now, we'll use a simplified approach with django-redis
                try:
                    keys = self.cache.keys(pattern)
                    if keys:
                        self.cache.delete_many(keys)
                        logger.debug(f"Invalidated {len(keys)} keys matching {pattern}")
                except Exception as e:
                    logger.warning(f"Could not invalidate pattern {pattern}: {e}")
            else:
                # Direct key deletion
                self.cache.delete(pattern)
                logger.debug(f"Invalidated cache key: {pattern}")
    
    def cache_queryset(self, queryset: QuerySet, cache_key: str, 
                      timeout: int = None) -> List[Dict]:
        """
        Cache a Django queryset as JSON data
        Returns the cached data as a list of dictionaries
        """
        if timeout is None:
            timeout = self.TIMEOUT_MEDIUM
            
        # Serialize queryset to JSON
        cached_data = []
        for obj in queryset:
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
    
    def warm_cache_for_products(self, product_ids: List[int] = None):
        """
        Warm cache for frequently accessed products
        """
        from .models import ProductOption
        from .serializers import ProductOptionSerializer
        
        if product_ids:
            products = ProductOption.objects.filter(id__in=product_ids, is_active=True)
        else:
            # Cache featured and active products
            products = ProductOption.objects.filter(
                models.Q(is_featured=True) | models.Q(is_active=True)
            ).select_related('category', 'event_type')
        
        for product in products:
            serializer = ProductOptionSerializer(product)
            self.cache_product_detail(product.id, serializer.data)
        
        logger.info(f"Warmed cache for {products.count()} products")
    
    def get_cache_stats(self) -> Dict:
        """Get cache statistics for monitoring"""
        try:
            # Basic cache info
            cache_info = {
                'cache_type': 'Redis',
                'backend': str(self.cache.__class__),
                'key_patterns': {
                    'categories': ['categories:tree', 'categories:list:*', 'category:detail:*'],
                    'products': ['products:list:*', 'products:featured', 'products:active', 'products:batch:*'],
                    'discounts': ['discounts:list:*', 'discounts:valid', 'discounts:by_type:*'],
                    'pricing': ['pricing:*']
                }
            }
            
            # Try to get some sample keys (limited info available from Django cache)
            sample_keys = []
            for pattern in ['products:featured', 'products:active', 'products:categories:tree']:
                if self.cache.get(pattern) is not None:
                    sample_keys.append(pattern)
            
            cache_info['sample_cached_keys'] = sample_keys
            cache_info['sample_keys_count'] = len(sample_keys)
            
            return cache_info
            
        except Exception as e:
            return {'error': f'Could not retrieve cache stats: {e}'}


# Global service instance
product_cache_service = ProductCacheService()