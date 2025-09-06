# backend/core/domains/contracts/services.py
import datetime
import logging
import re
from decimal import Decimal

from django.db import models, transaction
from django.db.models import Q
from django.utils import timezone

from .exceptions import (
    ContractAlreadySigned,
    ContractExpired,
    ContractTemplateNotFound,
    EventContractNotFound,
    EventNotFound,
    InvalidContractStatus,
    InvalidContractTemplate,
    SignatureRequired,
    AmendmentNotAllowed,
    SignatureAlreadyExists,
    InvalidSignatureRole,
)
from .models import (
    ContractTemplate, 
    EventContract, 
    ContractSignature, 
    ContractAmendment,
    ContractDocument,
    ContractNote
)
from .context_service import ContractContextService

# Get logger
logger = logging.getLogger(__name__)


class ContractTemplateService:
    """Service for managing contract templates"""
    
    @staticmethod
    def get_all_templates(search_query=None, event_type_id=None, is_active=None):
        """Get all contract templates with optional filtering"""
        queryset = ContractTemplate.objects.all()
        
        # Apply filters if provided
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        if event_type_id:
            queryset = queryset.filter(event_type_id=event_type_id)
            
        return queryset.order_by('name')
    
    @staticmethod
    def get_template_by_id(template_id):
        """Get a contract template by ID"""
        try:
            return ContractTemplate.objects.get(id=template_id)
        except ContractTemplate.DoesNotExist:
            raise ContractTemplateNotFound()
    
    @staticmethod
    def create_template(template_data):
        """Create a new contract template"""
        with transaction.atomic():
            template = ContractTemplate.objects.create(**template_data)
            logger.info(f"Created new contract template: {template.name}")
            return template
    
    @staticmethod
    def update_template(template_id, template_data):
        """Update an existing contract template"""
        template = ContractTemplateService.get_template_by_id(template_id)
        
        with transaction.atomic():
            # Update template fields
            for key, value in template_data.items():
                setattr(template, key, value)
            
            template.save()
            logger.info(f"Updated contract template: {template.name}")
            return template
    
    @staticmethod
    def delete_template(template_id):
        """Delete a contract template"""
        template = ContractTemplateService.get_template_by_id(template_id)
        
        # Check if template is used by any contracts
        contract_count = EventContract.objects.filter(template=template).count()
        if contract_count > 0:
            raise InvalidContractTemplate(
                detail=f"Cannot delete template as it is used by {contract_count} contracts"
            )
        
        with transaction.atomic():
            template_name = template.name
            template.delete()
            logger.info(f"Deleted contract template: {template_name}")
            return True
            
    @staticmethod
    def render_contract(template_id, context_data):
        """
        Render a contract template with context data
        
        Args:
            template_id: ID of the contract template
            context_data: Dictionary of variable values to insert into the template
            
        Returns:
            Rendered contract content
        """
        template = ContractTemplateService.get_template_by_id(template_id)
        content = template.content
        
        # Enhanced variable substitution with better handling
        for var_name, var_value in context_data.items():
            # Convert value to string, handling None values
            str_value = str(var_value) if var_value is not None else ''
            
            # Handle format: {{ variable_name }} (with spaces)
            placeholder_with_spaces = f"{{{{ {var_name} }}}}"
            content = content.replace(placeholder_with_spaces, str_value)
            
            # Handle format: {{variable_name}} (without spaces - for backward compatibility)
            placeholder_no_spaces = f"{{{{{var_name}}}}}"
            content = content.replace(placeholder_no_spaces, str_value)
        
        # Log any unreplaced variables for debugging
        import re
        unreplaced_vars = re.findall(r'\{\{\s*([^}]+)\s*\}\}', content)
        if unreplaced_vars:
            logger.warning(f"Template {template_id} has unreplaced variables: {unreplaced_vars}")
        
        return content
    
    @staticmethod
    def preview_template(template_id, context_data=None, event_id=None):
        """
        Preview a contract template with context data
        
        Args:
            template_id: ID of the contract template
            context_data: Dictionary of variable values to insert into the template
            event_id: Optional event ID to generate context from
            
        Returns:
            Dictionary with rendered content and template metadata
        """
        template = ContractTemplateService.get_template_by_id(template_id)
        
        # If event_id is provided, generate standardized context
        if event_id:
            try:
                from core.domains.events.models import Event
                event = Event.objects.select_related('client', 'event_type').get(id=event_id)
                # Generate standardized context and merge with provided context
                standardized_context = ContractContextService.generate_event_context(event, context_data)
            except Event.DoesNotExist:
                logger.warning(f"Event {event_id} not found for template preview, using provided context only")
                standardized_context = context_data or {}
        else:
            standardized_context = context_data or {}
        
        # Render the contract content
        rendered_content = ContractTemplateService.render_contract(template_id, standardized_context)
        
        return {
            'template_id': template.id,
            'template_name': template.name,
            'rendered_content': rendered_content,
            'variables': template.variables,
            'sections': template.sections,
            'event_type': template.event_type.name if template.event_type else None,
            'context_used': standardized_context,
            'available_variables': ContractContextService.get_available_variables()
        }


class EventContractService:
    """Service for managing event contracts"""
    
    @staticmethod
    def get_contracts_for_event(event_id):
        """Get all contracts for a specific event"""
        return EventContract.objects.filter(event_id=event_id).order_by('-created_at')
    
    @staticmethod
    def get_contract_by_id(contract_id):
        """Get an event contract by ID"""
        try:
            return EventContract.objects.get(id=contract_id)
        except EventContract.DoesNotExist:
            raise EventContractNotFound()
    
    @staticmethod
    def create_contract_from_template(event_id, template_id, valid_until=None, context_data=None, contract_value=None):
        """
        Create a new event contract from a template
        
        Args:
            event_id: ID of the event to create contract for
            template_id: ID of the contract template to use
            valid_until: Optional expiry date for the contract
            context_data: Dictionary of variable values to insert into the template
            contract_value: Total contract value
            
        Returns:
            The created EventContract instance
        """
        try:
            from core.domains.events.models import Event
            template = ContractTemplate.objects.get(id=template_id)
            event = Event.objects.select_related('client', 'event_type').get(id=event_id)
        except ContractTemplate.DoesNotExist:
            raise ContractTemplateNotFound()
        except Event.DoesNotExist:
            raise EventNotFound()
        
        # Generate standardized context from event
        standardized_context = ContractContextService.generate_event_context(event, context_data)
        
        # Get rendered content using standardized context
        rendered_content = ContractTemplateService.render_contract(template_id, standardized_context)
        
        # Use contract value from context if not provided
        if contract_value is None:
            contract_value = event.total_price
        
        with transaction.atomic():
            contract = EventContract.objects.create(
                event_id=event_id,
                template=template,
                status='DRAFT',
                content=rendered_content,
                valid_until=valid_until,
                contract_value=contract_value,
                amendment_number=0
            )
            
            logger.info(f"Created new contract for event {event_id} using template {template.name}")
            return contract
    
    @staticmethod
    def update_contract(contract_id, contract_data):
        """Update an existing event contract"""
        contract = EventContractService.get_contract_by_id(contract_id)
        
        # Check if contract is already signed
        if contract.status == 'SIGNED' and 'content' in contract_data:
            raise ContractAlreadySigned(
                detail="Cannot update content of a signed contract. Use amendments instead."
            )
        
        with transaction.atomic():
            # Update contract fields
            for key, value in contract_data.items():
                setattr(contract, key, value)
            
            # Update timestamps based on status transitions
            if 'status' in contract_data:
                if contract_data['status'] == 'SENT' and not contract.sent_at:
                    contract.sent_at = timezone.now()
            
            contract.save()
            logger.info(f"Updated contract {contract_id} for event {contract.event.id}")
            return contract
    
    @staticmethod
    def void_contract(contract_id, reason=None):
        """
        Void a contract
        
        Args:
            contract_id: ID of the contract to void
            reason: Optional reason for voiding the contract
            
        Returns:
            The updated EventContract instance
        """
        contract = EventContractService.get_contract_by_id(contract_id)
        
        with transaction.atomic():
            contract.status = 'VOID'
            contract.save()
            
            # Add note about voiding
            if reason:
                ContractNote.objects.create(
                    contract=contract,
                    note=f"Contract voided. Reason: {reason}",
                    category='GENERAL',
                    is_internal=True
                )
                logger.info(f"Contract {contract_id} voided. Reason: {reason}")
            else:
                logger.info(f"Contract {contract_id} voided")
                
            return contract


class ContractSignatureService:
    """Service for managing contract signatures"""
    
    @staticmethod
    def add_signature(contract_id, user_id, signature_data, role='CLIENT', **signature_details):
        """
        Add a signature to a contract
        
        Args:
            contract_id: ID of the contract to sign
            user_id: ID of the user signing
            signature_data: Signature image data
            role: Role of the signer
            **signature_details: Additional signature details
            
        Returns:
            The created ContractSignature instance
        """
        contract = EventContractService.get_contract_by_id(contract_id)
        
        # Validate contract can be signed
        if contract.status not in ['SENT', 'PARTIALLY_SIGNED']:
            raise InvalidContractStatus(
                detail=f"Contract is in {contract.status} status and cannot be signed"
            )
        
        if contract.valid_until and contract.valid_until < datetime.date.today():
            raise ContractExpired()
        
        if not signature_data:
            raise SignatureRequired()
        
        # Check if signature for this role already exists
        if ContractSignature.objects.filter(contract=contract, role=role).exists():
            raise SignatureAlreadyExists(
                detail=f"A signature for role '{role}' already exists"
            )
        
        # Check if role is required for this contract
        required_roles = contract.template.get_signature_requirements()
        if role not in required_roles:
            raise InvalidSignatureRole(
                detail=f"Role '{role}' is not required for this contract"
            )
        
        with transaction.atomic():
            signature = ContractSignature.objects.create(
                contract=contract,
                signer_id=user_id,
                role=role,
                signature_data=signature_data,
                signer_name=signature_details.get('signer_name', ''),
                signer_title=signature_details.get('signer_title', ''),
                signer_email=signature_details.get('signer_email', ''),
                verification_method=signature_details.get('verification_method', ''),
                ip_address=signature_details.get('ip_address'),
                user_agent=signature_details.get('user_agent', '')
            )
            
            logger.info(f"Added {role} signature to contract {contract_id} by user {user_id}")
            
            # Contract status will be updated automatically via the model's save method
            return signature
    
    @staticmethod
    def get_signatures_for_contract(contract_id):
        """Get all signatures for a contract"""
        return ContractSignature.objects.filter(contract_id=contract_id).order_by('signed_at')
    
    @staticmethod
    def verify_signature(signature_id, verification_method=None):
        """Mark a signature as verified"""
        try:
            signature = ContractSignature.objects.get(id=signature_id)
        except ContractSignature.DoesNotExist:
            raise ValueError(f"Signature with ID {signature_id} not found")
        
        signature.is_verified = True
        if verification_method:
            signature.verification_method = verification_method
        signature.save()
        
        logger.info(f"Verified signature {signature_id}")
        return signature
    
    @staticmethod
    def remove_signature(signature_id):
        """Remove a signature (only if contract not fully signed)"""
        try:
            signature = ContractSignature.objects.get(id=signature_id)
        except ContractSignature.DoesNotExist:
            raise ValueError(f"Signature with ID {signature_id} not found")
        
        contract = signature.contract
        
        # Check if contract is fully signed
        if contract.status == 'SIGNED':
            raise InvalidContractStatus(
                detail="Cannot remove signature from a fully signed contract"
            )
        
        with transaction.atomic():
            role = signature.role
            signature.delete()
            
            # Update contract status
            contract.update_status_based_on_signatures()
            
            logger.info(f"Removed {role} signature from contract {contract.id}")
            return True


class ContractAmendmentService:
    """Service for managing contract amendments"""
    
    @staticmethod
    def request_amendment(original_contract_id, amendment_data, requested_by):
        """
        Request an amendment to a contract
        
        Args:
            original_contract_id: ID of the original contract
            amendment_data: Amendment details
            requested_by: User requesting the amendment
            
        Returns:
            The created ContractAmendment instance
        """
        original_contract = EventContractService.get_contract_by_id(original_contract_id)
        
        if not original_contract.can_be_amended():
            raise AmendmentNotAllowed(
                detail="This contract cannot be amended"
            )
        
        with transaction.atomic():
            # Calculate value changes
            original_value = original_contract.contract_value
            new_value = amendment_data.get('new_value')
            
            amendment = ContractAmendment.objects.create(
                original_contract=original_contract,
                amendment_reason=amendment_data.get('amendment_reason', ''),
                changes_description=amendment_data.get('changes_description', ''),
                section_changes=amendment_data.get('section_changes', {}),
                original_value=original_value,
                new_value=new_value,
                requested_by=requested_by,
                requires_new_signatures=amendment_data.get('requires_new_signatures', True),
                signature_deadline=amendment_data.get('signature_deadline')
            )
            
            # Add amendment note to original contract
            ContractNote.objects.create(
                contract=original_contract,
                note=f"Amendment requested: {amendment_data.get('amendment_reason', 'No reason provided')}",
                category='AMENDMENT',
                is_internal=True,
                created_by=requested_by
            )
            
            logger.info(f"Amendment requested for contract {original_contract_id} by user {requested_by.id}")
            return amendment
    
    @staticmethod
    def approve_amendment(amendment_id, reviewed_by, review_notes=None):
        """Approve an amendment request"""
        try:
            amendment = ContractAmendment.objects.get(id=amendment_id)
        except ContractAmendment.DoesNotExist:
            raise ValueError(f"Amendment with ID {amendment_id} not found")
        
        if amendment.status != 'REQUESTED':
            raise ValueError(f"Amendment is in {amendment.status} status and cannot be approved")
        
        with transaction.atomic():
            amendment.status = 'APPROVED'
            amendment.reviewed_by = reviewed_by
            amendment.reviewed_at = timezone.now()
            amendment.review_notes = review_notes or ''
            amendment.save()
            
            # Add approval note to original contract
            ContractNote.objects.create(
                contract=amendment.original_contract,
                note=f"Amendment approved by {reviewed_by.get_full_name()}. {review_notes or ''}",
                category='AMENDMENT',
                is_internal=True,
                created_by=reviewed_by
            )
            
            logger.info(f"Amendment {amendment_id} approved by user {reviewed_by.id}")
            return amendment
    
    @staticmethod
    def reject_amendment(amendment_id, reviewed_by, review_notes=None):
        """Reject an amendment request"""
        try:
            amendment = ContractAmendment.objects.get(id=amendment_id)
        except ContractAmendment.DoesNotExist:
            raise ValueError(f"Amendment with ID {amendment_id} not found")
        
        if amendment.status != 'REQUESTED':
            raise ValueError(f"Amendment is in {amendment.status} status and cannot be rejected")
        
        with transaction.atomic():
            amendment.status = 'REJECTED'
            amendment.reviewed_by = reviewed_by
            amendment.reviewed_at = timezone.now()
            amendment.review_notes = review_notes or ''
            amendment.save()
            
            # Add rejection note to original contract
            ContractNote.objects.create(
                contract=amendment.original_contract,
                note=f"Amendment rejected by {reviewed_by.get_full_name()}. {review_notes or ''}",
                category='AMENDMENT',
                is_internal=True,
                created_by=reviewed_by
            )
            
            logger.info(f"Amendment {amendment_id} rejected by user {reviewed_by.id}")
            return amendment
    
    @staticmethod
    def create_amendment_contract(amendment_id, context_data=None):
        """
        Create a new contract based on an approved amendment
        
        Args:
            amendment_id: ID of the approved amendment
            context_data: Updated context data for rendering
            
        Returns:
            The created amendment contract
        """
        try:
            amendment = ContractAmendment.objects.get(id=amendment_id)
        except ContractAmendment.DoesNotExist:
            raise ValueError(f"Amendment with ID {amendment_id} not found")
        
        if amendment.status != 'APPROVED':
            raise ValueError("Only approved amendments can create new contracts")
        
        original_contract = amendment.original_contract
        
        with transaction.atomic():
            # Create new contract based on original
            context_data = context_data or {}
            rendered_content = ContractTemplateService.render_contract(
                original_contract.template.id, 
                context_data
            )
            
            # Get next amendment number
            max_amendment = EventContract.objects.filter(
                event=original_contract.event
            ).aggregate(
                max_amendment=models.Max('amendment_number')
            )['max_amendment'] or 0
            
            amendment_contract = EventContract.objects.create(
                event=original_contract.event,
                template=original_contract.template,
                status='DRAFT',
                content=rendered_content,
                valid_until=original_contract.valid_until,
                contract_value=amendment.new_value or original_contract.contract_value,
                payment_schedule_reference=original_contract.payment_schedule_reference,
                currency=original_contract.currency,
                is_amendment=True,
                original_contract=original_contract,
                amendment_number=max_amendment + 1
            )
            
            # Link amendment to the new contract
            amendment.amendment_contract = amendment_contract
            amendment.status = 'DRAFT'
            amendment.save()
            
            # Mark original contract as amended
            original_contract.status = 'AMENDED'
            original_contract.save()
            
            # Add note about amendment contract creation
            ContractNote.objects.create(
                contract=amendment_contract,
                note=f"Amendment contract created from original contract {original_contract.id}",
                category='AMENDMENT',
                is_internal=True
            )
            
            logger.info(f"Created amendment contract {amendment_contract.id} for amendment {amendment_id}")
            return amendment_contract
    
    @staticmethod
    def get_amendments_for_contract(contract_id):
        """Get all amendments for a contract"""
        return ContractAmendment.objects.filter(
            original_contract_id=contract_id
        ).order_by('-requested_at')
    
    @staticmethod
    def cancel_amendment(amendment_id, cancelled_by, reason=None):
        """Cancel an amendment request"""
        try:
            amendment = ContractAmendment.objects.get(id=amendment_id)
        except ContractAmendment.DoesNotExist:
            raise ValueError(f"Amendment with ID {amendment_id} not found")
        
        if amendment.status not in ['REQUESTED', 'DRAFT', 'SENT_FOR_REVIEW']:
            raise ValueError(f"Amendment is in {amendment.status} status and cannot be cancelled")
        
        with transaction.atomic():
            amendment.status = 'CANCELLED'
            amendment.reviewed_by = cancelled_by
            amendment.reviewed_at = timezone.now()
            amendment.review_notes = f"Cancelled: {reason or 'No reason provided'}"
            amendment.save()
            
            # Add cancellation note
            ContractNote.objects.create(
                contract=amendment.original_contract,
                note=f"Amendment cancelled by {cancelled_by.get_full_name()}. {reason or ''}",
                category='AMENDMENT',
                is_internal=True,
                created_by=cancelled_by
            )
            
            logger.info(f"Amendment {amendment_id} cancelled by user {cancelled_by.id}")
            return amendment


class ContractDocumentService:
    """Service for managing contract documents"""
    
    @staticmethod
    def add_document(contract_id, document_data, uploaded_by):
        """Add a document to a contract"""
        contract = EventContractService.get_contract_by_id(contract_id)
        
        # Check for existing document with same name
        existing_doc = ContractDocument.objects.filter(
            contract=contract,
            name=document_data['name'],
            is_active=True
        ).first()
        
        if existing_doc:
            # Create new version
            version = existing_doc.version + 1
            # Deactivate old version
            existing_doc.is_active = False
            existing_doc.save()
        else:
            version = 1
        
        document = ContractDocument.objects.create(
            contract=contract,
            name=document_data['name'],
            description=document_data.get('description', ''),
            document_type=document_data.get('document_type', 'ATTACHMENT'),
            file=document_data['file'],
            version=version,
            uploaded_by=uploaded_by
        )
        
        # Add note about document upload
        ContractNote.objects.create(
            contract=contract,
            note=f"Document '{document.name}' v{version} uploaded",
            category='GENERAL',
            is_internal=True,
            created_by=uploaded_by
        )
        
        logger.info(f"Added document {document.name} v{version} to contract {contract_id}")
        return document
    
    @staticmethod
    def get_documents_for_contract(contract_id):
        """Get all active documents for a contract"""
        return ContractDocument.objects.filter(
            contract_id=contract_id, 
            is_active=True
        ).order_by('document_type', 'name')
    
    @staticmethod
    def deactivate_document(document_id, deactivated_by):
        """Deactivate a document"""
        try:
            document = ContractDocument.objects.get(id=document_id)
        except ContractDocument.DoesNotExist:
            raise ValueError(f"Document with ID {document_id} not found")
        
        document.is_active = False
        document.save()
        
        # Add note about document deactivation
        ContractNote.objects.create(
            contract=document.contract,
            note=f"Document '{document.name}' v{document.version} deactivated",
            category='GENERAL',
            is_internal=True,
            created_by=deactivated_by
        )
        
        logger.info(f"Deactivated document {document.name} v{document.version}")
        return document


class ContractNoteService:
    """Service for managing contract notes"""
    
    @staticmethod
    def add_note(contract_id, note_data, created_by):
        """Add a note to a contract"""
        contract = EventContractService.get_contract_by_id(contract_id)
        
        note = ContractNote.objects.create(
            contract=contract,
            note=note_data['note'],
            is_internal=note_data.get('is_internal', True),
            category=note_data.get('category', 'GENERAL'),
            created_by=created_by
        )
        
        logger.info(f"Added {note.category} note to contract {contract_id}")
        return note
    
    @staticmethod
    def get_notes_for_contract(contract_id, include_internal=True):
        """Get notes for a contract"""
        queryset = ContractNote.objects.filter(contract_id=contract_id)
        
        if not include_internal:
            queryset = queryset.filter(is_internal=False)
        
        return queryset.order_by('-created_at')
    
    @staticmethod
    def update_note(note_id, note_data, updated_by):
        """Update a contract note"""
        try:
            note = ContractNote.objects.get(id=note_id)
        except ContractNote.DoesNotExist:
            raise ValueError(f"Note with ID {note_id} not found")
        
        # Only allow creator or admin to update
        if note.created_by != updated_by and updated_by.role != 'ADMIN':
            raise PermissionError("You can only update your own notes")
        
        # Update allowed fields
        for key, value in note_data.items():
            if key in ['note', 'category', 'is_internal']:
                setattr(note, key, value)
        
        note.save()
        logger.info(f"Updated note {note_id} by user {updated_by.id}")
        return note
    
    @staticmethod
    def delete_note(note_id, deleted_by):
        """Delete a contract note"""
        try:
            note = ContractNote.objects.get(id=note_id)
        except ContractNote.DoesNotExist:
            raise ValueError(f"Note with ID {note_id} not found")
        
        # Only allow creator or admin to delete
        if note.created_by != deleted_by and deleted_by.role != 'ADMIN':
            raise PermissionError("You can only delete your own notes")
        
        note_content = note.note[:50]  # For logging
        note.delete()
        
        logger.info(f"Deleted note '{note_content}...' by user {deleted_by.id}")
        return True


# Legacy service methods for backward compatibility
class LegacyContractService:
    """Legacy service methods for backward compatibility"""
    
    @staticmethod
    def sign_contract(contract_id, user_id, signature_data, witness_name=None, witness_signature=None):
        """
        Legacy sign contract method - creates CLIENT signature
        
        DEPRECATED: Use ContractSignatureService.add_signature instead
        """
        logger.warning("Using deprecated sign_contract method. Use ContractSignatureService.add_signature instead.")
        
        signature_details = {
            'signer_name': f"User {user_id}",  # Should be passed from frontend
            'signer_email': ''  # Should be passed from frontend
        }
        
        # Add client signature
        client_signature = ContractSignatureService.add_signature(
            contract_id=contract_id,
            user_id=user_id,
            signature_data=signature_data,
            role='CLIENT',
            **signature_details
        )
        
        # Add witness signature if provided
        if witness_name and witness_signature:
            witness_signature_obj = ContractSignatureService.add_signature(
                contract_id=contract_id,
                user_id=user_id,  # Witness could be same user or different
                signature_data=witness_signature,
                role='WITNESS',
                signer_name=witness_name,
                signer_email=''
            )
        
        # Update legacy fields for backward compatibility
        contract = EventContractService.get_contract_by_id(contract_id)
        contract.signed_at = client_signature.signed_at
        contract.signed_by_id = user_id
        contract.signature_data = signature_data
        contract.witness_name = witness_name or ''
        contract.witness_signature = witness_signature or ''
        contract.save()
        
        return contract


class ContractReportingService:
    """Service for contract reporting and analytics"""
    
    @staticmethod
    def get_contract_statistics(event_id=None, date_range=None):
        """Get contract statistics"""
        queryset = EventContract.objects.all()
        
        if event_id:
            queryset = queryset.filter(event_id=event_id)
        
        if date_range:
            start_date, end_date = date_range
            queryset = queryset.filter(created_at__range=[start_date, end_date])
        
        stats = {
            'total_contracts': queryset.count(),
            'by_status': {},
            'fully_signed': 0,
            'amendments': queryset.filter(is_amendment=True).count(),
            'total_value': Decimal('0.00'),
            'average_signing_time': None
        }
        
        # Status breakdown
        for status, _ in EventContract._meta.get_field('status').choices:
            count = queryset.filter(status=status).count()
            stats['by_status'][status] = count
        
        # Fully signed contracts
        fully_signed_contracts = queryset.filter(status='SIGNED')
        stats['fully_signed'] = fully_signed_contracts.count()
        
        # Total contract value
        total_value = queryset.filter(
            contract_value__isnull=False
        ).aggregate(
            total=models.Sum('contract_value')
        )['total']
        if total_value:
            stats['total_value'] = total_value
        
        # Average signing time (days from sent to fully signed)
        signed_contracts = fully_signed_contracts.filter(
            sent_at__isnull=False,
            fully_signed_at__isnull=False
        )
        
        if signed_contracts.exists():
            signing_times = []
            for contract in signed_contracts:
                days = (contract.fully_signed_at.date() - contract.sent_at.date()).days
                signing_times.append(days)
            
            if signing_times:
                stats['average_signing_time'] = sum(signing_times) / len(signing_times)
        
        return stats
    
    @staticmethod
    def get_pending_signatures():
        """Get contracts with pending signatures"""
        return EventContract.objects.filter(
            status__in=['SENT', 'PARTIALLY_SIGNED']
        ).select_related('event', 'template').prefetch_related('signatures')
    
    @staticmethod
    def get_expiring_contracts(days_ahead=7):
        """Get contracts expiring within specified days"""
        cutoff_date = timezone.now().date() + datetime.timedelta(days=days_ahead)
        
        return EventContract.objects.filter(
            valid_until__lte=cutoff_date,
            status__in=['SENT', 'PARTIALLY_SIGNED']
        ).select_related('event', 'template')
    
    @staticmethod
    def get_amendment_summary():
        """Get amendment statistics"""
        amendments = ContractAmendment.objects.all()
        
        return {
            'total_amendments': amendments.count(),
            'by_status': {
                status: amendments.filter(status=status).count()
                for status, _ in ContractAmendment._meta.get_field('status').choices
            },
            'pending_review': amendments.filter(status='REQUESTED').count(),
            'approved_pending_contract': amendments.filter(status='APPROVED').count(),
            'average_processing_time': None  # Could calculate this if needed
        }