# backend/core/domains/sales/pdf_service.py

import io
import logging
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

logger = logging.getLogger(__name__)


class QuotePDFService:
    """Service for generating PDF versions of quotes"""

    @staticmethod
    def generate_quote_pdf(quote):
        """
        Generate a PDF version of a quote

        Args:
            quote: EventQuote instance

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()

        # Create the PDF document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
        )

        # Build the story (content)
        story = []
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2c5aa0')
        )

        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=20,
            textColor=colors.HexColor('#2c5aa0')
        )

        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=10,
            spaceAfter=12,
            alignment=TA_JUSTIFY,
        )

        small_style = ParagraphStyle(
            'SmallText',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_LEFT
        )

        header_style = ParagraphStyle(
            'HeaderText',
            parent=styles['Normal'],
            fontSize=12,
            textColor=colors.HexColor('#2c5aa0'),
            alignment=TA_RIGHT
        )

        status_style = ParagraphStyle(
            'StatusText',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.HexColor('#666666'),
            alignment=TA_CENTER
        )

        # Header
        story.append(Paragraph("QUOTE", title_style))
        story.append(Spacer(1, 20))

        # Quote Information Table
        quote_info_data = [
            ['Quote ID:', f"#{quote.id}"],
            ['Version:', f"v{quote.version}"],
            ['Date:', quote.created_at.strftime("%B %d, %Y")],
            ['Valid Until:', quote.valid_until.strftime("%B %d, %Y") if quote.valid_until else 'N/A'],
            ['Status:', quote.get_status_display() if hasattr(quote, 'get_status_display') else quote.status],
        ]

        quote_info_table = Table(quote_info_data, colWidths=[2*inch, 3*inch])
        quote_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2c5aa0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))

        story.append(quote_info_table)
        story.append(Spacer(1, 30))

        # Client Information
        story.append(Paragraph("PREPARED FOR", subtitle_style))

        client = quote.event.client
        client_info = [
            f"{client.first_name} {client.last_name}",
            client.email,
        ]

        if hasattr(client, 'phone') and client.phone:
            client_info.append(client.phone)

        for line in client_info:
            story.append(Paragraph(line, body_style))

        story.append(Spacer(1, 20))

        # Event Information
        story.append(Paragraph("EVENT DETAILS", subtitle_style))

        event = quote.event
        event_info_data = [
            ['Event:', event.name if hasattr(event, 'name') and event.name else f"Event #{event.id}"],
            ['Event Type:', event.event_type.name if event.event_type else 'Not specified'],
            ['Event Date:', event.start_date.strftime("%B %d, %Y") if event.start_date else 'Not scheduled'],
        ]

        if hasattr(event, 'venue') and event.venue:
            event_info_data.append(['Venue:', event.venue])

        event_info_table = Table(event_info_data, colWidths=[2*inch, 3*inch])
        event_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.HexColor('#2c5aa0')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))

        story.append(event_info_table)
        story.append(Spacer(1, 30))

        # Quote Items
        story.append(Paragraph("QUOTE ITEMS", subtitle_style))

        # Items table header
        items_data = [['Description', 'Qty', 'Unit Price', 'Total']]

        # Get currency symbol
        currency = 'PHP'  # Default
        currency_symbol = '₱' if currency == 'PHP' else '$'

        # Add line items
        line_items = quote.line_items.all()
        for item in line_items:
            items_data.append([
                item.description,
                str(item.quantity),
                f"{currency_symbol}{item.unit_price:,.2f}",
                f"{currency_symbol}{item.total:,.2f}",
            ])

        if not line_items.exists():
            items_data.append(['No items', '-', '-', '-'])

        items_table = Table(items_data, colWidths=[3*inch, 0.7*inch, 1.2*inch, 1.3*inch])
        items_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5aa0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),  # Description left
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),  # Numbers right

            # All cells
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))

        story.append(items_table)
        story.append(Spacer(1, 20))

        # Totals section
        totals_data = []

        if quote.subtotal:
            totals_data.append(['Subtotal:', f"{currency_symbol}{quote.subtotal:,.2f}"])

        if quote.discount_amount and quote.discount_amount > 0:
            totals_data.append(['Discount:', f"-{currency_symbol}{quote.discount_amount:,.2f}"])

        if quote.tax_amount and quote.tax_amount > 0:
            totals_data.append(['Tax:', f"{currency_symbol}{quote.tax_amount:,.2f}"])

        totals_data.append(['TOTAL:', f"{currency_symbol}{quote.total_amount:,.2f}"])

        totals_table = Table(totals_data, colWidths=[4.8*inch, 1.4*inch])
        totals_table.setStyle(TableStyle([
            # All rows except last
            ('FONTNAME', (0, 0), (-1, -2), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -2), 10),
            ('ALIGN', (0, 0), (-1, -2), 'RIGHT'),

            # Total row (last row)
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor('#2c5aa0')),
            ('ALIGN', (0, -1), (-1, -1), 'RIGHT'),
            ('LINEABOVE', (0, -1), (-1, -1), 2, colors.HexColor('#2c5aa0')),

            # All rows
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))

        story.append(totals_table)
        story.append(Spacer(1, 30))

        # Terms and Conditions
        if quote.terms_and_conditions:
            story.append(Paragraph("TERMS AND CONDITIONS", subtitle_style))
            story.append(Paragraph(quote.terms_and_conditions, body_style))
            story.append(Spacer(1, 20))

        # Notes
        if quote.notes:
            story.append(Paragraph("NOTES", subtitle_style))
            story.append(Paragraph(quote.notes, body_style))
            story.append(Spacer(1, 20))

        # Footer
        story.append(Spacer(1, 40))

        # Status-specific messaging
        if quote.status == 'DRAFT':
            story.append(Paragraph("This quote is a draft and has not been sent to the client.", status_style))
        elif quote.status == 'SENT':
            story.append(Paragraph(f"This quote was sent on {quote.sent_at.strftime('%B %d, %Y') if quote.sent_at else 'N/A'}.", status_style))
            if quote.valid_until:
                story.append(Paragraph(f"Please respond by {quote.valid_until.strftime('%B %d, %Y')}.", status_style))
        elif quote.status == 'ACCEPTED':
            story.append(Paragraph("This quote has been accepted.", header_style))
            if quote.accepted_at:
                story.append(Paragraph(f"Accepted on {quote.accepted_at.strftime('%B %d, %Y')}", small_style))
        elif quote.status == 'REJECTED':
            story.append(Paragraph("This quote has been declined.", status_style))
        elif quote.status == 'EXPIRED':
            story.append(Paragraph("This quote has expired.", status_style))

        story.append(Spacer(1, 10))
        footer_text = f"Generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}"
        story.append(Paragraph(footer_text, small_style))

        # Build the PDF
        try:
            doc.build(story)
            buffer.seek(0)
            logger.info(f"Generated PDF for quote {quote.id}")
            return buffer
        except Exception as e:
            logger.error(f"Error generating PDF for quote {quote.id}: {e}")
            raise

    @staticmethod
    def save_quote_pdf(quote):
        """
        Generate and save PDF to quote model

        Args:
            quote: EventQuote instance

        Returns:
            URL to the saved PDF file
        """
        from django.core.files.base import ContentFile

        pdf_buffer = QuotePDFService.generate_quote_pdf(quote)
        filename = f"quote_{quote.id}_v{quote.version}.pdf"

        quote.pdf_file.save(filename, ContentFile(pdf_buffer.read()))
        quote.save(update_fields=['pdf_file'])

        logger.info(f"Saved PDF file for quote {quote.id}: {filename}")
        return quote.pdf_file.url if quote.pdf_file else None
