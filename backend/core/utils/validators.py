"""
File validation utilities for secure file uploads.
SECURITY FIX (P0-B11): Validates file content matches extension using magic numbers.
"""

import logging
import magic
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)

# Mapping of MIME types to allowed extensions
ALLOWED_MIME_TYPES = {
    # Images
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'image/svg+xml': ['.svg'],

    # Documents
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],

    # Text
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],

    # Archives (be careful with these)
    'application/zip': ['.zip'],
}

# Reverse mapping: extension to allowed MIME types
EXTENSION_TO_MIME = {}
for mime, extensions in ALLOWED_MIME_TYPES.items():
    for ext in extensions:
        if ext not in EXTENSION_TO_MIME:
            EXTENSION_TO_MIME[ext] = []
        EXTENSION_TO_MIME[ext].append(mime)


def validate_file_content(uploaded_file, allowed_extensions=None):
    """
    Validate that file content matches its extension using magic numbers.

    This prevents attacks where malicious files (e.g., executables, scripts)
    are disguised with safe extensions (e.g., .jpg, .pdf).

    Args:
        uploaded_file: Django UploadedFile object
        allowed_extensions: Optional list of allowed extensions (e.g., ['.jpg', '.png', '.pdf'])
                           If None, uses all extensions in ALLOWED_MIME_TYPES

    Raises:
        ValidationError: If file content doesn't match extension or is not allowed

    Returns:
        str: The detected MIME type
    """
    if not uploaded_file:
        raise ValidationError("No file provided.")

    # Get the file extension
    filename = uploaded_file.name.lower()
    extension = None
    for ext in EXTENSION_TO_MIME.keys():
        if filename.endswith(ext):
            extension = ext
            break

    if not extension:
        raise ValidationError(
            f"File extension not allowed. Allowed extensions: {list(EXTENSION_TO_MIME.keys())}"
        )

    # Check against allowed_extensions if provided
    if allowed_extensions:
        allowed_extensions = [ext.lower() for ext in allowed_extensions]
        if extension not in allowed_extensions:
            raise ValidationError(
                f"File extension '{extension}' not allowed for this upload. "
                f"Allowed: {allowed_extensions}"
            )

    # Read file content to detect MIME type
    try:
        # Read the first 2048 bytes for magic number detection
        uploaded_file.seek(0)
        file_header = uploaded_file.read(2048)
        uploaded_file.seek(0)  # Reset file pointer

        # Detect MIME type from content
        detected_mime = magic.from_buffer(file_header, mime=True)
    except Exception as e:
        logger.error(f"Error detecting file type: {e}")
        raise ValidationError("Could not verify file content type.")

    # Check if detected MIME type is in our allowed list
    if detected_mime not in ALLOWED_MIME_TYPES:
        logger.warning(
            f"File upload rejected: detected MIME type '{detected_mime}' not allowed. "
            f"Filename: {filename}"
        )
        raise ValidationError(
            f"File type '{detected_mime}' is not allowed."
        )

    # Check if the extension matches the detected MIME type
    expected_mimes = EXTENSION_TO_MIME.get(extension, [])
    if detected_mime not in expected_mimes:
        logger.warning(
            f"File upload rejected: MIME mismatch. Extension: {extension}, "
            f"Detected: {detected_mime}, Expected: {expected_mimes}. Filename: {filename}"
        )
        raise ValidationError(
            f"File content does not match extension. "
            f"Extension suggests {expected_mimes}, but content is '{detected_mime}'."
        )

    logger.debug(f"File validated successfully: {filename} ({detected_mime})")
    return detected_mime


def validate_image_file(uploaded_file):
    """
    Validate that an uploaded file is a valid image.

    Args:
        uploaded_file: Django UploadedFile object

    Raises:
        ValidationError: If file is not a valid image

    Returns:
        str: The detected MIME type
    """
    allowed_extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
    return validate_file_content(uploaded_file, allowed_extensions=allowed_extensions)


def validate_document_file(uploaded_file):
    """
    Validate that an uploaded file is a valid document.

    Args:
        uploaded_file: Django UploadedFile object

    Raises:
        ValidationError: If file is not a valid document

    Returns:
        str: The detected MIME type
    """
    allowed_extensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv']
    return validate_file_content(uploaded_file, allowed_extensions=allowed_extensions)
