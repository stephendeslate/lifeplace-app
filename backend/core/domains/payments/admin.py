from django.contrib import admin
from django.core.exceptions import ValidationError
from .models import (
    PaymentSettings, Payment, PaymentGateway, PaymentMethod, PaymentTransaction,
    PaymentPlan, PaymentInstallment, TaxRate, Refund, Invoice,
    InvoiceLineItem, InvoiceTax, PaymentNotification
)


@admin.register(PaymentSettings)
class PaymentSettingsAdmin(admin.ModelAdmin):
    """Admin interface for global payment settings (singleton)"""

    def has_add_permission(self, request):
        """Prevent adding multiple settings instances"""
        return not PaymentSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        """Prevent deletion of payment settings"""
        return False

    def get_actions(self, request):
        """Remove delete action"""
        actions = super().get_actions(request)
        if 'delete_selected' in actions:
            del actions['delete_selected']
        return actions

    fieldsets = (
        ('Balance Due Settings', {
            'fields': ('balance_due_days',),
            'description': 'Configure when payment balance is due relative to event date'
        }),
        ('Grace Period Settings', {
            'fields': ('grace_period_days',),
            'description': 'Configure grace period before marking payments as overdue'
        }),
        ('Installment Defaults', {
            'fields': ('default_installments', 'default_installment_frequency'),
            'description': 'Default settings for payment plan installments'
        }),
        ('Late Fee Settings', {
            'fields': ('late_fee_enabled', 'default_late_fee_amount'),
            'description': 'Configure automatic late fee application'
        }),
        ('Deposit Settings', {
            'fields': ('default_deposit_percentage',),
            'description': 'Default deposit percentage for new bookings'
        }),
        ('Currency Settings', {
            'fields': ('default_currency',),
            'description': 'Default currency for payments and quotes'
        }),
        ('Auto Payment Retry Settings', {
            'fields': ('auto_payment_retry_attempts', 'auto_payment_retry_delay_days'),
            'description': 'Configure automatic retry behavior for failed payments',
            'classes': ('collapse',)
        }),
    )

    def changelist_view(self, request, extra_context=None):
        """Redirect to change view if settings exist"""
        if PaymentSettings.objects.exists():
            settings = PaymentSettings.objects.first()
            from django.shortcuts import redirect
            from django.urls import reverse
            return redirect(reverse('admin:payments_paymentsettings_change', args=[settings.pk]))
        return super().changelist_view(request, extra_context)


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


class PaymentInstallmentInline(admin.TabularInline):
    model = PaymentInstallment
    extra = 0
    readonly_fields = ('installment_number', 'description', 'paid_amount', 'remaining_amount', 'days_overdue_count')
    fields = ('installment_number', 'amount', 'due_date', 'status', 'description', 'late_fee_amount', 'reminder_count')


@admin.register(PaymentPlan)
class PaymentPlanAdmin(admin.ModelAdmin):
    list_display = ('event', 'status', 'total_amount', 'paid_amount', 'remaining_balance', 'number_of_installments', 'frequency', 'next_payment_date')
    list_filter = ('status', 'frequency', 'currency', 'auto_payment_enabled', 'terms_accepted')
    search_fields = ('event__id', 'event__client__email', 'event__client__first_name', 'event__client__last_name')
    readonly_fields = ('paid_amount', 'remaining_balance', 'is_overdue', 'completion_percentage', 'created_from_booking_session')
    inlines = [PaymentInstallmentInline]

    fieldsets = (
        ('Plan Details', {
            'fields': ('event', 'status', 'total_amount', 'currency', 'notes')
        }),
        ('Down Payment', {
            'fields': ('down_payment_amount', 'down_payment_due_date')
        }),
        ('Installments', {
            'fields': ('number_of_installments', 'frequency', 'next_payment_date', 'final_payment_date')
        }),
        ('Status & Progress', {
            'fields': ('paid_amount', 'remaining_balance', 'completion_percentage', 'is_overdue'),
            'classes': ('collapse',)
        }),
        ('Grace Period & Late Fees', {
            'fields': ('grace_period_days',),
            'classes': ('collapse',)
        }),
        ('Terms & Conditions', {
            'fields': ('terms_accepted', 'terms_accepted_at', 'terms_accepted_ip'),
            'classes': ('collapse',)
        }),
        ('Auto Payment', {
            'fields': ('auto_payment_enabled', 'auto_payment_method'),
            'classes': ('collapse',)
        }),
        ('Related Records', {
            'fields': ('quote', 'created_from_booking_session'),
            'classes': ('collapse',)
        })
    )

    actions = ['update_status', 'check_overdue', 'suspend_plans', 'reactivate_plans']

    def update_status(self, request, queryset):
        """Update payment plan statuses"""
        updated = 0
        for plan in queryset:
            plan.update_status()
            updated += 1
        self.message_user(request, f"Updated status for {updated} payment plans.")
    update_status.short_description = "Update payment plan statuses"

    def check_overdue(self, request, queryset):
        """Check for overdue installments"""
        from .services.payment_plan_service import PaymentPlanService
        count = PaymentPlanService.check_overdue_installments()
        self.message_user(request, f"Found {count} overdue installments.")
    check_overdue.short_description = "Check for overdue installments"

    def suspend_plans(self, request, queryset):
        """Suspend selected payment plans"""
        suspended = 0
        for plan in queryset.filter(status='ACTIVE'):
            plan.status = 'SUSPENDED'
            plan.save(update_fields=['status'])
            suspended += 1
        self.message_user(request, f"Suspended {suspended} payment plans.")
    suspend_plans.short_description = "Suspend payment plans"

    def reactivate_plans(self, request, queryset):
        """Reactivate suspended payment plans"""
        reactivated = 0
        for plan in queryset.filter(status='SUSPENDED'):
            plan.status = 'ACTIVE'
            plan.update_next_payment_date()
            plan.save(update_fields=['status', 'next_payment_date'])
            reactivated += 1
        self.message_user(request, f"Reactivated {reactivated} payment plans.")
    reactivate_plans.short_description = "Reactivate payment plans"


@admin.register(PaymentInstallment)
class PaymentInstallmentAdmin(admin.ModelAdmin):
    list_display = ('payment_plan', 'installment_number', 'amount', 'late_fee_amount', 'due_date', 'status', 'reminder_count', 'days_overdue_count')
    list_filter = ('status', 'due_date', 'late_fee_applied_date')
    search_fields = ('payment_plan__event__id', 'payment_plan__event__client__email', 'description')
    ordering = ('payment_plan', 'installment_number')
    readonly_fields = ('paid_amount', 'remaining_amount', 'is_fully_paid', 'days_overdue_count')

    fieldsets = (
        ('Installment Information', {
            'fields': ('payment_plan', 'installment_number', 'description', 'amount', 'due_date', 'status')
        }),
        ('Payment Status', {
            'fields': ('paid_amount', 'remaining_amount', 'is_fully_paid'),
            'classes': ('collapse',)
        }),
        ('Late Fees & Penalties', {
            'fields': ('late_fee_amount', 'late_fee_applied_date'),
            'classes': ('collapse',)
        }),
        ('Reminders & Communication', {
            'fields': ('reminder_count', 'last_reminder_sent'),
            'classes': ('collapse',)
        }),
        ('Overdue Tracking', {
            'fields': ('days_overdue_count',),
            'classes': ('collapse',)
        })
    )

    actions = ['send_reminders', 'apply_late_fees', 'mark_as_paid', 'waive_installments']

    def send_reminders(self, request, queryset):
        """Send payment reminders for selected installments"""
        sent = 0
        for installment in queryset.filter(status__in=['PENDING', 'OVERDUE']):
            installment.send_reminder()
            sent += 1
        self.message_user(request, f"Sent reminders for {sent} installments.")
    send_reminders.short_description = "Send payment reminders"

    def apply_late_fees(self, request, queryset):
        """Apply late fees to overdue installments"""
        applied = 0
        default_fee = 25.00  # Default late fee amount
        for installment in queryset.filter(status='OVERDUE', late_fee_amount=0):
            installment.apply_late_fee(default_fee)
            applied += 1
        self.message_user(request, f"Applied late fees to {applied} installments.")
    apply_late_fees.short_description = "Apply late fees (₱25.00)"

    def mark_as_paid(self, request, queryset):
        """Mark selected installments as paid"""
        marked = 0
        for installment in queryset.filter(status__in=['PENDING', 'OVERDUE', 'PARTIAL']):
            installment.mark_as_paid()
            marked += 1
        self.message_user(request, f"Marked {marked} installments as paid.")
    mark_as_paid.short_description = "Mark as paid"

    def waive_installments(self, request, queryset):
        """Waive selected installments"""
        waived = 0
        for installment in queryset.filter(status__in=['PENDING', 'OVERDUE']):
            installment.status = 'WAIVED'
            installment.save(update_fields=['status'])
            installment.payment_plan.update_status()
            waived += 1
        self.message_user(request, f"Waived {waived} installments.")
    waive_installments.short_description = "Waive installments"


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