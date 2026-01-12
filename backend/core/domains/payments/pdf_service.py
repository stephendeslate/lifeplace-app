# backend/core/domains/payments/pdf_service.py

import io
import logging
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY

from core.utils.pdf_branding import PDFBrandingService

logger = logging.getLogger(__name__)


class PaymentReceiptPDFService:
    """Service for generating PDF receipts for payments"""
    
    @staticmethod
    def generate_receipt_pdf(payment):
        """
        Generate a PDF receipt for a payment

        Args:
            payment: Payment instance

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()

        # Get branding context for dynamic colors and company info
        branding = PDFBrandingService.get_branding_context()
        primary_color = branding.primary_color_rgb

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

        # Custom styles with dynamic branding colors
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=primary_color
        )

        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=20,
            textColor=primary_color
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
            textColor=primary_color,
            alignment=TA_RIGHT
        )
        
        # Header with company info and receipt title
        story.append(Paragraph("PAYMENT RECEIPT", title_style))
        story.append(Spacer(1, 20))
        
        # Receipt Information Table
        receipt_info_data = [
            ['Receipt Number:', payment.receipt_number or f"REC-{payment.id}"],
            ['Payment Number:', payment.payment_number],
            ['Issue Date:', payment.receipt_generated_on.strftime("%B %d, %Y") if payment.receipt_generated_on else timezone.now().strftime("%B %d, %Y")],
            ['Payment Date:', payment.paid_on.strftime("%B %d, %Y") if payment.paid_on else 'Not paid'],
            ['Status:', payment.get_status_display()],
        ]
        
        receipt_info_table = Table(receipt_info_data, colWidths=[2*inch, 3*inch])
        receipt_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), primary_color),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        story.append(receipt_info_table)
        story.append(Spacer(1, 30))
        
        # Client Information
        story.append(Paragraph("BILL TO", subtitle_style))
        
        client = payment.event.client
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
        
        event_info_data = [
            ['Event ID:', f"#{payment.event.id}"],
            ['Event Type:', payment.event.event_type.name if payment.event.event_type else 'Not specified'],
            ['Event Date:', payment.event.start_date.strftime("%B %d, %Y") if payment.event.start_date else 'Not scheduled'],
        ]
        
        if hasattr(payment.event, 'venue') and payment.event.venue:
            event_info_data.append(['Venue:', payment.event.venue])
            
        event_info_table = Table(event_info_data, colWidths=[2*inch, 3*inch])
        event_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), primary_color),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        story.append(event_info_table)
        story.append(Spacer(1, 30))
        
        # Payment Details
        story.append(Paragraph("PAYMENT DETAILS", subtitle_style))
        
        # Payment table
        try:
            formatted_amount = payment.format_amount_with_currency()
        except Exception as e:
            logger.warning(f"Failed to format amount for payment {payment.id}: {e}")
            # Fallback formatting
            currency_symbol = '₱' if payment.currency == 'PHP' else '$' if payment.currency == 'USD' else payment.currency + ' '
            formatted_amount = f"{currency_symbol}{payment.amount}"
        
        payment_data = [
            ['Description', 'Amount'],
            [payment.description or 'Event Payment', formatted_amount],
        ]
        
        # Add installment info if applicable
        if payment.installment:
            payment_data[1][0] = f"{payment.installment.description} (Installment {payment.installment.installment_number})"
        
        payment_table = Table(payment_data, colWidths=[4*inch, 2*inch])
        payment_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), primary_color),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),

            # Data rows
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 1), (0, -1), 'LEFT'),
            ('ALIGN', (1, 1), (1, -1), 'RIGHT'),

            # All cells
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
        ]))
        
        story.append(payment_table)
        story.append(Spacer(1, 20))
        
        # Total section
        try:
            formatted_total = payment.format_amount_with_currency()
        except Exception as e:
            logger.warning(f"Failed to format total for payment {payment.id}: {e}")
            # Fallback formatting
            currency_symbol = '₱' if payment.currency == 'PHP' else '$' if payment.currency == 'USD' else payment.currency + ' '
            formatted_total = f"{currency_symbol}{payment.amount}"
        
        total_data = [
            ['TOTAL PAID:', formatted_total],
        ]
        
        total_table = Table(total_data, colWidths=[4*inch, 2*inch])
        total_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 14),
            ('TEXTCOLOR', (0, 0), (-1, -1), primary_color),
            ('ALIGN', (0, 0), (0, 0), 'RIGHT'),
            ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('TOPPADDING', (0, 0), (-1, -1), 10),
            ('LINEBELOW', (0, 0), (-1, -1), 2, primary_color),
        ]))
        
        story.append(total_table)
        story.append(Spacer(1, 40))
        
        # Payment Method Information
        if payment.payment_method:
            story.append(Paragraph("PAYMENT METHOD", subtitle_style))
            
            method_info = [
                f"Method: {payment.payment_method.get_type_display()}",
            ]
            
            if payment.payment_method.nickname:
                method_info.append(f"Account: {payment.payment_method.nickname}")
                
            if payment.payment_method.last_four:
                method_info.append(f"Ending in: **** {payment.payment_method.last_four}")
            
            for line in method_info:
                story.append(Paragraph(line, body_style))
                
            story.append(Spacer(1, 20))
        
        # Reference Number
        if payment.reference_number:
            story.append(Paragraph(f"Reference Number: {payment.reference_number}", body_style))
            story.append(Spacer(1, 10))
        
        # Notes
        if payment.notes:
            story.append(Paragraph("NOTES", subtitle_style))
            story.append(Paragraph(payment.notes, body_style))
            story.append(Spacer(1, 20))
        
        # Footer with dynamic branding
        story.append(Spacer(1, 40))
        footer_msg = branding.receipt_terms or "Thank you for your payment!"
        story.append(Paragraph(footer_msg, header_style))

        footer_text = f"This receipt was generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}"
        story.append(Paragraph(footer_text, small_style))

        if payment.status == 'COMPLETED':
            story.append(Paragraph("This payment has been successfully processed.", small_style))

        # Company footer
        if branding.pdf_footer_text:
            story.append(Spacer(1, 20))
            story.append(Paragraph(branding.pdf_footer_text, small_style))
        
        # Build the PDF
        try:
            doc.build(story)
            buffer.seek(0)
            return buffer
        except Exception as e:
            logger.error(f"Error generating receipt PDF for payment {payment.id}: {e}")
            raise
    
    @staticmethod
    def generate_invoice_receipt_pdf(invoice):
        """
        Generate a PDF receipt for an invoice (when paid)

        Args:
            invoice: Invoice instance

        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()

        # Get branding context for dynamic colors and company info
        branding = PDFBrandingService.get_branding_context()
        primary_color = branding.primary_color_rgb

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

        # Custom styles with dynamic branding colors
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=primary_color
        )

        subtitle_style = ParagraphStyle(
            'CustomSubtitle',
            parent=styles['Heading2'],
            fontSize=14,
            spaceAfter=20,
            textColor=primary_color
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
            textColor=primary_color,
            alignment=TA_RIGHT
        )
        
        # Header
        story.append(Paragraph("INVOICE RECEIPT", title_style))
        story.append(Spacer(1, 20))
        
        # Invoice Information
        invoice_info_data = [
            ['Invoice Number:', invoice.invoice_id],
            ['Issue Date:', invoice.issue_date.strftime("%B %d, %Y")],
            ['Due Date:', invoice.due_date.strftime("%B %d, %Y")],
            ['Status:', invoice.get_status_display()],
        ]
        
        invoice_info_table = Table(invoice_info_data, colWidths=[2*inch, 3*inch])
        invoice_info_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('TEXTCOLOR', (0, 0), (0, -1), primary_color),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        story.append(invoice_info_table)
        story.append(Spacer(1, 30))
        
        # Client Information
        story.append(Paragraph("BILL TO", subtitle_style))
        
        client = invoice.client
        client_info = [
            f"{client.first_name} {client.last_name}",
            client.email,
        ]
        
        if hasattr(client, 'phone') and client.phone:
            client_info.append(client.phone)
            
        for line in client_info:
            story.append(Paragraph(line, body_style))
            
        story.append(Spacer(1, 20))
        
        # Invoice Items
        story.append(Paragraph("INVOICE ITEMS", subtitle_style))
        
        # Items table header
        items_data = [['Description', 'Quantity', 'Unit Price', 'Total']]
        
        # Add line items
        for item in invoice.line_items.all():
            items_data.append([
                item.description,
                str(item.quantity),
                f"${item.unit_price:.2f}" if invoice.currency == 'USD' else f"₱{item.unit_price:.2f}",
                f"${item.total:.2f}" if invoice.currency == 'USD' else f"₱{item.total:.2f}",
            ])
        
        items_table = Table(items_data, colWidths=[3*inch, 0.8*inch, 1.2*inch, 1.2*inch])
        items_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), primary_color),
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
        currency_symbol = '$' if invoice.currency == 'USD' else '₱'
        
        totals_data = [
            ['Subtotal:', f"{currency_symbol}{invoice.subtotal:.2f}"],
            ['Tax:', f"{currency_symbol}{invoice.tax_amount:.2f}"],
            ['TOTAL:', f"{currency_symbol}{invoice.total_amount:.2f}"],
        ]
        
        totals_table = Table(totals_data, colWidths=[4.8*inch, 1.4*inch])
        totals_table.setStyle(TableStyle([
            # Subtotal and tax
            ('FONTNAME', (0, 0), (-1, 1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, 1), 10),
            ('ALIGN', (0, 0), (-1, 1), 'RIGHT'),

            # Total row
            ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 2), (-1, 2), 12),
            ('TEXTCOLOR', (0, 2), (-1, 2), primary_color),
            ('ALIGN', (0, 2), (-1, 2), 'RIGHT'),
            ('LINEABOVE', (0, 2), (-1, 2), 2, primary_color),

            # All rows
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        story.append(totals_table)
        story.append(Spacer(1, 40))
        
        # Payment Terms
        if invoice.payment_terms:
            story.append(Paragraph("PAYMENT TERMS", subtitle_style))
            story.append(Paragraph(invoice.payment_terms, body_style))
            story.append(Spacer(1, 20))
        
        # Notes
        if invoice.notes:
            story.append(Paragraph("NOTES", subtitle_style))
            story.append(Paragraph(invoice.notes, body_style))
            story.append(Spacer(1, 20))
        
        # Footer
        story.append(Spacer(1, 40))
        if invoice.status == 'PAID':
            story.append(Paragraph("Thank you for your payment!", header_style))
            story.append(Paragraph("This invoice has been paid in full.", small_style))
        else:
            story.append(Paragraph("Payment is due by the due date listed above.", header_style))
        
        footer_text = f"This invoice was generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}"
        story.append(Paragraph(footer_text, small_style))
        
        # Build the PDF
        try:
            doc.build(story)
            buffer.seek(0)
            return buffer
        except Exception as e:
            logger.error(f"Error generating invoice receipt PDF for invoice {invoice.id}: {e}")
            raise