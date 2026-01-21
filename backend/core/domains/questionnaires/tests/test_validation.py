"""
Unit tests for questionnaires domain validation module.

Tests:
- FieldValidator class methods for all field types
- Email, phone, number, boolean, date, time validation
- Select and multi-select option validation
- Guest count validation (simple and JSON format)
- Bulk response validation
- Validation rules retrieval
"""

import pytest
import json

from core.domains.questionnaires.validation import FieldValidator


class TestFieldValidatorEmail:
    """Unit tests for email field validation."""

    def test_valid_email(self):
        """Test valid email passes validation."""
        is_valid, error = FieldValidator.validate_field('email', 'test@example.com')

        assert is_valid is True
        assert error is None

    def test_valid_email_with_subdomain(self):
        """Test email with subdomain passes validation."""
        is_valid, error = FieldValidator.validate_field('email', 'user@mail.company.org')

        assert is_valid is True

    def test_invalid_email_no_at_symbol(self):
        """Test email without @ symbol fails validation."""
        is_valid, error = FieldValidator.validate_field('email', 'invalid.email')

        assert is_valid is False
        assert 'valid email' in error.lower()

    def test_invalid_email_no_domain(self):
        """Test email without domain fails validation."""
        is_valid, error = FieldValidator.validate_field('email', 'user@')

        assert is_valid is False

    def test_invalid_email_spaces(self):
        """Test email with spaces fails validation."""
        is_valid, error = FieldValidator.validate_field('email', 'user @example.com')

        assert is_valid is False

    def test_empty_email_not_required(self):
        """Test empty email passes when not required."""
        is_valid, error = FieldValidator.validate_field('email', '', required=False)

        assert is_valid is True
        assert error is None

    def test_empty_email_required(self):
        """Test empty email fails when required."""
        is_valid, error = FieldValidator.validate_field('email', '', required=True)

        assert is_valid is False
        assert 'required' in error.lower()


class TestFieldValidatorPhone:
    """Unit tests for phone field validation (Philippine format)."""

    def test_valid_phone_09_format(self):
        """Test valid Philippine phone number with 09 prefix."""
        is_valid, error = FieldValidator.validate_field('phone', '09123456789')

        assert is_valid is True
        assert error is None

    def test_valid_phone_plus63_format(self):
        """Test valid Philippine phone number with +63 prefix."""
        is_valid, error = FieldValidator.validate_field('phone', '+639123456789')

        assert is_valid is True

    def test_valid_phone_with_dashes(self):
        """Test phone number with dashes is cleaned and validated."""
        is_valid, error = FieldValidator.validate_field('phone', '0912-345-6789')

        assert is_valid is True

    def test_valid_phone_with_spaces(self):
        """Test phone number with spaces is cleaned and validated."""
        is_valid, error = FieldValidator.validate_field('phone', '0912 345 6789')

        assert is_valid is True

    def test_invalid_phone_too_short(self):
        """Test phone number that is too short fails validation."""
        is_valid, error = FieldValidator.validate_field('phone', '091234')

        assert is_valid is False
        assert 'Philippine phone' in error

    def test_invalid_phone_wrong_format(self):
        """Test phone number with wrong format fails validation."""
        is_valid, error = FieldValidator.validate_field('phone', '123456789')

        assert is_valid is False

    def test_invalid_phone_letters(self):
        """Test phone number with letters fails validation."""
        is_valid, error = FieldValidator.validate_field('phone', '09abc456789')

        assert is_valid is False


class TestFieldValidatorNumber:
    """Unit tests for number field validation."""

    def test_valid_integer(self):
        """Test valid integer passes validation."""
        is_valid, error = FieldValidator.validate_field('number', '42')

        assert is_valid is True
        assert error is None

    def test_valid_decimal(self):
        """Test valid decimal number passes validation."""
        is_valid, error = FieldValidator.validate_field('number', '3.14')

        assert is_valid is True

    def test_valid_zero(self):
        """Test zero passes validation."""
        is_valid, error = FieldValidator.validate_field('number', '0')

        assert is_valid is True

    def test_invalid_negative_number(self):
        """Test negative number fails validation (min is 0)."""
        is_valid, error = FieldValidator.validate_field('number', '-5')

        assert is_valid is False
        assert 'at least' in error.lower()

    def test_invalid_not_a_number(self):
        """Test non-numeric string fails validation."""
        is_valid, error = FieldValidator.validate_field('number', 'abc')

        assert is_valid is False
        assert 'valid' in error.lower()

    def test_valid_large_number(self):
        """Test large number passes validation."""
        is_valid, error = FieldValidator.validate_field('number', '1000000')

        assert is_valid is True


class TestFieldValidatorBoolean:
    """Unit tests for boolean field validation."""

    def test_valid_true(self):
        """Test 'true' passes validation."""
        is_valid, error = FieldValidator.validate_field('boolean', 'true')

        assert is_valid is True
        assert error is None

    def test_valid_false(self):
        """Test 'false' passes validation."""
        is_valid, error = FieldValidator.validate_field('boolean', 'false')

        assert is_valid is True

    def test_valid_yes(self):
        """Test 'yes' passes validation."""
        is_valid, error = FieldValidator.validate_field('boolean', 'yes')

        assert is_valid is True

    def test_valid_no(self):
        """Test 'no' passes validation."""
        is_valid, error = FieldValidator.validate_field('boolean', 'no')

        assert is_valid is True

    def test_valid_1(self):
        """Test '1' passes validation."""
        is_valid, error = FieldValidator.validate_field('boolean', '1')

        assert is_valid is True

    def test_valid_0(self):
        """Test '0' passes validation."""
        is_valid, error = FieldValidator.validate_field('boolean', '0')

        assert is_valid is True

    def test_valid_case_insensitive(self):
        """Test boolean validation is case insensitive."""
        is_valid, error = FieldValidator.validate_field('boolean', 'TRUE')

        assert is_valid is True

    def test_invalid_boolean(self):
        """Test invalid boolean value fails validation."""
        is_valid, error = FieldValidator.validate_field('boolean', 'maybe')

        assert is_valid is False
        assert 'Yes or No' in error


class TestFieldValidatorDate:
    """Unit tests for date field validation."""

    def test_valid_date(self):
        """Test valid date in YYYY-MM-DD format passes validation."""
        is_valid, error = FieldValidator.validate_field('date', '2024-06-15')

        assert is_valid is True
        assert error is None

    def test_invalid_date_wrong_format(self):
        """Test date in wrong format fails validation."""
        is_valid, error = FieldValidator.validate_field('date', '15/06/2024')

        assert is_valid is False
        assert 'YYYY-MM-DD' in error

    def test_invalid_date_impossible_date(self):
        """Test impossible date fails validation."""
        is_valid, error = FieldValidator.validate_field('date', '2024-13-45')

        assert is_valid is False

    def test_invalid_date_feb_30(self):
        """Test invalid February 30 fails validation."""
        is_valid, error = FieldValidator.validate_field('date', '2024-02-30')

        assert is_valid is False

    def test_valid_leap_year_date(self):
        """Test valid leap year date passes validation."""
        is_valid, error = FieldValidator.validate_field('date', '2024-02-29')

        assert is_valid is True


class TestFieldValidatorTime:
    """Unit tests for time field validation."""

    def test_valid_time_hhmm(self):
        """Test valid time in HH:MM format passes validation."""
        is_valid, error = FieldValidator.validate_field('time', '14:30')

        assert is_valid is True
        assert error is None

    def test_valid_time_hhmmss(self):
        """Test valid time in HH:MM:SS format passes validation."""
        is_valid, error = FieldValidator.validate_field('time', '14:30:45')

        assert is_valid is True

    def test_valid_time_midnight(self):
        """Test midnight time passes validation."""
        is_valid, error = FieldValidator.validate_field('time', '00:00')

        assert is_valid is True

    def test_invalid_time_wrong_format(self):
        """Test time in wrong format fails validation."""
        is_valid, error = FieldValidator.validate_field('time', '2:30 PM')

        assert is_valid is False
        assert 'HH:MM' in error

    def test_invalid_time_single_digit(self):
        """Test time with single digit hours fails validation."""
        is_valid, error = FieldValidator.validate_field('time', '2:30')

        assert is_valid is False


class TestFieldValidatorSelect:
    """Unit tests for select field validation."""

    def test_valid_select_option(self):
        """Test valid select option passes validation."""
        options = ['Option A', 'Option B', 'Option C']
        is_valid, error = FieldValidator.validate_field('select', 'Option B', options=options)

        assert is_valid is True
        assert error is None

    def test_invalid_select_option(self):
        """Test invalid select option fails validation."""
        options = ['Option A', 'Option B', 'Option C']
        is_valid, error = FieldValidator.validate_field('select', 'Option D', options=options)

        assert is_valid is False
        assert 'valid option' in error.lower()

    def test_select_without_options_allows_any(self):
        """Test select without options allows any value."""
        is_valid, error = FieldValidator.validate_field('select', 'Any Value', options=None)

        assert is_valid is True

    def test_select_empty_when_not_required(self):
        """Test empty select passes when not required."""
        options = ['A', 'B']
        is_valid, error = FieldValidator.validate_field('select', '', options=options, required=False)

        assert is_valid is True


class TestFieldValidatorMultiSelect:
    """Unit tests for multi-select field validation."""

    def test_valid_multi_select_single(self):
        """Test valid single selection passes validation."""
        options = ['Choice 1', 'Choice 2', 'Choice 3']
        is_valid, error = FieldValidator.validate_field('multi-select', 'Choice 1', options=options)

        assert is_valid is True
        assert error is None

    def test_valid_multi_select_multiple(self):
        """Test valid multiple selections pass validation."""
        options = ['Choice 1', 'Choice 2', 'Choice 3']
        is_valid, error = FieldValidator.validate_field('multi-select', 'Choice 1,Choice 2', options=options)

        assert is_valid is True

    def test_valid_multi_select_with_spaces(self):
        """Test multi-select with spaces in comma-separated values."""
        options = ['Choice 1', 'Choice 2', 'Choice 3']
        is_valid, error = FieldValidator.validate_field('multi-select', 'Choice 1, Choice 2', options=options)

        assert is_valid is True

    def test_invalid_multi_select_option(self):
        """Test invalid multi-select option fails validation."""
        options = ['Choice 1', 'Choice 2', 'Choice 3']
        is_valid, error = FieldValidator.validate_field('multi-select', 'Choice 1,Invalid', options=options)

        assert is_valid is False
        assert 'Invalid' in error

    def test_multi_select_without_options(self):
        """Test multi-select without options allows any value."""
        is_valid, error = FieldValidator.validate_field('multi-select', 'Any,Values', options=None)

        assert is_valid is True


class TestFieldValidatorGuests:
    """Unit tests for guests field validation."""

    def test_valid_simple_guest_count(self):
        """Test simple numeric guest count passes validation."""
        is_valid, error = FieldValidator.validate_field('guests', '50')

        assert is_valid is True
        assert error is None

    def test_valid_guest_count_with_categories(self):
        """Test guest count JSON with categories passes validation."""
        categories = ['Adults', 'Children', 'Infants']
        value = json.dumps({'Adults': 50, 'Children': 10, 'Infants': 5})
        is_valid, error = FieldValidator.validate_field('guests', value, options=categories)

        assert is_valid is True

    def test_invalid_guest_count_invalid_category(self):
        """Test guest count with invalid category fails validation."""
        categories = ['Adults', 'Children']
        value = json.dumps({'Adults': 50, 'Teens': 10})
        is_valid, error = FieldValidator.validate_field('guests', value, options=categories)

        assert is_valid is False
        assert 'Invalid category' in error

    def test_invalid_guest_count_negative(self):
        """Test negative guest count fails validation."""
        categories = ['Adults', 'Children']
        value = json.dumps({'Adults': -5, 'Children': 10})
        is_valid, error = FieldValidator.validate_field('guests', value, options=categories)

        assert is_valid is False
        assert 'negative' in error.lower()

    def test_invalid_guest_count_zero_total(self):
        """Test zero total guest count fails validation."""
        categories = ['Adults', 'Children']
        value = json.dumps({'Adults': 0, 'Children': 0})
        is_valid, error = FieldValidator.validate_field('guests', value, options=categories)

        assert is_valid is False
        assert 'greater than 0' in error.lower()

    def test_invalid_guest_count_not_json(self):
        """Test non-JSON value with categories fails validation."""
        categories = ['Adults', 'Children']
        is_valid, error = FieldValidator.validate_field('guests', 'not json', options=categories)

        assert is_valid is False
        assert 'format' in error.lower()

    def test_invalid_guest_count_not_dict(self):
        """Test non-dict JSON with categories fails validation."""
        categories = ['Adults', 'Children']
        value = json.dumps(['Adults', 50])
        is_valid, error = FieldValidator.validate_field('guests', value, options=categories)

        assert is_valid is False
        assert 'object' in error.lower()

    def test_simple_guest_count_negative(self):
        """Test simple negative guest count fails validation."""
        is_valid, error = FieldValidator.validate_field('guests', '-10')

        assert is_valid is False
        assert 'negative' in error.lower()

    def test_simple_guest_count_invalid(self):
        """Test simple non-numeric guest count fails validation."""
        is_valid, error = FieldValidator.validate_field('guests', 'many')

        assert is_valid is False
        assert 'valid number' in error.lower()


class TestFieldValidatorText:
    """Unit tests for text field validation."""

    def test_text_field_allows_any_value(self):
        """Test text field allows any value."""
        is_valid, error = FieldValidator.validate_field('text', 'Any text value!')

        assert is_valid is True
        assert error is None

    def test_text_field_required(self):
        """Test required text field rejects empty value."""
        is_valid, error = FieldValidator.validate_field('text', '', required=True)

        assert is_valid is False
        assert 'required' in error.lower()

    def test_text_field_whitespace_only_required(self):
        """Test required text field rejects whitespace-only value."""
        is_valid, error = FieldValidator.validate_field('text', '   ', required=True)

        assert is_valid is False


class TestFieldValidatorFile:
    """Unit tests for file field validation."""

    def test_file_field_allows_any_value(self):
        """Test file field allows any value (validation handled elsewhere)."""
        is_valid, error = FieldValidator.validate_field('file', 'path/to/file.pdf')

        assert is_valid is True
        assert error is None


class TestFieldValidatorRequired:
    """Unit tests for required field handling."""

    def test_required_none_value(self):
        """Test required field rejects None value."""
        is_valid, error = FieldValidator.validate_field('text', None, required=True)

        assert is_valid is False
        assert 'required' in error.lower()

    def test_not_required_none_value(self):
        """Test non-required field accepts None value."""
        is_valid, error = FieldValidator.validate_field('text', None, required=False)

        assert is_valid is True


class TestFieldValidatorGetRules:
    """Unit tests for validation rules retrieval."""

    def test_get_validation_rules_for_email(self):
        """Test getting validation rules for email field."""
        rules = FieldValidator.get_validation_rules_for_field('email')

        assert 'pattern' in rules
        assert 'message' in rules
        assert 'example' in rules
        assert 'example.com' in rules['example']

    def test_get_validation_rules_for_phone(self):
        """Test getting validation rules for phone field."""
        rules = FieldValidator.get_validation_rules_for_field('phone')

        assert 'pattern' in rules
        assert 'message' in rules
        assert 'Philippine' in rules['message']

    def test_get_validation_rules_for_boolean(self):
        """Test getting validation rules for boolean field."""
        rules = FieldValidator.get_validation_rules_for_field('boolean')

        assert 'valid_values' in rules
        assert 'true' in rules['valid_values']
        assert 'false' in rules['valid_values']

    def test_get_validation_rules_for_nonexistent_type(self):
        """Test getting rules for non-existent type returns empty dict."""
        rules = FieldValidator.get_validation_rules_for_field('nonexistent')

        assert rules == {}

    def test_get_all_validation_rules(self):
        """Test getting all validation rules."""
        rules = FieldValidator.get_all_validation_rules()

        assert 'email' in rules
        assert 'phone' in rules
        assert 'number' in rules
        assert 'boolean' in rules
        assert 'date' in rules
        assert 'time' in rules


class TestValidateResponses:
    """Unit tests for bulk response validation."""

    def test_validate_all_valid_responses(self):
        """Test validation passes for all valid responses."""
        fields = [
            {'id': 1, 'type': 'text', 'required': True, 'options': []},
            {'id': 2, 'type': 'email', 'required': True, 'options': []},
        ]
        responses = {
            '1': 'John Doe',
            '2': 'john@example.com',
        }

        errors = FieldValidator.validate_responses(fields, responses)

        assert errors == {}

    def test_validate_missing_required_field(self):
        """Test validation catches missing required field."""
        fields = [
            {'id': 1, 'type': 'text', 'required': True, 'options': []},
            {'id': 2, 'type': 'email', 'required': True, 'options': []},
        ]
        responses = {
            '1': 'John Doe',
            # '2' is missing
        }

        errors = FieldValidator.validate_responses(fields, responses)

        assert '2' in errors
        assert 'required' in errors['2'].lower()

    def test_validate_invalid_email_response(self):
        """Test validation catches invalid email."""
        fields = [
            {'id': 1, 'type': 'email', 'required': False, 'options': []},
        ]
        responses = {
            '1': 'invalid-email',
        }

        errors = FieldValidator.validate_responses(fields, responses)

        assert '1' in errors
        assert 'valid email' in errors['1'].lower()

    def test_validate_with_field_prefix(self):
        """Test validation handles field_ prefix in response keys."""
        fields = [
            {'id': 1, 'type': 'text', 'required': True, 'options': []},
        ]
        responses = {
            'field_1': 'Answer with prefix',
        }

        errors = FieldValidator.validate_responses(fields, responses)

        assert errors == {}

    def test_validate_select_with_invalid_option(self):
        """Test validation catches invalid select option."""
        fields = [
            {'id': 1, 'type': 'select', 'required': True, 'options': ['A', 'B', 'C']},
        ]
        responses = {
            '1': 'D',
        }

        errors = FieldValidator.validate_responses(fields, responses)

        assert '1' in errors
        assert 'valid option' in errors['1'].lower()

    def test_validate_optional_field_empty(self):
        """Test validation passes for empty optional field."""
        fields = [
            {'id': 1, 'type': 'text', 'required': False, 'options': []},
        ]
        responses = {
            '1': '',
        }

        errors = FieldValidator.validate_responses(fields, responses)

        assert errors == {}

    def test_validate_multiple_errors(self):
        """Test validation collects multiple errors."""
        fields = [
            {'id': 1, 'type': 'email', 'required': True, 'options': []},
            {'id': 2, 'type': 'phone', 'required': True, 'options': []},
            {'id': 3, 'type': 'text', 'required': True, 'options': []},
        ]
        responses = {
            '1': 'invalid-email',
            '2': 'invalid-phone',
            # '3' is missing
        }

        errors = FieldValidator.validate_responses(fields, responses)

        assert '1' in errors
        assert '2' in errors
        assert '3' in errors
