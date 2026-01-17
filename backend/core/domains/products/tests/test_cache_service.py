"""
Unit tests for products domain cache service.

Tests:
- ProductCacheService (category, product, discount, and pricing caching)
- Cache invalidation
- Utility methods (hash generation, cache-aside pattern)
"""

import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock, call

from core.domains.products.cache_service import ProductCacheService, product_cache_service


# =============================================================================
# FIXTURES
# =============================================================================

@pytest.fixture
def cache_service():
    """Return a fresh ProductCacheService instance for testing."""
    return ProductCacheService()


@pytest.fixture
def mock_cache():
    """Create a mock cache backend with mocked cache but real utility methods."""
    with patch.object(ProductCacheService, '__init__', lambda self: None):
        service = ProductCacheService()
        service.cache = MagicMock()
        service.analytics = MagicMock()
        # Bind utility methods from the real class
        service._generate_query_hash = lambda params: ProductCacheService._generate_query_hash(service, params)
        service._generate_ids_hash = lambda ids: ProductCacheService._generate_ids_hash(service, ids)
        service._invalidate_cache_patterns = lambda patterns: ProductCacheService._invalidate_cache_patterns(service, patterns)
        return service


# =============================================================================
# CATEGORY CACHING TESTS
# =============================================================================

@pytest.mark.django_db
class TestCategoryCaching:
    """Tests for category caching methods."""

    def test_cache_categories_tree(self, mock_cache):
        """Test caching categories tree structure."""
        categories_data = [
            {'id': 1, 'name': 'Category 1', 'children': []},
            {'id': 2, 'name': 'Category 2', 'children': []}
        ]

        key = mock_cache.cache_categories_tree(categories_data)

        mock_cache.cache.set.assert_called_once_with(
            ProductCacheService.CATEGORY_TREE_KEY,
            categories_data,
            ProductCacheService.TIMEOUT_LONG
        )
        assert key == ProductCacheService.CATEGORY_TREE_KEY

    def test_get_cached_categories_tree_hit(self, mock_cache):
        """Test getting cached categories tree (cache hit)."""
        cached_data = [{'id': 1, 'name': 'Cached Category'}]
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_categories_tree()

        mock_cache.cache.get.assert_called_once_with(ProductCacheService.CATEGORY_TREE_KEY)
        assert result == cached_data

    def test_get_cached_categories_tree_miss(self, mock_cache):
        """Test getting cached categories tree (cache miss)."""
        mock_cache.cache.get.return_value = None

        result = mock_cache.get_cached_categories_tree()

        assert result is None

    def test_cache_category_list_with_query_params(self, mock_cache):
        """Test caching category list with query parameters."""
        categories_data = [{'id': 1, 'name': 'Active Category'}]
        query_params = {'is_active': True, 'parent_id': 1}

        key = mock_cache.cache_category_list(categories_data, query_params)

        mock_cache.cache.set.assert_called_once()
        assert 'products:categories:list:' in key

    def test_get_cached_category_list_with_query_params(self, mock_cache):
        """Test getting cached category list with query parameters."""
        cached_data = [{'id': 1, 'name': 'Cached Category'}]
        query_params = {'is_active': True}
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_category_list(query_params)

        assert result == cached_data

    def test_cache_category_detail(self, mock_cache):
        """Test caching individual category detail."""
        category_data = {'id': 1, 'name': 'Category 1', 'description': 'Test'}

        key = mock_cache.cache_category_detail(1, category_data)

        expected_key = ProductCacheService.CATEGORY_DETAIL_KEY.format(category_id=1)
        mock_cache.cache.set.assert_called_once_with(
            expected_key,
            category_data,
            ProductCacheService.TIMEOUT_LONG
        )
        assert key == expected_key

    def test_get_cached_category_detail(self, mock_cache):
        """Test getting cached category detail."""
        cached_data = {'id': 1, 'name': 'Cached Category'}
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_category_detail(1)

        expected_key = ProductCacheService.CATEGORY_DETAIL_KEY.format(category_id=1)
        mock_cache.cache.get.assert_called_once_with(expected_key)
        assert result == cached_data


# =============================================================================
# PRODUCT CACHING TESTS
# =============================================================================

@pytest.mark.django_db
class TestProductCaching:
    """Tests for product caching methods."""

    def test_cache_product_list(self, mock_cache):
        """Test caching product list."""
        products_data = [
            {'id': 1, 'name': 'Product 1'},
            {'id': 2, 'name': 'Product 2'}
        ]

        key = mock_cache.cache_product_list(products_data)

        mock_cache.cache.set.assert_called_once()
        assert 'products:list:' in key

    def test_cache_product_detail(self, mock_cache):
        """Test caching individual product detail."""
        product_data = {'id': 1, 'name': 'Product 1', 'base_price': '1000.00'}

        key = mock_cache.cache_product_detail(1, product_data)

        expected_key = ProductCacheService.PRODUCT_DETAIL_KEY.format(product_id=1)
        mock_cache.cache.set.assert_called_once_with(
            expected_key,
            product_data,
            ProductCacheService.TIMEOUT_LONG
        )
        assert key == expected_key

    def test_get_cached_product_detail(self, mock_cache):
        """Test getting cached product detail."""
        cached_data = {'id': 1, 'name': 'Cached Product'}
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_product_detail(1)

        expected_key = ProductCacheService.PRODUCT_DETAIL_KEY.format(product_id=1)
        mock_cache.cache.get.assert_called_once_with(expected_key)
        assert result == cached_data

    def test_cache_product_batch(self, mock_cache):
        """Test caching batch product data."""
        product_ids = [1, 2, 3]
        products_data = [
            {'id': 1, 'name': 'Product 1'},
            {'id': 2, 'name': 'Product 2'},
            {'id': 3, 'name': 'Product 3'}
        ]

        key = mock_cache.cache_product_batch(product_ids, products_data)

        mock_cache.cache.set.assert_called_once()
        assert 'products:batch:' in key

    def test_get_cached_product_batch(self, mock_cache):
        """Test getting cached batch product data."""
        product_ids = [1, 2, 3]
        cached_data = [{'id': 1, 'name': 'Product 1'}]
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_product_batch(product_ids)

        assert result == cached_data

    def test_cache_featured_products(self, mock_cache):
        """Test caching featured products."""
        products_data = [{'id': 1, 'name': 'Featured Product', 'is_featured': True}]

        key = mock_cache.cache_featured_products(products_data)

        mock_cache.cache.set.assert_called_once_with(
            ProductCacheService.PRODUCT_FEATURED_KEY,
            products_data,
            ProductCacheService.TIMEOUT_MEDIUM
        )
        assert key == ProductCacheService.PRODUCT_FEATURED_KEY

    def test_get_cached_featured_products(self, mock_cache):
        """Test getting cached featured products."""
        cached_data = [{'id': 1, 'name': 'Featured', 'is_featured': True}]
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_featured_products()

        mock_cache.cache.get.assert_called_once_with(ProductCacheService.PRODUCT_FEATURED_KEY)
        assert result == cached_data

    def test_cache_active_products(self, mock_cache):
        """Test caching active products."""
        products_data = [{'id': 1, 'name': 'Active Product', 'is_active': True}]

        key = mock_cache.cache_active_products(products_data)

        mock_cache.cache.set.assert_called_once_with(
            ProductCacheService.PRODUCT_ACTIVE_KEY,
            products_data,
            ProductCacheService.TIMEOUT_MEDIUM
        )
        assert key == ProductCacheService.PRODUCT_ACTIVE_KEY

    def test_get_cached_active_products(self, mock_cache):
        """Test getting cached active products."""
        cached_data = [{'id': 1, 'name': 'Active', 'is_active': True}]
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_active_products()

        assert result == cached_data

    def test_cache_products_by_category(self, mock_cache):
        """Test caching products by category."""
        products_data = [{'id': 1, 'name': 'Product in Category'}]

        key = mock_cache.cache_products_by_category(1, products_data)

        expected_key = ProductCacheService.PRODUCT_BY_CATEGORY_KEY.format(category_id=1)
        mock_cache.cache.set.assert_called_once_with(
            expected_key,
            products_data,
            ProductCacheService.TIMEOUT_MEDIUM
        )
        assert key == expected_key

    def test_get_cached_products_by_category(self, mock_cache):
        """Test getting cached products by category."""
        cached_data = [{'id': 1, 'name': 'Cached Product'}]
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_products_by_category(1)

        expected_key = ProductCacheService.PRODUCT_BY_CATEGORY_KEY.format(category_id=1)
        mock_cache.cache.get.assert_called_once_with(expected_key)
        assert result == cached_data


# =============================================================================
# DISCOUNT CACHING TESTS
# =============================================================================

@pytest.mark.django_db
class TestDiscountCaching:
    """Tests for discount caching methods."""

    def test_cache_discount_list(self, mock_cache):
        """Test caching discount list."""
        discounts_data = [{'id': 1, 'name': 'Discount 1', 'code': 'CODE1'}]

        key = mock_cache.cache_discount_list(discounts_data)

        mock_cache.cache.set.assert_called_once()
        assert 'products:discounts:list:' in key

    def test_cache_discount_list_uses_short_timeout(self, mock_cache):
        """Test discount list uses shorter timeout due to frequent changes."""
        discounts_data = [{'id': 1, 'name': 'Discount 1'}]

        mock_cache.cache_discount_list(discounts_data)

        # Verify short timeout is used
        call_args = mock_cache.cache.set.call_args
        assert call_args[0][2] == ProductCacheService.TIMEOUT_SHORT

    def test_cache_discount_detail(self, mock_cache):
        """Test caching individual discount detail."""
        discount_data = {'id': 1, 'name': 'Discount', 'code': 'CODE1'}

        key = mock_cache.cache_discount_detail(1, discount_data)

        expected_key = ProductCacheService.DISCOUNT_DETAIL_KEY.format(discount_id=1)
        mock_cache.cache.set.assert_called_once_with(
            expected_key,
            discount_data,
            ProductCacheService.TIMEOUT_SHORT
        )
        assert key == expected_key

    def test_get_cached_discount_detail(self, mock_cache):
        """Test getting cached discount detail."""
        cached_data = {'id': 1, 'name': 'Cached Discount'}
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_discount_detail(1)

        expected_key = ProductCacheService.DISCOUNT_DETAIL_KEY.format(discount_id=1)
        mock_cache.cache.get.assert_called_once_with(expected_key)
        assert result == cached_data

    def test_cache_valid_discounts(self, mock_cache):
        """Test caching valid discounts."""
        discounts_data = [{'id': 1, 'name': 'Valid Discount', 'is_valid': True}]

        key = mock_cache.cache_valid_discounts(discounts_data)

        mock_cache.cache.set.assert_called_once_with(
            ProductCacheService.DISCOUNT_VALID_KEY,
            discounts_data,
            ProductCacheService.TIMEOUT_SHORT
        )
        assert key == ProductCacheService.DISCOUNT_VALID_KEY

    def test_get_cached_valid_discounts(self, mock_cache):
        """Test getting cached valid discounts."""
        cached_data = [{'id': 1, 'name': 'Valid', 'is_valid': True}]
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_valid_discounts()

        mock_cache.cache.get.assert_called_once_with(ProductCacheService.DISCOUNT_VALID_KEY)
        assert result == cached_data

    def test_cache_discounts_by_type(self, mock_cache):
        """Test caching discounts by type."""
        discounts_data = [{'id': 1, 'name': 'Percentage Discount'}]

        key = mock_cache.cache_discounts_by_type('PERCENTAGE', discounts_data)

        expected_key = ProductCacheService.DISCOUNT_BY_TYPE_KEY.format(discount_type='PERCENTAGE')
        mock_cache.cache.set.assert_called_once_with(
            expected_key,
            discounts_data,
            ProductCacheService.TIMEOUT_SHORT
        )
        assert key == expected_key

    def test_get_cached_discounts_by_type(self, mock_cache):
        """Test getting cached discounts by type."""
        cached_data = [{'id': 1, 'name': 'Percentage'}]
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_discounts_by_type('PERCENTAGE')

        expected_key = ProductCacheService.DISCOUNT_BY_TYPE_KEY.format(discount_type='PERCENTAGE')
        mock_cache.cache.get.assert_called_once_with(expected_key)
        assert result == cached_data


# =============================================================================
# PRICING CACHING TESTS
# =============================================================================

@pytest.mark.django_db
class TestPricingCaching:
    """Tests for pricing calculation caching methods."""

    def test_cache_pricing_calculation(self, mock_cache):
        """Test caching pricing calculation results."""
        product_ids = [1, 2]
        calc_params = {'hours': 4, 'guests': 50}
        pricing_result = {'subtotal': '5000.00', 'tax': '600.00', 'total': '5600.00'}

        key = mock_cache.cache_pricing_calculation(product_ids, calc_params, pricing_result)

        mock_cache.cache.set.assert_called_once()
        assert 'products:pricing:' in key

    def test_get_cached_pricing_calculation(self, mock_cache):
        """Test getting cached pricing calculation."""
        product_ids = [1, 2]
        calc_params = {'hours': 4, 'guests': 50}
        cached_data = {'subtotal': '5000.00', 'total': '5600.00'}
        mock_cache.cache.get.return_value = cached_data

        result = mock_cache.get_cached_pricing_calculation(product_ids, calc_params)

        assert result == cached_data


# =============================================================================
# CACHE INVALIDATION TESTS
# =============================================================================

@pytest.mark.django_db
class TestCacheInvalidation:
    """Tests for cache invalidation methods."""

    def test_invalidate_category_caches_clears_tree(self, mock_cache):
        """Test category invalidation clears tree cache."""
        mock_cache.cache.keys.return_value = []
        mock_cache._invalidate_cache_patterns = MagicMock()

        mock_cache.invalidate_category_caches()

        mock_cache._invalidate_cache_patterns.assert_called_once()
        call_args = mock_cache._invalidate_cache_patterns.call_args[0][0]
        assert ProductCacheService.CATEGORY_TREE_KEY in call_args

    def test_invalidate_category_caches_with_specific_id(self, mock_cache):
        """Test category invalidation with specific category ID."""
        mock_cache.cache.keys.return_value = []
        mock_cache._invalidate_cache_patterns = MagicMock()

        mock_cache.invalidate_category_caches(category_id=1)

        call_args = mock_cache._invalidate_cache_patterns.call_args[0][0]
        expected_key = ProductCacheService.CATEGORY_DETAIL_KEY.format(category_id=1)
        assert expected_key in call_args

    def test_invalidate_product_caches(self, mock_cache):
        """Test product cache invalidation."""
        mock_cache.cache.keys.return_value = []
        mock_cache._invalidate_cache_patterns = MagicMock()

        mock_cache.invalidate_product_caches()

        mock_cache._invalidate_cache_patterns.assert_called_once()
        call_args = mock_cache._invalidate_cache_patterns.call_args[0][0]
        assert ProductCacheService.PRODUCT_FEATURED_KEY in call_args
        assert ProductCacheService.PRODUCT_ACTIVE_KEY in call_args

    def test_invalidate_product_caches_with_specific_id(self, mock_cache):
        """Test product invalidation with specific product ID."""
        mock_cache.cache.keys.return_value = []
        mock_cache._invalidate_cache_patterns = MagicMock()

        mock_cache.invalidate_product_caches(product_id=1)

        call_args = mock_cache._invalidate_cache_patterns.call_args[0][0]
        expected_key = ProductCacheService.PRODUCT_DETAIL_KEY.format(product_id=1)
        assert expected_key in call_args

    def test_invalidate_discount_caches(self, mock_cache):
        """Test discount cache invalidation."""
        mock_cache.cache.keys.return_value = []
        mock_cache._invalidate_cache_patterns = MagicMock()

        mock_cache.invalidate_discount_caches()

        mock_cache._invalidate_cache_patterns.assert_called_once()
        call_args = mock_cache._invalidate_cache_patterns.call_args[0][0]
        assert ProductCacheService.DISCOUNT_VALID_KEY in call_args

    def test_invalidate_discount_caches_with_specific_id(self, mock_cache):
        """Test discount invalidation with specific discount ID."""
        mock_cache.cache.keys.return_value = []
        mock_cache._invalidate_cache_patterns = MagicMock()

        mock_cache.invalidate_discount_caches(discount_id=1)

        call_args = mock_cache._invalidate_cache_patterns.call_args[0][0]
        expected_key = ProductCacheService.DISCOUNT_DETAIL_KEY.format(discount_id=1)
        assert expected_key in call_args

    def test_invalidate_all_product_caches(self, mock_cache):
        """Test invalidating all product domain caches."""
        mock_cache.cache.keys.return_value = []
        mock_cache._invalidate_cache_patterns = MagicMock()

        mock_cache.invalidate_all_product_caches()

        mock_cache._invalidate_cache_patterns.assert_called_once()
        call_args = mock_cache._invalidate_cache_patterns.call_args[0][0]
        assert 'products:*' in call_args


# =============================================================================
# UTILITY METHOD TESTS
# =============================================================================

@pytest.mark.django_db
class TestUtilityMethods:
    """Tests for utility methods."""

    def test_generate_query_hash_consistent(self, cache_service):
        """Test query hash generation is consistent."""
        params = {'is_active': True, 'category_id': 1}

        hash1 = cache_service._generate_query_hash(params)
        hash2 = cache_service._generate_query_hash(params)

        assert hash1 == hash2
        assert len(hash1) == 8  # MD5 truncated to 8 chars

    def test_generate_query_hash_order_independent(self, cache_service):
        """Test query hash is same regardless of param order."""
        params1 = {'a': 1, 'b': 2, 'c': 3}
        params2 = {'c': 3, 'a': 1, 'b': 2}

        hash1 = cache_service._generate_query_hash(params1)
        hash2 = cache_service._generate_query_hash(params2)

        assert hash1 == hash2

    def test_generate_query_hash_different_params(self, cache_service):
        """Test different params produce different hashes."""
        params1 = {'is_active': True}
        params2 = {'is_active': False}

        hash1 = cache_service._generate_query_hash(params1)
        hash2 = cache_service._generate_query_hash(params2)

        assert hash1 != hash2

    def test_generate_query_hash_empty_params(self, cache_service):
        """Test query hash with empty params."""
        hash_result = cache_service._generate_query_hash({})

        assert hash_result is not None
        assert len(hash_result) == 8

    def test_generate_ids_hash_consistent(self, cache_service):
        """Test IDs hash generation is consistent."""
        ids = [1, 2, 3]

        hash1 = cache_service._generate_ids_hash(ids)
        hash2 = cache_service._generate_ids_hash(ids)

        assert hash1 == hash2

    def test_generate_ids_hash_order_independent(self, cache_service):
        """Test IDs hash is same regardless of order."""
        ids1 = [3, 1, 2]
        ids2 = [1, 2, 3]

        hash1 = cache_service._generate_ids_hash(ids1)
        hash2 = cache_service._generate_ids_hash(ids2)

        assert hash1 == hash2

    def test_generate_ids_hash_different_ids(self, cache_service):
        """Test different IDs produce different hashes."""
        ids1 = [1, 2, 3]
        ids2 = [4, 5, 6]

        hash1 = cache_service._generate_ids_hash(ids1)
        hash2 = cache_service._generate_ids_hash(ids2)

        assert hash1 != hash2


@pytest.mark.django_db
class TestInvalidateCachePatterns:
    """Tests for _invalidate_cache_patterns method."""

    def test_invalidate_direct_key(self, mock_cache):
        """Test invalidating a direct cache key."""
        mock_cache._invalidate_cache_patterns(['products:featured'])

        mock_cache.cache.delete.assert_called_once_with('products:featured')

    def test_invalidate_pattern_key(self, mock_cache):
        """Test invalidating pattern-based cache keys."""
        mock_cache.cache.keys.return_value = ['products:list:abc123', 'products:list:def456']

        mock_cache._invalidate_cache_patterns(['products:list:*'])

        mock_cache.cache.keys.assert_called_once_with('products:list:*')
        mock_cache.cache.delete_many.assert_called_once_with(
            ['products:list:abc123', 'products:list:def456']
        )

    def test_invalidate_pattern_no_matches(self, mock_cache):
        """Test invalidating pattern with no matches."""
        mock_cache.cache.keys.return_value = []

        mock_cache._invalidate_cache_patterns(['products:nonexistent:*'])

        mock_cache.cache.keys.assert_called_once()
        mock_cache.cache.delete_many.assert_not_called()

    def test_invalidate_pattern_handles_exception(self, mock_cache):
        """Test invalidating pattern handles exceptions gracefully."""
        mock_cache.cache.keys.side_effect = Exception('Cache error')

        # Should not raise
        mock_cache._invalidate_cache_patterns(['products:*'])


# =============================================================================
# GET_OR_SET (CACHE-ASIDE) TESTS
# =============================================================================

@pytest.mark.django_db
class TestGetOrSet:
    """Tests for get_or_set (cache-aside pattern) method."""

    def test_get_or_set_cache_hit(self, mock_cache):
        """Test get_or_set returns cached data on hit."""
        cached_data = {'id': 1, 'name': 'Cached'}
        mock_cache.cache.get.return_value = cached_data
        callable_func = MagicMock(return_value={'id': 1, 'name': 'Fresh'})

        result = mock_cache.get_or_set('test:key', callable_func)

        assert result == cached_data
        callable_func.assert_not_called()

    def test_get_or_set_cache_miss(self, mock_cache):
        """Test get_or_set calls function and caches on miss."""
        mock_cache.cache.get.return_value = None
        fresh_data = {'id': 1, 'name': 'Fresh'}
        callable_func = MagicMock(return_value=fresh_data)

        result = mock_cache.get_or_set('test:key', callable_func)

        assert result == fresh_data
        callable_func.assert_called_once()
        mock_cache.cache.set.assert_called_once()

    def test_get_or_set_custom_timeout(self, mock_cache):
        """Test get_or_set respects custom timeout."""
        mock_cache.cache.get.return_value = None
        callable_func = MagicMock(return_value={'data': 'test'})

        mock_cache.get_or_set('test:key', callable_func, timeout=600)

        call_args = mock_cache.cache.set.call_args
        assert call_args[0][2] == 600

    def test_get_or_set_default_timeout(self, mock_cache):
        """Test get_or_set uses default timeout when not specified."""
        mock_cache.cache.get.return_value = None
        callable_func = MagicMock(return_value={'data': 'test'})

        mock_cache.get_or_set('test:key', callable_func)

        call_args = mock_cache.cache.set.call_args
        assert call_args[0][2] == ProductCacheService.TIMEOUT_MEDIUM


# =============================================================================
# CACHE STATS TESTS
# =============================================================================

@pytest.mark.django_db
class TestCacheStats:
    """Tests for get_cache_stats method."""

    def test_get_cache_stats_returns_info(self, mock_cache):
        """Test get_cache_stats returns cache information."""
        mock_cache.cache.get.return_value = None  # Simulate empty cache

        stats = mock_cache.get_cache_stats()

        assert 'cache_type' in stats
        assert stats['cache_type'] == 'Redis'
        assert 'key_patterns' in stats
        assert 'sample_keys_count' in stats

    def test_get_cache_stats_shows_cached_keys(self, mock_cache):
        """Test get_cache_stats shows which keys are cached."""
        # Mock that featured products are cached
        def side_effect(key):
            if key == 'products:featured':
                return [{'id': 1}]
            return None

        mock_cache.cache.get.side_effect = side_effect

        stats = mock_cache.get_cache_stats()

        assert 'products:featured' in stats['sample_cached_keys']

    def test_get_cache_stats_handles_error(self, mock_cache):
        """Test get_cache_stats handles errors gracefully."""
        mock_cache.cache.get.side_effect = Exception('Cache error')

        stats = mock_cache.get_cache_stats()

        assert 'error' in stats


# =============================================================================
# TIMEOUT CONFIGURATION TESTS
# =============================================================================

@pytest.mark.django_db
class TestTimeoutConfiguration:
    """Tests for timeout configuration constants."""

    def test_timeout_short(self, cache_service):
        """Test short timeout is 5 minutes."""
        assert cache_service.TIMEOUT_SHORT == 300

    def test_timeout_medium(self, cache_service):
        """Test medium timeout is 30 minutes."""
        assert cache_service.TIMEOUT_MEDIUM == 1800

    def test_timeout_long(self, cache_service):
        """Test long timeout is 1 hour."""
        assert cache_service.TIMEOUT_LONG == 3600

    def test_timeout_very_long(self, cache_service):
        """Test very long timeout is 4 hours."""
        assert cache_service.TIMEOUT_VERY_LONG == 14400


# =============================================================================
# GLOBAL SERVICE INSTANCE TESTS
# =============================================================================

@pytest.mark.django_db
class TestGlobalServiceInstance:
    """Tests for the global product_cache_service instance."""

    def test_global_instance_exists(self):
        """Test global instance is available."""
        assert product_cache_service is not None
        assert isinstance(product_cache_service, ProductCacheService)

    def test_global_instance_has_cache(self):
        """Test global instance has cache configured."""
        assert hasattr(product_cache_service, 'cache')
        assert product_cache_service.cache is not None

    def test_global_instance_has_analytics_cache(self):
        """Test global instance has analytics cache configured."""
        assert hasattr(product_cache_service, 'analytics')
        assert product_cache_service.analytics is not None
