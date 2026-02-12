# backend/core/domains/users/serializers.py
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .models import AdminInvitation, User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = ['phone', 'company', 'avatar', 'avatar_url', 'google_picture_url']
        extra_kwargs = {
            'avatar': {'write_only': True}
        }

    def validate_phone(self, value):
        if not value:
            return value
        from core.utils.validators import validate_phone_number, normalize_phone_number
        if not validate_phone_number(value):
            raise serializers.ValidationError(
                'Enter a valid phone number (e.g., 09123456789 or +639123456789).'
            )
        return normalize_phone_number(value) or value

    def get_avatar_url(self, obj):
        """Return the full URL for the avatar if it exists."""
        if obj.avatar and hasattr(obj.avatar, 'url'):
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.avatar.url)
            return obj.avatar.url
        # Fall back to Google picture if no uploaded avatar
        if obj.google_picture_url:
            return obj.google_picture_url
        return None


class AvatarUploadSerializer(serializers.Serializer):
    """Serializer for avatar upload endpoint."""
    avatar = serializers.ImageField(required=True)

    def validate_avatar(self, value):
        """Validate avatar file size and type."""
        # Max 5MB
        max_size = 5 * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError("Avatar image must be less than 5MB.")

        # Validate content type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                f"Invalid image type. Allowed types: {', '.join(allowed_types)}"
            )

        return value


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    admin_permissions = serializers.SerializerMethodField()
    is_full_admin = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'is_active', 'role',
                  'profile', 'date_joined', 'admin_permissions', 'is_full_admin']
        # SECURITY FIX (P0-B7): Added 'email' and 'role' to prevent privilege escalation
        read_only_fields = ['id', 'email', 'role', 'is_active', 'date_joined', 'admin_permissions', 'is_full_admin']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def get_admin_permissions(self, obj):
        """Return all admin permissions with current values."""
        return obj.get_all_permissions_dict()

    def get_is_full_admin(self, obj):
        """Return whether user is a full admin."""
        return obj.is_full_admin()

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', None)
        password = validated_data.pop('password', None)
        
        user = User.objects.create(**validated_data)
        
        if password:
            user.set_password(password)
            user.save()
            
        if profile_data:
            UserProfile.objects.create(user=user, **profile_data)
        else:
            # Create empty profile
            UserProfile.objects.create(user=user)
            
        return user
    
    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            if attr != 'password':
                setattr(instance, attr, value)
        
        # Update password if provided
        if 'password' in validated_data:
            instance.set_password(validated_data['password'])
            
        instance.save()
        
        # Update or create profile if data provided
        if profile_data:
            if hasattr(instance, 'profile') and instance.profile is not None:
                # Update existing profile
                for attr, value in profile_data.items():
                    setattr(instance.profile, attr, value)
                instance.profile.save()
            else:
                # Create new profile if it doesn't exist
                UserProfile.objects.create(user=instance, **profile_data)
            
        return instance


class UserCreateSerializer(UserSerializer):
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta(UserSerializer.Meta):
        fields = UserSerializer.Meta.fields + ['password', 'confirm_password']
    
    def validate(self, data):
        # Check that the two passwords match
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        
        # Validate password strength
        try:
            password_validation.validate_password(data['password'])
        except ValidationError as e:
            raise serializers.ValidationError({"password": list(e.messages)})
            
        return data
    
    def create(self, validated_data):
        # Remove confirm_password from the data
        validated_data.pop('confirm_password', None)
        return super().create(validated_data)


class AdminPermissionsSerializer(serializers.Serializer):
    """Serializer for admin permissions - used for creating/updating permissions."""
    can_manage_company_settings = serializers.BooleanField(required=False, default=False)
    can_manage_admins = serializers.BooleanField(required=False, default=False)
    can_manage_financial_settings = serializers.BooleanField(required=False, default=False)
    can_manage_payment_gateways = serializers.BooleanField(required=False, default=False)
    can_manage_workflows = serializers.BooleanField(required=False, default=False)
    can_manage_booking_flows = serializers.BooleanField(required=False, default=False)
    can_manage_templates = serializers.BooleanField(required=False, default=False)
    can_export_data = serializers.BooleanField(required=False, default=False)
    can_delete_records = serializers.BooleanField(required=False, default=False)


class PublicAdminInvitationSerializer(serializers.ModelSerializer):
    """Limited serializer for unauthenticated GET requests to invitation detail."""

    class Meta:
        model = AdminInvitation
        fields = ['id', 'first_name', 'last_name', 'is_accepted', 'expires_at']
        read_only_fields = ['id', 'first_name', 'last_name', 'is_accepted', 'expires_at']


class AdminInvitationSerializer(serializers.ModelSerializer):
    invited_by = serializers.StringRelatedField(read_only=True)
    permissions = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = AdminInvitation
        fields = ['id', 'email', 'first_name', 'last_name', 'invited_by',
                  'is_accepted', 'expires_at', 'created_at', 'permissions']
        read_only_fields = ['id', 'invited_by', 'is_accepted', 'expires_at', 'created_at']

    def validate_email(self, value):
        """
        Validate email for admin invitation

        New behavior (with upgrade support):
        - If user exists and is ADMIN → error (already admin)
        - If user exists and is CLIENT → allow (will create upgrade invitation)
        - If user doesn't exist → allow (will create new invitation)
        - If pending invitation exists → error (prevents duplicates)
        """
        # Check if there's an active invitation for this email
        # This check happens first to prevent duplicate pending invitations
        if AdminInvitation.objects.filter(email=value, is_accepted=False).exists():
            raise serializers.ValidationError("An invitation has already been sent to this email.")

        # Check if user exists
        try:
            existing_user = User.objects.get(email=value)
            # If user is already ADMIN, reject
            if existing_user.role == 'ADMIN':
                raise serializers.ValidationError("This user is already an administrator.")
            # If user is CLIENT, allow - service will create upgrade invitation
        except User.DoesNotExist:
            # User doesn't exist - allow, service will create new user invitation
            pass

        return value


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(style={'input_type': 'password'})
    remember_me = serializers.BooleanField(required=False, default=False)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, style={'input_type': 'password'})
    new_password = serializers.CharField(required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(required=True, style={'input_type': 'password'})
    
    def validate(self, data):
        # Check that the two passwords match
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        
        # Validate password strength
        try:
            password_validation.validate_password(data['new_password'])
        except ValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})
            
        return data