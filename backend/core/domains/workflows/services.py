# backend/core/domains/workflows/services.py
import logging

from django.db import models, transaction
from django.db.models import Max, Q

from .exceptions import (
    DuplicateStageOrder,
    WorkflowStageNotFound,
    WorkflowTemplateNotFound,
)
from .models import WorkflowStage, WorkflowTemplate

logger = logging.getLogger(__name__)


class WorkflowTemplateService:
    """Service for managing workflow templates"""
    
    @staticmethod
    def get_all_templates(search_query=None, event_type_id=None, is_active=None):
        """Get all workflow templates with optional filtering"""
        queryset = WorkflowTemplate.objects.all()
        
        # Apply filters if provided
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        if event_type_id:
            queryset = queryset.filter(event_type_id=event_type_id)
            
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
            
        return queryset.order_by('name')
    
    @staticmethod
    def get_template_by_id(template_id):
        """Get a workflow template by ID"""
        try:
            return WorkflowTemplate.objects.get(id=template_id)
        except WorkflowTemplate.DoesNotExist:
            raise WorkflowTemplateNotFound()
    
    @staticmethod
    def create_template(template_data):
        """Create a new workflow template"""
        stages_data = template_data.pop('stages', [])
        
        with transaction.atomic():
            template = WorkflowTemplate.objects.create(**template_data)
            
            # Create stages if provided
            for stage_data in stages_data:
                WorkflowTemplateService._create_stage(template, stage_data)
            
            logger.info(f"Created new workflow template: {template.name}")
            return template
    
    @staticmethod
    def update_template(template_id, template_data):
        """Update an existing workflow template"""
        template = WorkflowTemplateService.get_template_by_id(template_id)
        stages_data = template_data.pop('stages', None)
        
        with transaction.atomic():
            # Update template fields
            for key, value in template_data.items():
                setattr(template, key, value)
            
            template.save()
            
            # If stages provided, update them
            if stages_data is not None:
                # Delete existing stages
                template.stages.all().delete()
                
                # Create new stages
                for stage_data in stages_data:
                    WorkflowTemplateService._create_stage(template, stage_data)
            
            logger.info(f"Updated workflow template: {template.name}")
            return template
    
    @staticmethod
    def delete_template(template_id):
        """Delete a workflow template"""
        template = WorkflowTemplateService.get_template_by_id(template_id)
        
        with transaction.atomic():
            template_name = template.name
            template.delete()
            logger.info(f"Deleted workflow template: {template_name}")
            return True
    
    @staticmethod
    def _create_stage(template, stage_data):
        """Helper method to create a stage for a template"""
        # Check for duplicate order within the same stage type
        same_stage_order = WorkflowStage.objects.filter(
            template=template,
            stage=stage_data['stage'],
            order=stage_data['order']
        ).exists()
        
        if same_stage_order:
            raise DuplicateStageOrder()
        
        return WorkflowStage.objects.create(template=template, **stage_data)


class WorkflowStageService:
    """Service for managing workflow stages"""
    
    @staticmethod
    def get_stages_for_template(template_id):
        """Get all stages for a specific template"""
        try:
            template = WorkflowTemplate.objects.get(id=template_id)
            return template.stages.all().order_by('stage', 'order')
        except WorkflowTemplate.DoesNotExist:
            raise WorkflowTemplateNotFound()
    
    @staticmethod
    def get_stage_by_id(stage_id):
        """Get a workflow stage by ID"""
        try:
            return WorkflowStage.objects.get(id=stage_id)
        except WorkflowStage.DoesNotExist:
            raise WorkflowStageNotFound()
    
    @staticmethod
    def create_stage(template_id, stage_data):
        """Create a new workflow stage for a template"""
        try:
            template = WorkflowTemplate.objects.get(id=template_id)
        except WorkflowTemplate.DoesNotExist:
            raise WorkflowTemplateNotFound()
        
        # Auto-assign order if not provided
        if 'order' not in stage_data:
            # Get the max order for this stage type, default to 0 if none exist
            max_order = WorkflowStage.objects.filter(
                template=template,
                stage=stage_data['stage']
            ).aggregate(Max('order'))['order__max'] or 0
            stage_data['order'] = max_order + 1
        
        # Check for duplicate order within the same stage type
        same_stage_order = WorkflowStage.objects.filter(
            template=template,
            stage=stage_data['stage'],
            order=stage_data['order']
        ).exists()
        
        if same_stage_order:
            raise DuplicateStageOrder()
        
        with transaction.atomic():
            # Create the stage without passing 'template' in stage_data
            stage = WorkflowStage.objects.create(template=template, **stage_data)
            logger.info(f"Created new workflow stage: {stage.name} for template: {template.name}")
            return stage
    
    @staticmethod
    def update_stage(stage_id, stage_data):
        """Update an existing workflow stage"""
        stage = WorkflowStageService.get_stage_by_id(stage_id)
        
        # Make a copy of stage_data to avoid modifying the input
        stage_data_copy = stage_data.copy()
        
        # Handle template if present
        template = stage.template
        if 'template' in stage_data_copy:
            if hasattr(stage_data_copy['template'], 'id'):
                template_id = stage_data_copy['template'].id
            else:
                template_id = stage_data_copy['template']
                
            if template_id != stage.template.id:
                try:
                    template = WorkflowTemplate.objects.get(id=template_id)
                    stage.template = template
                    stage_data_copy.pop('template')
                except WorkflowTemplate.DoesNotExist:
                    raise WorkflowTemplateNotFound()
        
        # Check if order is being changed
        order_changed = False
        old_order = stage.order
        new_order = None
        current_stage_type = stage.stage
        
        if 'order' in stage_data_copy and int(stage_data_copy['order']) != old_order:
            order_changed = True
            new_order = int(stage_data_copy['order'])
        
        # Check if stage type is being changed
        stage_type_changed = False
        new_stage_type = None
        
        if 'stage' in stage_data_copy and stage_data_copy['stage'] != current_stage_type:
            stage_type_changed = True
            new_stage_type = stage_data_copy['stage']
        
        with transaction.atomic():
            # Special handling for order changes
            if order_changed or stage_type_changed:
                # Determine which stage type we're working with
                working_stage_type = new_stage_type if stage_type_changed else current_stage_type
                
                # Get all stages of this type including our stage
                all_stages = WorkflowStage.objects.filter(
                    template=template,
                    stage=working_stage_type
                ).select_for_update()
                
                # Get the maximum order value for this stage type
                max_order = all_stages.aggregate(Max('order'))['order__max'] or 0
                temp_start = max_order + 1000  # Use a very high temporary order
                
                # PHASE 1: Assign temporary high orders to all stages
                for i, s in enumerate(all_stages):
                    temp_order = temp_start + i
                    s.order = temp_order
                    s.save(update_fields=['order'])
                
                logger.info(f"Assigned temporary high orders to all {working_stage_type} stages")
                
                # Apply non-order changes to our stage
                for key, value in stage_data_copy.items():
                    if key != 'order':  # Skip order, we'll handle it separately
                        setattr(stage, key, value)
                
                # If stage type changed, save first to update the stage type
                if stage_type_changed:
                    stage.save()
                    
                    # Re-query stages since our stage is now in a different category
                    all_stages = WorkflowStage.objects.filter(
                        template=template,
                        stage=working_stage_type
                    ).select_for_update().order_by('order')
                
                # PHASE 2: Reorder all stages with sequential ordering
                # Make a list of stages in the desired order
                stage_list = list(all_stages)
                
                # If our stage was already in this list, remove it so we can insert it at the new position
                stage_list = [s for s in stage_list if s.id != stage.id]
                
                # Determine where to insert our stage
                insert_position = min(new_order - 1, len(stage_list)) if new_order else 0
                
                # Insert our stage at the desired position
                stage_list.insert(insert_position, stage)
                
                # Assign sequential orders
                for i, s in enumerate(stage_list, start=1):
                    s.order = i
                    s.save(update_fields=['order'])
                
                logger.info(f"Reordered stages with stage {stage.name} at position {stage.order}")
            else:
                # No order change - just apply updates normally
                for key, value in stage_data_copy.items():
                    setattr(stage, key, value)
                stage.save()
                
            logger.info(f"Updated workflow stage: {stage.name} for template: {stage.template.name}")
            return stage
    
    @staticmethod
    def reorder_stages(template_id, stage_type, order_mapping):
        """
        Reorder stages of a specific type within a template
        
        Args:
            template_id: ID of the workflow template
            stage_type: Type of stages to reorder (LEAD, PRODUCTION, POST_PRODUCTION)
            order_mapping: Dict mapping stage IDs to their new order
        """
        try:
            template = WorkflowTemplate.objects.get(id=template_id)
        except WorkflowTemplate.DoesNotExist:
            raise WorkflowTemplateNotFound()
        
        with transaction.atomic():
            # Get all stages of the specified type for this template
            stages = WorkflowStage.objects.filter(
                template=template,
                stage=stage_type
            ).select_for_update().order_by('order')
            
            # Convert string IDs to integers in the order_mapping
            int_order_mapping = {int(k): v for k, v in order_mapping.items()}
            
            # Get the maximum existing order value
            max_order = stages.aggregate(max_order=models.Max('order'))['max_order'] or 0
            temp_start = max_order + 1000  # Start temp values well above existing ones
            
            # First, update all stages to have temporary very large order values
            # This avoids conflicts during reordering
            for i, stage in enumerate(stages):
                temp_order = temp_start + i
                if stage.id in int_order_mapping:
                    stage.order = temp_order
                    stage.save(update_fields=['order'])
            
            # Then update with final values
            for stage in stages:
                if stage.id in int_order_mapping:
                    new_order = int_order_mapping[stage.id]
                    stage.order = new_order
                    stage.save(update_fields=['order'])
            
            logger.info(f"Reordered stages for template: {template.name}, stage type: {stage_type}")
            return stages.order_by('order')
        
    @staticmethod
    def delete_stage(stage_id):
        """
        Delete a workflow stage and reorder remaining stages
        
        Args:
            stage_id: ID of the stage to delete
            
        Returns:
            bool: True if deletion was successful
            
        Raises:
            WorkflowStageNotFound: If the stage doesn't exist
        """
        try:
            stage = WorkflowStage.objects.get(id=stage_id)
        except WorkflowStage.DoesNotExist:
            raise WorkflowStageNotFound()
        
        with transaction.atomic():
            # Store information for reordering and logging
            template = stage.template
            stage_type = stage.stage
            deleted_order = stage.order
            stage_name = stage.name
            
            # Delete the stage
            stage.delete()
            
            # Reorder remaining stages of the same type to maintain sequential ordering
            remaining_stages = WorkflowStage.objects.filter(
                template=template,
                stage=stage_type,
                order__gt=deleted_order
            ).select_for_update().order_by('order')
            
            # Decrease order by 1 for all stages that had higher order than the deleted stage
            for remaining in remaining_stages:
                remaining.order -= 1
                remaining.save(update_fields=['order'])
            
            logger.info(f"Deleted workflow stage: {stage_name} and reordered remaining stages")
            return True