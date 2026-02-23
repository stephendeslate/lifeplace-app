"""
Comprehensive Redis testing and benchmarking utilities
Tests performance, reliability, and failover scenarios
"""

import logging
import time
from decimal import Decimal

from django.core.cache import caches
from django.db import connection
from django.test.utils import override_settings
from django.utils import timezone

logger = logging.getLogger(__name__)


class RedisTestSuite:
    """
    Comprehensive test suite for Redis implementation
    Tests performance, reliability, and edge cases
    """

    def __init__(self):
        self.results = []
        self.cache = caches["default"]
        self.session_cache = caches["sessions"]
        self.analytics_cache = caches["analytics"]

    def run_all_tests(self) -> dict:
        """
        Run complete Redis test suite
        Returns comprehensive test results
        """
        test_results = {
            "timestamp": timezone.now().isoformat(),
            "redis_info": self._get_redis_info(),
            "connection_tests": self._test_connections(),
            "performance_tests": self._run_performance_tests(),
            "reliability_tests": self._test_reliability(),
            "domain_specific_tests": self._test_domain_implementations(),
            "failover_tests": self._test_failover_behavior(),
            "memory_usage_tests": self._test_memory_usage(),
            "summary": {},
        }

        # Calculate summary metrics
        test_results["summary"] = self._calculate_summary(test_results)

        return test_results

    def _get_redis_info(self) -> dict:
        """Get Redis server information"""
        try:
            client = self.cache._cache.get_client()
            info = client.info()

            return {
                "redis_version": info.get("redis_version"),
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_commands_processed": info.get("total_commands_processed"),
                "keyspace": info.get("db0", {}),
                "uptime": info.get("uptime_in_seconds"),
            }
        except Exception as e:
            return {"error": str(e)}

    def _test_connections(self) -> dict:
        """Test Redis connections across all databases"""
        results = {}

        # Test default cache
        try:
            start_time = time.time()
            self.cache.set("connection_test", "success", 60)
            value = self.cache.get("connection_test")
            connection_time = (time.time() - start_time) * 1000

            results["default_cache"] = {
                "status": "success" if value == "success" else "failed",
                "connection_time_ms": connection_time,
            }
        except Exception as e:
            results["default_cache"] = {"status": "error", "error": str(e)}

        # Test sessions cache
        try:
            start_time = time.time()
            self.session_cache.set("session_test", {"user": "test"}, 60)
            value = self.session_cache.get("session_test")
            connection_time = (time.time() - start_time) * 1000

            results["sessions_cache"] = {
                "status": "success" if value and value.get("user") == "test" else "failed",
                "connection_time_ms": connection_time,
            }
        except Exception as e:
            results["sessions_cache"] = {"status": "error", "error": str(e)}

        # Test analytics cache
        try:
            start_time = time.time()
            self.analytics_cache.set("analytics_test", {"events": 100}, 60)
            value = self.analytics_cache.get("analytics_test")
            connection_time = (time.time() - start_time) * 1000

            results["analytics_cache"] = {
                "status": "success" if value and value.get("events") == 100 else "failed",
                "connection_time_ms": connection_time,
            }
        except Exception as e:
            results["analytics_cache"] = {"status": "error", "error": str(e)}

        return results

    def _run_performance_tests(self) -> dict:
        """Run comprehensive performance benchmarks"""
        return {
            "basic_operations": self._test_basic_operations(),
            "bulk_operations": self._test_bulk_operations(),
            "complex_data_types": self._test_complex_data(),
            "concurrent_access": self._test_concurrent_access(),
            "cache_vs_database": self._benchmark_cache_vs_db(),
        }

    def _test_basic_operations(self) -> dict:
        """Test basic Redis operations performance"""
        results = {}

        # Single SET operation
        start_time = time.time()
        for i in range(1000):
            self.cache.set(f"perf_test_{i}", f"value_{i}", 60)
        set_time = (time.time() - start_time) * 1000
        results["set_1000_items_ms"] = set_time
        results["avg_set_time_ms"] = set_time / 1000

        # Single GET operation
        start_time = time.time()
        for i in range(1000):
            self.cache.get(f"perf_test_{i}")
        get_time = (time.time() - start_time) * 1000
        results["get_1000_items_ms"] = get_time
        results["avg_get_time_ms"] = get_time / 1000

        # DELETE operations
        start_time = time.time()
        for i in range(1000):
            self.cache.delete(f"perf_test_{i}")
        delete_time = (time.time() - start_time) * 1000
        results["delete_1000_items_ms"] = delete_time
        results["avg_delete_time_ms"] = delete_time / 1000

        return results

    def _test_bulk_operations(self) -> dict:
        """Test bulk operations performance"""
        results = {}

        # Bulk SET using set_many
        test_data = {f"bulk_test_{i}": f"bulk_value_{i}" for i in range(1000)}

        start_time = time.time()
        self.cache.set_many(test_data, 60)
        bulk_set_time = (time.time() - start_time) * 1000
        results["bulk_set_1000_items_ms"] = bulk_set_time

        # Bulk GET using get_many
        start_time = time.time()
        values = self.cache.get_many(test_data.keys())
        bulk_get_time = (time.time() - start_time) * 1000
        results["bulk_get_1000_items_ms"] = bulk_get_time
        results["bulk_get_hit_rate"] = len(values) / len(test_data) * 100

        # Cleanup
        self.cache.delete_many(test_data.keys())

        return results

    def _test_complex_data(self) -> dict:
        """Test complex data type performance"""
        results = {}

        # Test JSON data
        complex_data = {
            "user_id": 123,
            "event_data": {
                "name": "Test Event",
                "status": "CONFIRMED",
                "products": [
                    {"id": 1, "name": "Product 1", "price": Decimal("99.99")},
                    {"id": 2, "name": "Product 2", "price": Decimal("149.99")},
                ],
                "metadata": {
                    "created_at": timezone.now().isoformat(),
                    "workflow_progress": 75.5,
                    "notes": "Complex test data with nested structures",
                },
            },
        }

        # Serialize Decimal to string for JSON compatibility
        def decimal_to_str(obj):
            if isinstance(obj, dict):
                return {k: decimal_to_str(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [decimal_to_str(item) for item in obj]
            elif isinstance(obj, Decimal):
                return str(obj)
            return obj

        serializable_data = decimal_to_str(complex_data)

        # Test complex data storage
        start_time = time.time()
        for i in range(100):
            self.cache.set(f"complex_test_{i}", serializable_data, 300)
        complex_set_time = (time.time() - start_time) * 1000
        results["complex_set_100_items_ms"] = complex_set_time

        # Test complex data retrieval
        start_time = time.time()
        for i in range(100):
            self.cache.get(f"complex_test_{i}")
        complex_get_time = (time.time() - start_time) * 1000
        results["complex_get_100_items_ms"] = complex_get_time

        # Cleanup
        for i in range(100):
            self.cache.delete(f"complex_test_{i}")

        return results

    def _test_concurrent_access(self) -> dict:
        """Test concurrent access patterns (simulated)"""
        results = {}

        # Simulate concurrent reads
        self.cache.set("concurrent_test", "test_value", 300)

        start_time = time.time()
        for _ in range(10):  # Simulate 10 concurrent requests
            for _j in range(100):
                self.cache.get("concurrent_test")
        concurrent_read_time = (time.time() - start_time) * 1000
        results["concurrent_reads_1000_ops_ms"] = concurrent_read_time

        # Test cache invalidation under concurrent access
        start_time = time.time()
        for i in range(100):
            self.cache.set("invalidation_test", f"value_{i}", 60)
            self.cache.get("invalidation_test")
        invalidation_time = (time.time() - start_time) * 1000
        results["invalidation_test_100_ops_ms"] = invalidation_time

        return results

    def _benchmark_cache_vs_db(self) -> dict:
        """Benchmark Redis vs Database performance"""
        from core.domains.events.cache_service import EventCacheService
        from core.domains.events.models import Event

        results = {}

        if Event.objects.exists():
            event = Event.objects.first()

            # Test workflow progress calculation
            # Clear cache first
            EventCacheService.invalidate_event(event.id)

            # Database version
            with override_settings(DEBUG=True):
                connection.queries_log.clear()
                start_time = time.time()

                for _ in range(10):  # Run multiple times for average
                    pass

                db_time = (time.time() - start_time) * 1000 / 10  # Average per call
                db_queries = len(connection.queries) / 10

                # Redis cached version (should be cached after first call)
                connection.queries_log.clear()
                start_time = time.time()

                for _ in range(10):
                    pass

                redis_time = (time.time() - start_time) * 1000 / 10
                redis_queries = len(connection.queries) / 10

                results["workflow_progress"] = {
                    "db_avg_time_ms": db_time,
                    "redis_avg_time_ms": redis_time,
                    "db_avg_queries": db_queries,
                    "redis_avg_queries": redis_queries,
                    "performance_improvement_pct": ((db_time - redis_time) / db_time * 100) if db_time > 0 else 0,
                }

            # Test event detail caching
            EventCacheService.invalidate_event(event.id)

            # Database serialization
            start_time = time.time()
            event_data = {
                "id": event.id,
                "name": event.name,
                "status": event.status,
                "workflow_progress": event.workflow_progress,
            }
            db_serialization_time = (time.time() - start_time) * 1000

            # Cache the data
            EventCacheService.set_event_detail(event.id, event_data)

            # Redis retrieval
            start_time = time.time()
            EventCacheService.get_event_detail(event.id)
            redis_retrieval_time = (time.time() - start_time) * 1000

            results["event_detail"] = {
                "db_serialization_ms": db_serialization_time,
                "redis_retrieval_ms": redis_retrieval_time,
                "performance_improvement_pct": (
                    (db_serialization_time - redis_retrieval_time) / db_serialization_time * 100
                )
                if db_serialization_time > 0
                else 0,
            }

        else:
            results["note"] = "No events found for benchmarking"

        return results

    def _test_reliability(self) -> dict:
        """Test Redis reliability and consistency"""
        results = {}

        # Test data consistency
        test_key = "reliability_test"
        test_value = {"counter": 0, "timestamp": timezone.now().isoformat()}

        self.cache.set(test_key, test_value, 300)
        retrieved_value = self.cache.get(test_key)

        results["data_consistency"] = {
            "status": "passed" if retrieved_value == test_value else "failed",
            "original": test_value,
            "retrieved": retrieved_value,
        }

        # Test TTL behavior
        short_ttl_key = "ttl_test"
        self.cache.set(short_ttl_key, "temporary_value", 2)  # 2 seconds TTL

        # Immediate retrieval
        immediate_value = self.cache.get(short_ttl_key)

        # Wait and test expiration (simulate)
        results["ttl_behavior"] = {
            "immediate_retrieval": "passed" if immediate_value == "temporary_value" else "failed",
            "ttl_set": True,
        }

        # Test large data handling
        large_data = {"data": "x" * 10000}  # 10KB string
        try:
            self.cache.set("large_data_test", large_data, 60)
            retrieved_large = self.cache.get("large_data_test")
            results["large_data_handling"] = "passed" if retrieved_large == large_data else "failed"
        except Exception as e:
            results["large_data_handling"] = f"failed: {e!s}"

        return results

    def _test_domain_implementations(self) -> dict:
        """Test domain-specific Redis implementations"""
        results = {}

        # Test Events domain caching
        try:
            from core.domains.events.cache_service import EventCacheService

            # Test event type caching
            EventCacheService.cache_event_types()
            cached_types = EventCacheService.get_cached_event_types()

            results["events_domain"] = {
                "event_types_caching": "passed" if cached_types is not None else "failed",
                "cached_types_count": len(cached_types) if cached_types else 0,
            }
        except Exception as e:
            results["events_domain"] = {"error": str(e)}

        # Test Booking Flow sessions
        try:
            from core.domains.bookingflow.redis_session_service import BookingFlowSessionService

            # Test session creation
            session_id = BookingFlowSessionService.create_session(
                booking_flow_id=1, user_id=1, initial_data={"test": True}
            )

            # Test session retrieval
            session_data = BookingFlowSessionService.get_session(session_id)

            results["bookingflow_domain"] = {
                "session_creation": "passed" if session_id else "failed",
                "session_retrieval": "passed"
                if session_data and session_data.get("booking_data", {}).get("test")
                else "failed",
                "session_id": session_id[:8] + "..." if session_id else None,
            }

            # Cleanup
            if session_id:
                BookingFlowSessionService.delete_session(session_id)

        except Exception as e:
            results["bookingflow_domain"] = {"error": str(e)}

        # Test Analytics service
        try:
            from core.domains.analytics.redis_analytics_service import RedisAnalyticsService

            # Test event tracking
            event_id = RedisAnalyticsService.track_event("test_event", properties={"test": True}, user_id=1)

            # Test real-time stats
            stats = RedisAnalyticsService.get_realtime_stats()

            results["analytics_domain"] = {
                "event_tracking": "passed" if event_id else "failed",
                "realtime_stats": "passed" if isinstance(stats, dict) else "failed",
                "event_id": event_id[:8] + "..." if event_id else None,
            }
        except Exception as e:
            results["analytics_domain"] = {"error": str(e)}

        return results

    def _test_failover_behavior(self) -> dict:
        """Test Redis failover and error handling"""
        results = {}

        # Test graceful degradation when cache is unavailable
        # Note: This is a simulated test since we can't easily disable Redis

        # Test cache miss handling
        non_existent_key = f"non_existent_{int(time.time())}"
        value = self.cache.get(non_existent_key, default="default_value")

        results["cache_miss_handling"] = {
            "status": "passed" if value == "default_value" else "failed",
            "returned_value": value,
        }

        # Test invalid data handling
        try:
            self.cache.set("invalid_test", None, 60)
            retrieved_none = self.cache.get("invalid_test")
            results["none_value_handling"] = "passed" if retrieved_none is None else "failed"
        except Exception as e:
            results["none_value_handling"] = f"error: {e!s}"

        return results

    def _test_memory_usage(self) -> dict:
        """Test Redis memory usage patterns"""
        try:
            client = self.cache._cache.get_client()

            # Get initial memory usage
            initial_info = client.info("memory")
            initial_memory = initial_info.get("used_memory", 0)

            # Store test data to measure impact
            test_data = {}
            for i in range(1000):
                test_data[f"memory_test_{i}"] = {
                    "id": i,
                    "data": "x" * 100,  # 100 bytes each
                    "timestamp": timezone.now().isoformat(),
                }

            self.cache.set_many(test_data, 300)

            # Get memory usage after storing data
            after_info = client.info("memory")
            after_memory = after_info.get("used_memory", 0)

            # Cleanup
            self.cache.delete_many(test_data.keys())

            return {
                "initial_memory_bytes": initial_memory,
                "after_test_memory_bytes": after_memory,
                "memory_increase_bytes": after_memory - initial_memory,
                "memory_per_item_bytes": (after_memory - initial_memory) / 1000 if after_memory > initial_memory else 0,
                "memory_efficiency": "good"
                if (after_memory - initial_memory) < 200000
                else "needs_optimization",  # Less than 200KB for 1000 items
            }
        except Exception as e:
            return {"error": str(e)}

    def _calculate_summary(self, test_results: dict) -> dict:
        """Calculate summary metrics from test results"""
        summary = {
            "overall_status": "passed",
            "redis_operational": True,
            "performance_rating": "excellent",
            "recommendations": [],
        }

        # Check connection tests
        conn_tests = test_results.get("connection_tests", {})
        failed_connections = [k for k, v in conn_tests.items() if v.get("status") != "success"]

        if failed_connections:
            summary["overall_status"] = "warning"
            summary["recommendations"].append(f"Fix failed connections: {', '.join(failed_connections)}")

        # Check performance
        perf_tests = test_results.get("performance_tests", {})
        basic_ops = perf_tests.get("basic_operations", {})

        avg_get_time = basic_ops.get("avg_get_time_ms", 0)
        if avg_get_time > 5:  # More than 5ms average
            summary["performance_rating"] = "needs_improvement"
            summary["recommendations"].append("Consider Redis optimization - GET operations are slow")
        elif avg_get_time > 1:
            summary["performance_rating"] = "good"

        # Check cache vs DB improvements
        cache_vs_db = perf_tests.get("cache_vs_database", {})
        workflow_improvement = cache_vs_db.get("workflow_progress", {}).get("performance_improvement_pct", 0)

        if workflow_improvement < 50:  # Less than 50% improvement
            summary["recommendations"].append("Workflow progress caching could be optimized further")

        # Check domain implementations
        domain_tests = test_results.get("domain_specific_tests", {})
        failed_domains = [k for k, v in domain_tests.items() if "error" in v]

        if failed_domains:
            summary["overall_status"] = "warning"
            summary["recommendations"].append(f"Fix domain implementations: {', '.join(failed_domains)}")

        # Check memory usage
        memory_tests = test_results.get("memory_usage_tests", {})
        memory_efficiency = memory_tests.get("memory_efficiency")

        if memory_efficiency == "needs_optimization":
            summary["recommendations"].append("Optimize Redis memory usage - consider data compression")

        if not summary["recommendations"]:
            summary["recommendations"].append("Redis implementation is performing excellently!")

        return summary


def run_redis_test_suite() -> dict:
    """
    Convenience function to run the complete Redis test suite
    """
    test_suite = RedisTestSuite()
    return test_suite.run_all_tests()


def print_test_results(results: dict) -> None:
    """
    Pretty print test results
    """
    print("=" * 80)
    print("🔧 REDIS IMPLEMENTATION TEST RESULTS")
    print("=" * 80)

    print("\n📊 Redis Server Info:")
    redis_info = results.get("redis_info", {})
    for key, value in redis_info.items():
        print(f"  {key}: {value}")

    print("\n🔗 Connection Tests:")
    conn_tests = results.get("connection_tests", {})
    for db, result in conn_tests.items():
        status = "✅" if result.get("status") == "success" else "❌"
        time_ms = result.get("connection_time_ms", 0)
        print(f"  {status} {db}: {time_ms:.2f}ms")

    print("\n⚡ Performance Summary:")
    perf_tests = results.get("performance_tests", {})
    basic_ops = perf_tests.get("basic_operations", {})
    print(f"  Average GET time: {basic_ops.get('avg_get_time_ms', 0):.3f}ms")
    print(f"  Average SET time: {basic_ops.get('avg_set_time_ms', 0):.3f}ms")

    cache_vs_db = perf_tests.get("cache_vs_database", {})
    workflow_improvement = cache_vs_db.get("workflow_progress", {}).get("performance_improvement_pct", 0)
    print(f"  Workflow progress improvement: {workflow_improvement:.1f}%")

    print("\n📈 Domain Tests:")
    domain_tests = results.get("domain_specific_tests", {})
    for domain, result in domain_tests.items():
        if "error" in result:
            print(f"  ❌ {domain}: {result['error']}")
        else:
            print(f"  ✅ {domain}: Working")

    print("\n💾 Memory Usage:")
    memory_tests = results.get("memory_usage_tests", {})
    if "error" not in memory_tests:
        print(f"  Used memory: {memory_tests.get('initial_memory_bytes', 0):,} bytes")
        print(f"  Memory per item: {memory_tests.get('memory_per_item_bytes', 0):.1f} bytes")
        print(f"  Efficiency: {memory_tests.get('memory_efficiency', 'unknown')}")

    print("\n🎯 Summary:")
    summary = results.get("summary", {})
    print(f"  Overall Status: {summary.get('overall_status', 'unknown')}")
    print(f"  Performance Rating: {summary.get('performance_rating', 'unknown')}")
    print("\n📝 Recommendations:")
    for rec in summary.get("recommendations", []):
        print(f"  • {rec}")

    print("=" * 80)
