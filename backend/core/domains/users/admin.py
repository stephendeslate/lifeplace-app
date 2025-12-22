from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserProfile, AdminInvitation, ConsentRecord, PrivacyRequest


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'get_display_name', 'role', 'is_staff', 'is_superuser', 'is_active')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('email',)
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name')}),
        ('Permissions', {'fields': ('role', 'is_active', 'is_staff', 'is_superuser')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'password1', 'password2', 'role', 'first_name', 'last_name'),
        }),
    )
    readonly_fields = ('last_login', 'date_joined')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('profile')


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'phone', 'company', 'created_at', 'updated_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'phone', 'company')
    readonly_fields = ('created_at', 'updated_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user')


@admin.register(AdminInvitation)
class AdminInvitationAdmin(admin.ModelAdmin):
    list_display = ('email', 'first_name', 'last_name', 'invited_by', 'is_accepted', 'expires_at', 'is_expired', 'created_at')
    list_filter = ('is_accepted', 'expires_at')
    search_fields = ('email', 'first_name', 'last_name', 'invited_by__email')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('invited_by')

    def has_add_permission(self, request):
        return False  # Prevent manual creation of invitations in admin


@admin.register(ConsentRecord)
class ConsentRecordAdmin(admin.ModelAdmin):
    list_display = ['user', 'consent_type', 'action', 'source', 'created_at']
    list_filter = ['consent_type', 'action', 'source']
    search_fields = ['user__email']
    readonly_fields = [
        'user', 'consent_type', 'action', 'consent_text', 'privacy_policy_version',
        'source', 'ip_address', 'user_agent', 'device_type', 'created_at', 'updated_at'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

    def has_add_permission(self, request):
        return False  # Consent records are created programmatically

    def has_delete_permission(self, request, obj=None):
        return False  # Consent records are immutable

    def has_change_permission(self, request, obj=None):
        return False  # Consent records are immutable


@admin.register(PrivacyRequest)
class PrivacyRequestAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user_email', 'request_type', 'status',
        'created_at', 'processed_at', 'is_overdue_display'
    ]
    list_filter = ['request_type', 'status']
    search_fields = ['user_email', 'id']
    readonly_fields = [
        'id', 'user', 'user_email', 'request_type', 'request_data',
        'response_data', 'deletion_summary', 'ip_address', 'user_agent',
        'created_at', 'updated_at'
    ]
    date_hierarchy = 'created_at'
    ordering = ['-created_at']

    fieldsets = (
        ('Request Information', {
            'fields': ('id', 'user', 'user_email', 'request_type', 'status')
        }),
        ('Request Details', {
            'fields': ('request_data',)
        }),
        ('Response', {
            'fields': ('response_data', 'rejection_reason', 'deletion_summary')
        }),
        ('Processing', {
            'fields': ('processed_at', 'processed_by')
        }),
        ('Audit', {
            'fields': ('ip_address', 'user_agent', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def is_overdue_display(self, obj):
        if obj.is_overdue():
            return f"Yes ({obj.days_since_submission()} days)"
        return "No"
    is_overdue_display.short_description = 'Overdue'

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('user', 'processed_by')