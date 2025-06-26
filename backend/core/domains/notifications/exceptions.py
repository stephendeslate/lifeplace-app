# backend/core/domains/notifications/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class NotificationException(APIException):
    """Base exception for notification domain"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Notification error occurred.'
    default_code = 'notification_error'


class NotificationNotFoundException(NotificationException):
    """Exception raised when a notification is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Notification not found."
    default_code = 'notification_not_found'


class NotificationTypeNotFoundException(NotificationException):
    """Exception raised when a notification type is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Notification type not found."
    default_code = 'notification_type_not_found'


class NotificationPreferenceNotFoundException(NotificationException):
    """Exception raised when notification preferences are not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Notification preferences not found."
    default_code = 'notification_preference_not_found'


class InvalidNotificationDataException(NotificationException):
    """Exception raised when invalid notification data is provided"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid notification data provided."
    default_code = 'invalid_notification_data'


class NotificationDeliveryException(NotificationException):
    """Exception raised when notification delivery fails"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = "Failed to deliver notification."
    default_code = 'notification_delivery_failed'


class NotificationTemplateException(NotificationException):
    """Exception raised when there's an issue with notification templates"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Notification template error."
    default_code = 'notification_template_error'


class NotificationPermissionException(NotificationException):
    """Exception raised when user lacks permission for notification action"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You do not have permission to perform this notification action."
    default_code = 'notification_permission_denied'


class CannotEditReadNotificationException(NotificationException):
    """Exception raised when trying to edit a read notification"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Cannot modify a notification that has been read."
    default_code = 'cannot_edit_read_notification'


class InvalidBulkActionException(NotificationException):
    """Exception raised when an invalid bulk action is requested"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid bulk action request."
    default_code = 'invalid_bulk_action'


class NotificationTypeDisabledException(NotificationException):
    """Exception raised when trying to send a disabled notification type"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Cannot send notification of disabled type."
    default_code = 'notification_type_disabled'


class InvalidRecipientException(NotificationException):
    """Exception raised when an invalid recipient is specified"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid notification recipient."
    default_code = 'invalid_recipient'


class NotificationQuietHoursException(NotificationException):
    """Exception raised when trying to send notification during quiet hours"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Cannot send notification during user's quiet hours."
    default_code = 'notification_quiet_hours'


class NotificationDigestException(NotificationException):
    """Exception raised when there's an issue with notification digests"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Notification digest error."
    default_code = 'notification_digest_error'


class NotificationExpiredException(NotificationException):
    """Exception raised when trying to interact with an expired notification"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Notification has expired."
    default_code = 'notification_expired'


class NotificationSystemException(NotificationException):
    """Exception raised when trying to modify system notifications inappropriately"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Cannot modify system notification type."
    default_code = 'notification_system_protected'


class NotificationRateLimitException(NotificationException):
    """Exception raised when notification rate limit is exceeded"""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = "Notification rate limit exceeded. Please try again later."
    default_code = 'notification_rate_limit'


class NotificationServiceUnavailableException(NotificationException):
    """Exception raised when notification service is unavailable"""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Notification service is temporarily unavailable."
    default_code = 'notification_service_unavailable'