"""
Factories for the messaging domain.

Based on actual models in core/domains/messaging/models.py:
- MessageThread (client-admin communication thread)
- Message (individual message within a thread)
- MessageReadStatus (tracks read receipts)
- MessageAttachment (file attachments for messages)
"""

import factory
from factory.django import DjangoModelFactory
from django.utils import timezone


class MessageThreadFactory(DjangoModelFactory):
    """
    Factory for creating MessageThread instances.

    MessageThread is the container for client-admin communication.
    """

    class Meta:
        model = 'messaging.MessageThread'

    client = factory.SubFactory('core.factories.users.UserFactory', role='CLIENT')
    subject = factory.Faker('sentence', nb_words=4)
    priority = 'normal'
    status = 'active'

    class Params:
        """Traits for common thread configurations."""

        urgent = factory.Trait(
            priority='urgent'
        )

        high_priority = factory.Trait(
            priority='high'
        )

        low_priority = factory.Trait(
            priority='low'
        )

        resolved = factory.Trait(
            status='resolved'
        )

        archived = factory.Trait(
            status='archived'
        )

        waiting = factory.Trait(
            status='waiting'
        )

        with_event = factory.Trait(
            event=factory.SubFactory('core.factories.events.EventFactory')
        )

        with_admin = factory.Trait(
            assigned_admin=factory.SubFactory(
                'core.factories.users.UserFactory',
                admin=True
            )
        )


class MessageFactory(DjangoModelFactory):
    """
    Factory for creating Message instances.

    Message is an individual message within a thread.
    """

    class Meta:
        model = 'messaging.Message'

    thread = factory.SubFactory(MessageThreadFactory)
    sender = factory.SubFactory('core.factories.users.UserFactory')
    content = factory.Faker('paragraph')
    message_type = 'text'
    is_internal_note = False

    class Params:
        """Traits for common message configurations."""

        internal_note = factory.Trait(
            is_internal_note=True,
            sender=factory.SubFactory(
                'core.factories.users.UserFactory',
                admin=True
            )
        )

        system_message = factory.Trait(
            message_type='system',
            content='This is a system notification'
        )

        file_message = factory.Trait(
            message_type='file'
        )

        event_update = factory.Trait(
            message_type='event_update',
            content='Your event details have been updated'
        )

        edited = factory.Trait(
            edited_at=factory.LazyFunction(timezone.now)
        )


class MessageReadStatusFactory(DjangoModelFactory):
    """
    Factory for creating MessageReadStatus instances.

    Tracks which users have read which messages.
    """

    class Meta:
        model = 'messaging.MessageReadStatus'

    message = factory.SubFactory(MessageFactory)
    user = factory.SubFactory('core.factories.users.UserFactory')
    read_at = factory.LazyFunction(timezone.now)


class MessageAttachmentFactory(DjangoModelFactory):
    """
    Factory for creating MessageAttachment instances.

    File attachments for messages.
    """

    class Meta:
        model = 'messaging.MessageAttachment'

    message = factory.SubFactory(MessageFactory)
    filename = factory.Faker('file_name')
    file_size = factory.Faker('random_int', min=1024, max=5242880)  # 1KB to 5MB
    file_type = 'application/pdf'

    class Params:
        """Traits for common attachment types."""

        image = factory.Trait(
            filename=factory.Faker('file_name', extension='jpg'),
            file_type='image/jpeg'
        )

        pdf = factory.Trait(
            filename=factory.Faker('file_name', extension='pdf'),
            file_type='application/pdf'
        )

        document = factory.Trait(
            filename=factory.Faker('file_name', extension='docx'),
            file_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
