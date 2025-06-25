# core/domains/notes/tests.py
from core.domains.users.models import User
from django.contrib.contenttypes.models import ContentType
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Note
from .services import NoteService


class NoteModelTests(TestCase):
    """Test case for Note model"""
    def setUp(self):
        """Set up test data"""
        # Create a user
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpassword",
            first_name="Test",
            last_name="User",
            role="ADMIN"
        )
        
        # Get content type for user model
        self.user_content_type = ContentType.objects.get_for_model(User)
        
        # Create a note
        self.note = Note.objects.create(
            title="Test Note",
            content="This is a test note",
            created_by=self.user,
            content_type=self.user_content_type,
            object_id=self.user.id
        )
    
    def test_note_creation(self):
        """Test creating a note"""
        self.assertEqual(self.note.title, "Test Note")
        self.assertEqual(self.note.content, "This is a test note")
        self.assertEqual(self.note.created_by, self.user)
        self.assertEqual(self.note.content_type, self.user_content_type)
        self.assertEqual(self.note.object_id, self.user.id)
        self.assertEqual(self.note.content_object, self.user)
    
    def test_note_string_representation(self):
        """Test string representation of a note"""
        self.assertEqual(str(self.note), "Note: Test Note")
        
        # Test with no title
        self.note.title = ""
        self.note.save()
        self.assertEqual(str(self.note), "Note: This is a test note")
        
        # Test with long content
        self.note.title = ""
        self.note.content = "x" * 100
        self.note.save()
        self.assertEqual(str(self.note), f"Note: {'x' * 50}")

class NoteAPITests(APITestCase):
    """Test case for the notes API endpoints"""
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
        
        # Create regular user
        self.regular_user = User.objects.create_user(
            email="user@example.com",
            password="userpassword",
            first_name="Regular",
            last_name="User",
            role="CLIENT"
        )
        
        # Get content type for user model
        self.user_content_type = ContentType.objects.get_for_model(User)
        
        # Create a note
        self.note = Note.objects.create(
            title="Test Note",
            content="This is a test note",
            created_by=self.admin_user,
            content_type=self.user_content_type,
            object_id=self.regular_user.id
        )
        
        # URLs
        self.notes_url = reverse('notes:note-list')
        self.note_detail_url = reverse('notes:note-detail', args=[self.note.id])
        self.notes_for_object_url = reverse('notes:note-for-object')
    
    def test_unauthorized_access(self):
        """Test unauthorized access to notes API"""
        response = self.client.get(self.notes_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_regular_user_access(self):
        """Test regular user cannot access notes API"""
        self.client.force_authenticate(user=self.regular_user)
        response = self.client.get(self.notes_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_admin_can_list_notes(self):
        """Test that admin can list notes"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.notes_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Test Note")
    
    def test_admin_can_get_note_detail(self):
        """Test that admin can get note detail"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(self.note_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], "Test Note")
        self.assertEqual(response.data['content'], "This is a test note")
    
    def test_admin_can_create_note(self):
        """Test that admin can create a note"""
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'title': 'New Note',
            'content': 'This is a new note',
            'content_type_model': 'user',
            'object_id': self.regular_user.id
        }
        response = self.client.post(self.notes_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Note.objects.count(), 2)
        self.assertEqual(response.data['title'], 'New Note')
    
    def test_admin_can_update_note(self):
        """Test that admin can update a note"""
        self.client.force_authenticate(user=self.admin_user)
        data = {
            'title': 'Updated Note',
            'content': 'This is an updated note'
        }
        response = self.client.patch(self.note_detail_url, data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Note')
        self.assertEqual(response.data['content'], 'This is an updated note')
    
    def test_admin_can_delete_note(self):
        """Test that admin can delete a note"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.delete(self.note_detail_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(Note.objects.count(), 0)
    
    def test_get_notes_for_object(self):
        """Test getting notes for a specific object"""
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.get(
            f"{self.notes_for_object_url}?content_type=user&object_id={self.regular_user.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['title'], "Test Note")