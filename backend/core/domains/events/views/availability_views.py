# backend/core/domains/events/views/availability_views.py

import logging
from datetime import datetime, date, timedelta
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from django.utils import timezone
from django.utils.dateparse import parse_date
from typing import Dict, Any, List

from ..services.availability_service import (
    availability_service,
    AvailabilityRequest,
    DateAvailabilityInfo,
    AvailabilityStatus,
    ConflictLevel
)
from ..models import Event, EventType
from ...bookingflow.models import BookingFlow

logger = logging.getLogger(__name__)


class DateAvailabilityAPIView(APIView):
    """
    Enterprise-level date availability checking API
    
    Provides comprehensive availability information for event booking
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Check availability for a specific date or date range
        
        Query Parameters:
        - start_date (required): Date to check (YYYY-MM-DD)
        - end_date (optional): End date for multi-day events
        - event_type_id (optional): Filter by event type
        - booking_flow_id (optional): Use specific booking flow settings
        - duration_hours (optional, default=4): Event duration in hours
        - buffer_before_hours (optional, default=0): Buffer time before event
        - buffer_after_hours (optional, default=0): Buffer time after event
        - exclude_event_id (optional): Exclude specific event from conflict checking
        - include_buffer_conflicts (optional, default=true): Include buffer conflicts
        """
        try:
            # Parse and validate parameters
            start_date_str = request.query_params.get('start_date')
            if not start_date_str:
                return Response(
                    {'error': 'start_date parameter is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            start_date = parse_date(start_date_str)
            if not start_date:
                return Response(
                    {'error': 'Invalid start_date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Parse optional parameters
            end_date_str = request.query_params.get('end_date')
            end_date = parse_date(end_date_str) if end_date_str else None
            
            event_type_id = request.query_params.get('event_type_id')
            if event_type_id:
                try:
                    event_type_id = int(event_type_id)
                except ValueError:
                    return Response(
                        {'error': 'Invalid event_type_id'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            booking_flow_id = request.query_params.get('booking_flow_id')
            if booking_flow_id:
                try:
                    booking_flow_id = int(booking_flow_id)
                except ValueError:
                    return Response(
                        {'error': 'Invalid booking_flow_id'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Create availability request
            availability_request = AvailabilityRequest(
                start_date=start_date,
                end_date=end_date,
                event_type_id=event_type_id,
                booking_flow_id=booking_flow_id,
                duration_hours=int(request.query_params.get('duration_hours', 4)),
                buffer_before_hours=int(request.query_params.get('buffer_before_hours', 0)),
                buffer_after_hours=int(request.query_params.get('buffer_after_hours', 0)),
                exclude_event_id=int(request.query_params.get('exclude_event_id', 0)) or None,
                include_buffer_conflicts=request.query_params.get('include_buffer_conflicts', 'true').lower() == 'true'
            )
            
            # Check availability
            availability_info = availability_service.check_date_availability(availability_request)
            
            # Serialize response
            response_data = self._serialize_availability_info(availability_info)
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error checking date availability: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _serialize_availability_info(self, info: DateAvailabilityInfo) -> Dict[str, Any]:
        """Serialize availability info for API response"""
        return {
            'date': info.date.isoformat(),
            'status': info.status.value,
            'conflict_level': info.conflict_level.value,
            'confirmed_events_count': info.confirmed_events_count,
            'lead_events_count': info.lead_events_count,
            'total_events_count': info.total_events_count,
            'can_book_event': info.can_book_event,
            'can_create_lead': info.can_create_lead,
            'conflicts': info.conflicts,
            'reasons': info.reasons,
            'buffer_conflicts': info.buffer_conflicts,
            'next_available_date': info.next_available_date.isoformat() if info.next_available_date else None
        }


class DateRangeAvailabilityAPIView(APIView):
    """
    Check availability for multiple consecutive dates
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Check availability for a date range
        
        Query Parameters:
        - start_date (required): Start date (YYYY-MM-DD)
        - end_date (required): End date (YYYY-MM-DD)
        - event_type_id (optional): Filter by event type
        - booking_flow_id (optional): Use specific booking flow settings
        """
        try:
            # Parse required parameters
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')
            
            if not start_date_str or not end_date_str:
                return Response(
                    {'error': 'start_date and end_date parameters are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            start_date = parse_date(start_date_str)
            end_date = parse_date(end_date_str)
            
            if not start_date or not end_date:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if start_date > end_date:
                return Response(
                    {'error': 'start_date must be before or equal to end_date'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Limit range to prevent abuse
            date_diff = (end_date - start_date).days
            if date_diff > 365:
                return Response(
                    {'error': 'Date range cannot exceed 365 days'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Parse optional parameters
            event_type_id = None
            if request.query_params.get('event_type_id'):
                try:
                    event_type_id = int(request.query_params.get('event_type_id'))
                except ValueError:
                    return Response(
                        {'error': 'Invalid event_type_id'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            booking_flow_id = None
            if request.query_params.get('booking_flow_id'):
                try:
                    booking_flow_id = int(request.query_params.get('booking_flow_id'))
                except ValueError:
                    return Response(
                        {'error': 'Invalid booking_flow_id'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Check availability for date range
            availability_results = availability_service.check_multiple_dates(
                start_date=start_date,
                end_date=end_date,
                event_type_id=event_type_id,
                booking_flow_id=booking_flow_id
            )
            
            # Serialize results
            response_data = {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'total_days': len(availability_results),
                'availability': [
                    DateAvailabilityAPIView()._serialize_availability_info(info)
                    for info in availability_results
                ],
                'summary': self._generate_range_summary(availability_results)
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error checking date range availability: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_range_summary(self, results: List[DateAvailabilityInfo]) -> Dict[str, Any]:
        """Generate summary statistics for date range"""
        total_days = len(results)
        available_days = len([r for r in results if r.can_book_event])
        partially_booked_days = len([r for r in results if r.status == AvailabilityStatus.PARTIALLY_BOOKED])
        fully_booked_days = len([r for r in results if r.status == AvailabilityStatus.FULLY_BOOKED])
        blocked_days = len([r for r in results if r.status == AvailabilityStatus.BLOCKED])
        
        return {
            'total_days': total_days,
            'available_days': available_days,
            'partially_booked_days': partially_booked_days,
            'fully_booked_days': fully_booked_days,
            'blocked_days': blocked_days,
            'availability_percentage': (available_days / total_days * 100) if total_days > 0 else 0
        }


class ValidateBookingRequestAPIView(APIView):
    """
    Validate if a booking request is allowed
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        """
        Validate booking request
        
        JSON Body:
        {
            "start_date": "YYYY-MM-DD",
            "end_date": "YYYY-MM-DD" (optional),
            "event_type_id": int (optional),
            "booking_flow_id": int (optional),
            "is_lead": boolean (optional, default false),
            "duration_hours": int (optional, default 4),
            "buffer_before_hours": int (optional, default 0),
            "buffer_after_hours": int (optional, default 0),
            "exclude_event_id": int (optional)
        }
        """
        try:
            data = request.data
            
            # Parse required fields
            start_date_str = data.get('start_date')
            if not start_date_str:
                return Response(
                    {'error': 'start_date is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            start_date = parse_date(start_date_str)
            if not start_date:
                return Response(
                    {'error': 'Invalid start_date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Parse optional fields
            end_date = None
            if data.get('end_date'):
                end_date = parse_date(data.get('end_date'))
                if not end_date:
                    return Response(
                        {'error': 'Invalid end_date format. Use YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Validate booking request
            is_valid, error_messages = availability_service.validate_booking_request(
                start_date=start_date,
                end_date=end_date,
                event_type_id=data.get('event_type_id'),
                booking_flow_id=data.get('booking_flow_id'),
                is_lead=data.get('is_lead', False),
                duration_hours=data.get('duration_hours', 4),
                buffer_before_hours=data.get('buffer_before_hours', 0),
                buffer_after_hours=data.get('buffer_after_hours', 0),
                exclude_event_id=data.get('exclude_event_id')
            )
            
            response_data = {
                'is_valid': is_valid,
                'errors': error_messages,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat() if end_date else None,
                'is_lead': data.get('is_lead', False)
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error validating booking request: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class NextAvailableDateAPIView(APIView):
    """
    Find next available date for booking
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """
        Get next available date
        
        Query Parameters:
        - start_date (optional, default=today): Start searching from this date
        - event_type_id (optional): Filter by event type
        - max_days_ahead (optional, default=365): Maximum days to search
        """
        try:
            # Parse parameters
            start_date_str = request.query_params.get('start_date')
            if start_date_str:
                start_date = parse_date(start_date_str)
                if not start_date:
                    return Response(
                        {'error': 'Invalid start_date format. Use YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                start_date = timezone.now().date()
            
            event_type_id = request.query_params.get('event_type_id')
            if event_type_id:
                try:
                    event_type_id = int(event_type_id)
                except ValueError:
                    return Response(
                        {'error': 'Invalid event_type_id'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            max_days_ahead = int(request.query_params.get('max_days_ahead', 365))
            if max_days_ahead > 365:
                max_days_ahead = 365  # Limit to prevent abuse
            
            # Find next available date
            next_available = availability_service.get_next_available_date(
                start_date=start_date,
                event_type_id=event_type_id,
                max_days_ahead=max_days_ahead
            )
            
            response_data = {
                'search_start_date': start_date.isoformat(),
                'max_days_ahead': max_days_ahead,
                'next_available_date': next_available.isoformat() if next_available else None,
                'days_ahead': (next_available - start_date).days if next_available else None
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error finding next available date: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def invalidate_availability_cache(request):
    """
    Invalidate availability cache

    JSON Body:
    {
        "start_date": "YYYY-MM-DD" (optional),
        "end_date": "YYYY-MM-DD" (optional)
    }
    """
    try:
        data = request.data

        date_range = None
        if data.get('start_date') and data.get('end_date'):
            start_date = parse_date(data.get('start_date'))
            end_date = parse_date(data.get('end_date'))

            if start_date and end_date:
                date_range = (start_date, end_date)

        # Invalidate cache
        availability_service.invalidate_cache(date_range)

        return Response(
            {'message': 'Cache invalidated successfully'},
            status=status.HTTP_200_OK
        )

    except Exception as e:
        logger.error(f"Error invalidating cache: {e}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


class PublicEventAvailabilityAPIView(APIView):
    """
    Public endpoint for retrieving CONFIRMED events within a date range
    Used by booking flow calendar to show unavailable dates
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """
        Get CONFIRMED events for date range to display availability

        Query Parameters:
        - start_date (required): Start date (YYYY-MM-DD)
        - end_date (required): End date (YYYY-MM-DD)
        - event_type_id (optional): Filter by event type

        Returns:
        List of events with status=CONFIRMED for the date range
        """
        try:
            # Parse required parameters
            start_date_str = request.query_params.get('start_date')
            end_date_str = request.query_params.get('end_date')

            if not start_date_str or not end_date_str:
                return Response(
                    {'error': 'start_date and end_date parameters are required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            start_date = parse_date(start_date_str)
            end_date = parse_date(end_date_str)

            if not start_date or not end_date:
                return Response(
                    {'error': 'Invalid date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if start_date > end_date:
                return Response(
                    {'error': 'start_date must be before or equal to end_date'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Limit range to prevent abuse (max 3 months)
            date_diff = (end_date - start_date).days
            if date_diff > 90:
                return Response(
                    {'error': 'Date range cannot exceed 90 days'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Parse optional event type filter
            event_type_id = request.query_params.get('event_type_id')

            # IMPORTANT: Blocked dates must apply to ALL event types
            # First, get ALL blocked dates regardless of event type
            all_blocked_events = Event.objects.filter(
                start_date__date__gte=start_date,
                start_date__date__lte=end_date,
                status='CONFIRMED',
                date_blocked=True
            ).exclude(status='CANCELLED')

            # Build set of globally blocked dates (applies to ALL event types)
            global_blocked_dates = set()
            for event in all_blocked_events:
                global_blocked_dates.add(event.start_date.date().isoformat())

            # Query for CONFIRMED events in the date range (filtered by event_type if provided)
            events = Event.objects.filter(
                start_date__date__gte=start_date,
                start_date__date__lte=end_date,
                status='CONFIRMED'
            ).exclude(status='CANCELLED').select_related('event_type')

            # Apply event type filter if provided (for display purposes only)
            if event_type_id:
                try:
                    events = events.filter(event_type_id=int(event_type_id))
                except (ValueError, TypeError):
                    return Response(
                        {'error': 'Invalid event_type_id'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Build date summary for availability calendar
            # Group events by date and determine if date is blocked
            date_summary = {}

            # First, add all globally blocked dates to the summary
            for blocked_date in global_blocked_dates:
                date_summary[blocked_date] = {
                    'date': blocked_date,
                    'date_blocked': True,  # Globally blocked
                    'event_count': 0,
                    'events': [],
                }

            # Then add events from the filtered query
            for event in events:
                event_date = event.start_date.date().isoformat()
                if event_date not in date_summary:
                    date_summary[event_date] = {
                        'date': event_date,
                        'date_blocked': event_date in global_blocked_dates,  # Check global
                        'event_count': 0,
                        'events': [],
                    }

                date_summary[event_date]['event_count'] += 1

                # Ensure date is marked blocked if it's in global blocked dates
                if event_date in global_blocked_dates:
                    date_summary[event_date]['date_blocked'] = True

                date_summary[event_date]['events'].append({
                    'id': event.id,
                    'name': 'Reserved' if event.date_blocked else 'Pending',
                    'event_type_name': event.event_type.name if event.event_type else None,
                    'status': event.status,
                    'start_date': event.start_date.isoformat(),
                    'end_date': event.end_date.isoformat() if event.end_date else None,
                    'date_blocked': event.date_blocked,
                })

            # Serialize events - return minimal data for public consumption
            events_data = []
            for event in events:
                events_data.append({
                    'id': event.id,
                    'name': 'Reserved' if event.date_blocked else 'Pending',
                    'event_type_name': event.event_type.name if event.event_type else None,
                    'status': event.status,
                    'start_date': event.start_date.isoformat(),
                    'end_date': event.end_date.isoformat() if event.end_date else None,
                    'payment_status': event.payment_status,
                    'date_blocked': event.date_blocked,
                })

            # Blocked dates = global blocked dates (applies to ALL event types)
            blocked_dates = sorted(list(global_blocked_dates))

            return Response({
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'event_count': len(events_data),
                'events': events_data,
                'date_summary': list(date_summary.values()),
                'blocked_dates': blocked_dates,
            }, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching public event availability: {e}")
            return Response(
                {'error': 'Internal server error'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )