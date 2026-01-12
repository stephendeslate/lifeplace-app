# Questionnaire Domain Implementation Plan

This document outlines the implementation plan to address identified gaps in the questionnaires domain.

## Implementation Status

| Item | Status | Notes |
|------|--------|-------|
| 1.1 Field description/placeholder | ✅ DONE | Backend model, serializers, admin UI updated |
| 1.2 Centralized validation | ✅ DONE | FieldValidator class + validation_rules endpoint |
| 1.3 Guest count improvements | ✅ DONE | New 'guests' field type + sync_event_guest_count |
| 2.1 Conditional field logic | ✅ DONE | show_conditions field added to model |
| 2.2 Preview integration | ✅ DONE | QuestionnairePreviewDialog + Preview action in table |
| 2.3 Questionnaire duplication | ✅ DONE | duplicate endpoint + service method |
| 3.1 Response analytics | ✅ DONE | QuestionnaireAnalytics class + analytics endpoints |
| 4.1 Field-level file config | ✅ DONE | max_file_size_mb, allowed_file_types, max_files |

### Migration Applied
- `0006_add_field_enhancements.py` - Adds all new fields to QuestionnaireField

### Analytics Endpoints
- `GET /questionnaires/questionnaires/{id}/analytics/` - Full analytics for a questionnaire
- `GET /questionnaires/questionnaires/analytics_summary/` - Summary for all questionnaires
- `GET /questionnaires/questionnaires/{id}/response_trends/` - Daily response trends
- `GET /questionnaires/fields/{id}/value_distribution/` - Value distribution for a field

---

## Phase 1: Foundation Improvements (High Priority)

### 1.1 Add Field Description/Helper Text

**Problem:** Admins cannot provide clarifying instructions for questions.

**Changes:**

#### Backend
```python
# models.py - Add to QuestionnaireField
class QuestionnaireField(BaseModel):
    # ... existing fields ...
    description = models.TextField(
        blank=True,
        help_text="Optional description or helper text shown below the field"
    )
    placeholder = models.CharField(
        max_length=255,
        blank=True,
        help_text="Placeholder text shown inside the input"
    )
```

#### Migration
```bash
python manage.py makemigrations questionnaires --name add_field_description
python manage.py migrate
```

#### Serializers
- Add `description` and `placeholder` to all field serializers

#### Frontend (Admin)
- Add description TextField in FieldFormDialog
- Add placeholder TextField in FieldFormDialog

#### Frontend (Client)
- Render `helperText` prop with field.description
- Render `placeholder` prop on text inputs

**Files to modify:**
- `backend/core/domains/questionnaires/models.py`
- `backend/core/domains/questionnaires/serializers.py`
- `frontend/admin-crm/src/components/questionnaires/FieldFormDialog.tsx`
- `frontend/admin-crm/src/types/questionnaires.types.ts`
- `frontend/client-portal/src/components/booking/steps/QuestionnaireStep.tsx`

---

### 1.2 Centralize Validation Logic

**Problem:** Validation scattered across 4 locations with inconsistent rules.

**Changes:**

#### Backend - Create validation service
```python
# backend/core/domains/questionnaires/validation.py

from typing import Any, Dict, List, Optional, Tuple
import re

class FieldValidator:
    """Centralized validation for questionnaire fields"""

    VALIDATION_RULES = {
        'email': {
            'pattern': r'^[^\s@]+@[^\s@]+\.[^\s@]+$',
            'message': 'Please enter a valid email address'
        },
        'phone': {
            'pattern': r'^(\+63|0)?[9]\d{9}$',
            'message': 'Please enter a valid Philippine phone number'
        },
        'number': {
            'min': 0,
            'message': 'Please enter a valid number'
        }
    }

    @classmethod
    def validate_field(cls, field_type: str, value: Any, options: List[str] = None, required: bool = False) -> Tuple[bool, Optional[str]]:
        """Validate a field value. Returns (is_valid, error_message)"""

        # Required check
        if required and (value is None or str(value).strip() == ''):
            return False, 'This field is required'

        if value is None or str(value).strip() == '':
            return True, None  # Empty non-required field is valid

        value_str = str(value).strip()

        # Type-specific validation
        if field_type == 'email':
            if not re.match(cls.VALIDATION_RULES['email']['pattern'], value_str):
                return False, cls.VALIDATION_RULES['email']['message']

        elif field_type == 'phone':
            if not re.match(cls.VALIDATION_RULES['phone']['pattern'], value_str):
                return False, cls.VALIDATION_RULES['phone']['message']

        elif field_type == 'number':
            try:
                num = float(value_str)
                if num < cls.VALIDATION_RULES['number']['min']:
                    return False, 'Number must be positive'
            except ValueError:
                return False, cls.VALIDATION_RULES['number']['message']

        elif field_type == 'boolean':
            if value_str.lower() not in ['true', 'false', '1', '0', 'yes', 'no']:
                return False, 'Please select Yes or No'

        elif field_type == 'select' and options:
            if value_str not in options:
                return False, f'Please select a valid option'

        elif field_type == 'multi-select' and options:
            selected = [v.strip() for v in value_str.split(',')]
            invalid = [v for v in selected if v and v not in options]
            if invalid:
                return False, f'Invalid options: {", ".join(invalid)}'

        return True, None

    @classmethod
    def get_validation_rules_for_field(cls, field_type: str) -> Dict:
        """Get validation rules to expose to frontend"""
        return cls.VALIDATION_RULES.get(field_type, {})
```

#### Backend - Add validation endpoint
```python
# views.py - Add to QuestionnaireFieldViewSet
@action(detail=False, methods=['get'])
def validation_rules(self, request):
    """Get all validation rules for frontend"""
    from .validation import FieldValidator
    return Response({
        field_type: FieldValidator.get_validation_rules_for_field(field_type)
        for field_type in ['email', 'phone', 'number', 'boolean', 'select', 'multi-select']
    })
```

#### Frontend
- Fetch validation rules on app init
- Use centralized rules in both admin-crm and client-portal

**Files to modify:**
- `backend/core/domains/questionnaires/validation.py` (new)
- `backend/core/domains/questionnaires/views.py`
- `backend/core/domains/questionnaires/services.py` (use validator)
- `frontend/client-portal/src/apis/booking/questionnaire.api.ts`

---

### 1.3 Improve Guest Count Handling

**Problem:** `is_guest_count` flag is confusing and only works during booking completion.

**Recommended Approach:** Add a dedicated `guests` field type.

#### Backend Model Changes
```python
# models.py
class QuestionnaireField(BaseModel):
    FIELD_TYPES = [
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('time', 'Time'),
        ('boolean', 'Yes/No'),
        ('select', 'Select'),
        ('multi-select', 'Multi-Select'),
        ('email', 'Email'),
        ('phone', 'Phone'),
        ('file', 'File Upload'),
        ('guests', 'Guest Count'),  # NEW
    ]

    # Keep is_guest_count for backward compatibility but deprecate
    is_guest_count = models.BooleanField(
        default=False,
        help_text="DEPRECATED: Use 'guests' field type instead"
    )

    # For guests type: define categories in options
    # options = ["Adults", "Children (5-12)", "Infants (0-4)"]
    # Response format: {"Adults": 50, "Children (5-12)": 10}
```

#### Response Handling
```python
# In QuestionnaireResponseService
@staticmethod
def update_event_guest_count(event_id: int):
    """Recalculate guest count from questionnaire responses"""
    from core.domains.events.models import Event

    responses = QuestionnaireResponse.objects.filter(
        event_id=event_id,
        field__type='guests'
    ).select_related('field')

    total_guests = 0
    guest_breakdown = {}

    for response in responses:
        try:
            # Parse JSON response for guests type
            import json
            breakdown = json.loads(response.value)
            for category, count in breakdown.items():
                guest_breakdown[category] = guest_breakdown.get(category, 0) + int(count)
                total_guests += int(count)
        except (json.JSONDecodeError, ValueError):
            # Fallback for legacy is_guest_count fields
            if response.field.is_guest_count:
                total_guests += int(response.value)

    # Update event
    event = Event.objects.get(id=event_id)
    event.num_participants = total_guests
    event.guest_breakdown = guest_breakdown  # Add this JSONField to Event
    event.save(update_fields=['num_participants', 'guest_breakdown'])
```

#### Trigger on Response Save
```python
# In save_event_responses
def save_event_responses(event_id, responses_data):
    # ... existing code ...

    # After saving responses, update guest count
    QuestionnaireResponseService.update_event_guest_count(event_id)
```

**Files to modify:**
- `backend/core/domains/questionnaires/models.py`
- `backend/core/domains/questionnaires/services.py`
- `backend/core/domains/events/models.py` (add guest_breakdown field)
- `frontend/admin-crm/src/components/questionnaires/FieldFormDialog.tsx`
- `frontend/client-portal/src/components/booking/steps/QuestionnaireStep.tsx`

---

## Phase 2: UX Improvements (Medium Priority)

### 2.1 Add Conditional Field Logic

**Problem:** All fields always display; can't show/hide based on other answers.

#### Backend Model Changes
```python
# models.py - Add to QuestionnaireField
class QuestionnaireField(BaseModel):
    # ... existing fields ...

    show_conditions = models.JSONField(
        default=dict,
        blank=True,
        help_text="Conditions for when to show this field. Format: {'field_id': 'expected_value'}"
    )

    # Example: {"5": "yes"} means show this field only if field ID 5 has value "yes"
```

#### Frontend Logic
```typescript
// QuestionnaireStep.tsx
const shouldShowField = (field: QuestionnaireField, responses: Record<string, any>): boolean => {
  if (!field.show_conditions || Object.keys(field.show_conditions).length === 0) {
    return true;
  }

  return Object.entries(field.show_conditions).every(([fieldId, expectedValue]) => {
    const actualValue = responses[`field_${fieldId}`];
    return String(actualValue).toLowerCase() === String(expectedValue).toLowerCase();
  });
};
```

#### Admin UI
- Add "Show Conditions" section in FieldFormDialog
- Dropdown to select dependent field
- Input for expected value
- Support multiple conditions with AND logic

**Files to modify:**
- `backend/core/domains/questionnaires/models.py`
- `backend/core/domains/questionnaires/serializers.py`
- `frontend/admin-crm/src/components/questionnaires/FieldFormDialog.tsx`
- `frontend/admin-crm/src/types/questionnaires.types.ts`
- `frontend/client-portal/src/components/booking/steps/QuestionnaireStep.tsx`

---

### 2.2 Integrate Preview into Admin Flow

**Problem:** QuestionnairePreview component exists but isn't used.

#### Changes
- Add Preview tab to QuestionnaireFormDialog
- Show real-time preview as admin adds/edits fields
- Add "Preview" button to QuestionnairesTable row actions

**Files to modify:**
- `frontend/admin-crm/src/components/questionnaires/QuestionnaireFormDialog.tsx`
- `frontend/admin-crm/src/components/questionnaires/QuestionnairesTable.tsx`

---

### 2.3 Add Questionnaire Duplication

**Problem:** Admins must manually recreate similar questionnaires.

#### Backend
```python
# services.py - Add to QuestionnaireService
@staticmethod
def duplicate_questionnaire(questionnaire_id: int, new_name: str = None) -> Questionnaire:
    """Duplicate a questionnaire with all its fields"""
    original = QuestionnaireService.get_questionnaire_by_id(questionnaire_id)

    with transaction.atomic():
        # Create new questionnaire
        new_questionnaire = Questionnaire.objects.create(
            name=new_name or f"{original.name} (Copy)",
            event_type=original.event_type,
            is_active=False,  # Start as inactive
            order=original.order + 1
        )

        # Copy all fields
        for field in original.fields.all():
            QuestionnaireField.objects.create(
                questionnaire=new_questionnaire,
                name=field.name,
                type=field.type,
                description=field.description,  # New field
                placeholder=field.placeholder,  # New field
                required=field.required,
                order=field.order,
                options=field.options,
                is_guest_count=field.is_guest_count,
                show_conditions=field.show_conditions  # New field
            )

        return new_questionnaire
```

#### Views
```python
# views.py - Add to QuestionnaireViewSet
@action(detail=True, methods=['post'])
def duplicate(self, request, pk=None):
    """Duplicate a questionnaire"""
    new_name = request.data.get('name')

    with transaction.atomic():
        new_questionnaire = QuestionnaireService.duplicate_questionnaire(pk, new_name)

    return Response(
        QuestionnaireDetailSerializer(new_questionnaire).data,
        status=status.HTTP_201_CREATED
    )
```

#### Frontend
- Enable `duplicate: true` in QuestionnairesTable config
- Add duplication API call in useQuestionnaires hook

**Files to modify:**
- `backend/core/domains/questionnaires/services.py`
- `backend/core/domains/questionnaires/views.py`
- `frontend/admin-crm/src/components/questionnaires/QuestionnairesTable.tsx`
- `frontend/admin-crm/src/hooks/useQuestionnaires.ts`
- `frontend/admin-crm/src/apis/questionnaires.api.ts`

---

## Phase 3: Data Quality & Analytics (Lower Priority)

### 3.1 Add Response Analytics

**Problem:** No visibility into questionnaire completion rates or patterns.

#### Backend
```python
# analytics.py (new file)
from django.db.models import Count, Q
from typing import Dict

class QuestionnaireAnalytics:

    @staticmethod
    def get_questionnaire_stats(questionnaire_id: int) -> Dict:
        """Get usage statistics for a questionnaire"""
        from .models import Questionnaire, QuestionnaireResponse
        from core.domains.events.models import Event

        questionnaire = Questionnaire.objects.get(id=questionnaire_id)
        field_ids = list(questionnaire.fields.values_list('id', flat=True))

        # Events with any response to this questionnaire
        events_with_responses = QuestionnaireResponse.objects.filter(
            field_id__in=field_ids
        ).values('event_id').distinct().count()

        # Required fields
        required_field_count = questionnaire.fields.filter(required=True).count()

        # Completion rate calculation
        # An event is "complete" if all required fields have responses
        complete_count = 0
        incomplete_count = 0

        events = Event.objects.filter(
            questionnaire_responses__field_id__in=field_ids
        ).distinct()

        required_field_ids = set(questionnaire.fields.filter(required=True).values_list('id', flat=True))

        for event in events:
            responded_field_ids = set(event.questionnaire_responses.filter(
                field_id__in=field_ids
            ).values_list('field_id', flat=True))

            if required_field_ids.issubset(responded_field_ids):
                complete_count += 1
            else:
                incomplete_count += 1

        return {
            'questionnaire_id': questionnaire_id,
            'questionnaire_name': questionnaire.name,
            'total_fields': questionnaire.fields.count(),
            'required_fields': required_field_count,
            'events_with_responses': events_with_responses,
            'complete_responses': complete_count,
            'incomplete_responses': incomplete_count,
            'completion_rate': round(complete_count / max(events_with_responses, 1) * 100, 1)
        }
```

#### Views
```python
# views.py - Add to QuestionnaireViewSet
@action(detail=True, methods=['get'])
def analytics(self, request, pk=None):
    """Get analytics for a questionnaire"""
    from .analytics import QuestionnaireAnalytics
    stats = QuestionnaireAnalytics.get_questionnaire_stats(pk)
    return Response(stats)
```

#### Frontend
- Add Analytics tab/section to questionnaire details
- Show completion rate, response count charts

**Files to create/modify:**
- `backend/core/domains/questionnaires/analytics.py` (new)
- `backend/core/domains/questionnaires/views.py`
- `frontend/admin-crm/src/pages/settings/templates/QuestionnaireTemplates.tsx`

---

### 3.2 Add Template Versioning (Future)

**Problem:** Editing templates affects historical data.

This is a significant architectural change. Recommended approach:

1. Add `version` field to Questionnaire
2. Create QuestionnaireVersion model to track changes
3. Link responses to specific version
4. Show version history in admin

**Scope:** This should be a separate project due to complexity.

---

## Phase 4: File Upload Improvements (Lower Priority)

### 4.1 Field-Level File Configuration

**Problem:** File upload settings are per-step, not per-field.

#### Backend
```python
# models.py - Add to QuestionnaireField
class QuestionnaireField(BaseModel):
    # For file type fields only
    max_file_size_mb = models.PositiveIntegerField(
        default=10,
        help_text="Maximum file size in MB (for file fields only)"
    )
    allowed_file_types = models.JSONField(
        default=list,
        blank=True,
        help_text="Allowed file extensions e.g., ['pdf', 'jpg']"
    )
    max_files = models.PositiveIntegerField(
        default=1,
        help_text="Maximum number of files allowed"
    )
```

**Files to modify:**
- `backend/core/domains/questionnaires/models.py`
- `backend/core/domains/questionnaires/serializers.py`
- `frontend/admin-crm/src/components/questionnaires/FieldFormDialog.tsx`
- `frontend/client-portal/src/components/booking/steps/QuestionnaireStep.tsx`

---

## Implementation Order

| Phase | Item | Priority | Effort | Dependencies |
|-------|------|----------|--------|--------------|
| 1.1 | Field description/placeholder | High | Low | None |
| 1.2 | Centralized validation | High | Medium | None |
| 1.3 | Guest count improvements | High | Medium | 1.1 |
| 2.1 | Conditional field logic | Medium | Medium | 1.1 |
| 2.2 | Preview integration | Medium | Low | None |
| 2.3 | Questionnaire duplication | Medium | Low | None |
| 3.1 | Response analytics | Low | Medium | None |
| 3.2 | Template versioning | Low | High | Separate project |
| 4.1 | Field-level file config | Low | Medium | None |

---

## Migration Strategy

1. **Backward Compatibility:**
   - Keep `is_guest_count` but deprecate
   - New `guests` field type handles new questionnaires
   - Migration script to convert existing is_guest_count fields

2. **Database Migrations:**
   - All new fields have defaults or allow null
   - No breaking changes to existing data

3. **Frontend Rollout:**
   - Feature flags for new UI elements
   - Gradual enablement per client

---

## Testing Requirements

- Unit tests for FieldValidator
- Unit tests for QuestionnaireAnalytics
- Integration tests for guest count sync
- E2E tests for conditional field display
- E2E tests for questionnaire duplication

---

## Questions for Stakeholder

1. Should multiple `guests` type fields be allowed per questionnaire, or enforce single?
2. For conditional logic, should we support OR conditions or only AND?
3. Should analytics be real-time or cached/scheduled?
4. For file uploads, should we store files in the response or just URLs?
