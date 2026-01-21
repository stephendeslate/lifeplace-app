# backend/core/domains/settings/signals.py

from django.db.models.signals import post_save, post_migrate
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from django.apps import apps
from .models import CurrencySettings, CompanySettings
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=CompanySettings)
def invalidate_caches_on_company_update(sender, instance, **kwargs):
    """
    Invalidate relevant caches when company settings are updated.
    This ensures template variable schemas reflect the latest company data.
    """
    try:
        from core.domains.communications.cache_service import communications_cache_service
        communications_cache_service.invalidate_variable_schemas_cache()
        logger.info("Invalidated variable schemas cache after CompanySettings update")
    except Exception as e:
        logger.warning(f"Could not invalidate variable schemas cache: {e}")


@receiver(post_save, sender=User)
def create_user_currency_settings(sender, instance, created, **kwargs):
    """
    Create default currency settings for new users
    This ensures every user has currency settings available
    """
    if created:
        try:
            # Check if system settings exist, create if not
            system_settings = CurrencySettings.get_system_settings()
            
            # Create user settings based on system defaults
            # Note: This is optional - users can inherit from system settings without having their own record
            # For now, we'll let users inherit from system settings and only create personal settings when they customize
            logger.info(f"User {instance.id} created. Will inherit system currency settings.")
            
        except Exception as e:
            logger.error(f"Failed to setup currency settings for user {instance.id}: {e}")


@receiver(post_save, sender=CurrencySettings)
def currency_settings_updated(sender, instance, created, **kwargs):
    """
    Log currency settings changes for audit trail
    """
    action = "created" if created else "updated"
    scope = "system-wide" if instance.user is None else f"user {instance.user.id}"
    logger.info(
        f"Currency settings {action} for {scope}: "
        f"default_currency={instance.default_currency}, "
        f"enabled_currencies={instance.enabled_currencies}"
    )


@receiver(post_migrate)
def create_production_default_settings(sender, **kwargs):
    """
    Create default settings for production deployment.
    This ensures all essential configuration is in place when deploying.

    Seeds:
    - CurrencySettings (PHP default with common currencies)
    - PaymentSettings (deposit, grace period, late fees, refund policy)
    - PaymentGateways (Stripe placeholder)
    - ContractTemplate (basic event contract)
    - WorkflowTemplate (default event workflow with stages)
    """
    # Only run for settings app to avoid multiple triggers
    if sender.name != 'core.domains.settings':
        return

    logger.info("=" * 70)
    logger.info("🔧 PRODUCTION DEFAULT SETTINGS SEEDING")
    logger.info("=" * 70)
    logger.info("📍 Signal: post_migrate (triggered by: python manage.py migrate)")
    logger.info("📍 App: core.domains.settings")
    logger.info("")

    # ===== 1. CURRENCY SETTINGS =====
    try:
        if not CurrencySettings.objects.filter(user__isnull=True).exists():
            currency_settings = CurrencySettings.objects.create(
                default_currency='PHP',
                enabled_currencies=['PHP', 'USD', 'EUR', 'SGD', 'HKD'],
                display_format='symbol',
                decimal_places=0,
                thousands_separator=',',
                decimal_separator='.',
                auto_format=True,
                compact_format=False,
                user=None  # System-wide settings
            )
            logger.info(f"✅ Created default CurrencySettings: {currency_settings.default_currency}")
        else:
            logger.info("⏭️  CurrencySettings already exist, skipping")
    except Exception as e:
        logger.error(f"❌ Failed to create CurrencySettings: {e}")

    # ===== 2. PAYMENT SETTINGS =====
    try:
        PaymentSettings = apps.get_model('payments', 'PaymentSettings')

        # Use get_or_create to ensure singleton
        payment_settings, created = PaymentSettings.objects.get_or_create(
            defaults={
                'balance_due_days': 30,
                'grace_period_days': 7,
                'late_fee_enabled': True,
                'default_late_fee_amount': Decimal('25.00'),
                'default_deposit_percentage': Decimal('50.00'),
                'default_currency': 'PHP',
                'auto_payment_retry_attempts': 3,
                'auto_payment_retry_delay_days': 2,
                'allow_refunds': True,
                'refund_deadline_hours': 48,
                'refund_percentage': 100,
                'refund_policy_text': 'Full refund available up to 48 hours before your event. Cancellations within 48 hours are non-refundable.',
            }
        )

        if created:
            logger.info(f"✅ Created default PaymentSettings: deposit {payment_settings.default_deposit_percentage}%, grace period {payment_settings.grace_period_days} days")
        else:
            logger.info("⏭️  PaymentSettings already exist, skipping")
    except Exception as e:
        logger.error(f"❌ Failed to create PaymentSettings: {e}")

    # ===== 3. PAYMENT GATEWAY (STRIPE) =====
    try:
        PaymentGateway = apps.get_model('payments', 'PaymentGateway')

        stripe_gateway, created = PaymentGateway.objects.get_or_create(
            code='stripe',
            defaults={
                'name': 'Stripe',
                'is_active': True,
                'config': {},  # Empty config - needs manual setup with API keys
                'description': 'Stripe payment gateway. Configure with your Stripe API keys in the admin panel.',
            }
        )

        if created:
            logger.info(f"✅ Created default PaymentGateway: {stripe_gateway.name} (requires configuration)")

            # Link Stripe as default gateway in PaymentSettings if it was just created
            if 'payment_settings' in locals():
                payment_settings.primary_payment_gateway = stripe_gateway
                payment_settings.save()
                payment_settings.default_payment_gateways.add(stripe_gateway)
                logger.info("✅ Linked Stripe as primary payment gateway")
        else:
            logger.info("⏭️  Stripe PaymentGateway already exists, skipping")
    except Exception as e:
        logger.error(f"❌ Failed to create PaymentGateway: {e}")

    # ===== 4. CONTRACT TEMPLATE =====
    try:
        ContractTemplate = apps.get_model('contracts', 'ContractTemplate')

        contract_template, created = ContractTemplate.objects.get_or_create(
            name='Standard Event Contract',
            defaults={
                'description': 'Default contract template for event bookings',
                'content': '''
EVENT SERVICE AGREEMENT

This Event Service Agreement ("Agreement") is entered into on {{ contract_date }} between:

CLIENT INFORMATION:
Name: {{ client_name }}
Email: {{ client_email }}
Phone: {{ client_phone }}

EVENT DETAILS:
Event Type: {{ event_type }}
Event Date: {{ event_date }}
Event Time: {{ event_time }}
Venue: {{ venue_name }}
Expected Attendance: {{ guest_count }}

FINANCIAL TERMS:
Total Contract Value: {{ total_amount }}
Deposit Amount ({{ deposit_percentage }}%): {{ deposit_amount }}
Balance Due: {{ balance_amount }}
Payment Due Date: {{ balance_due_date }}

TERMS AND CONDITIONS:

1. PAYMENT TERMS
   - A deposit of {{ deposit_percentage }}% is required to secure your booking
   - The remaining balance is due {{ balance_due_days }} days before the event
   - Late payments may incur a fee of {{ late_fee_amount }}

2. CANCELLATION POLICY
   {{ refund_policy_text }}

3. SERVICES INCLUDED
   {{ services_description }}

4. CLIENT RESPONSIBILITIES
   - Provide accurate guest count at least 7 days before event
   - Coordinate with vendors and service providers
   - Comply with venue rules and regulations

5. FORCE MAJEURE
   Neither party shall be liable for failure to perform due to circumstances beyond reasonable control.

AGREEMENT:
By signing below, both parties agree to the terms and conditions outlined in this Agreement.

Client Signature: _________________________ Date: _________

Company Representative: _________________________ Date: _________
                ''',
                'variables': [
                    'contract_date', 'client_name', 'client_email', 'client_phone',
                    'event_type', 'event_date', 'event_time', 'venue_name', 'guest_count',
                    'total_amount', 'deposit_percentage', 'deposit_amount', 'balance_amount',
                    'balance_due_date', 'balance_due_days', 'late_fee_amount',
                    'refund_policy_text', 'services_description'
                ],
                'requires_signature': True,
                'signature_requirements': ['CLIENT', 'COMPANY_REP'],
                'requires_witness': False,
                'requires_company_signature': True,
                'allows_amendments': True,
                'amendment_requires_signature': True,
                'sections': [
                    {
                        'title': 'Client Information',
                        'order': 1,
                        'required': True
                    },
                    {
                        'title': 'Event Details',
                        'order': 2,
                        'required': True
                    },
                    {
                        'title': 'Financial Terms',
                        'order': 3,
                        'required': True
                    },
                    {
                        'title': 'Terms and Conditions',
                        'order': 4,
                        'required': True
                    },
                    {
                        'title': 'Signatures',
                        'order': 5,
                        'required': True
                    }
                ]
            }
        )

        if created:
            logger.info(f"✅ Created default ContractTemplate: {contract_template.name}")
        else:
            logger.info("⏭️  Default ContractTemplate already exists, skipping")
    except Exception as e:
        logger.error(f"❌ Failed to create ContractTemplate: {e}")

    # ===== 5. WORKFLOW TEMPLATE =====
    try:
        WorkflowTemplate = apps.get_model('workflows', 'WorkflowTemplate')
        WorkflowStage = apps.get_model('workflows', 'WorkflowStage')
        CommunicationTemplate = apps.get_model('communications', 'CommunicationTemplate')

        workflow_template, created = WorkflowTemplate.objects.get_or_create(
            name='Default Event Workflow',
            defaults={
                'description': 'Standard workflow for event management from lead to completion',
                'is_active': True,
            }
        )

        if created:
            logger.info(f"✅ Created default WorkflowTemplate: {workflow_template.name}")
        else:
            logger.info(f"⏭️  Default WorkflowTemplate already exists, checking stages...")

        # Get communication templates for automation
        booking_confirmation_template = CommunicationTemplate.objects.filter(
            name='Booking Confirmation'
        ).first()

        # Define workflow stages - always process to ensure stages exist and are updated
        stages_data = [
            # LEAD STAGE
            {
                'name': 'Initial Inquiry',
                'stage': 'LEAD',
                'order': 1,
                'is_automated': True,
                'automation_type': 'EMAIL',
                'email_template': booking_confirmation_template,
                'trigger_on_event_created': True,
                'metadata': {
                    'description': 'Send initial confirmation when event is created',
                    'delay_hours': 0
                }
            },
            {
                'name': 'Quote Sent',
                'stage': 'LEAD',
                'order': 2,
                'is_automated': True,
                'automation_type': 'TASK',
                'task_description': 'Follow up on quote with client',
                'trigger_on_quote_sent': True,
                'metadata': {
                    'task_priority': 'HIGH',
                    'task_due_date': 'quote_sent_date_plus_3_days'
                }
            },
            {
                'name': 'Quote Accepted',
                'stage': 'LEAD',
                'order': 3,
                'is_automated': True,
                'automation_type': 'CONTRACT',
                'trigger_on_quote_accepted': True,
                'contract_template': contract_template,
                'metadata': {
                    'signature_deadline_hours': 48
                }
            },
            # PRODUCTION STAGE
            {
                'name': 'Contract Signed',
                'stage': 'PRODUCTION',
                'order': 1,
                'is_automated': True,
                'automation_type': 'NOTIFICATION',
                'trigger_on_contract_signed': True,
                'metadata': {
                    'notification_title': 'Contract Signed',
                    'notification_message': 'Client has signed the event contract'
                }
            },
            {
                'name': 'Payment Received',
                'stage': 'PRODUCTION',
                'order': 2,
                'is_automated': True,
                'automation_type': 'TASK',
                'task_description': 'Begin event preparation and vendor coordination',
                'trigger_on_payment_received': True,
                'metadata': {
                    'task_priority': 'MEDIUM',
                    'task_due_date': 'event_start_date'
                }
            },
            {
                'name': 'Event Preparation',
                'stage': 'PRODUCTION',
                'order': 3,
                'is_automated': True,
                'automation_type': 'TASK',
                'task_description': 'Finalize event details, confirm vendors, and prepare timeline',
                'metadata': {
                    'task_priority': 'HIGH',
                    'task_due_date': 'event_start_date_minus_7_days'
                }
            },
            # POST-PRODUCTION STAGE
            {
                'name': 'Event Completed',
                'stage': 'POST_PRODUCTION',
                'order': 1,
                'is_automated': True,
                'automation_type': 'TASK',
                'task_description': 'Follow up with client for feedback and testimonial',
                'metadata': {
                    'task_priority': 'LOW',
                    'task_due_date': 'event_end_date_plus_3_days'
                }
            },
            {
                'name': 'Archive & Review',
                'stage': 'POST_PRODUCTION',
                'order': 2,
                'is_automated': False,
                'metadata': {
                    'description': 'Archive event materials and conduct internal review'
                }
            }
        ]

        stages_created_count = 0
        stages_updated_count = 0

        for stage_data in stages_data:
            stage, stage_created = WorkflowStage.objects.get_or_create(
                template=workflow_template,
                stage=stage_data['stage'],
                order=stage_data['order'],
                defaults={
                    'name': stage_data['name'],
                    'is_automated': stage_data.get('is_automated', False),
                    'automation_type': stage_data.get('automation_type', ''),
                    'task_description': stage_data.get('task_description', ''),
                    'email_template': stage_data.get('email_template'),
                    'contract_template': stage_data.get('contract_template'),
                    'trigger_on_event_created': stage_data.get('trigger_on_event_created', False),
                    'trigger_on_quote_sent': stage_data.get('trigger_on_quote_sent', False),
                    'trigger_on_quote_accepted': stage_data.get('trigger_on_quote_accepted', False),
                    'trigger_on_contract_signed': stage_data.get('trigger_on_contract_signed', False),
                    'trigger_on_payment_received': stage_data.get('trigger_on_payment_received', False),
                    'metadata': stage_data.get('metadata', {})
                }
            )

            if stage_created:
                stages_created_count += 1
                logger.info(f"  ✅ Created workflow stage: {stage.stage} - {stage.name}")
            else:
                # For existing stages, update contract_template if it's specified but not set
                if stage_data.get('contract_template') and not stage.contract_template:
                    stage.contract_template = stage_data['contract_template']
                    stage.save(update_fields=['contract_template'])
                    stages_updated_count += 1
                    logger.info(f"  🔄 Updated workflow stage '{stage.name}' with contract template")

        if stages_created_count > 0:
            logger.info(f"✅ Created {stages_created_count} workflow stages")
        if stages_updated_count > 0:
            logger.info(f"🔄 Updated {stages_updated_count} workflow stages with missing templates")
    except Exception as e:
        logger.error(f"❌ Failed to create WorkflowTemplate: {e}")

    logger.info("")
    logger.info("=" * 70)
    logger.info("🎉 Production default settings initialization complete!")
    logger.info("=" * 70)
    logger.info("")
    logger.info("📋 Next steps:")
    logger.info("  1. Configure Stripe API keys in Django Admin")
    logger.info("  2. Review and customize settings as needed")
    logger.info("")