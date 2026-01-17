// frontend/admin-crm/src/components/communications/TemplateForm.tsx

import React, { useState, useEffect, useRef } from 'react';
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
  Preview as PreviewIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import { sanitizeHTML } from '../../utils/security';
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
  });

  const [editorMode, setEditorMode] = useState<TemplateEditorMode>('visual');
  const editorRef = useRef<TemplateContentEditorHandle>(null);

  const { useCreateTemplate, useUpdateTemplate, useVariableSchemas, usePreviewTemplate } = useCommunications();
  const { mutate: createTemplate, isPending: isCreating } = useCreateTemplate();
  const { mutate: updateTemplate, isPending: isUpdating } = useUpdateTemplate();
  const { mutate: previewTemplate, isPending: isPreviewing, data: previewData } = usePreviewTemplate();
  const { data: variableSchemas } = useVariableSchemas();

  const isEditing = !!template;
  const isLoading = isCreating || isUpdating;

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

  const handlePreview = () => {
    if (!formData.name) return;
    
    // Create sample context data
    const sampleData = {
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
      venue: 'Grand Ballroom'
    };

    previewTemplate({
      id: template?.id || 0,
      data: { 
        template_id: template?.id || 0,
        context_data: sampleData 
      }
    });
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
            </Stack>
          </Box>

          {/* Template Content */}
          <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Template Content
              </Typography>
              <Button
                variant="outlined"
                startIcon={<PreviewIcon />}
                onClick={handlePreview}
                disabled={!formData.body_template || isPreviewing}
                sx={{
                  borderRadius: 1,
                  px: 3,
                  fontWeight: 600,
                }}
              >
                {isPreviewing ? <CircularProgress size={20} color="primary" /> : 'Preview'}
              </Button>
            </Box>

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
                    : 'Start typing your email content... Use variables for dynamic content.'
                }
                minHeight={formData.channel === 'SMS' ? 100 : 300}
                rows={formData.channel === 'SMS' ? 4 : 12}
                showCharacterCount={formData.channel === 'SMS'}
                maxCharacters={formData.channel === 'SMS' ? 160 : undefined}
                helperText={
                  formData.channel === 'SMS'
                    ? 'Keep SMS messages under 160 characters for best delivery'
                    : undefined
                }
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

          {/* Preview */}
          {previewData && (
            <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Preview
              </Typography>

              {previewData.subject && (
                <Box mb={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Subject:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2" fontFamily="monospace">
                      {previewData.subject}
                    </Typography>
                  </Paper>
                </Box>
              )}

              <Typography variant="subtitle2" gutterBottom>
                {formData.channel === 'SMS' ? 'Message:' : 'Body:'}
              </Typography>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                {formData.channel === 'EMAIL' ? (
                  <Box
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(previewData.body, 'template') }}
                    sx={{
                      '& *': { maxWidth: '100%' },
                      wordBreak: 'break-word',
                      '& .variable-placeholder': {
                        backgroundColor: '#4caf50',
                        color: 'white',
                        padding: '2px 4px',
                        borderRadius: '3px',
                        fontFamily: 'monospace',
                        fontSize: '0.875em'
                      }
                    }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {previewData.body}
                  </Typography>
                )}
              </Paper>

              {formData.channel === 'SMS' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>SMS Preview:</strong> Character count: {previewData.body.length}
                    {previewData.body.length > 160 && (
                      <span> - This message will be sent as multiple SMS parts.</span>
                    )}
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

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