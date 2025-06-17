# backend/core/domains/questionnaires/services.py
import logging

from django.db import models, transaction
from django.db.models import Max, Q

from .exceptions import (
    DuplicateQuestionnaireField,
    InvalidResponseValue,
    QuestionnaireFieldNotFound,
    QuestionnaireNotFound,
    QuestionnaireResponseNotFound,
)
from .models import Questionnaire, QuestionnaireField, QuestionnaireResponse

logger = logging.getLogger(__name__)

class QuestionnaireService:
    """Service for managing questionnaires"""
    
    @staticmethod
    def get_all_questionnaires(search_query=None, event_type_id=None, is_active=None):
        """Get all questionnaires with optional filtering"""
        queryset = Questionnaire.objects.all()
        
        # Apply filters if provided
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query)
            )
        
        if event_type_id:
            queryset = queryset.filter(event_type_id=event_type_id)
            
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
            
        return queryset.order_by('order', 'name')
    
    @staticmethod
    def get_questionnaire_by_id(questionnaire_id):
        """Get a questionnaire by ID"""
        try:
            return Questionnaire.objects.get(id=questionnaire_id)
        except Questionnaire.DoesNotExist:
            raise QuestionnaireNotFound()
    
    @staticmethod
    def create_questionnaire(questionnaire_data):
        """Create a new questionnaire"""
        fields_data = questionnaire_data.pop('fields', [])
        
        with transaction.atomic():
            questionnaire = Questionnaire.objects.create(**questionnaire_data)
            
            # Create fields if provided
            for field_data in fields_data:
                QuestionnaireFieldService.create_field(questionnaire.id, field_data)
            
            logger.info(f"Created new questionnaire: {questionnaire.name}")
            return questionnaire
    
    @staticmethod
    def update_questionnaire(questionnaire_id, questionnaire_data):
        """Update an existing questionnaire"""
        questionnaire = QuestionnaireService.get_questionnaire_by_id(questionnaire_id)
        fields_data = questionnaire_data.pop('fields', None)
        
        with transaction.atomic():
            # Update questionnaire fields
            for key, value in questionnaire_data.items():
                setattr(questionnaire, key, value)
            
            questionnaire.save()
            
            # Update fields if provided
            if fields_data is not None:
                # Delete existing fields
                questionnaire.fields.all().delete()
                
                # Create new fields
                for field_data in fields_data:
                    QuestionnaireFieldService.create_field(questionnaire.id, field_data)
            
            logger.info(f"Updated questionnaire: {questionnaire.name}")
            return questionnaire
    
    @staticmethod
    def delete_questionnaire(questionnaire_id):
        """Delete a questionnaire"""
        questionnaire = QuestionnaireService.get_questionnaire_by_id(questionnaire_id)
        
        with transaction.atomic():
            questionnaire_name = questionnaire.name
            questionnaire.delete()
            logger.info(f"Deleted questionnaire: {questionnaire_name}")
            return True
    
    @staticmethod
    def reorder_questionnaires(order_mapping):
        """
        Reorder questionnaires
        
        Args:
            order_mapping: Dict mapping questionnaire IDs to their new order
        """
        # No transaction.atomic() here - will be managed by the view
        
        # Get all questionnaires
        questionnaires = Questionnaire.objects.all().select_for_update()
        
        # Convert string IDs to integers in the order_mapping
        int_order_mapping = {int(k): v for k, v in order_mapping.items()}
        
        # Get the maximum existing order value
        max_order = questionnaires.aggregate(max_order=models.Max('order'))['max_order'] or 0
        temp_start = max_order + 1000  # Start temp values well above existing ones
        
        # First, update all questionnaires to have temporary very large order values
        # This avoids conflicts during reordering
        for i, questionnaire in enumerate(questionnaires):
            if questionnaire.id in int_order_mapping:
                questionnaire.order = temp_start + i
                questionnaire.save(update_fields=['order'])
        
        # Then update with final values
        for questionnaire in questionnaires:
            if questionnaire.id in int_order_mapping:
                new_order = int_order_mapping[questionnaire.id]
                questionnaire.order = new_order
                questionnaire.save(update_fields=['order'])
        
        logger.info(f"Reordered questionnaires")
        return questionnaires.order_by('order')


class QuestionnaireFieldService:
    """Service for managing questionnaire fields"""
    
    @staticmethod
    def get_fields_for_questionnaire(questionnaire_id):
        """Get all fields for a specific questionnaire"""
        try:
            questionnaire = Questionnaire.objects.get(id=questionnaire_id)
            return questionnaire.fields.all().order_by('order')
        except Questionnaire.DoesNotExist:
            raise QuestionnaireNotFound()
    
    @staticmethod
    def get_field_by_id(field_id):
        """Get a questionnaire field by ID"""
        try:
            return QuestionnaireField.objects.get(id=field_id)
        except QuestionnaireField.DoesNotExist:
            raise QuestionnaireFieldNotFound()
    
    @staticmethod
    def create_field(questionnaire_id, field_data):
        """Create a new questionnaire field for a questionnaire"""
        try:
            questionnaire = Questionnaire.objects.get(id=questionnaire_id)
        except Questionnaire.DoesNotExist:
            raise QuestionnaireNotFound()
        
        # Check for duplicate field name in this questionnaire
        if QuestionnaireField.objects.filter(
            questionnaire=questionnaire,
            name=field_data['name']
        ).exists():
            raise DuplicateQuestionnaireField()
        
        # Auto-assign order if not provided
        if 'order' not in field_data:
            # Get the max order, default to 0 if none exist
            max_order = QuestionnaireField.objects.filter(
                questionnaire=questionnaire
            ).aggregate(models.Max('order'))['order__max'] or 0
            field_data['order'] = max_order + 1
        
        with transaction.atomic():
            field = QuestionnaireField.objects.create(
                questionnaire=questionnaire,
                **field_data
            )
            logger.info(f"Created new questionnaire field: {field.name} for questionnaire: {questionnaire.name}")
            return field
    
    @staticmethod
    def update_field(field_id, field_data):
        """Update an existing questionnaire field"""
        field = QuestionnaireFieldService.get_field_by_id(field_id)
        
        # Check for duplicate field name if name is being changed
        if 'name' in field_data and field_data['name'] != field.name:
            if QuestionnaireField.objects.filter(
                questionnaire=field.questionnaire,
                name=field_data['name']
            ).exists():
                raise DuplicateQuestionnaireField()
        
        # Handle order change specially
        order_changed = False
        old_order = field.order
        new_order = None
        
        if 'order' in field_data and int(field_data['order']) != old_order:
            order_changed = True
            new_order = int(field_data['order'])
        
        with transaction.atomic():
            if order_changed:
                # Get all fields for this questionnaire
                all_fields = QuestionnaireField.objects.filter(
                    questionnaire=field.questionnaire
                ).select_for_update().order_by('order')
                
                # Get the maximum order value
                max_order = all_fields.aggregate(Max('order'))['order__max'] or 0
                temp_start = max_order + 1000  # Use a very high temporary order
                
                # PHASE 1: Assign temporary high orders to all fields
                for i, f in enumerate(all_fields):
                    temp_order = temp_start + i
                    f.order = temp_order
                    f.save(update_fields=['order'])
                
                logger.info(f"Assigned temporary high orders to all fields")
                
                # Apply non-order changes to our field
                for key, value in field_data.items():
                    if key != 'order':  # Skip order, we'll handle it separately
                        setattr(field, key, value)
                
                # PHASE 2: Reorder all fields with sequential ordering
                # Make a list of fields in the desired order
                field_list = list(all_fields)
                
                # If our field was already in this list, remove it so we can insert it at the new position
                field_list = [f for f in field_list if f.id != field.id]
                
                # Determine where to insert our field
                insert_position = min(new_order - 1, len(field_list)) if new_order else 0
                
                # Insert our field at the desired position
                field_list.insert(insert_position, field)
                
                # Assign sequential orders
                for i, f in enumerate(field_list, start=1):
                    f.order = i
                    f.save(update_fields=['order'])
                
                logger.info(f"Reordered fields with field {field.name} at position {field.order}")
            else:
                # No order change - just apply updates normally
                for key, value in field_data.items():
                    setattr(field, key, value)
                field.save()
            
            logger.info(f"Updated questionnaire field: {field.name} for questionnaire: {field.questionnaire.name}")
            return field
    
    @staticmethod
    def delete_field(field_id):
        """Delete a questionnaire field"""
        field = QuestionnaireFieldService.get_field_by_id(field_id)
        
        with transaction.atomic():
            # Store information for reordering and logging
            questionnaire = field.questionnaire
            deleted_order = field.order
            field_name = field.name
            
            # Delete the field
            field.delete()
            
            # Reorder remaining fields to maintain sequential ordering
            remaining_fields = QuestionnaireField.objects.filter(
                questionnaire=questionnaire,
                order__gt=deleted_order
            ).select_for_update().order_by('order')
            
            # Decrease order by 1 for all fields that had higher order than the deleted field
            for remaining in remaining_fields:
                remaining.order -= 1
                remaining.save(update_fields=['order'])
            
            logger.info(f"Deleted questionnaire field: {field_name} and reordered remaining fields")
            return True
    
    @staticmethod
    def reorder_fields(questionnaire_id, order_mapping):
        """
        Reorder fields within a questionnaire
        
        Args:
            questionnaire_id: ID of the questionnaire
            order_mapping: Dict mapping field IDs to their new order
        """
        # No transaction.atomic() here - will be managed by the view
        
        try:
            questionnaire = Questionnaire.objects.get(id=questionnaire_id)
        except Questionnaire.DoesNotExist:
            raise QuestionnaireNotFound()
        
        # Get all fields for this questionnaire
        fields = QuestionnaireField.objects.filter(
            questionnaire=questionnaire
        ).select_for_update()
        
        # Convert string IDs to integers in the order_mapping
        int_order_mapping = {int(k): v for k, v in order_mapping.items()}
        
        # Get the maximum existing order value
        max_order = fields.aggregate(max_order=models.Max('order'))['max_order'] or 0
        temp_start = max_order + 1000  # Start temp values well above existing ones
        
        # First, update all fields to have temporary very large order values
        # This avoids conflicts during reordering
        for i, field in enumerate(fields):
            if field.id in int_order_mapping:
                field.order = temp_start + i
                field.save(update_fields=['order'])
        
        # Then update with final values
        for field in fields:
            if field.id in int_order_mapping:
                new_order = int_order_mapping[field.id]
                field.order = new_order
                field.save(update_fields=['order'])
        
        logger.info(f"Reordered fields for questionnaire: {questionnaire.name}")
        return fields.order_by('order')
    


class QuestionnaireResponseService:
    """Service for managing questionnaire responses"""
    
    @staticmethod
    def get_responses_for_event(event_id):
        """Get all questionnaire responses for a specific event"""
        return QuestionnaireResponse.objects.filter(event_id=event_id)
    
    @staticmethod
    def get_response_by_id(response_id):
        """Get a questionnaire response by ID"""
        try:
            return QuestionnaireResponse.objects.get(id=response_id)
        except QuestionnaireResponse.DoesNotExist:
            raise QuestionnaireResponseNotFound()
    
    @staticmethod
    def create_response(response_data):
        """Create a new questionnaire response"""
        # Validate response value against field type
        field = QuestionnaireFieldService.get_field_by_id(response_data['field'])
        value = response_data['value']
        
        # Basic validation - could be expanded for specific field types
        if field.type == 'boolean' and value not in ['true', 'false', '1', '0', 'yes', 'no']:
            raise InvalidResponseValue(detail="Boolean field must be true/false, yes/no, or 1/0")
        
        if field.type in ['select', 'multi-select'] and field.options:
            # For multi-select, validate each selected option
            if field.type == 'multi-select':
                selected_options = value.split(',')
                for option in selected_options:
                    if option.strip() not in field.options:
                        raise InvalidResponseValue(
                            detail=f"Invalid option: '{option}'. Must be one of: {', '.join(field.options)}"
                        )
            # For single select, validate the selected option
            elif value not in field.options:
                raise InvalidResponseValue(
                    detail=f"Invalid option: '{value}'. Must be one of: {', '.join(field.options)}"
                )
        
        with transaction.atomic():
            response = QuestionnaireResponse.objects.create(**response_data)
            logger.info(f"Created new questionnaire response for field: {field.name}")
            return response
    
    @staticmethod
    def update_response(response_id, response_data):
        """Update an existing questionnaire response"""
        response = QuestionnaireResponseService.get_response_by_id(response_id)
        
        # Validate new value if provided
        if 'value' in response_data:
            field = response.field
            value = response_data['value']
            
            # Same validation as in create_response
            if field.type == 'boolean' and value not in ['true', 'false', '1', '0', 'yes', 'no']:
                raise InvalidResponseValue(detail="Boolean field must be true/false, yes/no, or 1/0")
            
            if field.type in ['select', 'multi-select'] and field.options:
                if field.type == 'multi-select':
                    selected_options = value.split(',')
                    for option in selected_options:
                        if option.strip() not in field.options:
                            raise InvalidResponseValue(
                                detail=f"Invalid option: '{option}'. Must be one of: {', '.join(field.options)}"
                            )
                elif value not in field.options:
                    raise InvalidResponseValue(
                        detail=f"Invalid option: '{value}'. Must be one of: {', '.join(field.options)}"
                    )
        
        with transaction.atomic():
            # Update response fields
            for key, value in response_data.items():
                setattr(response, key, value)
            
            response.save()
            logger.info(f"Updated questionnaire response for field: {response.field.name}")
            return response
    
    @staticmethod
    def delete_response(response_id):
        """Delete a questionnaire response"""
        response = QuestionnaireResponseService.get_response_by_id(response_id)
        
        with transaction.atomic():
            field_name = response.field.name
            response.delete()
            logger.info(f"Deleted questionnaire response for field: {field_name}")
            return True
    
    @staticmethod
    def save_event_responses(event_id, responses_data):
        """
        Save multiple responses for an event at once
        
        Args:
            event_id: ID of the event
            responses_data: List of {field_id, value} dictionaries
        """
        with transaction.atomic():
            # Delete existing responses for this event
            QuestionnaireResponse.objects.filter(event_id=event_id).delete()
            
            # Create new responses
            created_responses = []
            for response_data in responses_data:
                field_id = response_data.get('field')
                value = response_data.get('value')
                
                if not field_id or value is None:
                    continue
                
                response = QuestionnaireResponseService.create_response({
                    'event_id': event_id,
                    'field_id': field_id,
                    'value': str(value)
                })
                created_responses.append(response)
            
            logger.info(f"Saved {len(created_responses)} responses for event {event_id}")
            return created_responses