# backend/core/domains/contracts/models.py
from django.utils import timezone
from core.utils.models import BaseModel
from django.db import models
from django.core.exceptions import ValidationError
from decimal import Decimal


class ContractTemplate(BaseModel):
    """Templates for legal contracts"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    event_type = models.ForeignKey('events.EventType', on_delete=models.PROTECT, null=True, blank=True)
    content = models.TextField()
    variables = models.JSONField(default=list)
    requires_signature = models.BooleanField(default=True)
    sections = models.JSONField(default=list, help_text="JSON structure of contract sections")
    is_active = models.BooleanField(default=True, help_text="Inactive templates are hidden from selection but preserved for historical records")
    
    # Multi-party signature configuration
    signature_requirements = models.JSONField(
        default=list, 
        help_text="List of required signature roles: ['CLIENT', 'WITNESS', 'COMPANY_REP']"
    )
    requires_witness = models.BooleanField(default=False)
    requires_company_signature = models.BooleanField(default=True)
    
    # Amendment settings
    allows_amendments = models.BooleanField(default=True)
    amendment_requires_signature = models.BooleanField(default=True)
    
    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Sync signature_requirements from boolean fields on save"""
        self._sync_signature_requirements()
        super().save(*args, **kwargs)

    def _sync_signature_requirements(self):
        """
        Build signature_requirements list from boolean fields.
        This ensures the JSON field stays in sync with the boolean toggles.
        """
        requirements = ['CLIENT']  # Client signature is always required
        if self.requires_company_signature:
            requirements.append('COMPANY_REP')
        if self.requires_witness:
            requirements.append('WITNESS')
        self.signature_requirements = requirements

    def get_sections(self):
        """Returns parsed sections or an empty list"""
        return self.sections or []

    def get_signature_requirements(self):
        """Returns required signature roles"""
        # signature_requirements is now always kept in sync via save()
        # but we keep the fallback for safety
        if not self.signature_requirements:
            requirements = ['CLIENT']
            if self.requires_company_signature:
                requirements.append('COMPANY_REP')
            if self.requires_witness:
                requirements.append('WITNESS')
            return requirements
        return self.signature_requirements


class EventContract(BaseModel):
    """Legal contract associated with an event"""
    event = models.ForeignKey('events.Event', on_delete=models.CASCADE, related_name='contracts')
    template = models.ForeignKey(ContractTemplate, on_delete=models.PROTECT)
    status = models.CharField(max_length=20, choices=[
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent'),
        ('PARTIALLY_SIGNED', 'Partially Signed'),
        ('SIGNED', 'Fully Signed'),
        ('EXPIRED', 'Expired'),
        ('VOID', 'Void'),
        ('AMENDED', 'Amended')
    ])
    content = models.TextField()  # Final rendered contract content
    sent_at = models.DateTimeField(null=True, blank=True)
    fully_signed_at = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    
    # Contract value tracking
    contract_value = models.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Total contract value"
    )
    payment_schedule_reference = models.TextField(
        blank=True,
        help_text="Reference to payment schedule or terms"
    )
    currency = models.CharField(max_length=3, default='PHP')

    # Amendment tracking
    is_amendment = models.BooleanField(default=False)
    original_contract = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='amendments'
    )
    amendment_number = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['event', 'amendment_number']

    def __str__(self):
        if self.is_amendment:
            return f"Contract Amendment #{self.amendment_number} for Event {self.event.id}"
        return f"Contract for Event {self.event.id} ({self.status})"
    
    def is_fully_signed(self):
        """Check if all required signatures are present"""
        required_roles = self.template.get_signature_requirements()
        signed_roles = list(self.signatures.values_list('role', flat=True))
        return all(role in signed_roles for role in required_roles)
    
    def get_missing_signatures(self):
        """Get list of missing signature roles"""
        required_roles = self.template.get_signature_requirements()
        signed_roles = list(self.signatures.values_list('role', flat=True))
        return [role for role in required_roles if role not in signed_roles]
    
    def update_status_based_on_signatures(self):
        """Update contract status based on signature completeness"""
        was_signed = self.status == 'SIGNED'

        if self.is_fully_signed():
            if self.status != 'SIGNED':
                self.status = 'SIGNED'
                self.fully_signed_at = timezone.now()
                self.save(update_fields=['status', 'fully_signed_at'])

                # Trigger workflow progression when contract becomes fully signed
                if not was_signed and hasattr(self.event, 'workflow_template') and self.event.workflow_template:
                    from core.domains.workflows.engine import WorkflowEngine
                    import logging
                    logger = logging.getLogger(__name__)

                    logger.info(f"Contract {self.id} fully signed - triggering workflow progression for event {self.event.id}")

                    WorkflowEngine.progress_workflow(
                        event=self.event,
                        trigger_type='CONTRACT_SIGNED',
                        data={
                            'contract_id': self.id,
                            'signed_at': str(self.fully_signed_at)
                        }
                    )

        elif self.signatures.exists() and self.status in ['SENT', 'DRAFT']:
            self.status = 'PARTIALLY_SIGNED'
            self.save(update_fields=['status'])
    
    def can_be_amended(self):
        """Check if contract can be amended"""
        return (
            self.template.allows_amendments and 
            self.status == 'SIGNED' and 
            not self.is_amendment
        )


class ContractSignature(BaseModel):
    """Individual signatures for contracts supporting multi-party signing"""
    ROLE_CHOICES = [
        ('CLIENT', 'Client'),
        ('WITNESS', 'Witness'),
        ('COMPANY_REP', 'Company Representative'),
        ('GUARDIAN', 'Legal Guardian'),
        ('PARTNER', 'Business Partner'),
        ('OTHER', 'Other')
    ]
    
    contract = models.ForeignKey(EventContract, on_delete=models.CASCADE, related_name='signatures')
    signer = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='contract_signatures')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    signature_data = models.TextField(help_text="Base64 encoded signature image or digital signature")
    signed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    # Additional signer information
    signer_name = models.CharField(max_length=255, help_text="Name as it appears on signature")
    signer_title = models.CharField(max_length=100, blank=True, help_text="Title/position of signer")
    signer_email = models.EmailField(help_text="Email of signer at time of signing")
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verification_method = models.CharField(
        max_length=50, 
        blank=True,
        help_text="Method used to verify signer identity"
    )
    
    # Enhanced security fields
    device_fingerprint = models.TextField(
        blank=True,
        help_text="Device identification for security tracking"
    )
    signature_metadata = models.JSONField(
        default=dict,
        help_text="Additional metadata about the signing process"
    )
    signature_confidence_score = models.DecimalField(
        max_digits=5, 
        decimal_places=4, 
        null=True, 
        blank=True,
        help_text="Confidence score for signature authenticity (0.0-1.0)"
    )
    
    # Legal compliance fields
    legal_disclosure_accepted = models.BooleanField(
        default=False,
        help_text="Whether signer accepted electronic signature disclosure"
    )
    electronic_consent_timestamp = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when electronic consent was given"
    )
    signature_intent_confirmed = models.BooleanField(
        default=False,
        help_text="Whether signer confirmed intent to sign electronically"
    )
    
    class Meta:
        ordering = ['signed_at']
        unique_together = ['contract', 'role']  # One signature per role per contract
    
    def __str__(self):
        return f"{self.get_role_display()} signature for Contract {self.contract.id}"
    
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update contract status when signature is added
        self.contract.update_status_based_on_signatures()


class ContractAmendment(BaseModel):
    """Track contract changes after signing"""
    original_contract = models.ForeignKey(
        EventContract, 
        on_delete=models.CASCADE, 
        related_name='amendment_requests'
    )
    amendment_contract = models.OneToOneField(
        EventContract,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='amendment_details'
    )
    
    # Amendment details
    amendment_reason = models.TextField(help_text="Business reason for the amendment")
    changes_description = models.TextField(help_text="Detailed description of changes")
    section_changes = models.JSONField(
        default=dict,
        help_text="Structured data of what sections changed"
    )
    
    # Status and workflow
    status = models.CharField(max_length=20, choices=[
        ('REQUESTED', 'Requested'),
        ('DRAFT', 'Draft'),
        ('SENT_FOR_REVIEW', 'Sent for Review'),
        ('APPROVED', 'Approved'),
        ('SIGNED', 'Signed'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled')
    ], default='REQUESTED')
    
    # Value changes
    original_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    new_value = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    value_change = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Workflow tracking
    requested_by = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='requested_amendments'
    )
    requested_at = models.DateTimeField(auto_now_add=True)
    reviewed_by = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='reviewed_amendments'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # Signature requirements
    requires_new_signatures = models.BooleanField(default=True)
    signature_deadline = models.DateField(null=True, blank=True)
    
    class Meta:
        ordering = ['-requested_at']
    
    def __str__(self):
        return f"Amendment to Contract {self.original_contract.id} - {self.status}"
    
    def calculate_value_change(self):
        """Calculate the value change"""
        if self.original_value is not None and self.new_value is not None:
            self.value_change = self.new_value - self.original_value
            return self.value_change
        return None
    
    def save(self, *args, **kwargs):
        if self.original_value is not None and self.new_value is not None:
            self.calculate_value_change()
        super().save(*args, **kwargs)


class ContractDocument(BaseModel):
    """Additional documents attached to contracts"""
    contract = models.ForeignKey(EventContract, on_delete=models.CASCADE, related_name='documents')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    document_type = models.CharField(max_length=50, choices=[
        ('ATTACHMENT', 'Attachment'),
        ('ADDENDUM', 'Addendum'),
        ('SCHEDULE', 'Schedule'),
        ('TERMS', 'Terms and Conditions'),
        ('WAIVER', 'Waiver'),
        ('OTHER', 'Other')
    ])
    file = models.FileField(upload_to='contracts/documents/')
    version = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    uploaded_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['contract', 'name', 'version']
    
    def __str__(self):
        return f"{self.name} v{self.version} for Contract {self.contract.id}"


class ContractNote(BaseModel):
    """Internal notes about contracts"""
    contract = models.ForeignKey(EventContract, on_delete=models.CASCADE, related_name='notes')
    note = models.TextField()
    is_internal = models.BooleanField(default=True, help_text="Internal notes not visible to client")
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    
    # Note categories
    category = models.CharField(max_length=30, choices=[
        ('GENERAL', 'General'),
        ('LEGAL', 'Legal'),
        ('NEGOTIATION', 'Negotiation'),
        ('AMENDMENT', 'Amendment'),
        ('ISSUE', 'Issue'),
        ('REMINDER', 'Reminder')
    ], default='GENERAL')
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Note for Contract {self.contract.id} by {self.created_by}"