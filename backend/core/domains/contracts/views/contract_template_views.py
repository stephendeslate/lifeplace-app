from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..serializers import (
    ContractTemplateCreateUpdateSerializer,
    ContractTemplateDetailSerializer,
    ContractTemplateSerializer,
    PreviewContractSerializer,
)
from ..services import ContractTemplateService


class ContractTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for contract templates
    """

    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        event_type_id = self.request.query_params.get("event_type", None)

        return ContractTemplateService.get_all_templates(search_query=None, event_type_id=event_type_id)

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ContractTemplateDetailSerializer
        if self.action in ["create", "update", "partial_update"]:
            return ContractTemplateCreateUpdateSerializer
        return ContractTemplateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        template = ContractTemplateService.create_template(serializer.validated_data)

        return Response(ContractTemplateDetailSerializer(template).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        template = ContractTemplateService.update_template(instance.id, serializer.validated_data)

        return Response(ContractTemplateDetailSerializer(template).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        ContractTemplateService.delete_template(instance.id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["get"])
    def for_event_type(self, request):
        """Get templates for a specific event type"""
        event_type_id = request.query_params.get("event_type", None)

        if not event_type_id:
            return Response({"detail": "Event type ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        templates = ContractTemplateService.get_all_templates(event_type_id=event_type_id)
        page = self.paginate_queryset(templates)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def preview(self, request, pk=None):
        """Preview a contract template with sample data"""
        template = self.get_object()
        serializer = PreviewContractSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        context_data = serializer.validated_data.get("context_data", {})
        event_id = serializer.validated_data.get("event_id", None)

        # Generate preview using the service with optional event context
        preview_data = ContractTemplateService.preview_template(template.id, context_data, event_id=event_id)

        return Response(preview_data)

    @action(detail=False, methods=["get"])
    def variable_schemas(self, request):
        """
        Get available variable schemas for contract templates.
        Returns grouped variables with descriptions that can be used in templates.
        Uses the new format with variable_groups structure for frontend compatibility.
        """
        # Contract templates have a single context type - all variables are always available
        context_types = {
            "CONTRACT": {
                "label": "Contract",
                "required_objects": ["event", "client"],
                "description": "Contract templates have access to all variables",
            }
        }

        # Variable groups in the new format matching communications
        variable_groups = {
            "event": {
                "label": "Event",
                "icon": "event",
                "available_in": ["CONTRACT"],
                "variables": {
                    "event_name": {"description": "Name of the event", "required": True},
                    "event_title": {"description": "Event title (alias for event_name)", "required": True},
                    "event_date": {"description": "Event date (formatted)", "required": True},
                    "event_type": {"description": "Type of event", "required": False},
                    "event_type_name": {"description": "Event type name", "required": False},
                    "venue": {"description": "Event venue/location", "required": False},
                    "location": {"description": "Event location (alias for venue)", "required": False},
                    "start_date": {"description": "Event start date", "required": True},
                    "end_date": {"description": "Event end date", "required": True},
                    "start_date_long": {"description": "Event start date (long format)", "required": True},
                    "end_date_long": {"description": "Event end date (long format)", "required": True},
                    "start_time": {"description": "Event start time", "required": False},
                    "end_time": {"description": "Event end time", "required": False},
                    "guest_count": {"description": "Number of guests", "required": False},
                },
            },
            "client": {
                "label": "Client",
                "icon": "person",
                "available_in": ["CONTRACT"],
                "variables": {
                    "client_name": {"description": "Full name of client", "required": True},
                    "client_full_name": {"description": "Client full name (alias)", "required": True},
                    "client_first_name": {"description": "Client first name", "required": True},
                    "client_last_name": {"description": "Client last name", "required": True},
                    "client_email": {"description": "Client email address", "required": True},
                    "client_phone": {"description": "Client phone number", "required": False},
                    "client_company": {"description": "Client company name", "required": False},
                    "client_address": {"description": "Client full address", "required": False},
                },
            },
            "financial": {
                "label": "Financial",
                "icon": "payments",
                "available_in": ["CONTRACT"],
                "variables": {
                    "total_price": {"description": "Total contract price", "required": True},
                    "total_amount": {"description": "Total amount (alias for total_price)", "required": True},
                    "contract_value": {"description": "Contract value (alias for total_price)", "required": True},
                    "total_price_formatted": {"description": "Formatted price with currency symbol", "required": True},
                    "subtotal": {"description": "Subtotal before tax", "required": True},
                    "subtotal_formatted": {"description": "Formatted subtotal with currency", "required": True},
                    "tax_amount": {"description": "Tax amount", "required": False},
                    "tax_amount_formatted": {"description": "Formatted tax with currency", "required": False},
                    "discount_amount": {"description": "Discount applied", "required": False},
                    "discount_amount_formatted": {"description": "Formatted discount with currency", "required": False},
                    "amount_due": {"description": "Amount currently due", "required": True},
                    "amount_paid": {"description": "Amount already paid", "required": True},
                    "amount_remaining": {"description": "Remaining balance", "required": True},
                    "deposit_amount": {"description": "Required deposit amount", "required": True},
                    "deposit_percentage": {"description": "Deposit percentage", "required": True},
                    "balance_amount": {"description": "Balance after deposit", "required": True},
                    "balance_due_date": {"description": "Date balance is due", "required": False},
                },
            },
            "contract": {
                "label": "Contract",
                "icon": "description",
                "available_in": ["CONTRACT"],
                "variables": {
                    "contract_date": {"description": "Date contract was created", "required": True},
                    "contract_date_long": {"description": "Contract date (long format)", "required": True},
                    "signature_date": {"description": "Date of signature", "required": False},
                    "signature_date_long": {"description": "Signature date (long format)", "required": False},
                    "today": {"description": "Today's date", "required": True},
                    "current_date": {"description": "Current date (ISO format)", "required": True},
                    "current_year": {"description": "Current year", "required": True},
                    "payment_terms": {"description": "Payment terms text", "required": True},
                    "cancellation_policy": {"description": "Cancellation policy text", "required": True},
                    "refund_policy_text": {"description": "Refund policy text", "required": False},
                    "services_description": {"description": "Description of services", "required": True},
                },
            },
            "signature": {
                "label": "Signature",
                "icon": "draw",
                "available_in": ["CONTRACT"],
                "variables": {
                    "SIGNATURE_CLIENT": {"description": "Client signature placeholder", "required": True},
                    "SIGNATURE_COMPANY_REP": {
                        "description": "Company representative signature placeholder",
                        "required": True,
                    },
                    "SIGNATURE_WITNESS": {"description": "Witness signature placeholder", "required": False},
                    "client_signer_name": {"description": "Name of client signer", "required": True},
                    "company_rep_signer_name": {"description": "Name of company representative", "required": True},
                    "witness_signer_name": {"description": "Name of witness", "required": False},
                    "client_signature_date": {"description": "Date client signed", "required": False},
                    "company_rep_signature_date": {"description": "Date company rep signed", "required": False},
                    "witness_signature_date": {"description": "Date witness signed", "required": False},
                },
            },
            "company": {
                "label": "Company",
                "icon": "business",
                "available_in": ["CONTRACT"],
                "variables": {
                    "company_name": {"description": "Official company name", "required": True},
                    "company_tagline": {"description": "Company tagline/slogan", "required": False},
                    "company_email": {"description": "Primary company email", "required": True},
                    "company_phone": {"description": "Company phone number", "required": False},
                    "company_support_email": {"description": "Support email address", "required": True},
                    "company_support_phone": {"description": "Support phone number", "required": False},
                    "company_address": {"description": "Full company address", "required": False},
                    "company_city": {"description": "Company city", "required": False},
                    "company_province": {"description": "Company province/state", "required": False},
                    "company_country": {"description": "Company country", "required": False},
                    "company_website": {"description": "Company website URL", "required": True},
                    "company_facebook": {"description": "Facebook page URL", "required": False},
                    "company_instagram": {"description": "Instagram profile URL", "required": False},
                    "bank_name": {"description": "Bank name for payments", "required": False},
                    "bank_account_name": {"description": "Bank account holder name", "required": False},
                    "bank_account_number": {"description": "Bank account number", "required": False},
                    "bank_branch": {"description": "Bank branch name", "required": False},
                    "bank_swift_code": {"description": "SWIFT/BIC code", "required": False},
                    "business_registration_number": {"description": "Business registration number", "required": False},
                    "vat_number": {"description": "VAT registration number", "required": False},
                    "invoice_terms": {"description": "Default invoice payment terms", "required": False},
                },
            },
            "urls": {
                "label": "Links",
                "icon": "link",
                "available_in": ["CONTRACT"],
                "variables": {
                    "dashboard_url": {"description": "Client dashboard URL", "required": True},
                    "login_link": {"description": "Login page URL", "required": True},
                    "support_link": {"description": "Support/help page URL", "required": True},
                    "payments_link": {"description": "Payments portal URL", "required": True},
                    "terms_of_service_link": {"description": "Terms of Service URL", "required": True},
                    "privacy_policy_link": {"description": "Privacy Policy URL", "required": True},
                    "event_link": {"description": "Event detail page URL", "required": False},
                    "event_contracts_link": {"description": "Event contracts tab URL", "required": False},
                    "event_documents_link": {"description": "Event documents tab URL", "required": False},
                },
            },
        }

        schemas = {
            "context_types": context_types,
            "variable_groups": variable_groups,
        }
        return Response(schemas)
