# backend/core/domains/workflows/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class WorkflowTemplateNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Workflow template not found."
    default_code = "workflow_template_not_found"


class WorkflowStageNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Workflow stage not found."
    default_code = "workflow_stage_not_found"


class DuplicateStageOrder(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A stage with this order already exists for this template and stage type."
    default_code = "duplicate_stage_order"


class InvalidStageOrder(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Stage order must be a positive integer."
    default_code = "invalid_stage_order"


class AutomationConfigurationError(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid automation configuration."
    default_code = "automation_configuration_error"


class EmailTemplateRequired(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Email template is required for automated email stages."
    default_code = "email_template_required"