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


class InvalidEventData(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid event data."
    default_code = "invalid_event_data"


class EventTypeInUse(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Cannot delete event type that is in use by events."
    default_code = "event_type_in_use"