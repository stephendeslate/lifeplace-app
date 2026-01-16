"""
Factories for the users domain.

Based on actual models in core/domains/users/models.py:
- User (custom AbstractUser with email-based auth)
- UserProfile (OneToOne with User)
- AdminInvitation (UUID primary key, 7-day expiration)
"""

import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class UserFactory(DjangoModelFactory):
    """
    Factory for creating User instances.

    The User model uses email-based authentication (no username).
    Roles: CLIENT (default), ADMIN
    """

    class Meta:
        model = User
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f'user{n}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    role = 'CLIENT'
    is_active = True
    is_staff = False
    admin_permissions = factory.LazyFunction(dict)

    @classmethod
    def _create(cls, model_class, *args, **kwargs):
        """
        Use create_user manager method to properly hash password.
        This matches how the actual User model creates users.
        """
        password = kwargs.pop('password', 'testpass123')
        user = model_class.objects.create_user(
            password=password,
            **kwargs
        )
        return user

    class Params:
        """Traits for common user configurations."""

        admin = factory.Trait(
            role='ADMIN',
            is_staff=True,
            email=factory.Sequence(lambda n: f'admin{n}@example.com')
        )

        superuser = factory.Trait(
            role='ADMIN',
            is_staff=True,
            is_superuser=True,
            email=factory.Sequence(lambda n: f'superuser{n}@example.com')
        )

        inactive = factory.Trait(
            is_active=False
        )

        with_full_permissions = factory.Trait(
            role='ADMIN',
            is_staff=True,
            admin_permissions={
                'can_manage_company_settings': True,
                'can_manage_admins': True,
                'can_manage_financial_settings': True,
                'can_manage_payment_gateways': True,
                'can_manage_workflows': True,
                'can_manage_booking_flows': True,
                'can_manage_templates': True,
                'can_export_data': True,
                'can_delete_records': True,
            }
        )


class UserProfileFactory(DjangoModelFactory):
    """
    Factory for creating UserProfile instances.

    Note: UserProfile is auto-created via signal when User is created,
    so this factory is mainly for updating profile fields in tests.
    """

    class Meta:
        model = 'users.UserProfile'
        django_get_or_create = ('user',)

    user = factory.SubFactory(UserFactory)
    phone = factory.Faker('phone_number')
    company = factory.Faker('company')
    display_timezone = 'Asia/Manila'
    timezone_display_mode = 'business_only'


class AdminInvitationFactory(DjangoModelFactory):
    """
    Factory for creating AdminInvitation instances.

    Note: AdminInvitation uses UUID primary key and has 7-day expiration.
    """

    class Meta:
        model = 'users.AdminInvitation'

    email = factory.Sequence(lambda n: f'invite{n}@example.com')
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    invited_by = factory.SubFactory(UserFactory, admin=True)
    is_accepted = False
    is_upgrade = False
    permissions = factory.LazyFunction(dict)

    @factory.lazy_attribute
    def expires_at(self):
        """Default expiration is 7 days from now."""
        return timezone.now() + timedelta(days=7)

    class Params:
        """Traits for invitation states."""

        expired = factory.Trait(
            expires_at=factory.LazyFunction(
                lambda: timezone.now() - timedelta(days=1)
            )
        )

        accepted = factory.Trait(
            is_accepted=True
        )

        upgrade = factory.Trait(
            is_upgrade=True,
            user=factory.SubFactory(UserFactory, role='CLIENT')
        )

        with_permissions = factory.Trait(
            permissions={
                'can_manage_company_settings': True,
                'can_manage_workflows': True,
                'can_manage_templates': True,
            }
        )


class PasswordResetTokenFactory(DjangoModelFactory):
    """
    Factory for creating PasswordResetToken instances.

    Note: Token uses UUID primary key and 1-hour expiration by default.
    """

    class Meta:
        model = 'users.PasswordResetToken'

    user = factory.SubFactory(UserFactory)
    is_used = False

    @factory.lazy_attribute
    def expires_at(self):
        """Default expiration is 1 hour from now."""
        return timezone.now() + timedelta(hours=1)

    class Params:
        """Traits for token states."""

        expired = factory.Trait(
            expires_at=factory.LazyFunction(
                lambda: timezone.now() - timedelta(hours=1)
            )
        )

        used = factory.Trait(
            is_used=True
        )


class ConsentRecordFactory(DjangoModelFactory):
    """
    Factory for creating ConsentRecord instances for DPA compliance testing.
    """

    class Meta:
        model = 'users.ConsentRecord'

    user = factory.SubFactory(UserFactory)
    consent_type = 'MARKETING_EMAIL'
    action = 'GRANT'
    consent_text = 'I agree to receive marketing emails'
    source = 'SETTINGS'

    class Params:
        """Traits for consent states."""

        withdrawn = factory.Trait(
            action='WITHDRAW'
        )

        marketing_sms = factory.Trait(
            consent_type='MARKETING_SMS',
            consent_text='I agree to receive marketing SMS'
        )

        analytics = factory.Trait(
            consent_type='ANALYTICS',
            consent_text='I agree to usage analytics'
        )


class PrivacyRequestFactory(DjangoModelFactory):
    """
    Factory for creating PrivacyRequest instances for DPA compliance testing.
    """

    class Meta:
        model = 'users.PrivacyRequest'

    user = factory.SubFactory(UserFactory)
    request_type = 'ACCESS'
    status = 'PENDING'
    request_data = factory.LazyFunction(dict)
    response_data = factory.LazyFunction(dict)

    @factory.lazy_attribute
    def user_email(self):
        return self.user.email

    class Params:
        """Traits for request states."""

        completed = factory.Trait(
            status='COMPLETED',
            processed_at=factory.LazyFunction(timezone.now)
        )

        deletion = factory.Trait(
            request_type='DELETION'
        )

        export = factory.Trait(
            request_type='EXPORT'
        )

        correction = factory.Trait(
            request_type='CORRECTION'
        )
