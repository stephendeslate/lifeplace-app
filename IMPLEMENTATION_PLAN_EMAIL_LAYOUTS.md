# Email Layout System - Implementation Plan

## Executive Summary

This document outlines a comprehensive plan to implement a dedicated Email Layout system for the LifePlace communications domain. The goal is to separate **layout** (HTML shell: header, footer, styling) from **content** (template-specific messages and variables), enabling centralized brand management and consistent styling across all communication templates.

---

## Current State Analysis

### Architecture Overview

**Backend Location:** `backend/core/domains/communications/`

| File | Purpose |
|------|---------|
| `models.py` | `CommunicationTemplate`, `CommunicationRecord`, `CommunicationTemplateHistory` |
| `services.py` | Template CRUD, preview rendering, communication sending |
| `template_sandbox.py` | Secure Django template rendering with validation |
| `context_service.py` | Context variable generation (100+ variables) |
| `serializers.py` | DRF serializers for API |
| `views.py` | REST API endpoints (ViewSets) |
| `urls.py` | URL routing |

**Frontend Location:** `frontend/admin-crm/src/`

| File | Purpose |
|------|---------|
| `types/communications.types.ts` | TypeScript interfaces |
| `apis/communications.api.ts` | API client functions |
| `pages/settings/templates/CommunicationTemplates.tsx` | Template management UI |
| `components/communications/TemplateForm.tsx` | Template editor component |

### Current Template Storage

Templates store **complete HTML** in `body_template` field with:
- Full HTML structure (header, content wrapper, footer)
- Inline CSS styling
- Hardcoded colors, fonts, company name
- Variable placeholders (`{{ variable_name }}`)

**Problem:** 28 templates × duplicate HTML = maintenance burden + inconsistency risk

### Rendering Flow (Current)

```
1. CommunicationTemplateService.preview_template() [services.py:131-217]
   ↓
2. sandboxed_template_engine.render() [template_sandbox.py:283-329]
   ↓
3. Django Template Engine processes {{ variables }}
   ↓
4. Returns rendered HTML
```

**Key Injection Point:** After step 2, before returning - compose with layout if assigned.

---

## Proposed Architecture

### Data Model

```
┌─────────────────────┐         ┌─────────────────────────┐
│    EmailLayout      │         │  CommunicationTemplate  │
├─────────────────────┤         ├─────────────────────────┤
│ id (PK)             │◄────────│ layout (FK, nullable)   │
│ name (unique)       │    1:N  │ name                    │
│ description         │         │ body_template (content) │
│ header_template     │         │ subject_template        │
│ footer_template     │         │ channel                 │
│ wrapper_template    │         │ ...existing fields...   │
│ base_styles         │         └─────────────────────────┘
│ primary_color       │
│ secondary_color     │
│ logo_url            │
│ is_default          │
│ is_active           │
│ created_at          │
│ updated_at          │
└─────────────────────┘

┌─────────────────────┐
│  EmailLayoutHistory │  (Audit trail)
├─────────────────────┤
│ id                  │
│ layout (FK)         │
│ version             │
│ ...snapshot fields..│
│ changed_by (FK)     │
│ reason              │
│ created_at          │
└─────────────────────┘
```

### Rendering Flow (New)

```
1. CommunicationTemplateService.preview_template()
   ↓
2. Check if template.layout exists
   ↓
   ├─ YES → LayoutCompositionService.compose()
   │        ├─ Render header_template with context
   │        ├─ Render body_template (content) with context
   │        ├─ Render footer_template with context
   │        └─ Combine: header + wrapper(content) + footer
   │
   └─ NO  → sandboxed_template_engine.render(body_template)
            (backward compatible - legacy full-HTML templates)
```

---

## Implementation Phases

### Phase 1: Backend - Model & Migration (Foundation)

**Files to Create:**
- `backend/core/domains/communications/models.py` (modify)
- `backend/core/domains/communications/migrations/XXXX_add_email_layout.py`
- `backend/core/domains/communications/fixtures/default_layouts.json`

**Tasks:**

#### 1.1 Create EmailLayout Model

```python
# In models.py - Add new model

class EmailLayout(BaseModel):
    """
    Reusable email layout wrapper for communication templates.
    Provides consistent branding across all email communications.
    """

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique identifier for this layout (e.g., 'Standard', 'Premium Client')"
    )
    description = models.TextField(
        blank=True,
        help_text="Internal description of when to use this layout"
    )

    # Layout Components (Django template syntax supported)
    header_template = models.TextField(
        help_text="HTML for header section. Variables: {{ site_name }}, {{ header_title }}, {{ header_subtitle }}, {{ logo_url }}"
    )
    footer_template = models.TextField(
        help_text="HTML for footer section. Variables: {{ site_name }}, {{ current_year }}, {{ support_email }}, {{ unsubscribe_link }}"
    )
    wrapper_template = models.TextField(
        help_text="HTML wrapper for content area. MUST include {{ content }} placeholder.",
        default='<div class="content-wrapper">{{ content }}</div>'
    )

    # Base CSS styles applied to entire email
    base_styles = models.TextField(
        blank=True,
        help_text="CSS styles applied before content. Supports {{ primary_color }}, {{ secondary_color }} variables."
    )

    # Theme Configuration
    primary_color = models.CharField(
        max_length=7,
        default="#667eea",
        help_text="Primary brand color (hex format, e.g., #667eea)"
    )
    secondary_color = models.CharField(
        max_length=7,
        default="#764ba2",
        help_text="Secondary brand color for gradients (hex format)"
    )
    logo_url = models.URLField(
        blank=True,
        help_text="URL to company logo image"
    )

    # Status Flags
    is_default = models.BooleanField(
        default=False,
        help_text="If true, this layout is used when no layout is explicitly assigned"
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive layouts cannot be assigned to templates"
    )

    class Meta:
        verbose_name = 'Email Layout'
        verbose_name_plural = 'Email Layouts'
        ordering = ['name']

    def __str__(self):
        return f"{self.name} {'(Default)' if self.is_default else ''}"

    def clean(self):
        """Validate layout before saving."""
        super().clean()

        # Ensure wrapper_template contains {{ content }} placeholder
        if '{{ content }}' not in self.wrapper_template and '{{content}}' not in self.wrapper_template:
            raise ValidationError({
                'wrapper_template': 'Must contain {{ content }} placeholder for template content injection.'
            })

        # Validate color format
        import re
        hex_pattern = re.compile(r'^#[0-9A-Fa-f]{6}$')
        if not hex_pattern.match(self.primary_color):
            raise ValidationError({'primary_color': 'Must be valid hex color (e.g., #667eea)'})
        if not hex_pattern.match(self.secondary_color):
            raise ValidationError({'secondary_color': 'Must be valid hex color (e.g., #764ba2)'})

    def save(self, *args, **kwargs):
        # Ensure only one default layout
        if self.is_default:
            EmailLayout.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
        super().save(*args, **kwargs)

    @classmethod
    def get_default_layout(cls):
        """Get the default layout, or None if no default is set."""
        return cls.objects.filter(is_default=True, is_active=True).first()


class EmailLayoutHistory(BaseModel):
    """Audit trail for email layout changes."""

    REASON_CHOICES = [
        ('CREATE', 'Initial Creation'),
        ('UPDATE', 'Manual Update'),
        ('ROLLBACK', 'Rollback to Previous Version'),
    ]

    layout = models.ForeignKey(
        EmailLayout,
        on_delete=models.CASCADE,
        related_name='history'
    )
    version = models.PositiveIntegerField()

    # Snapshot of layout state
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    header_template = models.TextField()
    footer_template = models.TextField()
    wrapper_template = models.TextField()
    base_styles = models.TextField(blank=True)
    primary_color = models.CharField(max_length=7)
    secondary_color = models.CharField(max_length=7)
    logo_url = models.URLField(blank=True)

    reason = models.CharField(max_length=20, choices=REASON_CHOICES, default='UPDATE')
    notes = models.TextField(blank=True)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='layout_changes'
    )

    class Meta:
        verbose_name = 'Email Layout History'
        verbose_name_plural = 'Email Layout Histories'
        ordering = ['-created_at']
        unique_together = ['layout', 'version']

    @classmethod
    def create_snapshot(cls, layout, reason='UPDATE', changed_by=None, notes=''):
        """Create a history snapshot of the current layout state."""
        last_version = cls.objects.filter(layout=layout).aggregate(
            max_version=models.Max('version')
        )['max_version'] or 0

        return cls.objects.create(
            layout=layout,
            version=last_version + 1,
            name=layout.name,
            description=layout.description,
            header_template=layout.header_template,
            footer_template=layout.footer_template,
            wrapper_template=layout.wrapper_template,
            base_styles=layout.base_styles,
            primary_color=layout.primary_color,
            secondary_color=layout.secondary_color,
            logo_url=layout.logo_url,
            reason=reason,
            changed_by=changed_by,
            notes=notes
        )
```

#### 1.2 Modify CommunicationTemplate Model

```python
# In models.py - Add to existing CommunicationTemplate class

class CommunicationTemplate(BaseModel):
    # ... existing fields ...

    # NEW: Layout relationship
    layout = models.ForeignKey(
        'EmailLayout',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='templates',
        help_text="Email layout to wrap content. Leave empty for SMS or legacy full-HTML templates."
    )

    # ... rest of existing code ...
```

#### 1.3 Create Migration

```bash
python manage.py makemigrations communications --name add_email_layout
```

Migration should:
1. Create `EmailLayout` table
2. Create `EmailLayoutHistory` table
3. Add `layout_id` foreign key to `CommunicationTemplate`

#### 1.4 Create Default Layout Fixtures

```json
// fixtures/default_layouts.json
[
  {
    "model": "communications.emaillayout",
    "pk": 1,
    "fields": {
      "name": "Standard",
      "description": "Default layout for system communications, admin messages, and transactional emails.",
      "header_template": "<div style=\"background-color: {{ primary_color }}; color: white; padding: 24px; text-align: center;\">\n    <h1 style=\"margin: 0; font-size: 24px;\">{{ header_title|default:site_name }}</h1>\n    {% if header_subtitle %}<p style=\"margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;\">{{ header_subtitle }}</p>{% endif %}\n</div>",
      "footer_template": "<div style=\"padding: 24px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #e0e0e0;\">\n    <p style=\"margin: 5px 0; color: #666; font-size: 14px;\">{{ site_name }}</p>\n    <p style=\"margin: 5px 0; color: #999; font-size: 12px;\">© {{ current_year }} {{ site_name }}. All rights reserved.</p>\n    {% if unsubscribe_link %}<p style=\"margin: 15px 0 0 0;\"><a href=\"{{ unsubscribe_link }}\" style=\"color: #999; font-size: 11px;\">Unsubscribe</a></p>{% endif %}\n</div>",
      "wrapper_template": "<div style=\"padding: 32px; background-color: #f5f5f5;\">\n    <div style=\"background-color: white; padding: 24px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);\">\n        {{ content }}\n    </div>\n</div>",
      "base_styles": "",
      "primary_color": "#1976d2",
      "secondary_color": "#1565c0",
      "logo_url": "",
      "is_default": true,
      "is_active": true
    }
  },
  {
    "model": "communications.emaillayout",
    "pk": 2,
    "fields": {
      "name": "Premium Client",
      "description": "Elegant layout for client-facing communications: quotes, invoices, booking confirmations.",
      "header_template": "<div style=\"background: linear-gradient(135deg, {{ primary_color }} 0%, {{ secondary_color }} 100%); padding: 40px 30px; text-align: center;\">\n    <h1 style=\"color: white; margin: 0; font-size: 32px; font-weight: 300;\">{{ header_title|default:site_name }}</h1>\n    {% if header_subtitle %}<p style=\"color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;\">{{ header_subtitle }}</p>{% endif %}\n</div>",
      "footer_template": "<div style=\"background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;\">\n    <p style=\"color: #666; margin: 5px 0; font-size: 14px;\">{{ site_name }}</p>\n    <p style=\"color: #999; margin: 5px 0; font-size: 13px;\">Creating Memorable Moments</p>\n    <p style=\"color: #999; margin: 15px 0 5px 0; font-size: 12px;\">© {{ current_year }} {{ site_name }}. All rights reserved.</p>\n</div>",
      "wrapper_template": "<div style=\"padding: 40px 30px; background: white;\">\n    {{ content }}\n</div>",
      "base_styles": "",
      "primary_color": "#667eea",
      "secondary_color": "#764ba2",
      "logo_url": "",
      "is_default": false,
      "is_active": true
    }
  },
  {
    "model": "communications.emaillayout",
    "pk": 3,
    "fields": {
      "name": "Success",
      "description": "Green-themed layout for positive confirmations: payment receipts, booking confirmed, contract signed.",
      "header_template": "<div style=\"background: linear-gradient(135deg, {{ primary_color }} 0%, {{ secondary_color }} 100%); padding: 40px 30px; text-align: center;\">\n    <h1 style=\"color: white; margin: 0; font-size: 32px; font-weight: 300;\">{{ header_title|default:'Success!' }}</h1>\n    {% if header_subtitle %}<p style=\"color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;\">{{ header_subtitle }}</p>{% endif %}\n</div>",
      "footer_template": "<div style=\"background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;\">\n    <p style=\"color: #666; margin: 5px 0; font-size: 14px;\">{{ site_name }}</p>\n    <p style=\"color: #999; margin: 5px 0; font-size: 13px;\">Thank you for your business!</p>\n    <p style=\"color: #999; margin: 15px 0 5px 0; font-size: 12px;\">© {{ current_year }} {{ site_name }}. All rights reserved.</p>\n</div>",
      "wrapper_template": "<div style=\"padding: 40px 30px; background: white;\">\n    {{ content }}\n</div>",
      "base_styles": "",
      "primary_color": "#28a745",
      "secondary_color": "#20c997",
      "logo_url": "",
      "is_default": false,
      "is_active": true
    }
  },
  {
    "model": "communications.emaillayout",
    "pk": 4,
    "fields": {
      "name": "Urgent Action",
      "description": "Orange/red layout for time-sensitive communications: contract signing deadlines, overdue payments.",
      "header_template": "<div style=\"background: linear-gradient(135deg, {{ primary_color }} 0%, {{ secondary_color }} 100%); padding: 40px 30px; text-align: center;\">\n    <h1 style=\"color: white; margin: 0; font-size: 32px; font-weight: 300;\">{{ header_title|default:'Action Required' }}</h1>\n    {% if header_subtitle %}<p style=\"color: rgba(255,255,255,0.9); margin-top: 10px; font-size: 16px;\">{{ header_subtitle }}</p>{% endif %}\n</div>",
      "footer_template": "<div style=\"background: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;\">\n    <p style=\"color: #666; margin: 5px 0; font-size: 14px;\">{{ site_name }}</p>\n    <p style=\"color: #999; margin: 15px 0 5px 0; font-size: 12px;\">© {{ current_year }} {{ site_name }}. All rights reserved.</p>\n</div>",
      "wrapper_template": "<div style=\"padding: 40px 30px; background: white;\">\n    {{ content }}\n</div>",
      "base_styles": "",
      "primary_color": "#fd7e14",
      "secondary_color": "#dc3545",
      "logo_url": "",
      "is_default": false,
      "is_active": true
    }
  }
]
```

---

### Phase 2: Backend - Layout Composition Service

**Files to Create/Modify:**
- `backend/core/domains/communications/layout_service.py` (new)
- `backend/core/domains/communications/services.py` (modify)
- `backend/core/domains/communications/template_sandbox.py` (modify)

**Tasks:**

#### 2.1 Create Layout Composition Service

```python
# layout_service.py (NEW FILE)
"""
Service for composing email layouts with template content.
Handles the rendering and assembly of layout components around template content.
"""

import logging
from typing import Dict, Any, Optional
from django.conf import settings
from django.utils import timezone

from .models import EmailLayout, CommunicationTemplate
from .template_sandbox import sandboxed_template_engine, TemplateSandboxError

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

    # Base outer wrapper for all emails
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
        layout: EmailLayout,
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
        template: CommunicationTemplate,
        content_context: Dict[str, Any],
        layout: Optional[EmailLayout] = None,
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
        layout: EmailLayout,
        sample_content: str = '<p>This is sample content to preview the layout.</p>',
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
    def validate_layout_templates(cls, layout: EmailLayout) -> tuple[bool, list[str]]:
        """
        Validate all layout template components for syntax and security.

        Args:
            layout: The EmailLayout to validate

        Returns:
            Tuple of (is_valid, list of error messages)
        """
        from .template_sandbox import validate_template_for_save

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
```

#### 2.2 Modify services.py - Integrate Layout Composition

```python
# In services.py - Modify preview_template method (around line 131)

# Add import at top
from .layout_service import LayoutCompositionService

# Modify preview_template method
@staticmethod
def preview_template(template_id: int, context_data: Dict[str, Any] = None) -> Dict[str, str]:
    """Preview a template with context data - Enhanced with layout support"""
    template = CommunicationTemplateService.get_template_by_id(template_id)

    if context_data is None:
        context_data = {}

    try:
        # Handle subject rendering (unchanged)
        custom_subject = context_data.get('custom_subject')

        if custom_subject:
            try:
                subject = sandboxed_template_engine.render(
                    custom_subject, context_data, validate_first=True
                )
            except TemplateSandboxError:
                subject = custom_subject
        elif template.subject_template:
            subject = sandboxed_template_engine.render(
                template.subject_template, context_data, validate_first=True
            )
        else:
            subject = None

        # Handle body rendering WITH LAYOUT SUPPORT
        custom_body = context_data.get('custom_body')

        if custom_body and template.category == 'MANUAL':
            # Manual message with custom content - inject into template
            # ... (existing manual message handling logic) ...
            body = sandboxed_template_engine.render(
                combined_template, context_data, validate_first=True
            )

            # Apply layout if assigned (even for manual messages)
            if template.layout and template.channel == 'EMAIL':
                body = LayoutCompositionService.compose_email(
                    template=template,
                    content_context={**context_data, 'content': body},
                    subject=subject
                )
        else:
            # Standard template rendering
            if template.layout and template.channel == 'EMAIL':
                # Use layout composition
                body = LayoutCompositionService.compose_email(
                    template=template,
                    content_context=context_data,
                    subject=subject
                )
            else:
                # Legacy: render body_template directly (SMS or no layout)
                body = sandboxed_template_engine.render(
                    template.body_template, context_data, validate_first=True
                )

        return {
            'subject': subject,
            'body': body
        }
    except TemplateSandboxError as e:
        raise InvalidTemplateFormat(detail=f"Template security error: {str(e)}")
    except Exception as e:
        raise InvalidTemplateFormat(detail=f"Error rendering template: {str(e)}")
```

---

### Phase 3: Backend - API Layer (CRUD for Layouts)

**Files to Create/Modify:**
- `backend/core/domains/communications/serializers.py` (modify)
- `backend/core/domains/communications/views.py` (modify)
- `backend/core/domains/communications/urls.py` (modify)

**Tasks:**

#### 3.1 Create Layout Serializers

```python
# In serializers.py - Add new serializers

class EmailLayoutSerializer(serializers.ModelSerializer):
    """Serializer for email layouts"""

    template_count = serializers.SerializerMethodField()

    class Meta:
        model = EmailLayout
        fields = [
            'id', 'name', 'description',
            'header_template', 'footer_template', 'wrapper_template', 'base_styles',
            'primary_color', 'secondary_color', 'logo_url',
            'is_default', 'is_active',
            'template_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'template_count']

    def get_template_count(self, obj):
        """Get count of templates using this layout"""
        return obj.templates.count()

    def validate(self, data):
        """Validate layout templates"""
        from .layout_service import LayoutCompositionService

        # Build a temporary layout object for validation
        layout = EmailLayout(
            header_template=data.get('header_template', ''),
            footer_template=data.get('footer_template', ''),
            wrapper_template=data.get('wrapper_template', '<div>{{ content }}</div>'),
            base_styles=data.get('base_styles', ''),
            primary_color=data.get('primary_color', '#667eea'),
            secondary_color=data.get('secondary_color', '#764ba2'),
        )

        is_valid, errors = LayoutCompositionService.validate_layout_templates(layout)
        if not is_valid:
            raise serializers.ValidationError({'templates': errors})

        return data


class EmailLayoutHistorySerializer(serializers.ModelSerializer):
    """Serializer for layout history entries"""

    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EmailLayoutHistory
        fields = [
            'id', 'version', 'name', 'description',
            'header_template', 'footer_template', 'wrapper_template', 'base_styles',
            'primary_color', 'secondary_color', 'logo_url',
            'reason', 'notes', 'changed_by', 'changed_by_name',
            'created_at'
        ]

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return f"{obj.changed_by.first_name} {obj.changed_by.last_name}".strip() or obj.changed_by.email
        return None


class LayoutPreviewSerializer(serializers.Serializer):
    """Serializer for layout preview requests"""

    sample_content = serializers.CharField(
        required=False,
        default='<p style="color: #333;">This is sample content to preview your layout.</p>'
    )
    header_title = serializers.CharField(required=False, allow_blank=True)
    header_subtitle = serializers.CharField(required=False, allow_blank=True)
    context_data = serializers.JSONField(required=False, default=dict)


# Modify existing CommunicationTemplateSerializer
class CommunicationTemplateSerializer(serializers.ModelSerializer):
    """Serializer for communication templates"""

    # ... existing fields ...

    # NEW: Layout relationship
    layout = serializers.PrimaryKeyRelatedField(
        queryset=EmailLayout.objects.filter(is_active=True),
        required=False,
        allow_null=True,
        help_text="Email layout to wrap content"
    )
    layout_name = serializers.CharField(source='layout.name', read_only=True)

    class Meta:
        model = CommunicationTemplate
        fields = [
            'id', 'name', 'channel', 'category', 'context_type', 'context_type_display',
            'include_client_context', 'include_event_context',
            'subject_template', 'body_template', 'is_system',
            'layout', 'layout_name',  # NEW
            'created_at', 'updated_at'
        ]
        # ...
```

#### 3.2 Create Layout ViewSet

```python
# In views.py - Add new ViewSet

class EmailLayoutViewSet(viewsets.ModelViewSet):
    """ViewSet for email layouts - Admin only"""

    queryset = EmailLayout.objects.all().order_by('name')
    serializer_class = EmailLayoutSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    def perform_create(self, serializer):
        """Create layout with history"""
        layout = serializer.save()
        EmailLayoutHistory.create_snapshot(
            layout=layout,
            reason='CREATE',
            changed_by=self.request.user,
            notes='Initial creation'
        )

    def perform_update(self, serializer):
        """Update layout with history"""
        # Create snapshot of current state before update
        layout = self.get_object()
        EmailLayoutHistory.create_snapshot(
            layout=layout,
            reason='UPDATE',
            changed_by=self.request.user,
            notes=self.request.data.get('notes', '')
        )
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Prevent deletion if templates are using this layout"""
        layout = self.get_object()

        if layout.templates.exists():
            return Response(
                {
                    'error': f'Cannot delete layout "{layout.name}" - it is used by {layout.templates.count()} template(s)',
                    'template_count': layout.templates.count()
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def preview(self, request, pk=None):
        """Preview layout with sample content"""
        layout = self.get_object()
        serializer = LayoutPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        context = serializer.validated_data.get('context_data', {})
        context['header_title'] = serializer.validated_data.get('header_title', '')
        context['header_subtitle'] = serializer.validated_data.get('header_subtitle', '')

        from .layout_service import LayoutCompositionService

        try:
            preview_html = LayoutCompositionService.preview_layout(
                layout=layout,
                sample_content=serializer.validated_data.get('sample_content'),
                context=context
            )
            return Response({'html': preview_html})
        except Exception as e:
            return Response(
                {'error': f'Preview failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get version history for a layout"""
        layout = self.get_object()
        history = EmailLayoutHistory.objects.filter(layout=layout).order_by('-version')
        serializer = EmailLayoutHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def rollback(self, request, pk=None):
        """Rollback layout to a previous version"""
        layout = self.get_object()
        version = request.data.get('version')

        if not version:
            return Response(
                {'error': 'Version number is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            history_entry = EmailLayoutHistory.objects.get(layout=layout, version=version)
        except EmailLayoutHistory.DoesNotExist:
            return Response(
                {'error': f'Version {version} not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        with transaction.atomic():
            # Create snapshot before rollback
            EmailLayoutHistory.create_snapshot(
                layout=layout,
                reason='ROLLBACK',
                changed_by=request.user,
                notes=f'Rolled back to version {version}'
            )

            # Restore layout state
            layout.header_template = history_entry.header_template
            layout.footer_template = history_entry.footer_template
            layout.wrapper_template = history_entry.wrapper_template
            layout.base_styles = history_entry.base_styles
            layout.primary_color = history_entry.primary_color
            layout.secondary_color = history_entry.secondary_color
            layout.logo_url = history_entry.logo_url
            layout.save()

        return Response(self.get_serializer(layout).data)

    @action(detail=True, methods=['get'])
    def templates(self, request, pk=None):
        """List templates using this layout"""
        layout = self.get_object()
        templates = layout.templates.all()
        serializer = CommunicationTemplateSerializer(templates, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a layout"""
        layout = self.get_object()
        new_name = request.data.get('new_name')

        if not new_name:
            base_name = f"Copy of {layout.name}"
            new_name = base_name
            counter = 1
            while EmailLayout.objects.filter(name=new_name).exists():
                counter += 1
                new_name = f"{base_name} ({counter})"

        if EmailLayout.objects.filter(name=new_name).exists():
            return Response(
                {'error': f'Layout with name "{new_name}" already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            new_layout = EmailLayout.objects.create(
                name=new_name,
                description=layout.description,
                header_template=layout.header_template,
                footer_template=layout.footer_template,
                wrapper_template=layout.wrapper_template,
                base_styles=layout.base_styles,
                primary_color=layout.primary_color,
                secondary_color=layout.secondary_color,
                logo_url=layout.logo_url,
                is_default=False,
                is_active=True,
            )

            EmailLayoutHistory.create_snapshot(
                layout=new_layout,
                reason='CREATE',
                changed_by=request.user,
                notes=f'Duplicated from "{layout.name}"'
            )

        return Response(
            self.get_serializer(new_layout).data,
            status=status.HTTP_201_CREATED
        )
```

#### 3.3 Update URLs

```python
# In urls.py - Add layout routes

router.register(r'layouts', views.EmailLayoutViewSet)
```

---

### Phase 4: Frontend - Types & API

**Files to Create/Modify:**
- `frontend/admin-crm/src/types/communications.types.ts`
- `frontend/admin-crm/src/types/layouts.types.ts` (new)
- `frontend/admin-crm/src/apis/communications.api.ts`
- `frontend/admin-crm/src/apis/layouts.api.ts` (new)
- `frontend/admin-crm/src/hooks/useLayouts.ts` (new)

**Tasks:**

#### 4.1 Create Layout Types

```typescript
// frontend/admin-crm/src/types/layouts.types.ts

export interface EmailLayout {
  id: number;
  name: string;
  description: string;
  header_template: string;
  footer_template: string;
  wrapper_template: string;
  base_styles: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  is_default: boolean;
  is_active: boolean;
  template_count: number;
  created_at: string;
  updated_at: string;
}

export interface EmailLayoutHistory {
  id: number;
  version: number;
  name: string;
  description: string;
  header_template: string;
  footer_template: string;
  wrapper_template: string;
  base_styles: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
  reason: 'CREATE' | 'UPDATE' | 'ROLLBACK';
  notes: string;
  changed_by: number | null;
  changed_by_name: string | null;
  created_at: string;
}

export interface CreateLayoutData {
  name: string;
  description?: string;
  header_template: string;
  footer_template: string;
  wrapper_template: string;
  base_styles?: string;
  primary_color?: string;
  secondary_color?: string;
  logo_url?: string;
  is_default?: boolean;
  is_active?: boolean;
}

export type UpdateLayoutData = Partial<CreateLayoutData>;

export interface LayoutPreviewData {
  sample_content?: string;
  header_title?: string;
  header_subtitle?: string;
  context_data?: Record<string, unknown>;
}
```

#### 4.2 Update Communication Types

```typescript
// In communications.types.ts - Add layout field

export interface CommunicationTemplate {
  // ... existing fields ...
  layout: number | null;  // NEW
  layout_name?: string;   // NEW
}

export interface CreateTemplateData {
  // ... existing fields ...
  layout?: number | null;  // NEW
}
```

#### 4.3 Create Layout API

```typescript
// frontend/admin-crm/src/apis/layouts.api.ts

import api from '../utils/api';
import type {
  EmailLayout,
  EmailLayoutHistory,
  CreateLayoutData,
  UpdateLayoutData,
  LayoutPreviewData,
} from '../types/layouts.types';
import type { CommunicationTemplate } from '../types/communications.types';

export const layoutsApi = {
  // CRUD
  getLayouts: async (filters?: { is_active?: boolean }): Promise<EmailLayout[]> => {
    const params = new URLSearchParams();
    if (filters?.is_active !== undefined) {
      params.append('is_active', String(filters.is_active));
    }
    const response = await api.get(`/communications/layouts/?${params.toString()}`);
    const data = response.data as { results?: EmailLayout[] } | EmailLayout[];
    return (Array.isArray(data) ? data : data.results) || [];
  },

  getLayout: async (id: number): Promise<EmailLayout> => {
    const response = await api.get<EmailLayout>(`/communications/layouts/${id}/`);
    return response.data;
  },

  createLayout: async (data: CreateLayoutData): Promise<EmailLayout> => {
    const response = await api.post<EmailLayout>('/communications/layouts/', data);
    return response.data;
  },

  updateLayout: async (id: number, data: UpdateLayoutData): Promise<EmailLayout> => {
    const response = await api.patch<EmailLayout>(`/communications/layouts/${id}/`, data);
    return response.data;
  },

  deleteLayout: async (id: number): Promise<void> => {
    await api.delete(`/communications/layouts/${id}/`);
  },

  // Preview
  previewLayout: async (id: number, data: LayoutPreviewData): Promise<{ html: string }> => {
    const response = await api.post<{ html: string }>(`/communications/layouts/${id}/preview/`, data);
    return response.data;
  },

  // History
  getLayoutHistory: async (id: number): Promise<EmailLayoutHistory[]> => {
    const response = await api.get<EmailLayoutHistory[]>(`/communications/layouts/${id}/history/`);
    return response.data;
  },

  rollbackLayout: async (id: number, version: number): Promise<EmailLayout> => {
    const response = await api.post<EmailLayout>(`/communications/layouts/${id}/rollback/`, { version });
    return response.data;
  },

  // Utilities
  getLayoutTemplates: async (id: number): Promise<CommunicationTemplate[]> => {
    const response = await api.get<CommunicationTemplate[]>(`/communications/layouts/${id}/templates/`);
    return response.data;
  },

  duplicateLayout: async (id: number, newName?: string): Promise<EmailLayout> => {
    const response = await api.post<EmailLayout>(`/communications/layouts/${id}/duplicate/`, { new_name: newName });
    return response.data;
  },
};
```

#### 4.4 Create Layout Hook

```typescript
// frontend/admin-crm/src/hooks/useLayouts.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { layoutsApi } from '../apis/layouts.api';
import type { CreateLayoutData, UpdateLayoutData, LayoutPreviewData } from '../types/layouts.types';
import { useToast } from '../contexts/ToastContext';

const QUERY_KEY = 'email-layouts';

export const useLayouts = () => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();

  const useAllLayouts = (filters?: { is_active?: boolean }) => {
    return useQuery({
      queryKey: [QUERY_KEY, filters],
      queryFn: () => layoutsApi.getLayouts(filters),
    });
  };

  const useLayout = (id: number) => {
    return useQuery({
      queryKey: [QUERY_KEY, id],
      queryFn: () => layoutsApi.getLayout(id),
      enabled: !!id,
    });
  };

  const useCreateLayout = () => {
    return useMutation({
      mutationFn: (data: CreateLayoutData) => layoutsApi.createLayout(data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        showSuccess('Layout created successfully');
      },
      onError: (error: Error) => {
        showError(`Failed to create layout: ${error.message}`);
      },
    });
  };

  const useUpdateLayout = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: UpdateLayoutData }) =>
        layoutsApi.updateLayout(id, data),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        showSuccess('Layout updated successfully');
      },
      onError: (error: Error) => {
        showError(`Failed to update layout: ${error.message}`);
      },
    });
  };

  const useDeleteLayout = () => {
    return useMutation({
      mutationFn: (id: number) => layoutsApi.deleteLayout(id),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
        showSuccess('Layout deleted successfully');
      },
      onError: (error: Error) => {
        showError(`Failed to delete layout: ${error.message}`);
      },
    });
  };

  const useLayoutHistory = (id: number) => {
    return useQuery({
      queryKey: [QUERY_KEY, id, 'history'],
      queryFn: () => layoutsApi.getLayoutHistory(id),
      enabled: !!id,
    });
  };

  const useLayoutTemplates = (id: number) => {
    return useQuery({
      queryKey: [QUERY_KEY, id, 'templates'],
      queryFn: () => layoutsApi.getLayoutTemplates(id),
      enabled: !!id,
    });
  };

  return {
    useAllLayouts,
    useLayout,
    useCreateLayout,
    useUpdateLayout,
    useDeleteLayout,
    useLayoutHistory,
    useLayoutTemplates,
  };
};
```

---

### Phase 5: Frontend - UI Components

**Files to Create:**
- `frontend/admin-crm/src/pages/settings/layouts/EmailLayouts.tsx`
- `frontend/admin-crm/src/components/layouts/LayoutForm.tsx`
- `frontend/admin-crm/src/components/layouts/LayoutPreview.tsx`
- `frontend/admin-crm/src/components/layouts/ColorPicker.tsx`

**Tasks:**

#### 5.1 Email Layouts Settings Page

Create a new settings page at `/settings/layouts` with:
- List of all layouts with template count
- Create/Edit/Delete/Duplicate actions
- Live preview panel
- History viewer
- Color picker for primary/secondary colors

#### 5.2 Layout Form Component

Form with:
- Name, description fields
- Color pickers for primary/secondary colors
- Logo URL input
- Code editors for:
  - Header template (with variable hints)
  - Footer template (with variable hints)
  - Wrapper template (must contain `{{ content }}`)
  - Base styles (CSS)
- Live preview panel that updates on change
- Available variables documentation

#### 5.3 Modify Template Form

Update `TemplateForm.tsx` to:
- Add layout selector dropdown (filtered to active layouts)
- Show "None (use full HTML)" option
- When layout is selected, show simplified body editor
- When no layout, show full HTML editor

---

### Phase 6: Data Migration

**Files to Create:**
- `backend/core/domains/communications/management/commands/migrate_templates_to_layouts.py`

**Tasks:**

#### 6.1 Create Migration Command

```python
# Management command to migrate existing templates to use layouts

from django.core.management.base import BaseCommand
from core.domains.communications.models import CommunicationTemplate, EmailLayout

class Command(BaseCommand):
    help = 'Migrate existing templates to use the new layout system'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )
        parser.add_argument(
            '--extract-content',
            action='store_true',
            help='Extract content from full HTML templates (requires manual review)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']

        # Mapping of templates to layouts based on current styling
        layout_mapping = {
            # Standard layout (blue solid header)
            'Admin Invitation': 'Standard',
            'Welcome Email': 'Standard',
            'Admin Role Upgrade': 'Standard',
            'Password Reset': 'Standard',
            'Booking Confirmation': 'Standard',
            'Booking Reminder': 'Standard',
            'Manual Email Layout': 'Standard',
            'Professional Email Layout': 'Standard',
            'System Notification Email': 'Standard',
            'Notification Digest Email': 'Standard',

            # Premium Client layout (purple gradient)
            'Client Invitation': 'Premium Client',
            'Wedding Quote Email': 'Premium Client',
            'Wedding Booking Confirmed': 'Premium Client',
            'quote_sent_to_client': 'Premium Client',
            'Invoice Notification': 'Premium Client',
            'Payment Plan Confirmation': 'Premium Client',
            'Payment Reminder': 'Premium Client',

            # Success layout (green)
            'Wedding Invoice Email': 'Success',
            'Payment Receipt': 'Success',

            # Urgent layout (orange/red)
            'Wedding Contract for E-Signature': 'Urgent Action',
            'Payment Overdue Notice': 'Urgent Action',
        }

        for template_name, layout_name in layout_mapping.items():
            try:
                template = CommunicationTemplate.objects.get(name=template_name)
                layout = EmailLayout.objects.get(name=layout_name)

                if dry_run:
                    self.stdout.write(f"Would assign '{layout_name}' to '{template_name}'")
                else:
                    template.layout = layout
                    template.save(update_fields=['layout'])
                    self.stdout.write(self.style.SUCCESS(f"Assigned '{layout_name}' to '{template_name}'"))

            except CommunicationTemplate.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Template not found: {template_name}"))
            except EmailLayout.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Layout not found: {layout_name}"))
```

#### 6.2 Content Extraction Strategy

For each template:
1. Identify current layout pattern (header color/style)
2. Map to appropriate new layout
3. Extract only the **content** portion (between header and footer)
4. Update `body_template` to content-only
5. Assign layout foreign key

**Note:** This requires manual review as HTML structures vary. Consider:
- Running in dry-run mode first
- Creating backup of templates before migration
- Testing each migrated template with preview

---

### Phase 7: Testing Strategy

#### 7.1 Backend Tests

```python
# tests/test_layouts.py

class EmailLayoutModelTests(TestCase):
    """Test EmailLayout model"""

    def test_create_layout(self):
        """Test layout creation"""
        pass

    def test_wrapper_must_contain_content_placeholder(self):
        """Test validation rejects wrapper without {{ content }}"""
        pass

    def test_only_one_default_layout(self):
        """Test only one layout can be default"""
        pass

    def test_color_validation(self):
        """Test hex color format validation"""
        pass


class LayoutCompositionServiceTests(TestCase):
    """Test layout composition"""

    def test_compose_with_layout(self):
        """Test template rendered with layout wrapper"""
        pass

    def test_compose_without_layout(self):
        """Test template rendered directly when no layout"""
        pass

    def test_layout_context_variables(self):
        """Test layout variables are available"""
        pass

    def test_content_context_passed_through(self):
        """Test template context variables work in content"""
        pass


class LayoutAPITests(APITestCase):
    """Test layout API endpoints"""

    def test_crud_operations(self):
        pass

    def test_preview_endpoint(self):
        pass

    def test_history_tracking(self):
        pass

    def test_cannot_delete_layout_in_use(self):
        pass
```

#### 7.2 Frontend Tests

- Unit tests for layout hooks
- Component tests for LayoutForm
- Integration tests for layout management flow

---

### Phase 8: Documentation & Rollout

#### 8.1 Update CLAUDE.md

Add documentation about the layout system.

#### 8.2 Admin User Guide

Create guide explaining:
- What layouts are and why they exist
- How to create/edit layouts
- Available template variables
- How to assign layouts to templates
- Migration from legacy full-HTML templates

#### 8.3 Rollout Plan

1. **Stage 1:** Deploy backend changes (model, migration, API)
2. **Stage 2:** Deploy frontend layout management UI
3. **Stage 3:** Create and configure 4 default layouts
4. **Stage 4:** Run migration command on existing templates (with dry-run first)
5. **Stage 5:** Test all email communications thoroughly
6. **Stage 6:** Monitor for issues

---

## File Summary

### New Files to Create

| Path | Purpose |
|------|---------|
| `backend/.../communications/layout_service.py` | Layout composition logic |
| `backend/.../communications/fixtures/default_layouts.json` | Default layout data |
| `backend/.../communications/management/commands/migrate_templates_to_layouts.py` | Migration script |
| `frontend/.../types/layouts.types.ts` | TypeScript interfaces |
| `frontend/.../apis/layouts.api.ts` | API client |
| `frontend/.../hooks/useLayouts.ts` | React Query hooks |
| `frontend/.../pages/settings/layouts/EmailLayouts.tsx` | Settings page |
| `frontend/.../components/layouts/LayoutForm.tsx` | Editor form |
| `frontend/.../components/layouts/LayoutPreview.tsx` | Live preview |
| `frontend/.../components/layouts/ColorPicker.tsx` | Color input |

### Files to Modify

| Path | Changes |
|------|---------|
| `backend/.../communications/models.py` | Add EmailLayout, EmailLayoutHistory, modify CommunicationTemplate |
| `backend/.../communications/services.py` | Integrate LayoutCompositionService |
| `backend/.../communications/serializers.py` | Add layout serializers, update template serializer |
| `backend/.../communications/views.py` | Add EmailLayoutViewSet |
| `backend/.../communications/urls.py` | Register layout routes |
| `frontend/.../types/communications.types.ts` | Add layout field to template type |
| `frontend/.../apis/communications.api.ts` | Update for layout field |
| `frontend/.../components/communications/TemplateForm.tsx` | Add layout selector |
| `frontend/.../pages/settings/templates/CommunicationTemplates.tsx` | Show layout info |

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| Breaking existing templates | Backward compatible - templates without layout render as-is |
| Layout rendering errors | Comprehensive validation, fallback to direct render |
| Performance impact | Layout composition adds minimal overhead |
| Migration data loss | Dry-run mode, backup before migration |
| User confusion | Documentation, gradual rollout |

---

## Success Criteria

1. ✅ All 4 default layouts created and functional
2. ✅ Layout CRUD API fully operational
3. ✅ Templates can be assigned to layouts
4. ✅ Email preview shows layout + content composed
5. ✅ Existing templates work without modification (backward compatible)
6. ✅ Layout changes propagate to all assigned templates
7. ✅ Version history tracks all layout changes
8. ✅ Frontend UI for layout management complete
9. ✅ All tests passing
10. ✅ Documentation complete
