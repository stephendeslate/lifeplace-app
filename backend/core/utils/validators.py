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


# =============================================================================
# Image Dimension Validation (Section 14.1)
# =============================================================================

# Maximum allowed image dimensions
MAX_IMAGE_WIDTH = 4096
MAX_IMAGE_HEIGHT = 4096

# Maximum file size for images (10MB)
MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024


def validate_image_dimensions(
    uploaded_file,
    max_width: int = MAX_IMAGE_WIDTH,
    max_height: int = MAX_IMAGE_HEIGHT,
    max_file_size: int = MAX_IMAGE_FILE_SIZE
):
    """
    Validate image dimensions using Pillow.

    Checks that:
    1. File is a valid image
    2. Width does not exceed max_width
    3. Height does not exceed max_height
    4. File size does not exceed max_file_size

    Args:
        uploaded_file: Django UploadedFile object
        max_width: Maximum allowed width (default 4096)
        max_height: Maximum allowed height (default 4096)
        max_file_size: Maximum file size in bytes (default 10MB)

    Raises:
        ValidationError: If image is invalid or exceeds dimensions

    Returns:
        dict: Image info including width, height, format, and file_size
    """
    from PIL import Image
    import io

    if not uploaded_file:
        raise ValidationError("No file provided.")

    # Check file size first
    file_size = uploaded_file.size
    if file_size > max_file_size:
        raise ValidationError(
            f"Image file size ({file_size / (1024 * 1024):.2f}MB) exceeds "
            f"maximum allowed ({max_file_size / (1024 * 1024):.2f}MB)."
        )

    try:
        # Reset file pointer to beginning
        uploaded_file.seek(0)

        # Open with Pillow
        image = Image.open(uploaded_file)

        # Verify the image is readable
        image.verify()

        # Need to reopen after verify()
        uploaded_file.seek(0)
        image = Image.open(uploaded_file)

        # Get dimensions
        width, height = image.size
        image_format = image.format

        # Check dimensions
        if width > max_width:
            raise ValidationError(
                f"Image width ({width}px) exceeds maximum allowed ({max_width}px)."
            )

        if height > max_height:
            raise ValidationError(
                f"Image height ({height}px) exceeds maximum allowed ({max_height}px)."
            )

        logger.debug(
            f"Image validated: {uploaded_file.name} "
            f"({width}x{height}, {image_format}, {file_size} bytes)"
        )

        # Reset file pointer for subsequent operations
        uploaded_file.seek(0)

        return {
            'width': width,
            'height': height,
            'format': image_format,
            'file_size': file_size
        }

    except ValidationError:
        raise
    except Exception as e:
        logger.error(f"Error validating image dimensions: {e}")
        raise ValidationError(f"Invalid image file: {str(e)}")


def validate_and_optimize_image(
    uploaded_file,
    max_width: int = MAX_IMAGE_WIDTH,
    max_height: int = MAX_IMAGE_HEIGHT,
    quality: int = 85,
    optimize: bool = True
):
    """
    Validate image and optionally resize/compress if too large.

    This function is useful for automatically handling oversized images
    by resizing them to fit within the maximum dimensions while
    maintaining aspect ratio.

    Args:
        uploaded_file: Django UploadedFile object
        max_width: Maximum allowed width (default 4096)
        max_height: Maximum allowed height (default 4096)
        quality: JPEG quality for compression (1-100, default 85)
        optimize: Whether to optimize the image (default True)

    Returns:
        tuple: (processed_file_bytes, info_dict)
               - processed_file_bytes: BytesIO object with processed image
               - info_dict: dict with 'width', 'height', 'format', 'was_resized', 'was_compressed'

    Raises:
        ValidationError: If file is not a valid image
    """
    from PIL import Image
    import io

    if not uploaded_file:
        raise ValidationError("No file provided.")

    try:
        uploaded_file.seek(0)
        image = Image.open(uploaded_file)

        # Get original info
        original_width, original_height = image.size
        original_format = image.format or 'JPEG'

        was_resized = False
        was_compressed = False

        # Check if resizing is needed
        if original_width > max_width or original_height > max_height:
            # Calculate new dimensions maintaining aspect ratio
            ratio = min(max_width / original_width, max_height / original_height)
            new_width = int(original_width * ratio)
            new_height = int(original_height * ratio)

            # Resize with high-quality resampling
            image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
            was_resized = True

            logger.info(
                f"Resized image from {original_width}x{original_height} "
                f"to {new_width}x{new_height}"
            )
        else:
            new_width = original_width
            new_height = original_height

        # Convert RGBA to RGB for JPEG (JPEG doesn't support transparency)
        if image.mode in ('RGBA', 'P') and original_format.upper() == 'JPEG':
            image = image.convert('RGB')

        # Save to BytesIO
        output = io.BytesIO()

        # Determine save format
        save_format = original_format.upper()
        if save_format not in ['JPEG', 'PNG', 'GIF', 'WEBP']:
            save_format = 'JPEG'

        # Save with optimization
        if save_format == 'JPEG':
            image.save(output, format=save_format, quality=quality, optimize=optimize)
            was_compressed = True
        elif save_format == 'PNG':
            image.save(output, format=save_format, optimize=optimize)
            was_compressed = optimize
        else:
            image.save(output, format=save_format)

        output.seek(0)

        return output, {
            'width': new_width,
            'height': new_height,
            'format': save_format,
            'was_resized': was_resized,
            'was_compressed': was_compressed,
            'original_width': original_width,
            'original_height': original_height
        }

    except Exception as e:
        logger.error(f"Error processing image: {e}")
        raise ValidationError(f"Failed to process image: {str(e)}")


def validate_avatar_image(uploaded_file, max_size: int = 512):
    """
    Validate an avatar/profile image with stricter limits.

    Args:
        uploaded_file: Django UploadedFile object
        max_size: Maximum width and height (default 512px)

    Raises:
        ValidationError: If image is invalid or exceeds dimensions

    Returns:
        dict: Image info
    """
    return validate_image_dimensions(
        uploaded_file,
        max_width=max_size,
        max_height=max_size,
        max_file_size=2 * 1024 * 1024  # 2MB for avatars
    )


# =============================================================================
# Phone Number Validation
# =============================================================================

import phonenumbers
from phonenumbers import NumberParseException

# Default region for parsing numbers without a country code prefix
DEFAULT_PHONE_REGION = 'PH'


def validate_phone_number(phone: str, default_region: str = DEFAULT_PHONE_REGION) -> bool:
    """
    Validate a phone number using Google's libphonenumber.
    Defaults to PH region if no country code is provided.

    Accepts E.164 (+639123456789), local PH (09123456789),
    and any valid international number with country code.
    """
    if not phone or not isinstance(phone, str):
        return False

    cleaned = phone.strip()
    if not cleaned:
        return False

    try:
        parsed = phonenumbers.parse(cleaned, default_region)
        return phonenumbers.is_valid_number(parsed)
    except NumberParseException:
        return False


def normalize_phone_number(phone: str, default_region: str = DEFAULT_PHONE_REGION) -> str | None:
    """
    Normalize a phone number to E.164 format (e.g., '+639123456789').
    Returns None if the number is invalid.
    """
    if not phone or not isinstance(phone, str):
        return None

    cleaned = phone.strip()
    if not cleaned:
        return None

    try:
        parsed = phonenumbers.parse(cleaned, default_region)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        return None
    except NumberParseException:
        return None


class PhoneNumberValidator:
    """
    Django field validator for phone numbers.

    Usage on model fields:
        phone = models.CharField(max_length=20, validators=[PhoneNumberValidator()])

    Usage on serializer fields:
        phone = serializers.CharField(validators=[PhoneNumberValidator()])
    """

    def __init__(self, default_region: str = DEFAULT_PHONE_REGION):
        self.default_region = default_region

    def __call__(self, value):
        if not value:
            return  # Let required/blank validators handle empty values
        if not validate_phone_number(value, self.default_region):
            raise ValidationError(
                'Enter a valid phone number (e.g., 09123456789 or +639123456789).',
                code='invalid_phone',
            )

    def __eq__(self, other):
        return (
            isinstance(other, PhoneNumberValidator)
            and self.default_region == other.default_region
        )

    def deconstruct(self):
        return (
            'core.utils.validators.PhoneNumberValidator',
            [],
            {'default_region': self.default_region},
        )


class ImageDimensionValidator:
    """
    Django model field validator for image dimensions.

    Usage:
        image = models.ImageField(
            validators=[ImageDimensionValidator(max_width=4096, max_height=4096)]
        )
    """

    def __init__(self, max_width: int = MAX_IMAGE_WIDTH, max_height: int = MAX_IMAGE_HEIGHT):
        self.max_width = max_width
        self.max_height = max_height

    def __call__(self, value):
        """Validate the uploaded image."""
        validate_image_dimensions(value, self.max_width, self.max_height)

    def __eq__(self, other):
        return (
            isinstance(other, ImageDimensionValidator) and
            self.max_width == other.max_width and
            self.max_height == other.max_height
        )

    def deconstruct(self):
        """Return arguments for serialization in migrations."""
        return (
            'core.utils.validators.ImageDimensionValidator',
            [self.max_width, self.max_height],
            {}
        )
