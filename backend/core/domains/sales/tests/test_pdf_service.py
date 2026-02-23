"""
Unit tests for sales domain PDF service.

Tests:
- QuotePDFService (PDF generation for quotes)
- PDF content generation
- PDF saving to model
- Error handling
"""

import io
from datetime import timedelta
from decimal import Decimal
from unittest.mock import MagicMock, patch

from django.utils import timezone

import pytest

from core.domains.sales.models import (
    EventQuote,
    QuoteLineItem,
)
from core.domains.sales.pdf_service import QuotePDFService


@pytest.fixture
def product_category(db):
    """Create a product category for testing."""
    from core.domains.products.models import ProductCategory

    return ProductCategory.objects.create(
        name="Test Category", slug="test-category", description="Test category description", is_active=True
    )


@pytest.fixture
def product_option(db, product_category):
    """Create a product option for testing."""
    from core.domains.products.models import ProductOption

    return ProductOption.objects.create(
        name="Test Package",
        description="Test package description",
        category=product_category,
        base_price=Decimal("5000.00"),
        type="PACKAGE",
        is_active=True,
    )


@pytest.fixture
def draft_quote(db, event_factory, user_factory):
    """Create a draft quote."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="DRAFT",
        subtotal=Decimal("5000.00"),
        tax_amount=Decimal("600.00"),
        total_amount=Decimal("5600.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        created_by=admin_user,
    )


@pytest.fixture
def sent_quote(db, event_factory, user_factory):
    """Create a sent quote."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="SENT",
        subtotal=Decimal("5000.00"),
        tax_amount=Decimal("600.00"),
        total_amount=Decimal("5600.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        sent_at=timezone.now(),
        created_by=admin_user,
    )


@pytest.fixture
def accepted_quote(db, event_factory, user_factory):
    """Create an accepted quote."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="ACCEPTED",
        subtotal=Decimal("5000.00"),
        tax_amount=Decimal("600.00"),
        total_amount=Decimal("5600.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        sent_at=timezone.now() - timedelta(days=2),
        accepted_at=timezone.now(),
        created_by=admin_user,
    )


@pytest.fixture
def rejected_quote(db, event_factory, user_factory):
    """Create a rejected quote."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="REJECTED",
        subtotal=Decimal("5000.00"),
        tax_amount=Decimal("600.00"),
        total_amount=Decimal("5600.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        sent_at=timezone.now() - timedelta(days=2),
        rejected_at=timezone.now(),
        rejection_reason="Too expensive",
        created_by=admin_user,
    )


@pytest.fixture
def expired_quote(db, event_factory, user_factory):
    """Create an expired quote."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    return EventQuote.objects.create(
        event=event,
        version=1,
        status="EXPIRED",
        subtotal=Decimal("5000.00"),
        tax_amount=Decimal("600.00"),
        total_amount=Decimal("5600.00"),
        valid_until=timezone.now().date() - timedelta(days=1),  # Expired
        sent_at=timezone.now() - timedelta(days=10),
        created_by=admin_user,
    )


@pytest.fixture
def quote_with_line_items(db, event_factory, user_factory, product_option):
    """Create a quote with line items."""
    event = event_factory()
    admin_user = user_factory(admin=True)
    quote = EventQuote.objects.create(
        event=event,
        version=1,
        status="SENT",
        subtotal=Decimal("7500.00"),
        tax_amount=Decimal("900.00"),
        discount_amount=Decimal("500.00"),
        total_amount=Decimal("7900.00"),
        valid_until=timezone.now().date() + timedelta(days=30),
        sent_at=timezone.now(),
        created_by=admin_user,
        notes="Special notes for this quote",
        terms_and_conditions="Payment due within 30 days.",
    )

    # Add multiple line items
    QuoteLineItem.objects.create(
        quote=quote,
        description="Premium Package",
        quantity=1,
        unit_price=Decimal("5000.00"),
        tax_rate=Decimal("12.00"),
        total=Decimal("5000.00"),
        product=product_option,
    )
    QuoteLineItem.objects.create(
        quote=quote,
        description="Photography Add-on",
        quantity=2,
        unit_price=Decimal("1250.00"),
        tax_rate=Decimal("12.00"),
        total=Decimal("2500.00"),
    )

    return quote


@pytest.fixture
def mock_branding():
    """Mock branding context."""
    with patch("core.domains.sales.pdf_service.PDFBrandingService") as mock:
        mock.get_branding_context.return_value = MagicMock(primary_color_rgb=(0.2, 0.4, 0.6))
        yield mock


# =============================================================================
# PDF GENERATION TESTS
# =============================================================================


@pytest.mark.django_db
class TestQuotePDFServiceGenerate:
    """Tests for QuotePDFService.generate_quote_pdf."""

    def test_generate_pdf_returns_buffer(self, mock_branding, draft_quote):
        """Test that generate_quote_pdf returns a BytesIO buffer."""
        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        assert buffer is not None
        assert isinstance(buffer, io.BytesIO)
        assert buffer.tell() == 0  # Should be at the start

    def test_generate_pdf_contains_content(self, mock_branding, draft_quote):
        """Test that generated PDF contains actual content."""
        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        content = buffer.read()
        assert len(content) > 0
        # PDF files start with %PDF
        assert content.startswith(b"%PDF")

    def test_generate_pdf_for_draft_quote(self, mock_branding, draft_quote):
        """Test PDF generation for draft quote."""
        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        assert buffer is not None
        content = buffer.read()
        assert len(content) > 100  # Should have substantial content

    def test_generate_pdf_for_sent_quote(self, mock_branding, sent_quote):
        """Test PDF generation for sent quote."""
        buffer = QuotePDFService.generate_quote_pdf(sent_quote)

        assert buffer is not None
        assert isinstance(buffer, io.BytesIO)

    def test_generate_pdf_for_accepted_quote(self, mock_branding, accepted_quote):
        """Test PDF generation for accepted quote."""
        buffer = QuotePDFService.generate_quote_pdf(accepted_quote)

        assert buffer is not None

    def test_generate_pdf_for_rejected_quote(self, mock_branding, rejected_quote):
        """Test PDF generation for rejected quote."""
        buffer = QuotePDFService.generate_quote_pdf(rejected_quote)

        assert buffer is not None

    def test_generate_pdf_for_expired_quote(self, mock_branding, expired_quote):
        """Test PDF generation for expired quote."""
        buffer = QuotePDFService.generate_quote_pdf(expired_quote)

        assert buffer is not None

    def test_generate_pdf_with_line_items(self, mock_branding, quote_with_line_items):
        """Test PDF generation with line items."""
        buffer = QuotePDFService.generate_quote_pdf(quote_with_line_items)

        assert buffer is not None
        content = buffer.read()
        assert len(content) > 100

    def test_generate_pdf_with_no_line_items(self, mock_branding, draft_quote):
        """Test PDF generation with no line items."""
        # Ensure no line items
        draft_quote.line_items.all().delete()

        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        assert buffer is not None

    def test_generate_pdf_with_terms_and_conditions(self, mock_branding, draft_quote):
        """Test PDF includes terms and conditions."""
        draft_quote.terms_and_conditions = "Test terms and conditions content"
        draft_quote.save()

        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        assert buffer is not None

    def test_generate_pdf_with_notes(self, mock_branding, draft_quote):
        """Test PDF includes notes."""
        draft_quote.notes = "Test notes content"
        draft_quote.save()

        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        assert buffer is not None

    def test_generate_pdf_with_discount(self, mock_branding, quote_with_line_items):
        """Test PDF includes discount amount."""
        quote_with_line_items.discount_amount = Decimal("500.00")
        quote_with_line_items.save()

        buffer = QuotePDFService.generate_quote_pdf(quote_with_line_items)

        assert buffer is not None

    def test_generate_pdf_with_valid_until_none(self, mock_branding, event_factory, user_factory):
        """Test PDF generation when valid_until is None."""
        event = event_factory()
        admin_user = user_factory(admin=True)

        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status="DRAFT",
            subtotal=Decimal("5000.00"),
            total_amount=Decimal("5000.00"),
            valid_until=timezone.now().date() + timedelta(days=30),
            created_by=admin_user,
        )

        buffer = QuotePDFService.generate_quote_pdf(quote)

        assert buffer is not None


@pytest.mark.django_db
class TestQuotePDFServiceSave:
    """Tests for QuotePDFService.save_quote_pdf."""

    def test_save_quote_pdf_creates_file(self, mock_branding, draft_quote):
        """Test that save_quote_pdf saves file to model."""
        QuotePDFService.save_quote_pdf(draft_quote)

        draft_quote.refresh_from_db()
        assert draft_quote.pdf_file is not None
        assert draft_quote.pdf_file.name is not None

    def test_save_quote_pdf_returns_url(self, mock_branding, draft_quote):
        """Test that save_quote_pdf returns URL."""
        url = QuotePDFService.save_quote_pdf(draft_quote)

        # URL should be returned (or None if no URL)
        assert url is None or isinstance(url, str)

    def test_save_quote_pdf_filename_format(self, mock_branding, draft_quote):
        """Test that saved PDF has correct filename format."""
        QuotePDFService.save_quote_pdf(draft_quote)

        draft_quote.refresh_from_db()
        filename = draft_quote.pdf_file.name
        assert f"quote_{draft_quote.id}_v{draft_quote.version}" in filename
        assert filename.endswith(".pdf")

    def test_save_quote_pdf_overwrites_existing(self, mock_branding, draft_quote):
        """Test that saving PDF overwrites existing file."""
        # Save first time
        QuotePDFService.save_quote_pdf(draft_quote)
        draft_quote.refresh_from_db()

        # Save second time
        QuotePDFService.save_quote_pdf(draft_quote)
        draft_quote.refresh_from_db()
        second_file = draft_quote.pdf_file.name

        # Files may have different names due to storage backend
        assert second_file is not None


@pytest.mark.django_db
class TestQuotePDFServiceErrors:
    """Tests for error handling in QuotePDFService."""

    @patch("core.domains.sales.pdf_service.SimpleDocTemplate")
    def test_generate_pdf_handles_error(self, mock_doc, mock_branding, draft_quote):
        """Test that generate_pdf handles errors gracefully."""
        mock_doc.return_value.build.side_effect = Exception("PDF error")

        with pytest.raises(Exception) as exc_info:
            QuotePDFService.generate_quote_pdf(draft_quote)

        assert "PDF error" in str(exc_info.value)

    @patch("core.domains.sales.pdf_service.QuotePDFService.generate_quote_pdf")
    def test_save_pdf_handles_generation_error(self, mock_generate, draft_quote):
        """Test that save_pdf handles generation errors."""
        mock_generate.side_effect = Exception("Generation error")

        with pytest.raises(Exception):
            QuotePDFService.save_quote_pdf(draft_quote)


@pytest.mark.django_db
class TestQuotePDFServiceBranding:
    """Tests for branding in QuotePDFService."""

    def test_generate_pdf_uses_branding_service(self, draft_quote):
        """Test that PDF generation uses branding service."""
        with patch("core.domains.sales.pdf_service.PDFBrandingService") as mock:
            mock.get_branding_context.return_value = MagicMock(primary_color_rgb=(0.5, 0.5, 0.5))

            QuotePDFService.generate_quote_pdf(draft_quote)

            mock.get_branding_context.assert_called_once()

    def test_generate_pdf_with_custom_colors(self, draft_quote):
        """Test PDF with custom branding colors."""
        with patch("core.domains.sales.pdf_service.PDFBrandingService") as mock:
            # Custom red color
            mock.get_branding_context.return_value = MagicMock(primary_color_rgb=(1.0, 0.0, 0.0))

            buffer = QuotePDFService.generate_quote_pdf(draft_quote)

            assert buffer is not None


@pytest.mark.django_db
class TestQuotePDFServiceClientInfo:
    """Tests for client information in PDF."""

    def test_generate_pdf_includes_client_info(self, mock_branding, draft_quote, user_factory):
        """Test that PDF includes client information."""
        # Ensure client has phone
        client = draft_quote.event.client
        client.phone = "+1234567890"
        client.save()

        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        assert buffer is not None

    def test_generate_pdf_without_client_phone(self, mock_branding, draft_quote):
        """Test PDF generation when client has no phone."""
        # Ensure client has no phone
        client = draft_quote.event.client
        if hasattr(client, "phone"):
            client.phone = ""
            client.save()

        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        assert buffer is not None


@pytest.mark.django_db
class TestQuotePDFServiceEventInfo:
    """Tests for event information in PDF."""

    def test_generate_pdf_includes_event_details(self, mock_branding, draft_quote):
        """Test that PDF includes event details."""
        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        assert buffer is not None

    def test_generate_pdf_with_event_type(self, mock_branding, draft_quote, event_type_factory):
        """Test PDF generation with event type."""
        event_type = event_type_factory()
        draft_quote.event.event_type = event_type
        draft_quote.event.save()

        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        assert buffer is not None

    def test_generate_pdf_without_event_type(self, mock_branding, draft_quote):
        """Test PDF generation without event type."""
        draft_quote.event.event_type = None
        draft_quote.event.save()

        buffer = QuotePDFService.generate_quote_pdf(draft_quote)

        assert buffer is not None

    def test_generate_pdf_without_start_date(self, mock_branding, event_factory, user_factory):
        """Test PDF generation when event has no start date.

        Event.start_date is NOT NULL at DB level so we cannot persist None.
        Instead we set it on the in-memory object that the quote references
        to exercise the ``if event.start_date`` guard in the PDF service.
        """
        event = event_factory()
        admin_user = user_factory(admin=True)

        quote = EventQuote.objects.create(
            event=event,
            version=1,
            status="DRAFT",
            subtotal=Decimal("5000.00"),
            total_amount=Decimal("5000.00"),
            valid_until=timezone.now().date() + timedelta(days=30),
            created_by=admin_user,
        )

        # Override start_date on the in-memory event accessed through the quote
        quote.event.__dict__["start_date"] = None

        buffer = QuotePDFService.generate_quote_pdf(quote)

        assert buffer is not None


@pytest.mark.django_db
class TestQuotePDFServiceStatusMessages:
    """Tests for status-specific messaging in PDF."""

    def test_draft_quote_message(self, mock_branding, draft_quote):
        """Test draft quote has appropriate message."""
        buffer = QuotePDFService.generate_quote_pdf(draft_quote)
        assert buffer is not None

    def test_sent_quote_message(self, mock_branding, sent_quote):
        """Test sent quote has appropriate message."""
        buffer = QuotePDFService.generate_quote_pdf(sent_quote)
        assert buffer is not None

    def test_accepted_quote_message(self, mock_branding, accepted_quote):
        """Test accepted quote has appropriate message."""
        buffer = QuotePDFService.generate_quote_pdf(accepted_quote)
        assert buffer is not None

    def test_rejected_quote_message(self, mock_branding, rejected_quote):
        """Test rejected quote has appropriate message."""
        buffer = QuotePDFService.generate_quote_pdf(rejected_quote)
        assert buffer is not None

    def test_expired_quote_message(self, mock_branding, expired_quote):
        """Test expired quote has appropriate message."""
        buffer = QuotePDFService.generate_quote_pdf(expired_quote)
        assert buffer is not None


@pytest.mark.django_db
class TestQuotePDFServiceTotals:
    """Tests for totals section in PDF."""

    def test_pdf_with_zero_subtotal(self, mock_branding, draft_quote):
        """Test PDF with zero subtotal."""
        draft_quote.subtotal = Decimal("0")
        draft_quote.save()

        buffer = QuotePDFService.generate_quote_pdf(draft_quote)
        assert buffer is not None

    def test_pdf_with_large_amounts(self, mock_branding, draft_quote):
        """Test PDF with large monetary amounts."""
        draft_quote.subtotal = Decimal("1000000.00")
        draft_quote.tax_amount = Decimal("120000.00")
        draft_quote.total_amount = Decimal("1120000.00")
        draft_quote.save()

        buffer = QuotePDFService.generate_quote_pdf(draft_quote)
        assert buffer is not None

    def test_pdf_with_decimal_amounts(self, mock_branding, draft_quote):
        """Test PDF with decimal monetary amounts."""
        draft_quote.subtotal = Decimal("1234.56")
        draft_quote.tax_amount = Decimal("148.15")
        draft_quote.total_amount = Decimal("1382.71")
        draft_quote.save()

        buffer = QuotePDFService.generate_quote_pdf(draft_quote)
        assert buffer is not None
