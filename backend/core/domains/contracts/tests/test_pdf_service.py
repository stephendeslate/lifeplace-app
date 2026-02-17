"""
Unit tests for contracts domain PDF generation service.

Tests:
- ContractPDFService.generate_contract_pdf()
- ContractPDFService.generate_signature_summary_pdf()
- ContractPDFService._clean_html_content()
- ContractPDFService._add_watermark()
"""

import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from django.utils import timezone
from decimal import Decimal
from datetime import date, timedelta
from io import BytesIO

from pytest_factoryboy import register
from core.factories.contracts import (
    ContractTemplateFactory,
    EventContractFactory,
    ContractSignatureFactory,
)

# Register factories
register(ContractTemplateFactory)
register(EventContractFactory)
register(ContractSignatureFactory)


@pytest.fixture
def mock_branding(mocker):
    """Mock PDFBrandingService to avoid database calls."""
    mock_context = MagicMock()
    mock_context.primary_color_rgb = MagicMock()
    mock_context.company_name = 'Test Company'

    mock_service = mocker.patch(
        'core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context'
    )
    mock_service.return_value = mock_context
    return mock_context


@pytest.mark.django_db
class TestContractPDFService:
    """Tests for ContractPDFService."""

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_generate_contract_pdf_returns_bytes(
        self, mock_branding, event_contract_factory, contract_template_factory
    ):
        """Test that generate_contract_pdf returns bytes (PDF content)."""
        # Setup mock branding
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        template = contract_template_factory(name='Test Template')
        contract = event_contract_factory(
            template=template,
            status='SIGNED',
            content='This is the contract content.',
            contract_value=Decimal('50000.00'),
            currency='PHP'
        )

        from core.domains.contracts.pdf_service import ContractPDFService
        pdf_buffer = ContractPDFService.generate_contract_pdf(contract)

        assert pdf_buffer is not None
        assert isinstance(pdf_buffer, bytes)
        # PDF files start with %PDF
        assert pdf_buffer[:4] == b'%PDF'

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_generate_contract_pdf_with_signatures(
        self, mock_branding, event_contract_factory, contract_template_factory,
        contract_signature_factory
    ):
        """Test PDF generation includes signature information."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        template = contract_template_factory()
        contract = event_contract_factory(
            template=template,
            status='SIGNED',
            content='Contract with signatures.'
        )
        # Add signatures
        contract_signature_factory(
            contract=contract,
            role='CLIENT',
            signer_name='John Doe',
            signer_email='john@example.com',
            is_verified=True
        )
        contract_signature_factory(
            contract=contract,
            role='COMPANY_REP',
            signer_name='Jane Smith',
            signer_email='jane@company.com',
            is_verified=False
        )

        from core.domains.contracts.pdf_service import ContractPDFService
        pdf_buffer = ContractPDFService.generate_contract_pdf(contract)

        assert pdf_buffer is not None
        assert isinstance(pdf_buffer, bytes)

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_generate_contract_pdf_with_contract_value(
        self, mock_branding, event_contract_factory, contract_template_factory
    ):
        """Test PDF includes contract value when present."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        template = contract_template_factory()
        contract = event_contract_factory(
            template=template,
            status='SIGNED',
            content='Contract with value of 100,000 USD.',
            contract_value=Decimal('100000.00'),
            currency='USD'
        )

        from core.domains.contracts.pdf_service import ContractPDFService
        pdf_buffer = ContractPDFService.generate_contract_pdf(contract)

        assert pdf_buffer is not None
        assert isinstance(pdf_buffer, bytes)

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_generate_contract_pdf_with_valid_until(
        self, mock_branding, event_contract_factory, contract_template_factory
    ):
        """Test PDF includes valid_until date when present."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        template = contract_template_factory()
        contract = event_contract_factory(
            template=template,
            status='SIGNED',
            content='Contract valid until specified date.',
            valid_until=date.today() + timedelta(days=30)
        )

        from core.domains.contracts.pdf_service import ContractPDFService
        pdf_buffer = ContractPDFService.generate_contract_pdf(contract)

        assert pdf_buffer is not None

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_generate_contract_pdf_with_fully_signed_at(
        self, mock_branding, event_contract_factory, contract_template_factory
    ):
        """Test PDF includes fully_signed_at timestamp when present."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        template = contract_template_factory()
        contract = event_contract_factory(
            template=template,
            status='SIGNED',
            content='Fully signed contract content.',
            fully_signed_at=timezone.now()
        )

        from core.domains.contracts.pdf_service import ContractPDFService
        pdf_buffer = ContractPDFService.generate_contract_pdf(contract)

        assert pdf_buffer is not None

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_generate_signature_summary_pdf(
        self, mock_branding, event_contract_factory, contract_template_factory,
        contract_signature_factory
    ):
        """Test generating signature summary PDF."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        template = contract_template_factory()
        contract = event_contract_factory(template=template, status='SIGNED', content='Contract with signature summary.')

        # Add detailed signatures
        contract_signature_factory(
            contract=contract,
            role='CLIENT',
            signer_name='John Doe',
            signer_email='john@example.com',
            signer_title='Owner',
            is_verified=True,
            verification_method='email_verification',
            ip_address='192.168.1.1',
            user_agent='Mozilla/5.0 Chrome'
        )

        from core.domains.contracts.pdf_service import ContractPDFService
        pdf_buffer = ContractPDFService.generate_signature_summary_pdf(contract)

        assert pdf_buffer is not None
        assert isinstance(pdf_buffer, bytes)
        assert pdf_buffer[:4] == b'%PDF'

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_generate_signature_summary_pdf_no_signatures(
        self, mock_branding, event_contract_factory, contract_template_factory
    ):
        """Test generating signature summary PDF for contract without signatures."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        template = contract_template_factory()
        contract = event_contract_factory(template=template, status='SENT', content='Contract without signatures.')

        from core.domains.contracts.pdf_service import ContractPDFService
        pdf_buffer = ContractPDFService.generate_signature_summary_pdf(contract)

        assert pdf_buffer is not None


class TestCleanHtmlContent:
    """Tests for ContractPDFService._clean_html_content()."""

    def test_removes_html_tags(self):
        """Test HTML tags are removed."""
        from core.domains.contracts.pdf_service import ContractPDFService

        content = '<p>Hello <strong>World</strong></p>'
        cleaned = ContractPDFService._clean_html_content(content)

        assert '<p>' not in cleaned
        assert '</p>' not in cleaned
        assert '<strong>' not in cleaned
        assert 'Hello' in cleaned
        assert 'World' in cleaned

    def test_replaces_nbsp_entity(self):
        """Test &nbsp; is replaced with space."""
        from core.domains.contracts.pdf_service import ContractPDFService

        content = 'Hello&nbsp;World'
        cleaned = ContractPDFService._clean_html_content(content)

        assert '&nbsp;' not in cleaned
        assert 'Hello World' in cleaned

    def test_replaces_amp_entity(self):
        """Test &amp; is replaced with &."""
        from core.domains.contracts.pdf_service import ContractPDFService

        content = 'Terms &amp; Conditions'
        cleaned = ContractPDFService._clean_html_content(content)

        assert '&amp;' not in cleaned
        assert 'Terms & Conditions' in cleaned

    def test_replaces_lt_gt_entities(self):
        """Test &lt; and &gt; are replaced correctly."""
        from core.domains.contracts.pdf_service import ContractPDFService

        content = '5 &lt; 10 &gt; 3'
        cleaned = ContractPDFService._clean_html_content(content)

        assert '&lt;' not in cleaned
        assert '&gt;' not in cleaned
        assert '< 10 >' in cleaned

    def test_replaces_quot_entity(self):
        """Test &quot; is replaced with quote."""
        from core.domains.contracts.pdf_service import ContractPDFService

        content = 'He said &quot;Hello&quot;'
        cleaned = ContractPDFService._clean_html_content(content)

        assert '&quot;' not in cleaned
        assert '"Hello"' in cleaned

    def test_replaces_apostrophe_entity(self):
        """Test &#39; is replaced with apostrophe."""
        from core.domains.contracts.pdf_service import ContractPDFService

        content = "It&#39;s working"
        cleaned = ContractPDFService._clean_html_content(content)

        assert '&#39;' not in cleaned
        assert "It's working" in cleaned

    def test_cleans_multiple_spaces(self):
        """Test multiple spaces are cleaned up."""
        from core.domains.contracts.pdf_service import ContractPDFService

        content = 'Hello     World'
        cleaned = ContractPDFService._clean_html_content(content)

        assert 'Hello World' in cleaned

    def test_handles_complex_html(self):
        """Test handling of complex HTML content."""
        from core.domains.contracts.pdf_service import ContractPDFService

        content = '''
        <div class="contract">
            <h1>Contract Title</h1>
            <p>This is a <strong>test</strong> contract.</p>
            <ul>
                <li>Item 1</li>
                <li>Item 2</li>
            </ul>
        </div>
        '''
        cleaned = ContractPDFService._clean_html_content(content)

        assert '<div' not in cleaned
        assert '<h1>' not in cleaned
        assert '<p>' not in cleaned
        assert '<ul>' not in cleaned
        assert 'Contract Title' in cleaned
        assert 'test contract' in cleaned

    def test_handles_empty_string(self):
        """Test handling of empty string."""
        from core.domains.contracts.pdf_service import ContractPDFService

        cleaned = ContractPDFService._clean_html_content('')

        assert cleaned == ''

    def test_strips_whitespace(self):
        """Test leading and trailing whitespace is stripped."""
        from core.domains.contracts.pdf_service import ContractPDFService

        content = '   Hello World   '
        cleaned = ContractPDFService._clean_html_content(content)

        assert cleaned == 'Hello World'


@pytest.mark.django_db
class TestPDFGeneration:
    """Integration tests for PDF generation."""

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_pdf_generation_with_special_characters(
        self, mock_branding, event_contract_factory, contract_template_factory
    ):
        """Test PDF generation handles special characters in content."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        template = contract_template_factory()
        contract = event_contract_factory(
            template=template,
            status='SIGNED',
            content='Contract with special chars: $100,000.00 & more.'
        )

        from core.domains.contracts.pdf_service import ContractPDFService
        pdf_buffer = ContractPDFService.generate_contract_pdf(contract)

        assert pdf_buffer is not None

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_pdf_generation_with_long_content(
        self, mock_branding, event_contract_factory, contract_template_factory
    ):
        """Test PDF generation handles long content (multiple pages)."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        template = contract_template_factory()
        # Create long content that spans multiple paragraphs
        long_content = '\n\n'.join([
            f'Paragraph {i}: ' + 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ' * 10
            for i in range(20)
        ])
        contract = event_contract_factory(
            template=template,
            status='SIGNED',
            content=long_content
        )

        from core.domains.contracts.pdf_service import ContractPDFService
        pdf_buffer = ContractPDFService.generate_contract_pdf(contract)

        assert pdf_buffer is not None
        assert len(pdf_buffer) > 1000  # Should be larger for multi-page

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_pdf_generation_with_no_contract_value(
        self, mock_branding, event_contract_factory, contract_template_factory
    ):
        """Test PDF generation handles contract with no value."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        template = contract_template_factory()
        contract = event_contract_factory(
            template=template,
            status='SIGNED',
            content='Contract with no value specified.',
            contract_value=None
        )

        from core.domains.contracts.pdf_service import ContractPDFService
        pdf_buffer = ContractPDFService.generate_contract_pdf(contract)

        assert pdf_buffer is not None

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    def test_pdf_generation_logs_success(
        self, mock_branding, event_contract_factory, contract_template_factory, mocker
    ):
        """Test PDF generation logs success message."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        mock_logger = mocker.patch('core.domains.contracts.pdf_service.logger')

        template = contract_template_factory()
        contract = event_contract_factory(template=template, status='SIGNED', content='Contract for logging test.')

        from core.domains.contracts.pdf_service import ContractPDFService
        ContractPDFService.generate_contract_pdf(contract)

        mock_logger.info.assert_called()


@pytest.mark.django_db
class TestPDFErrors:
    """Tests for PDF generation error handling."""

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    @patch('core.domains.contracts.pdf_service.SimpleDocTemplate.build')
    def test_pdf_generation_raises_on_build_error(
        self, mock_build, mock_branding, event_contract_factory, contract_template_factory
    ):
        """Test PDF generation raises exception on build error."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        mock_build.side_effect = Exception('PDF build failed')

        template = contract_template_factory()
        contract = event_contract_factory(template=template, status='SIGNED', content='Contract content for error test.')

        from core.domains.contracts.pdf_service import ContractPDFService

        with pytest.raises(Exception) as exc_info:
            ContractPDFService.generate_contract_pdf(contract)

        assert 'PDF build failed' in str(exc_info.value)

    @patch('core.domains.contracts.pdf_service.PDFBrandingService.get_branding_context')
    @patch('core.domains.contracts.pdf_service.SimpleDocTemplate.build')
    def test_pdf_generation_logs_error(
        self, mock_build, mock_branding, event_contract_factory, contract_template_factory, mocker
    ):
        """Test PDF generation logs error on failure."""
        from reportlab.lib import colors
        mock_context = MagicMock()
        mock_context.primary_color_rgb = colors.HexColor('#2c5aa0')
        mock_branding.return_value = mock_context

        mock_build.side_effect = Exception('PDF build failed')
        mock_logger = mocker.patch('core.domains.contracts.pdf_service.logger')

        template = contract_template_factory()
        contract = event_contract_factory(template=template, status='SIGNED', content='Contract content for error logging test.')

        from core.domains.contracts.pdf_service import ContractPDFService

        with pytest.raises(Exception):
            ContractPDFService.generate_contract_pdf(contract)

        mock_logger.error.assert_called()
