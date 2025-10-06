// frontend/admin-crm/src/components/contracts/ContractTemplateForm.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
  Alert,
  Stack,
  CircularProgress,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  ExpandMore as ExpandMoreIcon,
  Gavel as SignatureIcon,
  EditNote as AmendmentIcon,
  Visibility as WitnessIcon,
} from '@mui/icons-material';
import { useEventTypes } from '../../hooks/useEvents';
import { useCreateContractTemplate, useUpdateContractTemplate } from '../../hooks/useContracts';
import type { 
  ContractTemplate, 
  CreateContractTemplateData,
} from '../../types/contracts.types';

interface ContractTemplateFormProps {
  template?: ContractTemplate;
  onSave: () => void;
  onCancel: () => void;
}

export const ContractTemplateForm: React.FC<ContractTemplateFormProps> = ({
  template,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState<CreateContractTemplateData>({
    name: '',
    description: '',
    event_type: null,
    content: '',
    variables: [],
    requires_signature: true,
    sections: [],
    signature_requirements: [],
    requires_witness: false,
    requires_company_signature: true,
    allows_amendments: false,
    amendment_requires_signature: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [variableInput, setVariableInput] = useState('');

  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [] } = useActiveEventTypes();

  const createTemplateMutation = useCreateContractTemplate();
  const updateTemplateMutation = useUpdateContractTemplate();

  const isEditing = !!template;
  const isLoading = createTemplateMutation.isPending || updateTemplateMutation.isPending;

  // Initialize form data
  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        description: template.description || '',
        event_type: template.event_type,
        content: template.content,
        variables: template.variables || [],
        requires_signature: template.requires_signature,
        sections: template.sections || [],
        signature_requirements: template.signature_requirements || [],
        requires_witness: template.requires_witness,
        requires_company_signature: template.requires_company_signature,
        allows_amendments: template.allows_amendments,
        amendment_requires_signature: template.amendment_requires_signature,
      });
    }
  }, [template]);

  const handleInputChange = (field: keyof CreateContractTemplateData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddVariable = () => {
    if (variableInput.trim() && !formData.variables?.includes(variableInput.trim())) {
      setFormData(prev => ({
        ...prev,
        variables: [...(prev.variables || []), variableInput.trim()]
      }));
      setVariableInput('');
    }
  };

  const handleRemoveVariable = (variableToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables?.filter(v => v !== variableToRemove) || []
    }));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Template name is required';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Contract content is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    const submitData = {
      ...formData,
      event_type: formData.event_type || null,
      variables: formData.variables || [],
    };

    if (isEditing && template) {
      updateTemplateMutation.mutate(
        { id: template.id, data: submitData },
        { onSuccess: onSave }
      );
    } else {
      createTemplateMutation.mutate(submitData, { onSuccess: onSave });
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {isEditing ? 'Edit Contract Template' : 'Create Contract Template'}
      </Typography>

      <Stack spacing={3}>
        {/* Basic Information */}
        <Box>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Basic Information
          </Typography>
          
          <Stack spacing={2}>
            <TextField
              label="Template Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={!!errors.name}
              helperText={errors.name}
              required
              fullWidth
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              multiline
              rows={2}
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Event Type</InputLabel>
              <Select
                value={formData.event_type || ''}
                label="Event Type"
                onChange={(e) => handleInputChange('event_type', e.target.value || null)}
              >
                <MenuItem value="">
                  <em>Any Event Type</em>
                </MenuItem>
                {eventTypes.map((eventType) => (
                  <MenuItem key={eventType.id} value={eventType.id}>
                    {eventType.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </Box>

        {/* Contract Content */}
        <Box>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Contract Content
          </Typography>
          
          <TextField
            label="Contract Content"
            value={formData.content}
            onChange={(e) => handleInputChange('content', e.target.value)}
            error={!!errors.content}
            helperText={errors.content || 'Use variables like {{client_name}}, {{event_date}}, etc.'}
            multiline
            rows={10}
            required
            fullWidth
          />
        </Box>

        {/* Variables */}
        <Box>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Template Variables
          </Typography>
          
          <Stack spacing={2}>
            <Box display="flex" gap={2} alignItems="flex-end">
              <TextField
                label="Add Variable"
                value={variableInput}
                onChange={(e) => setVariableInput(e.target.value)}
                placeholder="e.g., client_name, event_date"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddVariable();
                  }
                }}
                sx={{ flex: 1 }}
              />
              <Button
                onClick={handleAddVariable}
                disabled={!variableInput.trim()}
                variant="outlined"
              >
                Add
              </Button>
            </Box>

            {formData.variables && formData.variables.length > 0 && (
              <Box display="flex" flexWrap="wrap" gap={1}>
                {formData.variables.map((variable) => (
                  <Chip
                    key={variable}
                    label={`{{${variable}}}`}
                    onDelete={() => handleRemoveVariable(variable)}
                    color="secondary"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Stack>
        </Box>

        {/* Advanced Settings */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" fontWeight="medium">
              Advanced Settings
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={3}>
              {/* Signature Settings */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <SignatureIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Signature Requirements
                </Typography>
                
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.requires_signature}
                        onChange={(e) => handleInputChange('requires_signature', e.target.checked)}
                      />
                    }
                    label="Requires Signature"
                  />

                  {formData.requires_signature && (
                    <>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.requires_company_signature}
                            onChange={(e) => handleInputChange('requires_company_signature', e.target.checked)}
                          />
                        }
                        label="Requires Company Signature"
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.requires_witness}
                            onChange={(e) => handleInputChange('requires_witness', e.target.checked)}
                          />
                        }
                        label={
                          <Box display="flex" alignItems="center" gap={1}>
                            <WitnessIcon fontSize="small" />
                            Requires Witness
                          </Box>
                        }
                      />
                    </>
                  )}
                </Stack>
              </Box>

              {/* Amendment Settings */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <AmendmentIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Amendment Settings
                </Typography>
                
                <Stack spacing={2}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.allows_amendments}
                        onChange={(e) => handleInputChange('allows_amendments', e.target.checked)}
                      />
                    }
                    label="Allow Amendments"
                  />

                  {formData.allows_amendments && (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.amendment_requires_signature}
                          onChange={(e) => handleInputChange('amendment_requires_signature', e.target.checked)}
                        />
                      }
                      label="Amendment Requires Signature"
                    />
                  )}
                </Stack>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>

        {/* Form Actions */}
        <Box display="flex" justifyContent="flex-end" gap={2} pt={2}>
          <Button
            onClick={onCancel}
            disabled={isLoading}
            startIcon={<CancelIcon />}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            variant="contained"
            startIcon={isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {isLoading ? 'Saving...' : isEditing ? 'Update Template' : 'Create Template'}
          </Button>
        </Box>

        {/* Error Display */}
        {Object.keys(errors).length > 0 && (
          <Alert severity="error">
            Please correct the errors above before saving.
          </Alert>
        )}
      </Stack>
    </Box>
  );
};