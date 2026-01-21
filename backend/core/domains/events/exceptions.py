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


# === DATE RESERVATION & AVAILABILITY EXCEPTIONS ===


class DateNoLongerAvailableException(Exception):
    """
    Raised when a date becomes unavailable during booking completion.

    This exception is used to trigger transaction rollback when:
    1. A date was available when the user started the booking flow
    2. Another user completed payment and blocked the date
    3. The first user's booking completion should fail gracefully

    Attributes:
        message: Human-readable error message
        date: The date that became unavailable (optional)
        blocking_event_id: The event that blocked the date (optional)
    """

    def __init__(self, message: str, date=None, blocking_event_id: int = None):
        super().__init__(message)
        self.message = message
        self.date = date
        self.blocking_event_id = blocking_event_id

    def __str__(self):
        return self.message


class DateNoLongerAvailableAPIException(APIException):
    """API-friendly version of DateNoLongerAvailableException"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This date is no longer available for booking."
    default_code = "date_no_longer_available"


class ReservationExpiredException(Exception):
    """
    Raised when a date reservation has expired.

    This occurs when the 5-minute payment window has elapsed
    without the booking being completed.
    """

    def __init__(self, message: str = "Date reservation has expired", reservation_token: str = None):
        super().__init__(message)
        self.message = message
        self.reservation_token = reservation_token


class ReservationExpiredAPIException(APIException):
    """API-friendly version of ReservationExpiredException"""
    status_code = status.HTTP_410_GONE
    default_detail = "Your date reservation has expired. Please try again."
    default_code = "reservation_expired"


class ReservationNotFoundException(Exception):
    """
    Raised when a reservation token is not found or invalid.
    """

    def __init__(self, message: str = "Reservation not found", reservation_token: str = None):
        super().__init__(message)
        self.message = message
        self.reservation_token = reservation_token


class ReservationNotFoundAPIException(APIException):
    """API-friendly version of ReservationNotFoundException"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Reservation not found."
    default_code = "reservation_not_found"


class DateAlreadyReservedException(Exception):
    """
    Raised when attempting to reserve a date that already has an active reservation.

    This is different from DateNoLongerAvailableException - this is for
    temporary reservations during the payment window, not permanent blocks.
    """

    def __init__(self, message: str, date=None, existing_reservation_id: int = None):
        super().__init__(message)
        self.message = message
        self.date = date
        self.existing_reservation_id = existing_reservation_id


class DateAlreadyReservedAPIException(APIException):
    """API-friendly version of DateAlreadyReservedException"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This date is currently being booked by another customer. Please wait or select a different date."
    default_code = "date_already_reserved"