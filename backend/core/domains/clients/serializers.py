# backend/core/domains/clients/serializers.py
from core.domains.events.serializers import EventSerializer
from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

class ClientProfileSerializer(serializers.Serializer):
    """Serializer for client profile data"""
    phone = serializers.CharField(allow_blank=True, required=False)
    company = serializers.CharField(allow_blank=True, required=False)


class ClientListSerializer(serializers.ModelSerializer):
    """Serializer for client list view"""
    profile = ClientProfileSerializer(required=False)
    has_account = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 
            'profile', 'date_joined', 'is_active', 'has_account'
        ]
        read_only_fields = ['id', 'date_joined', 'email', 'has_account']
        
    def get_has_account(self, obj):
        # Check if the user has a valid password set
        # Use Django's built-in method to check for usable password
        return obj.has_usable_password()


class ClientDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for client data"""
    profile = ClientProfileSerializer(required=False)
    events = EventSerializer(many=True, read_only=True)
    has_account = serializers.SerializerMethodField()  # ADD THIS FIELD
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 
            'profile', 'date_joined', 'is_active', 'events', 'has_account'  # ADD has_account
        ]
        read_only_fields = ['id', 'date_joined', 'email', 'events', 'has_account']
    
    def get_has_account(self, obj):  # ADD THIS METHOD
        # Check if the user has a valid password set
        return obj.has_usable_password()


class ClientCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating clients"""
    profile = ClientProfileSerializer(required=False)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name',
            'profile', 'password', 'is_active'
        ]
        # SECURITY FIX (P0-B14): Prevent mass assignment of sensitive fields
        read_only_fields = ['id']

    # SECURITY FIX (P0-B14): Whitelist of fields that can be updated
    ALLOWED_UPDATE_FIELDS = {'first_name', 'last_name', 'is_active'}

    def validate(self, data):
        """
        SECURITY FIX (P0-B14): Strip any fields that could be used for privilege escalation.
        """
        # Remove any sensitive fields that should never be set via API
        sensitive_fields = ['role', 'is_staff', 'is_superuser', 'admin_permissions']
        for field in sensitive_fields:
            data.pop(field, None)
        return data

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)

        # SECURITY: Force role to CLIENT - never trust user input for role
        validated_data['role'] = 'CLIENT'
        validated_data['is_staff'] = False
        validated_data['is_superuser'] = False

        # Create user
        user = User.objects.create_user(**validated_data)

        # Handle password properly
        if password:
            # Set usable password
            user.set_password(password)
        else:
            # Set unusable password for clients without accounts
            user.set_unusable_password()

        user.save()

        # Create or update profile
        if profile_data and hasattr(user, 'profile'):
            for key, value in profile_data.items():
                setattr(user.profile, key, value)
            user.profile.save()

        return user

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)

        # SECURITY FIX (P0-B14): Only update explicitly allowed fields
        # This prevents mass assignment of sensitive fields like role, is_staff, etc.
        for key, value in validated_data.items():
            if key in self.ALLOWED_UPDATE_FIELDS:
                setattr(instance, key, value)

        # Update password if provided
        if password:
            instance.set_password(password)

        instance.save()

        # Update profile if it exists (profile fields are already validated)
        if profile_data and hasattr(instance, 'profile'):
            allowed_profile_fields = {'phone', 'company'}
            for key, value in profile_data.items():
                if key in allowed_profile_fields:
                    setattr(instance.profile, key, value)
            instance.profile.save()

        return instance


class ClientInvitationSerializer(serializers.Serializer):
    """Serializer for sending a client invitation"""
    client_id = serializers.IntegerField()


class ClientInvitationDetailSerializer(serializers.Serializer):
    """Serializer for client invitation details"""
    id = serializers.UUIDField(format='hex_verbose')
    client = serializers.CharField(source='client.email')
    client_name = serializers.SerializerMethodField()
    invited_by = serializers.CharField(source='invited_by.email')
    is_accepted = serializers.BooleanField()
    expires_at = serializers.DateTimeField()
    created_at = serializers.DateTimeField()
    
    def get_client_name(self, obj):
        client = obj.client
        return f"{client.first_name} {client.last_name}".strip() or client.email


class AcceptClientInvitationSerializer(serializers.Serializer):
    """Serializer for accepting a client invitation"""
    password = serializers.CharField(min_length=8, write_only=True)
    confirm_password = serializers.CharField(min_length=8, write_only=True)
    
    def validate(self, data):
        """Validate that passwords match"""
        if data.get('password') != data.get('confirm_password'):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return data