# backend/core/domains/contracts/exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException


class ContractException(APIException):
    """Base exception for contract domain"""

    status_code = status.HTTP_400_BAD_REQUEST


class ContractTemplateNotFound(ContractException):
    """Exception raised when contract template is not found"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Contract template not found"
    default_code = "contract_template_not_found"


class EventContractNotFound(ContractException):
    """Exception raised when event contract is not found"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Event contract not found"
    default_code = "event_contract_not_found"


class EventNotFound(ContractException):
    """Exception raised when event is not found"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Event not found"
    default_code = "event_not_found"


class InvalidContractTemplate(ContractException):
    """Exception raised when contract template is invalid"""

    default_detail = "Invalid contract template"
    default_code = "invalid_contract_template"


class InvalidContractStatus(ContractException):
    """Exception raised when contract status transition is invalid"""

    default_detail = "Invalid contract status transition"
    default_code = "invalid_contract_status"


class ContractAlreadySigned(ContractException):
    """Exception raised when trying to modify a signed contract"""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Contract is already signed and cannot be modified"
    default_code = "contract_already_signed"


class ContractExpired(ContractException):
    """Exception raised when contract has expired"""

    status_code = status.HTTP_410_GONE
    default_detail = "Contract has expired"
    default_code = "contract_expired"


class SignatureRequired(ContractException):
    """Exception raised when signature is required but not provided"""

    default_detail = "Signature is required"
    default_code = "signature_required"


class SignatureAlreadyExists(ContractException):
    """Exception raised when signature for a role already exists"""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "Signature for this role already exists"
    default_code = "signature_already_exists"


class InvalidSignatureRole(ContractException):
    """Exception raised when signature role is not valid for contract"""

    default_detail = "Invalid signature role for this contract"
    default_code = "invalid_signature_role"


class AmendmentNotAllowed(ContractException):
    """Exception raised when contract cannot be amended"""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "This contract cannot be amended"
    default_code = "amendment_not_allowed"


class AmendmentNotFound(ContractException):
    """Exception raised when amendment is not found"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Contract amendment not found"
    default_code = "amendment_not_found"


class InvalidAmendmentStatus(ContractException):
    """Exception raised when amendment status transition is invalid"""

    default_detail = "Invalid amendment status transition"
    default_code = "invalid_amendment_status"


class DocumentNotFound(ContractException):
    """Exception raised when contract document is not found"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Contract document not found"
    default_code = "document_not_found"


class DocumentUploadError(ContractException):
    """Exception raised when document upload fails"""

    status_code = status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
    default_detail = "Document upload failed"
    default_code = "document_upload_error"


class InvalidDocumentType(ContractException):
    """Exception raised when document type is invalid"""

    default_detail = "Invalid document type"
    default_code = "invalid_document_type"


class NoteNotFound(ContractException):
    """Exception raised when contract note is not found"""

    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Contract note not found"
    default_code = "note_not_found"


class ContractValueError(ContractException):
    """Exception raised when contract value is invalid"""

    default_detail = "Invalid contract value"
    default_code = "invalid_contract_value"


class SignatureVerificationError(ContractException):
    """Exception raised when signature verification fails"""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_detail = "Signature verification failed"
    default_code = "signature_verification_error"


class ContractGenerationError(ContractException):
    """Exception raised when contract generation fails"""

    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = "Contract generation failed"
    default_code = "contract_generation_error"


class MissingRequiredSignatures(ContractException):
    """Exception raised when required signatures are missing"""

    default_detail = "Missing required signatures"
    default_code = "missing_required_signatures"


class UnauthorizedContractAccess(ContractException):
    """Exception raised when user doesn't have access to contract"""

    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "You do not have permission to access this contract"
    default_code = "unauthorized_contract_access"
