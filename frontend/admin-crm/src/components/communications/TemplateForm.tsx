// frontend/admin-crm/src/components/communications/TemplateForm.tsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  Checkbox,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import DOMPurify from 'dompurify';
import { useCommunications } from '../../hooks/useCommunications';
import { useLayouts } from '../../hooks/useLayouts';
import type { CommunicationTemplate, CreateTemplateData, UpdateTemplateData } from '../../types/communications.types';
import { TemplateContentEditor, TemplateVariableInserter } from '../shared';
import type { TemplateContentEditorHandle } from '../shared';
import type { TemplateStarter, ContextType, TemplateEditorMode } from '../../types/templates.types';
import { CONTEXT_TYPE_LABELS, CONTEXT_TYPE_DESCRIPTIONS } from '../../types/templates.types';
import {
  ModernPageHeader,
  ModernPageLayout
} from '../common';

interface TemplateFormProps {
  template?: CommunicationTemplate;
  onSave: () => void;
  onCancel: () => void;
}

export const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<CreateTemplateData>({
    name: '',
    channel: 'EMAIL',
    category: 'MANUAL',
    context_type: 'MANUAL' as ContextType,
    include_client_context: false,
    include_event_context: false,
    subject_template: '',
    body_template: '',
    layout: null,
  });

  const [editorMode, setEditorMode] = useState<TemplateEditorMode>('visual');
  const editorRef = useRef<TemplateContentEditorHandle>(null);

  const { useCreateTemplate, useUpdateTemplate, useVariableSchemas, usePreviewTemplate } = useCommunications();
  const { useAllLayouts } = useLayouts();
  const { data: layouts = [], isLoading: layoutsLoading } = useAllLayouts({ is_active: true });
  const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate();
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateTemplate();
  const { data: variableSchemas } = useVariableSchemas();
  const { mutate: previewTemplate, data: previewResult, isPending: isPreviewing } = usePreviewTemplate();

  const isEditing = !!template;
  const isLoading = isCreating || isUpdating;

  // Sample data for live preview - defined first so it can be used in effects
  const samplePreviewData = useMemo(() => ({
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    company: 'Example Corp',
    site_name: 'LifePlace',
    current_date: new Date().toLocaleDateString(),
    support_email: 'support@lifeplace.com',
    invitation_link: 'https://app.lifeplace.com/accept-invitation/123',
    invited_by: 'Jane Smith',
    expiry_date: 'December 31, 2024',
    event_name: 'Annual Gala',
    event_date: 'March 15, 2024',
    venue: 'Grand Ballroom',
    client_name: 'John Doe',
    phone: '(555) 123-4567',
  }), []);

  // Debounced preview using backend API
  const [debouncedBody, setDebouncedBody] = useState(formData.body_template);
  const [debouncedSubject, setDebouncedSubject] = useState(formData.subject_template);
  const [debouncedLayout, setDebouncedLayout] = useState(formData.layout);

  // Debounce the body, subject, and layout changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBody(formData.body_template);
      setDebouncedSubject(formData.subject_template);
      setDebouncedLayout(formData.layout);
    }, 800);
    return () => clearTimeout(timer);
  }, [formData.body_template, formData.subject_template, formData.layout]);

  // Trigger backend preview when debounced values change (only when editing)
  useEffect(() => {
    if (isEditing && template?.id && debouncedBody) {
      previewTemplate({
        id: template.id,
        data: {
          template_id: template.id,
          context_data: samplePreviewData,
          // Pass override parameters for live editing preview
          body_template: debouncedBody,
          subject_template: debouncedSubject || undefined,
          layout_id: debouncedLayout,
        },
      });
    }
  }, [isEditing, template?.id, debouncedBody, debouncedSubject, debouncedLayout, previewTemplate, samplePreviewData]);

  // Live preview - uses backend API result when editing, falls back to client-side for new templates
  const livePreview = useMemo(() => {
    // If we have a backend preview result (editing mode), use it
    if (isEditing && previewResult) {
      return {
        subject: previewResult.subject || '',
        body: previewResult.body || '',
      };
    }

    // Fallback: client-side substitution for new templates
    if (!formData.body_template) return { subject: '', body: '' };

    const substituteVariables = (text: string) => {
      let result = text;

      // Step 1: Remove variable pill spans entirely - match any span containing {{ variable }}
      result = result.replace(
        /<span[^>]*>\s*\{\{\s*(\w+)\s*\}\}\s*<\/span>/gi,
        (_, varName) => {
          const value = samplePreviewData[varName as keyof typeof samplePreviewData];
          return value !== undefined ? String(value) : `{{ ${varName} }}`;
        }
      );

      // Step 2: Substitute any remaining {{ variable }} patterns (plain text not in spans)
      result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, varName) => {
        const value = samplePreviewData[varName as keyof typeof samplePreviewData];
        return value !== undefined ? String(value) : match;
      });

      return result;
    };

    return {
      subject: substituteVariables(formData.subject_template || ''),
      body: substituteVariables(formData.body_template),
    };
  }, [isEditing, previewResult, formData.body_template, formData.subject_template, samplePreviewData]);

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        channel: template.channel,
        category: template.category,
        context_type: (template.context_type || 'MANUAL') as ContextType,
        include_client_context: template.include_client_context || false,
        include_event_context: template.include_event_context || false,
        subject_template: template.subject_template || '',
        body_template: template.body_template,
        layout: template.layout,
      });
    }
  }, [template]);

  const handleInputChange = (field: keyof CreateTemplateData, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && template) {
      updateTemplate(
        { id: template.id, data: formData as UpdateTemplateData },
        { onSuccess: onSave }
      );
    } else {
      createTemplate(formData, { onSuccess: onSave });
    }
  };

  const handleVariableInsert = (variable: string) => {
    if (editorRef.current) {
      editorRef.current.insertVariable(variable);
    }
  };

  // Template content data (used by loadTemplate)
  const templateContentData: Record<string, { subject: string; body: string }> = {
    welcome: {
      subject: 'Welcome to {{ site_name }}!',
      body: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #1976d2; color: white; padding: 24px; text-align: center;">
    <h1>Welcome to {{ site_name }}!</h1>
  </div>

  <div style="padding: 24px;">
    <h2>Hello {{ first_name }}!</h2>

    <p>Thank you for joining {{ site_name }}. We're excited to help you manage your events and create memorable experiences.</p>

    <p>If you have any questions, feel free to contact our support team.</p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="{{ login_link }}" style="background-color: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
        Get Started
      </a>
    </div>
  </div>
</div>`
    },
    reminder: {
      subject: 'Reminder: {{ event_name }}',
      body: `<p>Hello <strong>{{ first_name }}</strong>,</p>

<p>This is a friendly reminder about your upcoming event:</p>

<ul>
  <li><strong>Event:</strong> {{ event_name }}</li>
  <li><strong>Date:</strong> {{ event_date }}</li>
  <li><strong>Location:</strong> {{ venue }}</li>
</ul>

<p>We're looking forward to working with you!</p>

<p>Best regards,<br>
The {{ site_name }} Team</p>`
    },
    followup: {
      subject: 'Thank you for choosing {{ site_name }}',
      body: `<p>Dear <strong>{{ first_name }}</strong>,</p>

<p>Thank you for allowing us to be part of your special event. We hope everything went perfectly!</p>

<p>We'd love to hear about your experience. If you have a moment, please let us know how we did.</p>

<p>We look forward to working with you again in the future.</p>

<p>Best regards,<br>
The {{ site_name }} Team</p>`
    },
    // SMS templates
    sms_reminder: {
      subject: '',
      body: `Hi {{ first_name }}! Reminder: {{ event_name }} on {{ event_date }} at {{ venue }}. Looking forward to working with you! - {{ site_name }}`
    },
    sms_confirmation: {
      subject: '',
      body: `Hi {{ first_name }}! Your booking for {{ event_name }} is confirmed for {{ event_date }}. We'll be in touch soon! - {{ site_name }}`
    }
  };

  // Template starters for the TemplateVariableInserter component
  const getTemplateStarters = (): Record<string, TemplateStarter> => {
    if (formData.channel === 'SMS') {
      return {
        sms_reminder: {
          name: 'SMS Reminder',
          description: 'A short reminder message for upcoming events'
        },
        sms_confirmation: {
          name: 'SMS Confirmation',
          description: 'Confirm a booking or appointment'
        }
      };
    }

    return {
      welcome: {
        name: 'Welcome Email',
        description: 'Welcomes new users to the platform with a branded template'
      },
      reminder: {
        name: 'Event Reminder',
        description: 'Reminds clients about upcoming events with event details'
      },
      followup: {
        name: 'Follow-up Email',
        description: 'Thanks clients after an event and invites feedback'
      }
    };
  };

  const loadTemplate = (templateKey: string) => {
    const templateContent = templateContentData[templateKey];

    if (templateContent) {
      handleInputChange('subject_template', templateContent.subject);
      handleInputChange('body_template', templateContent.body);
    }
  };

  return (
    <ModernPageLayout>
      <ModernPageHeader
        title={isEditing ? 'Edit Template' : 'Create Template'}
        subtitle={isEditing ? 'Modify your communication template' : 'Create a new communication template'}
        size="medium"
      />

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={4}>
          {/* Basic Information */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Basic Information
            </Typography>

            <Stack spacing={2}>
              <TextField
                label="Template Name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                required
                fullWidth
                disabled={template?.is_system}
                helperText="A descriptive name for this template"
              />

              <Box display="flex" gap={2}>
                <FormControl fullWidth>
                  <InputLabel>Channel</InputLabel>
                  <Select
                    value={formData.channel}
                    label="Channel"
                    onChange={(e) => {
                      handleInputChange('channel', e.target.value);
                      setEditorMode('visual');
                    }}
                    disabled={template?.is_system}
                  >
                    <MenuItem value="EMAIL">Email</MenuItem>
                    <MenuItem value="SMS">SMS</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={formData.category}
                    label="Category"
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    disabled={template?.is_system}
                  >
                    <MenuItem value="MANUAL">Manual</MenuItem>
                    <MenuItem value="AUTO">Auto</MenuItem>
                    <MenuItem value="SYSTEM">System</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              {/* Context Type Selector */}
              <FormControl fullWidth>
                <InputLabel>
                  Context Type
                  <Tooltip title="Determines which variables are available and what data is required when sending">
                    <InfoIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle', color: 'text.secondary' }} />
                  </Tooltip>
                </InputLabel>
                <Select
                  value={formData.context_type}
                  label="Context Type"
                  onChange={(e) => handleInputChange('context_type', e.target.value)}
                  disabled={template?.is_system}
                >
                  {Object.entries(CONTEXT_TYPE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      <Box>
                        <Typography variant="body2">{label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {CONTEXT_TYPE_DESCRIPTIONS[value as ContextType]}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* MANUAL context type options */}
              {formData.context_type === 'MANUAL' && (
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Optional Context
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Include additional variables when a client or event is provided at send time.
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.include_client_context}
                          onChange={(e) => handleInputChange('include_client_context', e.target.checked)}
                        />
                      }
                      label="Include client details"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.include_event_context}
                          onChange={(e) => handleInputChange('include_event_context', e.target.checked)}
                        />
                      }
                      label="Include event details"
                    />
                  </Stack>
                </Paper>
              )}

              {/* Email Layout Selector - Only for EMAIL channel */}
              {formData.channel === 'EMAIL' && (
                <FormControl fullWidth>
                  <InputLabel>
                    Email Layout
                    <Tooltip title="Select a layout to wrap your email content with consistent branding (header, footer, styling)">
                      <InfoIcon sx={{ fontSize: 14, ml: 0.5, verticalAlign: 'middle', color: 'text.secondary' }} />
                    </Tooltip>
                  </InputLabel>
                  <Select
                    value={formData.layout ?? ''}
                    label="Email Layout"
                    onChange={(e) => handleInputChange('layout', String(e.target.value) === '' ? null : Number(e.target.value))}
                    disabled={layoutsLoading}
                  >
                    <MenuItem value="">
                      <em>No Layout (Raw HTML)</em>
                    </MenuItem>
                    {layouts.map((layout) => (
                      <MenuItem key={layout.id} value={layout.id}>
                        <Box>
                          <Typography variant="body2">
                            {layout.name}
                            {layout.is_default && (
                              <Typography component="span" variant="caption" sx={{ ml: 1, color: 'primary.main' }}>
                                (Default)
                              </Typography>
                            )}
                          </Typography>
                          {layout.description && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {layout.description}
                            </Typography>
                          )}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Stack>
          </Box>

          {/* Template Content */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Template Content
            </Typography>

            <Stack spacing={2}>
              {formData.channel === 'EMAIL' && (
                <TextField
                  label="Subject Template"
                  value={formData.subject_template}
                  onChange={(e) => handleInputChange('subject_template', e.target.value)}
                  required={formData.channel === 'EMAIL'}
                  fullWidth
                  placeholder="Use {{ variable_name }} for dynamic content"
                  helperText="The subject line of your email"
                />
              )}

              <TemplateContentEditor
                ref={editorRef}
                value={formData.body_template}
                onChange={(value) => handleInputChange('body_template', value)}
                mode={formData.channel === 'SMS' ? 'text' : editorMode}
                onModeChange={setEditorMode}
                showModeToggle={formData.channel === 'EMAIL'}
                availableModes={formData.channel === 'SMS' ? ['text'] : ['visual', 'html']}
                label={formData.channel === 'SMS' ? 'Message Content' : 'Email Body'}
                placeholder={
                  formData.channel === 'SMS'
                    ? 'Hi {{ first_name }}! Your message here...'
                    : 'Start typing your email content... Type {{ to insert variables.'
                }
                minHeight={formData.channel === 'SMS' ? 100 : 300}
                rows={formData.channel === 'SMS' ? 4 : 12}
                showCharacterCount={formData.channel === 'SMS'}
                maxCharacters={formData.channel === 'SMS' ? 160 : undefined}
                helperText={
                  formData.channel === 'SMS'
                    ? 'Keep SMS messages under 160 characters for best delivery'
                    : 'Type {{ to insert variables with autocomplete'
                }
                variableSchemas={variableSchemas}
                contextType={formData.context_type}
                hideAdvancedModes={true}
              />
            </Stack>
          </Box>

          {/* Variable Helper */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <TemplateVariableInserter
              variableSchemas={variableSchemas}
              contextType={formData.context_type}
              onVariableInsert={handleVariableInsert}
              onTemplateLoad={loadTemplate}
              templateStarters={getTemplateStarters()}
              showFormattingTips={formData.channel === 'EMAIL'}
            />
          </Box>

          {/* Live Preview - Auto-updates as you type */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography variant="h6">
                  Live Preview
                </Typography>
                {isPreviewing && <CircularProgress size={16} />}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {isEditing ? 'Server-rendered preview' : 'Using sample data'}
              </Typography>
            </Box>

            {formData.channel === 'EMAIL' && livePreview.subject && (
              <Box mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  Subject:
                </Typography>
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="body2">
                    {livePreview.subject}
                  </Typography>
                </Paper>
              </Box>
            )}

            <Typography variant="subtitle2" gutterBottom>
              {formData.channel === 'SMS' ? 'Message:' : 'Body:'}
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                bgcolor: 'background.default',
                minHeight: 100,
                maxHeight: '400px',
                overflow: 'auto',
              }}
            >
              {livePreview.body ? (
                formData.channel === 'EMAIL' ? (
                  // Render HTML exactly like Rendered Preview - no CSS overrides
                  <div
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(livePreview.body),
                    }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {livePreview.body}
                  </Typography>
                )
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  Start typing to see preview...
                </Typography>
              )}
            </Paper>

            {formData.channel === 'SMS' && livePreview.body && (
              <Alert severity={livePreview.body.length > 160 ? 'warning' : 'info'} sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Character count: {livePreview.body.length}/160
                  {livePreview.body.length > 160 && (
                    <span> - Will be sent as multiple SMS parts</span>
                  )}
                </Typography>
              </Alert>
            )}
          </Box>

          {/* Actions */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Box display="flex" gap={3} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={onCancel}
                disabled={isLoading}
                sx={{ borderRadius: 1, px: 4, py: 1.5, fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isLoading}
                sx={{ borderRadius: 1, px: 4, py: 1.5, fontWeight: 600 }}
              >
                {isLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  isEditing ? 'Update Template' : 'Create Template'
                )}
              </Button>
            </Box>
          </Box>
        </Stack>
      </Box>
    </ModernPageLayout>
  );
};