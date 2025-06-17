# backend/core/domains/questionnaires/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class QuestionnaireNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Questionnaire not found."
    default_code = "questionnaire_not_found"


class QuestionnaireFieldNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Questionnaire field not found."
    default_code = "questionnaire_field_not_found"


class QuestionnaireResponseNotFound(APIException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Questionnaire response not found."
    default_code = "questionnaire_response_not_found"


class InvalidFieldType(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Invalid field type."
    default_code = "invalid_field_type"


class OptionsRequired(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Options are required for select and multi-select field types."
    default_code = "options_required"


class DuplicateQuestionnaireField(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "A field with this name already exists in this questionnaire."
    default_code = "duplicate_questionnaire_field"


class InvalidResponseValue(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "The provided response value is invalid for this field type."
    default_code = "invalid_response_value"