from django.contrib import admin
from .models import ClientInvitation


@admin.register(ClientInvitation)
class ClientInvitationAdmin(admin.ModelAdmin):
    list_display = ('client', 'invited_by', 'is_accepted', 'expires_at', 'is_expired', 'created_at')
    list_filter = ('is_accepted', 'expires_at')
    search_fields = ('client__email', 'invited_by__email')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('client', 'invited_by')
    
    def has_add_permission(self, request):
        return False  # Prevent manual creation of invitations in admin