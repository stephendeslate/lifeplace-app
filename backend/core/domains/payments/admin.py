from django.contrib import admin
from .models import (
    Payment, PaymentGateway, PaymentMethod, PaymentTransaction,
    PaymentPlan, PaymentInstallment, TaxRate, Refund, Invoice,
    InvoiceLineItem, InvoiceTax, PaymentNotification
)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_number', 'event', 'amount', 'currency', 'status', 'due_date', 'paid_on')
    list_filter = ('status', 'currency', 'is_manual', 'due_date', 'created_at')
    search_fields = ('payment_number', 'event__id', 'reference_number', 'description')
    readonly_fields = ('payment_number', 'receipt_number', 'receipt_generated_on')
    date_hierarchy = 'due_date'
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('payment_number', 'event', 'amount', 'currency', 'status')
        }),
        ('Dates', {
            'fields': ('due_date', 'paid_on')
        }),
        ('Payment Details', {
            'fields': ('payment_method', 'description', 'notes', 'reference_number')
        }),
        ('Processing', {
            'fields': ('is_manual', 'processed_by')
        }),
        ('Receipt', {
            'fields': ('receipt_number', 'receipt_generated_on', 'receipt_sent', 'receipt_sent_on', 'receipt_pdf'),
            'classes': ('collapse',)
        }),
        ('Related Records', {
            'fields': ('quote', 'invoice', 'installment'),
            'classes': ('collapse',)
        })
    )


@admin.register(PaymentGateway)
class PaymentGatewayAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('user', 'type', 'nickname', 'is_default', 'last_four', 'expiry_date')
    list_filter = ('type', 'is_default', 'gateway')
    search_fields = ('user__email', 'nickname', 'last_four')
    readonly_fields = ('token_reference',)


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('transaction_id', 'payment', 'gateway', 'amount', 'status', 'created_at')
    list_filter = ('status', 'gateway', 'currency', 'is_test')
    search_fields = ('transaction_id', 'payment__payment_number')
    readonly_fields = ('response_data',)
    date_hierarchy = 'created_at'


@admin.register(PaymentPlan)
class PaymentPlanAdmin(admin.ModelAdmin):
    list_display = ('event', 'total_amount', 'down_payment_amount', 'number_of_installments', 'frequency')
    list_filter = ('frequency', 'currency')
    search_fields = ('event__id',)
    
    fieldsets = (
        ('Plan Details', {
            'fields': ('event', 'total_amount', 'currency', 'notes')
        }),
        ('Down Payment', {
            'fields': ('down_payment_amount', 'down_payment_due_date')
        }),
        ('Installments', {
            'fields': ('number_of_installments', 'frequency')
        }),
        ('Related', {
            'fields': ('quote',),
            'classes': ('collapse',)
        })
    )


@admin.register(PaymentInstallment)
class PaymentInstallmentAdmin(admin.ModelAdmin):
    list_display = ('payment_plan', 'installment_number', 'amount', 'due_date', 'status')
    list_filter = ('status', 'due_date')
    search_fields = ('payment_plan__event__id', 'description')
    ordering = ('payment_plan', 'installment_number')


@admin.register(TaxRate)
class TaxRateAdmin(admin.ModelAdmin):
    list_display = ('name', 'rate', 'region', 'is_default')
    list_filter = ('is_default', 'region')
    search_fields = ('name', 'region')


@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ('payment', 'amount', 'status', 'refunded_by', 'created_at')
    list_filter = ('status', 'currency')
    search_fields = ('payment__payment_number', 'reason', 'refund_transaction_id')
    readonly_fields = ('gateway_response',)
    date_hierarchy = 'created_at'


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_id', 'client', 'total_amount', 'currency', 'status', 'issue_date', 'due_date')
    list_filter = ('status', 'currency', 'issue_date', 'due_date')
    search_fields = ('invoice_id', 'client__email', 'client__first_name', 'client__last_name')
    readonly_fields = ('invoice_id',)
    date_hierarchy = 'issue_date'
    
    fieldsets = (
        ('Invoice Information', {
            'fields': ('invoice_id', 'event', 'client', 'status')
        }),
        ('Amounts', {
            'fields': ('subtotal', 'tax_amount', 'total_amount', 'currency')
        }),
        ('Dates', {
            'fields': ('issue_date', 'due_date')
        }),
        ('Details', {
            'fields': ('notes', 'payment_terms')
        }),
        ('Related Records', {
            'fields': ('quote', 'invoice_pdf'),
            'classes': ('collapse',)
        })
    )


class InvoiceLineItemInline(admin.TabularInline):
    model = InvoiceLineItem
    extra = 0
    readonly_fields = ('total',)


@admin.register(InvoiceLineItem)
class InvoiceLineItemAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'description', 'quantity', 'unit_price', 'tax_rate', 'total')
    search_fields = ('invoice__invoice_id', 'description')
    readonly_fields = ('total',)


@admin.register(InvoiceTax)
class InvoiceTaxAdmin(admin.ModelAdmin):
    list_display = ('invoice', 'tax_rate', 'taxable_amount', 'tax_amount')
    search_fields = ('invoice__invoice_id',)


@admin.register(PaymentNotification)
class PaymentNotificationAdmin(admin.ModelAdmin):
    list_display = ('notification_type', 'sent_to', 'sent_at', 'is_successful')
    list_filter = ('notification_type', 'is_successful', 'sent_at')
    search_fields = ('sent_to', 'reference')
    date_hierarchy = 'sent_at'
    readonly_fields = ('sent_at',)


# Add inline to Invoice admin
InvoiceAdmin.inlines = [InvoiceLineItemInline]