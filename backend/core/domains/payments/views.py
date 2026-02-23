# backend/core/domains/payments/views.py
import logging

from django.db import models
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils.pagination import StandardResultsSetPagination
from core.utils.permissions import IsAdmin

from .cache_service import payments_cache_service
from .models import (
    Invoice,
    InvoiceLineItem,
    InvoiceTax,
    Payment,
    PaymentGateway,
    PaymentMethod,
    PaymentNotification,
    PaymentSettings,
    PaymentTransaction,
    Refund,
    TaxRate,
)
from .serializers import (
    InvoiceLineItemSerializer,
    InvoiceSerializer,
    InvoiceTaxSerializer,
    PaymentGatewayAdminSerializer,
    PaymentGatewaySerializer,
    PaymentMethodSerializer,
    PaymentNotificationSerializer,
    PaymentSerializer,
    PaymentSettingsSerializer,
    PaymentTransactionSerializer,
    RefundSerializer,
    SetupIntentResponseSerializer,
    TaxRateSerializer,
)
from .services import (
    PaymentGatewayService,
    PaymentMethodService,
    PaymentService,
    TaxRateService,
)
from .services.unified_webhook_processor import UnifiedWebhookProcessor

logger = logging.getLogger(__name__)


class PaymentSettingsViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment settings (singleton pattern)"""

    queryset = PaymentSettings.objects.all()
    serializer_class = PaymentSettingsSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        """Always return the single settings instance"""
        # Ensure settings exist
        settings = PaymentSettings.get_default_settings()
        return PaymentSettings.objects.filter(id=settings.id)

    def list(self, request, *args, **kwargs):
        """Return the single settings instance as a list with one item"""
        settings = PaymentSettings.get_default_settings()
        serializer = self.get_serializer(settings)
        return Response([serializer.data])

    def retrieve(self, request, *args, **kwargs):
        """Retrieve the settings instance, creating it if it doesn't exist"""
        settings = PaymentSettings.get_default_settings()
        serializer = self.get_serializer(settings)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Prevent creation of new instances"""
        return Response(
            {"detail": "Payment settings already exists. Use PUT/PATCH to update."}, status=status.HTTP_400_BAD_REQUEST
        )

    def update(self, request, *args, **kwargs):
        """Update the singleton settings instance"""
        settings = PaymentSettings.get_default_settings()
        serializer = self.get_serializer(settings, data=request.data, partial=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info(f"Payment settings updated by user {request.user.id}")
        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """Partially update the singleton settings instance"""
        settings = PaymentSettings.get_default_settings()
        serializer = self.get_serializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        logger.info(f"Payment settings partially updated by user {request.user.id}")
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        """Prevent deletion of settings"""
        return Response({"detail": "Payment settings cannot be deleted."}, status=status.HTTP_400_BAD_REQUEST)


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payments"""

    queryset = Payment.objects.select_related(
        "event",
        "event__client",
        "event__event_type",
        "payment_method",
        "payment_method__gateway",
        "payment_method__user",
        "processed_by",
        "quote",
        "invoice",
    ).prefetch_related("transactions", "notifications", "refunds")
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = super().get_queryset().order_by("-created_at")

        # Apply filters
        event_id = self.request.query_params.get("event", None)
        status_filter = self.request.query_params.get("status", None)
        start_date = self.request.query_params.get("start_date", None)
        end_date = self.request.query_params.get("end_date", None)
        search = self.request.query_params.get("search", None)
        payment_method = self.request.query_params.get("payment_method", None)
        is_manual = self.request.query_params.get("is_manual", None)
        amount_min = self.request.query_params.get("amount_min", None)
        amount_max = self.request.query_params.get("amount_max", None)

        # Try cache for event-specific payments
        if event_id and not any(
            [status_filter, start_date, end_date, search, payment_method, is_manual, amount_min, amount_max]
        ):
            cached_payments = payments_cache_service.get_cached_payments_by_event(int(event_id))
            if cached_payments is not None:
                logger.debug(f"Payments for event {event_id} served from cache")
                return queryset.filter(event_id=event_id)

        # Try cache for status-specific payments
        if status_filter and not any(
            [event_id, start_date, end_date, search, payment_method, is_manual, amount_min, amount_max]
        ):
            cached_payments = payments_cache_service.get_cached_payments_by_status(status_filter)
            if cached_payments is not None:
                logger.debug(f"Payments with status {status_filter} served from cache")
                return queryset.filter(status=status_filter)

        if event_id:
            queryset = queryset.filter(event_id=event_id)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if start_date:
            queryset = queryset.filter(due_date__gte=start_date)

        if end_date:
            queryset = queryset.filter(due_date__lte=end_date)

        if search:
            queryset = queryset.filter(payment_number__icontains=search)

        if payment_method:
            queryset = queryset.filter(payment_method_id=payment_method)

        if is_manual:
            is_manual = is_manual.lower() == "true"
            queryset = queryset.filter(is_manual=is_manual)

        if amount_min:
            queryset = queryset.filter(amount__gte=amount_min)

        if amount_max:
            queryset = queryset.filter(amount__lte=amount_max)

        return queryset

    def retrieve(self, request, *args, **kwargs):
        """Retrieve payment with caching"""
        payment_id = kwargs.get("pk")

        # Try to get from cache first
        cached_payment = payments_cache_service.get_cached_payment_detail(int(payment_id))

        if cached_payment is not None:
            logger.debug(f"Payment detail for {payment_id} served from cache")
            return Response(cached_payment)

        # Cache miss - get from database
        payment = self.get_object()
        serializer = self.get_serializer(payment)

        # Cache the payment detail
        payments_cache_service.cache_payment_detail(payment.id, serializer.data)
        logger.info(f"Payment detail for {payment_id} cached after database query")

        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """Create a new payment"""
        try:
            payment = PaymentService.create_payment(request.data, request.user)
            serializer = self.get_serializer(payment)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Update an existing payment"""
        try:
            payment = PaymentService.update_payment(kwargs.get("pk"), request.data, request.user)
            serializer = self.get_serializer(payment)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def process(self, request, pk=None):
        """Process a payment through a payment gateway"""
        try:
            payment = PaymentService.process_payment(pk, request.data, request.user)
            serializer = self.get_serializer(payment)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def send_receipt(self, request, pk=None):
        """Send payment receipt to client"""
        try:
            payment = self.get_object()
            success = payment.send_receipt_notification()
            if success:
                return Response({"detail": "Receipt sent successfully"})
            else:
                return Response({"detail": "Receipt could not be sent"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def send_reminder(self, request, pk=None):
        """Send payment reminder to client"""
        try:
            payment = self.get_object()
            success = payment.send_reminder_notification()
            if success:
                return Response({"detail": "Reminder sent successfully"})
            else:
                return Response(
                    {"detail": "Reminder could not be sent. Payment may already be completed or cancelled."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentGatewayViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment gateways"""

    queryset = PaymentGateway.objects.all()
    serializer_class = PaymentGatewaySerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        """Use admin-safe serializer for read operations to show masked sensitive fields"""
        if self.action in ["list", "retrieve"]:
            return PaymentGatewayAdminSerializer
        return PaymentGatewaySerializer

    def get_queryset(self):
        queryset = super().get_queryset().order_by("name")

        # Apply filters
        is_active = self.request.query_params.get("is_active", None)
        search = self.request.query_params.get("search", None)

        if is_active is not None:
            is_active = is_active.lower() == "true"
            queryset = queryset.filter(is_active=is_active)

        if search:
            queryset = queryset.filter(models.Q(name__icontains=search) | models.Q(code__icontains=search))

        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new payment gateway"""
        try:
            gateway = PaymentGatewayService.create_gateway(request.data, request.user)
            serializer = self.get_serializer(gateway)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Update an existing payment gateway"""
        try:
            gateway = PaymentGatewayService.update_gateway(kwargs.get("pk"), request.data, request.user)
            serializer = self.get_serializer(gateway)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Delete a payment gateway"""
        try:
            PaymentGatewayService.delete_gateway(kwargs.get("pk"), request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def health(self, request):
        """
        Get health status for all payment gateways.

        Returns health information including:
        - Configuration status
        - Last successful transaction
        - Test mode status
        - Any error messages
        """
        from datetime import timedelta

        from django.utils import timezone

        gateways = self.get_queryset()
        health_data = {}

        for gateway in gateways:
            # Check if gateway is properly configured
            is_configured = False
            test_mode = False
            error_message = None

            if gateway.config:
                # Check for Stripe configuration
                if gateway.code == "stripe":
                    is_configured = bool(gateway.config.get("publishable_key") and gateway.config.get("secret_key"))
                    test_mode = gateway.config.get("test_mode", False)
                # Check for PayMongo configuration
                elif gateway.code == "paymongo":
                    is_configured = bool(gateway.config.get("public_key") and gateway.config.get("secret_key"))
                    test_mode = gateway.config.get("test_mode", False)
                # Generic check for other gateways
                else:
                    is_configured = len(gateway.config) > 0
                    test_mode = gateway.config.get("test_mode", False)

            # Get last successful transaction
            last_transaction = (
                PaymentTransaction.objects.filter(gateway=gateway, status="COMPLETED").order_by("-created_at").first()
            )

            last_successful = last_transaction.created_at.isoformat() if last_transaction else None

            # Determine health status
            if not gateway.is_active:
                health_status = "unknown"
            elif not is_configured:
                health_status = "unhealthy"
                error_message = "Gateway is not properly configured"
            elif last_transaction:
                # Check if there was a successful transaction in the last 24 hours
                if last_transaction.created_at > timezone.now() - timedelta(hours=24):
                    health_status = "healthy"
                else:
                    health_status = "degraded"
                    error_message = "No recent transactions"
            else:
                # No transactions but configured - could be new gateway
                health_status = "degraded"
                error_message = "No transaction history"

            health_data[gateway.id] = {
                "gateway_id": gateway.id,
                "gateway_code": gateway.code,
                "status": health_status,
                "last_checked": timezone.now().isoformat(),
                "last_successful_transaction": last_successful,
                "error_message": error_message,
                "is_configured": is_configured,
                "test_mode": test_mode,
            }

        return Response(health_data)


class TaxRateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing tax rates"""

    queryset = TaxRate.objects.all()
    serializer_class = TaxRateSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset().order_by("-is_default", "name")

        # Apply filters
        is_default = self.request.query_params.get("is_default", None)
        region = self.request.query_params.get("region", None)
        search = self.request.query_params.get("search", None)

        if is_default is not None:
            is_default = is_default.lower() == "true"
            queryset = queryset.filter(is_default=is_default)

        if region:
            queryset = queryset.filter(region__icontains=region)

        if search:
            queryset = queryset.filter(name__icontains=search)

        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new tax rate"""
        try:
            tax_rate = TaxRateService.create_tax_rate(request.data, request.user)
            serializer = self.get_serializer(tax_rate)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Update an existing tax rate"""
        try:
            tax_rate = TaxRateService.update_tax_rate(kwargs.get("pk"), request.data, request.user)
            serializer = self.get_serializer(tax_rate)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Delete a tax rate"""
        try:
            TaxRateService.delete_tax_rate(kwargs.get("pk"), request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PaymentMethodViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment methods"""

    queryset = PaymentMethod.objects.all()
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().order_by("-is_default", "-created_at")

        # Non-admin users can only see their own payment methods
        if not self.request.user.is_staff and self.request.user.role != "ADMIN":
            queryset = queryset.filter(user=self.request.user)

        # Apply filters
        user_id = self.request.query_params.get("user", None)
        method_type = self.request.query_params.get("type", None)
        is_default = self.request.query_params.get("is_default", None)
        gateway_id = self.request.query_params.get("gateway", None)

        if user_id:
            queryset = queryset.filter(user_id=user_id)

        if method_type:
            queryset = queryset.filter(type=method_type)

        if is_default is not None:
            is_default = is_default.lower() == "true"
            queryset = queryset.filter(is_default=is_default)

        if gateway_id:
            queryset = queryset.filter(gateway_id=gateway_id)

        return queryset

    def create(self, request, *args, **kwargs):
        """Create a new payment method"""
        try:
            # Non-admin users can only create payment methods for themselves
            if not request.user.is_staff and request.user.role != "ADMIN":
                if "user" in request.data and int(request.data["user"]) != request.user.id:
                    return Response(
                        {"detail": "You can only create payment methods for yourself"}, status=status.HTTP_403_FORBIDDEN
                    )

            method = PaymentMethodService.create_payment_method(request.data, request.user)
            serializer = self.get_serializer(method)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, *args, **kwargs):
        """Update a payment method"""
        try:
            method = PaymentMethodService.update_payment_method(kwargs.get("pk"), request.data, request.user)
            serializer = self.get_serializer(method)
            return Response(serializer.data)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        """Delete a payment method"""
        try:
            PaymentMethodService.delete_payment_method(kwargs.get("pk"), request.user)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["get"])
    def for_user(self, request):
        """Get payment methods for a specific user"""
        user_id = self.request.query_params.get("user_id", None)

        # Non-admin users can only get their own methods
        if not request.user.is_staff and request.user.role != "ADMIN":
            user_id = request.user.id

        if not user_id:
            return Response({"detail": "user_id parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Try to get from cache first
        cached_methods = payments_cache_service.get_cached_payment_methods_by_user(int(user_id))

        if cached_methods is not None:
            logger.debug(f"Payment methods for user {user_id} served from cache")
            return Response(cached_methods)

        # Cache miss - get from database
        queryset = self.get_queryset().filter(user_id=user_id)
        serializer = self.get_serializer(queryset, many=True)

        # Cache the payment methods
        payments_cache_service.cache_payment_methods_by_user(int(user_id), serializer.data)
        logger.info(f"Payment methods for user {user_id} cached after database query")

        return Response(serializer.data)

    @action(detail=False, methods=["post"])
    def setup_intent(self, request):
        """Create a setup intent for saving payment methods"""
        try:
            # Get gateway code from request, default to stripe
            gateway_code = request.data.get("gateway_code", "stripe")

            # Create setup intent using the gateway service
            setup_intent_result = PaymentGatewayService.create_setup_intent(request.user, gateway_code)

            if setup_intent_result.get("success"):
                # Serialize and return the response
                response_data = SetupIntentResponseSerializer(
                    {
                        "setup_intent_id": setup_intent_result.get("setup_intent_id"),
                        "client_secret": setup_intent_result.get("client_secret"),
                        "status": setup_intent_result.get("status"),
                        "gateway": setup_intent_result.get("gateway"),
                    }
                ).data

                return Response(response_data, status=status.HTTP_200_OK)
            else:
                return Response({"detail": "Failed to create setup intent"}, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Error creating setup intent: {e!s}")
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoices"""

    queryset = Invoice.objects.select_related(
        "event", "event__client", "event__event_type", "client", "quote", "quote__event", "quote__template"
    ).prefetch_related(
        "line_items",
        "line_items__product",
        "taxes",
        "taxes__tax_rate",
        "related_payments",
        "related_payments__payment_method",
    )
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset().order_by("-created_at")

        # Apply filters
        event_id = self.request.query_params.get("event_id", None)
        client_id = self.request.query_params.get("client_id", None)
        status_filter = self.request.query_params.get("status", None)
        search = self.request.query_params.get("search", None)

        # Try cache for event-specific invoices
        if event_id and not any([client_id, status_filter, search]):
            cached_invoices = payments_cache_service.get_cached_invoices_by_event(int(event_id))
            if cached_invoices is not None:
                logger.debug(f"Invoices for event {event_id} served from cache")
                return queryset.filter(event_id=event_id)

        # Try cache for client-specific invoices
        if client_id and not any([event_id, status_filter, search]):
            cached_invoices = payments_cache_service.get_cached_invoices_by_client(int(client_id))
            if cached_invoices is not None:
                logger.debug(f"Invoices for client {client_id} served from cache")
                return queryset.filter(client=client_id)

        if event_id:
            queryset = queryset.filter(event_id=event_id)

        if client_id:
            queryset = queryset.filter(client=client_id)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        if search:
            queryset = queryset.filter(invoice_id__icontains=search)

        return queryset

    def retrieve(self, request, *args, **kwargs):
        """Retrieve invoice with caching"""
        invoice_id = kwargs.get("pk")

        # Try to get from cache first
        cached_invoice = payments_cache_service.get_cached_invoice_detail(int(invoice_id))

        if cached_invoice is not None:
            logger.debug(f"Invoice detail for {invoice_id} served from cache")
            return Response(cached_invoice)

        # Cache miss - get from database
        invoice = self.get_object()
        serializer = self.get_serializer(invoice)

        # Cache the invoice detail
        payments_cache_service.cache_invoice_detail(invoice.id, serializer.data)
        logger.info(f"Invoice detail for {invoice_id} cached after database query")

        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def send_invoice(self, request, pk=None):
        """Send invoice to client via email"""
        from core.domains.communications.services import CommunicationService

        try:
            invoice = self.get_object()

            # Update status to ISSUED if it's a draft
            if invoice.status == "DRAFT":
                invoice.status = "ISSUED"
                invoice.save(update_fields=["status"])

            # Send invoice email via CommunicationService
            comm_service = CommunicationService()
            record = comm_service.send_communication(
                template_name="Invoice Issued",
                recipient=invoice.client.email,
                client=invoice.client,
                event=invoice.event,
                context_data={
                    "invoice_id": invoice.invoice_id,
                    "invoice_total": str(invoice.total_amount),
                    "invoice_currency": invoice.currency,
                    "due_date": invoice.due_date.strftime("%B %d, %Y"),
                },
                skip_preference_check=True,  # Invoices are transactional
            )

            if record:
                # Invalidate cache
                payments_cache_service.invalidate_invoice_cache(invoice.id)

                return Response({"detail": "Invoice sent successfully", "status": invoice.status})
            else:
                return Response(
                    {"detail": "Failed to send invoice. Please check email configuration."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except Exception as e:
            logger.error(f"Error sending invoice {pk}: {e!s}")
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["get"])
    def download_pdf(self, request, pk=None):
        """Download invoice as PDF"""
        from django.http import HttpResponse

        from .pdf_service import PaymentReceiptPDFService

        try:
            invoice = self.get_object()

            # Generate PDF
            pdf_buffer = PaymentReceiptPDFService.generate_invoice_receipt_pdf(invoice)

            # Create response with PDF
            response = HttpResponse(pdf_buffer.getvalue(), content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="invoice-{invoice.invoice_id}.pdf"'

            return response
        except Exception as e:
            logger.error(f"Error generating PDF for invoice {pk}: {e!s}")
            return Response({"detail": f"Failed to generate PDF: {e!s}"}, status=status.HTTP_400_BAD_REQUEST)


class PaymentTransactionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment transactions"""

    queryset = PaymentTransaction.objects.all()
    serializer_class = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # Optimize queries with select_related for ForeignKey relationships
        queryset = (
            super()
            .get_queryset()
            .select_related(
                "gateway",
                "payment",
                "payment__event",
                "payment__invoice",
            )
            .order_by("-created_at")
        )

        # Apply filters
        payment_id = self.request.query_params.get("payment", None)
        gateway_id = self.request.query_params.get("gateway", None)
        status = self.request.query_params.get("status", None)

        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)

        if gateway_id:
            queryset = queryset.filter(gateway_id=gateway_id)

        if status:
            queryset = queryset.filter(status=status)

        return queryset


class RefundViewSet(viewsets.ModelViewSet):
    """ViewSet for managing refunds"""

    queryset = Refund.objects.all()
    serializer_class = RefundSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # Optimize queries with select_related for ForeignKey relationships
        queryset = (
            super()
            .get_queryset()
            .select_related(
                "payment",
                "payment__event",
                "payment__invoice",
                "refunded_by",
            )
            .order_by("-created_at")
        )

        # Apply filters
        payment_id = self.request.query_params.get("payment", None)
        status = self.request.query_params.get("status", None)

        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)

        if status:
            queryset = queryset.filter(status=status)

        return queryset


class InvoiceLineItemViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoice line items"""

    queryset = InvoiceLineItem.objects.all()
    serializer_class = InvoiceLineItemSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # Optimize queries with select_related for ForeignKey relationships
        queryset = (
            super()
            .get_queryset()
            .select_related(
                "invoice",
                "invoice__event",
                "invoice__client",
                "product",
            )
            .order_by("id")
        )

        # Apply filters
        invoice_id = self.request.query_params.get("invoice", None)

        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)

        return queryset


class InvoiceTaxViewSet(viewsets.ModelViewSet):
    """ViewSet for managing invoice taxes"""

    queryset = InvoiceTax.objects.all()
    serializer_class = InvoiceTaxSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # Optimize queries with select_related for ForeignKey relationships
        queryset = (
            super()
            .get_queryset()
            .select_related(
                "invoice",
                "invoice__event",
                "tax_rate",
            )
            .order_by("id")
        )

        # Apply filters
        invoice_id = self.request.query_params.get("invoice", None)

        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)

        return queryset


class PaymentNotificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing payment notifications"""

    queryset = PaymentNotification.objects.all()
    serializer_class = PaymentNotificationSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        # Optimize queries with select_related for ForeignKey relationships
        queryset = (
            super()
            .get_queryset()
            .select_related(
                "payment",
                "payment__event",
                "payment__invoice",
                "template_used",
            )
            .order_by("-created_at")
        )

        # Apply filters
        payment_id = self.request.query_params.get("payment", None)
        notification_type = self.request.query_params.get("notification_type", None)
        is_successful = self.request.query_params.get("is_successful", None)

        if payment_id:
            queryset = queryset.filter(payment_id=payment_id)

        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)

        if is_successful is not None:
            is_successful = is_successful.lower() == "true"
            queryset = queryset.filter(is_successful=is_successful)

        return queryset


@method_decorator(csrf_exempt, name="dispatch")
class StripeWebhookView(APIView):
    """
    Webhook endpoint for Stripe payment events.

    This endpoint receives and processes webhook events from Stripe including:
    - payment_intent.succeeded
    - payment_intent.payment_failed
    - payment_intent.canceled
    - charge.refunded
    - charge.dispute.created

    Stripe sends POST requests to this endpoint when payment events occur.
    The signature is verified using the webhook secret configured in PaymentGateway.
    """

    permission_classes = [AllowAny]
    authentication_classes = []  # No authentication for webhooks

    def post(self, request):
        """Handle incoming Stripe webhook"""
        try:
            # Process webhook using unified processor
            result = UnifiedWebhookProcessor.process_webhook(request, "stripe")

            if result.success:
                logger.info(
                    f"Stripe webhook processed successfully: "
                    f"action={result.action_taken}, "
                    f"payment_id={result.payment_id}"
                )
                return Response({"status": "success", "message": result.message}, status=status.HTTP_200_OK)
            else:
                # Log the error but return 200 to prevent Stripe from retrying
                # for permanent failures (e.g., duplicate, parse error)
                if result.error_code in ["duplicate_ignored", "parse_error", "unsupported_gateway"]:
                    logger.warning(
                        f"Stripe webhook non-fatal error: error_code={result.error_code}, message={result.message}"
                    )
                    return Response({"status": "ignored", "message": result.message}, status=status.HTTP_200_OK)

                # For signature verification failures, return 401
                if result.error_code == "signature_verification_failed":
                    logger.error("Stripe webhook signature verification failed")
                    return Response(
                        {"status": "error", "message": "Invalid signature"}, status=status.HTTP_401_UNAUTHORIZED
                    )

                # For other errors, return 500 so Stripe will retry
                logger.error(
                    f"Stripe webhook processing failed: error_code={result.error_code}, message={result.message}"
                )
                return Response(
                    {"status": "error", "message": "Processing failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            logger.error(f"Unexpected error in Stripe webhook: {e}", exc_info=True)
            return Response(
                {"status": "error", "message": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
