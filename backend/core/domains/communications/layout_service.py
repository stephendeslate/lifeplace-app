# backend/core/domains/communications/layout_service.py
"""
Service for composing email layouts with template content.
Handles the rendering and assembly of layout components around template content.
"""

import logging
from typing import Dict, Any, Optional, List, TYPE_CHECKING

from django.conf import settings
from django.utils import timezone

from .template_sandbox import sandboxed_template_engine, validate_template_for_save, TemplateSandboxError

if TYPE_CHECKING:
    from .models import EmailLayout, CommunicationTemplate

logger = logging.getLogger(__name__)


class LayoutCompositionService:
    """
    Composes email layouts with template content.

    Rendering order:
    1. Build layout context (colors, site info, etc.)
    2. Render header_template with layout context
    3. Render body_template (content) with full context
    4. Render footer_template with layout context
    5. Render wrapper_template with content injected
    6. Assemble final email: outer_wrapper(header + wrapped_content + footer)
    """

    # Base outer wrapper for all emails - provides email client compatibility
    OUTER_WRAPPER = '''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{ email_title }}</title>
    <style type="text/css">
        /* Reset styles for email clients */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f4f4; }
        {{ custom_styles }}
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width: 700px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e0e0e0;">
                    <tr>
                        <td>
                            {{ email_content }}
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''

    @classmethod
    def get_layout_context(
        cls,
        layout: 'EmailLayout',
        additional_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Build context dictionary for layout rendering.

        Args:
            layout: The EmailLayout instance
            additional_context: Additional variables to include

        Returns:
            Context dictionary with layout variables
        """
        now = timezone.now()

        context = {
            # Layout colors
            'primary_color': layout.primary_color,
            'secondary_color': layout.secondary_color,
            'logo_url': layout.logo_url,

            # Site information
            'site_name': getattr(settings, 'SITE_NAME', 'LifePlace'),
            'current_year': now.year,
            'current_date': now.strftime('%B %d, %Y'),
            'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@lifeplace.com'),

            # Default header values (can be overridden)
            'header_title': '',
            'header_subtitle': '',
        }

        # Merge additional context (allows templates to override header_title, etc.)
        if additional_context:
            context.update(additional_context)

        return context

    @classmethod
    def compose_email(
        cls,
        template: 'CommunicationTemplate',
        content_context: Dict[str, Any],
        layout: Optional['EmailLayout'] = None,
        subject: Optional[str] = None,
    ) -> str:
        """
        Compose a complete email by combining layout with template content.

        Args:
            template: The CommunicationTemplate instance
            content_context: Context variables for template rendering
            layout: Optional layout override (uses template.layout if not provided)
            subject: Email subject (used for email title)

        Returns:
            Fully rendered HTML email string

        Raises:
            TemplateSandboxError: If template rendering fails security validation
        """
        # Determine which layout to use
        effective_layout = layout or template.layout

        # If no layout, render template as-is (backward compatible)
        if not effective_layout:
            logger.debug(f"No layout for template '{template.name}', rendering content directly")
            return sandboxed_template_engine.render(
                template.body_template,
                content_context,
                validate_first=True
            )

        logger.info(f"Composing template '{template.name}' with layout '{effective_layout.name}'")

        # Build combined context
        layout_context = cls.get_layout_context(effective_layout, content_context)

        # 1. Render content (body_template)
        rendered_content = sandboxed_template_engine.render(
            template.body_template,
            layout_context,
            validate_first=True
        )

        # 2. Render header
        rendered_header = sandboxed_template_engine.render(
            effective_layout.header_template,
            layout_context,
            validate_first=True
        )

        # 3. Render footer
        rendered_footer = sandboxed_template_engine.render(
            effective_layout.footer_template,
            layout_context,
            validate_first=True
        )

        # 4. Wrap content using wrapper_template
        wrapper_context = {**layout_context, 'content': rendered_content}
        wrapped_content = sandboxed_template_engine.render(
            effective_layout.wrapper_template,
            wrapper_context,
            validate_first=True
        )

        # 5. Assemble email body (header + wrapped content + footer)
        email_body = rendered_header + wrapped_content + rendered_footer

        # 6. Wrap in outer HTML structure
        outer_context = {
            'email_title': subject or template.name,
            'custom_styles': effective_layout.base_styles or '',
            'email_content': email_body,
        }

        final_html = sandboxed_template_engine.render(
            cls.OUTER_WRAPPER,
            outer_context,
            validate_first=False  # Our own wrapper, already safe
        )

        return final_html

    @classmethod
    def preview_layout(
        cls,
        layout: 'EmailLayout',
        sample_content: str = '<p style="color: #333;">This is sample content to preview the layout.</p>',
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Preview a layout with sample content.

        Args:
            layout: The EmailLayout to preview
            sample_content: HTML content to inject
            context: Optional context variables

        Returns:
            Rendered HTML preview
        """
        preview_context = cls.get_layout_context(layout, context or {})
        preview_context['header_title'] = preview_context.get('header_title') or 'Layout Preview'
        preview_context['header_subtitle'] = preview_context.get('header_subtitle') or 'Sample email layout'

        # Render header
        rendered_header = sandboxed_template_engine.render(
            layout.header_template,
            preview_context,
            validate_first=True
        )

        # Render footer
        rendered_footer = sandboxed_template_engine.render(
            layout.footer_template,
            preview_context,
            validate_first=True
        )

        # Wrap sample content
        wrapper_context = {**preview_context, 'content': sample_content}
        wrapped_content = sandboxed_template_engine.render(
            layout.wrapper_template,
            wrapper_context,
            validate_first=True
        )

        # Assemble
        email_body = rendered_header + wrapped_content + rendered_footer

        outer_context = {
            'email_title': 'Layout Preview',
            'custom_styles': layout.base_styles or '',
            'email_content': email_body,
        }

        return sandboxed_template_engine.render(
            cls.OUTER_WRAPPER,
            outer_context,
            validate_first=False
        )

    @classmethod
    def validate_layout_templates(cls, layout: 'EmailLayout') -> tuple[bool, List[str]]:
        """
        Validate all layout template components for syntax and security.

        Args:
            layout: The EmailLayout to validate

        Returns:
            Tuple of (is_valid, list of error messages)
        """
        errors = []

        # Validate header
        is_valid, header_errors = validate_template_for_save(layout.header_template)
        if not is_valid:
            errors.extend([f"Header: {e}" for e in header_errors])

        # Validate footer
        is_valid, footer_errors = validate_template_for_save(layout.footer_template)
        if not is_valid:
            errors.extend([f"Footer: {e}" for e in footer_errors])

        # Validate wrapper
        is_valid, wrapper_errors = validate_template_for_save(layout.wrapper_template)
        if not is_valid:
            errors.extend([f"Wrapper: {e}" for e in wrapper_errors])

        # Validate base styles (if any - just check for dangerous patterns)
        if layout.base_styles:
            # Check for script injection in CSS
            dangerous_css_patterns = ['javascript:', 'expression(', 'behavior:', 'binding:']
            for pattern in dangerous_css_patterns:
                if pattern.lower() in layout.base_styles.lower():
                    errors.append(f"Base styles: Contains potentially dangerous CSS pattern: {pattern}")

        return len(errors) == 0, errors

    @classmethod
    def compose_content_only(
        cls,
        content: str,
        layout: 'EmailLayout',
        context: Optional[Dict[str, Any]] = None,
        subject: Optional[str] = None,
    ) -> str:
        """
        Compose a layout around raw content (for manual messages without template).

        Args:
            content: Raw HTML content to wrap
            layout: The EmailLayout to use
            context: Optional context variables
            subject: Email subject (used for email title)

        Returns:
            Fully rendered HTML email string
        """
        layout_context = cls.get_layout_context(layout, context or {})

        # Render header
        rendered_header = sandboxed_template_engine.render(
            layout.header_template,
            layout_context,
            validate_first=True
        )

        # Render footer
        rendered_footer = sandboxed_template_engine.render(
            layout.footer_template,
            layout_context,
            validate_first=True
        )

        # Wrap content
        wrapper_context = {**layout_context, 'content': content}
        wrapped_content = sandboxed_template_engine.render(
            layout.wrapper_template,
            wrapper_context,
            validate_first=True
        )

        # Assemble
        email_body = rendered_header + wrapped_content + rendered_footer

        outer_context = {
            'email_title': subject or 'Email',
            'custom_styles': layout.base_styles or '',
            'email_content': email_body,
        }

        return sandboxed_template_engine.render(
            cls.OUTER_WRAPPER,
            outer_context,
            validate_first=False
        )
