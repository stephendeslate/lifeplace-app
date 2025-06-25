# backend/core/domains/notifications/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class NotificationException(APIException):
    """Base exception for notification domain"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Notification operation failed'
    default_code = 'notification_error'


class NotificationTemplateNotFound(NotificationException):
    """Raised when a notification template is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Notification template not found'
    default_code = 'template_not_found'


class NotificationPreferenceNotFound(NotificationException):
    """Raised when notification preferences are not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Notification preferences not found'
    default_code = 'preferences_not_found'


class NotificationRuleNotFound(NotificationException):
    """Raised when a notification rule is not found"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Notification rule not found'
    default_code = 'rule_not_found'


class InvalidNotificationRule(NotificationException):
    """Raised when a notification rule is invalid"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid notification rule configuration'
    default_code = 'invalid_rule'


class NotificationDispatchFailed(NotificationException):
    """Raised when notification dispatch fails"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = 'Failed to dispatch notification'
    default_code = 'dispatch_failed'


class InvalidNotificationChannel(NotificationException):
    """Raised when an invalid notification channel is specified"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid notification channel'
    default_code = 'invalid_channel'


class NotificationQuotaExceeded(NotificationException):
    """Raised when notification quota is exceeded"""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Notification quota exceeded'
    default_code = 'quota_exceeded'


class DuplicateNotificationRule(NotificationException):
    """Raised when attempting to create a duplicate notification rule"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Notification rule already exists'
    default_code = 'duplicate_rule'