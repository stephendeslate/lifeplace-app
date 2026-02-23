# core/domains/security/serializers.py

from rest_framework import serializers

from .models import AffectedUser, BreachNotification, SecurityBreach


class BreachNotificationSerializer(serializers.ModelSerializer):
    """Serializer for breach notifications"""

    class Meta:
        model = BreachNotification
        fields = ["id", "notification_type", "recipient", "sent_at", "content", "delivery_status"]
        read_only_fields = ["id", "sent_at"]


class AffectedUserSerializer(serializers.ModelSerializer):
    """Serializer for affected users"""

    email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = AffectedUser
        fields = ["id", "user", "email", "data_exposed", "notified", "notified_at"]
        read_only_fields = ["id", "notified_at"]


class SecurityBreachListSerializer(serializers.ModelSerializer):
    """Serializer for breach list view (minimal fields)"""

    hours_since_detection = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = SecurityBreach
        fields = [
            "id",
            "breach_id",
            "title",
            "breach_type",
            "severity",
            "status",
            "detected_at",
            "affected_users_count",
            "involves_spi",
            "npc_notified",
            "hours_since_detection",
            "is_overdue",
        ]

    def get_hours_since_detection(self, obj):
        return round(obj.hours_since_detection(), 1)

    def get_is_overdue(self, obj):
        return obj.is_notification_overdue()


class SecurityBreachDetailSerializer(serializers.ModelSerializer):
    """Serializer for breach detail view (full fields)"""

    notifications = BreachNotificationSerializer(many=True, read_only=True)
    affected_users = AffectedUserSerializer(many=True, read_only=True)
    hours_since_detection = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    requires_notification = serializers.SerializerMethodField()
    incident_lead_name = serializers.CharField(source="incident_lead.get_full_name", read_only=True)

    class Meta:
        model = SecurityBreach
        fields = [
            "id",
            "breach_id",
            "title",
            "description",
            "breach_type",
            "severity",
            "status",
            "detected_at",
            "confirmed_at",
            "contained_at",
            "resolved_at",
            "affected_users_count",
            "affected_records_count",
            "involves_spi",
            "data_types_affected",
            "attack_vector",
            "vulnerabilities_exploited",
            "containment_actions",
            "remediation_steps",
            "prevention_measures",
            "npc_notified",
            "npc_notified_at",
            "npc_reference_number",
            "users_notified",
            "users_notified_at",
            "incident_lead",
            "incident_lead_name",
            "hours_since_detection",
            "is_overdue",
            "requires_notification",
            "notifications",
            "affected_users",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "breach_id", "created_at", "updated_at", "npc_notified_at", "users_notified_at"]

    def get_hours_since_detection(self, obj):
        return round(obj.hours_since_detection(), 1)

    def get_is_overdue(self, obj):
        return obj.is_notification_overdue()

    def get_requires_notification(self, obj):
        return obj.requires_notification()


class SecurityBreachCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new breach"""

    class Meta:
        model = SecurityBreach
        fields = [
            "title",
            "description",
            "breach_type",
            "severity",
            "detected_at",
            "data_types_affected",
            "involves_spi",
            "attack_vector",
            "incident_lead",
        ]

    def create(self, validated_data):
        from .services import BreachNotificationService

        return BreachNotificationService.create_breach(
            title=validated_data.get("title"),
            description=validated_data.get("description"),
            breach_type=validated_data.get("breach_type"),
            severity=validated_data.get("severity"),
            detected_at=validated_data.get("detected_at"),
        )


class SecurityBreachUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating a breach"""

    class Meta:
        model = SecurityBreach
        fields = [
            "title",
            "description",
            "breach_type",
            "severity",
            "status",
            "confirmed_at",
            "contained_at",
            "resolved_at",
            "affected_users_count",
            "affected_records_count",
            "involves_spi",
            "data_types_affected",
            "attack_vector",
            "vulnerabilities_exploited",
            "containment_actions",
            "remediation_steps",
            "prevention_measures",
            "npc_reference_number",
            "incident_lead",
        ]


class NotifyNPCSerializer(serializers.Serializer):
    """Serializer for NPC notification action"""

    confirm = serializers.BooleanField(help_text="Set to true to confirm sending notification")


class NotifyUsersSerializer(serializers.Serializer):
    """Serializer for user notification action"""

    confirm = serializers.BooleanField(help_text="Set to true to confirm sending notifications")
    user_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="Optional: Specific user IDs to notify. If empty, notifies all affected users.",
    )
