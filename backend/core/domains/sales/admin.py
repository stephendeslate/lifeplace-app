from django.contrib import admin
from .models import (
    EventQuote, QuoteTemplate, QuoteTemplateProduct, QuoteLineItem,
    QuoteOption, QuoteOptionItem, QuoteActivity, QuoteReminder
)


class QuoteLineItemInline(admin.TabularInline):
    model = QuoteLineItem
    extra = 0
    readonly_fields = ('total',)


class QuoteOptionInline(admin.TabularInline):
    model = QuoteOption
    extra = 0
    readonly_fields = ('total_price',)


class QuoteOptionItemInline(admin.TabularInline):
    model = QuoteOptionItem
    extra = 0
    readonly_fields = ('total',)


@admin.register(EventQuote)
class EventQuoteAdmin(admin.ModelAdmin):
    list_display = ('event', 'version', 'status', 'total_amount', 'valid_until', 'sent_at', 'accepted_at')
    list_filter = ('status', 'sent_at', 'accepted_at', 'valid_until', 'created_at')
    search_fields = ('event__id', 'event__title', 'event__client__email', 'notes')
    readonly_fields = ('sent_at', 'accepted_at', 'rejected_at', 'signature_data')
    date_hierarchy = 'created_at'
    ordering = ('-created_at', '-version')
    
    fieldsets = (
        ('Quote Information', {
            'fields': ('event', 'template', 'version', 'status', 'created_by')
        }),
        ('Financial Details', {
            'fields': ('subtotal', 'discount_amount', 'tax_amount', 'total_amount', 'discount')
        }),
        ('Validity', {
            'fields': ('valid_until',)
        }),
        ('Status Tracking', {
            'fields': ('sent_at', 'accepted_at', 'rejected_at', 'rejection_reason'),
            'classes': ('collapse',)
        }),
        ('Content', {
            'fields': ('notes', 'terms_and_conditions', 'client_message'),
            'classes': ('collapse',)
        }),
        ('Files & Signature', {
            'fields': ('pdf_file', 'signature_data'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [QuoteLineItemInline, QuoteOptionInline]
    
    actions = ['mark_as_sent', 'mark_as_accepted']
    
    def mark_as_sent(self, request, queryset):
        for quote in queryset:
            if quote.status == 'DRAFT':
                quote.send_to_client(request.user)
        self.message_user(request, f"Marked {queryset.count()} quotes as sent.")
    mark_as_sent.short_description = "Mark selected quotes as sent"
    
    def mark_as_accepted(self, request, queryset):
        for quote in queryset:
            if quote.status == 'SENT':
                quote.accept()
        self.message_user(request, f"Marked {queryset.count()} quotes as accepted.")
    mark_as_accepted.short_description = "Mark selected quotes as accepted"


class QuoteTemplateProductInline(admin.TabularInline):
    model = QuoteTemplateProduct
    extra = 0


@admin.register(QuoteTemplate)
class QuoteTemplateAdmin(admin.ModelAdmin):
    list_display = ('name', 'event_type', 'is_active', 'default_validity_days', 'has_multiple_options')
    list_filter = ('is_active', 'event_type', 'has_multiple_options')
    search_fields = ('name', 'introduction')
    filter_horizontal = ('contract_templates', 'questionnaires')
    
    fieldsets = (
        ('Template Information', {
            'fields': ('name', 'event_type', 'is_active')
        }),
        ('Content', {
            'fields': ('introduction', 'terms_and_conditions')
        }),
        ('Configuration', {
            'fields': ('default_validity_days', 'has_multiple_options', 'default_tax_rate')
        }),
        ('Related Templates', {
            'fields': ('contract_templates', 'questionnaires', 'workflow_template'),
            'classes': ('collapse',)
        })
    )
    
    inlines = [QuoteTemplateProductInline]


@admin.register(QuoteTemplateProduct)
class QuoteTemplateProductAdmin(admin.ModelAdmin):
    list_display = ('template', 'product', 'quantity', 'is_required')
    list_filter = ('is_required', 'template')
    search_fields = ('template__name', 'product__name')


@admin.register(QuoteLineItem)
class QuoteLineItemAdmin(admin.ModelAdmin):
    list_display = ('quote', 'description', 'quantity', 'unit_price', 'tax_rate', 'total')
    list_filter = ('tax_rate', 'product')
    search_fields = ('quote__event__id', 'description', 'product__name')
    readonly_fields = ('total',)


@admin.register(QuoteOption)
class QuoteOptionAdmin(admin.ModelAdmin):
    list_display = ('quote', 'name', 'total_price', 'is_selected')
    list_filter = ('is_selected',)
    search_fields = ('quote__event__id', 'name', 'description')
    readonly_fields = ('total_price',)
    
    inlines = [QuoteOptionItemInline]


@admin.register(QuoteOptionItem)
class QuoteOptionItemAdmin(admin.ModelAdmin):
    list_display = ('option', 'description', 'quantity', 'unit_price', 'total')
    search_fields = ('option__name', 'description', 'product__name')
    readonly_fields = ('total',)


@admin.register(QuoteActivity)
class QuoteActivityAdmin(admin.ModelAdmin):
    list_display = ('quote', 'action', 'action_by', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('quote__event__id', 'notes', 'action_by__email')
    readonly_fields = ('created_at',)
    date_hierarchy = 'created_at'


@admin.register(QuoteReminder)
class QuoteReminderAdmin(admin.ModelAdmin):
    list_display = ('quote', 'scheduled_date', 'is_sent', 'sent_at')
    list_filter = ('is_sent', 'scheduled_date')
    search_fields = ('quote__event__id', 'message')
    readonly_fields = ('sent_at',)
    date_hierarchy = 'scheduled_date'