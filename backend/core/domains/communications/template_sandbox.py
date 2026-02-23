# backend/core/domains/communications/template_sandbox.py
"""
Sandboxed template rendering for communications.

This module provides secure template rendering that restricts Django template
functionality to prevent code injection and other security vulnerabilities.
"""

import logging
import re
from typing import Any

from django.template import Context, Template, TemplateSyntaxError

logger = logging.getLogger(__name__)


# Safe template tags that are allowed in communication templates
SAFE_TAGS = {
    "if",
    "endif",
    "else",
    "elif",
    "for",
    "endfor",
    "empty",
    "firstof",
    "with",
    "endwith",
    "spaceless",
    "endspaceless",
    "autoescape",
    "endautoescape",
    "filter",
    "endfilter",
    "now",
    "cycle",
    "widthratio",
    "resetcycle",
}

# Tags that are explicitly blocked (security risk)
BLOCKED_TAGS = {
    "load",  # Can load arbitrary template tags
    "include",  # Can include arbitrary templates
    "extends",  # Can extend arbitrary templates
    "block",  # Used with extends
    "endblock",
    "ssi",  # Server-side includes
    "debug",  # Exposes debug info
    "csrf_token",  # Not needed in email templates
    "url",  # Could expose URL structure
    "static",  # Could expose static file paths
    "templatetag",  # Could be used to bypass restrictions
}

# Safe filters that are allowed
SAFE_FILTERS = {
    # String manipulation
    "lower",
    "upper",
    "title",
    "capfirst",
    "truncatechars",
    "truncatewords",
    "ljust",
    "rjust",
    "center",
    "cut",
    "striptags",
    "escape",
    "escapejs",
    "safe",  # Needed for HTML email content
    "linebreaks",
    "linebreaksbr",
    "wordwrap",
    "wordcount",
    "join",
    "length",
    "length_is",
    "first",
    "last",
    "random",
    "slice",
    "slugify",
    "stringformat",
    "urlencode",
    # Date/time formatting
    "date",
    "time",
    "timesince",
    "timeuntil",
    # Number formatting
    "floatformat",
    "add",
    "divisibleby",
    "filesizeformat",
    # List operations
    "dictsort",
    "dictsortreversed",
    "unordered_list",
    # Boolean
    "default",
    "default_if_none",
    "yesno",
    # Pluralization
    "pluralize",
    # Formatting
    "phone2numeric",
    "linenumbers",
}

# Filters that are explicitly blocked
BLOCKED_FILTERS = {
    "make_list",  # Can be used in template injection attacks
    "pprint",  # Exposes object internals
}

# Pattern to detect template tags
TAG_PATTERN = re.compile(r"{%\s*(\w+)")

# Pattern to detect template filters
FILTER_PATTERN = re.compile(r"\|\s*(\w+)")

# Pattern to detect potentially dangerous content
DANGEROUS_PATTERNS = [
    re.compile(r"__\w+__"),  # Dunder attributes
    re.compile(r"\bimport\b"),  # Python import
    re.compile(r"\bexec\b"),  # Python exec
    re.compile(r"\beval\b"),  # Python eval
    re.compile(r"\bcompile\b"),  # Python compile
    re.compile(r"\bopen\b"),  # File operations
    re.compile(r"\bos\."),  # OS module
    re.compile(r"\bsys\."),  # Sys module
    re.compile(r"\.mro\b"),  # Method resolution order
    re.compile(r"\.subclasses\b"),  # Subclass access
    re.compile(r"\.base\b"),  # Base class access
    re.compile(r"request\."),  # Request object access
    re.compile(r"settings\."),  # Settings access
]


class TemplateSandboxError(Exception):
    """Raised when a template violates sandbox restrictions"""

    pass


class SandboxedTemplateEngine:
    """
    Provides sandboxed template rendering with restricted tag/filter support.

    Usage:
        engine = SandboxedTemplateEngine()

        # Validate template before saving
        is_valid, errors = engine.validate_template(template_string)

        # Render template safely
        rendered = engine.render(template_string, context_dict)
    """

    def __init__(
        self,
        allowed_tags: set[str] | None = None,
        allowed_filters: set[str] | None = None,
        max_template_length: int = 100000,  # 100KB max
        max_context_depth: int = 10,
    ):
        self.allowed_tags = allowed_tags or SAFE_TAGS
        self.allowed_filters = allowed_filters or SAFE_FILTERS
        self.max_template_length = max_template_length
        self.max_context_depth = max_context_depth

    def validate_template(self, template_string: str) -> tuple[bool, list[str]]:
        """
        Validate a template string for sandbox compliance.

        Returns:
            tuple: (is_valid: bool, errors: List[str])
        """
        errors = []

        if not template_string:
            return True, []

        # Check template length
        if len(template_string) > self.max_template_length:
            errors.append(f"Template exceeds maximum length of {self.max_template_length} characters")
            return False, errors

        # Check for blocked/unknown tags
        tags_found = TAG_PATTERN.findall(template_string)
        for tag in tags_found:
            tag_lower = tag.lower()
            if tag_lower in BLOCKED_TAGS:
                errors.append(f"Blocked template tag: '{tag}'")
            elif tag_lower not in self.allowed_tags:
                # Check if it's a common tag we should warn about
                errors.append(f"Unsupported template tag: '{tag}'")

        # Check for blocked/unknown filters
        filters_found = FILTER_PATTERN.findall(template_string)
        for filter_name in filters_found:
            filter_lower = filter_name.lower()
            if filter_lower in BLOCKED_FILTERS:
                errors.append(f"Blocked filter: '{filter_name}'")
            # Note: We don't block unknown filters as they might be custom ones

        # Check for dangerous patterns
        for pattern in DANGEROUS_PATTERNS:
            if pattern.search(template_string):
                errors.append(f"Potentially dangerous pattern detected: '{pattern.pattern}'")

        # Try to parse the template for syntax errors
        try:
            Template(template_string)
        except TemplateSyntaxError as e:
            errors.append(f"Template syntax error: {e!s}")

        return len(errors) == 0, errors

    def sanitize_context(self, context_data: dict[str, Any], depth: int = 0) -> dict[str, Any]:
        """
        Sanitize context data to prevent object attribute access attacks.

        This converts complex objects to simple dictionaries and
        removes any callable objects.
        """
        if depth > self.max_context_depth:
            return {}

        sanitized = {}

        for key, value in context_data.items():
            # Skip keys that look dangerous
            if key.startswith("_") or key.startswith("__"):
                logger.warning(f"Skipping context key with underscore prefix: {key}")
                continue

            # Handle different types
            if value is None or isinstance(value, (str, int, float, bool)):
                sanitized[key] = value
            elif isinstance(value, (list, tuple)):
                sanitized[key] = [self._sanitize_value(v, depth + 1) for v in value]
            elif isinstance(value, dict):
                sanitized[key] = self.sanitize_context(value, depth + 1)
            elif hasattr(value, "__dict__"):
                # Convert model instances to safe dictionaries
                sanitized[key] = self._model_to_dict(value, depth + 1)
            elif callable(value):
                # Skip callable objects
                logger.warning(f"Skipping callable context value: {key}")
                continue
            else:
                # Convert to string for safety
                sanitized[key] = str(value)

        return sanitized

    def _sanitize_value(self, value: Any, depth: int) -> Any:
        """Sanitize a single value."""
        if value is None or isinstance(value, (str, int, float, bool)):
            return value
        elif isinstance(value, dict):
            return self.sanitize_context(value, depth)
        elif isinstance(value, (list, tuple)):
            return [self._sanitize_value(v, depth + 1) for v in value]
        elif hasattr(value, "__dict__"):
            return self._model_to_dict(value, depth)
        else:
            return str(value)

    def _model_to_dict(self, obj: Any, depth: int) -> dict[str, Any]:
        """Convert a model instance to a safe dictionary."""
        if depth > self.max_context_depth:
            return {"_str": str(obj)}

        result = {}

        # Get public attributes only
        for attr in dir(obj):
            if attr.startswith("_"):
                continue

            try:
                value = getattr(obj, attr)

                # Skip callables
                if callable(value):
                    continue

                # Recursively sanitize
                result[attr] = self._sanitize_value(value, depth + 1)

            except (AttributeError, TypeError):
                continue

        return result

    def render(self, template_string: str, context_data: dict[str, Any] = None, validate_first: bool = True) -> str:
        """
        Render a template with sandboxed execution.

        Args:
            template_string: The template to render
            context_data: Context dictionary for template variables
            validate_first: Whether to validate the template before rendering

        Returns:
            The rendered template string

        Raises:
            TemplateSandboxError: If validation fails or rendering encounters issues
        """
        if not template_string:
            return ""

        if context_data is None:
            context_data = {}

        # Validate template if requested
        if validate_first:
            is_valid, errors = self.validate_template(template_string)
            if not is_valid:
                error_msg = "; ".join(errors)
                logger.error(f"Template validation failed: {error_msg}")
                raise TemplateSandboxError(f"Template validation failed: {error_msg}")

        # Sanitize context
        safe_context = self.sanitize_context(context_data)

        try:
            template = Template(template_string)
            context = Context(safe_context)
            return template.render(context)
        except TemplateSyntaxError as e:
            logger.error(f"Template syntax error during render: {e}")
            raise TemplateSandboxError(f"Template syntax error: {e!s}")
        except Exception as e:
            logger.error(f"Template render error: {e}")
            raise TemplateSandboxError(f"Template render error: {e!s}")

    def render_subject_and_body(
        self, subject_template: str | None, body_template: str, context_data: dict[str, Any] = None
    ) -> dict[str, str | None]:
        """
        Render both subject and body templates.

        Args:
            subject_template: Optional subject template string
            body_template: Body template string
            context_data: Context dictionary

        Returns:
            Dict with 'subject' and 'body' keys
        """
        result = {"subject": None, "body": None}

        if subject_template:
            result["subject"] = self.render(subject_template, context_data, validate_first=True)

        result["body"] = self.render(body_template, context_data, validate_first=True)

        return result


# Global instance for convenience
sandboxed_template_engine = SandboxedTemplateEngine()


def validate_template_for_save(template_string: str) -> tuple[bool, list[str]]:
    """
    Convenience function to validate a template before saving to database.

    Use this in model clean() methods and serializer validation.
    """
    return sandboxed_template_engine.validate_template(template_string)


def render_template_safely(template_string: str, context_data: dict[str, Any] = None) -> str:
    """
    Convenience function for safe template rendering.
    """
    return sandboxed_template_engine.render(template_string, context_data)
