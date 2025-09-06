# backend/core/domains/workflows/management/commands/create_wedding_workflow.py
"""
Management command to create a complete Wedding Workflow with all templates.
This includes email templates, contract template, and workflow stages.
"""

import logging
from django.core.management.base import BaseCommand
from django.db import transaction
from core.domains.workflows.models import WorkflowTemplate, WorkflowStage
from core.domains.communications.models import CommunicationTemplate
from core.domains.contracts.models import ContractTemplate
from core.domains.events.models import EventType

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Creates Wedding Workflow with all email templates and contract'

    def handle(self, *args, **kwargs):
        """Main command handler"""
        self.stdout.write(self.style.NOTICE('Starting Wedding Workflow creation...'))
        
        try:
            with transaction.atomic():
                # Step 1: Create Email Templates
                email_templates = self.create_email_templates()
                
                # Step 2: Create Contract Template
                contract_template = self.create_contract_template()
                
                # Step 3: Create Workflow Template
                workflow = self.create_workflow_template()
                
                # Step 4: Create Workflow Stages
                self.create_workflow_stages(workflow, email_templates, contract_template)
                
                # Step 5: Link to Wedding Event Type
                self.link_to_event_type(workflow)
                
                self.stdout.write(self.style.SUCCESS('✅ Wedding Workflow created successfully!'))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error creating workflow: {str(e)}'))
            raise

    def create_email_templates(self):
        """Create all email templates for the wedding workflow"""
        self.stdout.write('📧 Creating email templates...')
        
        templates = {}
        
        # 1. Quote Email Template
        templates['quote'], created = CommunicationTemplate.objects.get_or_create(
            name='Wedding Quote Email',
            defaults={
                'channel': 'EMAIL',
                'category': 'AUTO',
                'subject_template': 'Your Wedding Quote from LifePlace - {{ event_date }}',
                'body_template': '''
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #e0e0e0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 300;">Your Wedding Quote</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">LifePlace Retreat & Events Center</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px; background: white;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Dear {{ client_name }},
        </p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
            Thank you for considering LifePlace for your special day! We're honored to be part of your wedding journey. 
            Please find below your personalized quote for your wedding event on <strong>{{ event_date }}</strong>.
        </p>
        
        <!-- Quote Details Box -->
        <div style="background: #f8f9fa; border-left: 4px solid #667eea; padding: 25px; margin: 30px 0; border-radius: 4px;">
            <h2 style="color: #333; margin-top: 0; font-size: 20px; margin-bottom: 20px;">Quote Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Event Date:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: 600; text-align: right; border-bottom: 1px solid #e0e0e0;">{{ event_date }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Venue:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: 600; text-align: right; border-bottom: 1px solid #e0e0e0;">{{ venue_details }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Selected Packages:</td>
                    <td style="padding: 10px 0; color: #333; text-align: right; border-bottom: 1px solid #e0e0e0;">{{ packages }}</td>
                </tr>
                <tr>
                    <td style="padding: 15px 0 10px 0; color: #666; font-size: 18px;">Total Amount:</td>
                    <td style="padding: 15px 0 10px 0; color: #667eea; font-weight: bold; text-align: right; font-size: 24px;">₱{{ total_amount }}</td>
                </tr>
                <tr>
                    <td style="padding: 5px 0; color: #666;">Required Deposit (30%):</td>
                    <td style="padding: 5px 0; color: #333; font-weight: 600; text-align: right;">₱{{ deposit_amount }}</td>
                </tr>
            </table>
        </div>
        
        <!-- Important Information -->
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h3 style="color: #856404; margin-top: 0; font-size: 16px;">📌 Important Information</h3>
            <ul style="color: #856404; margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                <li>This quote is valid until <strong>{{ valid_until }}</strong></li>
                <li>A 30% deposit is required to secure your booking</li>
                <li>The remaining 70% is due one day before or upon check-in</li>
                <li>Price includes 12% VAT and 10% service charge</li>
            </ul>
        </div>
        
        <!-- Call to Action -->
        <div style="text-align: center; margin: 40px 0;">
            <a href="{{ quote_link }}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                Accept Quote & Proceed
            </a>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            If you have any questions or would like to discuss customization options, please don't hesitate to contact us.
        </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; margin: 5px 0; font-size: 14px;">LifePlace Retreat & Events Center</p>
        <p style="color: #999; margin: 5px 0; font-size: 13px;">Creating Memorable Moments for Your Special Day</p>
        <p style="color: #999; margin: 15px 0 5px 0; font-size: 12px;">© 2025 LifePlace. All rights reserved.</p>
    </div>
</div>
                ''',
                'variables_schema': {
                    'required': ['client_name', 'event_date', 'total_amount', 'deposit_amount', 'valid_until'],
                    'optional': ['packages', 'venue_details', 'quote_link']
                },
                'is_system': True
            }
        )
        if created:
            self.stdout.write(f'  ✅ Created: {templates["quote"].name}')
        else:
            self.stdout.write(f'  ℹ️  Exists: {templates["quote"].name}')

        # 2. Invoice Email Template
        templates['invoice'], created = CommunicationTemplate.objects.get_or_create(
            name='Wedding Invoice Email',
            defaults={
                'channel': 'EMAIL',
                'category': 'AUTO',
                'subject_template': 'Invoice #{{ invoice_number }} - Your Wedding Booking at LifePlace',
                'body_template': '''
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #e0e0e0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 300;">Payment Received</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">Thank you for your payment!</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px; background: white;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Dear {{ client_name }},
        </p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
            We have received your payment and are pleased to confirm your wedding booking. Your special day is officially secured!
        </p>
        
        <!-- Invoice Details -->
        <div style="background: #f8f9fa; padding: 25px; margin: 30px 0; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                <h2 style="color: #333; margin: 0; font-size: 20px;">Invoice Details</h2>
                <span style="background: #28a745; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; font-weight: 600;">PAID</span>
            </div>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Invoice Number:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: 600; text-align: right; border-bottom: 1px solid #e0e0e0;">#{{ invoice_number }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Event Date:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: 600; text-align: right; border-bottom: 1px solid #e0e0e0;">{{ event_date }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Payment Date:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: 600; text-align: right; border-bottom: 1px solid #e0e0e0;">{{ payment_date }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Amount Paid:</td>
                    <td style="padding: 10px 0; color: #28a745; font-weight: bold; text-align: right; border-bottom: 1px solid #e0e0e0; font-size: 18px;">₱{{ amount_paid }}</td>
                </tr>
                {% if remaining_balance > 0 %}
                <tr>
                    <td style="padding: 10px 0; color: #666;">Remaining Balance:</td>
                    <td style="padding: 10px 0; color: #dc3545; font-weight: 600; text-align: right;">₱{{ remaining_balance }}</td>
                </tr>
                <tr>
                    <td colspan="2" style="padding: 10px 0; color: #666; font-size: 13px; font-style: italic;">
                        * Remaining balance due one day before or upon check-in
                    </td>
                </tr>
                {% endif %}
            </table>
        </div>
        
        <!-- Booking Confirmation -->
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h3 style="color: #155724; margin-top: 0; font-size: 16px;">✅ Booking Confirmed!</h3>
            <p style="color: #155724; margin: 10px 0; line-height: 1.6;">
                Your wedding venue is now officially reserved. We're excited to be part of your special day!
            </p>
        </div>
        
        <!-- Next Steps -->
        <div style="margin: 30px 0;">
            <h3 style="color: #333; font-size: 18px; margin-bottom: 15px;">What's Next?</h3>
            <ol style="color: #555; line-height: 1.8; padding-left: 20px;">
                <li>You will receive a contract for e-signature shortly</li>
                <li>Our team will contact you to discuss event details</li>
                {% if remaining_balance > 0 %}
                <li>Please settle the remaining balance before check-in</li>
                {% endif %}
                <li>Start planning your dream wedding!</li>
            </ol>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            If you have any questions about your invoice or booking, please don't hesitate to contact us.
        </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; margin: 5px 0; font-size: 14px;">LifePlace Retreat & Events Center</p>
        <p style="color: #999; margin: 5px 0; font-size: 13px;">Your Wedding Journey Begins Here</p>
        <p style="color: #999; margin: 15px 0 5px 0; font-size: 12px;">© 2025 LifePlace. All rights reserved.</p>
    </div>
</div>
                ''',
                'variables_schema': {
                    'required': ['client_name', 'invoice_number', 'amount_paid', 'payment_date', 'event_date'],
                    'optional': ['remaining_balance']
                },
                'is_system': True
            }
        )
        if created:
            self.stdout.write(f'  ✅ Created: {templates["invoice"].name}')
        else:
            self.stdout.write(f'  ℹ️  Exists: {templates["invoice"].name}')

        # 3. Contract Email Template
        templates['contract'], created = CommunicationTemplate.objects.get_or_create(
            name='Wedding Contract for E-Signature',
            defaults={
                'channel': 'EMAIL',
                'category': 'AUTO',
                'subject_template': '📝 Wedding Contract Ready for Signature - Action Required',
                'body_template': '''
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #e0e0e0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #fd7e14 0%, #dc3545 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 300;">Contract Ready for Signature</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">Action Required Within 48 Hours</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px; background: white;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Dear {{ client_name }},
        </p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
            Your wedding contract is now ready for your review and signature. This is the final step to formalize your booking for your wedding on <strong>{{ event_date }}</strong>.
        </p>
        
        <!-- Contract Summary -->
        <div style="background: #f8f9fa; padding: 25px; margin: 30px 0; border-radius: 8px;">
            <h2 style="color: #333; margin-top: 0; font-size: 20px; margin-bottom: 20px;">Contract Summary</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; color: #666;">Event Date:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: 600; text-align: right;">{{ event_date }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666;">Venue:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: 600; text-align: right;">{{ venue_name }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666;">Total Contract Value:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: 600; text-align: right;">₱{{ total_amount }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666;">Signature Deadline:</td>
                    <td style="padding: 10px 0; color: #dc3545; font-weight: 600; text-align: right;">{{ signature_deadline }}</td>
                </tr>
            </table>
        </div>
        
        <!-- Important Terms Notice -->
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h3 style="color: #856404; margin-top: 0; font-size: 16px;">📋 Key Contract Terms</h3>
            <ul style="color: #856404; margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                <li>Hours of Operation: Event must conclude by 2:00 AM</li>
                <li>Payment Terms: 30% deposit paid, 70% balance due before check-in</li>
                <li>Cancellation: 20% liquidated damages if cancelled within 30 days</li>
                <li>Tax & Service: 12% VAT and 10% service charge included</li>
                <li>Security deposit: ₱2,000 refundable key deposit at check-in</li>
            </ul>
        </div>
        
        <!-- Call to Action -->
        <div style="text-align: center; margin: 40px 0;">
            <a href="{{ contract_link }}" style="background: linear-gradient(135deg, #fd7e14 0%, #dc3545 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(253, 126, 20, 0.3);">
                Review & Sign Contract
            </a>
            <p style="color: #666; font-size: 13px; margin-top: 15px;">
                This link will expire on {{ signature_deadline }}
            </p>
        </div>
        
        <!-- What to Expect -->
        <div style="margin: 30px 0;">
            <h3 style="color: #333; font-size: 18px; margin-bottom: 15px;">What to Expect:</h3>
            <ol style="color: #555; line-height: 1.8; padding-left: 20px;">
                <li>Click the button above to review the full contract</li>
                <li>Read through all terms and conditions carefully</li>
                <li>Sign electronically using your mouse or touchscreen</li>
                <li>Receive a copy of the signed contract via email</li>
            </ol>
        </div>
        
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 15px; margin: 30px 0; border-radius: 4px;">
            <p style="color: #155724; margin: 0; font-size: 14px; line-height: 1.6;">
                <strong>Note:</strong> The contract must be signed within 48 hours to maintain your booking. 
                If you have any questions about the terms, please contact us immediately.
            </p>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            Thank you for choosing LifePlace for your special day. We look forward to making your wedding unforgettable!
        </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; margin: 5px 0; font-size: 14px;">LifePlace Retreat & Events Center</p>
        <p style="color: #999; margin: 5px 0; font-size: 13px;">Legal Department</p>
        <p style="color: #999; margin: 15px 0 5px 0; font-size: 12px;">© 2025 LifePlace. All rights reserved.</p>
    </div>
</div>
                ''',
                'variables_schema': {
                    'required': ['client_name', 'event_date', 'venue_name', 'total_amount', 'contract_link', 'signature_deadline'],
                    'optional': []
                },
                'is_system': True
            }
        )
        if created:
            self.stdout.write(f'  ✅ Created: {templates["contract"].name}')
        else:
            self.stdout.write(f'  ℹ️  Exists: {templates["contract"].name}')

        # 4. Survey Email Template
        templates['survey'], created = CommunicationTemplate.objects.get_or_create(
            name='Wedding Feedback Survey',
            defaults={
                'channel': 'EMAIL',
                'category': 'AUTO',
                'subject_template': '💕 How was your wedding at LifePlace? We\'d love to hear!',
                'body_template': '''
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #e0e0e0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 300;">Thank You for Choosing LifePlace!</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">We hope your wedding was everything you dreamed of</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px; background: white;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Dear {{ client_name }},
        </p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
            Congratulations on your marriage! We were honored to be part of your special day on <strong>{{ event_date }}</strong> at {{ venue_name }}.
        </p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
            Your feedback is incredibly valuable to us. It helps us continue to create magical moments for future couples. 
            Would you mind taking 3 minutes to share your experience?
        </p>
        
        <!-- Survey Highlights -->
        <div style="background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); padding: 25px; margin: 30px 0; border-radius: 8px;">
            <h2 style="color: #333; margin-top: 0; font-size: 20px; margin-bottom: 20px; text-align: center;">
                Help Us Improve! 🌟
            </h2>
            
            <div style="text-align: center;">
                <p style="color: #555; margin-bottom: 20px;">Your feedback will help us with:</p>
                <ul style="color: #555; text-align: left; display: inline-block; margin: 0; padding-left: 20px; line-height: 1.8;">
                    <li>Venue improvements and amenities</li>
                    <li>Service quality enhancement</li>
                    <li>Future couple recommendations</li>
                    <li>Staff recognition and training</li>
                </ul>
            </div>
        </div>
        
        <!-- Call to Action -->
        <div style="text-align: center; margin: 40px 0;">
            <a href="{{ survey_link }}" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 30px; font-size: 16px; font-weight: 600; display: inline-block; box-shadow: 0 4px 15px rgba(240, 147, 251, 0.3);">
                Share Your Experience
            </a>
            <p style="color: #999; font-size: 13px; margin-top: 15px;">
                Survey takes only 3 minutes to complete
            </p>
        </div>
        
        <!-- Incentive -->
        <div style="background: #e7f3ff; border: 1px solid #b3d9ff; padding: 20px; margin: 30px 0; border-radius: 4px; text-align: center;">
            <h3 style="color: #0066cc; margin-top: 0; font-size: 16px;">🎁 Special Thank You</h3>
            <p style="color: #0066cc; margin: 10px 0; line-height: 1.6;">
                Complete the survey and receive 10% off your next event booking with us!
            </p>
        </div>
        
        <!-- Review Request -->
        <div style="border-top: 1px solid #e0e0e0; margin-top: 40px; padding-top: 30px;">
            <p style="color: #666; font-size: 14px; line-height: 1.6; text-align: center;">
                <strong>Loved your experience?</strong><br>
                We'd be grateful if you could also leave a review on:
            </p>
            <div style="text-align: center; margin-top: 20px;">
                <a href="#" style="color: #4267B2; text-decoration: none; margin: 0 10px;">Facebook</a> |
                <a href="#" style="color: #EA4335; text-decoration: none; margin: 0 10px;">Google</a> |
                <a href="#" style="color: #E4405F; text-decoration: none; margin: 0 10px;">Instagram</a>
            </div>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            Once again, congratulations on your marriage! We wish you a lifetime of love and happiness together.
        </p>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
            Warmest regards,<br>
            The LifePlace Team
        </p>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; margin: 5px 0; font-size: 14px;">LifePlace Retreat & Events Center</p>
        <p style="color: #999; margin: 5px 0; font-size: 13px;">Thank You for Being Part of Our Story</p>
        <p style="color: #999; margin: 15px 0 5px 0; font-size: 12px;">© 2025 LifePlace. All rights reserved.</p>
    </div>
</div>
                ''',
                'variables_schema': {
                    'required': ['client_name', 'event_date', 'survey_link', 'venue_name'],
                    'optional': []
                },
                'is_system': True
            }
        )
        if created:
            self.stdout.write(f'  ✅ Created: {templates["survey"].name}')
        else:
            self.stdout.write(f'  ℹ️  Exists: {templates["survey"].name}')

        # 5. Booking Confirmation Email
        templates['confirmation'], created = CommunicationTemplate.objects.get_or_create(
            name='Wedding Booking Confirmed',
            defaults={
                'channel': 'EMAIL',
                'category': 'AUTO',
                'subject_template': '🎉 Your Wedding Booking is Confirmed - {{ event_date }}',
                'body_template': '''
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 700px; margin: 0 auto; border: 1px solid #e0e0e0;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 300;">Booking Confirmed!</h1>
        <p style="color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;">Your wedding venue is secured</p>
    </div>
    
    <!-- Content -->
    <div style="padding: 40px 30px; background: white;">
        <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
            Dear {{ client_name }},
        </p>
        
        <p style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 30px;">
            Great news! Your wedding booking at LifePlace is now officially confirmed. We're thrilled to be part of your special day!
        </p>
        
        <!-- Booking Details -->
        <div style="background: #f8f9fa; padding: 25px; margin: 30px 0; border-radius: 8px;">
            <h2 style="color: #333; margin-top: 0; font-size: 20px; margin-bottom: 20px;">Your Booking Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Booking Reference:</td>
                    <td style="padding: 10px 0; color: #667eea; font-weight: bold; text-align: right; border-bottom: 1px solid #e0e0e0;">{{ booking_reference }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666; border-bottom: 1px solid #e0e0e0;">Event Date:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: 600; text-align: right; border-bottom: 1px solid #e0e0e0;">{{ event_date }}</td>
                </tr>
                <tr>
                    <td style="padding: 10px 0; color: #666;">Venue:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: 600; text-align: right;">{{ venue_name }}</td>
                </tr>
            </table>
        </div>
        
        <!-- Status Update -->
        <div style="background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h3 style="color: #155724; margin-top: 0; font-size: 16px;">✅ Status: CONFIRMED</h3>
            <p style="color: #155724; margin: 10px 0; line-height: 1.6;">
                Your payment has been received and your contract has been processed. Your wedding venue is now fully secured!
            </p>
        </div>
        
        <!-- What Happens Next -->
        <div style="margin: 30px 0;">
            <h3 style="color: #333; font-size: 18px; margin-bottom: 15px;">What Happens Next?</h3>
            <ol style="color: #555; line-height: 1.8; padding-left: 20px;">
                <li>Our wedding coordinator will contact you within 48 hours</li>
                <li>We'll schedule a venue walkthrough at your convenience</li>
                <li>You'll receive our preferred vendor list</li>
                <li>We'll assist with any special requests or customizations</li>
            </ol>
        </div>
        
        <!-- Important Reminders -->
        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 20px; margin: 30px 0; border-radius: 4px;">
            <h3 style="color: #856404; margin-top: 0; font-size: 16px;">📌 Important Reminders</h3>
            <ul style="color: #856404; margin: 10px 0; padding-left: 20px; line-height: 1.8;">
                <li>Check-in time: 2:00 PM on event day</li>
                <li>Supplier guidelines must be submitted 2 weeks before</li>
                <li>Final guest count needed 1 week before</li>
                <li>Balance payment (if any) due upon check-in</li>
            </ul>
        </div>
        
        <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
            If you have any questions or need assistance with wedding planning, our team is here to help every step of the way.
        </p>
        
        <div style="text-align: center; margin: 40px 0; padding: 25px; background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); border-radius: 8px;">
            <h2 style="color: #333; margin: 0 0 10px 0; font-size: 24px;">Let's Create Magic Together! ✨</h2>
            <p style="color: #555; margin: 0; font-size: 14px;">
                Your dream wedding awaits at LifePlace
            </p>
        </div>
    </div>
    
    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
        <p style="color: #666; margin: 5px 0; font-size: 14px;">LifePlace Retreat & Events Center</p>
        <p style="color: #999; margin: 5px 0; font-size: 13px;">Making Your Special Day Unforgettable</p>
        <p style="color: #999; margin: 15px 0 5px 0; font-size: 12px;">© 2025 LifePlace. All rights reserved.</p>
    </div>
</div>
                ''',
                'variables_schema': {
                    'required': ['client_name', 'event_date', 'venue_name', 'booking_reference'],
                    'optional': []
                },
                'is_system': True
            }
        )
        if created:
            self.stdout.write(f'  ✅ Created: {templates["confirmation"].name}')
        else:
            self.stdout.write(f'  ℹ️  Exists: {templates["confirmation"].name}')

        return templates

    def create_contract_template(self):
        """Create the wedding contract template with full terms"""
        self.stdout.write('📄 Creating contract template...')
        
        contract_content = '''
<h1 style="text-align: center;">WEDDING EVENT CONTRACT</h1>
<h2 style="text-align: center;">Terms & Conditions</h2>

<p><strong>Event Date:</strong> {{ event_date }}</p>
<p><strong>Client Name:</strong> {{ client_name }}</p>
<p><strong>Venue:</strong> {{ venue_name }}</p>
<p><strong>Total Contract Price:</strong> ₱{{ total_amount }}</p>

<hr>

<h3>1. HOURS OF OPERATION</h3>
<ul>
<li>All activities including cleanup shall conclude no later than 2am on the date following the reserved date unless prior written permission has been obtained.</li>
<li>The Client will be held responsible for any and all guests on the premises.</li>
<li>The Client will be permitted to enter the facilities up to one hour before the reserved time frame for preparation, facility inspection and equipment drop off.</li>
</ul>

<h3>2. SERVICES OFFERED</h3>
<ul>
<li>LPREC will provide staff during the event should any issues arise but only limited to assistance, security and information regarding the facility.</li>
<li>LPREC's staff will provide entry to the facility as well as close the facility upon conclusion of the reservation. Unless the additional service packages have been purchased, the LPREC's staff will not serve, secure, or decorate during or before the event.</li>
<li>Additional services are offered including maintenance, security, tables and chairs set up, and food service. If table and chair services are requested the client must provide a layout for the event before the event date.</li>
<li>The facility will provide deep cleaning both before and after the event. It is the Client's responsibility to inspect the Facility prior to Rental and to perform basic cleanup at the conclusion of the reservation.</li>
</ul>

<h3>3. MISCELLANEOUS TERMS</h3>
<ul>
<li>LPREC can only provide up to 5,000watts electric supply all through out the stay and event. The Client can provide their personal choice of generator provider or they can request a quote for GenSet from LifePlace.</li>
<li>Bringing of firearms, weapons of any type are strictly prohibited.</li>
<li>No bringing and eating of food and the like inside the camping tent.</li>
<li>Remain at the designated sleeping area after lights off.</li>
<li>Do not move any fixtures, church pews and other LPREC's equipment from one place to another.</li>
<li>Any lost and damages (damaged linens, broken items, etc.) inside LPREC shall be charged accordingly to the guest.</li>
<li>No live animals will be allowed on the premises (Excluding service animals).</li>
<li>All guests attending the event shall remain within the designated areas.</li>
<li>LPREC will not be held liable for any property left on the premises after the event's conclusion.</li>
<li>All facility staff will be permitted to enter the premises at any time during as well as after the event.</li>
<li>LPREC will be permitted to photograph the event during the event so long as such the event is not disrupted.</li>
<li>The Client's guest number may not exceed the allowed number of people in the facility at any time during the event.</li>
<li>No smoking will be permitted in any area of the facility at any time.</li>
<li>Alcohol consumption during the event requires prior approval by the Owner and will require additional Php 2,000 corkage fee and security.</li>
</ul>

<h3>4. PAYMENT</h3>
<ul>
<li>Prior to this agreement date, the client has signed and submitted the payment contract.</li>
<li>A reservation payment equivalent to thirty percent (30%) of the Total Contract Price (TCP) has been made upon signing. This reservation payment is non-refundable and non-deductible.</li>
<li>Settlement of the remaining 70% of the TCP shall be paid a day or upon check-in.</li>
<li>In case of Client cancellation, 50% of the total payment will be deducted as administrative processing fee.</li>
<li>Late payments are subject to 5% of the invoice amount, as a penalty charge payable upon check-out.</li>
<li>Downpayment of 30% of the TCP shall be paid within 7 days to block the date/s officially.</li>
<li>Failure to settle the 30% of the TCP is subject to termination of the contract.</li>
<li>A security deposit fee of P2,000 for keys upon check-in is required and Refundable upon check out and facility inspection.</li>
</ul>

<h3>5. TAX AND SERVICE CHARGE</h3>

<h4>5.1 Definition of Terms:</h4>
<p>"Tax inclusive" shall mean that the total price includes all applicable taxes and fees required by law. "Service charge" shall mean a percentage of the total price added as compensation for the service provided.</p>

<h4>5.2 Calculation of Tax and Service Charge:</h4>
<p>The tax shall be calculated based on the applicable tax rate of 12% the total price. The service charge shall be calculated based on a percentage of 10% on the total price.</p>

<h4>5.3 Responsibility for Payment:</h4>
<p>The customer shall be responsible for paying the total price, including the tax and service charge, to the vendor.</p>

<h4>5.4 Applicable Laws and Regulations:</h4>
<p>The vendor shall comply with all applicable laws and regulations related to tax and service charge, including but not limited to any reporting and remittance requirements.</p>

<h3>6. CANCELLATION POLICY</h3>
<ul>
<li>The Client may cancel this agreement within 30 days before the event date. In an event that The Client cancels the booking less than 30 days prior to the event, the Client is required to settle 20% of the total contract as liquidated damage.</li>
<li>Should the Owner choose to cancel this facility rental agreement due to Client's violation of the terms of this agreement, any fees paid by the Client are considered non-refundable.</li>
</ul>

<h3>7. RESCHEDULING</h3>
<p>Rescheduling the event must take place no later than 3 months prior to the event date, otherwise, the cancellation policy will take place. Rescheduling fee equivalent to 10% of the contract price shall be applied.</p>

<h3>8. INSURANCE</h3>
<p>LPREC maintains general liability, fire, and property insurance. However, LPREC'S insurance policies do not cover or protect against loss of Client's property or damage or injury to Client's guests or their property.</p>

<h3>9. SUPPLIERS GUIDELINES</h3>
<ul>
<li>Upon signing of this contract, the Client agrees with LPREC's "Suppliers Guidelines" document.</li>
<li>Kindly forward this link to each of your suppliers and append their signatures on this document: https://drive.google.com/drive/folders/1J0aVHt9IRI448qoD6hRIzSw5b0KRN8IX?usp=share_link</li>
<li>Deadline of submission is 2 weeks before the event date.</li>
<li>Suppliers need to submit this document together with 1 valid ID to the receptionist.</li>
</ul>

<h3>10. SECURITY</h3>
<ul>
<li>Client shall provide ample security for all guests during the event or the Client can request for additional security with a minimal fee from LPREC payable upon check-out.</li>
<li>A security guard will be provided and rove during the stay of the client.</li>
<li>In the event of youth or underage event, additional security will be required. The client may provide chaperones for the youth event with prior authorization.</li>
</ul>

<h3>11. ALCOHOLIC BEVERAGE CONSUMPTION REGULATIONS</h3>
<ul>
<li>A separate corkage fee amounting to Php 2,000 will be charged to the Client upon confirmation of booking.</li>
<li>No individuals below the legal age shall be permitted to consume alcoholic beverage at any time inside the Facility.</li>
<li>Alcoholic beverages sold to guests must be provided by a bartender who holds all required licenses.</li>
</ul>

<h3>12. CABANA'S RULES AND REGULATIONS</h3>
<ul>
<li>Standard Check-in time is at 2:00 p.m., check out time is 12:00 p.m. the following day.</li>
<li>Check-out time must be followed by the guest/s regardless of late check-in.</li>
<li>Failure to check out at 12:00 p.m. will result in an additional fee, Php 300.00 per hour/per cabana will be charged. The extension will be given depending on the availability of the room.</li>
<li>Cooking or bringing in electric appliances is prohibited.</li>
<li>Removing items from the cabana/ Havilah or moving them to another place is prohibited.</li>
<li>The guest should notify the management upon noticing any damage.</li>
<li>Only one pet is allowed per cabana for an extra charge. A cleaning fee of php1,500/night will be charged upon check out. Guests bear full responsibility for any damage caused by their pets.</li>
</ul>

<h3>13. HAVILAH RULES AND REGULATIONS</h3>
<ul>
<li>Standard Check-in time is at 2:00 p.m., check out time is 12:00 p.m. the following day.</li>
<li>The parties agree that the use of air conditioning units shall be restricted to a maximum of twelve (12) hours daily, specifically from 6:00 PM to 6:00 AM each day. This schedule is intended to optimize energy efficiency and reduce operational costs while maintaining comfort during the designated hours.</li>
<li>Check-out time must be followed by the guest/s regardless of late check-in.</li>
<li>Failure to check out at 12:00 p.m. will result in an additional fee, Php 300.00 per hour/per cabana will be charged. The extension will be given depending on the availability of the room.</li>
<li>Cooking or bringing in electric appliances is prohibited.</li>
<li>Removing items from the cabana/ Havilah or moving them to another place is prohibited.</li>
<li>The guest should notify the management upon noticing any damage.</li>
<li>Only one pet is allowed per cabana for an extra charge. A cleaning fee of php1,500/night will be charged upon check out. Guests bear full responsibility for any damage caused by their pets.</li>
</ul>

<h3>14. OPEN FIELD AND PAVILION</h3>
<ul>
<li>A Clean As You Go policy will be implemented.</li>
<li>Suppliers shall be required to maintain cleanliness. Suppliers are required to bring their own trash bags. They are incharge of disposing of their waste outside the venue.</li>
<li>Suppliers / guests shall be held liable for damages to properties belonging to the venue.</li>
<li>The venue may be used for 3 hrs (proper program) per event. (5-6 hours for ingress and 1-2 hours for egress) An additional payment will be charged for every use of electricity which is not included in the package or contract. (1000/3hrs)</li>
<li>For night renters, the sound/music must be turned off on or before 9 o'clock in the evening.</li>
<li>The use of tape, wires, tacks, nails, and glue to hang decorations is upon approval of the management.</li>
<li>Children are not permitted to wander the grounds without the supervision of an adult.</li>
<li>No glitter, rice, or confetti may be used on the ground indoors or outdoors.</li>
</ul>

<h3>15. THE SANCTUARY</h3>
<ul>
<li>The use of Sanctuary is maximum of three (3) hours.</li>
<li>Use of party poppers, rice, and confetti are strictly prohibited with a violation fee of Php 1, 500.00 as cleaning fee.</li>
<li>Laptop for music and video playback during the ceremony should be provided by the client.</li>
<li>Styling / Florist are required to bring their trash/ disposals upon egress.</li>
</ul>

<h3>16. INDEMNIFICATION</h3>
<ul>
<li>Client agrees to hold facility harmless shall any liabilities, claims, or causes of action that may take place as a result of the Client's use of the Facility.</li>
<li>The Owner shall not be held liable for any damages, loss or injuries to personnel or guests during the event.</li>
</ul>

<h3>17. SWIMMING POOL</h3>
<ul>
<li>Pool hours: The pool is open from 8am-6pm.</li>
<li>The use of pool depends on the availability included in the clients package.</li>
<li>Please Refer to our swimming guidelines for more information.</li>
</ul>

<hr>

<div style="margin-top: 50px;">
<p><strong>CLIENT ACKNOWLEDGMENT:</strong></p>
<p>By signing below, I acknowledge that I have read, understood, and agree to all terms and conditions outlined in this contract.</p>

<table style="width: 100%; margin-top: 30px;">
<tr>
<td style="width: 45%;">
<p>_______________________________</p>
<p><strong>{{ client_name }}</strong></p>
<p>Client Signature</p>
<p>Date: {{ signature_date }}</p>
</td>
<td style="width: 10%;"></td>
<td style="width: 45%;">
<p>_______________________________</p>
<p><strong>LifePlace Representative</strong></p>
<p>Authorized Signature</p>
<p>Date: {{ signature_date }}</p>
</td>
</tr>
</table>
</div>
        '''
        
        contract_template, created = ContractTemplate.objects.get_or_create(
            name='Wedding Contract Terms & Conditions',
            defaults={
                'description': 'Comprehensive wedding event contract with all terms and conditions',
                'content': contract_content,
                'requires_signature': True,
                'requires_witness': False,
                'requires_company_signature': True,
                'allows_amendments': True,
                'amendment_requires_signature': True,
                'variables': [
                    'event_date',
                    'client_name', 
                    'venue_name',
                    'total_amount',
                    'signature_date'
                ],
                'sections': [
                    {'title': 'Hours of Operation', 'order': 1},
                    {'title': 'Services Offered', 'order': 2},
                    {'title': 'Miscellaneous Terms', 'order': 3},
                    {'title': 'Payment', 'order': 4},
                    {'title': 'Tax and Service Charge', 'order': 5},
                    {'title': 'Cancellation Policy', 'order': 6},
                    {'title': 'Rescheduling', 'order': 7},
                    {'title': 'Insurance', 'order': 8},
                    {'title': 'Suppliers Guidelines', 'order': 9},
                    {'title': 'Security', 'order': 10},
                    {'title': 'Alcoholic Beverage Consumption', 'order': 11},
                    {'title': 'Cabana Rules', 'order': 12},
                    {'title': 'Havilah Rules', 'order': 13},
                    {'title': 'Open Field and Pavilion', 'order': 14},
                    {'title': 'The Sanctuary', 'order': 15},
                    {'title': 'Indemnification', 'order': 16},
                    {'title': 'Swimming Pool', 'order': 17}
                ],
                'signature_requirements': ['CLIENT', 'COMPANY_REP']
            }
        )
        
        if created:
            self.stdout.write(f'  ✅ Created: {contract_template.name}')
        else:
            self.stdout.write(f'  ℹ️  Exists: {contract_template.name}')
            
        return contract_template

    def create_workflow_template(self):
        """Create the wedding workflow template"""
        self.stdout.write('🔄 Creating workflow template...')
        
        workflow, created = WorkflowTemplate.objects.get_or_create(
            name='Wedding Workflow',
            defaults={
                'description': 'Complete wedding event workflow from lead to post-production',
                'is_active': True
            }
        )
        
        if created:
            self.stdout.write(f'  ✅ Created: {workflow.name}')
        else:
            self.stdout.write(f'  ℹ️  Exists: {workflow.name}')
            
        return workflow

    def create_workflow_stages(self, workflow, email_templates, contract_template):
        """Create all workflow stages"""
        self.stdout.write('📋 Creating workflow stages...')
        
        # Clear existing stages to ensure clean setup
        workflow.stages.all().delete()
        
        # LEAD Stage
        stage1, _ = WorkflowStage.objects.get_or_create(
            template=workflow,
            stage='LEAD',
            order=1,
            defaults={
                'name': 'Send Quote',
                'is_automated': True,
                'automation_type': 'EMAIL',
                'trigger_time': 'ON_CREATION',
                'email_template': email_templates['quote'],
                'trigger_on_event_created': True,
                'metadata': {
                    'description': 'Automatically send quote when event is created'
                }
            }
        )
        self.stdout.write(f'  ✅ Stage: {stage1.name}')
        
        stage2, _ = WorkflowStage.objects.get_or_create(
            template=workflow,
            stage='LEAD',
            order=2,
            defaults={
                'name': 'Payment Received - Send Invoice',
                'is_automated': True,
                'automation_type': 'EMAIL',
                'trigger_time': 'ON_PAYMENT_RECEIVED',
                'email_template': email_templates['invoice'],
                'trigger_on_payment_received': True,
                'progression_condition': 'PAYMENT_RECEIVED',
                'metadata': {
                    'description': 'Send invoice when deposit payment is received',
                    'next_stage': 'PRODUCTION',
                    'update_event_status': 'CONFIRMED'
                }
            }
        )
        self.stdout.write(f'  ✅ Stage: {stage2.name}')
        
        # PRODUCTION Stage
        stage3, _ = WorkflowStage.objects.get_or_create(
            template=workflow,
            stage='PRODUCTION',
            order=1,
            defaults={
                'name': 'Send Contract for E-Signature',
                'is_automated': True,
                'automation_type': 'CONTRACT',
                'trigger_time': 'ON_STAGE_ENTRY',
                'email_template': email_templates['contract'],
                'metadata': {
                    'description': 'Send contract for electronic signature',
                    'contract_template_id': contract_template.id,
                    'signature_deadline_hours': 48
                }
            }
        )
        self.stdout.write(f'  ✅ Stage: {stage3.name}')
        
        stage4, _ = WorkflowStage.objects.get_or_create(
            template=workflow,
            stage='PRODUCTION',
            order=2,
            defaults={
                'name': 'Contract Signed',
                'is_automated': False,
                'trigger_on_contract_signed': True,
                'metadata': {
                    'description': 'Track when contract is signed'
                }
            }
        )
        self.stdout.write(f'  ✅ Stage: {stage4.name}')
        
        stage5, _ = WorkflowStage.objects.get_or_create(
            template=workflow,
            stage='PRODUCTION',
            order=3,
            defaults={
                'name': 'Wedding Event Day',
                'is_automated': True,
                'automation_type': 'TASK',
                'trigger_time': 'EVENT_DATE',
                'task_description': 'Wedding event is happening today! Ensure all preparations are complete.',
                'metadata': {
                    'description': 'Create task for wedding day',
                    'task_priority': 'HIGH',
                    'task_due_date': 'event_start_date'
                }
            }
        )
        self.stdout.write(f'  ✅ Stage: {stage5.name}')
        
        stage6, _ = WorkflowStage.objects.get_or_create(
            template=workflow,
            stage='PRODUCTION',
            order=4,
            defaults={
                'name': 'Day After Event - Move to Post-Production',
                'is_automated': True,
                'trigger_time': 'AFTER_EVENT_DATE_1_DAY',
                'metadata': {
                    'description': 'Automatically move to post-production stage',
                    'next_stage': 'POST_PRODUCTION'
                }
            }
        )
        self.stdout.write(f'  ✅ Stage: {stage6.name}')
        
        # POST_PRODUCTION Stage
        stage7, _ = WorkflowStage.objects.get_or_create(
            template=workflow,
            stage='POST_PRODUCTION',
            order=1,
            defaults={
                'name': 'Send Feedback Survey',
                'is_automated': True,
                'automation_type': 'EMAIL',
                'trigger_time': 'ON_STAGE_ENTRY',
                'email_template': email_templates['survey'],
                'metadata': {
                    'description': 'Send feedback survey to client'
                }
            }
        )
        self.stdout.write(f'  ✅ Stage: {stage7.name}')
        
        stage8, _ = WorkflowStage.objects.get_or_create(
            template=workflow,
            stage='POST_PRODUCTION', 
            order=2,
            defaults={
                'name': 'Mark Event Complete',
                'is_automated': True,
                'automation_type': 'TASK',
                'trigger_time': 'ON_STAGE_ENTRY',
                'task_description': 'Mark event as completed and archive records',
                'metadata': {
                    'description': 'Final stage - mark event as completed',
                    'update_event_status': 'COMPLETED'
                }
            }
        )
        self.stdout.write(f'  ✅ Stage: {stage8.name}')

    def link_to_event_type(self, workflow):
        """Link workflow to wedding event type"""
        self.stdout.write('🔗 Linking workflow to Wedding event type...')
        
        try:
            wedding_event_type = EventType.objects.get(name='Wedding')
            
            # Update workflow to link to event type
            workflow.event_type = wedding_event_type
            workflow.save()
            
            self.stdout.write(f'  ✅ Linked workflow to {wedding_event_type.name} event type')
            
        except EventType.DoesNotExist:
            # Create Wedding event type if it doesn't exist
            wedding_event_type = EventType.objects.create(
                name='Wedding',
                description='Wedding ceremonies and receptions',
                is_active=True
            )
            
            workflow.event_type = wedding_event_type
            workflow.save()
            
            self.stdout.write(f'  ✅ Created and linked to new Wedding event type')