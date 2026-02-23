# backend/core/domains/questionnaires/validation.py
"""
Centralized validation logic for questionnaire fields.
This module provides a single source of truth for field validation rules
that can be used by both backend and exposed to frontend.
"""

import re
from decimal import Decimal, InvalidOperation
from typing import Any


class FieldValidator:
    """Centralized validation for questionnaire fields"""

    # Validation rules that can be exposed to frontend
    VALIDATION_RULES = {
        "email": {
            "pattern": r"^[^\s@]+@[^\s@]+\.[^\s@]+$",
            "message": "Please enter a valid email address",
            "example": "example@email.com",
        },
        "phone": {
            "pattern": None,  # Validated using phonenumbers library
            "message": "Please enter a valid phone number (e.g., 09123456789 or +639123456789)",
            "example": "09123456789",
        },
        "number": {"min": 0, "message": "Please enter a valid positive number"},
        "boolean": {"valid_values": ["true", "false", "1", "0", "yes", "no"], "message": "Please select Yes or No"},
        "date": {"pattern": r"^\d{4}-\d{2}-\d{2}$", "message": "Please enter a valid date (YYYY-MM-DD)"},
        "time": {"pattern": r"^\d{2}:\d{2}(:\d{2})?$", "message": "Please enter a valid time (HH:MM)"},
        "guests": {"message": "Please enter valid guest counts"},
    }

    @classmethod
    def validate_field(
        cls, field_type: str, value: Any, options: list[str] = None, required: bool = False
    ) -> tuple[bool, str | None]:
        """
        Validate a field value.

        Args:
            field_type: The type of field (text, number, email, etc.)
            value: The value to validate
            options: Available options for select/multi-select fields
            required: Whether the field is required

        Returns:
            Tuple of (is_valid, error_message)
            error_message is None if valid
        """
        # Required check
        if required and (value is None or str(value).strip() == ""):
            return False, "This field is required"

        # Empty non-required field is valid
        if value is None or str(value).strip() == "":
            return True, None

        value_str = str(value).strip()

        # Type-specific validation
        if field_type == "email":
            return cls._validate_email(value_str)

        elif field_type == "phone":
            return cls._validate_phone(value_str)

        elif field_type == "number":
            return cls._validate_number(value_str)

        elif field_type == "boolean":
            return cls._validate_boolean(value_str)

        elif field_type == "date":
            return cls._validate_date(value_str)

        elif field_type == "time":
            return cls._validate_time(value_str)

        elif field_type == "select":
            return cls._validate_select(value_str, options)

        elif field_type == "multi-select":
            return cls._validate_multi_select(value_str, options)

        elif field_type == "guests":
            return cls._validate_guests(value_str, options)

        # text, file, and other types have no specific validation
        return True, None

    @classmethod
    def _validate_email(cls, value: str) -> tuple[bool, str | None]:
        """Validate email format"""
        pattern = cls.VALIDATION_RULES["email"]["pattern"]
        if not re.match(pattern, value):
            return False, cls.VALIDATION_RULES["email"]["message"]
        return True, None

    @classmethod
    def _validate_phone(cls, value: str) -> tuple[bool, str | None]:
        """Validate phone number - accepts PH and international formats."""
        from core.utils.validators import validate_phone_number

        cleaned = re.sub(r"[\s\-\(\)]", "", value)
        if validate_phone_number(cleaned):
            return True, None
        return False, cls.VALIDATION_RULES["phone"]["message"]

    @classmethod
    def _validate_number(cls, value: str) -> tuple[bool, str | None]:
        """Validate numeric value"""
        try:
            num = Decimal(value)
            min_val = cls.VALIDATION_RULES["number"].get("min", None)
            if min_val is not None and num < min_val:
                return False, f"Number must be at least {min_val}"
            return True, None
        except InvalidOperation:
            return False, cls.VALIDATION_RULES["number"]["message"]

    @classmethod
    def _validate_boolean(cls, value: str) -> tuple[bool, str | None]:
        """Validate boolean value"""
        valid_values = cls.VALIDATION_RULES["boolean"]["valid_values"]
        if value.lower() not in valid_values:
            return False, cls.VALIDATION_RULES["boolean"]["message"]
        return True, None

    @classmethod
    def _validate_date(cls, value: str) -> tuple[bool, str | None]:
        """Validate date format (YYYY-MM-DD)"""
        pattern = cls.VALIDATION_RULES["date"]["pattern"]
        if not re.match(pattern, value):
            return False, cls.VALIDATION_RULES["date"]["message"]

        # Additional check for valid date
        try:
            from datetime import datetime

            datetime.strptime(value, "%Y-%m-%d")
            return True, None
        except ValueError:
            return False, "Please enter a valid date"

    @classmethod
    def _validate_time(cls, value: str) -> tuple[bool, str | None]:
        """Validate time format (HH:MM or HH:MM:SS)"""
        pattern = cls.VALIDATION_RULES["time"]["pattern"]
        if not re.match(pattern, value):
            return False, cls.VALIDATION_RULES["time"]["message"]
        return True, None

    @classmethod
    def _validate_select(cls, value: str, options: list[str] = None) -> tuple[bool, str | None]:
        """Validate single select value"""
        if options and value not in options:
            return False, "Please select a valid option"
        return True, None

    @classmethod
    def _validate_multi_select(cls, value: str, options: list[str] = None) -> tuple[bool, str | None]:
        """Validate multi-select values (comma-separated)"""
        if not options:
            return True, None

        selected = [v.strip() for v in value.split(",") if v.strip()]
        invalid = [v for v in selected if v not in options]

        if invalid:
            return False, f"Invalid selection(s): {', '.join(invalid)}"
        return True, None

    @classmethod
    def _validate_guests(cls, value: str, categories: list[str] = None) -> tuple[bool, str | None]:
        """
        Validate guest count value.

        For guests type, value should be JSON with category counts:
        {"Adults": 50, "Children": 10} or just a number if no categories.
        """
        import json

        # If categories are defined, expect JSON
        if categories:
            try:
                data = json.loads(value)
                if not isinstance(data, dict):
                    return False, "Guest count must be an object with category counts"

                total = 0
                for category, count in data.items():
                    if category not in categories:
                        return False, f"Invalid category: {category}"
                    try:
                        count_int = int(count)
                        if count_int < 0:
                            return False, f"{category} count cannot be negative"
                        total += count_int
                    except (ValueError, TypeError):
                        return False, f"Invalid count for {category}"

                if total == 0:
                    return False, "Total guest count must be greater than 0"

                return True, None
            except json.JSONDecodeError:
                return False, "Invalid guest count format"
        else:
            # Simple number validation
            try:
                count = int(value)
                if count < 0:
                    return False, "Guest count cannot be negative"
                return True, None
            except ValueError:
                return False, "Please enter a valid number"

    @classmethod
    def get_validation_rules_for_field(cls, field_type: str) -> dict:
        """
        Get validation rules for a field type to expose to frontend.

        Returns:
            Dictionary with validation rules for the field type
        """
        return cls.VALIDATION_RULES.get(field_type, {})

    @classmethod
    def get_all_validation_rules(cls) -> dict[str, dict]:
        """
        Get all validation rules for all field types.

        Returns:
            Dictionary mapping field types to their validation rules
        """
        return cls.VALIDATION_RULES.copy()

    @classmethod
    def validate_responses(cls, fields: list[dict], responses: dict[str, Any]) -> dict[str, str]:
        """
        Validate all responses for a questionnaire.

        Args:
            fields: List of field definitions with 'id', 'type', 'required', 'options'
            responses: Dictionary mapping field_id to value

        Returns:
            Dictionary mapping field_id to error message (empty if all valid)
        """
        errors = {}

        for field in fields:
            field_id = str(field.get("id"))
            field_type = field.get("type")
            required = field.get("required", False)
            options = field.get("options", [])

            value = responses.get(field_id) or responses.get(f"field_{field_id}")

            is_valid, error = cls.validate_field(field_type=field_type, value=value, options=options, required=required)

            if not is_valid:
                errors[field_id] = error

        return errors
