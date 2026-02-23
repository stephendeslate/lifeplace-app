from django.contrib import admin

from .models import (
    ContractAmendment,
    ContractDocument,
    ContractNote,
    ContractSignature,
    ContractTemplate,
    EventContract,
)


@admin.register(ContractTemplate)
class ContractTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "event_type",
        "is_active",
        "requires_signature",
        "requires_witness",
        "requires_company_signature",
        "allows_amendments",
        "created_at",
    )
    list_filter = (
        "is_active",
        "requires_signature",
        "requires_witness",
        "requires_company_signature",
        "allows_amendments",
        "event_type",
    )
    search_fields = ("name", "description", "content")
    list_editable = (
        "is_active",
        "requires_signature",
        "requires_witness",
        "requires_company_signature",
        "allows_amendments",
    )
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("name", "description", "event_type", "is_active")}),
        ("Content", {"fields": ("content", "variables", "sections")}),
        (
            "Signature Requirements",
            {
                "fields": (
                    "requires_signature",
                    "requires_witness",
                    "requires_company_signature",
                    "signature_requirements",
                )
            },
        ),
        ("Amendment Settings", {"fields": ("allows_amendments", "amendment_requires_signature")}),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


class ContractSignatureInline(admin.TabularInline):
    model = ContractSignature
    extra = 1
    readonly_fields = ("signed_at", "created_at", "updated_at")
    fields = (
        "signer",
        "role",
        "signer_name",
        "signer_email",
        "signer_title",
        "signature_data",
        "is_verified",
        "signed_at",
    )


class ContractDocumentInline(admin.TabularInline):
    model = ContractDocument
    extra = 1
    readonly_fields = ("created_at", "updated_at")
    fields = ("name", "description", "document_type", "file", "version", "is_active", "uploaded_by")


class ContractNoteInline(admin.TabularInline):
    model = ContractNote
    extra = 1
    readonly_fields = ("created_at", "updated_at")
    fields = ("note", "category", "is_internal", "created_by")


@admin.register(EventContract)
class EventContractAdmin(admin.ModelAdmin):
    list_display = (
        "event",
        "template",
        "status",
        "contract_value",
        "currency",
        "sent_at",
        "fully_signed_at",
        "is_amendment",
        "amendment_number",
    )
    list_filter = ("status", "currency", "is_amendment", "template")
    search_fields = ("event__id", "template__name", "content")
    readonly_fields = ("created_at", "updated_at", "fully_signed_at")
    list_editable = ("status",)
    date_hierarchy = "created_at"
    fieldsets = (
        (None, {"fields": ("event", "template", "status")}),
        ("Contract Details", {"fields": ("content", "contract_value", "currency", "payment_schedule_reference")}),
        ("Dates", {"fields": ("sent_at", "fully_signed_at", "valid_until")}),
        ("Amendment Information", {"fields": ("is_amendment", "original_contract", "amendment_number")}),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
    inlines = [
        ContractSignatureInline,
        ContractDocumentInline,
        ContractNoteInline,
    ]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("event", "template", "original_contract")


@admin.register(ContractSignature)
class ContractSignatureAdmin(admin.ModelAdmin):
    list_display = ("contract", "signer", "role", "signer_name", "signer_email", "signed_at", "is_verified")
    list_filter = ("role", "is_verified", "legal_disclosure_accepted", "signature_intent_confirmed")
    search_fields = ("signer_name", "signer_email", "contract__event__id")
    readonly_fields = ("signed_at", "created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("contract", "signer", "role", "signature_data")}),
        ("Signer Information", {"fields": ("signer_name", "signer_email", "signer_title")}),
        ("Verification", {"fields": ("is_verified", "verification_method", "signature_confidence_score")}),
        ("Security", {"fields": ("ip_address", "user_agent", "device_fingerprint", "signature_metadata")}),
        (
            "Legal Compliance",
            {"fields": ("legal_disclosure_accepted", "electronic_consent_timestamp", "signature_intent_confirmed")},
        ),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(ContractAmendment)
class ContractAmendmentAdmin(admin.ModelAdmin):
    list_display = ("original_contract", "status", "requested_by", "requested_at", "requires_new_signatures")
    list_filter = ("status", "requires_new_signatures")
    search_fields = ("original_contract__event__id", "amendment_reason", "changes_description")
    readonly_fields = ("requested_at", "created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("original_contract", "amendment_contract", "status")}),
        ("Amendment Details", {"fields": ("amendment_reason", "changes_description", "section_changes")}),
        ("Value Changes", {"fields": ("original_value", "new_value", "value_change")}),
        ("Workflow", {"fields": ("requested_by", "requested_at", "reviewed_by", "reviewed_at", "review_notes")}),
        ("Signature Requirements", {"fields": ("requires_new_signatures", "signature_deadline")}),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(ContractDocument)
class ContractDocumentAdmin(admin.ModelAdmin):
    list_display = ("name", "contract", "document_type", "version", "is_active", "uploaded_by", "created_at")
    list_filter = ("document_type", "is_active")
    search_fields = ("name", "description", "contract__event__id")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("contract", "name", "document_type", "file")}),
        ("Details", {"fields": ("description", "version", "is_active", "uploaded_by")}),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )


@admin.register(ContractNote)
class ContractNoteAdmin(admin.ModelAdmin):
    list_display = ("contract", "category", "is_internal", "created_by", "created_at")
    list_filter = ("category", "is_internal")
    search_fields = ("note", "contract__event__id")
    readonly_fields = ("created_at", "updated_at")
    fieldsets = (
        (None, {"fields": ("contract", "note", "category", "is_internal", "created_by")}),
        ("Metadata", {"fields": ("created_at", "updated_at"), "classes": ("collapse",)}),
    )
