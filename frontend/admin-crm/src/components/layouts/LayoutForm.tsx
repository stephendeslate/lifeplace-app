// frontend/admin-crm/src/components/layouts/LayoutForm.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Button,
  FormControlLabel,
  Checkbox,
  TextField,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  Paper,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Palette as PaletteIcon,
  Code as CodeIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import DOMPurify from 'dompurify';
import { useLayouts } from '../../hooks/useLayouts';
import type { EmailLayout, CreateLayoutData, UpdateLayoutData } from '../../types/layouts.types';

interface LayoutFormProps {
  layout?: EmailLayout;
  onSave: () => void;
  onCancel: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ paddingTop: 16 }}>
    {value === index && children}
  </div>
);

// Sample content for the preview
const SAMPLE_CONTENT = `
<h2>Welcome to Your Event!</h2>
<p>Dear <strong>John Doe</strong>,</p>
<p>Thank you for booking with us. We're excited to help you create a memorable experience.</p>
<p>Your event details:</p>
<ul>
  <li><strong>Event:</strong> Annual Gala</li>
  <li><strong>Date:</strong> March 15, 2024</li>
  <li><strong>Location:</strong> Grand Ballroom</li>
</ul>
<p>If you have any questions, please don't hesitate to reach out.</p>
<p>Best regards,<br>The LifePlace Team</p>
`;

export const LayoutForm: React.FC<LayoutFormProps> = ({
  layout,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateLayoutData>({
    name: '',
    description: '',
    header_template: '<div style="background-color: {{ primary_color }}; color: white; padding: 24px; text-align: center;">\n    <h1 style="margin: 0;">{{ header_title|default:site_name }}</h1>\n</div>',
    footer_template: '<div style="padding: 24px; text-align: center; background-color: #f8f9fa;">\n    <p style="margin: 5px 0; color: #666;">{{ site_name }}</p>\n    <p style="margin: 5px 0; color: #999; font-size: 12px;">&copy; {{ current_year }} {{ site_name }}. All rights reserved.</p>\n</div>',
    wrapper_template: '<div style="padding: 32px; background-color: white;">\n    {{ content }}\n</div>',
    base_styles: '',
    primary_color: '#1976d2',
    secondary_color: '#1565c0',
    logo_url: '',
    is_default: false,
    is_active: true,
  });

  const [activeTab, setActiveTab] = useState(0);
  const [notes, setNotes] = useState('');

  const { useCreateLayout, useUpdateLayout } = useLayouts();
  const { mutate: createLayout, isPending: isCreating } = useCreateLayout();
  const { mutate: updateLayout, isPending: isUpdating } = useUpdateLayout();

  const isEditing = !!layout;
  const isLoading = isCreating || isUpdating;

  // Sample data for variable substitution in preview
  const samplePreviewData = useMemo(() => ({
    site_name: 'LifePlace',
    current_year: new Date().getFullYear().toString(),
    primary_color: formData.primary_color,
    secondary_color: formData.secondary_color,
    header_title: 'Welcome to LifePlace',
    header_subtitle: 'Your Event Management Partner',
    support_email: 'support@lifeplace.com',
    unsubscribe_link: '#unsubscribe',
    logo_url: formData.logo_url || 'https://via.placeholder.com/150x50?text=Logo',
  }), [formData.primary_color, formData.secondary_color, formData.logo_url]);

  // Live preview - compose layout with sample content
  const livePreview = useMemo(() => {
    const substituteVariables = (text: string) => {
      let result = text;

      // Handle Django template default syntax: {{ var|default:fallback }}
      result = result.replace(/\{\{\s*(\w+)\|default:(\w+)\s*\}\}/g, (_, varName, fallback) => {
        const value = samplePreviewData[varName as keyof typeof samplePreviewData];
        if (value) return String(value);
        const fallbackValue = samplePreviewData[fallback as keyof typeof samplePreviewData];
        return fallbackValue ? String(fallbackValue) : `{{ ${varName} }}`;
      });

      // Substitute remaining {{ variable }} patterns
      result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, varName) => {
        const value = samplePreviewData[varName as keyof typeof samplePreviewData];
        return value !== undefined ? String(value) : match;
      });

      return result;
    };

    // Substitute variables in each template part
    const header = substituteVariables(formData.header_template);
    const footer = substituteVariables(formData.footer_template);

    // Handle wrapper template - replace {{ content }} with sample content
    let wrapper = substituteVariables(formData.wrapper_template);
    wrapper = wrapper.replace(/\{\{\s*content\s*\}\}/g, SAMPLE_CONTENT);

    // Compose the full email
    const baseStyles = formData.base_styles ? `<style>${formData.base_styles}</style>` : '';

    const composedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${baseStyles}
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    ${header}
    ${wrapper}
    ${footer}
  </div>
</body>
</html>
    `.trim();

    return composedHtml;
  }, [formData.header_template, formData.footer_template, formData.wrapper_template, formData.base_styles, samplePreviewData]);

  useEffect(() => {
    if (layout) {
      setFormData({
        name: layout.name,
        description: layout.description,
        header_template: layout.header_template,
        footer_template: layout.footer_template,
        wrapper_template: layout.wrapper_template,
        base_styles: layout.base_styles,
        primary_color: layout.primary_color,
        secondary_color: layout.secondary_color,
        logo_url: layout.logo_url,
        is_default: layout.is_default,
        is_active: layout.is_active,
      });
    }
  }, [layout]);

  const handleInputChange = (field: keyof CreateLayoutData, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && layout) {
      const updateData: UpdateLayoutData = { ...formData, notes };
      updateLayout(
        { id: layout.id, data: updateData },
        { onSuccess: onSave }
      );
    } else {
      createLayout(formData, { onSuccess: onSave });
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Left side - Form */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack spacing={3}>
            {/* Basic Information */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                Basic Information
              </Typography>

              <Stack spacing={2}>
                <TextField
                  label="Layout Name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                  fullWidth
                  placeholder="e.g., Standard, Premium Client"
                />

                <TextField
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Internal description of when to use this layout"
                />

                <Box display="flex" gap={2}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.is_default}
                        onChange={(e) => handleInputChange('is_default', e.target.checked)}
                      />
                    }
                    label="Set as default layout"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={formData.is_active}
                        onChange={(e) => handleInputChange('is_active', e.target.checked)}
                      />
                    }
                    label="Active"
                  />
                </Box>
              </Stack>
            </Paper>

            {/* Theme Configuration */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PaletteIcon fontSize="small" />
                Theme Configuration
              </Typography>

              <Stack spacing={2}>
                <Box display="flex" gap={2}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Primary Color
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        style={{ width: 40, height: 40, border: 'none', cursor: 'pointer' }}
                      />
                      <TextField
                        value={formData.primary_color}
                        onChange={(e) => handleInputChange('primary_color', e.target.value)}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Secondary Color
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <input
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                        style={{ width: 40, height: 40, border: 'none', cursor: 'pointer' }}
                      />
                      <TextField
                        value={formData.secondary_color}
                        onChange={(e) => handleInputChange('secondary_color', e.target.value)}
                        size="small"
                        sx={{ width: 100 }}
                      />
                    </Box>
                  </Box>
                </Box>

                <TextField
                  label="Logo URL"
                  value={formData.logo_url}
                  onChange={(e) => handleInputChange('logo_url', e.target.value)}
                  fullWidth
                  placeholder="https://example.com/logo.png"
                  helperText="Optional: URL to your company logo"
                />
              </Stack>
            </Paper>

            {/* Template Components */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CodeIcon fontSize="small" />
                Layout Components
              </Typography>

              <Alert severity="info" sx={{ mb: 2 }}>
                Available variables: <code>{'{{ site_name }}'}</code>, <code>{'{{ current_year }}'}</code>,{' '}
                <code>{'{{ primary_color }}'}</code>, <code>{'{{ secondary_color }}'}</code>,{' '}
                <code>{'{{ header_title }}'}</code>, <code>{'{{ header_subtitle }}'}</code>,{' '}
                <code>{'{{ support_email }}'}</code>, <code>{'{{ unsubscribe_link }}'}</code>
              </Alert>

              <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
                <Tab label="Header" />
                <Tab label="Footer" />
                <Tab label="Content Wrapper" />
                <Tab label="Base Styles" />
              </Tabs>

              <TabPanel value={activeTab} index={0}>
                <TextField
                  label="Header Template"
                  value={formData.header_template}
                  onChange={(e) => handleInputChange('header_template', e.target.value)}
                  fullWidth
                  multiline
                  rows={8}
                  InputProps={{
                    sx: { fontFamily: 'monospace', fontSize: 13 },
                  }}
                  helperText="HTML for the email header section"
                />
              </TabPanel>

              <TabPanel value={activeTab} index={1}>
                <TextField
                  label="Footer Template"
                  value={formData.footer_template}
                  onChange={(e) => handleInputChange('footer_template', e.target.value)}
                  fullWidth
                  multiline
                  rows={8}
                  InputProps={{
                    sx: { fontFamily: 'monospace', fontSize: 13 },
                  }}
                  helperText="HTML for the email footer section"
                />
              </TabPanel>

              <TabPanel value={activeTab} index={2}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <strong>Important:</strong> Must contain <code>{'{{ content }}'}</code> placeholder where template content will be injected.
                </Alert>
                <TextField
                  label="Content Wrapper Template"
                  value={formData.wrapper_template}
                  onChange={(e) => handleInputChange('wrapper_template', e.target.value)}
                  fullWidth
                  multiline
                  rows={6}
                  InputProps={{
                    sx: { fontFamily: 'monospace', fontSize: 13 },
                  }}
                  error={!formData.wrapper_template.includes('{{ content }}') && !formData.wrapper_template.includes('{{content}}')}
                  helperText={
                    !formData.wrapper_template.includes('{{ content }}') && !formData.wrapper_template.includes('{{content}}')
                      ? 'Must contain {{ content }} placeholder'
                      : 'HTML wrapper around template content'
                  }
                />
              </TabPanel>

              <TabPanel value={activeTab} index={3}>
                <TextField
                  label="Base CSS Styles"
                  value={formData.base_styles}
                  onChange={(e) => handleInputChange('base_styles', e.target.value)}
                  fullWidth
                  multiline
                  rows={6}
                  InputProps={{
                    sx: { fontFamily: 'monospace', fontSize: 13 },
                  }}
                  placeholder="/* Optional CSS styles */"
                  helperText="Optional CSS styles applied to the email"
                />
              </TabPanel>
            </Paper>

            {/* Change Notes (for editing) */}
            {isEditing && (
              <TextField
                label="Change Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                fullWidth
                multiline
                rows={2}
                placeholder="Describe what was changed..."
              />
            )}

            {/* Actions */}
            <Box display="flex" justifyContent="flex-end" gap={2}>
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
                startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Layout'}
              </Button>
            </Box>
          </Stack>
        </Box>

        {/* Right side - Live Preview */}
        <Box sx={{ width: 400, flexShrink: 0 }}>
          <Paper variant="outlined" sx={{ p: 2, position: 'sticky', top: 16 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <PreviewIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight="medium">
                Live Preview
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
              Preview updates as you edit. Showing with sample email content.
            </Typography>
            <Divider sx={{ mb: 2 }} />

            <Paper
              variant="outlined"
              sx={{
                bgcolor: '#f5f5f5',
                p: 1,
                maxHeight: 'calc(100vh - 250px)',
                overflow: 'auto',
              }}
            >
              {livePreview ? (
                <Box
                  sx={{
                    bgcolor: 'white',
                    borderRadius: 1,
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    '& img': { maxWidth: '100%', height: 'auto' },
                  }}
                >
                  <div
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(livePreview, {
                        ADD_TAGS: ['style'],
                        ADD_ATTR: ['target'],
                      }),
                    }}
                  />
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic" textAlign="center" py={4}>
                  Start editing to see preview...
                </Typography>
              )}
            </Paper>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
};

export default LayoutForm;
