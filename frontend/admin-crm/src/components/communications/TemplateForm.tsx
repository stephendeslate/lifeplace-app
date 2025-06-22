// frontend/admin-crm/src/components/communications/TemplateForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
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
  Paper
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Preview as PreviewIcon,
  Code as CodeIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import type { CommunicationTemplate, CreateTemplateData, UpdateTemplateData } from '../../types/communications.types';
import RichTextEditor from '../shared/RichTextEditor';
import VariableInserter from './VariableInserter';

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
    const variableText = `{{ ${variable} }}`;
    
    if (editorMode === 'visual') {
      // For rich text editor, insert at cursor position
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const span = document.createElement('span');
        span.className = 'variable-placeholder';
        span.style.backgroundColor = '#e3f2fd';
        span.style.padding = '2px 4px';
        span.style.borderRadius = '3px';
        span.style.fontFamily = 'monospace';
        span.style.fontSize = '0.875em';
        span.textContent = variableText;
        
        range.deleteContents();
        range.insertNode(span);
        
        // Move cursor after the inserted variable
        range.setStartAfter(span);
        range.setEndAfter(span);
        selection.removeAllRanges();
        selection.addRange(range);
        
        // Update the form data
        const editor = document.querySelector('[contenteditable]') as HTMLElement;
        if (editor) {
          handleInputChange('body_template', editor.innerHTML);
        }
      }
    } else {
      // For HTML mode, insert at textarea cursor position
      const textarea = document.getElementById('body-template-html') as HTMLTextAreaElement;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.body_template;
        const before = text.substring(0, start);
        const after = text.substring(end);
        
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
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={3}>
        {isEditing ? 'Edit Template' : 'Create Template'}
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={3}>
          {/* Basic Information */}
          <Card>
            <CardContent>
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
                        // Reset editor mode to visual when switching channels
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
              </Stack>
            </CardContent>
          </Card>

          {/* Template Content */}
          <Card>
            <CardContent>
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
                  >
                    {isPreviewing ? <CircularProgress size={20} /> : 'Preview'}
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
                          '& .MuiInputBase-input': {
                            fontFamily: editorMode === 'html' ? 'monospace' : 'inherit'
                          }
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
                    // Email visual mode - use rich text editor
                    <RichTextEditor
                      value={formData.body_template}
                      onChange={(value) => handleInputChange('body_template', value)}
                      placeholder="Start typing your email content... Use variables for dynamic content."
                      minHeight={300}
                    />
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* Variable Helper */}
          <Card>
            <CardContent>
              <VariableInserter
                variableSchemas={variableSchemas}
                onVariableInsert={handleVariableInsert}
                onTemplateLoad={loadTemplate}
                channel={formData.channel}
              />
            </CardContent>
          </Card>

          {/* Preview */}
          {previewData && (
            <Card>
              <CardContent>
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
                      dangerouslySetInnerHTML={{ __html: previewData.body }}
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
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <Box display="flex" gap={2} justifyContent="flex-end">
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={20} />
              ) : (
                isEditing ? 'Update Template' : 'Create Template'
              )}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};