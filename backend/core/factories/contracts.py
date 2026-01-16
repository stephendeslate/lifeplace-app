"""
Factories for the contracts domain.

Based on actual models in core/domains/contracts/models.py:
- ContractTemplate (legal contract templates)
- EventContract (contracts for events)
- ContractSignature (multi-party signatures)
- ContractAmendment (track contract changes)
- ContractDocument (attached documents)
- ContractNote (internal notes)
"""

import factory
from factory.django import DjangoModelFactory
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal


class ContractTemplateFactory(DjangoModelFactory):
    """
    Factory for creating ContractTemplate instances.

    ContractTemplate stores legal contract templates.
    """

    class Meta:
        model = 'contracts.ContractTemplate'

    name = factory.Sequence(lambda n: f'Contract Template {n}')
    description = factory.Faker('sentence')
    event_type = factory.SubFactory('core.factories.events.EventTypeFactory')
    content = factory.Faker('paragraphs', nb=5, ext_word_list=None)
    variables = factory.LazyFunction(list)
    requires_signature = True
    sections = factory.LazyFunction(list)
    signature_requirements = factory.LazyFunction(lambda: ['CLIENT'])
    requires_witness = False
    requires_company_signature = True
    allows_amendments = True
    amendment_requires_signature = True

    class Params:
        """Traits for template configurations."""

        with_witness = factory.Trait(
            requires_witness=True,
            signature_requirements=['CLIENT', 'WITNESS', 'COMPANY_REP']
        )

        no_amendments = factory.Trait(
            allows_amendments=False
        )

        no_signature_required = factory.Trait(
            requires_signature=False
        )


class EventContractFactory(DjangoModelFactory):
    """
    Factory for creating EventContract instances.

    EventContract is the actual contract associated with an event.
    Status: DRAFT -> SENT -> PARTIALLY_SIGNED -> SIGNED -> EXPIRED/VOID/AMENDED
    """

    class Meta:
        model = 'contracts.EventContract'

    event = factory.SubFactory('core.factories.events.EventFactory')
    template = factory.SubFactory(ContractTemplateFactory)
    status = 'DRAFT'
    content = factory.Faker('paragraphs', nb=5, ext_word_list=None)
    sent_at = None
    fully_signed_at = None
    valid_until = None
    contract_value = Decimal('50000.00')
    payment_schedule_reference = ''
    currency = 'PHP'
    is_amendment = False
    original_contract = None
    amendment_number = 0

    class Params:
        """Traits for contract states."""

        draft = factory.Trait(
            status='DRAFT'
        )

        sent = factory.Trait(
            status='SENT',
            sent_at=factory.LazyFunction(timezone.now),
            valid_until=factory.LazyFunction(
                lambda: (timezone.now() + timedelta(days=7)).date()
            )
        )

        partially_signed = factory.Trait(
            status='PARTIALLY_SIGNED',
            sent_at=factory.LazyFunction(
                lambda: timezone.now() - timedelta(days=2)
            ),
            valid_until=factory.LazyFunction(
                lambda: (timezone.now() + timedelta(days=5)).date()
            )
        )

        signed = factory.Trait(
            status='SIGNED',
            sent_at=factory.LazyFunction(
                lambda: timezone.now() - timedelta(days=3)
            ),
            fully_signed_at=factory.LazyFunction(timezone.now),
            valid_until=factory.LazyFunction(
                lambda: (timezone.now() + timedelta(days=30)).date()
            )
        )

        expired = factory.Trait(
            status='EXPIRED',
            sent_at=factory.LazyFunction(
                lambda: timezone.now() - timedelta(days=14)
            ),
            valid_until=factory.LazyFunction(
                lambda: (timezone.now() - timedelta(days=7)).date()
            )
        )

        void = factory.Trait(
            status='VOID'
        )

        amendment = factory.Trait(
            is_amendment=True,
            amendment_number=1,
            status='DRAFT'
        )


class ContractSignatureFactory(DjangoModelFactory):
    """
    Factory for creating ContractSignature instances.

    Multi-party signatures for contracts.
    """

    class Meta:
        model = 'contracts.ContractSignature'

    contract = factory.SubFactory(EventContractFactory, sent=True)
    signer = factory.SubFactory('core.factories.users.UserFactory')
    role = 'CLIENT'
    signature_data = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA'
    ip_address = factory.Faker('ipv4')
    user_agent = factory.Faker('user_agent')
    signer_name = factory.Faker('name')
    signer_title = ''
    signer_email = factory.Faker('email')
    is_verified = False
    verification_method = ''
    device_fingerprint = ''
    signature_metadata = factory.LazyFunction(dict)
    signature_confidence_score = None
    legal_disclosure_accepted = False
    electronic_consent_timestamp = None
    signature_intent_confirmed = False

    class Params:
        """Traits for signature roles and states."""

        client = factory.Trait(
            role='CLIENT'
        )

        witness = factory.Trait(
            role='WITNESS'
        )

        company_rep = factory.Trait(
            role='COMPANY_REP',
            signer_title='Event Manager'
        )

        verified = factory.Trait(
            is_verified=True,
            verification_method='email_confirmation',
            legal_disclosure_accepted=True,
            electronic_consent_timestamp=factory.LazyFunction(timezone.now),
            signature_intent_confirmed=True,
            signature_confidence_score=Decimal('0.9500')
        )


class ContractAmendmentFactory(DjangoModelFactory):
    """
    Factory for creating ContractAmendment instances.

    Tracks contract changes after signing.
    """

    class Meta:
        model = 'contracts.ContractAmendment'

    original_contract = factory.SubFactory(EventContractFactory, signed=True)
    amendment_contract = None
    amendment_reason = factory.Faker('sentence')
    changes_description = factory.Faker('paragraph')
    section_changes = factory.LazyFunction(dict)
    status = 'REQUESTED'
    original_value = Decimal('50000.00')
    new_value = Decimal('55000.00')
    value_change = Decimal('5000.00')
    requested_by = factory.SubFactory('core.factories.users.UserFactory', admin=True)
    reviewed_by = None
    reviewed_at = None
    review_notes = ''
    requires_new_signatures = True
    signature_deadline = None

    class Params:
        """Traits for amendment states."""

        requested = factory.Trait(
            status='REQUESTED'
        )

        draft = factory.Trait(
            status='DRAFT'
        )

        approved = factory.Trait(
            status='APPROVED',
            reviewed_by=factory.SubFactory('core.factories.users.UserFactory', admin=True),
            reviewed_at=factory.LazyFunction(timezone.now),
            review_notes='Approved for client signature'
        )

        signed = factory.Trait(
            status='SIGNED',
            reviewed_by=factory.SubFactory('core.factories.users.UserFactory', admin=True),
            reviewed_at=factory.LazyFunction(
                lambda: timezone.now() - timedelta(days=1)
            )
        )

        rejected = factory.Trait(
            status='REJECTED',
            reviewed_by=factory.SubFactory('core.factories.users.UserFactory', admin=True),
            reviewed_at=factory.LazyFunction(timezone.now),
            review_notes='Amendment rejected'
        )


class ContractDocumentFactory(DjangoModelFactory):
    """
    Factory for creating ContractDocument instances.

    Additional documents attached to contracts.
    """

    class Meta:
        model = 'contracts.ContractDocument'

    contract = factory.SubFactory(EventContractFactory)
    name = factory.Sequence(lambda n: f'Document {n}')
    description = factory.Faker('sentence')
    document_type = 'ATTACHMENT'
    file = factory.django.FileField(filename='document.pdf')
    version = 1
    is_active = True
    uploaded_by = factory.SubFactory('core.factories.users.UserFactory', admin=True)

    class Params:
        """Traits for document types."""

        attachment = factory.Trait(
            document_type='ATTACHMENT'
        )

        addendum = factory.Trait(
            document_type='ADDENDUM'
        )

        schedule = factory.Trait(
            document_type='SCHEDULE'
        )

        terms = factory.Trait(
            document_type='TERMS'
        )

        waiver = factory.Trait(
            document_type='WAIVER'
        )

        inactive = factory.Trait(
            is_active=False
        )


class ContractNoteFactory(DjangoModelFactory):
    """
    Factory for creating ContractNote instances.

    Internal notes about contracts.
    """

    class Meta:
        model = 'contracts.ContractNote'

    contract = factory.SubFactory(EventContractFactory)
    note = factory.Faker('paragraph')
    is_internal = True
    created_by = factory.SubFactory('core.factories.users.UserFactory', admin=True)
    category = 'GENERAL'

    class Params:
        """Traits for note categories."""

        general = factory.Trait(
            category='GENERAL'
        )

        legal = factory.Trait(
            category='LEGAL'
        )

        negotiation = factory.Trait(
            category='NEGOTIATION'
        )

        amendment = factory.Trait(
            category='AMENDMENT'
        )

        issue = factory.Trait(
            category='ISSUE'
        )

        reminder = factory.Trait(
            category='REMINDER'
        )

        client_visible = factory.Trait(
            is_internal=False
        )
