#!/usr/bin/env python
"""
Test script to verify N+1 query optimizations in ViewSets.

This script checks database query counts for various ViewSets to ensure
select_related and prefetch_related optimizations are working correctly.
"""

import os
import sys
import django
from django.db import connection, reset_queries
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
import json

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

# Import models after Django setup
from core.domains.events.models import Event, EventType
from core.domains.payments.models import Payment, Invoice, PaymentGateway, PaymentMethod
from core.domains.sales.models import EventQuote, QuoteTemplate
from core.domains.communications.models import CommunicationRecord, CommunicationTemplate
from core.domains.notifications.models import Notification, NotificationType
from core.domains.questionnaires.models import Questionnaire, QuestionnaireField
from core.domains.workflows.models import WorkflowTemplate, WorkflowStage
from core.domains.contracts.models import ContractTemplate, EventContract, ContractSignature
from core.domains.notes.models import Note
from django.contrib.contenttypes.models import ContentType

User = get_user_model()


class TestN1Optimizations:
    """Test class to verify N+1 query optimizations."""
    
    def __init__(self):
        self.results = []
        self.setup_test_data()
    
    def setup_test_data(self):
        """Create test data for testing."""
        print("Setting up test data...")
        
        # Clean up existing test users first
        User.objects.filter(email__in=['admin@test.com', 'client0@test.com', 'client1@test.com', 'client2@test.com']).delete()
        
        # Create users
        self.admin_user = User.objects.create_user(
            email='admin@test.com',
            password='testpass123',
            role='ADMIN',
            first_name='Admin',
            last_name='User'
        )
        
        self.client_users = []
        for i in range(3):
            user = User.objects.create_user(
                email=f'client{i}@test.com',
                password='testpass123',
                role='CLIENT',
                first_name=f'Client{i}',
                last_name='User'
            )
            self.client_users.append(user)
        
        # Create event types
        self.event_type = EventType.objects.create(
            name='Wedding',
            description='Wedding events'
        )
        
        # Create events
        from django.utils import timezone
        from datetime import datetime
        
        self.events = []
        for client in self.client_users:
            for i in range(2):
                event = Event.objects.create(
                    client=client,
                    event_type=self.event_type,
                    status='CONFIRMED',
                    name=f'Event for {client.first_name} #{i}',
                    start_date=timezone.make_aware(datetime(2024, 12, 25, 10, 0, 0)),
                    total_price=Decimal('10000.00')
                )
                self.events.append(event)
        
        # Create payment gateway  
        self.gateway, created = PaymentGateway.objects.get_or_create(
            name='Stripe',
            code='stripe',
            defaults={'is_active': True, 'config': {}}
        )
        
        # Create payment methods
        for client in self.client_users:
            PaymentMethod.objects.create(
                user=client,
                type='CARD',
                is_default=True,
                gateway=self.gateway
            )
        
        # Create payments
        for event in self.events:
            Payment.objects.create(
                payment_number=f'PAY-{event.id}',
                event=event,
                amount=Decimal('5000.00'),
                status='COMPLETED',
                due_date=datetime(2024, 12, 20).date(),
                payment_method=event.client.paymentmethod_set.first()
            )
        
        # Create quote templates
        self.quote_template = QuoteTemplate.objects.create(
            name='Standard Wedding Quote',
            event_type=self.event_type
        )
        
        # Create quotes
        for event in self.events:
            EventQuote.objects.create(
                event=event,
                template=self.quote_template,
                version=1,
                status='ACCEPTED',
                total_amount=Decimal('10000.00'),
                valid_until=datetime(2024, 12, 31).date()
            )
        
        # Create communication templates
        self.comm_template = CommunicationTemplate.objects.create(
            name='Welcome Email',
            channel='EMAIL',
            category='MANUAL',
            subject_template='Welcome',
            body_template='Hello'
        )
        
        # Create communication records
        for client in self.client_users:
            CommunicationRecord.objects.create(
                template_name='Welcome Email',
                channel='EMAIL',
                recipient=client.email,
                subject='Welcome',
                body='Hello',
                client=client,
                sent_by=self.admin_user
            )
        
        # Create notification types
        self.notif_type = NotificationType.objects.create(
            code='PAYMENT_RECEIVED',
            name='Payment Received',
            category='PAYMENT',
            default_title_template='Payment received',
            default_content_template='Your payment has been received'
        )
        
        # Create notifications
        for client in self.client_users:
            for event in client.events.all():
                Notification.objects.create(
                    recipient=client,
                    notification_type=self.notif_type,
                    title='Payment received',
                    content='Your payment has been received',
                    event=event
                )
        
        # Create contract template
        self.contract_template = ContractTemplate.objects.create(
            name='Standard Contract',
            event_type=self.event_type,
            content='Contract content'
        )
        
        # Create contracts
        for event in self.events:
            EventContract.objects.create(
                event=event,
                template=self.contract_template,
                status='SIGNED',
                content='Contract content'
            )
        
        print("Test data setup complete!")
    
    def count_queries(self, func):
        """Helper to count queries executed by a function."""
        reset_queries()
        result = func()
        query_count = len(connection.queries)
        return query_count, result
    
    def test_payment_viewset(self):
        """Test Payment ViewSet optimization."""
        from core.domains.payments.views import PaymentViewSet
        
        viewset = PaymentViewSet()
        viewset.request = type('Request', (), {'user': self.admin_user, 'query_params': {}})()
        
        query_count, payments = self.count_queries(lambda: list(viewset.get_queryset()))
        
        # Access related fields to trigger potential N+1 queries
        def access_related():
            for payment in payments:
                _ = payment.event.name
                _ = payment.event.client.email
                if payment.payment_method:
                    _ = payment.payment_method.gateway.name
        
        related_query_count, _ = self.count_queries(access_related)
        
        result = {
            'viewset': 'PaymentViewSet',
            'total_records': len(payments),
            'initial_query_count': query_count,
            'related_access_query_count': related_query_count,
            'optimized': related_query_count == 0  # No additional queries for related access
        }
        
        self.results.append(result)
        return result
    
    def test_invoice_viewset(self):
        """Test Invoice ViewSet optimization."""
        # Create some invoices first
        from datetime import datetime
        for event in self.events[:3]:
            Invoice.objects.create(
                invoice_id=f'INV-{event.id}',
                event=event,
                client=event.client,
                total_amount=Decimal('10000.00'),
                issue_date=datetime(2024, 1, 1).date(),
                due_date=datetime(2024, 1, 31).date(),
                status='PAID'
            )
        
        from core.domains.payments.views import InvoiceViewSet
        
        viewset = InvoiceViewSet()
        viewset.request = type('Request', (), {'user': self.admin_user, 'query_params': {}})()
        
        query_count, invoices = self.count_queries(lambda: list(viewset.get_queryset()))
        
        # Access related fields
        def access_related():
            for invoice in invoices:
                _ = invoice.event.name
                _ = invoice.client.email
        
        related_query_count, _ = self.count_queries(access_related)
        
        result = {
            'viewset': 'InvoiceViewSet',
            'total_records': len(invoices),
            'initial_query_count': query_count,
            'related_access_query_count': related_query_count,
            'optimized': related_query_count == 0
        }
        
        self.results.append(result)
        return result
    
    def test_communication_record_viewset(self):
        """Test CommunicationRecord ViewSet optimization."""
        from core.domains.communications.views import CommunicationRecordViewSet
        
        viewset = CommunicationRecordViewSet()
        viewset.request = type('Request', (), {'user': self.admin_user, 'query_params': {}})()
        
        query_count, records = self.count_queries(lambda: list(viewset.get_queryset()))
        
        # Access related fields
        def access_related():
            for record in records:
                _ = record.client.email if record.client else None
                _ = record.sent_by.email if record.sent_by else None
        
        related_query_count, _ = self.count_queries(access_related)
        
        result = {
            'viewset': 'CommunicationRecordViewSet',
            'total_records': len(records),
            'initial_query_count': query_count,
            'related_access_query_count': related_query_count,
            'optimized': related_query_count == 0
        }
        
        self.results.append(result)
        return result
    
    def test_sales_viewsets(self):
        """Test Sales domain ViewSets optimization."""
        from core.domains.sales.views import EventQuoteViewSet
        
        viewset = EventQuoteViewSet()
        viewset.request = type('Request', (), {'user': self.admin_user, 'query_params': {}})()
        
        query_count, quotes = self.count_queries(lambda: list(viewset.get_queryset()))
        
        # Access related fields
        def access_related():
            for quote in quotes:
                _ = quote.event.name
                _ = quote.event.client.email
                _ = quote.template.name if quote.template else None
        
        related_query_count, _ = self.count_queries(access_related)
        
        result = {
            'viewset': 'EventQuoteViewSet',
            'total_records': len(quotes),
            'initial_query_count': query_count,
            'related_access_query_count': related_query_count,
            'optimized': related_query_count == 0
        }
        
        self.results.append(result)
        return result
    
    def test_note_viewset(self):
        """Test Note ViewSet optimization."""
        # Create some notes
        content_type = ContentType.objects.get_for_model(Event)
        for event in self.events[:3]:
            Note.objects.create(
                title='Test Note',
                content='Note content',
                created_by=self.admin_user,
                content_type=content_type,
                object_id=event.id
            )
        
        from core.domains.notes.views import NoteViewSet
        
        viewset = NoteViewSet()
        viewset.request = type('Request', (), {'user': self.admin_user, 'query_params': {}})()
        
        query_count, notes = self.count_queries(lambda: list(viewset.get_queryset()))
        
        # Access related fields
        def access_related():
            for note in notes:
                _ = note.created_by.email if note.created_by else None
                _ = note.content_type.model
        
        related_query_count, _ = self.count_queries(access_related)
        
        result = {
            'viewset': 'NoteViewSet',
            'total_records': len(notes),
            'initial_query_count': query_count,
            'related_access_query_count': related_query_count,
            'optimized': related_query_count == 0
        }
        
        self.results.append(result)
        return result
    
    def run_all_tests(self):
        """Run all optimization tests."""
        print("\n" + "="*60)
        print("Running N+1 Query Optimization Tests")
        print("="*60 + "\n")
        
        tests = [
            self.test_payment_viewset,
            self.test_invoice_viewset,
            self.test_communication_record_viewset,
            self.test_sales_viewsets,
            self.test_note_viewset,
        ]
        
        for test in tests:
            try:
                result = test()
                self._print_result(result)
            except Exception as e:
                print(f"Error in {test.__name__}: {str(e)}")
        
        self._print_summary()
    
    def _print_result(self, result):
        """Print individual test result."""
        status = "✅ OPTIMIZED" if result['optimized'] else "❌ NOT OPTIMIZED"
        print(f"\n{result['viewset']}:")
        print(f"  Status: {status}")
        print(f"  Records: {result['total_records']}")
        print(f"  Initial queries: {result['initial_query_count']}")
        print(f"  Additional queries for related access: {result['related_access_query_count']}")
    
    def _print_summary(self):
        """Print summary of all tests."""
        print("\n" + "="*60)
        print("SUMMARY")
        print("="*60)
        
        total = len(self.results)
        optimized = sum(1 for r in self.results if r['optimized'])
        
        print(f"\nTotal ViewSets tested: {total}")
        print(f"Optimized: {optimized}")
        print(f"Not optimized: {total - optimized}")
        
        if optimized == total:
            print("\n🎉 All ViewSets are properly optimized!")
        else:
            print("\n⚠️  Some ViewSets still need optimization:")
            for result in self.results:
                if not result['optimized']:
                    print(f"  - {result['viewset']}")


if __name__ == '__main__':
    # Run the tests
    tester = TestN1Optimizations()
    tester.run_all_tests()