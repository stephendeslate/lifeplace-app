"""
Factories for the vendors domain.

Based on actual models in core/domains/vendors/models.py:
- Vendor (vendor/service providers)
- VendorOperatingRules (operating rules)
- PackageVendor (junction table for packages)
"""

import factory
from factory.django import DjangoModelFactory
from decimal import Decimal


class VendorFactory(DjangoModelFactory):
    """
    Factory for creating Vendor instances.

    Vendor represents service providers (catering, photography, etc.)
    """

    class Meta:
        model = 'vendors.Vendor'
        django_get_or_create = ('code',)

    name = factory.Sequence(lambda n: f'Vendor {n}')
    code = factory.Sequence(lambda n: f'VENDOR_{n}')
    description = factory.Faker('paragraph')
    service_category = 'OTHER'
    service_description = factory.Faker('sentence')
    contact_name = factory.Faker('name')
    contact_email = factory.Faker('email')
    contact_phone = factory.Faker('phone_number')
    company_name = factory.Faker('company')
    address = factory.Faker('address')
    website = factory.Faker('url')
    pricing_notes = ''
    is_active = True
    is_bookable = True
    featured_image = None
    sort_order = factory.Sequence(lambda n: n)

    class Params:
        """Traits for vendor types."""

        inactive = factory.Trait(
            is_active=False
        )

        not_bookable = factory.Trait(
            is_bookable=False
        )

        catering = factory.Trait(
            service_category='CATERING',
            name=factory.Sequence(lambda n: f'Catering Vendor {n}'),
            service_description='Full-service catering for events'
        )

        photography = factory.Trait(
            service_category='PHOTOGRAPHY',
            name=factory.Sequence(lambda n: f'Photography Vendor {n}'),
            service_description='Professional event photography'
        )

        videography = factory.Trait(
            service_category='VIDEOGRAPHY',
            name=factory.Sequence(lambda n: f'Video Vendor {n}'),
            service_description='Event videography services'
        )

        dj = factory.Trait(
            service_category='DJ',
            name=factory.Sequence(lambda n: f'DJ Vendor {n}'),
            service_description='DJ and music services'
        )

        florist = factory.Trait(
            service_category='FLORIST',
            name=factory.Sequence(lambda n: f'Florist {n}'),
            service_description='Floral arrangements and decorations'
        )

        decorator = factory.Trait(
            service_category='DECORATOR',
            name=factory.Sequence(lambda n: f'Decorator {n}'),
            service_description='Event decoration services'
        )

        entertainment = factory.Trait(
            service_category='ENTERTAINMENT',
            name=factory.Sequence(lambda n: f'Entertainment Vendor {n}'),
            service_description='Event entertainment services'
        )


class VendorOperatingRulesFactory(DjangoModelFactory):
    """
    Factory for creating VendorOperatingRules instances.

    Operating rules for vendors (lead time, duration constraints).
    """

    class Meta:
        model = 'vendors.VendorOperatingRules'

    vendor = factory.SubFactory(VendorFactory)
    minimum_lead_days = 0
    minimum_service_hours = None
    maximum_service_hours = None
    setup_hours = Decimal('0.0')
    teardown_hours = Decimal('0.0')
    custom_rules = factory.LazyFunction(dict)

    class Params:
        """Traits for operating rule configurations."""

        with_lead_time = factory.Trait(
            minimum_lead_days=7
        )

        with_duration_limits = factory.Trait(
            minimum_service_hours=Decimal('2.0'),
            maximum_service_hours=Decimal('8.0')
        )

        with_setup_teardown = factory.Trait(
            setup_hours=Decimal('1.0'),
            teardown_hours=Decimal('0.5')
        )

        catering_rules = factory.Trait(
            minimum_lead_days=14,
            minimum_service_hours=Decimal('4.0'),
            setup_hours=Decimal('2.0'),
            teardown_hours=Decimal('1.0')
        )


class PackageVendorFactory(DjangoModelFactory):
    """
    Factory for creating PackageVendor instances.

    Junction table linking packages to vendors.
    """

    class Meta:
        model = 'vendors.PackageVendor'

    package = factory.SubFactory(
        'core.factories.products.ProductOptionFactory',
        package=True
    )
    vendor = factory.SubFactory(VendorFactory)
    notes = ''
    sort_order = factory.Sequence(lambda n: n)

    class Params:
        """Traits for package vendor configurations."""

        with_notes = factory.Trait(
            notes='Special services included in this package'
        )
