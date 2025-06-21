# backend/core/domains/events/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class EventNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Event not found."
    default_code = "event_not_found"


class EventTypeNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Event type not found."
    default_code = "event_type_not_found"


class EventTaskNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Event task not found."
    default_code = "event_task_not_found"


class EventFileNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Event file not found."
    default_code = "event_file_not_found"


class InvalidFileUpload(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid file upload."
    default_code = "invalid_file_upload"


class InvalidEventTransition(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid event status transition."
    default_code = "invalid_event_transition"


class InvalidWorkflowStageTransition(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid workflow stage transition."
    default_code = "invalid_workflow_stage_transition"


class DuplicateEventFeedback(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "This user has already submitted feedback for this event."
    default_code = "duplicate_event_feedback"


class InsufficientPermission(APIException):
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You do not have permission to perform this action."
    default_code = "insufficient_permission"


class EventTaskDependencyError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Cannot complete task because it has incomplete dependencies."
    default_code = "event_task_dependency_error"