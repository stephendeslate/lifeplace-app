from django.contrib import admin
from .models import CommunicationTemplate, CommunicationRecord


@admin.register(CommunicationTemplate)
class CommunicationTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'channel', 'category', 'is_system', 'created_at', 'updated_at')
    list_filter = ('channel', 'category', 'is_system')
    search_fields = ('name', 'subject_template', 'body_template')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('name', 'channel', 'category', 'is_system')}),
        ('Template Content', {'fields': ('subject_template', 'body_template', 'variables_schema')}),
        ('Metadata', {'fields': ('created_at', 'updated_at')}),
    )

    def get_queryset(self, request):
        return super().get_queryset(request)


@admin.register(CommunicationRecord)
class CommunicationRecordAdmin(admin.ModelAdmin):
    list_display = ('template_name', 'recipient', 'channel', 'category', 'delivery_status', 'sent_at', 'is_opened', 'created_at')
    list_filter = ('channel', 'category', 'delivery_status', 'is_opened', 'sent_at')
    search_fields = ('template_name', 'recipient', 'subject', 'client__email', 'sent_by__email')
    date_hierarchy = 'sent_at'
    ordering = ('-created_at',)
    readonly_fields = ('id', 'created_at', 'updated_at', 'sent_at', 'delivered_at', 'opened_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('client', 'sent_by')
    
    def has_add_permission(self, request):
        return False  # Prevent manual creation of communication records in admin