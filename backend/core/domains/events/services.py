# backend/core/domains/events/services.py
import logging
from datetime import datetime

from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .exceptions import (
    DuplicateEventFeedback,
    EventFileNotFound,
    EventNotFound,
    EventTaskDependencyError,
    EventTaskNotFound,
    EventTypeNotFound,
    InvalidEventTransition,
    InvalidFileUpload,
    InvalidWorkflowStageTransition,
)
from .models import (
    Event,
    EventFeedback,
    EventFile,
    EventProductOption,
    EventTask,
    EventTimeline,
    EventType,
)

logger = logging.getLogger(__name__)


class EventTypeService:
    """Service for event types"""
    
    @staticmethod
    def get_all_event_types(search_query=None, is_active=None):
        """Get all event types with optional filtering"""
        queryset = EventType.objects.all()
        
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active)
        
        return queryset.order_by('name')
    
    @staticmethod
    def get_event_type_by_id(event_type_id):
        """Get an event type by ID"""
        try:
            return EventType.objects.get(id=event_type_id)
        except EventType.DoesNotExist:
            raise EventTypeNotFound()
    
    @staticmethod
    def create_event_type(event_type_data):
        """Create a new event type"""
        event_type = EventType.objects.create(**event_type_data)
        logger.info(f"Created new event type: {event_type.name}")
        return event_type
    
    @staticmethod
    def update_event_type(event_type_id, event_type_data):
        """Update an existing event type"""
        event_type = EventTypeService.get_event_type_by_id(event_type_id)
        
        for attr, value in event_type_data.items():
            setattr(event_type, attr, value)
        
        event_type.save()
        logger.info(f"Updated event type: {event_type.name}")
        return event_type
    
    @staticmethod
    def delete_event_type(event_type_id):
        """Delete an event type"""
        event_type = EventTypeService.get_event_type_by_id(event_type_id)
        name = event_type.name
        
        # Check if this event type is being used
        if Event.objects.filter(event_type=event_type).exists():
            # Instead of deleting, mark as inactive
            event_type.is_active = False
            event_type.save()
            logger.info(f"Marked event type as inactive: {name}")
            return False
        
        event_type.delete()
        logger.info(f"Deleted event type: {name}")
        return True


class EventService:
    """Service for events"""
    
    @staticmethod
    def get_all_events(
        search_query=None, 
        event_type_id=None, 
        status=None, 
        client_id=None,
        start_date_from=None,
        start_date_to=None,
        payment_status=None
    ):
        """Get all events with optional filtering"""
        queryset = Event.objects.all()
        
        if search_query:
            queryset = queryset.filter(
                Q(name__icontains=search_query) |
                Q(client__first_name__icontains=search_query) |
                Q(client__last_name__icontains=search_query) |
                Q(client__email__icontains=search_query)
            )
        
        if event_type_id:
            queryset = queryset.filter(event_type_id=event_type_id)
        
        if status:
            queryset = queryset.filter(status=status)
        
        if client_id:
            queryset = queryset.filter(client_id=client_id)
        
        if start_date_from:
            queryset = queryset.filter(start_date__gte=start_date_from)
        
        if start_date_to:
            queryset = queryset.filter(start_date__lte=start_date_to)
        
        if payment_status:
            queryset = queryset.filter(payment_status=payment_status)
        
        return queryset.order_by('-start_date')
    
    @staticmethod
    def get_event_by_id(event_id):
        """Get an event by ID"""
        try:
            return Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            raise EventNotFound()
    
    @staticmethod
    def create_event(validated_data, user, booking_flow_id=None):
        """Create a new event with optional workflow template from booking flow"""
        print("EventService.create_event validated data:", validated_data)  # Debug
        
        with transaction.atomic():
            tasks_data = validated_data.pop('tasks', [])
            event_products_data = validated_data.pop('event_products', [])
            print("EventService event products data:", event_products_data)  # Debug
            
            # Check if booking flow has a workflow template
            workflow_template = None
            if booking_flow_id:
                try:
                    from core.domains.bookingflow.models import BookingFlow
                    booking_flow = BookingFlow.objects.select_related('workflow_template').get(
                        id=booking_flow_id, is_active=True
                    )
                    if booking_flow.workflow_template and booking_flow.workflow_template.is_active:
                        workflow_template = booking_flow.workflow_template
                        # Set the first stage as current stage if workflow has stages
                        first_stage = workflow_template.stages.filter(
                            stage='LEAD'
                        ).order_by('order').first()
                        if first_stage:
                            validated_data['current_stage'] = first_stage
                        logger.info(f"Assigned workflow template '{workflow_template.name}' to event from booking flow")
                except Exception as e:
                    logger.warning(f"Could not assign workflow from booking flow {booking_flow_id}: {e}")
            
            # Add workflow template to event data if found
            if workflow_template:
                validated_data['workflow_template'] = workflow_template
            
            event = Event.objects.create(**validated_data)
            print("EventService event created with ID:", event.id)  # Debug
            
            for task_data in tasks_data:
                task_data['event'] = event
                EventTask.objects.create(**task_data)
            
            for product_data in event_products_data:
                print("EventService creating EventProductOption with data:", product_data)  # Debug
                product_data['event'] = event
                EventProductOption.objects.create(**product_data)
            
            # Create timeline entry
            timeline_description = 'Event created'
            if workflow_template:
                timeline_description += f' with workflow: {workflow_template.name}'
            
            EventTimeline.objects.create(
                event=event,
                action_type='SYSTEM_UPDATE',
                description=timeline_description,
                actor=user,
                is_public=True
            )
            
            return event
    
    @staticmethod
    def update_event(event_id, event_data, user):
        """Update an existing event"""
        event = EventService.get_event_by_id(event_id)
        
        with transaction.atomic():
            # Extract nested data if present
            tasks_data = event_data.pop('tasks', None)
            products_data = event_data.pop('event_products', None)
            
            # Track significant changes for timeline
            changes = []
            
            # Check for status change
            if 'status' in event_data and event_data['status'] != event.status:
                old_status = dict(Event.EVENT_STATUSES)[event.status]
                new_status = dict(Event.EVENT_STATUSES)[event_data['status']]
                changes.append(f"Status changed from {old_status} to {new_status}")
                
                # Log status change in timeline
                EventTimeline.objects.create(
                    event=event,
                    action_type='STATUS_CHANGE',
                    description=f"Status changed from {old_status} to {new_status}",
                    actor=user,
                    is_public=True
                )
            
            # Check for workflow stage change
            if 'current_stage_id' in event_data and event_data['current_stage_id'] != event.current_stage_id:
                changes.append(f"Workflow stage updated")
                
                # Log stage change in timeline
                EventTimeline.objects.create(
                    event=event,
                    action_type='STAGE_CHANGE',
                    description=f"Workflow stage updated",
                    actor=user,
                    is_public=True
                )
            
            # Update event fields
            for key, value in event_data.items():
                setattr(event, key, value)
            
            event.save()
            
            # Update tasks if provided
            if tasks_data is not None:
                event.tasks.all().delete()
                for task_data in tasks_data:
                    task_data['event'] = event
                    EventTask.objects.create(**task_data)
            
            # Update product options if provided
            if products_data is not None:
                event.event_products.all().delete()
                for product_data in products_data:
                    product_data['event'] = event
                    event.event_products.create(**product_data)
            
            # Create general update timeline entry if there were other changes
            if changes and len(changes) > 1:
                EventTimeline.objects.create(
                    event=event,
                    action_type='SYSTEM_UPDATE',
                    description=f"Event updated",
                    actor=user,
                    action_data={"changes": changes},
                    is_public=True
                )
            
            logger.info(f"Updated event: {event}")
            return event
    
    @staticmethod
    def delete_event(event_id, user):
        """Delete an event"""
        event = EventService.get_event_by_id(event_id)
        
        # Soft delete by changing status to CANCELLED
        event.status = 'CANCELLED'
        event.save()
        
        # Log the cancellation
        EventTimeline.objects.create(
            event=event,
            action_type='STATUS_CHANGE',
            description=f"Event cancelled",
            actor=user,
            is_public=True
        )
        
        logger.info(f"Cancelled event: {event}")
        return True
    
    @staticmethod
    def update_event_status(event_id, new_status, user):
        """Update an event's status"""
        event = EventService.get_event_by_id(event_id)
        old_status = event.status
        
        # Validate status transition
        valid_transitions = {
            'LEAD': ['CONFIRMED', 'CANCELLED'],
            'CONFIRMED': ['COMPLETED', 'CANCELLED'],
            'COMPLETED': ['CANCELLED'],
            'CANCELLED': []
        }
        
        if new_status not in valid_transitions[old_status]:
            raise InvalidEventTransition(
                detail=f"Cannot transition from {old_status} to {new_status}"
            )
        
        # Update status
        event.status = new_status
        event.save()
        
        # Log the status change
        old_status_display = dict(Event.EVENT_STATUSES)[old_status]
        new_status_display = dict(Event.EVENT_STATUSES)[new_status]
        
        EventTimeline.objects.create(
            event=event,
            action_type='STATUS_CHANGE',
            description=f"Status changed from {old_status_display} to {new_status_display}",
            actor=user,
            is_public=True
        )
        
        logger.info(f"Updated event status: {event} - {old_status} to {new_status}")
        return event
    
    @staticmethod
    def update_workflow_stage(event_id, new_stage_id, user):
        """Update an event's workflow stage"""
        event = EventService.get_event_by_id(event_id)
        
        # Validate that the new stage belongs to the event's workflow template
        if event.workflow_template:
            if not event.workflow_template.stages.filter(id=new_stage_id).exists():
                raise InvalidWorkflowStageTransition(
                    detail="The new stage does not belong to this event's workflow template"
                )
        
        # Save old stage for logging
        old_stage = event.current_stage
        
        # Update the stage
        event.current_stage_id = new_stage_id
        event.save()
        
        # Log the stage change
        EventTimeline.objects.create(
            event=event,
            action_type='STAGE_CHANGE',
            description=f"Workflow stage updated",
            actor=user,
            action_data={
                "old_stage": old_stage.name if old_stage else None,
                "new_stage": event.current_stage.name if event.current_stage else None
            },
            is_public=True
        )
        
        logger.info(f"Updated event workflow stage: {event}")
        return event


class EventTaskService:
    """Service for event tasks"""
    
    @staticmethod
    def get_tasks_for_event(event_id, status=None, assigned_to=None):
        """Get tasks for an event"""
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            raise EventNotFound()
        
        queryset = event.tasks.all()
        
        if status:
            queryset = queryset.filter(status=status)
        
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)
        
        return queryset.order_by('due_date', 'priority')
    
    @staticmethod
    def get_task_by_id(task_id):
        """Get a task by ID"""
        try:
            return EventTask.objects.get(id=task_id)
        except EventTask.DoesNotExist:
            raise EventTaskNotFound()
    
    @staticmethod
    def create_task(task_data, user):
        """Create a new task"""
        with transaction.atomic():
            task = EventTask.objects.create(**task_data)
            
            # Log task creation
            EventTimeline.objects.create(
                event=task.event,
                action_type='SYSTEM_UPDATE',
                description=f"Task created: {task.title}",
                actor=user,
                is_public=False
            )
            
            logger.info(f"Created new task: {task}")
            return task
    
    @staticmethod
    def update_task(task_id, task_data, user):
        """Update an existing task"""
        task = EventTaskService.get_task_by_id(task_id)
        
        with transaction.atomic():
            # Track status change
            old_status = task.status
            
            # Update task fields
            for key, value in task_data.items():
                setattr(task, key, value)
            
            # Handle completion logic
            if task.status == 'COMPLETED' and old_status != 'COMPLETED':
                task.completed_at = timezone.now()
                task.completed_by = user
            elif task.status != 'COMPLETED' and old_status == 'COMPLETED':
                task.completed_at = None
                task.completed_by = None
            
            task.save()
            
            # Log task update in timeline if status changed
            if old_status != task.status:
                EventTimeline.objects.create(
                    event=task.event,
                    action_type='TASK_COMPLETED' if task.status == 'COMPLETED' else 'SYSTEM_UPDATE',
                    description=f"Task '{task.title}' {task.status.lower()}",
                    actor=user,
                    is_public=task.is_visible_to_client
                )
            
            logger.info(f"Updated task: {task}")
            return task
    
    @staticmethod
    def delete_task(task_id, user):
        """Delete a task"""
        task = EventTaskService.get_task_by_id(task_id)
        event = task.event
        title = task.title
        
        task.delete()
        
        # Log task deletion
        EventTimeline.objects.create(
            event=event,
            action_type='SYSTEM_UPDATE',
            description=f"Task deleted: {title}",
            actor=user,
            is_public=False
        )
        
        logger.info(f"Deleted task: {title}")
        return True
    
    @staticmethod
    def complete_task(task_id, completion_notes, user):
        """Complete a task"""
        task = EventTaskService.get_task_by_id(task_id)
        
        # Check dependencies
        incomplete_dependencies = task.dependencies.exclude(status='COMPLETED')
        if incomplete_dependencies.exists():
            raise EventTaskDependencyError(
                detail="Cannot complete task because it has incomplete dependencies"
            )
        
        with transaction.atomic():
            # Update task
            task.status = 'COMPLETED'
            task.completion_notes = completion_notes
            task.completed_at = timezone.now()
            task.completed_by = user
            task.save()
            
            # Log task completion
            EventTimeline.objects.create(
                event=task.event,
                action_type='TASK_COMPLETED',
                description=f"Task completed: {task.title}",
                actor=user,
                is_public=task.is_visible_to_client
            )
            
            logger.info(f"Completed task: {task}")
            return task


class EventFileService:
    """Service for event files"""
    
    @staticmethod
    def get_files_for_event(event_id, category=None, is_public=None):
        """Get files for an event"""
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            raise EventNotFound()
        
        queryset = event.files.all()
        
        if category:
            queryset = queryset.filter(category=category)
        
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public)
        
        return queryset.order_by('-created_at')
    
    @staticmethod
    def create_file(file_data, file_obj, user):
        """Create a new file"""
        if not file_obj:
            raise InvalidFileUpload(detail="No file provided")
        
        with transaction.atomic():
            try:
                # Create the file
                file = EventFile.objects.create(
                    event_id=file_data['event_id'],
                    category=file_data['category'],
                    file=file_obj,
                    name=file_data.get('name', file_obj.name),
                    description=file_data.get('description', ''),
                    uploaded_by=user,
                    is_public=file_data.get('is_public', False),
                    mime_type=getattr(file_obj, 'content_type', ''),
                    size=file_obj.size
                )
                
                # Log file upload
                EventTimeline.objects.create(
                    event_id=file_data['event_id'],
                    action_type='FILE_UPLOADED',
                    description=f"File uploaded: {file.name}",
                    actor=user,
                    is_public=file.is_public
                )
                
                logger.info(f"Created new file: {file}")
                return file
                
            except Exception as e:
                logger.error(f"Error creating file: {str(e)}")
                raise InvalidFileUpload(detail=str(e))
    
    @staticmethod
    def update_file(file_id, file_data, file_obj, user):
        """Update an existing file"""
        try:
            file = EventFile.objects.get(id=file_id)
        except EventFile.DoesNotExist:
            raise EventFileNotFound()
        
        with transaction.atomic():
            # Update fields
            if 'name' in file_data:
                file.name = file_data['name']
            
            if 'description' in file_data:
                file.description = file_data['description']
            
            if 'category' in file_data:
                file.category = file_data['category']
            
            if 'is_public' in file_data:
                file.is_public = file_data['is_public']
            
            # If a new file is provided, replace the existing one
            if file_obj:
                file.file = file_obj
                file.size = file_obj.size
                file.mime_type = getattr(file_obj, 'content_type', '')
                file.version += 1
            
            file.save()
            
            # Log file update
            EventTimeline.objects.create(
                event=file.event,
                action_type='SYSTEM_UPDATE',
                description=f"File updated: {file.name}",
                actor=user,
                is_public=file.is_public
            )
            
            logger.info(f"Updated file: {file}")
            return file
    
    @staticmethod
    def delete_file(file_id, user):
        """Delete a file"""
        try:
            file = EventFile.objects.get(id=file_id)
        except EventFile.DoesNotExist:
            raise EventFileNotFound()
        
        event = file.event
        name = file.name
        
        file.delete()
        
        # Log file deletion
        EventTimeline.objects.create(
            event=event,
            action_type='SYSTEM_UPDATE',
            description=f"File deleted: {name}",
            actor=user,
            is_public=False
        )
        
        logger.info(f"Deleted file: {name}")
        return True


class EventFeedbackService:
    """Service for event feedback"""
    
    @staticmethod
    def get_feedback_for_event(event_id):
        """Get feedback for an event"""
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            raise EventNotFound()
        
        return event.feedback.all().order_by('-created_at')
    
    @staticmethod
    def create_feedback(feedback_data, user):
        """Create new feedback for an event"""
        # Check if user has already submitted feedback for this event
        existing_feedback = EventFeedback.objects.filter(
            event_id=feedback_data['event_id'],
            submitted_by=user
        ).exists()
        
        if existing_feedback:
            raise DuplicateEventFeedback()
        
        with transaction.atomic():
            # Set the submitter
            feedback_data['submitted_by'] = user
            
            # Create the feedback
            feedback = EventFeedback.objects.create(**feedback_data)
            
            # Log feedback submission
            EventTimeline.objects.create(
                event_id=feedback_data['event_id'],
                action_type='FEEDBACK_RECEIVED',
                description=f"Feedback received with rating {feedback.overall_rating}/5",
                actor=user,
                is_public=False
            )
            
            logger.info(f"Created new feedback: {feedback}")
            return feedback
    
    @staticmethod
    def add_response(feedback_id, response, user):
        """Add admin response to feedback"""
        try:
            feedback = EventFeedback.objects.get(id=feedback_id)
        except EventFeedback.DoesNotExist:
            raise Exception("Feedback not found")
        
        feedback.response = response
        feedback.response_by = user
        feedback.save()
        
        # Log response
        EventTimeline.objects.create(
            event=feedback.event,
            action_type='SYSTEM_UPDATE',
            description=f"Response added to feedback",
            actor=user,
            is_public=False
        )
        
        logger.info(f"Added response to feedback: {feedback}")
        return feedback


class EventTimelineService:
    """Service for event timeline"""
    
    @staticmethod
    def get_timeline_for_event(event_id, is_public=None):
        """Get timeline entries for an event"""
        try:
            event = Event.objects.get(id=event_id)
        except Event.DoesNotExist:
            raise EventNotFound()
        
        queryset = event.timeline.all()
        
        if is_public is not None:
            queryset = queryset.filter(is_public=is_public)
        
        return queryset.order_by('-created_at')
    
    @staticmethod
    def add_timeline_entry(entry_data, user):
        """Add a manual timeline entry"""
        entry = EventTimeline.objects.create(
            event_id=entry_data['event_id'],
            action_type=entry_data['action_type'],
            description=entry_data['description'],
            actor=user,
            action_data=entry_data.get('action_data'),
            is_public=entry_data.get('is_public', False)
        )
        
        logger.info(f"Added timeline entry: {entry}")
        return entry