# backend/core/domains/venues/serializers.py
from rest_framework import serializers
from .models import Venue, VenueOperatingRules, PackageVenue, VenueBlockedDate, VenueEventTypeConfiguration


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
            'is_active', 'is_bookable', 'is_featured',
            'location_description', 'featured_image', 'gallery_images',
            'amenities', 'sort_order',
            # Standalone pricing
            'is_rentable_standalone', 'standalone_base_price',
            'standalone_included_hours', 'standalone_excess_hour_price',
            'operating_rules', 'packages_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_packages_count(self, obj):
        """Get count of packages that include this venue"""
        # Use annotated value if available (from optimized queryset)
        if hasattr(obj, '_packages_count'):
            return obj._packages_count
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
    """Serializer for venue lists - includes fields needed for editing"""
    operating_rules = VenueOperatingRulesSerializer(
        source='venue_operating_rules',
        read_only=True
    )
    has_operating_rules = serializers.SerializerMethodField()
    packages_count = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            'id', 'name', 'code', 'description', 'is_overnight', 'is_active', 'is_bookable',
            'is_featured', 'minimum_capacity', 'maximum_capacity', 'recommended_capacity',
            'location_description', 'featured_image', 'gallery_images', 'amenities',
            'sort_order', 'is_rentable_standalone',
            # Standalone pricing fields for editing
            'standalone_base_price', 'standalone_included_hours',
            'standalone_excess_hour_price',
            'operating_rules', 'has_operating_rules', 'packages_count'
        ]

    def get_has_operating_rules(self, obj):
        return hasattr(obj, 'venue_operating_rules')

    def get_packages_count(self, obj):
        # Use annotated value if available (from optimized queryset)
        if hasattr(obj, '_packages_count'):
            return obj._packages_count
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
            'is_active', 'is_bookable', 'is_featured',
            'location_description', 'featured_image', 'gallery_images',
            'sort_order',
            # Standalone pricing
            'is_rentable_standalone', 'standalone_base_price',
            'standalone_included_hours', 'standalone_excess_hour_price',
            'operating_rules',
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
            'hard_cutoff_time', 'hard_cutoff_next_day',
            'early_access_minutes',
            'early_checkin_allowed', 'early_checkin_fee_per_hour', 'earliest_checkin_time',
            'late_checkout_allowed', 'late_checkout_fee_per_hour',
            'late_checkout_max_hours', 'latest_checkout_time',
        ]


class PublicVenueSerializer(serializers.ModelSerializer):
    """
    Public serializer for client-facing venue info.
    Includes operating rules for timing and early/late options.
    """
    operating_rules = PublicVenueOperatingRulesSerializer(
        source='venue_operating_rules',
        read_only=True
    )

    class Meta:
        model = Venue
        fields = [
            'id', 'name', 'code', 'description', 'is_overnight',
            'minimum_capacity', 'maximum_capacity', 'recommended_capacity',
            'location_description', 'featured_image', 'gallery_images',
            'amenities', 'is_featured', 'sort_order', 'operating_rules'
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


class VenueEventTypeConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for venue event type configurations"""
    venue_name = serializers.CharField(source='venue.name', read_only=True)
    event_type_name = serializers.CharField(source='event_type.name', read_only=True)

    class Meta:
        model = VenueEventTypeConfiguration
        fields = [
            'id', 'venue', 'venue_name', 'event_type', 'event_type_name',
            'base_price', 'included_hours', 'excess_hour_price',
            'is_all_day_access',
            'default_check_in_time', 'default_checkout_time',
            'checkout_next_day', 'maximum_program_hours', 'is_fixed_duration',
            'notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VenueEventTypeConfigurationInlineSerializer(serializers.ModelSerializer):
    """Inline serializer for event type configs shown in venue details"""
    event_type_name = serializers.CharField(source='event_type.name', read_only=True)

    class Meta:
        model = VenueEventTypeConfiguration
        fields = [
            'id', 'event_type', 'event_type_name',
            'base_price', 'included_hours', 'excess_hour_price',
            'is_all_day_access',
        ]


class RentableVenueSerializer(serializers.ModelSerializer):
    """
    Serializer for venues that can be rented standalone.
    Used by the venue selection booking flow step.
    """
    operating_rules = serializers.SerializerMethodField()
    featured_image = serializers.SerializerMethodField()
    gallery_images = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            'id', 'name', 'code', 'description',
            'is_overnight',
            'minimum_capacity', 'maximum_capacity', 'recommended_capacity',
            'location_description', 'featured_image', 'gallery_images',
            'amenities', 'is_featured', 'sort_order',
            # Standalone pricing
            'standalone_base_price', 'standalone_included_hours',
            'standalone_excess_hour_price',
            'operating_rules'
        ]

    def get_featured_image(self, obj):
        """Return absolute URL for featured image"""
        if obj.featured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return None

    def get_gallery_images(self, obj):
        """Return absolute URLs for gallery images"""
        if not obj.gallery_images:
            return []
        request = self.context.get('request')
        if request:
            return [request.build_absolute_uri(url) for url in obj.gallery_images]
        return obj.gallery_images

    def get_operating_rules(self, obj):
        """Get simplified operating rules for venue selection"""
        if hasattr(obj, 'venue_operating_rules'):
            rules = obj.venue_operating_rules
            return {
                'default_check_in_time': rules.default_check_in_time,
                'default_checkout_time': rules.default_checkout_time,
                'checkout_next_day': rules.checkout_next_day,
                'minimum_program_hours': rules.minimum_program_hours,
                'maximum_program_hours': rules.maximum_program_hours,
                'default_program_hours': rules.default_program_hours,
                'earliest_start_time': rules.earliest_start_time,
                'latest_end_time': rules.latest_end_time,
            }
        return None


class RentableVenueWithEventTypeSerializer(serializers.ModelSerializer):
    """
    Serializer for venues that can be rented standalone, with event-type-specific pricing.
    Used by the venue selection booking flow step when event_type_id is provided.
    """
    operating_rules = serializers.SerializerMethodField()
    featured_image = serializers.SerializerMethodField()
    gallery_images = serializers.SerializerMethodField()
    # These will be populated with event-type-specific values if available
    effective_base_price = serializers.SerializerMethodField()
    effective_included_hours = serializers.SerializerMethodField()
    effective_excess_hour_price = serializers.SerializerMethodField()
    is_all_day_access = serializers.SerializerMethodField()
    has_event_type_config = serializers.SerializerMethodField()

    class Meta:
        model = Venue
        fields = [
            'id', 'name', 'code', 'description',
            'is_overnight',
            'minimum_capacity', 'maximum_capacity', 'recommended_capacity',
            'location_description', 'featured_image', 'gallery_images',
            'amenities', 'is_featured', 'sort_order',
            # Default standalone pricing (for reference)
            'standalone_base_price', 'standalone_included_hours',
            'standalone_excess_hour_price',
            # Event-type-specific effective pricing
            'effective_base_price', 'effective_included_hours',
            'effective_excess_hour_price', 'is_all_day_access',
            'has_event_type_config',
            'operating_rules'
        ]

    def get_featured_image(self, obj):
        """Return absolute URL for featured image"""
        if obj.featured_image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.featured_image.url)
            return obj.featured_image.url
        return None

    def get_gallery_images(self, obj):
        """Return absolute URLs for gallery images"""
        if not obj.gallery_images:
            return []
        request = self.context.get('request')
        if request:
            return [request.build_absolute_uri(url) for url in obj.gallery_images]
        return obj.gallery_images

    def get_event_type_config(self, obj):
        """Get event type configuration if available"""
        event_type_id = self.context.get('event_type_id')
        if not event_type_id:
            return None

        # Use prefetched data if available
        if hasattr(obj, '_prefetched_event_type_config'):
            return obj._prefetched_event_type_config

        try:
            return VenueEventTypeConfiguration.objects.get(
                venue=obj,
                event_type_id=event_type_id
            )
        except VenueEventTypeConfiguration.DoesNotExist:
            return None

    def get_effective_base_price(self, obj):
        """Get effective base price (event-type-specific or default)"""
        config = self.get_event_type_config(obj)
        if config:
            return str(config.get_effective_base_price() or 0)
        return obj.standalone_base_price

    def get_effective_included_hours(self, obj):
        """Get effective included hours (event-type-specific or default)"""
        config = self.get_event_type_config(obj)
        if config:
            return str(config.get_effective_included_hours() or 0)
        return obj.standalone_included_hours

    def get_effective_excess_hour_price(self, obj):
        """Get effective excess hour price (event-type-specific or default)"""
        config = self.get_event_type_config(obj)
        if config:
            return str(config.get_effective_excess_hour_price() or 0)
        return obj.standalone_excess_hour_price

    def get_is_all_day_access(self, obj):
        """Check if venue has all-day access for this event type"""
        config = self.get_event_type_config(obj)
        return config.is_all_day_access if config else False

    def get_has_event_type_config(self, obj):
        """Check if venue has event-type-specific configuration"""
        return self.get_event_type_config(obj) is not None

    def get_operating_rules(self, obj):
        """Get simplified operating rules for venue selection"""
        if hasattr(obj, 'venue_operating_rules'):
            rules = obj.venue_operating_rules
            return {
                'default_check_in_time': rules.default_check_in_time,
                'default_checkout_time': rules.default_checkout_time,
                'checkout_next_day': rules.checkout_next_day,
                'minimum_program_hours': rules.minimum_program_hours,
                'maximum_program_hours': rules.maximum_program_hours,
                'default_program_hours': rules.default_program_hours,
                'earliest_start_time': rules.earliest_start_time,
                'latest_end_time': rules.latest_end_time,
            }
        return None
