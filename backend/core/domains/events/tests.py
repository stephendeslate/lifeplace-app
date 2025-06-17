# backend/core/domains/events/tests.py
from datetime import timedelta

from core.domains.users.models import User
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Event, EventType
from .services import EventTypeService, EventService


class EventTypeModelTests(TestCase):
    """Test case for the EventType model"""
    
    def setUp(self):
        """Set up test data"""
        self.event_type = EventType.objects.create(
            name="Wedding",
            description="Wedding photography event",
            is_active=True
        )
    
    def test_event_type_creation(self):
        """Test creating an event type"""
        self.assertEqual(self.event_type.name, "Wedding")
        self.assertEqual(self.event_type.description, "Wedding photography event")
        self.assertTrue(self.event_type.is_active)
    
    def test_event_type_string_representation(self):
        """Test the string representation of an event type"""
        self.assertEqual(str(self.event_type), "Wedding")


class EventTypeServiceTests(TestCase):
    """Test case for the EventTypeService"""
    
    def setUp(self):
        """Set up test data"""
        self.event_type1 = EventType.objects.create(
            name="Wedding",
            description="Wedding photography event",
            is_active=True
        )
        
        self.event_type2 = EventType.objects.create(
            name="Portrait",
            description="Portrait photography session",
            is_active=False
        )
    
    def test_get_all_event_types(self):
        """Test getting all event types"""
        # Get all event types
        event_types = EventTypeService.get_all_event_types()
        self.assertEqual(event_types.count(), 2)
        
        # Filter by active status
        active_types = EventTypeService.get_all_event_types(is_active=True)
        self.assertEqual(active_types.count(), 1)
        self.assertEqual(active_types.first().name, "Wedding")
        
        # Filter by search query
        search_results = EventTypeService.get_all_event_types(search_query="port")
        self.assertEqual(search_results.count(), 1)
        self.assertEqual(search_results.first().name, "Portrait")
    
    def test_get_event_type_by_id(self):
        """Test getting an event type by ID"""
        event_type = EventTypeService.get_event_type_by_id(self.event_type1.id)
        self.assertEqual(event_type.name, "Wedding")
    
    def test_create_event_type(self):
        """Test creating an event type"""
        event_type_data = {
            "name": "Corporate",
            "description": "Corporate event photography",
            "is_active": True
        }
        
        event_type = EventTypeService.create_event_type(event_type_data)
        self.assertEqual(event_type.name, "Corporate")
        self.assertEqual(event_type.description, "Corporate event photography")
        self.assertTrue(EventType.objects.filter(name="Corporate").exists())
    
    def test_update_event_type(self):
        """Test updating an event type"""
        event_type_data = {
            "name": "Updated Wedding",
            "description": "Updated description"
        }
        
        updated_event_type = EventTypeService.update_event_type(
            self.event_type1.id,
            event_type_data
        )
        
        self.assertEqual(updated_event_type.name, "Updated Wedding")
        self.assertEqual(updated_event_type.description, "Updated description")
    
    def test_delete_event_type(self):
        """Test deleting an event type"""
        result = EventTypeService.delete_event_type(self.event_type2.id)
        self.assertTrue(result)
        self.assertFalse(EventType.objects.filter(id=self.event_type2.id).exists())


class EventTypeAPITests(APITestCase):
    """Test case for the EventType API endpoints"""
    
    def setUp(self):
        """Set up test data"""
        # Create admin user
        self.admin_user = User.objects.create_user(
            email="admin@example.com",
            password="adminpassword",
            first_name="Admin",
            last_name="User",
            role="ADMIN",
            is_staff=True
        )
        
        # Create event type
        self.event_type = EventType.objects.create(
            name="Wedding",
            description="Wedding photography event",
            is_active=True
        )
        
        # URLs
        self.event_types_url = reverse('events:event-type-list')
        self.event_type_detail_url = reverse('events:event-type-detail', args=[self.event_type.id])
    
    def test_unauthorized_access(self):
        """Test unauthorized access to event type API"""
        response = self.client.get(self.event_types_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_event_type_list(self):
        """Test listing event types"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.event_types_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Wedding")
    
    def test_event_type_detail(self):
        """Test retrieving event type detail"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.event_type_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Wedding")
        self.assertEqual(response.data['description'], "Wedding photography event")
    
    def test_create_event_type(self):
        """Test creating a new event type"""
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "name": "Corporate",
            "description": "Corporate event photography",
            "is_active": True
        }
        
        response = self.client.post(self.event_types_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(EventType.objects.count(), 2)
        self.assertEqual(response.data['name'], "Corporate")
    
    def test_update_event_type(self):
        """Test updating an event type"""
        self.client.force_authenticate(user=self.admin_user)
        data = {
            "name": "Updated Wedding",
            "description": "Updated description"
        }
        
        response = self.client.patch(self.event_type_detail_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], "Updated Wedding")
        self.assertEqual(response.data['description'], "Updated description")
    
    def test_get_active_event_types(self):
        """Test getting only active event types"""
        # Create an inactive event type
        EventType.objects.create(
            name="Inactive Type",
            description="This is inactive",
            is_active=False
        )
        
        self.client.force_authenticate(user=self.admin_user)
        url = reverse('events:event-type-active')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], "Wedding")