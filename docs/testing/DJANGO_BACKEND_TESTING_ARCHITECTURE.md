# Django Backend Comprehensive Testing Architecture Plan

## Executive Summary

This document outlines a comprehensive testing strategy for the LifePlace Django backend. The plan is based on thorough analysis of the existing codebase (21 domains, 100+ models, 50+ API views, 30+ Celery tasks) and current industry best practices for testing Django REST Framework applications with pytest, factory_boy, and proper test isolation.

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Testing Strategy & Pyramid](#2-testing-strategy--pyramid)
3. [Testing Infrastructure](#3-testing-infrastructure)
4. [Test Categories & Patterns](#4-test-categories--patterns)
5. [Implementation Roadmap](#5-implementation-roadmap)
6. [File Organization](#6-file-organization)
7. [Code Examples](#7-code-examples)
8. [Coverage Goals](#8-coverage-goals)
9. [CI/CD Integration](#9-cicd-integration)
10. [Best Practices & Guidelines](#10-best-practices--guidelines)

---

## 1. Current State Analysis

### 1.1 Existing Testing Setup

| Component | Current State |
|-----------|---------------|
| **Test Framework** | Django TestCase + DRF APITestCase |
| **Test Runner** | Django's built-in (`python manage.py test`) |
| **Fixtures** | Manual `setUp()` methods in each test class |
| **Factories** | None (no factory_boy) |
| **Mocking** | unittest.mock |
| **Coverage** | `coverage==7.10.6` installed |
| **pytest** | Not configured |
| **Configuration** | No pytest.ini, pyproject.toml, or conftest.py |

### 1.2 Existing Test Coverage by Domain

| Domain | Test Files | Coverage Status |
|--------|-----------|-----------------|
| **payments** | 17 files | Well-covered |
| **users** | 1 file (1050 lines) | Well-covered |
| **bookingflow** | 3 files | Partially covered |
| **workflows** | 2 files | Partially covered |
| **notifications** | 3 files | Partially covered |
| **events** | 1 file | Minimal |
| **notes** | 1 file | Minimal |
| **communications** | 0 files | No tests |
| **contracts** | 0 files | No tests |
| **sales** | 0 files | No tests |
| **products** | 0 files | No tests |
| **questionnaires** | 0 files | No tests |
| **analytics** | 0 files | No tests |
| **settings** | 0 files | No tests |
| **venues** | 0 files | No tests |
| **vendors** | 0 files | No tests |
| **vip** | 0 files | No tests |
| **messaging** | 0 files | No tests |
| **security** | 0 files | No tests |
| **clients** | 0 files | No tests |

### 1.3 Technology Stack to Test

| Layer | Technology | Testing Approach |
|-------|------------|------------------|
| **Models** | Django ORM | Unit tests with factories |
| **Views** | DRF ViewSets/APIViews | APIClient integration tests |
| **Serializers** | DRF Serializers | Unit tests with validation |
| **Services** | Custom service layer | Unit + integration tests |
| **Tasks** | Celery | Eager mode testing |
| **Permissions** | DRF + Custom | Unit tests per permission |
| **Signals** | Django signals | Integration tests |
| **WebSockets** | Channels | Async testing |

### 1.4 Codebase Structure

```
backend/core/
├── domains/           (21 directories) → Domain tests
│   ├── users/         (1107 lines views.py) → Auth tests
│   ├── payments/      (17 test files exist) → Payment tests
│   ├── events/        (complex relationships) → Event tests
│   ├── bookingflow/   (10 step types) → Flow tests
│   ├── workflows/     (automation engine) → Automation tests
│   ├── communications/(email/SMS) → Template tests
│   ├── contracts/     (signatures) → Contract tests
│   ├── sales/         (quotes) → Quote tests
│   ├── notifications/ (push + in-app) → Notification tests
│   ├── products/      (catalog) → Product tests
│   ├── questionnaires/(forms) → Form tests
│   ├── analytics/     (tracking) → Analytics tests
│   ├── settings/      (config) → Settings tests
│   ├── venues/        (venues) → Venue tests
│   ├── vendors/       (providers) → Vendor tests
│   ├── vip/           (loyalty) → VIP tests
│   ├── messaging/     (WebSocket) → Message tests
│   ├── security/      (DPA) → Security tests
│   └── clients/       (invitations) → Client tests
│
├── utils/             (10+ files) → Utility tests
│   ├── security.py    (350 lines) → Security tests
│   ├── permissions.py (189 lines) → Permission tests
│   ├── encryption.py  (360 lines) → Encryption tests
│   └── ...
│
└── settings.py        (674 lines) → Config validation
```

---

## 2. Testing Strategy & Pyramid

### 2.1 Recommended Test Distribution

Based on [Django testing best practices](https://docs.djangoproject.com/en/5.2/topics/testing/) and [DRF testing guidance](https://www.django-rest-framework.org/api-guide/testing/):

| Level | Percentage | Focus Areas |
|-------|------------|-------------|
| **Unit Tests** | 60-70% | Models, Services, Serializers, Utils, Permissions |
| **Integration Tests** | 25-35% | API endpoints, Workflows, Signals, Task chains |
| **E2E Tests** | 5-10% | Critical user journeys (booking, payment, auth) |

### 2.2 Test Type Definitions

**Unit Tests** (Fast, isolated, no external dependencies)
- Model methods and properties
- Service business logic (with mocked dependencies)
- Serializer validation
- Permission classes
- Utility functions

**Integration Tests** (Component interactions, database)
- API endpoint requests/responses
- Signal handlers
- Celery task chains
- Multi-model workflows

**E2E Tests** (Full system)
- Complete booking flow
- Payment processing with webhooks
- Authentication lifecycle

---

## 3. Testing Infrastructure

### 3.1 Required Dependencies

Add to `requirements.txt`:

```txt
# Testing Framework
pytest==8.3.4
pytest-django==4.9.0
pytest-xdist==3.5.0        # Parallel test execution
pytest-cov==6.0.0          # Coverage integration
pytest-randomly==3.16.0    # Randomize test order

# Test Data Management
factory-boy==3.3.1
pytest-factoryboy==2.7.0
Faker==33.1.0              # Realistic fake data

# Time Mocking
freezegun==1.4.0

# Async Testing (for Celery)
pytest-celery==1.0.1

# HTTP Mocking
responses==0.25.6          # Mock external HTTP requests
```

### 3.2 Why This Stack?

| Tool | Purpose | Benefit |
|------|---------|---------|
| **pytest** | Test runner | Less boilerplate, plugins ecosystem, parametrize |
| **pytest-django** | Django integration | Database fixtures, settings override, URL reversing |
| **factory_boy** | Test data factories | DRY test setup, realistic data, relationships |
| **freezegun** | Time mocking | Test expiration, schedules, time-dependent logic |
| **pytest-xdist** | Parallel execution | 4-8x faster test runs |
| **pytest-cov** | Coverage reporting | Integrated coverage metrics |
| **responses** | HTTP mocking | Mock Stripe, Brevo API calls |

### 3.3 Configuration Files

#### pytest.ini

```ini
[pytest]
DJANGO_SETTINGS_MODULE = core.settings
python_files = tests.py test_*.py *_tests.py
python_classes = Test*
python_functions = test_*

# Test discovery
testpaths = core

# Markers
markers =
    slow: marks tests as slow (deselect with '-m "not slow"')
    integration: marks tests as integration tests
    external: marks tests that call external APIs (Stripe, Brevo)
    celery: marks tests that test Celery tasks

# Output
addopts =
    -v
    --tb=short
    --strict-markers
    -ra
    --ignore=venv/

# Database reuse (faster)
# Run: pytest --reuse-db
```

#### pyproject.toml (alternative)

```toml
[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "core.settings"
python_files = ["tests.py", "test_*.py", "*_tests.py"]
testpaths = ["core"]
addopts = "-v --tb=short --strict-markers -ra --ignore=venv/"
markers = [
    "slow: marks tests as slow",
    "integration: marks tests as integration tests",
    "external: marks tests that call external APIs",
    "celery: marks tests that test Celery tasks",
]

[tool.coverage.run]
source = ["core"]
omit = ["*/migrations/*", "*/tests/*", "venv/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
]
```

---

## 4. Test Categories & Patterns

### 4.1 Model Tests (Unit)

**Target**: All models in 21 domains

**Pattern**:
```python
# core/domains/users/tests/test_models.py
import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
class TestUserModel:
    """Unit tests for User model."""

    def test_create_user_with_email(self, user_factory):
        user = user_factory(email='test@example.com')
        assert user.email == 'test@example.com'
        assert user.role == 'CLIENT'

    def test_create_admin_user(self, user_factory):
        user = user_factory(admin=True)
        assert user.role == 'ADMIN'
        assert user.is_staff

    def test_user_string_representation(self, user_factory):
        user = user_factory(email='john@example.com')
        assert str(user) == 'john@example.com'

    def test_create_user_without_email_raises_error(self):
        with pytest.raises(ValueError):
            User.objects.create_user(email='', password='testpass123')
```

### 4.2 Service Tests (Unit/Integration)

**Target**: All service classes in `services.py` files

**Pattern**:
```python
# core/domains/users/tests/test_services.py
import pytest
from unittest.mock import patch

from core.domains.users.services import UserService, AdminInvitationService
from core.domains.users.exceptions import EmailAlreadyExists, InvitationExpired


@pytest.mark.django_db
class TestUserService:
    """Tests for UserService."""

    def test_create_user(self):
        user_data = {
            'email': 'newuser@example.com',
            'password': 'newpass123',
            'first_name': 'New',
            'last_name': 'User',
        }
        user = UserService.create_user(user_data)
        assert user.email == 'newuser@example.com'

    def test_create_user_duplicate_email_raises_error(self, user_factory):
        user_factory(email='existing@example.com')
        with pytest.raises(EmailAlreadyExists):
            UserService.create_user({
                'email': 'existing@example.com',
                'password': 'testpass123'
            })

    def test_get_tokens_for_user(self, user_factory):
        user = user_factory()
        tokens = UserService.get_tokens_for_user(user)
        assert 'access' in tokens
        assert 'refresh' in tokens


@pytest.mark.django_db
class TestAdminInvitationService:
    """Tests for AdminInvitationService."""

    @patch('core.domains.users.services.AdminInvitationService._send_invitation_email')
    def test_create_invitation(self, mock_send_email, user_factory):
        admin = user_factory(admin=True)
        invitation = AdminInvitationService.create_invitation(
            email='invite@example.com',
            first_name='Invited',
            last_name='User',
            invited_by=admin
        )
        assert invitation.email == 'invite@example.com'
        mock_send_email.assert_called_once()

    def test_accept_expired_invitation_raises_error(self, admin_invitation_factory):
        invitation = admin_invitation_factory(expired=True)
        with pytest.raises(InvitationExpired):
            AdminInvitationService.accept_invitation(invitation.id, 'password')
```

### 4.3 API/View Tests (Integration)

**Target**: All views in `views.py` files

**Pattern**:
```python
# core/domains/users/tests/test_views.py
import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestUserLoginAPI:
    """Tests for user login endpoint."""

    def test_login_success(self, api_client, user_factory):
        user_factory(email='test@example.com', password='testpass123')
        url = reverse('users:login')
        response = api_client.post(url, {
            'email': 'test@example.com',
            'password': 'testpass123'
        })
        assert response.status_code == status.HTTP_200_OK
        assert 'tokens' in response.data
        assert 'access' in response.data['tokens']

    def test_login_invalid_credentials(self, api_client, user_factory):
        user_factory(email='test@example.com', password='testpass123')
        url = reverse('users:login')
        response = api_client.post(url, {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        })
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserListAPI:
    """Tests for user list endpoint."""

    def test_list_users_requires_admin(self, client_client):
        url = reverse('users:user_list_create')
        response = client_client.get(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_list_users_as_admin(self, admin_client, user_factory):
        user_factory.create_batch(5)
        url = reverse('users:user_list_create')
        response = admin_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert 'results' in response.data
```

### 4.4 Serializer Tests (Unit)

**Target**: All serializers in `serializers.py` files

**Pattern**:
```python
# core/domains/users/tests/test_serializers.py
import pytest

from core.domains.users.serializers import UserCreateSerializer, UserSerializer


@pytest.mark.django_db
class TestUserCreateSerializer:
    """Tests for UserCreateSerializer."""

    def test_valid_data(self):
        data = {
            'email': 'test@example.com',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
            'first_name': 'Test',
            'last_name': 'User',
        }
        serializer = UserCreateSerializer(data=data)
        assert serializer.is_valid(), serializer.errors

    def test_password_mismatch(self):
        data = {
            'email': 'test@example.com',
            'password': 'StrongPass123!',
            'confirm_password': 'DifferentPass!',
            'first_name': 'Test',
            'last_name': 'User',
        }
        serializer = UserCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'confirm_password' in serializer.errors

    def test_invalid_email(self):
        data = {
            'email': 'not-an-email',
            'password': 'StrongPass123!',
            'confirm_password': 'StrongPass123!',
        }
        serializer = UserCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'email' in serializer.errors
```

### 4.5 Celery Task Tests

**Target**: All tasks in `tasks.py` files

**Pattern**:
```python
# core/domains/payments/tests/test_tasks.py
import pytest
from datetime import date, timedelta
from unittest.mock import patch

from core.domains.payments.tasks import (
    process_autopay_installment,
    send_payment_reminders,
)


@pytest.mark.django_db
@pytest.mark.celery
class TestPaymentTasks:
    """Tests for payment Celery tasks."""

    @patch('stripe.PaymentIntent.create')
    def test_process_autopay_installment(
        self, mock_stripe, payment_installment_factory, stripe_gateway
    ):
        mock_stripe.return_value = type('obj', (object,), {
            'id': 'pi_test_123',
            'status': 'succeeded',
            'amount': 175000
        })()

        installment = payment_installment_factory(
            status='PENDING',
            due_date=date.today()
        )

        result = process_autopay_installment(installment.id)

        assert result['success'] is True
        installment.refresh_from_db()
        assert installment.status == 'PAID'

    def test_send_payment_reminders(
        self, payment_installment_factory, mock_brevo_email
    ):
        payment_installment_factory(
            due_date=date.today() + timedelta(days=3),
            status='PENDING'
        )
        send_payment_reminders()
        mock_brevo_email.assert_called()
```

### 4.6 Time-Dependent Tests

**Target**: Expiration logic, schedules, deadlines

**Pattern**:
```python
# core/domains/contracts/tests/test_expiration.py
import pytest
from datetime import datetime
from freezegun import freeze_time


@pytest.mark.django_db
class TestContractExpiration:
    """Tests for contract expiration logic."""

    @freeze_time('2024-01-15 10:00:00')
    def test_contract_not_expired_before_date(self, contract_factory):
        contract = contract_factory(
            expires_at=datetime(2024, 1, 20, 10, 0, 0)
        )
        assert not contract.is_expired()

    @freeze_time('2024-01-25 10:00:00')
    def test_contract_expired_after_date(self, contract_factory):
        contract = contract_factory(
            expires_at=datetime(2024, 1, 20, 10, 0, 0)
        )
        assert contract.is_expired()
```

### 4.7 Permission Tests (Unit)

**Target**: All custom permissions in `utils/permissions.py`

**Pattern**:
```python
# core/utils/tests/test_permissions.py
import pytest
from rest_framework.test import APIRequestFactory

from core.utils.permissions import IsAdmin, IsOwnerOrAdmin, CanManageAdmins


@pytest.mark.django_db
class TestIsAdmin:
    """Tests for IsAdmin permission."""

    def test_admin_has_permission(self, user_factory):
        admin = user_factory(admin=True)
        request = APIRequestFactory().get('/')
        request.user = admin
        permission = IsAdmin()
        assert permission.has_permission(request, None)

    def test_client_denied(self, user_factory):
        client = user_factory(role='CLIENT')
        request = APIRequestFactory().get('/')
        request.user = client
        permission = IsAdmin()
        assert not permission.has_permission(request, None)


@pytest.mark.django_db
class TestIsOwnerOrAdmin:
    """Tests for IsOwnerOrAdmin permission."""

    def test_owner_has_permission(self, user_factory, event_factory):
        user = user_factory()
        event = event_factory(client=user)
        request = APIRequestFactory().get('/')
        request.user = user
        permission = IsOwnerOrAdmin()
        assert permission.has_object_permission(request, None, event)

    def test_non_owner_denied(self, user_factory, event_factory):
        user1 = user_factory()
        user2 = user_factory()
        event = event_factory(client=user1)
        request = APIRequestFactory().get('/')
        request.user = user2
        permission = IsOwnerOrAdmin()
        assert not permission.has_object_permission(request, None, event)
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

1. **Install dependencies**
   ```bash
   pip install pytest pytest-django pytest-xdist pytest-cov pytest-randomly \
               factory-boy pytest-factoryboy Faker freezegun responses
   ```

2. **Create configuration files**
   - `backend/pytest.ini`
   - `backend/conftest.py`
   - `backend/core/conftest.py`

3. **Create factory base structure**
   - `backend/core/factories/__init__.py`
   - `backend/core/factories/base.py`
   - `backend/core/factories/users.py`
   - `backend/core/factories/events.py`
   - `backend/core/factories/payments.py`

4. **Verify existing tests work**
   ```bash
   pytest core/domains/users/tests.py -v
   pytest core/domains/payments/tests/ -v
   ```

### Phase 2: Core Business Logic (Week 3-4)

5. **Test user domain completely**
   - Models, Services, Views, Serializers
   - Authentication flows
   - Admin permissions

6. **Test payment domain completely**
   - Payment processing
   - Invoice generation
   - Stripe webhooks
   - Payment plans

7. **Test booking flow domain**
   - Step progression
   - Session management
   - Integration with events

### Phase 3: Secondary Domains (Week 5-6)

8. **Add factories for all domains**
   - Communications, Contracts, Sales
   - Products, Questionnaires
   - Workflows, Notifications

9. **Write service tests**
   - Email/SMS sending
   - Contract generation
   - Quote creation

10. **Write API tests**
    - All CRUD endpoints
    - Permission checks
    - Pagination/filtering

### Phase 4: Remaining Domains (Week 7-8)

11. **Complete domain coverage**
    - Analytics, Settings, Venues
    - Vendors, VIP, Messaging
    - Security, Clients

12. **Add integration tests**
    - Cross-domain workflows
    - Signal chains
    - Task orchestration

### Phase 5: Advanced Testing (Week 9-10)

13. **Add performance tests**
    - Query optimization verification
    - Load testing critical endpoints

14. **Add security tests**
    - Authentication edge cases
    - Permission boundary testing
    - Rate limiting verification

15. **CI/CD integration**
    - GitHub Actions workflow
    - Coverage reporting

---

## 6. File Organization

### 6.1 Directory Structure

```
backend/
├── pytest.ini                    # pytest configuration
├── conftest.py                   # Root-level fixtures
├── core/
│   ├── conftest.py              # Core fixtures (factory registration)
│   ├── factories/               # Centralized factories
│   │   ├── __init__.py
│   │   ├── base.py              # Base factory classes
│   │   ├── users.py             # User, Profile, Invitation factories
│   │   ├── events.py            # Event, EventType factories
│   │   ├── payments.py          # Payment, Invoice, Gateway factories
│   │   ├── bookingflow.py       # BookingFlow, Session factories
│   │   ├── products.py          # Product, Category factories
│   │   ├── communications.py    # Template factories
│   │   ├── contracts.py         # Contract factories
│   │   ├── workflows.py         # Workflow, Stage factories
│   │   ├── sales.py             # Quote factories
│   │   └── ...                  # Other domain factories
│   │
│   ├── utils/
│   │   ├── tests/               # Utility tests
│   │   │   ├── __init__.py
│   │   │   ├── test_security.py
│   │   │   ├── test_permissions.py
│   │   │   └── test_encryption.py
│   │   └── ...
│   │
│   └── domains/
│       ├── users/
│       │   ├── tests/
│       │   │   ├── __init__.py
│       │   │   ├── conftest.py         # Domain-specific fixtures
│       │   │   ├── test_models.py
│       │   │   ├── test_services.py
│       │   │   ├── test_views.py
│       │   │   ├── test_serializers.py
│       │   │   └── test_integration.py
│       │   └── tests.py                 # Keep existing (backwards compat)
│       │
│       ├── payments/
│       │   └── tests/                   # Already structured
│       │
│       └── [other domains]/
│           └── tests/
│               ├── __init__.py
│               ├── conftest.py
│               ├── test_models.py
│               ├── test_services.py
│               ├── test_views.py
│               └── test_tasks.py        # If domain has Celery tasks
```

### 6.2 Test Naming Conventions

| Test Type | File Pattern | Example |
|-----------|--------------|---------|
| Model Unit | `test_models.py` | `TestUserModel` |
| Service Unit | `test_services.py` | `TestUserService` |
| View/API | `test_views.py` | `TestUserLoginAPI` |
| Serializer | `test_serializers.py` | `TestUserCreateSerializer` |
| Task | `test_tasks.py` | `TestPaymentTasks` |
| Integration | `test_integration.py` | `TestPaymentWorkflow` |

---

## 7. Code Examples

### 7.1 Root conftest.py

```python
# backend/conftest.py
"""
Root-level pytest configuration and fixtures.
"""

import pytest
from django.conf import settings


@pytest.fixture(scope='session')
def django_db_setup():
    """Configure test database."""
    settings.DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }


@pytest.fixture(autouse=True)
def celery_eager_mode(settings):
    """Force Celery tasks to execute synchronously."""
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear Django cache before each test."""
    from django.core.cache import cache
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    """Return a DRF API client instance."""
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def authenticated_client(api_client, user_factory):
    """Return an authenticated API client."""
    from rest_framework_simplejwt.tokens import RefreshToken

    def _get_client(user=None, role='CLIENT'):
        if user is None:
            user = user_factory(role=role)
        refresh = RefreshToken.for_user(user)
        api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        api_client.user = user
        return api_client

    return _get_client


@pytest.fixture
def admin_client(authenticated_client):
    """Return an authenticated admin API client."""
    return authenticated_client(role='ADMIN')


@pytest.fixture
def client_client(authenticated_client):
    """Return an authenticated client user API client."""
    return authenticated_client(role='CLIENT')


@pytest.fixture
def mock_stripe(mocker):
    """Mock all Stripe API calls."""
    mock = mocker.patch('stripe.PaymentIntent.create')
    mock.return_value = mocker.Mock(
        id='pi_test_123456',
        status='succeeded',
        amount=250000,
        currency='php',
        metadata={}
    )
    return mock


@pytest.fixture
def mock_brevo_email(mocker):
    """Mock Brevo email sending."""
    return mocker.patch(
        'core.domains.communications.services.send_transactional_email',
        return_value={'messageId': 'test-message-id'}
    )


@pytest.fixture
def frozen_time():
    """Fixture for freezing time in tests."""
    from freezegun import freeze_time
    return freeze_time
```

### 7.2 Core conftest.py (Factory Registration)

```python
# backend/core/conftest.py
"""
Core fixtures and factory registrations.
"""

import pytest
from pytest_factoryboy import register

from core.factories.users import (
    UserFactory,
    UserProfileFactory,
    AdminInvitationFactory
)
from core.factories.events import EventFactory, EventTypeFactory
from core.factories.payments import (
    PaymentFactory,
    PaymentGatewayFactory,
    PaymentMethodFactory,
    InvoiceFactory,
    PaymentPlanFactory,
    PaymentInstallmentFactory,
)

# Register factories as fixtures
register(UserFactory)
register(UserProfileFactory)
register(AdminInvitationFactory)
register(EventFactory)
register(EventTypeFactory)
register(PaymentFactory)
register(PaymentGatewayFactory)
register(PaymentMethodFactory)
register(InvoiceFactory)
register(PaymentPlanFactory)
register(PaymentInstallmentFactory)


# Convenience fixtures
@pytest.fixture
def admin_user(user_factory):
    """Create an admin user."""
    return user_factory(role='ADMIN', is_staff=True)


@pytest.fixture
def client_user(user_factory):
    """Create a client user."""
    return user_factory(role='CLIENT')


@pytest.fixture
def stripe_gateway(payment_gateway_factory):
    """Create a configured Stripe gateway."""
    return payment_gateway_factory(
        name='Stripe',
        code='stripe',
        is_active=True,
        config={
            'publishable_key': 'pk_test_123',
            'secret_key': 'sk_test_123',
            'webhook_secret': 'whsec_test_123',
            'test_mode': True,
        }
    )
```

### 7.3 User Factory Example

```python
# backend/core/factories/users.py
"""
Factories for the users domain.
"""

import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from core.domains.users.models import UserProfile, AdminInvitation

User = get_user_model()


class UserFactory(DjangoModelFactory):
    """Factory for creating User instances."""

    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f'user{n}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    role = 'CLIENT'
    is_active = True
    is_staff = False

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """Use create_user to properly hash password."""
        password = kwargs.pop('password', 'testpass123')
        user = model_class.objects.create_user(
            password=password,
            **kwargs
        )
        return user

    class Params:
        admin = factory.Trait(
            role='ADMIN',
            is_staff=True,
            email=factory.Sequence(lambda n: f'admin{n}@example.com')
        )

        superuser = factory.Trait(
            role='ADMIN',
            is_staff=True,
            is_superuser=True,
        )

        inactive = factory.Trait(
            is_active=False
        )


class AdminInvitationFactory(DjangoModelFactory):
    """Factory for creating AdminInvitation instances."""

    class Meta:
        model = AdminInvitation

    email = factory.Sequence(lambda n: f'invite{n}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    invited_by = factory.SubFactory(UserFactory, admin=True)
    is_accepted = False

    @factory.lazy_attribute
    def expires_at(self):
        return timezone.now() + timedelta(days=7)

    class Params:
        expired = factory.Trait(
            expires_at=factory.LazyFunction(
                lambda: timezone.now() - timedelta(days=1)
            )
        )

        accepted = factory.Trait(
            is_accepted=True
        )
```

### 7.4 Payment Factory Example

```python
# backend/core/factories/payments.py
"""
Factories for the payments domain.
"""

import factory
from factory.django import DjangoModelFactory
from decimal import Decimal
from datetime import date, timedelta

from core.domains.payments.models import (
    Payment, PaymentGateway, PaymentMethod,
    Invoice, PaymentPlan, PaymentInstallment
)


class PaymentGatewayFactory(DjangoModelFactory):
    """Factory for PaymentGateway instances."""

    class Meta:
        model = PaymentGateway

    name = factory.Sequence(lambda n: f'Gateway {n}')
    code = factory.Sequence(lambda n: f'gateway_{n}')
    is_active = True
    config = factory.LazyFunction(lambda: {
        'publishable_key': 'pk_test_123',
        'secret_key': 'sk_test_123',
        'test_mode': True
    })

    class Params:
        stripe = factory.Trait(
            name='Stripe',
            code='stripe',
            config={
                'publishable_key': 'pk_test_stripe',
                'secret_key': 'sk_test_stripe',
                'webhook_secret': 'whsec_test',
                'test_mode': True
            }
        )


class PaymentMethodFactory(DjangoModelFactory):
    """Factory for PaymentMethod instances."""

    class Meta:
        model = PaymentMethod

    gateway = factory.SubFactory(PaymentGatewayFactory, stripe=True)
    token = factory.Sequence(lambda n: f'pm_test_{n}')
    card_last_four = '4242'
    card_brand = 'visa'
    is_default = True


class PaymentFactory(DjangoModelFactory):
    """Factory for Payment instances."""

    class Meta:
        model = Payment

    event = factory.SubFactory('core.factories.events.EventFactory')
    payment_method = factory.SubFactory(PaymentMethodFactory)
    amount = Decimal('2500.00')
    currency = 'PHP'
    status = 'PENDING'

    class Params:
        completed = factory.Trait(status='COMPLETED')
        failed = factory.Trait(status='FAILED')


class PaymentInstallmentFactory(DjangoModelFactory):
    """Factory for PaymentInstallment instances."""

    class Meta:
        model = PaymentInstallment

    payment_plan = factory.SubFactory('core.factories.payments.PaymentPlanFactory')
    installment_number = factory.Sequence(lambda n: n + 1)
    amount = Decimal('2333.33')
    due_date = factory.LazyFunction(lambda: date.today() + timedelta(days=30))
    status = 'PENDING'

    class Params:
        overdue = factory.Trait(
            due_date=factory.LazyFunction(lambda: date.today() - timedelta(days=5))
        )
        paid = factory.Trait(status='PAID')
```

---

## 8. Coverage Goals

### 8.1 Coverage Thresholds by Category

| Category | Target | Rationale |
|----------|--------|-----------|
| **Utils (security, validation)** | 95%+ | Critical security code |
| **Services** | 85%+ | Core business logic |
| **Serializers** | 80%+ | Data validation |
| **Views** | 80%+ | API contracts |
| **Models** | 75%+ | Data integrity |
| **Tasks** | 80%+ | Async operations |
| **Overall** | 80%+ | Industry standard |

### 8.2 Critical Coverage Priorities

1. **Authentication flow** - Security-critical
2. **Payment processing** - Financial accuracy
3. **Permission checks** - Access control
4. **Data validation** - Input sanitization
5. **Webhook handlers** - External integrations

---

## 9. CI/CD Integration

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/backend-tests.yml
name: Backend Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
  pull_request:
    branches: [main, develop]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: test_user
          POSTGRES_PASSWORD: test_pass
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run tests with coverage
        env:
          DATABASE_URL: postgres://test_user:test_pass@localhost:5432/test_db
          SECRET_KEY: test-secret-key
        run: |
          cd backend
          pytest --cov=core --cov-report=xml -v

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          files: ./backend/coverage.xml
```

---

## 10. Best Practices & Guidelines

### 10.1 General Testing Principles

1. **Test behavior, not implementation**
2. **One assertion focus per test** (when practical)
3. **Use descriptive test names**: `test_user_cannot_login_with_invalid_password`
4. **AAA Pattern**: Arrange, Act, Assert
5. **Use factories** instead of manual object creation
6. **Mock external services** (Stripe, email, push notifications)

### 10.2 Django-Specific Best Practices

1. **Use `@pytest.mark.django_db`** for database tests
2. **Create fresh data per test** - don't share mutable state
3. **Use `refresh_from_db()`** after mutations
4. **Test signals indirectly** through their effects
5. **Use `override_settings`** for config-dependent tests

### 10.3 DRF-Specific Best Practices

1. **Use `APIClient`** instead of Django's test client
2. **Test authentication** via credentials() method
3. **Verify status codes** using `rest_framework.status`
4. **Test pagination** with multiple records
5. **Test permissions** separately from views

### 10.4 Running Tests

```bash
# Activate virtual environment first
source venv/bin/activate
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=core --cov-report=html

# Run specific domain
pytest core/domains/users/

# Run in parallel (4 workers)
pytest -n 4

# Run excluding slow tests
pytest -m "not slow"

# Run last failed tests
pytest --lf
```

---

## References

### Official Documentation
- [pytest-django Documentation](https://pytest-django.readthedocs.io/)
- [factory_boy Documentation](https://factoryboy.readthedocs.io/)
- [DRF Testing Guide](https://www.django-rest-framework.org/api-guide/testing/)
- [Django Testing Overview](https://docs.djangoproject.com/en/5.2/topics/testing/)

### Articles
- [Simplified Django Tests With Pytest and Pytest FactoryBoy](https://schegel.net/posts/simplied-django-tests-with-pytest-and-pytest-factoryboy/)
- [Comprehensive Step-by-Step Guide to Testing Django REST APIs with Pytest](https://pytest-with-eric.com/pytest-advanced/pytest-django-restapi-testing/)
- [Testing in Django and Django REST - Best Practices](https://www.rootstrap.com/blog/testing-in-django-django-rest-basics-useful-tools-good-practices)
- [Django Tests Cheatsheet 2025](https://medium.com/@jonathan.hoffman91/django-tests-cheatsheet-2025-4fae3d32c3c5)

---

## Appendix: Priority Test Files

### Tier 1 (Critical - Week 1-2)
1. `core/domains/users/` - Authentication, permissions
2. `core/domains/payments/` - Payment processing
3. `core/utils/security.py` - Security utilities
4. `core/utils/permissions.py` - Permission classes

### Tier 2 (High Priority - Week 3-4)
5. `core/domains/bookingflow/` - Booking flow logic
6. `core/domains/events/` - Event management
7. `core/domains/sales/` - Quote generation
8. `core/domains/contracts/` - Contract signing

### Tier 3 (Medium Priority - Week 5-6)
9. `core/domains/communications/` - Email/SMS
10. `core/domains/workflows/` - Automation
11. `core/domains/notifications/` - Push notifications
12. `core/domains/products/` - Product catalog

### Tier 4 (Standard Priority - Week 7-8)
13. `core/domains/questionnaires/`
14. `core/domains/analytics/`
15. `core/domains/settings/`
16. `core/domains/venues/`
17. `core/domains/vendors/`
18. `core/domains/vip/`
19. `core/domains/messaging/`
20. `core/domains/security/`
21. `core/domains/clients/`

---

*Document created: January 2026*
*Based on LifePlace backend codebase analysis*
