# backend/core/domains/vendors/serializers.py
from rest_framework import serializers

from .models import PackageVendor, Vendor, VendorOperatingRules


class VendorOperatingRulesSerializer(serializers.ModelSerializer):
    """Serializer for vendor operating rules"""

    class Meta:
        model = VendorOperatingRules
        fields = [
            "id",
            # Lead time
            "minimum_lead_days",
            # Service duration
            "minimum_service_hours",
            "maximum_service_hours",
            # Setup/Teardown
            "setup_hours",
            "teardown_hours",
            # Custom Rules
            "custom_rules",
            # Timestamps
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class VendorSerializer(serializers.ModelSerializer):
    """Serializer for vendors"""

    operating_rules = VendorOperatingRulesSerializer(source="vendor_operating_rules", read_only=True)
    packages_count = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            "id",
            "name",
            "code",
            "description",
            "service_category",
            "service_description",
            "contact_name",
            "contact_email",
            "contact_phone",
            "company_name",
            "address",
            "website",
            "pricing_notes",
            "is_active",
            "is_bookable",
            "featured_image",
            "sort_order",
            "operating_rules",
            "packages_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_packages_count(self, obj):
        """Get count of packages that include this vendor"""
        return obj.vendor_packages.filter(package__is_active=True).count()

    def validate_code(self, value):
        """Ensure code is uppercase"""
        return value.upper()


class VendorListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for vendor lists"""

    has_operating_rules = serializers.SerializerMethodField()
    packages_count = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = [
            "id",
            "name",
            "code",
            "service_category",
            "is_active",
            "is_bookable",
            "featured_image",
            "sort_order",
            "has_operating_rules",
            "packages_count",
        ]

    def get_has_operating_rules(self, obj):
        return hasattr(obj, "vendor_operating_rules")

    def get_packages_count(self, obj):
        return obj.vendor_packages.count()


class VendorDetailSerializer(VendorSerializer):
    """Detailed serializer for vendor including related data"""

    packages = serializers.SerializerMethodField()

    class Meta(VendorSerializer.Meta):
        fields = [*VendorSerializer.Meta.fields, "packages"]

    def get_packages(self, obj):
        """Get packages that include this vendor"""
        package_vendors = (
            obj.vendor_packages.filter(package__is_active=True).select_related("package").order_by("sort_order")
        )

        return [
            {"id": pv.package.id, "name": pv.package.name, "notes": pv.notes, "sort_order": pv.sort_order}
            for pv in package_vendors
        ]


class VendorWithRulesSerializer(serializers.ModelSerializer):
    """
    Serializer that allows creating/updating vendor with operating rules in one request.
    Used by admin to manage vendors.
    """

    operating_rules = VendorOperatingRulesSerializer(source="vendor_operating_rules", required=False)

    class Meta:
        model = Vendor
        fields = [
            "id",
            "name",
            "code",
            "description",
            "service_category",
            "service_description",
            "contact_name",
            "contact_email",
            "contact_phone",
            "company_name",
            "address",
            "website",
            "pricing_notes",
            "is_active",
            "is_bookable",
            "featured_image",
            "sort_order",
            "operating_rules",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_code(self, value):
        return value.upper()

    def create(self, validated_data):
        operating_rules_data = validated_data.pop("vendor_operating_rules", None)
        vendor = Vendor.objects.create(**validated_data)

        if operating_rules_data:
            VendorOperatingRules.objects.create(vendor=vendor, **operating_rules_data)

        return vendor

    def update(self, instance, validated_data):
        operating_rules_data = validated_data.pop("vendor_operating_rules", None)

        # Update vendor fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create operating rules
        if operating_rules_data:
            if hasattr(instance, "vendor_operating_rules"):
                for attr, value in operating_rules_data.items():
                    setattr(instance.vendor_operating_rules, attr, value)
                instance.vendor_operating_rules.save()
            else:
                VendorOperatingRules.objects.create(vendor=instance, **operating_rules_data)

        return instance


class PackageVendorSerializer(serializers.ModelSerializer):
    """Serializer for package-vendor assignments"""

    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    vendor_code = serializers.CharField(source="vendor.code", read_only=True)
    vendor_service_category = serializers.CharField(source="vendor.service_category", read_only=True)
    package_name = serializers.CharField(source="package.name", read_only=True)

    class Meta:
        model = PackageVendor
        fields = [
            "id",
            "package",
            "package_name",
            "vendor",
            "vendor_name",
            "vendor_code",
            "vendor_service_category",
            "notes",
            "sort_order",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        """Ensure package is of type PACKAGE"""
        package = data.get("package")
        if package and package.type != "PACKAGE":
            raise serializers.ValidationError(
                {"package": "Only packages (not products/add-ons) can have vendors assigned"}
            )
        return data


class PackageVendorInlineSerializer(serializers.ModelSerializer):
    """
    Inline serializer for package vendors - used when viewing package details.
    Shows vendor info without package info.
    """

    vendor_name = serializers.CharField(source="vendor.name", read_only=True)
    vendor_code = serializers.CharField(source="vendor.code", read_only=True)
    vendor_service_category = serializers.CharField(source="vendor.service_category", read_only=True)
    operating_rules = serializers.SerializerMethodField()

    class Meta:
        model = PackageVendor
        fields = [
            "id",
            "vendor",
            "vendor_name",
            "vendor_code",
            "vendor_service_category",
            "notes",
            "sort_order",
            "operating_rules",
        ]

    def get_operating_rules(self, obj):
        """Get operating rules for the vendor if available"""
        if hasattr(obj.vendor, "vendor_operating_rules"):
            return VendorOperatingRulesSerializer(obj.vendor.vendor_operating_rules).data
        return None


# === Public/Client-facing serializers ===


class PublicVendorSerializer(serializers.ModelSerializer):
    """
    Public serializer for client-facing vendor info.
    Excludes admin-only fields.
    """

    class Meta:
        model = Vendor
        fields = ["id", "name", "code", "description", "service_category", "service_description", "featured_image"]


class PublicVendorOperatingRulesSerializer(serializers.ModelSerializer):
    """
    Public serializer for operating rules shown to clients.
    """

    class Meta:
        model = VendorOperatingRules
        fields = [
            "minimum_lead_days",
            "minimum_service_hours",
            "maximum_service_hours",
            "setup_hours",
            "teardown_hours",
        ]


class PublicPackageVendorSerializer(serializers.ModelSerializer):
    """
    Public serializer for package vendors shown in booking flow.
    """

    vendor = PublicVendorSerializer(read_only=True)
    operating_rules = serializers.SerializerMethodField()

    class Meta:
        model = PackageVendor
        fields = ["vendor", "notes", "sort_order", "operating_rules"]

    def get_operating_rules(self, obj):
        """Return operating rules if available"""
        if hasattr(obj.vendor, "vendor_operating_rules"):
            return PublicVendorOperatingRulesSerializer(obj.vendor.vendor_operating_rules).data
        return None
