// frontend/admin-crm/src/components/contracts/ContractTemplateForm.tsx

import React, { useState, useEffect, useRef } from 'react';
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
import { useTemplateVariables } from '../../hooks/useTemplateVariables';
import { TemplateContentEditor, TemplateVariableInserter } from '../shared';
import type { TemplateContentEditorHandle, TemplateEditorMode } from '../../types/templates.types';
import type { ContractTemplate, CreateContractTemplateData } from '../../types/contracts.types';

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
  const [editorMode, setEditorMode] = useState<TemplateEditorMode>('visual');
  const editorRef = useRef<TemplateContentEditorHandle>(null);

  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [] } = useActiveEventTypes();
  const { data: variableSchemas } = useTemplateVariables('contracts');

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
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleVariableInsert = (variable: string) => {
    if (editorRef.current) {
      editorRef.current.insertVariable(variable);
    }
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
      updateTemplateMutation.mutate({ id: template.id, data: submitData }, { onSuccess: onSave });
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

          <TemplateContentEditor
            ref={editorRef}
            value={formData.content}
            onChange={(value) => handleInputChange('content', value)}
            mode={editorMode}
            onModeChange={setEditorMode}
            showModeToggle={true}
            availableModes={['visual', 'html']}
            placeholder="Enter contract content... Type {{ to insert variables."
            rows={12}
            minHeight={300}
            error={!!errors.content}
            helperText={errors.content || 'Type {{ to insert variables with autocomplete'}
            label="Contract Content"
            variableSchemas={variableSchemas}
            contextType="CONTRACT"
            hideAdvancedModes={true}
          />
        </Box>

        {/* Variable Helper */}
        <Box>
          <Typography variant="subtitle1" gutterBottom fontWeight="medium">
            Insert Variables
          </Typography>

          <TemplateVariableInserter
            variableSchemas={variableSchemas}
            onVariableInsert={handleVariableInsert}
          />
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
                            onChange={(e) =>
                              handleInputChange('requires_company_signature', e.target.checked)
                            }
                          />
                        }
                        label="Requires Company Signature"
                      />

                      <FormControlLabel
                        control={
                          <Switch
                            checked={formData.requires_witness}
                            onChange={(e) =>
                              handleInputChange('requires_witness', e.target.checked)
                            }
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
                          onChange={(e) =>
                            handleInputChange('amendment_requires_signature', e.target.checked)
                          }
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
          <Button onClick={onCancel} disabled={isLoading} startIcon={<CancelIcon />}>
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
          <Alert severity="error">Please correct the errors above before saving.</Alert>
        )}
      </Stack>
    </Box>
  );
};
