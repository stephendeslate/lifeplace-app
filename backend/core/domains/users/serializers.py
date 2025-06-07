# backend/core/domains/users/serializers.py
from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError
from rest_framework import serializers

from .models import AdminInvitation, User, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['phone', 'company']


class UserSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'is_active', 'role', 'profile', 'date_joined']
        read_only_fields = ['id', 'is_active', 'date_joined']
        extra_kwargs = {
            'password': {'write_only': True}
        }

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


class AdminInvitationSerializer(serializers.ModelSerializer):
    invited_by = serializers.StringRelatedField(read_only=True)
    
    class Meta:
        model = AdminInvitation
        fields = ['id', 'email', 'first_name', 'last_name', 'invited_by', 
                  'is_accepted', 'expires_at', 'created_at']
        read_only_fields = ['id', 'invited_by', 'is_accepted', 'expires_at', 'created_at']
        
    def validate_email(self, value):
        # Check if user with email already exists
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
            
        # Check if there's an active invitation for this email
        if AdminInvitation.objects.filter(email=value, is_accepted=False).exists():
            raise serializers.ValidationError("An invitation has already been sent to this email.")
            
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