"""Tests for phone number validation and normalization utilities."""

from django.core.exceptions import ValidationError

import pytest

from core.utils.validators import (
    PhoneNumberValidator,
    normalize_phone_number,
    validate_phone_number,
)


class TestValidatePhoneNumber:
    """Tests for validate_phone_number()."""

    # Valid Philippine formats
    @pytest.mark.parametrize(
        "phone",
        [
            "09123456789",  # Local mobile
            "+639123456789",  # International
            "9123456789",  # Without leading 0
            "+63 912 345 6789",  # With spaces
            "0912-345-6789",  # With dashes
            "(0912) 345-6789",  # With parens
        ],
    )
    def test_valid_ph_numbers(self, phone):
        assert validate_phone_number(phone) is True

    # Valid international numbers
    @pytest.mark.parametrize(
        "phone",
        [
            "+14155551234",  # US
            "+442071234567",  # UK
            "+81312345678",  # Japan
            "+61412345678",  # Australia
            "+1 415 555 1234",  # US with spaces
        ],
    )
    def test_valid_international_numbers(self, phone):
        assert validate_phone_number(phone) is True

    # Invalid numbers
    @pytest.mark.parametrize(
        "phone",
        [
            "",
            "   ",
            "1234",
            "09abc456789",
            "not-a-number",
            "+0000000000",
            "12345",
        ],
    )
    def test_invalid_numbers(self, phone):
        assert validate_phone_number(phone) is False

    def test_none_input(self):
        assert validate_phone_number(None) is False

    def test_non_string_input(self):
        assert validate_phone_number(12345) is False


class TestNormalizePhoneNumber:
    """Tests for normalize_phone_number()."""

    @pytest.mark.parametrize(
        "input_phone,expected",
        [
            ("09123456789", "+639123456789"),
            ("+639123456789", "+639123456789"),
            ("9123456789", "+639123456789"),
            ("+63 912 345 6789", "+639123456789"),
            ("0912-345-6789", "+639123456789"),
            ("+14155551234", "+14155551234"),
            ("+442071234567", "+442071234567"),
        ],
    )
    def test_normalization(self, input_phone, expected):
        assert normalize_phone_number(input_phone) == expected

    def test_invalid_returns_none(self):
        assert normalize_phone_number("1234") is None

    def test_empty_returns_none(self):
        assert normalize_phone_number("") is None

    def test_none_returns_none(self):
        assert normalize_phone_number(None) is None


class TestPhoneNumberValidator:
    """Tests for PhoneNumberValidator (Django field validator)."""

    def test_valid_does_not_raise(self):
        validator = PhoneNumberValidator()
        validator("+639123456789")  # Should not raise

    def test_valid_international_does_not_raise(self):
        validator = PhoneNumberValidator()
        validator("+14155551234")  # Should not raise

    def test_invalid_raises_validation_error(self):
        validator = PhoneNumberValidator()
        with pytest.raises(ValidationError) as exc_info:
            validator("1234")
        assert exc_info.value.code == "invalid_phone"

    def test_empty_does_not_raise(self):
        validator = PhoneNumberValidator()
        validator("")  # Empty is allowed (required check is separate)

    def test_none_does_not_raise(self):
        validator = PhoneNumberValidator()
        validator(None)  # None is allowed

    def test_equality(self):
        v1 = PhoneNumberValidator()
        v2 = PhoneNumberValidator()
        assert v1 == v2

    def test_equality_different_region(self):
        v1 = PhoneNumberValidator(default_region="PH")
        v2 = PhoneNumberValidator(default_region="US")
        assert v1 != v2

    def test_deconstruct(self):
        validator = PhoneNumberValidator(default_region="PH")
        path, args, kwargs = validator.deconstruct()
        assert path == "core.utils.validators.PhoneNumberValidator"
        assert args == []
        assert kwargs == {"default_region": "PH"}
