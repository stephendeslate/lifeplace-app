# backend/core/domains/vendors/admin.py
from django.contrib import admin

from .models import PackageVendor, Vendor, VendorOperatingRules


class VendorOperatingRulesInline(admin.StackedInline):
    model = VendorOperatingRules
    extra = 0
    max_num = 1


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "service_category", "is_active", "is_bookable", "sort_order"]
    list_filter = ["service_category", "is_active", "is_bookable"]
    search_fields = ["name", "code", "company_name", "contact_name"]
    ordering = ["sort_order", "name"]
    inlines = [VendorOperatingRulesInline]


@admin.register(PackageVendor)
class PackageVendorAdmin(admin.ModelAdmin):
    list_display = ["package", "vendor", "sort_order"]
    list_filter = ["vendor__service_category"]
    search_fields = ["package__name", "vendor__name"]
    ordering = ["package__name", "sort_order"]
