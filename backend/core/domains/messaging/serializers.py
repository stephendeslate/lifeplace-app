from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework import serializers

from .models import Message, MessageAttachment, MessageReadStatus, MessageThread

User = get_user_model()


class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user info for messaging context"""

    display_name = serializers.CharField(source="get_display_name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email", "role", "display_name"]
        read_only_fields = ["id", "first_name", "last_name", "email", "role", "display_name"]


class MessageAttachmentSerializer(serializers.ModelSerializer):
    """Message attachment serializer"""

    file_url = serializers.CharField(read_only=True)

    class Meta:
        model = MessageAttachment
        fields = ["id", "filename", "file_url", "file_size", "file_type", "created_at"]
        read_only_fields = ["id", "file_url", "file_size", "file_type", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    """Message serializer with sender info and attachments"""

    sender = UserBasicSerializer(read_only=True)
    attachments = MessageAttachmentSerializer(many=True, read_only=True)
    read_by = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    # Convert UUID fields to string to ensure JSON serialization
    id = serializers.CharField(read_only=True)
    thread = serializers.CharField(source="thread.id", read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "thread",
            "sender",
            "content",
            "message_type",
            "is_internal_note",
            "attachments",
            "read_by",
            "created_at",
            "updated_at",
            "edited_at",
        ]
        read_only_fields = ["id", "sender", "created_at", "updated_at", "edited_at"]

    def create(self, validated_data):
        # Set sender from request context
        request = self.context.get("request")
        if request and request.user:
            validated_data["sender"] = request.user
        return super().create(validated_data)


class MessageCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for creating messages"""

    attachment_files = serializers.ListField(child=serializers.FileField(), write_only=True, required=False)

    class Meta:
        model = Message
        fields = ["thread", "content", "message_type", "is_internal_note", "attachment_files"]

    def validate_is_internal_note(self, value):
        """Only admin users can create internal notes"""
        request = self.context.get("request")
        if value and request and request.user.role != "ADMIN":
            raise serializers.ValidationError("Only admin users can create internal notes")
        return value

    def validate_attachment_files(self, value):
        """Validate attachment files for size and content type"""
        from django.core.exceptions import ValidationError as DjangoValidationError

        from core.utils.validators import validate_file_content

        if not value:
            return value

        # SECURITY FIX (P0-B11): Validate file content matches extension using magic numbers
        allowed_extensions = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png", ".gif", ".txt", ".csv"]
        max_size = 10 * 1024 * 1024  # 10MB per file

        for file_obj in value:
            # Check file size
            if file_obj.size > max_size:
                raise serializers.ValidationError(f"File '{file_obj.name}' exceeds maximum size of 10MB")
            # Validate content matches extension
            try:
                validate_file_content(file_obj, allowed_extensions=allowed_extensions)
            except DjangoValidationError as e:
                raise serializers.ValidationError(f"File '{file_obj.name}': {e.message}")

        return value

    def create(self, validated_data):
        attachment_files = validated_data.pop("attachment_files", [])
        request = self.context.get("request")

        # Set sender from request
        validated_data["sender"] = request.user

        # Create message
        message = super().create(validated_data)

        # Create attachments if any
        for file_obj in attachment_files:
            MessageAttachment.objects.create(message=message, file=file_obj, filename=file_obj.name)

        return message


class MessageThreadListSerializer(serializers.ModelSerializer):
    """Thread list serializer with computed fields for frontend compatibility"""

    client = UserBasicSerializer(read_only=True)
    assigned_admin = UserBasicSerializer(read_only=True)
    client_name = serializers.CharField(read_only=True)
    event_name = serializers.CharField(read_only=True)

    # Flattened last message fields
    last_message_content = serializers.SerializerMethodField()
    last_message_sender_name = serializers.SerializerMethodField()
    last_message_preview = serializers.SerializerMethodField()

    # Computed fields
    unread_count = serializers.SerializerMethodField()
    can_manage = serializers.SerializerMethodField()

    class Meta:
        model = MessageThread
        fields = [
            "id",
            "client",
            "event",
            "event_name",
            "client_name",
            "assigned_admin",
            "priority",
            "status",
            "subject",
            "last_message_at",
            "last_message_content",
            "last_message_sender_name",
            "last_message_preview",
            "unread_count",
            "can_manage",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "client_name",
            "event_name",
            "last_message_content",
            "last_message_sender_name",
            "last_message_preview",
            "unread_count",
            "can_manage",
            "created_at",
            "updated_at",
        ]

    def get_last_message_content(self, obj):
        """Get the content of the last message"""
        last_message = (
            obj.messages.filter(
                Q(is_internal_note=False) | Q(is_internal_note=True, sender__role="ADMIN")
                if self._is_admin_request()
                else Q(is_internal_note=False)
            )
            .order_by("-created_at")
            .first()
        )
        return last_message.content if last_message else ""

    def get_last_message_sender_name(self, obj):
        """Get the sender name of the last message"""
        last_message = (
            obj.messages.filter(
                Q(is_internal_note=False) | Q(is_internal_note=True, sender__role="ADMIN")
                if self._is_admin_request()
                else Q(is_internal_note=False)
            )
            .order_by("-created_at")
            .first()
        )
        return last_message.sender.get_display_name() if last_message else ""

    def get_last_message_preview(self, obj):
        """Get a preview of the last message (truncated)"""
        content = self.get_last_message_content(obj)
        return content[:100] + "..." if len(content) > 100 else content

    def get_unread_count(self, obj):
        """Get unread message count for the request user"""
        request = self.context.get("request")
        if not request or not request.user:
            return 0

        # Filter messages visible to user
        messages_query = obj.messages.all()
        if not self._is_admin_request():
            # Clients can't see internal notes
            messages_query = messages_query.filter(is_internal_note=False)

        # Count unread messages
        unread_count = messages_query.exclude(read_by=request.user).count()

        return unread_count

    def get_can_manage(self, obj):
        """Check if user can manage this thread"""
        request = self.context.get("request")
        if not request or not request.user:
            return False

        # Admins can manage all threads, clients can only view their own
        return request.user.role == "ADMIN" or obj.client == request.user

    def _is_admin_request(self):
        """Check if the request is from an admin user"""
        request = self.context.get("request")
        return request and request.user and request.user.role == "ADMIN"


class MessageThreadDetailSerializer(MessageThreadListSerializer):
    """Detailed thread serializer with messages"""

    messages = serializers.SerializerMethodField()

    class Meta(MessageThreadListSerializer.Meta):
        fields = [*MessageThreadListSerializer.Meta.fields, "messages"]

    def get_messages(self, obj):
        """Get messages for this thread, filtered by user permissions"""
        self.context.get("request")
        messages_query = obj.messages.all()

        # Filter internal notes for non-admin users
        if not self._is_admin_request():
            messages_query = messages_query.filter(is_internal_note=False)

        messages = messages_query.order_by("created_at")
        return MessageSerializer(messages, many=True, context=self.context).data


class MessageThreadCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new message threads"""

    initial_message = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = MessageThread
        fields = ["client", "event", "subject", "priority", "initial_message"]

    def validate_client(self, value):
        """Ensure client has CLIENT role"""
        if value.role != "CLIENT":
            raise serializers.ValidationError("Selected user must be a client")
        return value

    def validate(self, data):
        """Validate thread creation permissions"""
        request = self.context.get("request")

        # Only admins can create threads for other clients
        if request.user.role == "CLIENT":
            if data.get("client") != request.user:
                raise serializers.ValidationError("Clients can only create threads for themselves")

        return data

    def create(self, validated_data):
        initial_message = validated_data.pop("initial_message", None)
        request = self.context.get("request")

        # Set client to request user if they're a client
        if request.user.role == "CLIENT":
            validated_data["client"] = request.user

        # Create thread
        thread = super().create(validated_data)

        # Create initial message if provided
        if initial_message:
            Message.objects.create(thread=thread, sender=request.user, content=initial_message, message_type="text")

        return thread


class MessageThreadUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating message threads (admin only)"""

    class Meta:
        model = MessageThread
        fields = ["assigned_admin", "priority", "status", "subject"]

    def validate(self, data):
        """Only admins can update threads"""
        request = self.context.get("request")
        if request.user.role != "ADMIN":
            raise serializers.ValidationError("Only admin users can update threads")
        return data


class MessageReadStatusSerializer(serializers.ModelSerializer):
    """Serializer for message read status"""

    user = UserBasicSerializer(read_only=True)

    class Meta:
        model = MessageReadStatus
        fields = ["user", "read_at"]
        read_only_fields = ["user", "read_at"]


# Support Inquiry Serializers


class SupportInquiryCreateSerializer(serializers.ModelSerializer):
    """Serializer for clients creating support inquiries."""

    initial_message = serializers.CharField(write_only=True)

    class Meta:
        model = MessageThread
        fields = ["subject", "category", "event", "initial_message"]

    def validate(self, attrs):
        # Set thread_type to support
        attrs["thread_type"] = "support"
        return attrs

    def create(self, validated_data):
        initial_message = validated_data.pop("initial_message")
        user = self.context["request"].user
        validated_data["client"] = user
        validated_data["status"] = "active"

        thread = MessageThread.objects.create(**validated_data)

        # Create initial message
        Message.objects.create(thread=thread, sender=user, content=initial_message, message_type="text")

        return thread


class SupportInquiryListSerializer(serializers.ModelSerializer):
    """Serializer for listing support inquiries (client view)."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    event_name = serializers.CharField(source="event.name", read_only=True, allow_null=True)

    class Meta:
        model = MessageThread
        fields = [
            "id",
            "subject",
            "category",
            "category_display",
            "status",
            "status_display",
            "event",
            "event_name",
            "created_at",
            "updated_at",
            "last_message_at",
        ]
        read_only_fields = fields


class SupportInquiryDetailSerializer(SupportInquiryListSerializer):
    """Serializer for support inquiry detail with messages."""

    messages = serializers.SerializerMethodField()

    class Meta(SupportInquiryListSerializer.Meta):
        fields = [*list(SupportInquiryListSerializer.Meta.fields), "messages"]

    def get_messages(self, obj):
        # Exclude internal notes for clients
        messages = obj.messages.filter(is_internal_note=False).order_by("created_at")
        return MessageSerializer(messages, many=True, context=self.context).data


class AdminSupportInquiryListSerializer(serializers.ModelSerializer):
    """Serializer for admin support inquiry list."""

    client_name = serializers.SerializerMethodField()
    client_email = serializers.CharField(source="client.email", read_only=True)
    assigned_admin_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    event_name = serializers.CharField(source="event.name", read_only=True, allow_null=True)
    message_count = serializers.SerializerMethodField()

    class Meta:
        model = MessageThread
        fields = [
            "id",
            "subject",
            "category",
            "category_display",
            "status",
            "status_display",
            "priority",
            "client",
            "client_name",
            "client_email",
            "assigned_admin",
            "assigned_admin_name",
            "event",
            "event_name",
            "message_count",
            "created_at",
            "updated_at",
            "last_message_at",
        ]

    def get_client_name(self, obj):
        if obj.client:
            return obj.client.get_display_name()
        return None

    def get_assigned_admin_name(self, obj):
        if obj.assigned_admin:
            return obj.assigned_admin.get_display_name()
        return None

    def get_message_count(self, obj):
        return obj.messages.count()


class AdminSupportInquiryDetailSerializer(AdminSupportInquiryListSerializer):
    """Serializer for admin support inquiry detail with messages."""

    messages = serializers.SerializerMethodField()

    class Meta(AdminSupportInquiryListSerializer.Meta):
        fields = [*list(AdminSupportInquiryListSerializer.Meta.fields), "messages"]

    def get_messages(self, obj):
        # Admins can see all messages including internal notes
        messages = obj.messages.all().order_by("created_at")
        return MessageSerializer(messages, many=True, context=self.context).data


class AdminSupportInquiryUpdateSerializer(serializers.ModelSerializer):
    """Serializer for admin updating support inquiry."""

    internal_note = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = MessageThread
        fields = ["status", "priority", "assigned_admin", "internal_note"]

    def update(self, instance, validated_data):
        internal_note = validated_data.pop("internal_note", None)

        instance = super().update(instance, validated_data)

        # Create internal note if provided
        if internal_note:
            Message.objects.create(
                thread=instance,
                sender=self.context["request"].user,
                content=internal_note,
                message_type="text",
                is_internal_note=True,
            )

        return instance
