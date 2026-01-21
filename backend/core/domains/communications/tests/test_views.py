"""
Unit tests for communications domain API views.

Tests:
- CommunicationTemplateViewSet (CRUD endpoints, preview, history, rollback, duplicate, stats)
- CommunicationRecordViewSet (list, detail, send_manual, send_bulk, analytics, health)
"""

import pytest
from unittest.mock import patch, Mock, MagicMock
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.utils import timezone
from datetime import timedelta
import uuid

from core.domains.communications.models import (
    CommunicationTemplate,
    CommunicationTemplateHistory,
    CommunicationRecord,
)
from core.domains.communications.context_service import ContextType


@pytest.mark.django_db
class TestCommunicationTemplateViewSet:
    """Tests for CommunicationTemplateViewSet API endpoints."""

    def test_list_templates_as_admin(self, admin_client):
        """Test admin can list all templates."""
        CommunicationTemplate.objects.create(
            name='Template 1',
            body_template='Body 1',
        )
        CommunicationTemplate.objects.create(
            name='Template 2',
            body_template='Body 2',
        )

        response = admin_client.get('/api/communications/templates/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 2

    def test_list_templates_as_client(self, client_user_client):
        """Test client can list templates (for preview purposes)."""
        CommunicationTemplate.objects.create(
            name='Template 1',
            body_template='Body 1',
        )

        response = client_user_client.get('/api/communications/templates/')

        assert response.status_code == status.HTTP_200_OK

    def test_list_templates_filter_by_category(self, admin_client):
        """Test filtering templates by category."""
        CommunicationTemplate.objects.create(
            name='System Template',
            category='SYSTEM',
            body_template='Body',
        )
        CommunicationTemplate.objects.create(
            name='Manual Template',
            category='MANUAL',
            body_template='Body',
        )

        response = admin_client.get('/api/communications/templates/?category=SYSTEM')

        assert response.status_code == status.HTTP_200_OK
        for template in response.data['results']:
            assert template['category'] == 'SYSTEM'

    def test_list_templates_filter_by_channel(self, admin_client):
        """Test filtering templates by channel."""
        CommunicationTemplate.objects.create(
            name='Email Template',
            channel='EMAIL',
            body_template='Body',
        )
        CommunicationTemplate.objects.create(
            name='SMS Template',
            channel='SMS',
            body_template='Body',
        )

        response = admin_client.get('/api/communications/templates/?channel=SMS')

        assert response.status_code == status.HTTP_200_OK
        for template in response.data['results']:
            assert template['channel'] == 'SMS'

    def test_list_templates_search_by_name(self, admin_client):
        """Test searching templates by name."""
        CommunicationTemplate.objects.create(
            name='Welcome Email',
            body_template='Body',
        )
        CommunicationTemplate.objects.create(
            name='Goodbye Email',
            body_template='Body',
        )

        response = admin_client.get('/api/communications/templates/?search=Welcome')

        assert response.status_code == status.HTTP_200_OK
        for template in response.data['results']:
            assert 'Welcome' in template['name']

    def test_retrieve_template(self, admin_client):
        """Test retrieving a single template."""
        template = CommunicationTemplate.objects.create(
            name='Retrieve Test',
            channel='EMAIL',
            subject_template='Subject',
            body_template='Body content',
        )

        response = admin_client.get(f'/api/communications/templates/{template.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['name'] == 'Retrieve Test'
        assert response.data['body_template'] == 'Body content'

    @patch('core.domains.communications.services.validate_template_for_save')
    def test_create_template_as_admin(self, mock_validate, admin_client):
        """Test admin can create a template."""
        mock_validate.return_value = (True, [])

        data = {
            'name': 'New Template',
            'channel': 'EMAIL',
            'category': 'MANUAL',
            'subject_template': 'Subject {{name}}',
            'body_template': '<p>Hello {{name}}</p>',
        }

        response = admin_client.post(
            '/api/communications/templates/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'New Template'

    def test_create_template_as_client_forbidden(self, client_user_client):
        """Test client cannot create templates."""
        data = {
            'name': 'Unauthorized Template',
            'body_template': 'Body',
        }

        response = client_user_client.post(
            '/api/communications/templates/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('core.domains.communications.services.validate_template_for_save')
    def test_update_template_as_admin(self, mock_validate, admin_client):
        """Test admin can update a template."""
        mock_validate.return_value = (True, [])
        template = CommunicationTemplate.objects.create(
            name='Update Test',
            channel='EMAIL',
            subject_template='Old Subject',
            body_template='Old body',
        )

        data = {
            'name': 'Update Test',
            'channel': 'EMAIL',
            'subject_template': 'New Subject',
            'body_template': 'New body',
        }

        response = admin_client.put(
            f'/api/communications/templates/{template.id}/',
            data,
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['subject_template'] == 'New Subject'

    def test_update_template_as_client_forbidden(self, client_user_client):
        """Test client cannot update templates."""
        template = CommunicationTemplate.objects.create(
            name='Protected Template',
            body_template='Body',
        )

        response = client_user_client.put(
            f'/api/communications/templates/{template.id}/',
            {'body_template': 'Hacked body'},
            format='json'
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_delete_template_as_admin(self, admin_client):
        """Test admin can delete a non-system template."""
        template = CommunicationTemplate.objects.create(
            name='Delete Test',
            body_template='Body',
            is_system=False,
        )

        response = admin_client.delete(f'/api/communications/templates/{template.id}/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not CommunicationTemplate.objects.filter(id=template.id).exists()

    def test_delete_template_as_client_forbidden(self, client_user_client):
        """Test client cannot delete templates."""
        template = CommunicationTemplate.objects.create(
            name='Protected Delete',
            body_template='Body',
        )

        response = client_user_client.delete(
            f'/api/communications/templates/{template.id}/'
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('core.domains.communications.services.sandboxed_template_engine')
    @patch('core.domains.communications.views.communications_cache_service')
    def test_preview_template(self, mock_cache, mock_engine, admin_client):
        """Test previewing a template with context data."""
        mock_cache.get_cached_template_preview.return_value = None
        mock_engine.render.return_value = 'Rendered content'

        template = CommunicationTemplate.objects.create(
            name='Preview Test',
            channel='EMAIL',
            subject_template='Hello {{name}}',
            body_template='<p>Hello {{name}}</p>',
        )

        response = admin_client.post(
            f'/api/communications/templates/{template.id}/preview/',
            {'context_data': {'name': 'John'}},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'subject' in response.data
        assert 'body' in response.data

    @patch('core.domains.communications.views.communications_cache_service')
    def test_preview_template_cache_hit(self, mock_cache, admin_client):
        """Test preview returns cached data when available."""
        mock_cache.get_cached_template_preview.return_value = {
            'subject': 'Cached Subject',
            'body': 'Cached Body',
        }

        template = CommunicationTemplate.objects.create(
            name='Cached Preview',
            body_template='Body',
        )

        response = admin_client.post(
            f'/api/communications/templates/{template.id}/preview/',
            {'context_data': {}},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['subject'] == 'Cached Subject'

    def test_history_as_admin(self, admin_client, user_factory):
        """Test admin can view template version history."""
        admin = user_factory(admin=True)
        template = CommunicationTemplate.objects.create(
            name='History Test',
            body_template='Original',
        )

        # Create history entry
        CommunicationTemplateHistory.create_snapshot(
            template=template,
            reason='CREATE',
            changed_by=admin,
        )

        response = admin_client.get(
            f'/api/communications/templates/{template.id}/history/'
        )

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) >= 1

    def test_history_as_client_forbidden(self, client_user_client):
        """Test client cannot view template history."""
        template = CommunicationTemplate.objects.create(
            name='Protected History',
            body_template='Body',
        )

        response = client_user_client.get(
            f'/api/communications/templates/{template.id}/history/'
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_rollback_as_admin(self, admin_client, user_factory):
        """Test admin can rollback template to previous version."""
        admin = user_factory(admin=True)
        template = CommunicationTemplate.objects.create(
            name='Rollback Test',
            body_template='Version 1',
        )

        # Create history
        CommunicationTemplateHistory.create_snapshot(
            template=template,
            reason='CREATE',
            changed_by=admin,
        )

        # Update template
        template.body_template = 'Version 2'
        template.save()

        CommunicationTemplateHistory.create_snapshot(
            template=template,
            reason='UPDATE',
            changed_by=admin,
        )

        response = admin_client.post(
            f'/api/communications/templates/{template.id}/rollback/',
            {'version': 1},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['body_template'] == 'Version 1'

    def test_rollback_missing_version(self, admin_client):
        """Test rollback requires version parameter."""
        template = CommunicationTemplate.objects.create(
            name='Rollback Missing',
            body_template='Body',
        )

        response = admin_client.post(
            f'/api/communications/templates/{template.id}/rollback/',
            {},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_duplicate_as_admin(self, admin_client):
        """Test admin can duplicate a template."""
        template = CommunicationTemplate.objects.create(
            name='Original Template',
            channel='EMAIL',
            subject_template='Subject',
            body_template='Body content',
        )

        response = admin_client.post(
            f'/api/communications/templates/{template.id}/duplicate/',
            {'new_name': 'Duplicated Template'},
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['name'] == 'Duplicated Template'
        assert response.data['body_template'] == 'Body content'
        assert response.data['is_system'] is False

    def test_duplicate_auto_generate_name(self, admin_client):
        """Test duplicate auto-generates name if not provided."""
        template = CommunicationTemplate.objects.create(
            name='Template to Copy',
            body_template='Body',
        )

        response = admin_client.post(
            f'/api/communications/templates/{template.id}/duplicate/',
            {},
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert 'Copy of' in response.data['name']

    def test_stats_as_admin(self, admin_client):
        """Test admin can view template usage statistics."""
        template = CommunicationTemplate.objects.create(
            name='Stats Test Template',
            body_template='Body',
        )

        # Create some records
        for i in range(5):
            CommunicationRecord.objects.create(
                template_name='Stats Test Template',
                recipient=f'user{i}@example.com',
                body='Body',
                delivery_status='DELIVERED' if i < 3 else 'FAILED',
            )

        response = admin_client.get(
            f'/api/communications/templates/{template.id}/stats/'
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['total_sent'] == 5
        assert response.data['delivered'] == 3
        assert response.data['failed'] == 2

    def test_stats_as_client_forbidden(self, client_user_client):
        """Test client cannot view template statistics."""
        template = CommunicationTemplate.objects.create(
            name='Protected Stats',
            body_template='Body',
        )

        response = client_user_client.get(
            f'/api/communications/templates/{template.id}/stats/'
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('core.domains.communications.views.communications_cache_service')
    def test_variable_schemas(self, mock_cache, admin_client):
        """Test getting variable schemas for templates."""
        mock_cache.get_cached_variable_schemas.return_value = None

        response = admin_client.get('/api/communications/templates/variable_schemas/')

        assert response.status_code == status.HTTP_200_OK
        assert 'context_types' in response.data
        assert 'variable_groups' in response.data


@pytest.mark.django_db
class TestCommunicationRecordViewSet:
    """Tests for CommunicationRecordViewSet API endpoints."""

    def test_list_records_as_admin(self, admin_client):
        """Test admin can list all communication records."""
        CommunicationRecord.objects.create(
            template_name='Record 1',
            recipient='user1@example.com',
            body='Body 1',
        )
        CommunicationRecord.objects.create(
            template_name='Record 2',
            recipient='user2@example.com',
            body='Body 2',
        )

        response = admin_client.get('/api/communications/records/')

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 2

    def test_list_records_as_client_sees_only_own(self, authenticated_client, user_factory):
        """Test client can only see their own communication records."""
        client_user = user_factory(role='CLIENT')
        other_user = user_factory(role='CLIENT')

        # Create record for client
        CommunicationRecord.objects.create(
            template_name='Client Record',
            recipient=client_user.email,
            body='Body',
            client=client_user,
        )

        # Create record for other user
        CommunicationRecord.objects.create(
            template_name='Other Record',
            recipient=other_user.email,
            body='Body',
            client=other_user,
        )

        client = authenticated_client(user=client_user)
        response = client.get('/api/communications/records/')

        assert response.status_code == status.HTTP_200_OK
        for record in response.data['results']:
            assert record['client'] == client_user.id

    def test_list_records_filter_by_status(self, admin_client):
        """Test filtering records by delivery status."""
        CommunicationRecord.objects.create(
            template_name='Sent Record',
            recipient='sent@example.com',
            body='Body',
            delivery_status='SENT',
        )
        CommunicationRecord.objects.create(
            template_name='Failed Record',
            recipient='failed@example.com',
            body='Body',
            delivery_status='FAILED',
        )

        response = admin_client.get('/api/communications/records/?status=SENT')

        assert response.status_code == status.HTTP_200_OK
        for record in response.data['results']:
            assert record['delivery_status'] == 'SENT'

    def test_list_records_filter_by_channel(self, admin_client):
        """Test filtering records by channel."""
        CommunicationRecord.objects.create(
            template_name='Email Record',
            channel='EMAIL',
            recipient='email@example.com',
            body='Body',
        )
        CommunicationRecord.objects.create(
            template_name='SMS Record',
            channel='SMS',
            recipient='+1234567890',
            body='Body',
        )

        response = admin_client.get('/api/communications/records/?channel=EMAIL')

        assert response.status_code == status.HTTP_200_OK
        for record in response.data['results']:
            assert record['channel'] == 'EMAIL'

    def test_list_records_excludes_soft_deleted(self, admin_client, user_factory):
        """Test soft-deleted records are excluded by default."""
        admin = user_factory(admin=True)
        record = CommunicationRecord.objects.create(
            template_name='Deleted Record',
            recipient='deleted@example.com',
            body='Body',
        )
        record.soft_delete(deleted_by=admin)

        response = admin_client.get('/api/communications/records/')

        record_ids = [r['id'] for r in response.data['results']]
        assert str(record.id) not in record_ids

    def test_retrieve_record(self, admin_client):
        """Test retrieving a single record."""
        record = CommunicationRecord.objects.create(
            template_name='Retrieve Record',
            recipient='retrieve@example.com',
            subject='Subject',
            body='Body content',
        )

        response = admin_client.get(f'/api/communications/records/{record.id}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['template_name'] == 'Retrieve Record'

    @patch('core.domains.communications.views.CommunicationService')
    def test_send_manual_as_admin(self, mock_service_class, admin_client):
        """Test admin can send manual communication."""
        mock_service = Mock()
        mock_record = Mock()
        mock_record.id = uuid.uuid4()
        mock_record.template_name = 'Manual Template'
        mock_record.delivery_status = 'SENT'
        mock_service.send_communication_by_template.return_value = mock_record
        mock_service_class.return_value = mock_service

        template = CommunicationTemplate.objects.create(
            name='Manual Send Template',
            channel='EMAIL',
            subject_template='Subject',
            body_template='Body',
        )

        response = admin_client.post(
            '/api/communications/records/send_manual/',
            {
                'template_id': template.id,
                'recipient': 'test@example.com',
            },
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED

    def test_send_manual_as_client_forbidden(self, client_user_client):
        """Test client cannot send manual communications."""
        template = CommunicationTemplate.objects.create(
            name='Forbidden Template',
            body_template='Body',
        )

        response = client_user_client.post(
            '/api/communications/records/send_manual/',
            {
                'template_id': template.id,
                'recipient': 'test@example.com',
            },
            format='json'
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('core.domains.communications.views.CommunicationService')
    @patch('core.domains.communications.views.CommunicationRateLimiter')
    def test_send_bulk_as_admin(self, mock_limiter, mock_service_class, admin_client):
        """Test admin can send bulk communications."""
        mock_limiter.check_daily_bulk_limit.return_value = (True, '')
        mock_service = Mock()
        mock_service.send_bulk_communications.return_value = []
        mock_service_class.return_value = mock_service

        template = CommunicationTemplate.objects.create(
            name='Bulk Template',
            channel='EMAIL',
            category='AUTO',
            subject_template='Subject',
            body_template='Body',
        )

        response = admin_client.post(
            '/api/communications/records/send_bulk/',
            {
                'template_id': template.id,
                'recipients': [
                    {'recipient': 'user1@example.com'},
                    {'recipient': 'user2@example.com'},
                ],
            },
            format='json'
        )

        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_202_ACCEPTED]

    def test_send_bulk_as_client_forbidden(self, client_user_client):
        """Test client cannot send bulk communications."""
        template = CommunicationTemplate.objects.create(
            name='Bulk Forbidden',
            body_template='Body',
        )

        response = client_user_client.post(
            '/api/communications/records/send_bulk/',
            {
                'template_id': template.id,
                'recipients': [{'recipient': 'test@example.com'}],
            },
            format='json'
        )

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('core.domains.communications.views.communications_cache_service')
    def test_analytics_as_admin(self, mock_cache, admin_client):
        """Test admin can access analytics."""
        mock_cache.get_cached_template_analytics.return_value = None

        # Create some records for analytics
        CommunicationRecord.objects.create(
            template_name='Analytics Template',
            recipient='test@example.com',
            body='Body',
            delivery_status='DELIVERED',
        )

        response = admin_client.get('/api/communications/records/analytics/')

        assert response.status_code == status.HTTP_200_OK
        assert 'total_sent' in response.data

    def test_mark_as_read(self, authenticated_client, user_factory):
        """Test marking a communication as read."""
        client_user = user_factory(role='CLIENT')
        record = CommunicationRecord.objects.create(
            template_name='Read Test',
            recipient=client_user.email,
            body='Body',
            client=client_user,
            is_opened=False,
        )

        client = authenticated_client(user=client_user)
        response = client.post(
            f'/api/communications/records/{record.id}/mark_as_read/'
        )

        assert response.status_code == status.HTTP_200_OK
        record.refresh_from_db()
        assert record.is_opened is True
        assert record.opened_at is not None

    def test_mark_as_read_already_read(self, authenticated_client, user_factory):
        """Test marking already-read communication as read."""
        client_user = user_factory(role='CLIENT')
        record = CommunicationRecord.objects.create(
            template_name='Already Read',
            recipient=client_user.email,
            body='Body',
            client=client_user,
            is_opened=True,
            opened_at=timezone.now(),
        )

        client = authenticated_client(user=client_user)
        response = client.post(
            f'/api/communications/records/{record.id}/mark_as_read/'
        )

        assert response.status_code == status.HTTP_200_OK
        assert 'already' in response.data['message'].lower()

    def test_mark_as_unread(self, authenticated_client, user_factory):
        """Test marking a communication as unread."""
        client_user = user_factory(role='CLIENT')
        record = CommunicationRecord.objects.create(
            template_name='Unread Test',
            recipient=client_user.email,
            body='Body',
            client=client_user,
            is_opened=True,
            opened_at=timezone.now(),
        )

        client = authenticated_client(user=client_user)
        response = client.post(
            f'/api/communications/records/{record.id}/mark_as_unread/'
        )

        assert response.status_code == status.HTTP_200_OK
        record.refresh_from_db()
        assert record.is_opened is False
        assert record.opened_at is None

    def test_mark_all_as_read_client(self, authenticated_client, user_factory):
        """Test marking all communications as read for client."""
        client_user = user_factory(role='CLIENT')

        for i in range(3):
            CommunicationRecord.objects.create(
                template_name=f'Unread {i}',
                recipient=client_user.email,
                body='Body',
                client=client_user,
                is_opened=False,
            )

        client = authenticated_client(user=client_user)
        response = client.post('/api/communications/records/mark_all_as_read/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 3

    def test_unread_count_client(self, authenticated_client, user_factory):
        """Test getting unread count for client."""
        client_user = user_factory(role='CLIENT')

        for i in range(3):
            CommunicationRecord.objects.create(
                template_name=f'Unread {i}',
                recipient=client_user.email,
                body='Body',
                client=client_user,
                is_opened=False,
            )

        # One read record
        CommunicationRecord.objects.create(
            template_name='Read Record',
            recipient=client_user.email,
            body='Body',
            client=client_user,
            is_opened=True,
        )

        client = authenticated_client(user=client_user)
        response = client.get('/api/communications/records/unread_count/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['unread_count'] == 3

    @patch('core.domains.communications.views.CommunicationService')
    def test_health_check_as_admin(self, mock_service_class, admin_client):
        """Test admin can access health check."""
        mock_service = Mock()
        mock_service.get_provider_health.return_value = {
            'MOCK': {'state': 'closed', 'failures': 0, 'healthy': True}
        }
        mock_service_class.return_value = mock_service

        response = admin_client.get('/api/communications/records/health_check/')

        assert response.status_code == status.HTTP_200_OK
        assert 'providers' in response.data

    def test_health_check_as_client_forbidden(self, client_user_client):
        """Test client cannot access health check."""
        response = client_user_client.get('/api/communications/records/health_check/')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('core.domains.communications.views.CommunicationService')
    def test_reset_provider_as_admin(self, mock_service_class, admin_client):
        """Test admin can reset a provider."""
        mock_service = Mock()
        mock_service_class.return_value = mock_service

        response = admin_client.post(
            '/api/communications/records/reset_provider/',
            {'provider_name': 'MOCK'},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK

    def test_reset_provider_missing_name(self, admin_client):
        """Test reset provider requires provider_name."""
        response = admin_client.post(
            '/api/communications/records/reset_provider/',
            {},
            format='json'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    @patch('core.domains.communications.views.health_checker')
    def test_system_health_as_admin(self, mock_checker, admin_client):
        """Test admin can access system health."""
        mock_checker.get_cached_health.return_value = None
        mock_checker.check_all_systems.return_value = {
            'overall_status': 'healthy',
            'checks': {},
        }

        response = admin_client.get('/api/communications/records/system_health/')

        assert response.status_code == status.HTTP_200_OK
        assert 'overall_status' in response.data

    @patch('core.domains.communications.views.communication_metrics')
    def test_metrics_as_admin(self, mock_metrics, admin_client):
        """Test admin can access metrics."""
        mock_metrics.get_hourly_metrics.return_value = {
            'hourly_stats': [],
            'summary': {'total_sent': 0},
        }
        mock_metrics.get_database_metrics.return_value = {}

        response = admin_client.get('/api/communications/records/metrics/')

        assert response.status_code == status.HTTP_200_OK
        assert 'cache_metrics' in response.data

    def test_metrics_as_client_forbidden(self, client_user_client):
        """Test client cannot access metrics."""
        response = client_user_client.get('/api/communications/records/metrics/')

        assert response.status_code == status.HTTP_403_FORBIDDEN

    @patch('core.domains.communications.views.alert_manager')
    def test_alerts_as_admin(self, mock_alerts, admin_client):
        """Test admin can access alerts."""
        mock_alerts.get_active_alerts.return_value = []

        response = admin_client.get('/api/communications/records/alerts/')

        assert response.status_code == status.HTTP_200_OK
        assert 'active_alerts' in response.data

    @patch('core.domains.communications.views.alert_manager')
    def test_clear_alerts_as_admin(self, mock_alerts, admin_client):
        """Test admin can clear alerts."""
        response = admin_client.post('/api/communications/records/clear_alerts/')

        assert response.status_code == status.HTTP_200_OK
        mock_alerts.clear_alerts.assert_called_once()
