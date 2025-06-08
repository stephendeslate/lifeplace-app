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
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Preview as PreviewIcon
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import type { CommunicationTemplate, CreateTemplateData, UpdateTemplateData } from '../../types/communications.types';

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
    subject_template: '',
    body_template: '',
    variables_schema: {}
  });

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
      support_email: 'support@lifeplace.com'
    };

    previewTemplate({
      id: template?.id || 0, // Will be handled in backend for new templates
      data: { 
        template_id: template?.id || 0,
        context_data: sampleData 
      }
    });
  };

  const renderVariableHelp = () => {
    if (!variableSchemas) return null;

    const relevantSchemas = [
      variableSchemas.system_variables,
      variableSchemas.client_variables
    ];

    return (
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="body2" fontWeight="medium">
            Available Variables
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box>
            {relevantSchemas.map((schema, index) => (
              <Box key={index} mb={2}>
                <Typography variant="subtitle2" gutterBottom>
                  {index === 0 ? 'System Variables' : 'Client Variables'}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {Object.entries(schema).map(([key, description]) => (
                    <Chip
                      key={key}
                      label={`{{ ${key} }}`}
                      size="small"
                      variant="outlined"
                      title={description}
                      onClick={() => {
                        // Copy to clipboard or insert into template
                        navigator.clipboard?.writeText(`{{ ${key} }}`);
                      }}
                    />
                  ))}
                </Box>
              </Box>
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>
    );
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
                />

                <Box display="flex" gap={2}>
                  <FormControl fullWidth>
                    <InputLabel>Channel</InputLabel>
                    <Select
                      value={formData.channel}
                      label="Channel"
                      onChange={(e) => handleInputChange('channel', e.target.value)}
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
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  disabled={!formData.body_template || isPreviewing}
                >
                  {isPreviewing ? <CircularProgress size={20} /> : 'Preview'}
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
                  />
                )}

                <TextField
                  label="Body Template"
                  value={formData.body_template}
                  onChange={(e) => handleInputChange('body_template', e.target.value)}
                  required
                  fullWidth
                  multiline
                  rows={10}
                  placeholder="Use {{ variable_name }} for dynamic content. HTML is supported for emails."
                />
              </Stack>

              {renderVariableHelp()}
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
                    <Alert severity="info" sx={{ fontFamily: 'monospace' }}>
                      {previewData.subject}
                    </Alert>
                  </Box>
                )}

                <Typography variant="subtitle2" gutterBottom>
                  Body:
                </Typography>
                <Alert severity="info">
                  <Box 
                    sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={
                      formData.channel === 'EMAIL' 
                        ? { __html: previewData.body }
                        : undefined
                    }
                  >
                    {formData.channel === 'SMS' ? previewData.body : undefined}
                  </Box>
                </Alert>
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
                isEditing ? 'Update' : 'Create'
              )}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};