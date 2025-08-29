// frontend/admin-crm/src/components/communications/TemplateForm.tsx

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Preview as PreviewIcon,
  Code as CodeIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import { sanitizeHTML } from '../../utils/security';
import type { CommunicationTemplate, CreateTemplateData, UpdateTemplateData } from '../../types/communications.types';
import RichTextEditor, { type RichTextEditorHandle } from '../shared/RichTextEditor';
import VariableInserter from './VariableInserter';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { 
  ModernCard,
  ModernPageHeader,
  ModernPageLayout
} from '../common';

interface TemplateFormProps {
  template?: CommunicationTemplate;
  onSave: () => void;
  onCancel: () => void;
}

type EditorMode = 'visual' | 'html';

export const TemplateForm: React.FC<TemplateFormProps> = ({
  template,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<CreateTemplateData>({
    name: '',
    channel: 'EMAIL',
    category: 'MANUAL',
    subject_template: '',
    body_template: '',
    variables_schema: {}
  });

  const [editorMode, setEditorMode] = useState<EditorMode>('visual');
  const richTextEditorRef = useRef<RichTextEditorHandle>(null);

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
        subject_template: template.subject_template || '',
        body_template: template.body_template,
        variables_schema: template.variables_schema
      });
    }
  }, [template]);

  const handleInputChange = (field: keyof CreateTemplateData, value: any) => {
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
    if (editorMode === 'visual' && richTextEditorRef.current) {
      // Use the rich text editor's insert method
      richTextEditorRef.current.insertVariable(variable);
    } else {
      // For HTML mode, insert at textarea cursor position
      const textarea = document.getElementById('body-template-html') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.body_template;
        const before = text.substring(0, start);
        const after = text.substring(end);
        
        const variableText = `{{ ${variable} }}`;
        const newText = before + variableText + after;
        handleInputChange('body_template', newText);
        
        // Set cursor position after inserted variable
        setTimeout(() => {
          textarea.focus();
          textarea.selectionStart = textarea.selectionEnd = start + variableText.length;
        }, 0);
      }
    }
  };

  const getTemplateTemplates = () => {
    const templates = {
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
      }
    };

    if (formData.channel === 'SMS') {
      return {
        reminder: {
          subject: '',
          body: `Hi {{ first_name }}! Reminder: {{ event_name }} on {{ event_date }} at {{ venue }}. Looking forward to working with you! - {{ site_name }}`
        },
        confirmation: {
          subject: '',
          body: `Hi {{ first_name }}! Your booking for {{ event_name }} is confirmed for {{ event_date }}. We'll be in touch soon! - {{ site_name }}`
        }
      };
    }

    return templates;
  };

  const loadTemplate = (templateKey: string) => {
    const templates = getTemplateTemplates();
    const template = templates[templateKey as keyof typeof templates];
    
    if (template) {
      handleInputChange('subject_template', template.subject);
      handleInputChange('body_template', template.body);
    }
  };

  return (
    <ModernPageLayout>
      <ModernPageHeader
        title={isEditing ? 'Edit Template' : 'Create Template'}
        subtitle={isEditing ? 'Modify your communication template' : 'Create a new communication template'}
        size="medium"
        gradient
        glass
      />

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={4}>
          {/* Basic Information */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="none"
          >
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      ...glassPresets.light,
                      borderRadius: tokens.spacing.radius.lg,
                      border: `1px solid ${tokens.color.borders.glass}`,
                      '&:hover': {
                        border: `1px solid ${tokens.color.primary[300]}`,
                      },
                      '&.Mui-focused': {
                        border: `1px solid ${tokens.color.primary[500]}`,
                        boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: tokens.color.neutral[600],
                      fontWeight: 500,
                    },
                  }}
                />

                <Box display="flex" gap={2}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: tokens.color.neutral[600], fontWeight: 500 }}>Channel</InputLabel>
                    <Select
                      value={formData.channel}
                      label="Channel"
                      onChange={(e) => {
                        handleInputChange('channel', e.target.value);
                        // Reset editor mode to visual when switching channels
                        setEditorMode('visual');
                      }}
                      disabled={template?.is_system}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: tokens.color.borders.glass,
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: tokens.color.primary[300],
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: tokens.color.primary[500],
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                        },
                        '& .MuiSelect-select': {
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.lg,
                        },
                      }}
                    >
                      <MenuItem value="EMAIL">Email</MenuItem>
                      <MenuItem value="SMS">SMS</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel sx={{ color: tokens.color.neutral[600], fontWeight: 500 }}>Category</InputLabel>
                    <Select
                      value={formData.category}
                      label="Category"
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      disabled={template?.is_system}
                      sx={{
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: tokens.color.borders.glass,
                        },
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: tokens.color.primary[300],
                        },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: tokens.color.primary[500],
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                        },
                        '& .MuiSelect-select': {
                          ...glassPresets.light,
                          borderRadius: tokens.spacing.radius.lg,
                        },
                      }}
                    >
                      <MenuItem value="MANUAL">Manual</MenuItem>
                      <MenuItem value="AUTO">Auto</MenuItem>
                      <MenuItem value="SYSTEM">System</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
              </Stack>
          </ModernCard>

          {/* Template Content */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="none"
          >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Template Content
                </Typography>
                <Stack direction="row" spacing={1}>
                  {formData.channel === 'EMAIL' && (
                    <ToggleButtonGroup
                      value={editorMode}
                      exclusive
                      onChange={(_, value) => value && setEditorMode(value)}
                      size="small"
                      sx={{
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.full,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        overflow: 'hidden',
                        '& .MuiToggleButton-root': {
                          border: 'none',
                          borderRadius: 0,
                          px: 2,
                          py: 0.5,
                          fontWeight: 500,
                          color: tokens.color.neutral[600],
                          '&.Mui-selected': {
                            background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                            color: 'white',
                            '&:hover': {
                              background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                            },
                          },
                          '&:hover': {
                            background: `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.primary[50]} 100%)`,
                          },
                        },
                      }}
                    >
                      <ToggleButton value="visual">
                        <EditIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        Visual
                      </ToggleButton>
                      <ToggleButton value="html">
                        <CodeIcon sx={{ fontSize: 16, mr: 0.5 }} />
                        HTML
                      </ToggleButton>
                    </ToggleButtonGroup>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<PreviewIcon />}
                    onClick={handlePreview}
                    disabled={!formData.body_template || isPreviewing}
                    sx={{
                      ...glassPresets.light,
                      border: `1px solid ${tokens.color.primary[300]}`,
                      borderRadius: tokens.spacing.radius.full,
                      px: 3,
                      fontWeight: 600,
                      color: tokens.color.primary[600],
                      '&:hover': {
                        ...glassPresets.medium,
                        border: `1px solid ${tokens.color.primary[500]}`,
                        background: `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.primary[50]} 100%)`,
                      },
                    }}
                  >
                    {isPreviewing ? <CircularProgress size={20} color="primary" /> : 'Preview'}
                  </Button>
                </Stack>
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
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        ...glassPresets.light,
                        borderRadius: tokens.spacing.radius.lg,
                        border: `1px solid ${tokens.color.borders.glass}`,
                        '&:hover': {
                          border: `1px solid ${tokens.color.primary[300]}`,
                        },
                        '&.Mui-focused': {
                          border: `1px solid ${tokens.color.primary[500]}`,
                          boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: tokens.color.neutral[600],
                        fontWeight: 500,
                      },
                    }}
                  />
                )}

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {formData.channel === 'SMS' ? 'Message Content' : 'Email Body'}
                    {formData.channel === 'EMAIL' && (
                      <span> ({editorMode === 'visual' ? 'Visual Editor' : 'HTML Source'})</span>
                    )}
                  </Typography>
                  
                  {formData.channel === 'SMS' || editorMode === 'html' ? (
                    // SMS or HTML mode - use textarea
                    <Box>
                      <TextField
                        id="body-template-html"
                        value={formData.body_template}
                        onChange={(e) => handleInputChange('body_template', e.target.value)}
                        required
                        fullWidth
                        multiline
                        rows={formData.channel === 'SMS' ? 4 : 12}
                        placeholder={
                          formData.channel === 'SMS' 
                            ? "Hi {{ first_name }}! Your message here..."
                            : "<div>Your HTML email template here...</div>"
                        }
                        helperText={
                          formData.channel === 'SMS' 
                            ? "Keep SMS messages under 160 characters for best delivery"
                            : "Raw HTML - be careful with syntax"
                        }
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            ...glassPresets.light,
                            borderRadius: tokens.spacing.radius.lg,
                            border: `1px solid ${tokens.color.borders.glass}`,
                            '&:hover': {
                              border: `1px solid ${tokens.color.primary[300]}`,
                            },
                            '&.Mui-focused': {
                              border: `1px solid ${tokens.color.primary[500]}`,
                              boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                            },
                          },
                          '& .MuiInputBase-input': {
                            fontFamily: editorMode === 'html' ? 'monospace' : 'inherit',
                            color: tokens.color.neutral[700],
                          },
                          '& .MuiInputLabel-root': {
                            color: tokens.color.neutral[600],
                            fontWeight: 500,
                          },
                        }}
                      />

                      {formData.channel === 'SMS' && (
                        <Box mt={1}>
                          <Typography variant="caption" color="text.secondary">
                            Character count: {formData.body_template.length}/160
                            {formData.body_template.length > 160 && (
                              <span style={{ color: 'orange' }}> (Will be sent as multiple messages)</span>
                            )}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  ) : (
                    // Email visual mode - use mui-tiptap rich text editor
                    <RichTextEditor
                      ref={richTextEditorRef}
                      value={formData.body_template}
                      onChange={(value) => handleInputChange('body_template', value)}
                      placeholder="Start typing your email content... Use variables for dynamic content."
                      minHeight={10}
                      showVariableInsert={true}
                      onVariableInsert={handleVariableInsert}
                    />
                  )}
                </Box>
              </Stack>
          </ModernCard>

          {/* Variable Helper */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="none"
          >
              <VariableInserter
                variableSchemas={variableSchemas}
                onVariableInsert={handleVariableInsert}
                onTemplateLoad={loadTemplate}
                channel={formData.channel}
              />
          </ModernCard>

          {/* Preview */}
          {previewData && (
            <ModernCard
              variant="glass"
              color="primary"
              size="medium"
              animation="none"
            >
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
            </ModernCard>
          )}

          {/* Actions */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="none"
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
              border: `1px solid ${tokens.color.borders.glass}`,
            }}
          >
            <Box display="flex" gap={3} justifyContent="flex-end">
              <Button
                variant="outlined"
                startIcon={<CancelIcon />}
                onClick={onCancel}
                disabled={isLoading}
                sx={{
                  ...glassPresets.light,
                  border: `1px solid ${tokens.color.neutral[300]}`,
                  borderRadius: tokens.spacing.radius.full,
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  '&:hover': {
                    ...glassPresets.medium,
                    border: `1px solid ${tokens.color.neutral[400]}`,
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                startIcon={<SaveIcon />}
                disabled={isLoading}
                sx={{
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                  borderRadius: tokens.spacing.radius.full,
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                    boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
                  },
                  '&:disabled': {
                    background: tokens.color.neutral[300],
                    boxShadow: 'none',
                  },
                }}
              >
                {isLoading ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  isEditing ? 'Update Template' : 'Create Template'
                )}
              </Button>
            </Box>
          </ModernCard>
        </Stack>
      </Box>
    </ModernPageLayout>
  );
};