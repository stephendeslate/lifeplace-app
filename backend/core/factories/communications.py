"""
Factories for the communications domain.

Based on actual models in core/domains/communications/models.py:
- CommunicationTemplate (email/SMS templates)
- CommunicationTemplateHistory (version history)
- CommunicationRecord (sent communications)
"""

from django.utils import timezone

import factory
from factory.django import DjangoModelFactory


class CommunicationTemplateFactory(DjangoModelFactory):
    """
    Factory for creating CommunicationTemplate instances.

    CommunicationTemplate stores email and SMS templates.
    """

    class Meta:
        model = "communications.CommunicationTemplate"
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: f"template_{n}")
    channel = "EMAIL"
    category = "MANUAL"
    context_type = "MANUAL"
    include_client_context = False
    include_event_context = False
    subject_template = factory.Sequence(lambda n: f"Subject {n}")
    body_template = factory.Faker("paragraph")
    is_system = False

    class Params:
        """Traits for template types."""

        email = factory.Trait(channel="EMAIL", subject_template="Email Subject")

        sms = factory.Trait(channel="SMS", subject_template=None)

        system = factory.Trait(category="SYSTEM", is_system=True)

        auto = factory.Trait(category="AUTO")

        marketing = factory.Trait(category="MARKETING")

        event_context = factory.Trait(context_type="EVENT", include_client_context=True, include_event_context=True)

        quote_context = factory.Trait(context_type="QUOTE", include_client_context=True, include_event_context=True)

        contract_context = factory.Trait(
            context_type="CONTRACT", include_client_context=True, include_event_context=True
        )


class CommunicationTemplateHistoryFactory(DjangoModelFactory):
    """
    Factory for creating CommunicationTemplateHistory instances.

    Audit trail for communication template changes.
    """

    class Meta:
        model = "communications.CommunicationTemplateHistory"

    template = factory.SubFactory(CommunicationTemplateFactory)
    version = factory.Sequence(lambda n: n + 1)
    name = factory.SelfAttribute("template.name")
    channel = factory.SelfAttribute("template.channel")
    category = factory.SelfAttribute("template.category")
    context_type = factory.SelfAttribute("template.context_type")
    include_client_context = factory.SelfAttribute("template.include_client_context")
    include_event_context = factory.SelfAttribute("template.include_event_context")
    subject_template = factory.SelfAttribute("template.subject_template")
    body_template = factory.SelfAttribute("template.body_template")
    reason = "UPDATE"
    notes = ""
    changed_by = factory.SubFactory("core.factories.users.UserFactory", admin=True)

    class Params:
        """Traits for history reasons."""

        create = factory.Trait(reason="CREATE")

        update = factory.Trait(reason="UPDATE")

        rollback = factory.Trait(reason="ROLLBACK")

        system_update = factory.Trait(reason="SYSTEM")


class CommunicationRecordFactory(DjangoModelFactory):
    """
    Factory for creating CommunicationRecord instances.

    Records of communications sent through the system.
    """

    class Meta:
        model = "communications.CommunicationRecord"

    template_name = factory.Sequence(lambda n: f"template_{n}")
    channel = "EMAIL"
    category = "MANUAL"
    recipient = factory.Faker("email")
    subject = factory.Faker("sentence")
    body = factory.Faker("paragraph")
    client = factory.SubFactory("core.factories.users.UserFactory")
    sent_by = factory.SubFactory("core.factories.users.UserFactory", admin=True)
    event = None
    external_message_id = ""
    delivery_status = "PENDING"
    sent_at = None
    delivered_at = None
    opened_at = None
    is_opened = False
    context_data = factory.LazyFunction(dict)
    is_deleted = False
    deleted_at = None
    deleted_by = None

    class Params:
        """Traits for delivery states."""

        pending = factory.Trait(delivery_status="PENDING")

        sent = factory.Trait(delivery_status="SENT", sent_at=factory.LazyFunction(timezone.now))

        delivered = factory.Trait(
            delivery_status="DELIVERED",
            sent_at=factory.LazyFunction(lambda: timezone.now() - timezone.timedelta(minutes=5)),
            delivered_at=factory.LazyFunction(timezone.now),
        )

        failed = factory.Trait(delivery_status="FAILED")

        bounced = factory.Trait(delivery_status="BOUNCED")

        opened = factory.Trait(
            delivery_status="DELIVERED",
            sent_at=factory.LazyFunction(lambda: timezone.now() - timezone.timedelta(hours=1)),
            delivered_at=factory.LazyFunction(lambda: timezone.now() - timezone.timedelta(minutes=55)),
            opened_at=factory.LazyFunction(timezone.now),
            is_opened=True,
        )

        sms = factory.Trait(channel="SMS", subject=None)

        deleted = factory.Trait(is_deleted=True, deleted_at=factory.LazyFunction(timezone.now))
