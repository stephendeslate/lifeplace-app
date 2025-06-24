# backend/core/domains/bookingflow/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class BookingFlowException(APIException):
    """Base exception for bookingflow domain"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'A booking flow error occurred.'
    default_code = 'booking_flow_error'


class BookingFlowNotFound(BookingFlowException):
    """Raised when a booking flow is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Booking flow not found.'
    default_code = 'booking_flow_not_found'


class BookingFlowStepNotFound(BookingFlowException):
    """Raised when a booking flow step is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Booking flow step not found.'
    default_code = 'booking_flow_step_not_found'


class BookingSessionNotFound(BookingFlowException):
    """Raised when a booking session is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Booking session not found.'
    default_code = 'booking_session_not_found'


class InvalidStepConfiguration(BookingFlowException):
    """Raised when step configuration is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid step configuration.'
    default_code = 'invalid_step_configuration'


class InvalidStepOrder(BookingFlowException):
    """Raised when step order is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid step order. Steps must be sequential.'
    default_code = 'invalid_step_order'


class DuplicateStepType(BookingFlowException):
    """Raised when attempting to create duplicate step type in flow"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'A step with this type already exists in this booking flow.'
    default_code = 'duplicate_step_type'


class BookingSessionExpired(BookingFlowException):
    """Raised when a booking session has expired"""
    status_code = status.HTTP_410_GONE
    default_detail = 'Booking session has expired.'
    default_code = 'booking_session_expired'


class InvalidSessionData(BookingFlowException):
    """Raised when session data is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid session data provided.'
    default_code = 'invalid_session_data'


class StepValidationError(BookingFlowException):
    """Raised when step validation fails"""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Step validation failed.'
    default_code = 'step_validation_error'


class QuestionnaireNotFound(BookingFlowException):
    """Raised when required questionnaire is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Questionnaire not found.'
    default_code = 'questionnaire_not_found'


class ProductNotFound(BookingFlowException):
    """Raised when required product is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Product not found.'
    default_code = 'product_not_found'


class InvalidBookingFlowState(BookingFlowException):
    """Raised when booking flow is in invalid state for operation"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Booking flow is in invalid state for this operation.'
    default_code = 'invalid_booking_flow_state'


class BookingFlowNotActive(BookingFlowException):
    """Raised when trying to access inactive booking flow"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'This booking flow is not currently active.'
    default_code = 'booking_flow_not_active'


class InsufficientInventory(BookingFlowException):
    """Raised when selected products don't have sufficient inventory"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Insufficient inventory for selected products.'
    default_code = 'insufficient_inventory'


class InvalidDiscountCode(BookingFlowException):
    """Raised when discount code is invalid or expired"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid or expired discount code.'
    default_code = 'invalid_discount_code'


class BookingDataValidationError(BookingFlowException):
    """Raised when booking data validation fails"""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Booking data validation failed.'
    default_code = 'booking_data_validation_error'


class SessionDataCorrupted(BookingFlowException):
    """Raised when session data is corrupted or inconsistent"""
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = 'Session data is corrupted or inconsistent.'
    default_code = 'session_data_corrupted'


class StepNotAvailable(BookingFlowException):
    """Raised when trying to access a step that's not available"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'This step is not available.'
    default_code = 'step_not_available'


class WorkflowTemplateNotFound(BookingFlowException):
    """Raised when workflow template is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Workflow template not found.'
    default_code = 'workflow_template_not_found'


class EventCreationFailed(BookingFlowException):
    """Raised when event creation fails during booking completion"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Failed to create event from booking.'
    default_code = 'event_creation_failed'