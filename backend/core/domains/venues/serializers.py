# backend/core/domains/venues/serializers.py
from rest_framework import serializers
from .models import Venue, VenueOperatingRules, PackageVenue, VenueBlockedDate


class VenueOperatingRulesSerializer(serializers.ModelSerializer):
    """Serializer for venue operating rules"""

    class Meta:
        model = VenueOperatingRules
        fields = [
            'id',
            # Check-in/Checkout
            'default_check_in_time', 'default_checkout_time', 'checkout_next_day',
            # Program Duration
            'minimum_program_hours', 'maximum_program_hours', 'default_program_hours',
            'is_fixed_duration',
            # Ingress/Egress
            'ingress_hours', 'egress_hours', 'allow_custom_ingress', 'allow_custom_egress',
            'min_ingress_hours', 'max_ingress_hours', 'min_egress_hours', 'max_egress_hours',
            # Time Constraints
            'earliest_start_time', 'latest_end_time', 'hard_cutoff_time',
            'hard_cutoff_next_day', 'early_access_minutes',
            # Early Check-in
            'early_checkin_allowed', 'early_checkin_fee_per_hour', 'earliest_checkin_time',
            # Late Checkout
            'late_checkout_allowed', 'late_checkout_fee_per_hour',
            'late_checkout_max_hours', 'latest_checkout_time',
            # Custom Rules
            'custom_rules',
            # Timestamps
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VenueSerializer(serializers.ModelSerializer):
    """Serializer for venues"""
    operating_rules = VenueOperatingRulesSerializer(
        source='venue_operating_rules',
        read_only=True
    )
    packages_count = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            'id', 'name', 'code', 'description', 'is_overnight',
            'minimum_capacity', 'maximum_capacity', 'recommended_capacity',
            'is_active', 'is_bookable',
            'location_description', 'featured_image', 'gallery_images',
            'sort_order', 'operating_rules', 'packages_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_packages_count(self, obj):
        """Get count of packages that include this venue"""
        return obj.venue_packages.filter(package__is_active=True).count()

    def validate_code(self, value):
        """Ensure code is uppercase"""
        return value.upper()

    def validate(self, data):
        """Validate venue data"""
        # Ensure max capacity >= min capacity
        min_cap = data.get('minimum_capacity', 1)
        max_cap = data.get('maximum_capacity')
        if max_cap and min_cap > max_cap:
            raise serializers.ValidationError({
                'minimum_capacity': 'Minimum capacity cannot exceed maximum capacity'
            })

        # Ensure recommended is within range
        rec_cap = data.get('recommended_capacity')
        if rec_cap:
            if rec_cap < min_cap or (max_cap and rec_cap > max_cap):
                raise serializers.ValidationError({
                    'recommended_capacity': 'Recommended capacity must be between min and max'
                })

        return data


class VenueListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for venue lists"""
    has_operating_rules = serializers.SerializerMethodField()
    packages_count = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            'id', 'name', 'code', 'is_overnight', 'is_active', 'is_bookable',
            'minimum_capacity', 'maximum_capacity',
            'featured_image', 'sort_order', 'has_operating_rules', 'packages_count'
        ]

    def get_has_operating_rules(self, obj):
        return hasattr(obj, 'venue_operating_rules')

    def get_packages_count(self, obj):
        return obj.venue_packages.count()


class VenueDetailSerializer(VenueSerializer):
    """Detailed serializer for venue including related data"""
    packages = serializers.SerializerMethodField()
    blocked_dates = serializers.SerializerMethodField()

    class Meta(VenueSerializer.Meta):
        fields = VenueSerializer.Meta.fields + ['packages', 'blocked_dates']

    def get_packages(self, obj):
        """Get packages that include this venue"""
        package_venues = obj.venue_packages.filter(
            package__is_active=True
        ).select_related('package').order_by('access_order')

        return [{
            'id': pv.package.id,
            'name': pv.package.name,
            'is_primary': pv.is_primary,
            'access_order': pv.access_order,
            'access_duration_hours': pv.access_duration_hours,
            'notes': pv.notes
        } for pv in package_venues]

    def get_blocked_dates(self, obj):
        """Get upcoming blocked dates"""
        from django.utils import timezone
        blocked = obj.blocked_dates.filter(
            date__gte=timezone.now().date()
        ).order_by('date')[:30]

        return VenueBlockedDateSerializer(blocked, many=True).data


class VenueWithRulesSerializer(serializers.ModelSerializer):
    """
    Serializer that allows creating/updating venue with operating rules in one request.
    Used by admin to manage venues.
    """
    operating_rules = VenueOperatingRulesSerializer(
        source='venue_operating_rules',
        required=False
    )

    class Meta:
        model = Venue
        fields = [
            'id', 'name', 'code', 'description', 'is_overnight',
            'minimum_capacity', 'maximum_capacity', 'recommended_capacity',
            'is_active', 'is_bookable',
            'location_description', 'featured_image', 'gallery_images',
            'sort_order', 'operating_rules',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_code(self, value):
        return value.upper()

    def create(self, validated_data):
        operating_rules_data = validated_data.pop('venue_operating_rules', None)
        venue = Venue.objects.create(**validated_data)

        if operating_rules_data:
            VenueOperatingRules.objects.create(venue=venue, **operating_rules_data)

        return venue

    def update(self, instance, validated_data):
        operating_rules_data = validated_data.pop('venue_operating_rules', None)

        # Update venue fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update or create operating rules
        if operating_rules_data:
            if hasattr(instance, 'venue_operating_rules'):
                for attr, value in operating_rules_data.items():
                    setattr(instance.venue_operating_rules, attr, value)
                instance.venue_operating_rules.save()
            else:
                VenueOperatingRules.objects.create(venue=instance, **operating_rules_data)

        return instance


class PackageVenueSerializer(serializers.ModelSerializer):
    """Serializer for package-venue assignments"""
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    venue_code = serializers.CharField(source='venue.code', read_only=True)
    venue_is_overnight = serializers.BooleanField(source='venue.is_overnight', read_only=True)
    package_name = serializers.CharField(source='package.name', read_only=True)

    class Meta:
        model = PackageVenue
        fields = [
            'id', 'package', 'package_name', 'venue', 'venue_name', 'venue_code',
            'venue_is_overnight', 'is_primary', 'access_order',
            'access_duration_hours', 'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        """Ensure package is of type PACKAGE"""
        package = data.get('package')
        if package and package.type != 'PACKAGE':
            raise serializers.ValidationError({
                'package': 'Only packages (not products/add-ons) can have venues assigned'
            })
        return data


class PackageVenueInlineSerializer(serializers.ModelSerializer):
    """
    Inline serializer for package venues - used when viewing package details.
    Shows venue info without package info.
    """
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    venue_code = serializers.CharField(source='venue.code', read_only=True)
    venue_is_overnight = serializers.BooleanField(source='venue.is_overnight', read_only=True)
    venue_max_capacity = serializers.IntegerField(source='venue.maximum_capacity', read_only=True)
    operating_rules = serializers.SerializerMethodField()

    class Meta:
        model = PackageVenue
        fields = [
            'id', 'venue', 'venue_name', 'venue_code', 'venue_is_overnight',
            'venue_max_capacity', 'is_primary', 'access_order',
            'access_duration_hours', 'notes', 'operating_rules'
        ]

    def get_operating_rules(self, obj):
        """Get operating rules for the primary venue only"""
        if obj.is_primary and hasattr(obj.venue, 'venue_operating_rules'):
            return VenueOperatingRulesSerializer(obj.venue.venue_operating_rules).data
        return None


class VenueBlockedDateSerializer(serializers.ModelSerializer):
    """Serializer for venue blocked dates"""
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = VenueBlockedDate
        fields = [
            'id', 'venue', 'venue_name', 'date', 'reason',
            'is_full_day', 'blocked_start_time', 'blocked_end_time',
            'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None

    def validate(self, data):
        """Validate blocked date data"""
        is_full_day = data.get('is_full_day', True)

        if not is_full_day:
            # Partial block requires start and end times
            if not data.get('blocked_start_time') or not data.get('blocked_end_time'):
                raise serializers.ValidationError(
                    'Partial day blocks require both start and end times'
                )

            # Ensure end time is after start time
            if data['blocked_end_time'] <= data['blocked_start_time']:
                raise serializers.ValidationError({
                    'blocked_end_time': 'End time must be after start time'
                })

        return data

    def create(self, validated_data):
        """Auto-set created_by from request user"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# === Public/Client-facing serializers ===

class PublicVenueSerializer(serializers.ModelSerializer):
    """
    Public serializer for client-facing venue info.
    Excludes admin-only fields.
    """
    class Meta:
        model = Venue
        fields = [
            'id', 'name', 'code', 'description', 'is_overnight',
            'minimum_capacity', 'maximum_capacity', 'recommended_capacity',
            'location_description', 'featured_image', 'gallery_images'
        ]


class PublicVenueOperatingRulesSerializer(serializers.ModelSerializer):
    """
    Public serializer for operating rules shown to clients.
    Includes timing info and fees but excludes internal settings.
    """
    class Meta:
        model = VenueOperatingRules
        fields = [
            'default_check_in_time', 'default_checkout_time', 'checkout_next_day',
            'minimum_program_hours', 'maximum_program_hours', 'default_program_hours',
            'is_fixed_duration',
            'ingress_hours', 'egress_hours',
            'earliest_start_time', 'latest_end_time',
            'early_access_minutes',
            'early_checkin_allowed', 'early_checkin_fee_per_hour', 'earliest_checkin_time',
            'late_checkout_allowed', 'late_checkout_fee_per_hour',
            'late_checkout_max_hours', 'latest_checkout_time',
        ]


class PublicPackageVenueSerializer(serializers.ModelSerializer):
    """
    Public serializer for package venues shown in booking flow.
    """
    venue = PublicVenueSerializer(read_only=True)
    operating_rules = serializers.SerializerMethodField()

    class Meta:
        model = PackageVenue
        fields = [
            'venue', 'is_primary', 'access_order',
            'access_duration_hours', 'notes', 'operating_rules'
        ]

    def get_operating_rules(self, obj):
        """Only return operating rules for primary venue"""
        if obj.is_primary and hasattr(obj.venue, 'venue_operating_rules'):
            return PublicVenueOperatingRulesSerializer(
                obj.venue.venue_operating_rules
            ).data
        return None
