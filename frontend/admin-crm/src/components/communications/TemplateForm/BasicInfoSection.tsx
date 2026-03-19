import React from 'react';
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import type { CreateTemplateData } from '@/types/communications.types';
import type { ContextType, TemplateEditorMode } from '@/types/templates.types';
import { CONTEXT_TYPE_LABELS, CONTEXT_TYPE_DESCRIPTIONS } from '@/types/templates.types';
import type { EmailLayout } from '@/types/layouts.types';

interface BasicInfoSectionProps {
  formData: CreateTemplateData;
  isSystem?: boolean;
  layouts: EmailLayout[];
  layoutsLoading: boolean;
  onInputChange: (field: keyof CreateTemplateData, value: unknown) => void;
  onEditorModeReset: (mode: TemplateEditorMode) => void;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  formData,
  isSystem,
  layouts,
  layoutsLoading,
  onInputChange,
  onEditorModeReset,
}) => {
  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Basic Information
      </Typography>

      <Stack spacing={2}>
        <TextField
          label="Template Name"
          value={formData.name}
          onChange={(e) => onInputChange('name', e.target.value)}
          required
          fullWidth
          disabled={isSystem}
          helperText="A descriptive name for this template"
        />

        <Box display="flex" gap={2}>
          <FormControl fullWidth>
            <InputLabel>Channel</InputLabel>
            <Select
              value={formData.channel}
              label="Channel"
              onChange={(e) => {
                onInputChange('channel', e.target.value);
                onEditorModeReset('visual');
              }}
              disabled={isSystem}
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
              onChange={(e) => onInputChange('category', e.target.value)}
              disabled={isSystem}
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
              <InfoIcon
                sx={{
                  fontSize: 14,
                  ml: 0.5,
                  verticalAlign: 'middle',
                  color: 'text.secondary',
                }}
              />
            </Tooltip>
          </InputLabel>
          <Select
            value={formData.context_type}
            label="Context Type"
            onChange={(e) => onInputChange('context_type', e.target.value)}
            disabled={isSystem}
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
                    onChange={(e) => onInputChange('include_client_context', e.target.checked)}
                  />
                }
                label="Include client details"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.include_event_context}
                    onChange={(e) => onInputChange('include_event_context', e.target.checked)}
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
                <InfoIcon
                  sx={{
                    fontSize: 14,
                    ml: 0.5,
                    verticalAlign: 'middle',
                    color: 'text.secondary',
                  }}
                />
              </Tooltip>
            </InputLabel>
            <Select
              value={formData.layout ?? ''}
              label="Email Layout"
              onChange={(e) =>
                onInputChange(
                  'layout',
                  String(e.target.value) === '' ? null : Number(e.target.value),
                )
              }
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
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ ml: 1, color: 'primary.main' }}
                        >
                          (Default)
                        </Typography>
                      )}
                    </Typography>
                    {layout.description && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block' }}
                      >
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
  );
};
