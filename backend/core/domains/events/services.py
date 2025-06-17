# backend/core/domains/events/services.py
import logging
from django.db import transaction
from django.db.models import Q

from .exceptions import (
    EventNotFound,
    EventTypeNotFound,
    InvalidEventData,
)
from .models import Event, EventType

logger = logging.getLogger(__name__)


class EventTypeService:
    """Service for event type operations"""
    
    @staticmethod
    def get_all_event_types(search_query=None, is_active=None):
        """
        Get all event types with optional filtering
        
        Args:
            search_query (str, optional): Search term for filtering event types
            is_active (bool, optional): Filter by active status
            
        Returns:
            QuerySet: Filtered queryset of event types
        """
        queryset = EventType.objects.all()
        
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        
        return queryset.order_by('name')
    
    @staticmethod
    def get_event_type_by_id(event_type_id):
        """
        Get an event type by ID
        
        Args:
            event_type_id (int): ID of the event type
            
        Returns:
            EventType: Event type object
            
        Raises:
            EventTypeNotFound: If the event type doesn't exist
        """
        try:
            return EventType.objects.get(id=event_type_id)
        except EventType.DoesNotExist:
            raise EventTypeNotFound()
    
    @staticmethod
    def create_event_type(event_type_data):
        """
        Create a new event type
        
        Args:
            event_type_data (dict): Event type data
            
        Returns:
            EventType: Created event type object
        """
        event_type = EventType.objects.create(**event_type_data)
        logger.info(f"Created new event type: {event_type.name}")
        return event_type
    
    @staticmethod
    def update_event_type(event_type_id, event_type_data):
        """
        Update an existing event type
        
        Args:
            event_type_id (int): ID of the event type to update
            event_type_data (dict): Updated event type data
            
        Returns:
            EventType: Updated event type object
            
        Raises:
            EventTypeNotFound: If the event type doesn't exist
        """
        event_type = EventTypeService.get_event_type_by_id(event_type_id)
        
        for key, value in event_type_data.items():
            setattr(event_type, key, value)
        
        event_type.save()
        logger.info(f"Updated event type: {event_type.name}")
        return event_type
    
    @staticmethod
    def delete_event_type(event_type_id):
        """
        Delete an event type (or mark as inactive if in use)
        
        Args:
            event_type_id (int): ID of the event type to delete
            
        Returns:
            bool: True if deleted, False if marked as inactive
            
        Raises:
            EventTypeNotFound: If the event type doesn't exist
        """
        event_type = EventTypeService.get_event_type_by_id(event_type_id)
        name = event_type.name
        
        # Check if this event type is being used
        if Event.objects.filter(event_type=event_type).exists():
            # Instead of deleting, mark as inactive
            event_type.is_active = False
            event_type.save()
            logger.info(f"Marked event type as inactive: {name}")
            return False
        
        event_type.delete()
        logger.info(f"Deleted event type: {name}")
        return True


class EventService:
    """Service for event operations"""
    
    @staticmethod
    def get_all_events(
        search_query=None, 
        event_type_id=None, 
        status=None, 
        client_id=None,
        start_date_from=None,
        start_date_to=None
    ):
        """
        Get all events with optional filtering
        
        Args:
            search_query (str, optional): Search term for filtering events
            event_type_id (int, optional): Filter by event type
            status (str, optional): Filter by event status
            client_id (int, optional): Filter by client
            start_date_from (date, optional): Filter events starting from this date
            start_date_to (date, optional): Filter events starting before this date
            
        Returns:
            QuerySet: Filtered queryset of events
        """
        queryset = Event.objects.all()
        
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(client__first_name__icontains=search_query) |
                Q(client__last_name__icontains=search_query) |
                Q(client__email__icontains=search_query)
            )
        
        if event_type_id:
            queryset = queryset.filter(event_type_id=event_type_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        if start_date_from:
            queryset = queryset.filter(start_date__gte=start_date_from)
        
        if start_date_to:
            queryset = queryset.filter(start_date__lte=start_date_to)
        
        return queryset.order_by('-start_date')
    
    @staticmethod
    def get_event_by_id(event_id):
        """
        Get an event by ID
        
        Args:
            event_id (int): ID of the event
            
        Returns:
            Event: Event object
            
        Raises:
            EventNotFound: If the event doesn't exist
        """
        try:
            return Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            raise EventNotFound()
    
    @staticmethod
    def create_event(event_data):
        """
        Create a new event
        
        Args:
            event_data (dict): Event data
            
        Returns:
            Event: Created event object
        """
        event = Event.objects.create(**event_data)
        logger.info(f"Created new event: {event}")
        return event
    
    @staticmethod
    def update_event(event_id, event_data):
        """
        Update an existing event
        
        Args:
            event_id (int): ID of the event to update
            event_data (dict): Updated event data
            
        Returns:
            Event: Updated event object
            
        Raises:
            EventNotFound: If the event doesn't exist
        """
        event = EventService.get_event_by_id(event_id)
        
        for key, value in event_data.items():
            setattr(event, key, value)
        
        event.save()
        logger.info(f"Updated event: {event}")
        return event
    
    @staticmethod
    def delete_event(event_id):
        """
        Delete an event (soft delete by marking as CANCELLED)
        
        Args:
            event_id (int): ID of the event to delete
            
        Returns:
            bool: True if deletion was successful
            
        Raises:
            EventNotFound: If the event doesn't exist
        """
        event = EventService.get_event_by_id(event_id)
        
        # Soft delete by changing status to CANCELLED
        event.status = 'CANCELLED'
        event.save()
        
        logger.info(f"Cancelled event: {event}")
        return True