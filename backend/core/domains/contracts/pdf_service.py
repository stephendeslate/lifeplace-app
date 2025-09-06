# backend/core/domains/contracts/pdf_service.py
import io
import logging
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.platypus.frames import Frame
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
import re
import base64
from io import BytesIO

logger = logging.getLogger(__name__)


class ContractPDFService:
    """Service for generating PDF versions of contracts"""
    
    @staticmethod
    def generate_contract_pdf(contract):
        """
        Generate a PDF version of a signed contract
        
        Args:
            contract: EventContract instance
            
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
            fontSize=18,
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
            leftIndent=0,
            rightIndent=0
        )
        
        small_style = ParagraphStyle(
            'SmallText',
            parent=styles['Normal'],
            fontSize=8,
            textColor=colors.grey,
            alignment=TA_LEFT
        )
        
        # Header
        story.append(Paragraph("CONTRACT AGREEMENT", title_style))
        story.append(Spacer(1, 20))
        
        # Contract Information Table
        contract_info_data = [
            ['Contract ID:', f"#{contract.id}"],
            ['Event:', contract.event.name if hasattr(contract.event, 'name') else f"Event #{contract.event.id}"],
            ['Template:', contract.template.name],
            ['Status:', contract.get_status_display()],
            ['Created:', contract.created_at.strftime("%B %d, %Y")],
        ]
        
        if contract.contract_value:
            contract_info_data.append(['Contract Value:', f"{contract.currency} {contract.contract_value}"])
        
        if contract.valid_until:
            contract_info_data.append(['Valid Until:', contract.valid_until.strftime("%B %d, %Y")])
            
        if contract.fully_signed_at:
            contract_info_data.append(['Fully Signed:', contract.fully_signed_at.strftime("%B %d, %Y at %I:%M %p")])
        
        info_table = Table(contract_info_data, colWidths=[2*inch, 4*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(info_table)
        story.append(Spacer(1, 30))
        
        # Contract Content
        story.append(Paragraph("CONTRACT TERMS", subtitle_style))
        story.append(Spacer(1, 15))
        
        # Clean and format contract content
        content = ContractPDFService._clean_html_content(contract.content)
        content_paragraphs = content.split('\n\n')
        
        for paragraph in content_paragraphs:
            if paragraph.strip():
                story.append(Paragraph(paragraph.strip(), body_style))
                story.append(Spacer(1, 12))
        
        story.append(Spacer(1, 30))
        
        # Signatures Section
        if contract.signatures.exists():
            story.append(Paragraph("DIGITAL SIGNATURES", subtitle_style))
            story.append(Spacer(1, 15))
            
            signatures_data = [['Role', 'Signer Name', 'Email', 'Signed Date', 'Verification']]
            
            for signature in contract.signatures.all():
                verification_status = "✓ Verified" if signature.is_verified else "Pending Verification"
                signatures_data.append([
                    signature.get_role_display(),
                    signature.signer_name,
                    signature.signer_email,
                    signature.signed_at.strftime("%m/%d/%Y %I:%M %p"),
                    verification_status
                ])
            
            sig_table = Table(signatures_data, colWidths=[1.2*inch, 1.5*inch, 2*inch, 1.2*inch, 1.1*inch])
            sig_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5aa0')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 8),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ]))
            
            story.append(sig_table)
            story.append(Spacer(1, 30))
        
        # Footer information
        story.append(Spacer(1, 50))
        footer_info = [
            f"Generated on {timezone.now().strftime('%B %d, %Y at %I:%M %p')}",
            f"Contract ID: #{contract.id}",
            "This is a digitally generated contract document."
        ]
        
        for info in footer_info:
            story.append(Paragraph(info, small_style))
        
        # Build PDF
        try:
            doc.build(story, onFirstPage=ContractPDFService._add_watermark, onLaterPages=ContractPDFService._add_watermark)
            pdf_buffer = buffer.getvalue()
            buffer.close()
            
            logger.info(f"Generated PDF for contract {contract.id}")
            return pdf_buffer
            
        except Exception as e:
            logger.error(f"Error generating PDF for contract {contract.id}: {str(e)}")
            raise
    
    @staticmethod
    def _clean_html_content(content):
        """Clean HTML tags and entities from contract content"""
        # Remove HTML tags
        content = re.sub(r'<[^>]+>', '', content)
        
        # Replace HTML entities
        html_entities = {
            '&nbsp;': ' ',
            '&amp;': '&',
            '&lt;': '<',
            '&gt;': '>',
            '&quot;': '"',
            '&#39;': "'",
        }
        
        for entity, replacement in html_entities.items():
            content = content.replace(entity, replacement)
        
        # Clean up multiple spaces and newlines
        content = re.sub(r'\s+', ' ', content)
        content = re.sub(r'\n\s*\n', '\n\n', content)
        
        return content.strip()
    
    @staticmethod
    def _add_watermark(canvas, doc):
        """Add watermark and page numbering to PDF pages"""
        canvas.saveState()
        
        # Add page number
        canvas.setFont('Helvetica', 8)
        canvas.setFillColor(colors.grey)
        canvas.drawRightString(
            doc.width + doc.rightMargin - 10,
            doc.bottomMargin - 20,
            f"Page {canvas.getPageNumber()}"
        )
        
        # Add watermark for draft contracts (if needed)
        # This could be customized based on contract status
        
        canvas.restoreState()
    
    @staticmethod
    def generate_signature_summary_pdf(contract):
        """
        Generate a signature summary PDF for contracts
        
        Args:
            contract: EventContract instance
            
        Returns:
            BytesIO buffer containing the PDF
        """
        buffer = io.BytesIO()
        
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72,
        )
        
        story = []
        styles = getSampleStyleSheet()
        
        title_style = ParagraphStyle(
            'Title',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#2c5aa0')
        )
        
        # Title
        story.append(Paragraph("SIGNATURE VERIFICATION REPORT", title_style))
        story.append(Spacer(1, 30))
        
        # Contract basic info
        story.append(Paragraph(f"<b>Contract ID:</b> #{contract.id}", styles['Normal']))
        story.append(Paragraph(f"<b>Event:</b> {contract.event.name if hasattr(contract.event, 'name') else f'Event #{contract.event.id}'}", styles['Normal']))
        story.append(Paragraph(f"<b>Status:</b> {contract.get_status_display()}", styles['Normal']))
        story.append(Spacer(1, 20))
        
        # Detailed signature information
        if contract.signatures.exists():
            for signature in contract.signatures.all():
                story.append(Paragraph(f"<b>{signature.get_role_display()} Signature</b>", styles['Heading3']))
                
                sig_data = [
                    ['Signer Name:', signature.signer_name],
                    ['Email:', signature.signer_email],
                    ['Title:', signature.signer_title or 'Not specified'],
                    ['Signed Date:', signature.signed_at.strftime("%B %d, %Y at %I:%M:%S %p")],
                    ['Verification Status:', "✓ Verified" if signature.is_verified else "Pending"],
                    ['IP Address:', signature.ip_address or 'Not recorded'],
                    ['User Agent:', signature.user_agent[:50] + '...' if len(signature.user_agent) > 50 else signature.user_agent],
                ]
                
                sig_table = Table(sig_data, colWidths=[2*inch, 4*inch])
                sig_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0f0f0')),
                    ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 1, colors.HexColor('#cccccc')),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('LEFTPADDING', (0, 0), (-1, -1), 6),
                    ('RIGHTPADDING', (0, 0), (-1, -1), 6),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                
                story.append(sig_table)
                story.append(Spacer(1, 20))
        
        # Build and return PDF
        try:
            doc.build(story)
            pdf_buffer = buffer.getvalue()
            buffer.close()
            
            logger.info(f"Generated signature summary PDF for contract {contract.id}")
            return pdf_buffer
            
        except Exception as e:
            logger.error(f"Error generating signature summary PDF for contract {contract.id}: {str(e)}")
            raise