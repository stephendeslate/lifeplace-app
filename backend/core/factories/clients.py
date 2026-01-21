"""
Factories for the clients domain.

Based on actual models in core/domains/clients/models.py:
- ClientInvitation (UUID primary key, expiration-based)
"""

import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from datetime import timedelta


class ClientInvitationFactory(DjangoModelFactory):
    """
    Factory for creating ClientInvitation instances.

    ClientInvitation allows admins to invite clients to create accounts.
    Uses UUID primary key and has expiration functionality.
    """

    class Meta:
        model = 'clients.ClientInvitation'

    client = factory.SubFactory('core.factories.users.UserFactory')
    invited_by = factory.SubFactory('core.factories.users.UserFactory', admin=True)
    is_accepted = False

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

        expiring_soon = factory.Trait(
            expires_at=factory.LazyFunction(
                lambda: timezone.now() + timedelta(hours=6)
            )
        )
