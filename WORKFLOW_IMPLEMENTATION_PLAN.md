# Workflow Domain Implementation Plan

## Status: COMPLETED

All phases have been successfully implemented and verified.

## Executive Summary

After thorough code analysis, I've verified the following gaps in the workflows system. This plan addresses them in priority order with specific implementation steps.

---

## Verified Gaps

### Gap 1: Stage Reordering UI (Not Connected)
**Status**: Component exists, not wired up
**Evidence**: `WorkflowTemplateDetails.tsx:591` has `onReorder={() => {}} // TODO: Implement reordering`
**Impact**: Users cannot reorder stages via UI

### Gap 2: Trigger-On Flags (Not Exposed)
**Status**: Exists in backend model, not in serializer/API/UI
**Evidence**: `models.py:70-90` defines 5 trigger flags; `basic_serializers.py:40-44` doesn't include them
**Impact**: Key StudioNinja-like feature is inaccessible

### Gap 3: Contract Template Field Mismatch (BUG)
**Status**: Frontend sends field that doesn't exist in backend
**Evidence**:
- Frontend sends `contract_template` (`WorkflowStageFormDialog.tsx:54`)
- Backend expects `metadata.contract_template_id` (`models.py:225`)
- Model has NO `contract_template` FK field
**Impact**: Contract automation configuration is BROKEN

### Gap 4: Metadata Configuration UI (Not Exposed)
**Status**: Metadata passed through but not configurable
**Evidence**: Backend uses metadata fields but UI has no inputs for them
**Impact**: Task priority, reminder settings, quote templates not configurable

### Gap 5: Quote/Reminder Automation Config (Missing UI)
**Status**: Automation types have no configuration options
**Evidence**: QUOTE uses `metadata.quote_template_id`, REMINDER uses `metadata.reminder_type`/`days_until_due`
**Impact**: Users enable these but can't configure them

---

## Implementation Plan

### Phase 1: Fix Critical Bug (Contract Template)

**Files to modify:**

#### 1.1 Backend: Add contract_template FK to model
```
File: backend/core/domains/workflows/models.py
```
- Add `contract_template` ForeignKey field (like `email_template`)
- Update `_execute_automation()` to use FK with fallback to metadata

#### 1.2 Backend: Update serializer
```
File: backend/core/domains/workflows/basic_serializers.py
```
- Add `contract_template` to fields list
- Add `contract_template_name` read-only field in detail serializer

#### 1.3 Backend: Create migration
```bash
python manage.py makemigrations workflows
python manage.py migrate
```

#### 1.4 Frontend: Already has correct types/form - no changes needed

---

### Phase 2: Expose Trigger-On Flags

**Files to modify:**

#### 2.1 Backend Serializer
```
File: backend/core/domains/workflows/basic_serializers.py
```
Add to `WorkflowStageSerializer.Meta.fields`:
```python
'trigger_on_payment_received',
'trigger_on_quote_accepted',
'trigger_on_contract_signed',
'trigger_on_event_created',
'trigger_on_quote_sent',
```

#### 2.2 Frontend Types
```
File: frontend/admin-crm/src/types/workflows.types.ts
```
Add to `WorkflowStage` interface:
```typescript
trigger_on_payment_received: boolean;
trigger_on_quote_accepted: boolean;
trigger_on_contract_signed: boolean;
trigger_on_event_created: boolean;
trigger_on_quote_sent: boolean;
```

Add to `CreateWorkflowStageData`:
```typescript
trigger_on_payment_received?: boolean;
trigger_on_quote_accepted?: boolean;
trigger_on_contract_signed?: boolean;
trigger_on_event_created?: boolean;
trigger_on_quote_sent?: boolean;
```

#### 2.3 Frontend Form
```
File: frontend/admin-crm/src/components/workflows/WorkflowStageFormDialog.tsx
```
Add new "Event Triggers" accordion section with checkboxes:
- "Execute when payment is received"
- "Execute when quote is accepted"
- "Execute when contract is signed"
- "Execute when event is created"
- "Execute when quote is sent"

Include helper text: "These triggers execute the automation without advancing the workflow stage"

---

### Phase 3: Wire Up Stage Reordering

**Files to modify:**

#### 3.1 Import and state
```
File: frontend/admin-crm/src/pages/settings/templates/WorkflowTemplateDetails.tsx
```
Add import:
```typescript
import { WorkflowStageReorderDialog } from '../../../components/workflows/WorkflowStageReorderDialog';
```

Add state:
```typescript
const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
```

#### 3.2 Add reorder button and dialog
In the Stages tab header, add "Reorder" button next to "Add Stage"

Add dialog component before closing `</ModernSettingsLayout>`:
```tsx
<WorkflowStageReorderDialog
  open={reorderDialogOpen}
  onClose={() => setReorderDialogOpen(false)}
  templateId={templateId}
  stages={stages}
  onReorderComplete={() => {
    refetchStages();
    refetchTemplate();
  }}
/>
```

#### 3.3 Update table callback
Change line 591:
```typescript
onReorder={() => setReorderDialogOpen(true)}
```

---

### Phase 4: Add Metadata Configuration UI

**Files to modify:**

#### 4.1 Frontend Form - Add conditional fields
```
File: frontend/admin-crm/src/components/workflows/WorkflowStageFormDialog.tsx
```

After the automation type/trigger time selectors, add conditional sections:

**For TASK automation:**
```tsx
{formData.automation_type === 'TASK' && (
  <FormControl fullWidth>
    <InputLabel>Task Priority</InputLabel>
    <Select
      value={formData.metadata?.task_priority || 'MEDIUM'}
      onChange={(e) => handleMetadataChange('task_priority', e.target.value)}
    >
      <MenuItem value="LOW">Low</MenuItem>
      <MenuItem value="MEDIUM">Medium</MenuItem>
      <MenuItem value="HIGH">High</MenuItem>
      <MenuItem value="URGENT">Urgent</MenuItem>
    </Select>
  </FormControl>
)}
```

**For QUOTE automation:**
```tsx
{formData.automation_type === 'QUOTE' && (
  <FormControl fullWidth>
    <InputLabel>Quote Template (Optional)</InputLabel>
    <Select
      value={formData.metadata?.quote_template_id || ''}
      onChange={(e) => handleMetadataChange('quote_template_id', e.target.value)}
    >
      <MenuItem value="">Use Default (by Event Type)</MenuItem>
      {quoteTemplates.map(t => (
        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
      ))}
    </Select>
  </FormControl>
)}
```

**For REMINDER automation:**
```tsx
{formData.automation_type === 'REMINDER' && (
  <>
    <TextField
      type="number"
      label="Days Until Due"
      value={formData.metadata?.days_until_due || 7}
      onChange={(e) => handleMetadataChange('days_until_due', parseInt(e.target.value))}
      helperText="Number of days until the reminder is due"
    />
    <FormControl fullWidth>
      <InputLabel>Reminder Type</InputLabel>
      <Select
        value={formData.metadata?.reminder_type || 'WORKFLOW_REMINDER'}
        onChange={(e) => handleMetadataChange('reminder_type', e.target.value)}
      >
        <MenuItem value="WORKFLOW_REMINDER">General Reminder</MenuItem>
        <MenuItem value="PAYMENT_REMINDER">Payment Reminder</MenuItem>
        <MenuItem value="EVENT_REMINDER">Event Reminder</MenuItem>
      </Select>
    </FormControl>
  </>
)}
```

**For CONTRACT automation:**
```tsx
{formData.automation_type === 'CONTRACT' && (
  <TextField
    type="number"
    label="Signature Deadline (Hours)"
    value={formData.metadata?.signature_deadline_hours || 48}
    onChange={(e) => handleMetadataChange('signature_deadline_hours', parseInt(e.target.value))}
    helperText="Hours until contract signature expires"
  />
)}
```

#### 4.2 Add metadata handler
```typescript
const handleMetadataChange = (key: string, value: unknown) => {
  setFormData(prev => ({
    ...prev,
    metadata: {
      ...prev.metadata,
      [key]: value,
    },
  }));
};
```

#### 4.3 Add quote templates hook
```typescript
import { useQuoteTemplates } from '../../hooks/useSales';
// ...
const { data: quoteTemplates = [] } = useQuoteTemplates();
```

---

### Phase 5: Update WorkflowTemplateDetails Stage Update Handler

**File**: `frontend/admin-crm/src/pages/settings/templates/WorkflowTemplateDetails.tsx`

The `handleStageSubmit` function (lines 196-239) doesn't include all fields. Update to include:
- `email_template`
- `contract_template`
- `metadata`
- Trigger-on flags (after Phase 2)

---

## Testing Checklist

### Phase 1 (Contract Template Bug)
- [ ] Create stage with CONTRACT automation and template selection
- [ ] Verify contract is generated when stage executes
- [ ] Verify existing stages still work (backward compatibility)

### Phase 2 (Trigger-On Flags)
- [ ] Create stage with `trigger_on_payment_received` enabled
- [ ] Process payment and verify automation executes without stage advancement
- [ ] Verify flags are saved/loaded correctly on edit

### Phase 3 (Stage Reordering)
- [ ] Open reorder dialog from Stages tab
- [ ] Drag stages to new positions
- [ ] Verify order persists after save
- [ ] Verify order is respected in workflow execution

### Phase 4 (Metadata Config)
- [ ] Configure TASK with priority, verify EventTask has correct priority
- [ ] Configure REMINDER with days_until_due, verify notification context
- [ ] Configure QUOTE with template override, verify correct template used
- [ ] Configure CONTRACT with signature_deadline_hours, verify contract valid_until

---

## File Change Summary

| File | Phase | Change Type |
|------|-------|-------------|
| `backend/core/domains/workflows/models.py` | 1 | Add contract_template FK |
| `backend/core/domains/workflows/basic_serializers.py` | 1, 2 | Add fields to serializer |
| `frontend/admin-crm/src/types/workflows.types.ts` | 2 | Add trigger flag types |
| `frontend/admin-crm/src/components/workflows/WorkflowStageFormDialog.tsx` | 2, 4 | Add form fields |
| `frontend/admin-crm/src/pages/settings/templates/WorkflowTemplateDetails.tsx` | 3, 5 | Wire reorder, update handler |

---

## Estimated Scope

- **Phase 1**: 1 migration + 2 file edits
- **Phase 2**: 3 files modified (serializer, types, form)
- **Phase 3**: 1 file modified (add imports, state, dialog)
- **Phase 4**: 1 file modified (add conditional form sections)
- **Phase 5**: 1 file modified (update handler)

**Total**: ~6 files modified, 1 migration
