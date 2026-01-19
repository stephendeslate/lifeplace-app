from django.contrib import admin
from .models import CommunicationTemplate, CommunicationRecord, EmailLayout, EmailLayoutHistory


@admin.register(EmailLayout)
class EmailLayoutAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_default', 'is_active', 'template_count', 'primary_color', 'created_at', 'updated_at')
    list_filter = ('is_default', 'is_active')
    search_fields = ('name', 'description')
    readonly_fields = ('created_at', 'updated_at', 'template_count')
    fieldsets = (
        (None, {'fields': ('name', 'description', 'is_default', 'is_active')}),
        ('Theme', {'fields': ('primary_color', 'secondary_color', 'logo_url')}),
        ('Templates', {'fields': ('header_template', 'footer_template', 'wrapper_template', 'base_styles'), 'classes': ('collapse',)}),
        ('Metadata', {'fields': ('created_at', 'updated_at', 'template_count')}),
    )

    def template_count(self, obj):
        return obj.templates.count()
    template_count.short_description = 'Templates Using This Layout'


@admin.register(EmailLayoutHistory)
class EmailLayoutHistoryAdmin(admin.ModelAdmin):
    list_display = ('layout', 'version', 'reason', 'changed_by', 'created_at')
    list_filter = ('reason', 'layout')
    search_fields = ('layout__name', 'notes')
    readonly_fields = ('layout', 'version', 'name', 'header_template', 'footer_template', 'wrapper_template',
                       'base_styles', 'primary_color', 'secondary_color', 'logo_url', 'reason', 'notes',
                       'changed_by', 'created_at')
    ordering = ('-created_at',)

    def has_add_permission(self, request):
        return False  # History entries are created programmatically

    def has_change_permission(self, request, obj=None):
        return False  # History should be immutable


@admin.register(CommunicationTemplate)
class CommunicationTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'channel', 'category', 'layout', 'is_system', 'created_at', 'updated_at')
    list_filter = ('channel', 'category', 'is_system', 'layout')
    search_fields = ('name', 'subject_template', 'body_template')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        (None, {'fields': ('name', 'channel', 'category', 'is_system', 'layout')}),
        ('Template Content', {'fields': ('subject_template', 'body_template')}),
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