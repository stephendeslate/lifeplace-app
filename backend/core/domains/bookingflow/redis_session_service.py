"""
Redis-based session service for booking flows
Much faster than database sessions for multi-step forms
"""
import json
import uuid
import logging
from typing import Dict, Optional, Any, List
from datetime import timedelta
from django.core.cache import caches
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)

# Use sessions cache (key prefix: lifeplace:session:)
session_cache = caches['sessions']

class BookingFlowSessionService:
    """
    Redis-based session management for booking flows
    Replaces database-heavy BookingSession model for better performance
    """
    
    # Cache key patterns
    SESSION_KEY = "booking_session:{session_id}"
    USER_SESSIONS_KEY = "user_sessions:{user_id}"
    FLOW_ANALYTICS_KEY = "flow_analytics:{flow_id}:{date}"
    
    # Session timeouts
    SESSION_TIMEOUT = 3600  # 1 hour active session
    COMPLETED_SESSION_TIMEOUT = 86400  # Keep completed sessions for 24 hours
    ANALYTICS_TIMEOUT = 7 * 86400  # Keep analytics for 7 days
    
    @classmethod
    def create_session(cls, booking_flow_id: int, user_id: int = None, 
                      initial_data: Dict = None) -> str:
        """
        Create a new booking session in Redis
        Returns session ID
        """
        session_id = str(uuid.uuid4())
        
        session_data = {
            'session_id': session_id,
            'booking_flow_id': booking_flow_id,
            'user_id': user_id,
            'current_step': 0,
            'booking_data': initial_data or {},
            'analytics_data': {
                'started_at': timezone.now().isoformat(),
                'steps_visited': [],
                'time_spent_per_step': {},
                'form_errors': [],
                'abandoned_at_step': None,
                'completed': False,
                'conversion_funnel': {
                    'introduction': False,
                    'contact_info': False,
                    'datetime': False,
                    'package_selection': False,
                    'addons': False,
                    'questionnaire': False,
                    'payment': False,
                    'confirmation': False,
                }
            },
            'created_at': timezone.now().isoformat(),
            'updated_at': timezone.now().isoformat(),
            'expires_at': (timezone.now() + timedelta(seconds=cls.SESSION_TIMEOUT)).isoformat(),
            'ip_address': None,
            'user_agent': None,
        }
        
        # Store in Redis
        key = cls.SESSION_KEY.format(session_id=session_id)
        session_cache.set(key, session_data, cls.SESSION_TIMEOUT)
        
        # Track user's sessions
        if user_id:
            cls._add_to_user_sessions(user_id, session_id)
        
        # Update analytics
        cls._update_flow_analytics(booking_flow_id, 'session_started')
        
        logger.info(f"Created booking session {session_id} for flow {booking_flow_id}")
        return session_id
    
    @classmethod
    def get_session(cls, session_id: str) -> Optional[Dict]:
        """
        Get session data from Redis
        """
        key = cls.SESSION_KEY.format(session_id=session_id)
        session_data = session_cache.get(key)
        
        if session_data:
            # Check if expired
            expires_at = timezone.datetime.fromisoformat(session_data['expires_at'])
            if timezone.now() > expires_at:
                cls.delete_session(session_id)
                return None
        
        return session_data
    
    @classmethod
    def update_session(cls, session_id: str, **updates) -> bool:
        """
        Update session data in Redis
        """
        key = cls.SESSION_KEY.format(session_id=session_id)
        session_data = session_cache.get(key)
        
        if not session_data:
            return False
        
        # Update fields
        for field, value in updates.items():
            if field in ['booking_data', 'analytics_data']:
                # Merge dictionaries for complex fields
                session_data[field].update(value)
            else:
                session_data[field] = value
        
        # Update timestamp
        session_data['updated_at'] = timezone.now().isoformat()
        
        # Extend expiry time for active sessions
        if not updates.get('completed', False):
            session_data['expires_at'] = (timezone.now() + timedelta(seconds=cls.SESSION_TIMEOUT)).isoformat()
            timeout = cls.SESSION_TIMEOUT
        else:
            # Longer timeout for completed sessions
            timeout = cls.COMPLETED_SESSION_TIMEOUT
        
        session_cache.set(key, session_data, timeout)
        return True
    
    @classmethod
    def advance_step(cls, session_id: str, step_data: Dict, 
                    step_name: str = None, validation_errors: List = None) -> bool:
        """
        Advance to next step and update analytics
        """
        session_data = cls.get_session(session_id)
        if not session_data:
            return False
        
        current_step = session_data['current_step']
        step_start_time = timezone.now()
        
        # Calculate time spent on current step
        if session_data['analytics_data'].get('current_step_start_time'):
            start_time = timezone.datetime.fromisoformat(
                session_data['analytics_data']['current_step_start_time']
            )
            time_spent = (step_start_time - start_time).total_seconds()
            session_data['analytics_data']['time_spent_per_step'][str(current_step)] = time_spent
        
        # Update session
        updates = {
            'current_step': current_step + 1,
            'booking_data': step_data,
            'analytics_data': {
                'steps_visited': session_data['analytics_data']['steps_visited'] + [current_step],
                'current_step_start_time': step_start_time.isoformat(),
            }
        }
        
        # Update conversion funnel
        if step_name:
            updates['analytics_data'][f'conversion_funnel'] = {
                **session_data['analytics_data']['conversion_funnel'],
                step_name: True
            }
        
        # Track validation errors
        if validation_errors:
            updates['analytics_data']['form_errors'] = (
                session_data['analytics_data'].get('form_errors', []) + 
                [{
                    'step': current_step,
                    'step_name': step_name,
                    'errors': validation_errors,
                    'timestamp': timezone.now().isoformat()
                }]
            )
        
        return cls.update_session(session_id, **updates)
    
    @classmethod
    def complete_session(cls, session_id: str, final_data: Dict = None) -> bool:
        """
        Mark session as completed and trigger final processing
        """
        session_data = cls.get_session(session_id)
        if not session_data:
            return False
        
        updates = {
            'completed': True,
            'analytics_data': {
                'completed': True,
                'completed_at': timezone.now().isoformat(),
                'conversion_funnel': {
                    **session_data['analytics_data']['conversion_funnel'],
                    'confirmation': True
                }
            }
        }
        
        if final_data:
            updates['booking_data'] = final_data
        
        result = cls.update_session(session_id, **updates)
        
        if result:
            # Update flow analytics
            cls._update_flow_analytics(session_data['booking_flow_id'], 'session_completed')
            
            # Schedule data persistence to database (async)
            cls._schedule_session_persistence(session_id)
            
            logger.info(f"Completed booking session {session_id}")
        
        return result
    
    @classmethod
    def abandon_session(cls, session_id: str, step_name: str = None) -> bool:
        """
        Mark session as abandoned for analytics
        """
        session_data = cls.get_session(session_id)
        if not session_data:
            return False
        
        updates = {
            'analytics_data': {
                'abandoned_at_step': session_data['current_step'],
                'abandoned_at_step_name': step_name,
                'abandoned_at': timezone.now().isoformat(),
            }
        }
        
        result = cls.update_session(session_id, **updates)
        
        if result:
            # Update flow analytics
            cls._update_flow_analytics(
                session_data['booking_flow_id'], 
                'session_abandoned',
                extra_data={'step': session_data['current_step']}
            )
        
        return result
    
    @classmethod
    def delete_session(cls, session_id: str) -> bool:
        """
        Delete session from Redis
        """
        key = cls.SESSION_KEY.format(session_id=session_id)
        return session_cache.delete(key) > 0
    
    @classmethod
    def get_user_sessions(cls, user_id: int) -> List[str]:
        """
        Get all active sessions for a user
        """
        key = cls.USER_SESSIONS_KEY.format(user_id=user_id)
        session_ids = session_cache.get(key, [])
        
        # Filter out expired sessions
        active_sessions = []
        for session_id in session_ids:
            session_data = cls.get_session(session_id)
            if session_data:
                active_sessions.append(session_id)
        
        # Update the list in cache
        if len(active_sessions) != len(session_ids):
            session_cache.set(key, active_sessions, cls.SESSION_TIMEOUT)
        
        return active_sessions
    
    @classmethod
    def cleanup_expired_sessions(cls) -> int:
        """
        Clean up expired sessions (call this via cron job)
        """
        # This would need to iterate through keys, which is expensive
        # In production, rely on Redis TTL for automatic cleanup
        # This method is for explicit cleanup if needed
        
        # Using Redis SCAN to avoid blocking
        if hasattr(session_cache, '_cache'):
            client = session_cache._cache.get_client()
            pattern = f"{session_cache.key_prefix}:booking_session:*"
            
            expired_count = 0
            for key in client.scan_iter(match=pattern, count=100):
                session_data = session_cache.get(key.decode().split(':')[-1])
                if not session_data:
                    continue
                
                expires_at = timezone.datetime.fromisoformat(session_data.get('expires_at', ''))
                if timezone.now() > expires_at:
                    session_cache.delete(key.decode().split(':')[-1])
                    expired_count += 1
            
            return expired_count
        
        return 0
    
    @classmethod
    def get_flow_analytics_summary(cls, booking_flow_id: int, 
                                  date: str = None) -> Dict:
        """
        Get analytics summary for a booking flow
        """
        if not date:
            date = timezone.now().strftime('%Y-%m-%d')
        
        key = cls.FLOW_ANALYTICS_KEY.format(flow_id=booking_flow_id, date=date)
        return session_cache.get(key, {
            'sessions_started': 0,
            'sessions_completed': 0,
            'sessions_abandoned': 0,
            'conversion_rate': 0.0,
            'average_completion_time': 0,
            'step_drop_off': {},
            'form_errors': [],
        })
    
    @classmethod
    def _add_to_user_sessions(cls, user_id: int, session_id: str):
        """
        Add session to user's session list
        """
        key = cls.USER_SESSIONS_KEY.format(user_id=user_id)
        sessions = session_cache.get(key, [])
        
        # Add new session and limit to last 10
        sessions = [session_id] + [s for s in sessions if s != session_id][:9]
        
        session_cache.set(key, sessions, cls.SESSION_TIMEOUT)
    
    @classmethod
    def _update_flow_analytics(cls, booking_flow_id: int, event_type: str, 
                              extra_data: Dict = None):
        """
        Update real-time analytics for booking flow
        """
        date = timezone.now().strftime('%Y-%m-%d')
        key = cls.FLOW_ANALYTICS_KEY.format(flow_id=booking_flow_id, date=date)
        
        analytics = session_cache.get(key, {
            'sessions_started': 0,
            'sessions_completed': 0,
            'sessions_abandoned': 0,
            'step_drop_off': {},
        })
        
        if event_type == 'session_started':
            analytics['sessions_started'] += 1
        elif event_type == 'session_completed':
            analytics['sessions_completed'] += 1
        elif event_type == 'session_abandoned':
            analytics['sessions_abandoned'] += 1
            if extra_data and 'step' in extra_data:
                step = str(extra_data['step'])
                analytics['step_drop_off'][step] = analytics['step_drop_off'].get(step, 0) + 1
        
        # Calculate conversion rate
        if analytics['sessions_started'] > 0:
            analytics['conversion_rate'] = (
                analytics['sessions_completed'] / analytics['sessions_started'] * 100
            )
        
        session_cache.set(key, analytics, cls.ANALYTICS_TIMEOUT)
    
    @classmethod
    def _schedule_session_persistence(cls, session_id: str):
        """
        Schedule async task to persist session data to database
        In production, this would queue a Celery task
        """
        from django.db import transaction
        from ..models import BookingSession
        
        try:
            session_data = cls.get_session(session_id)
            if not session_data:
                return
            
            # Create or update BookingSession in database
            with transaction.atomic():
                booking_session, created = BookingSession.objects.update_or_create(
                    session_id=session_id,
                    defaults={
                        'booking_flow_id': session_data['booking_flow_id'],
                        'user_id': session_data.get('user_id'),
                        'current_step': session_data['current_step'],
                        'booking_data': session_data['booking_data'],
                        'analytics_data': session_data['analytics_data'],
                        'completed': session_data.get('completed', False),
                        'created_at': timezone.datetime.fromisoformat(session_data['created_at']),
                        'updated_at': timezone.now(),
                    }
                )
            
            logger.info(f"Persisted session {session_id} to database")
            
        except Exception as e:
            logger.error(f"Failed to persist session {session_id}: {e}")


class BookingFlowCacheWarmer:
    """
    Pre-warm cache for booking flows and related data
    """
    
    @classmethod
    def warm_booking_flow_data(cls, booking_flow_id: int):
        """
        Pre-warm cache with booking flow configuration
        """
        from .models import BookingFlow, BookingFlowStep
        
        try:
            # Cache booking flow configuration
            flow = BookingFlow.objects.select_related(
                'workflow_template'
            ).prefetch_related(
                'steps',
                'allowed_payment_gateways',
            ).get(id=booking_flow_id, is_active=True)

            flow_data = {
                'id': flow.id,
                'name': flow.name,
                'steps': list(flow.steps.values(
                    'id', 'step_type', 'order', 'is_required',
                    'display_conditions', 'configuration'
                )),
                'payment_gateways': list(flow.allowed_payment_gateways.values()),
                'workflow_template_id': flow.workflow_template_id,
            }

            key = f"booking_flow:{booking_flow_id}"
            session_cache.set(key, flow_data, 3600)  # 1 hour

            logger.info(f"Warmed cache for booking flow {booking_flow_id}")

        except BookingFlow.DoesNotExist:
            logger.warning(f"Booking flow {booking_flow_id} not found for cache warming")