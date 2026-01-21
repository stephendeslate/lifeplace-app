"""
Unit tests for analytics Celery tasks.

Tests:
- update_all_booking_flow_analytics task
- backfill_booking_flow_analytics task
- cache_daily_kpis task
"""

import pytest
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.utils import timezone
from freezegun import freeze_time

from core.domains.analytics.tasks import (
    update_all_booking_flow_analytics,
    backfill_booking_flow_analytics,
    cache_daily_kpis,
)


@pytest.mark.django_db
class TestUpdateAllBookingFlowAnalyticsTask:
    """Tests for the update_all_booking_flow_analytics Celery task."""

    def test_task_with_no_active_flows(self):
        """Test task runs successfully when no active booking flows exist."""
        result = update_all_booking_flow_analytics()

        assert result['success'] == []
        assert result['failed'] == []

    def test_task_updates_active_flows(self, event_type_factory):
        """Test task updates analytics for all active booking flows."""
        from core.domains.bookingflow.models import BookingFlow

        # Create event types for each flow (required due to unique constraint)
        event_type1 = event_type_factory()
        event_type2 = event_type_factory()

        # Create active booking flows with different event types
        flow1 = BookingFlow.objects.create(
            name='Test Flow 1',
            is_active=True,
            event_type=event_type1
        )
        flow2 = BookingFlow.objects.create(
            name='Test Flow 2',
            is_active=True,
            event_type=event_type2
        )
        # Create inactive flow (should be skipped)
        BookingFlow.objects.create(name='Inactive Flow', is_active=False)

        result = update_all_booking_flow_analytics()

        assert flow1.id in result['success']
        assert flow2.id in result['success']
        assert len(result['success']) == 2
        assert result['failed'] == []

    @freeze_time('2024-06-15 12:00:00')
    def test_task_defaults_to_yesterday(self):
        """Test task defaults to yesterday's date when no date provided."""
        from core.domains.bookingflow.models import BookingFlow, BookingFlowAnalytics

        flow = BookingFlow.objects.create(name='Test Flow', is_active=True)

        result = update_all_booking_flow_analytics()

        # Should create analytics for yesterday
        yesterday = (timezone.now() - timedelta(days=1)).date()
        analytics = BookingFlowAnalytics.objects.filter(
            booking_flow=flow,
            date=yesterday
        )
        assert analytics.exists()
        assert flow.id in result['success']

    @freeze_time('2024-06-15 12:00:00')
    def test_task_with_custom_date(self):
        """Test task uses provided date string."""
        from core.domains.bookingflow.models import BookingFlow, BookingFlowAnalytics

        flow = BookingFlow.objects.create(name='Test Flow', is_active=True)
        custom_date = '2024-06-10'

        result = update_all_booking_flow_analytics(date_str=custom_date)

        # Should create analytics for the specified date
        analytics = BookingFlowAnalytics.objects.filter(
            booking_flow=flow,
            date='2024-06-10'
        )
        assert analytics.exists()
        assert flow.id in result['success']

    def test_task_handles_analytics_update_failure(self):
        """Test task handles errors during analytics update gracefully."""
        from core.domains.bookingflow.models import BookingFlow

        flow = BookingFlow.objects.create(name='Test Flow', is_active=True)

        with patch(
            'core.domains.bookingflow.services.BookingFlowAnalyticsService.update_daily_analytics',
            side_effect=Exception('Analytics update failed')
        ):
            result = update_all_booking_flow_analytics()

        assert result['success'] == []
        assert len(result['failed']) == 1
        assert result['failed'][0]['flow_id'] == flow.id
        assert 'Analytics update failed' in result['failed'][0]['error']

    def test_task_partial_failure(self, event_type_factory):
        """Test task continues processing when some flows fail."""
        from core.domains.bookingflow.models import BookingFlow

        # Create event types for each flow (required due to unique constraint)
        event_type1 = event_type_factory()
        event_type2 = event_type_factory()
        event_type3 = event_type_factory()

        flow1 = BookingFlow.objects.create(
            name='Flow 1',
            is_active=True,
            event_type=event_type1
        )
        flow2 = BookingFlow.objects.create(
            name='Flow 2',
            is_active=True,
            event_type=event_type2
        )
        flow3 = BookingFlow.objects.create(
            name='Flow 3',
            is_active=True,
            event_type=event_type3
        )

        # Mock to fail only for flow2
        def mock_update(flow_id, date):
            if flow_id == flow2.id:
                raise Exception('Flow 2 failed')
            # Call original behavior for other flows
            from core.domains.bookingflow.models import BookingFlow, BookingFlowAnalytics
            flow = BookingFlow.objects.get(id=flow_id)
            analytics, _ = BookingFlowAnalytics.objects.get_or_create(
                booking_flow=flow,
                date=date,
                defaults={'total_sessions': 0}
            )
            return analytics

        with patch(
            'core.domains.bookingflow.services.BookingFlowAnalyticsService.update_daily_analytics',
            side_effect=mock_update
        ):
            result = update_all_booking_flow_analytics()

        # flow1 and flow3 should succeed, flow2 should fail
        assert flow1.id in result['success']
        assert flow3.id in result['success']
        assert len(result['failed']) == 1
        assert result['failed'][0]['flow_id'] == flow2.id


@pytest.mark.django_db
class TestBackfillBookingFlowAnalyticsTask:
    """Tests for the backfill_booking_flow_analytics Celery task."""

    def test_backfill_single_day(self):
        """Test backfill for a single day."""
        from core.domains.bookingflow.models import BookingFlow, BookingFlowAnalytics

        flow = BookingFlow.objects.create(name='Test Flow', is_active=True)
        date_str = '2024-06-10'

        result = backfill_booking_flow_analytics(flow.id, date_str, date_str)

        assert '2024-06-10' in result['success']
        assert result['failed'] == []

        # Verify analytics was created
        assert BookingFlowAnalytics.objects.filter(
            booking_flow=flow,
            date='2024-06-10'
        ).exists()

    def test_backfill_date_range(self):
        """Test backfill for a date range."""
        from core.domains.bookingflow.models import BookingFlow, BookingFlowAnalytics

        flow = BookingFlow.objects.create(name='Test Flow', is_active=True)
        start_date = '2024-06-01'
        end_date = '2024-06-05'

        result = backfill_booking_flow_analytics(flow.id, start_date, end_date)

        # Should have 5 successful days (June 1-5)
        assert len(result['success']) == 5
        assert '2024-06-01' in result['success']
        assert '2024-06-02' in result['success']
        assert '2024-06-03' in result['success']
        assert '2024-06-04' in result['success']
        assert '2024-06-05' in result['success']
        assert result['failed'] == []

        # Verify all analytics records were created
        analytics_count = BookingFlowAnalytics.objects.filter(
            booking_flow=flow,
            date__range=('2024-06-01', '2024-06-05')
        ).count()
        assert analytics_count == 5

    def test_backfill_handles_nonexistent_flow(self):
        """Test backfill handles non-existent flow ID."""
        nonexistent_flow_id = 99999

        result = backfill_booking_flow_analytics(
            nonexistent_flow_id,
            '2024-06-01',
            '2024-06-03'
        )

        # All dates should fail
        assert result['success'] == []
        assert len(result['failed']) == 3

    def test_backfill_handles_partial_failures(self):
        """Test backfill continues after individual date failures."""
        from core.domains.bookingflow.models import BookingFlow, BookingFlowAnalytics

        flow = BookingFlow.objects.create(name='Test Flow', is_active=True)

        call_count = [0]

        def mock_update(flow_id, date):
            call_count[0] += 1
            # Fail on the second call (June 2)
            if call_count[0] == 2:
                raise Exception('Update failed for this date')
            # Succeed for other calls
            analytics, _ = BookingFlowAnalytics.objects.get_or_create(
                booking_flow_id=flow_id,
                date=date,
                defaults={'total_sessions': 0}
            )
            return analytics

        with patch(
            'core.domains.bookingflow.services.BookingFlowAnalyticsService.update_daily_analytics',
            side_effect=mock_update
        ):
            result = backfill_booking_flow_analytics(flow.id, '2024-06-01', '2024-06-03')

        # Should have 2 successes and 1 failure
        assert len(result['success']) == 2
        assert len(result['failed']) == 1

    def test_backfill_updates_existing_analytics(self):
        """Test backfill can update existing analytics records."""
        from core.domains.bookingflow.models import BookingFlow, BookingFlowAnalytics

        flow = BookingFlow.objects.create(name='Test Flow', is_active=True)

        # Create existing analytics
        BookingFlowAnalytics.objects.create(
            booking_flow=flow,
            date='2024-06-10',
            total_sessions=5,
            completed_bookings=2
        )

        result = backfill_booking_flow_analytics(flow.id, '2024-06-10', '2024-06-10')

        assert '2024-06-10' in result['success']

        # Analytics should be updated (not duplicated)
        count = BookingFlowAnalytics.objects.filter(
            booking_flow=flow,
            date='2024-06-10'
        ).count()
        assert count == 1


@pytest.mark.django_db
class TestCacheDailyKPIsTask:
    """Tests for the cache_daily_kpis Celery task."""

    def test_task_caches_all_ranges(self):
        """Test task caches KPIs for all defined date ranges."""
        with patch('django.core.cache.cache.set') as mock_cache_set:
            result = cache_daily_kpis()

        # Should cache 3 ranges: 7d, 30d, 90d
        assert result['cached_ranges'] == ['7d', '30d', '90d']

        # Verify cache.set was called for each range
        assert mock_cache_set.call_count == 3

        # Check cache keys
        call_keys = [call[0][0] for call in mock_cache_set.call_args_list]
        assert 'analytics:kpi:7d' in call_keys
        assert 'analytics:kpi:30d' in call_keys
        assert 'analytics:kpi:90d' in call_keys

    def test_task_uses_correct_cache_timeout(self):
        """Test task sets correct cache timeout (1 hour)."""
        with patch('django.core.cache.cache.set') as mock_cache_set:
            cache_daily_kpis()

        # All cache.set calls should use 3600 second timeout
        for call in mock_cache_set.call_args_list:
            assert call[1].get('timeout') == 3600 or call[0][2] == 3600

    def test_task_handles_service_errors_gracefully(self):
        """Test task continues when DashboardService fails for some ranges."""
        call_count = [0]

        def mock_get_kpi_summary(start_date, end_date):
            call_count[0] += 1
            if call_count[0] == 2:  # Fail on second call (30d)
                raise Exception('Service error')
            return {'total_bookings': 10}

        with patch(
            'core.domains.analytics.services.DashboardService.get_kpi_summary',
            side_effect=mock_get_kpi_summary
        ):
            with patch('django.core.cache.cache.set') as mock_cache_set:
                result = cache_daily_kpis()

        # Should still return all ranges (even if some failed)
        assert result['cached_ranges'] == ['7d', '30d', '90d']

        # Only 2 cache.set calls should succeed (7d and 90d)
        assert mock_cache_set.call_count == 2

    @freeze_time('2024-06-15 12:00:00')
    def test_task_calculates_correct_date_ranges(self):
        """Test task calculates correct start dates for each range."""
        captured_calls = []

        def capture_kpi_summary(start_date, end_date):
            captured_calls.append({
                'start_date': start_date,
                'end_date': end_date
            })
            return {'total_bookings': 0}

        with patch(
            'core.domains.analytics.services.DashboardService.get_kpi_summary',
            side_effect=capture_kpi_summary
        ):
            with patch('django.core.cache.cache.set'):
                cache_daily_kpis()

        # Verify date ranges
        now = timezone.now()
        expected_ranges = [
            (now - timedelta(days=7), now),   # 7d
            (now - timedelta(days=30), now),  # 30d
            (now - timedelta(days=90), now),  # 90d
        ]

        for i, expected in enumerate(expected_ranges):
            assert captured_calls[i]['start_date'] == expected[0]
            assert captured_calls[i]['end_date'] == expected[1]

    def test_task_caches_actual_kpi_data(self):
        """Test task caches the actual KPI data returned by DashboardService."""
        mock_kpi_data = {
            'total_bookings': 42,
            'event_revenue': 50000.0,
            'conversion_rate': 25.0
        }

        with patch(
            'core.domains.analytics.services.DashboardService.get_kpi_summary',
            return_value=mock_kpi_data
        ):
            with patch('django.core.cache.cache.set') as mock_cache_set:
                cache_daily_kpis()

        # Verify the actual data was cached
        for call in mock_cache_set.call_args_list:
            cached_data = call[0][1]
            assert cached_data == mock_kpi_data


@pytest.mark.django_db
class TestTaskRetryBehavior:
    """Tests for Celery task retry configuration."""

    def test_update_all_analytics_has_max_retries(self):
        """Test that update_all_booking_flow_analytics has retry configuration."""
        assert update_all_booking_flow_analytics.max_retries == 3

    def test_backfill_analytics_has_max_retries(self):
        """Test that backfill_booking_flow_analytics has retry configuration."""
        assert backfill_booking_flow_analytics.max_retries == 3

    def test_cache_daily_kpis_has_default_max_retries(self):
        """Test that cache_daily_kpis has default Celery max_retries."""
        # cache_daily_kpis is a simpler task without explicit bind=True
        # but still has the default Celery max_retries value
        assert hasattr(cache_daily_kpis, 'max_retries')
        # Celery default is 3
        assert cache_daily_kpis.max_retries == 3


@pytest.mark.django_db
class TestTaskIntegration:
    """Integration tests for analytics tasks with real data."""

    @freeze_time('2024-06-15 12:00:00')
    def test_update_analytics_creates_correct_metrics(self, user_factory):
        """Test that analytics task creates correct metrics from session data."""
        from core.domains.bookingflow.models import (
            BookingFlow,
            BookingSession,
            BookingFlowAnalytics
        )
        import uuid

        # Create flow and sessions
        flow = BookingFlow.objects.create(name='Test Flow', is_active=True)

        # Create sessions for yesterday
        yesterday = (timezone.now() - timedelta(days=1)).date()
        yesterday_dt = timezone.make_aware(
            timezone.datetime.combine(yesterday, timezone.datetime.min.time())
        )

        # Create 4 sessions: 2 completed, 1 abandoned, 1 active
        for i in range(2):
            BookingSession.objects.create(
                session_id=uuid.uuid4(),
                booking_flow=flow,
                is_completed=True,
                expires_at=yesterday_dt + timedelta(hours=24)
            )
            # Manually update created_at since it's auto_now_add
            BookingSession.objects.filter(
                booking_flow=flow,
                is_completed=True
            ).update(created_at=yesterday_dt + timedelta(hours=i))

        BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=flow,
            is_abandoned=True,
            expires_at=yesterday_dt + timedelta(hours=24)
        )
        BookingSession.objects.filter(
            booking_flow=flow,
            is_abandoned=True
        ).update(created_at=yesterday_dt + timedelta(hours=3))

        BookingSession.objects.create(
            session_id=uuid.uuid4(),
            booking_flow=flow,
            is_completed=False,
            is_abandoned=False,
            expires_at=yesterday_dt + timedelta(hours=24)
        )
        BookingSession.objects.filter(
            booking_flow=flow,
            is_completed=False,
            is_abandoned=False
        ).update(created_at=yesterday_dt + timedelta(hours=4))

        # Run the task
        result = update_all_booking_flow_analytics()

        assert flow.id in result['success']

        # Verify analytics record
        analytics = BookingFlowAnalytics.objects.get(
            booking_flow=flow,
            date=yesterday
        )
        assert analytics.total_sessions == 4
        assert analytics.completed_bookings == 2
        assert analytics.abandoned_sessions == 1
        # Conversion rate should be 50% (2 completed out of 4)
        assert analytics.conversion_rate == Decimal('50.00')

    def test_backfill_with_varying_session_data(self):
        """Test backfill correctly processes sessions for different dates."""
        from core.domains.bookingflow.models import (
            BookingFlow,
            BookingSession,
            BookingFlowAnalytics
        )
        import uuid

        flow = BookingFlow.objects.create(name='Test Flow', is_active=True)

        # Create sessions on different dates
        dates = ['2024-06-01', '2024-06-02', '2024-06-03']
        for date_str in dates:
            date_obj = timezone.datetime.strptime(date_str, '%Y-%m-%d').date()
            date_dt = timezone.make_aware(
                timezone.datetime.combine(date_obj, timezone.datetime.min.time())
            )

            session = BookingSession.objects.create(
                session_id=uuid.uuid4(),
                booking_flow=flow,
                is_completed=True,
                expires_at=date_dt + timedelta(hours=24)
            )
            BookingSession.objects.filter(id=session.id).update(created_at=date_dt)

        # Backfill the date range
        result = backfill_booking_flow_analytics(flow.id, '2024-06-01', '2024-06-03')

        assert len(result['success']) == 3

        # Each day should have analytics with 1 session
        for date_str in dates:
            analytics = BookingFlowAnalytics.objects.get(
                booking_flow=flow,
                date=date_str
            )
            assert analytics.total_sessions == 1
            assert analytics.completed_bookings == 1
