# backend/core/domains/vendors/models.py
from decimal import Decimal

from django.db import models

from core.utils.models import BaseModel


class Vendor(BaseModel):
    """
    Represents a vendor/service provider (catering, photography, florists, DJs, etc.)
    """

    # Service category choices
    SERVICE_CATEGORY_CHOICES = [
        ("CATERING", "Catering"),
        ("PHOTOGRAPHY", "Photography"),
        ("VIDEOGRAPHY", "Videography"),
        ("DJ", "DJ / Music"),
        ("FLORIST", "Florist"),
        ("DECORATOR", "Decorator"),
        ("ENTERTAINMENT", "Entertainment"),
        ("TRANSPORTATION", "Transportation"),
        ("MAKEUP", "Makeup & Styling"),
        ("RENTALS", "Equipment Rentals"),
        ("OFFICIANT", "Officiant"),
        ("COORDINATION", "Event Coordination"),
        ("OTHER", "Other"),
    ]

    # Core fields (required)
    name = models.CharField(max_length=200, help_text="Vendor name")
    code = models.CharField(max_length=50, unique=True, help_text="Unique code (e.g., 'VENDOR_CATERING_ABC')")

    # Description
    description = models.TextField(blank=True)

    # Service classification
    service_category = models.CharField(
        max_length=20, choices=SERVICE_CATEGORY_CHOICES, default="OTHER", help_text="Primary service category"
    )
    service_description = models.TextField(blank=True, help_text="Detailed description of services offered")

    # Contact information
    contact_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    company_name = models.CharField(max_length=200, blank=True)
    address = models.TextField(blank=True)
    website = models.URLField(blank=True)

    # Pricing notes (text field for flexible rate info)
    pricing_notes = models.TextField(blank=True, help_text="Notes about pricing, rates, or packages offered")

    # Status
    is_active = models.BooleanField(default=True)
    is_bookable = models.BooleanField(default=True, help_text="Whether this vendor can be included in client bookings")

    # Display
    featured_image = models.ImageField(upload_to="vendors/images/", null=True, blank=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "Vendor"
        verbose_name_plural = "Vendors"

    def __str__(self):
        return self.name

    @property
    def operating_rules(self):
        """Get the operating rules for this vendor (if any)."""
        try:
            return self.vendor_operating_rules
        except VendorOperatingRules.DoesNotExist:
            return None


class VendorOperatingRules(BaseModel):
    """
    Optional operating rules for a vendor.
    Simpler than VenueOperatingRules - only includes relevant constraints.
    """

    vendor = models.OneToOneField(Vendor, on_delete=models.CASCADE, related_name="vendor_operating_rules")

    # Lead time requirements
    minimum_lead_days = models.PositiveIntegerField(default=0, help_text="Minimum days advance notice required")

    # Service duration constraints
    minimum_service_hours = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True, help_text="Minimum service duration in hours"
    )
    maximum_service_hours = models.DecimalField(
        max_digits=4, decimal_places=1, null=True, blank=True, help_text="Maximum service duration in hours"
    )

    # Setup/teardown time
    setup_hours = models.DecimalField(
        max_digits=4, decimal_places=1, default=Decimal("0.0"), help_text="Required setup time before service"
    )
    teardown_hours = models.DecimalField(
        max_digits=4, decimal_places=1, default=Decimal("0.0"), help_text="Required teardown time after service"
    )

    # Custom rules (JSON for flexibility)
    custom_rules = models.JSONField(default=dict, blank=True, help_text="Additional custom rules as JSON")

    class Meta:
        verbose_name = "Vendor Operating Rules"
        verbose_name_plural = "Vendor Operating Rules"

    def __str__(self):
        return f"Operating Rules for {self.vendor.name}"


class PackageVendor(BaseModel):
    """
    Junction table linking packages (ProductOption) to vendors.
    Simpler than PackageVenue - no is_primary or access_order concepts.
    """

    package = models.ForeignKey(
        "products.ProductOption",
        on_delete=models.CASCADE,
        related_name="package_vendors",
        limit_choices_to={"type": "PACKAGE"},
    )
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name="vendor_packages")

    # Notes about vendor's role in package
    notes = models.TextField(blank=True, help_text="Notes about vendor's services for this package")

    # Display ordering
    sort_order = models.PositiveIntegerField(default=0, help_text="Display order within the package")

    class Meta:
        unique_together = ("package", "vendor")
        ordering = ["sort_order", "vendor__name"]
        verbose_name = "Package Vendor"
        verbose_name_plural = "Package Vendors"

    def __str__(self):
        return f"{self.package.name} - {self.vendor.name}"
