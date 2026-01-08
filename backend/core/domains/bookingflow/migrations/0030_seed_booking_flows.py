# backend/core/domains/bookingflow/migrations/0030_seed_booking_flows.py
"""
Data migration to create booking flows for all event types.

This migration:
1. Creates "Life Events" event type
2. Creates booking flows for: Wedding, Camps & Retreats, Team Building, Workshops, Life Events
3. Creates appropriate steps for each flow
4. Configures payment terms according to T&C documents

Payment Terms Summary (from T&C documents):

CAMPS & RETREATS:
- Reservation fee: PHP 5,000 (non-refundable, non-deductible)
- Full payment on signing: Waives reservation fee
- 30% of TCP due 14 days before event
- 70% of TCP due 1 day before event
- Security deposit: PHP 2,000 (refundable upon checkout)
- 12% VAT + 10% service charge (NOT tax inclusive)
- Cancellation: <30 days = 20% liquidated damage
- Rescheduling: 10% fee, must be 3+ months before event
- Child pricing: 0-2 free, 3-7 at 50%, 8+ full price

LIFE EVENTS:
- Reservation fee upon signing (non-refundable, non-deductible)
- 30% downpayment within 7 days to block date
- 70% balance due 1 day before event
- Late payment: 5% penalty
- Security deposit: PHP 2,500 (refundable upon checkout)
- 12% VAT + 10% service charge
- Cancellation: <30 days = 20% liquidated damage
- Client cancellation: 50% admin fee (excl. PHP 5,000 reservation)
- Rescheduling: 10% fee, must be 3+ months before event
"""
from django.db import migrations
from decimal import Decimal


def create_booking_flows(apps, schema_editor):
    """Create booking flows for all event types."""
    # Get models
    EventType = apps.get_model('events', 'EventType')
    BookingFlow = apps.get_model('bookingflow', 'BookingFlow')
    BookingFlowStep = apps.get_model('bookingflow', 'BookingFlowStep')
    IntroductionStepConfiguration = apps.get_model('bookingflow', 'IntroductionStepConfiguration')
    DateTimeStepConfiguration = apps.get_model('bookingflow', 'DateTimeStepConfiguration')
    PackageSelectionStepConfiguration = apps.get_model('bookingflow', 'PackageSelectionStepConfiguration')
    AddonSelectionStepConfiguration = apps.get_model('bookingflow', 'AddonSelectionStepConfiguration')
    PricingSummaryStepConfiguration = apps.get_model('bookingflow', 'PricingSummaryStepConfiguration')
    ContactInfoStepConfiguration = apps.get_model('bookingflow', 'ContactInfoStepConfiguration')
    PaymentInfoStepConfiguration = apps.get_model('bookingflow', 'PaymentInfoStepConfiguration')
    PaymentTermsConfiguration = apps.get_model('bookingflow', 'PaymentTermsConfiguration')
    ConfirmationStepConfiguration = apps.get_model('bookingflow', 'ConfirmationStepConfiguration')
    ProductCategory = apps.get_model('products', 'ProductCategory')

    # =====================================================
    # CREATE LIFE EVENTS EVENT TYPE
    # =====================================================
    life_events_type, _ = EventType.objects.get_or_create(
        name='Life Events',
        defaults={
            'description': 'Birthdays, anniversaries, corporate events, and other celebrations',
            'is_active': True
        }
    )

    # Get existing event types
    wedding_type = EventType.objects.filter(name='Wedding').first()
    camps_type = EventType.objects.filter(name='Camps & Retreats').first()
    team_building_type = EventType.objects.filter(name='Team Building').first()
    workshops_type = EventType.objects.filter(name='Workshops').first()

    # Get product categories
    wedding_packages_cat = ProductCategory.objects.filter(slug='wedding-packages').first()
    wedding_addons_cat = ProductCategory.objects.filter(slug='wedding-addons').first()
    camps_cat = ProductCategory.objects.filter(slug='camps-retreats').first()
    camps_addons_cat = ProductCategory.objects.filter(slug='event-addons').first()
    team_building_cat = ProductCategory.objects.filter(slug='team-building').first()
    allin_wedding_cat = ProductCategory.objects.filter(slug='all-in-weddings').first()

    # =====================================================
    # HELPER FUNCTION: CREATE STEPS FOR A FLOW
    # =====================================================
    def create_flow_steps(flow, step_configs):
        """Create steps and their configurations for a booking flow."""
        for order, step_config in enumerate(step_configs, start=1):
            step_type = step_config['type']
            step = BookingFlowStep.objects.create(
                booking_flow=flow,
                step_type=step_type,
                order=order,
                is_enabled=step_config.get('is_enabled', True),
                is_required=step_config.get('is_required', True),
                is_skippable=step_config.get('is_skippable', False),
                description=step_config.get('description', ''),
                configuration=step_config.get('configuration', {}),
            )

            # Create step-specific configuration
            config_data = step_config.get('config_data', {})

            if step_type == 'introduction':
                IntroductionStepConfiguration.objects.create(
                    step=step,
                    title=config_data.get('title', f"Welcome to {flow.name}"),
                    content=config_data.get('content', "We're excited to help you plan your event!"),
                    show_event_details=config_data.get('show_event_details', True),
                    show_pricing_overview=config_data.get('show_pricing_overview', False),
                )

            elif step_type == 'date_time':
                DateTimeStepConfiguration.objects.create(
                    step=step,
                    allow_multi_day=config_data.get('allow_multi_day', False),
                    min_event_days=config_data.get('min_event_days', 1),
                    max_event_days=config_data.get('max_event_days', 7),
                    show_calendar_view=config_data.get('show_calendar_view', True),
                    enable_real_time_availability=config_data.get('enable_real_time_availability', True),
                    show_availability_status=config_data.get('show_availability_status', True),
                    auto_check_conflicts=config_data.get('auto_check_conflicts', True),
                    check_venue_availability=config_data.get('check_venue_availability', True),
                    check_resource_availability=True,
                    check_staff_availability=True,
                    availability_display_mode=config_data.get('availability_display_mode', 'FULL'),
                    allow_overbooking=False,
                    overbooking_threshold=0,
                )

            elif step_type == 'package_selection':
                pkg_config = PackageSelectionStepConfiguration.objects.create(
                    step=step,
                    selection_type=config_data.get('selection_type', 'SINGLE'),
                    min_selection=config_data.get('min_selection', 1),
                    max_selection=config_data.get('max_selection', 1),
                    show_pricing=config_data.get('show_pricing', True),
                    show_descriptions=config_data.get('show_descriptions', True),
                    show_images=config_data.get('show_images', True),
                    enable_comparison=config_data.get('enable_comparison', True),
                    enable_dynamic_pricing=config_data.get('enable_dynamic_pricing', False),
                )
                # Set available categories if specified
                category_ids = config_data.get('available_categories', [])
                if category_ids:
                    pkg_config.available_categories.set(category_ids)

            elif step_type == 'addon_selection':
                addon_config = AddonSelectionStepConfiguration.objects.create(
                    step=step,
                    min_selection=config_data.get('min_selection', 0),
                    max_selection=config_data.get('max_selection', 0),  # 0 = unlimited
                    group_by_category=config_data.get('group_by_category', True),
                    show_recommendations=config_data.get('show_recommendations', True),
                )
                # Set available categories if specified
                category_ids = config_data.get('available_categories', [])
                if category_ids:
                    addon_config.available_categories.set(category_ids)

            elif step_type == 'pricing_summary':
                PricingSummaryStepConfiguration.objects.create(
                    step=step,
                    show_package_breakdown=True,
                    show_addon_breakdown=True,
                    show_tax_breakdown=config_data.get('show_tax_breakdown', True),
                    show_discount_field=config_data.get('show_discount_field', True),
                    show_subtotal=True,
                    allow_discount_codes=config_data.get('allow_discount_codes', True),
                    calculate_tax=config_data.get('calculate_tax', True),
                    header_text=config_data.get('header_text', "Review Your Booking"),
                    footer_text=config_data.get('footer_text', ''),
                    show_terms_checkbox=True,
                    show_marketing_consent=True,
                    require_terms_acceptance=True,
                    terms_text=config_data.get('terms_text', ''),
                )

            elif step_type == 'contact_info':
                ContactInfoStepConfiguration.objects.create(
                    step=step,
                    require_full_name=True,
                    require_email=True,
                    require_phone=True,
                    require_address=config_data.get('require_address', False),
                    require_company=config_data.get('require_company', False),
                    offer_account_creation=True,
                    require_account_creation=False,
                )

            elif step_type == 'payment_info':
                payment_config = PaymentInfoStepConfiguration.objects.create(
                    step=step,
                    accept_full_payment=config_data.get('accept_full_payment', True),
                    accept_deposit=config_data.get('accept_deposit', True),
                    allow_payment_plans=config_data.get('allow_payment_plans', False),
                    allow_quote_request=config_data.get('allow_quote_request', True),
                    require_immediate_payment=config_data.get('require_immediate_payment', False),
                    payment_terms=config_data.get('payment_terms', ''),
                    quote_request_button_text=config_data.get('quote_request_button_text', 'Request Quote'),
                    quote_request_description=config_data.get('quote_request_description', ''),
                )

                # Create PaymentTermsConfiguration if payment terms data provided
                payment_terms_data = config_data.get('payment_terms_config', {})
                if payment_terms_data:
                    PaymentTermsConfiguration.objects.create(
                        step=step,
                        deposit_type=payment_terms_data.get('deposit_type'),
                        deposit_percentage=payment_terms_data.get('deposit_percentage'),
                        deposit_fixed_amount=payment_terms_data.get('deposit_fixed_amount'),
                        deposit_is_refundable=payment_terms_data.get('deposit_is_refundable', False),
                        deposit_is_deductible=payment_terms_data.get('deposit_is_deductible', False),
                        deposit_waived_on_full_payment=payment_terms_data.get('deposit_waived_on_full_payment', False),
                        late_fee_type=payment_terms_data.get('late_fee_type'),
                        late_fee_amount=payment_terms_data.get('late_fee_amount'),
                        late_fee_percentage=payment_terms_data.get('late_fee_percentage'),
                        security_deposit_enabled=payment_terms_data.get('security_deposit_enabled', True),
                        security_deposit_amount=payment_terms_data.get('security_deposit_amount'),
                        security_deposit_is_refundable=payment_terms_data.get('security_deposit_is_refundable', True),
                        security_deposit_description=payment_terms_data.get('security_deposit_description', ''),
                        cancellation_admin_fee_percentage=payment_terms_data.get('cancellation_admin_fee_percentage'),
                        downpayment_percentage=payment_terms_data.get('downpayment_percentage'),
                        downpayment_due_days=payment_terms_data.get('downpayment_due_days'),
                        balance_due_days=payment_terms_data.get('balance_due_days'),
                        balance_due_type=payment_terms_data.get('balance_due_type'),
                        date_blocking_policy=payment_terms_data.get('date_blocking_policy'),
                        downpayment_due_reference=payment_terms_data.get('downpayment_due_reference'),
                        downpayment_deadline_days=payment_terms_data.get('downpayment_deadline_days'),
                        child_pricing_enabled=payment_terms_data.get('child_pricing_enabled', False),
                        child_pricing_tiers=payment_terms_data.get('child_pricing_tiers'),
                    )

            elif step_type == 'confirmation':
                ConfirmationStepConfiguration.objects.create(
                    step=step,
                    title=config_data.get('title', "Booking Confirmed!"),
                    message=config_data.get('message', "Thank you for your booking. We'll be in touch soon!"),
                    show_booking_summary=True,
                    show_next_steps=True,
                    next_steps_content=config_data.get('next_steps_content', ''),
                    send_confirmation_email=True,
                    send_calendar_invite=False,
                    create_event_immediately=True,
                )

    # =====================================================
    # 1. WEDDING BOOKING FLOW
    # =====================================================
    if wedding_type:
        wedding_flow, created = BookingFlow.objects.get_or_create(
            name='Wedding Booking Flow',
            event_type=wedding_type,
            defaults={
                'description': 'Complete booking flow for wedding ceremonies and receptions',
                'is_active': True,
                'allow_guest_booking': True,
                'require_account_creation': False,
                'auto_approve_bookings': False,
                'enable_progress_saving': True,
                'max_advance_booking_days': 365,
                'min_advance_booking_days': 30,
                'allow_discounts': True,
                'require_immediate_payment': False,
                'success_message': 'Congratulations! Your wedding venue booking has been received. Our team will contact you within 24 hours.',
            }
        )

        if created:
            wedding_steps = [
                {
                    'type': 'introduction',
                    'description': 'Welcome and overview',
                    'config_data': {
                        'title': 'Plan Your Dream Wedding at LifePlace',
                        'content': '''Welcome to LifePlace Retreat and Events Center!

We're honored that you're considering us for your special day. Our venue offers a unique combination of serene chapels, beautiful garden settings, and versatile reception spaces.

Choose from our curated wedding packages or customize your own experience. Each package includes:
- Ceremony and reception venues
- FREE prenup photo shoot venue
- FREE 4 cabana accommodations
- Parking for 20-23 vehicles
- Round-the-clock security

Let's begin planning your perfect celebration!''',
                        'show_event_details': True,
                        'show_pricing_overview': True,
                    }
                },
                {
                    'type': 'date_time',
                    'description': 'Select wedding date and time',
                    'config_data': {
                        'allow_multi_day': False,
                        'min_event_days': 1,
                        'max_event_days': 1,
                        'show_calendar_view': True,
                        'enable_real_time_availability': True,
                    }
                },
                {
                    'type': 'package_selection',
                    'description': 'Choose wedding package',
                    'config_data': {
                        'selection_type': 'SINGLE',
                        'min_selection': 1,
                        'max_selection': 1,
                        'show_pricing': True,
                        'enable_comparison': True,
                        'available_categories': [wedding_packages_cat.id] if wedding_packages_cat else [],
                    }
                },
                {
                    'type': 'addon_selection',
                    'description': 'Optional add-ons',
                    'is_required': False,
                    'is_skippable': True,
                    'config_data': {
                        'min_selection': 0,
                        'max_selection': 0,
                        'group_by_category': True,
                        'available_categories': [wedding_addons_cat.id] if wedding_addons_cat else [],
                    }
                },
                {
                    'type': 'pricing_summary',
                    'description': 'Review pricing and terms',
                    'config_data': {
                        'show_tax_breakdown': True,
                        'show_discount_field': True,
                        'terms_text': 'I agree to the Wedding Terms & Conditions and Privacy Policy.',
                    }
                },
                {
                    'type': 'contact_info',
                    'description': 'Your contact details',
                    'config_data': {
                        'require_address': True,
                        'require_company': False,
                    }
                },
                {
                    'type': 'payment_info',
                    'description': 'Payment options',
                    'config_data': {
                        'accept_full_payment': True,
                        'accept_deposit': True,
                        'allow_quote_request': True,
                        'quote_request_button_text': 'Request Custom Quote',
                        'quote_request_description': 'Get a personalized quote for your wedding. Our team will prepare a detailed proposal based on your requirements.',
                        'payment_terms': '''Payment Terms:
- Reservation fee: Non-refundable and non-deductible
- 30% downpayment within 7 days to confirm date
- 70% balance due 1 day before the event
- Security deposit: PHP 2,500 (refundable upon checkout)''',
                        'payment_terms_config': {
                            'deposit_type': 'PERCENTAGE',
                            'deposit_percentage': Decimal('30.00'),
                            'deposit_is_refundable': False,
                            'deposit_is_deductible': True,
                            'security_deposit_enabled': True,
                            'security_deposit_amount': Decimal('2500.00'),
                            'security_deposit_is_refundable': True,
                            'security_deposit_description': 'Security deposit for keys, refundable upon checkout and facility inspection',
                            'cancellation_admin_fee_percentage': Decimal('20.00'),
                            'downpayment_percentage': Decimal('30.00'),
                            'downpayment_due_days': 7,
                            'balance_due_days': 1,
                            'balance_due_type': 'DAYS_BEFORE',
                            'date_blocking_policy': 'ON_DOWNPAYMENT',
                            'downpayment_due_reference': 'DAYS_AFTER_BOOKING',
                            'downpayment_deadline_days': 7,
                        }
                    }
                },
                {
                    'type': 'confirmation',
                    'description': 'Booking confirmation',
                    'config_data': {
                        'title': 'Congratulations on Your Wedding Booking!',
                        'message': '''Your wedding venue booking has been received! We're thrilled to be part of your special day.

Our Wedding Coordinator will contact you within 24 hours to discuss:
- Venue walkthrough scheduling
- Supplier coordination
- Timeline planning
- Any special requests

Thank you for choosing LifePlace Retreat and Events Center!''',
                        'next_steps_content': '''Next Steps:
1. Await confirmation from our Wedding Coordinator
2. Schedule an on-site venue visit
3. Finalize supplier arrangements
4. Complete your 30% downpayment within 7 days to confirm your date'''
                    }
                },
            ]
            create_flow_steps(wedding_flow, wedding_steps)

    # =====================================================
    # 2. CAMPS & RETREATS BOOKING FLOW
    # =====================================================
    if camps_type:
        camps_flow, created = BookingFlow.objects.get_or_create(
            name='Camps & Retreats Booking Flow',
            event_type=camps_type,
            defaults={
                'description': 'Booking flow for camps, retreats, and multi-day group events',
                'is_active': True,
                'allow_guest_booking': True,
                'require_account_creation': False,
                'auto_approve_bookings': False,
                'enable_progress_saving': True,
                'max_advance_booking_days': 365,
                'min_advance_booking_days': 14,
                'allow_discounts': True,
                'require_immediate_payment': False,
                'success_message': 'Your camp/retreat booking request has been received! Our team will contact you within 24 hours.',
            }
        )

        if created:
            camps_steps = [
                {
                    'type': 'introduction',
                    'description': 'Welcome and overview',
                    'config_data': {
                        'title': 'Plan Your Camp or Retreat at LifePlace',
                        'content': '''Welcome to LifePlace Retreat and Events Center!

We specialize in hosting memorable camps, retreats, and group events. Our facilities include:

**Accommodation Options:**
- Havilah Hostel: Accommodates 150-300 guests
- 4 Cabanas: Perfect for leaders and VIPs

**Package Tiers:**
- Budget: Venue access with optional add-ons
- Basic: Havilah accommodation + meals
- Premium: Full facilities including cabanas and function hall

**Note:** Minimum 80 participants required. All prices are per person.

12% VAT and 10% Service Charge apply.''',
                        'show_event_details': True,
                        'show_pricing_overview': True,
                    }
                },
                {
                    'type': 'date_time',
                    'description': 'Select camp/retreat dates',
                    'config_data': {
                        'allow_multi_day': True,
                        'min_event_days': 1,
                        'max_event_days': 4,
                        'show_calendar_view': True,
                        'enable_real_time_availability': True,
                    }
                },
                {
                    'type': 'package_selection',
                    'description': 'Choose your package',
                    'config_data': {
                        'selection_type': 'SINGLE',
                        'min_selection': 1,
                        'max_selection': 1,
                        'show_pricing': True,
                        'enable_comparison': True,
                        'enable_dynamic_pricing': True,
                        'available_categories': [camps_cat.id] if camps_cat else [],
                    }
                },
                {
                    'type': 'addon_selection',
                    'description': 'Optional add-ons',
                    'is_required': False,
                    'is_skippable': True,
                    'config_data': {
                        'min_selection': 0,
                        'max_selection': 0,
                        'group_by_category': True,
                        'available_categories': [camps_addons_cat.id] if camps_addons_cat else [],
                    }
                },
                {
                    'type': 'pricing_summary',
                    'description': 'Review pricing and terms',
                    'config_data': {
                        'show_tax_breakdown': True,
                        'show_discount_field': True,
                        'header_text': 'Review Your Camp/Retreat Booking',
                        'footer_text': 'Prices shown are per person. 12% VAT and 10% Service Charge will be added.',
                        'terms_text': 'I agree to the Camps & Retreats Terms & Conditions and Privacy Policy.',
                    }
                },
                {
                    'type': 'contact_info',
                    'description': 'Your contact details',
                    'config_data': {
                        'require_address': True,
                        'require_company': True,  # For organizational camps
                    }
                },
                {
                    'type': 'payment_info',
                    'description': 'Payment options',
                    'config_data': {
                        'accept_full_payment': True,
                        'accept_deposit': True,
                        'allow_quote_request': True,
                        'quote_request_button_text': 'Get Detailed Quote',
                        'quote_request_description': 'Request a customized quote for your camp or retreat. Our team will prepare a proposal tailored to your group size and requirements.',
                        'payment_terms': '''Payment Terms (per Camps & Retreats T&C):
- Reservation fee: PHP 5,000 (Non-refundable, Non-deductible)
  - Waived if full payment is made upon signing
- 30% of Total Contract Price due 14 days before event
- 70% of Total Contract Price due 1 day before event
- Security deposit: PHP 2,000 upon check-in (Refundable)

Child Pricing:
- Ages 0-2: FREE
- Ages 3-7: 50% discount
- Ages 8+: Full price

Cancellation: Less than 30 days prior = 20% liquidated damage
Rescheduling: 10% fee, must be 3+ months before event''',
                        'payment_terms_config': {
                            'deposit_type': 'FIXED',
                            'deposit_fixed_amount': Decimal('5000.00'),
                            'deposit_is_refundable': False,
                            'deposit_is_deductible': False,
                            'deposit_waived_on_full_payment': True,
                            'late_fee_type': 'PERCENTAGE',
                            'late_fee_percentage': Decimal('5.00'),
                            'security_deposit_enabled': True,
                            'security_deposit_amount': Decimal('2000.00'),
                            'security_deposit_is_refundable': True,
                            'security_deposit_description': 'Security deposit upon check-in to ensure responsible guest behavior. Refundable upon checkout.',
                            'cancellation_admin_fee_percentage': Decimal('20.00'),
                            'downpayment_percentage': Decimal('30.00'),
                            'downpayment_due_days': 14,
                            'balance_due_days': 1,
                            'balance_due_type': 'DAYS_BEFORE',
                            'date_blocking_policy': 'ON_DOWNPAYMENT',
                            'downpayment_due_reference': 'DAYS_BEFORE_EVENT',
                            'downpayment_deadline_days': 14,
                            'child_pricing_enabled': True,
                            'child_pricing_tiers': [
                                {'min_age': 0, 'max_age': 2, 'discount_percentage': 100, 'label': 'FREE'},
                                {'min_age': 3, 'max_age': 7, 'discount_percentage': 50, 'label': '50% Off'},
                                {'min_age': 8, 'max_age': 59, 'discount_percentage': 0, 'label': 'Full Price'},
                            ],
                        }
                    }
                },
                {
                    'type': 'confirmation',
                    'description': 'Booking confirmation',
                    'config_data': {
                        'title': 'Camp/Retreat Booking Received!',
                        'message': '''Thank you for choosing LifePlace for your camp or retreat!

Your booking request has been received. Our Accounts Executive will contact you within 24 hours to:
- Confirm availability and finalize details
- Discuss any special requirements
- Schedule an on-site visit if needed
- Send the official contract for signing

Please note: Your date will be officially blocked upon receipt of the 30% downpayment (14 days before event).''',
                        'next_steps_content': '''Next Steps:
1. Await confirmation from our Accounts Executive
2. Review and sign the contract
3. Submit reservation fee (PHP 5,000)
4. Complete 30% downpayment 14 days before event
5. Prepare Event Order with guest list and requirements'''
                    }
                },
            ]
            create_flow_steps(camps_flow, camps_steps)

    # =====================================================
    # 3. TEAM BUILDING BOOKING FLOW
    # =====================================================
    if team_building_type:
        tb_flow, created = BookingFlow.objects.get_or_create(
            name='Team Building Booking Flow',
            event_type=team_building_type,
            defaults={
                'description': 'Booking flow for corporate team building events',
                'is_active': True,
                'allow_guest_booking': True,
                'require_account_creation': False,
                'auto_approve_bookings': False,
                'enable_progress_saving': True,
                'max_advance_booking_days': 365,
                'min_advance_booking_days': 14,
                'allow_discounts': True,
                'require_immediate_payment': False,
                'success_message': 'Your team building event booking request has been received! Our team will contact you within 24 hours.',
            }
        )

        if created:
            tb_steps = [
                {
                    'type': 'introduction',
                    'description': 'Welcome and overview',
                    'config_data': {
                        'title': 'Plan Your Team Building Event at LifePlace',
                        'content': '''Welcome to LifePlace Retreat and Events Center!

Build stronger teams in our inspiring environment. We offer:

**Facilitation Only Packages:**
- Professional facilitators from M-Zone Team Building
- Materials and game prizes included
- Certificates of participation
- Under 100 pax: PHP 1,750/person
- 100+ pax: PHP 1,450/person

**All-In Packages:**
- Complete packages with venue, meals, and facilitation
- Day trips or overnight options
- Havilah hostel accommodation for overnight

**Facilities:**
- The Pavilion (up to 200 guests)
- Open Field (up to 500 guests)
- Swimming pool access
- Audio/visual equipment

Minimum 80 participants. 12% VAT not included.''',
                        'show_event_details': True,
                        'show_pricing_overview': True,
                    }
                },
                {
                    'type': 'date_time',
                    'description': 'Select event date(s)',
                    'config_data': {
                        'allow_multi_day': True,
                        'min_event_days': 1,
                        'max_event_days': 3,
                        'show_calendar_view': True,
                        'enable_real_time_availability': True,
                    }
                },
                {
                    'type': 'package_selection',
                    'description': 'Choose your package',
                    'config_data': {
                        'selection_type': 'SINGLE',
                        'min_selection': 1,
                        'max_selection': 1,
                        'show_pricing': True,
                        'enable_comparison': True,
                        'available_categories': [team_building_cat.id] if team_building_cat else [],
                    }
                },
                {
                    'type': 'addon_selection',
                    'description': 'Optional add-ons',
                    'is_required': False,
                    'is_skippable': True,
                    'config_data': {
                        'min_selection': 0,
                        'max_selection': 0,
                        'group_by_category': True,
                        'available_categories': [camps_addons_cat.id] if camps_addons_cat else [],
                    }
                },
                {
                    'type': 'pricing_summary',
                    'description': 'Review pricing and terms',
                    'config_data': {
                        'show_tax_breakdown': True,
                        'show_discount_field': True,
                        'footer_text': 'Prices shown are per person. 12% VAT will be added to the final amount.',
                        'terms_text': 'I agree to the Team Building Terms & Conditions and Privacy Policy.',
                    }
                },
                {
                    'type': 'contact_info',
                    'description': 'Company and contact details',
                    'config_data': {
                        'require_address': True,
                        'require_company': True,
                    }
                },
                {
                    'type': 'payment_info',
                    'description': 'Payment options',
                    'config_data': {
                        'accept_full_payment': True,
                        'accept_deposit': True,
                        'allow_quote_request': True,
                        'quote_request_button_text': 'Request Corporate Quote',
                        'quote_request_description': 'Get a customized quote for your team building event. We can tailor activities and packages to your company goals.',
                        'payment_terms': '''Payment Terms:
- Reservation fee: PHP 5,000 (Non-refundable)
- 30% downpayment due 14 days before event
- 70% balance due 1 day before event
- Security deposit: PHP 2,000 upon check-in (Refundable)

Cancellation: Less than 30 days prior = 20% liquidated damage
Rescheduling: 10% fee, must be 3+ months before event''',
                        'payment_terms_config': {
                            'deposit_type': 'FIXED',
                            'deposit_fixed_amount': Decimal('5000.00'),
                            'deposit_is_refundable': False,
                            'deposit_is_deductible': False,
                            'deposit_waived_on_full_payment': True,
                            'security_deposit_enabled': True,
                            'security_deposit_amount': Decimal('2000.00'),
                            'security_deposit_is_refundable': True,
                            'cancellation_admin_fee_percentage': Decimal('20.00'),
                            'downpayment_percentage': Decimal('30.00'),
                            'downpayment_due_days': 14,
                            'balance_due_days': 1,
                            'balance_due_type': 'DAYS_BEFORE',
                            'date_blocking_policy': 'ON_DOWNPAYMENT',
                            'downpayment_due_reference': 'DAYS_BEFORE_EVENT',
                        }
                    }
                },
                {
                    'type': 'confirmation',
                    'description': 'Booking confirmation',
                    'config_data': {
                        'title': 'Team Building Booking Received!',
                        'message': '''Your team building event booking has been received!

Our Accounts Executive will contact you within 24 hours to:
- Confirm availability
- Discuss your team's objectives and customize activities
- Coordinate with M-Zone facilitators
- Prepare the official contract

We look forward to helping your team grow stronger!''',
                        'next_steps_content': '''Next Steps:
1. Await confirmation from our team
2. Discuss objectives and finalize activities
3. Submit reservation fee
4. Complete 30% downpayment 14 days before event'''
                    }
                },
            ]
            create_flow_steps(tb_flow, tb_steps)

    # =====================================================
    # 4. WORKSHOPS BOOKING FLOW
    # =====================================================
    if workshops_type:
        workshops_flow, created = BookingFlow.objects.get_or_create(
            name='Workshops Booking Flow',
            event_type=workshops_type,
            defaults={
                'description': 'Booking flow for educational workshops and training events',
                'is_active': True,
                'allow_guest_booking': True,
                'require_account_creation': False,
                'auto_approve_bookings': False,
                'enable_progress_saving': True,
                'max_advance_booking_days': 180,
                'min_advance_booking_days': 7,
                'allow_discounts': True,
                'require_immediate_payment': False,
                'success_message': 'Your workshop venue booking request has been received! Our team will contact you shortly.',
            }
        )

        if created:
            workshop_steps = [
                {
                    'type': 'introduction',
                    'description': 'Welcome and overview',
                    'config_data': {
                        'title': 'Host Your Workshop at LifePlace',
                        'content': '''Welcome to LifePlace Retreat and Events Center!

Our venue provides an inspiring environment for educational and training events:

**Workshop Spaces:**
- The Pavilion: Air-conditioned multipurpose hall (up to 200 guests)
- Function Hall: Perfect for smaller workshops
- Outdoor spaces for creative sessions

**Amenities:**
- Audio/visual equipment
- Flexible seating arrangements
- Breakout spaces available
- Catering options

Contact us for customized workshop packages.''',
                        'show_event_details': True,
                        'show_pricing_overview': False,
                    }
                },
                {
                    'type': 'date_time',
                    'description': 'Select workshop date',
                    'config_data': {
                        'allow_multi_day': True,
                        'min_event_days': 1,
                        'max_event_days': 3,
                        'show_calendar_view': True,
                        'enable_real_time_availability': True,
                    }
                },
                {
                    'type': 'pricing_summary',
                    'description': 'Review requirements',
                    'config_data': {
                        'show_tax_breakdown': True,
                        'show_discount_field': True,
                        'header_text': 'Workshop Requirements Summary',
                        'terms_text': 'I agree to the Venue Terms & Conditions and Privacy Policy.',
                    }
                },
                {
                    'type': 'contact_info',
                    'description': 'Your contact details',
                    'config_data': {
                        'require_address': True,
                        'require_company': True,
                    }
                },
                {
                    'type': 'payment_info',
                    'description': 'Payment options',
                    'config_data': {
                        'accept_full_payment': True,
                        'accept_deposit': True,
                        'allow_quote_request': True,
                        'quote_request_button_text': 'Request Workshop Quote',
                        'quote_request_description': 'Get a customized quote for your workshop. Tell us about your requirements and we will prepare a tailored proposal.',
                        'payment_terms': '''Payment Terms:
- Quotation will be provided based on requirements
- Standard deposit and payment terms apply
- Security deposit may be required''',
                    }
                },
                {
                    'type': 'confirmation',
                    'description': 'Booking confirmation',
                    'config_data': {
                        'title': 'Workshop Inquiry Received!',
                        'message': '''Thank you for your interest in hosting your workshop at LifePlace!

Our team will contact you within 24 hours to:
- Understand your workshop requirements
- Recommend the best venue setup
- Prepare a customized quote

We look forward to hosting your event!''',
                        'next_steps_content': '''Next Steps:
1. Await our call to discuss requirements
2. Review the customized proposal
3. Confirm booking and submit deposit'''
                    }
                },
            ]
            create_flow_steps(workshops_flow, workshop_steps)

    # =====================================================
    # 5. LIFE EVENTS BOOKING FLOW
    # =====================================================
    if life_events_type:
        life_events_flow, created = BookingFlow.objects.get_or_create(
            name='Life Events Booking Flow',
            event_type=life_events_type,
            defaults={
                'description': 'Booking flow for birthdays, anniversaries, corporate events, and celebrations',
                'is_active': True,
                'allow_guest_booking': True,
                'require_account_creation': False,
                'auto_approve_bookings': False,
                'enable_progress_saving': True,
                'max_advance_booking_days': 365,
                'min_advance_booking_days': 14,
                'allow_discounts': True,
                'require_immediate_payment': False,
                'success_message': 'Your event booking request has been received! Our team will contact you within 24 hours.',
            }
        )

        if created:
            life_event_steps = [
                {
                    'type': 'introduction',
                    'description': 'Welcome and overview',
                    'config_data': {
                        'title': 'Celebrate Life at LifePlace',
                        'content': '''Welcome to LifePlace Retreat and Events Center!

Whether you're celebrating a milestone birthday, anniversary, company event, or any special occasion, we have the perfect space for you.

**Available Venues:**
- The Pavilion: Up to 200 guests
- The Open Field: Up to 220 guests (outdoor)
- The Angelic Field: Up to 200 guests (garden setting)
- The Al Fresco: Intimate events up to 50 guests
- The Pool: Intimate celebrations up to 80 guests

**What We Offer:**
- Exclusive venue use (only one event per day)
- Cabana accommodations for overnight guests
- Catering and bar services available
- Parking for 20-23 vehicles
- Round-the-clock security

12% VAT and 10% Service Charge apply to all packages.''',
                        'show_event_details': True,
                        'show_pricing_overview': True,
                    }
                },
                {
                    'type': 'date_time',
                    'description': 'Select event date',
                    'config_data': {
                        'allow_multi_day': True,
                        'min_event_days': 1,
                        'max_event_days': 3,
                        'show_calendar_view': True,
                        'enable_real_time_availability': True,
                    }
                },
                {
                    'type': 'addon_selection',
                    'description': 'Select venues and services',
                    'is_required': False,
                    'is_skippable': True,
                    'config_data': {
                        'min_selection': 0,
                        'max_selection': 0,
                        'group_by_category': True,
                        'available_categories': [camps_addons_cat.id] if camps_addons_cat else [],
                    }
                },
                {
                    'type': 'pricing_summary',
                    'description': 'Review pricing and terms',
                    'config_data': {
                        'show_tax_breakdown': True,
                        'show_discount_field': True,
                        'footer_text': '12% VAT and 10% Service Charge apply. Alcohol corkage: PHP 2,000.',
                        'terms_text': 'I agree to the Life Events Terms & Conditions and Privacy Policy.',
                    }
                },
                {
                    'type': 'contact_info',
                    'description': 'Your contact details',
                    'config_data': {
                        'require_address': True,
                        'require_company': False,
                    }
                },
                {
                    'type': 'payment_info',
                    'description': 'Payment options',
                    'config_data': {
                        'accept_full_payment': True,
                        'accept_deposit': True,
                        'allow_quote_request': True,
                        'quote_request_button_text': 'Request Event Quote',
                        'quote_request_description': 'Get a customized quote for your celebration. Our team will prepare a proposal based on your requirements.',
                        'payment_terms': '''Payment Terms (per Life Events T&C):
- Reservation fee upon signing: Non-refundable, Non-deductible
- 30% downpayment within 7 days to officially block date
- Failure to pay 30% = contract termination
- 70% balance due 1 day before event
- Late payments: 5% penalty charge
- Security deposit: PHP 2,500 for keys (Refundable upon checkout)

Cancellation within 30 days: 50% admin fee (excl. reservation)
Cancellation less than 30 days prior: 20% liquidated damage
Rescheduling: 10% fee, must be 3+ months before event

Alcohol: Requires prior approval, PHP 2,000 corkage fee''',
                        'payment_terms_config': {
                            'deposit_type': 'FIXED',
                            'deposit_fixed_amount': Decimal('5000.00'),
                            'deposit_is_refundable': False,
                            'deposit_is_deductible': False,
                            'late_fee_type': 'PERCENTAGE',
                            'late_fee_percentage': Decimal('5.00'),
                            'security_deposit_enabled': True,
                            'security_deposit_amount': Decimal('2500.00'),
                            'security_deposit_is_refundable': True,
                            'security_deposit_description': 'Security deposit for keys, refundable upon checkout and facility inspection',
                            'cancellation_admin_fee_percentage': Decimal('50.00'),
                            'downpayment_percentage': Decimal('30.00'),
                            'downpayment_due_days': 7,
                            'balance_due_days': 1,
                            'balance_due_type': 'DAYS_BEFORE',
                            'date_blocking_policy': 'ON_DOWNPAYMENT',
                            'downpayment_due_reference': 'DAYS_AFTER_BOOKING',
                            'downpayment_deadline_days': 7,
                        }
                    }
                },
                {
                    'type': 'confirmation',
                    'description': 'Booking confirmation',
                    'config_data': {
                        'title': 'Event Booking Received!',
                        'message': '''Thank you for choosing LifePlace for your celebration!

Your booking request has been received. Our Accounts Executive will contact you within 24 hours to:
- Confirm availability
- Discuss your event requirements
- Provide a customized quotation
- Schedule an on-site visit if needed

We look forward to making your event memorable!''',
                        'next_steps_content': '''Next Steps:
1. Await confirmation from our Accounts Executive
2. Review and sign the contract
3. Submit reservation fee
4. Complete 30% downpayment within 7 days to officially block your date
5. Prepare Event Order with requirements and guest list'''
                    }
                },
            ]
            create_flow_steps(life_events_flow, life_event_steps)


def reverse_booking_flows(apps, schema_editor):
    """Remove created booking flows and Life Events event type."""
    BookingFlow = apps.get_model('bookingflow', 'BookingFlow')
    EventType = apps.get_model('events', 'EventType')

    # Delete booking flows
    BookingFlow.objects.filter(name__in=[
        'Wedding Booking Flow',
        'Camps & Retreats Booking Flow',
        'Team Building Booking Flow',
        'Workshops Booking Flow',
        'Life Events Booking Flow',
    ]).delete()

    # Delete Life Events event type
    EventType.objects.filter(name='Life Events').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('bookingflow', '0029_remove_bookingsession_session_completed_expires_idx'),
        ('events', '0008_alter_event_created_at_alter_event_updated_at_and_more'),
        ('products', '0011_add_image_fields_to_productoption'),
    ]

    operations = [
        migrations.RunPython(create_booking_flows, reverse_booking_flows),
    ]
