# backend/core/domains/bookingflow/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class BookingFlowException(APIException):
    """Base exception for booking flow related errors"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'A booking flow error occurred.'
    default_code = 'booking_flow_error'


class BookingFlowNotFound(BookingFlowException):
    """Exception raised when a booking flow is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Booking flow not found.'
    default_code = 'booking_flow_not_found'


class BookingFlowStepNotFound(BookingFlowException):
    """Exception raised when a booking flow step is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Booking flow step not found.'
    default_code = 'booking_flow_step_not_found'


class BookingSessionNotFound(BookingFlowException):
    """Exception raised when a booking session is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Booking session not found.'
    default_code = 'booking_session_not_found'


class BookingSessionExpired(BookingFlowException):
    """Exception raised when a booking session has expired"""
    status_code = status.HTTP_410_GONE
    default_detail = 'Booking session has expired. Please start a new booking.'
    default_code = 'booking_session_expired'


class InvalidStepTransition(BookingFlowException):
    """Exception raised when an invalid step transition is attempted"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid step transition.'
    default_code = 'invalid_step_transition'


class StepValidationError(BookingFlowException):
    """Exception raised when step validation fails"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Step validation failed.'
    default_code = 'step_validation_error'


class DuplicateStepType(BookingFlowException):
    """Exception raised when attempting to create duplicate step types in the same flow"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'This step type already exists in the booking flow.'
    default_code = 'duplicate_step_type'


class InvalidStepConfiguration(BookingFlowException):
    """Exception raised when step configuration is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid step configuration.'
    default_code = 'invalid_step_configuration'


class BookingFlowInactive(BookingFlowException):
    """Exception raised when trying to use an inactive booking flow"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'This booking flow is currently inactive.'
    default_code = 'booking_flow_inactive'


class AvailabilityCheckFailed(BookingFlowException):
    """Exception raised when availability check fails"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Selected date/time is not available.'
    default_code = 'availability_check_failed'


class InvalidBookingData(BookingFlowException):
    """Exception raised when booking data is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid booking data provided.'
    default_code = 'invalid_booking_data'


class PaymentProcessingError(BookingFlowException):
    """Exception raised when payment processing fails"""
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = 'Payment processing failed.'
    default_code = 'payment_processing_error'


class BookingCreationFailed(BookingFlowException):
    """Exception raised when booking creation fails"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Failed to create booking. Please try again.'
    default_code = 'booking_creation_failed'


class ConditionalLogicError(BookingFlowException):
    """Exception raised when conditional logic evaluation fails"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Error evaluating conditional logic.'
    default_code = 'conditional_logic_error'


class QuestionnaireNotFound(BookingFlowException):
    """Exception raised when a required questionnaire is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Required questionnaire not found.'
    default_code = 'questionnaire_not_found'


class ProductNotAvailable(BookingFlowException):
    """Exception raised when a selected product is not available"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Selected product is not available.'
    default_code = 'product_not_available'


class DiscountNotApplicable(BookingFlowException):
    """Exception raised when a discount cannot be applied"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Discount cannot be applied to this booking.'
    default_code = 'discount_not_applicable'


class MaxAdvanceBookingExceeded(BookingFlowException):
    """Exception raised when booking is too far in advance"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Booking date exceeds maximum advance booking period.'
    default_code = 'max_advance_booking_exceeded'


class MinAdvanceBookingNotMet(BookingFlowException):
    """Exception raised when booking is not far enough in advance"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Booking date does not meet minimum advance booking requirement.'
    default_code = 'min_advance_booking_not_met'