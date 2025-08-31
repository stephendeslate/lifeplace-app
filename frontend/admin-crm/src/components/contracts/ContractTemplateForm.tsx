// frontend/admin-crm/src/components/contracts/ContractTemplateForm.tsx

import React, { useState, useEffect } from 'react';
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
  FormControlLabel,
  Switch,
  Chip,
  Paper,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Preview as PreviewIcon,
} from '@mui/icons-material';
import { useEventTypes } from '../../hooks/useEvents';
import { useCreateContractTemplate, useUpdateContractTemplate } from '../../hooks/useContracts';
import { sanitizeHTML } from '../../utils/security';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';
import type { 
  ContractTemplate, 
  CreateContractTemplateData, 
} from '../../types/contracts.types';
import RichTextEditor from '../shared/RichTextEditor';
import ContractVariableInserter from './ContractVariableInserter';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { ModernCard } from '../common/ModernCard';
import { ModernPageHeader } from '../common/ModernPageHeader';

interface ContractTemplateFormProps {
  template?: ContractTemplate;
  onSave: () => void;
  onCancel: () => void;
}

const contractTemplateStarters = {
  service_agreement: {
    content: `<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="font-size: 24px; margin-bottom: 10px;">SERVICE AGREEMENT</h1>
  <p style="font-size: 16px;">Contract #{{ contract_number }}</p>
</div>

<p><strong>This Service Agreement</strong> ("Agreement") is entered into on {{ contract_date }} between:</p>

<p><strong>SERVICE PROVIDER:</strong><br>
{{ company_name }}<br>
{{ company_address }}<br>
Phone: {{ company_phone }}<br>
Email: {{ company_email }}</p>

<p><strong>CLIENT:</strong><br>
{{ client_name }}<br>
{{ client_address }}<br>
Phone: {{ client_phone }}<br>
Email: {{ client_email }}</p>

<h2>1. EVENT DETAILS</h2>
<p><strong>Event:</strong> {{ event_name }}<br>
<strong>Date:</strong> {{ event_date }}<br>
<strong>Time:</strong> {{ event_start_time }} - {{ event_end_time }}<br>
<strong>Venue:</strong> {{ event_venue }}</p>

<h2>2. SERVICES PROVIDED</h2>
<p>The Service Provider agrees to provide the following services for the above-mentioned event:</p>
<ul>
  <li>{{ service_description }}</li>
  <li>Setup and breakdown services</li>
  <li>Professional staff supervision</li>
</ul>

<h2>3. PAYMENT TERMS</h2>
<p><strong>Total Contract Value:</strong> {{ contract_value }} {{ contract_currency }}</p>
<p><strong>Payment Schedule:</strong> {{ payment_schedule }}</p>

<h2>4. CANCELLATION POLICY</h2>
<p>{{ cancellation_policy }}</p>

<h2>5. LIABILITY</h2>
<p>{{ liability_limit }}</p>

<h2>6. GOVERNING LAW</h2>
<p>This agreement shall be governed by {{ governing_law }}.</p>

<div style="margin-top: 50px;">
  <p><strong>CLIENT SIGNATURE:</strong></p>
  <p>___________________________ Date: ___________<br>
  {{ client_name }}</p>
  
  <p style="margin-top: 30px;"><strong>SERVICE PROVIDER:</strong></p>
  <p>___________________________ Date: ___________<br>
  {{ company_representative }}, {{ company_title }}<br>
  {{ company_name }}</p>
</div>`
  },
  venue_rental: {
    content: `<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="font-size: 24px; margin-bottom: 10px;">VENUE RENTAL AGREEMENT</h1>
  <p style="font-size: 16px;">Contract #{{ contract_number }}</p>
</div>

<p><strong>This Venue Rental Agreement</strong> is made between {{ company_name }} ("Venue") and {{ client_name }} ("Renter") for the rental of venue facilities.</p>

<h2>RENTAL DETAILS</h2>
<p><strong>Event:</strong> {{ event_name }}<br>
<strong>Date:</strong> {{ event_date }}<br>
<strong>Setup Time:</strong> {{ setup_time }}<br>
<strong>Event Time:</strong> {{ event_start_time }} - {{ event_end_time }}<br>
<strong>Breakdown Time:</strong> {{ breakdown_time }}<br>
<strong>Venue:</strong> {{ event_venue }}</p>

<h2>RENTAL FEE</h2>
<p><strong>Venue Rental Fee:</strong> {{ contract_value }} {{ contract_currency }}<br>
<strong>Security Deposit:</strong> {{ security_deposit }}<br>
<strong>Additional Services:</strong> {{ additional_services }}</p>

<h2>VENUE RULES</h2>
<ul>
  <li>Maximum occupancy: {{ max_occupancy }} guests</li>
  <li>No smoking inside the venue</li>
  <li>Music must end by {{ music_end_time }}</li>
  <li>{{ venue_rules }}</li>
</ul>

<h2>CANCELLATION</h2>
<p>{{ cancellation_policy }}</p>

<h2>DAMAGE POLICY</h2>
<p>Renter is responsible for any damage to the venue or equipment during the rental period.</p>

<div style="margin-top: 50px;">
  <p><strong>RENTER SIGNATURE:</strong></p>
  <p>___________________________ Date: ___________<br>
  {{ client_name }}</p>
  
  <p style="margin-top: 30px;"><strong>VENUE REPRESENTATIVE:</strong></p>
  <p>___________________________ Date: ___________<br>
  {{ company_representative }}<br>
  {{ company_name }}</p>
</div>`
  },
  catering_contract: {
    content: `<div style="text-align: center; margin-bottom: 30px;">
  <h1 style="font-size: 24px; margin-bottom: 10px;">CATERING SERVICES CONTRACT</h1>
  <p style="font-size: 16px;">Contract #{{ contract_number }}</p>
</div>

<p><strong>Catering Agreement</strong> between {{ company_name }} ("Caterer") and {{ client_name }} ("Client") for catering services.</p>

<h2>EVENT INFORMATION</h2>
<p><strong>Event:</strong> {{ event_name }}<br>
<strong>Date:</strong> {{ event_date }}<br>
<strong>Service Time:</strong> {{ service_start_time }} - {{ service_end_time }}<br>
<strong>Location:</strong> {{ event_venue }}<br>
<strong>Guest Count:</strong> {{ guest_count }} guests</p>

<h2>MENU & SERVICES</h2>
<p><strong>Menu Selection:</strong><br>
{{ menu_details }}</p>

<p><strong>Service Style:</strong> {{ service_style }}<br>
<strong>Staff Provided:</strong> {{ staff_count }} service staff</p>

<h2>PRICING</h2>
<p><strong>Per Person Rate:</strong> {{ per_person_rate }}<br>
<strong>Service Charge:</strong> {{ service_charge }}<br>
<strong>Total Amount:</strong> {{ contract_value }} {{ contract_currency }}</p>

<h2>PAYMENT TERMS</h2>
<p>{{ payment_schedule }}</p>

<h2>FINAL GUEST COUNT</h2>
<p>Final guest count must be confirmed {{ guest_count_deadline }} business days prior to the event.</p>

<h2>CANCELLATION POLICY</h2>
<p>{{ cancellation_policy }}</p>

<div style="margin-top: 50px;">
  <p><strong>CLIENT SIGNATURE:</strong></p>
  <p>___________________________ Date: ___________<br>
  {{ client_name }}</p>
  
  <p style="margin-top: 30px;"><strong>CATERER:</strong></p>
  <p>___________________________ Date: ___________<br>
  {{ company_representative }}<br>
  {{ company_name }}</p>
</div>`
  }
};

const SIGNATURE_ROLES = [
  { value: 'CLIENT', label: 'Client' },
  { value: 'WITNESS', label: 'Witness' },
  { value: 'COMPANY_REP', label: 'Company Representative' },
  { value: 'GUARDIAN', label: 'Legal Guardian' },
  { value: 'PARTNER', label: 'Business Partner' },
  { value: 'OTHER', label: 'Other' },
];

export const ContractTemplateForm: React.FC<ContractTemplateFormProps> = ({
  template,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<CreateContractTemplateData>({
    name: '',
    description: '',
    event_type: null,
    content: '',
    variables: [],
    requires_signature: true,
    sections: [],
    signature_requirements: ['CLIENT'],
    requires_witness: false,
    requires_company_signature: true,
    allows_amendments: true,
    amendment_requires_signature: true,
  });

  const [newVariable, setNewVariable] = useState('');
  const [previewData, setPreviewData] = useState<string | null>(null);
  const { settings: currencySettings } = useCurrencySettings();

  // Get active event types
  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [], isLoading: isLoadingEventTypes } = useActiveEventTypes();

  // Mutations
  const createMutation = useCreateContractTemplate();
  const updateMutation = useUpdateContractTemplate();

  const isEditing = !!template;
  const isLoading = createMutation.isPending || updateMutation.isPending;

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
        signature_requirements: template.signature_requirements || ['CLIENT'],
        requires_witness: template.requires_witness,
        requires_company_signature: template.requires_company_signature,
        allows_amendments: template.allows_amendments,
        amendment_requires_signature: template.amendment_requires_signature,
      });
    }
  }, [template]);

  const handleInputChange = (field: keyof CreateContractTemplateData, value: string | boolean | number | null | string[] | unknown[]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isEditing && template) {
      updateMutation.mutate(
        { id: template.id, data: formData },
        {
          onSuccess: () => {
            onSave();
          }
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          onSave();
        }
      });
    }
  };

  const handlePreview = () => {
    if (!formData.content) return;
    
    // Create sample context data for preview
    const sampleData = {
      contract_number: 'CT-2024-001',
      contract_date: new Date().toLocaleDateString(),
      company_name: 'LifePlace Events',
      company_address: '123 Business St, City, State 12345',
      company_phone: '(555) 123-4567',
      company_email: 'info@lifeplace.com',
      company_representative: 'John Smith',
      company_title: 'Event Manager',
      client_name: 'Jane Doe',
      client_address: '456 Client Ave, City, State 12345',
      client_phone: '(555) 987-6543',
      client_email: 'jane.doe@example.com',
      event_name: 'Annual Corporate Gala',
      event_date: 'March 15, 2024',
      event_start_time: '6:00 PM',
      event_end_time: '11:00 PM',
      event_venue: 'Grand Ballroom Hotel',
      contract_value: formatCurrency(15000, currencySettings?.defaultCurrency || 'PHP'),
      contract_currency: currencySettings?.defaultCurrency || 'PHP',
      payment_schedule: '50% deposit, balance due 7 days before event'
    };

    // Simple variable replacement for preview
    let previewContent = formData.content;
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      previewContent = previewContent.replace(regex, value);
    });

    setPreviewData(previewContent);
  };

  const handleVariableInsert = (variable: string) => {
    // For rich text editor, we'll use the global function if available
    if ((window as Window & { _richTextEditorInsertVariable?: (variable: string) => void })._richTextEditorInsertVariable) {
      (window as Window & { _richTextEditorInsertVariable?: (variable: string) => void })._richTextEditorInsertVariable?.(variable);
    }

    // Add to variables array if not already present
    if (!(formData.variables ?? []).includes(variable)) {
      handleInputChange('variables', [...(formData.variables ?? []), variable]);
    }
  };

  const loadTemplate = (templateKey: string) => {
    const starter = contractTemplateStarters[templateKey as keyof typeof contractTemplateStarters];
    
    if (starter) {
      handleInputChange('content', starter.content);
    }
  };

  const handleAddVariable = () => {
    if (newVariable.trim() && !(formData.variables ?? []).includes(newVariable.trim())) {
      handleInputChange('variables', [...(formData.variables ?? []), newVariable.trim()]);
      setNewVariable('');
    }
  };

  const handleRemoveVariable = (variable: string) => {
    handleInputChange('variables', (formData.variables ?? []).filter(v => v !== variable));
  };

  return (
    <Box>
      <ModernPageHeader
        title={isEditing ? 'Edit Contract Template' : 'Create Contract Template'}
        subtitle={isEditing ? 'Modify your contract template' : 'Create a new contract template for events'}
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
                  helperText="A descriptive name for this contract template"
                />

                <TextField
                  label="Description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  helperText="Brief description of when to use this template"
                />

                <FormControl fullWidth>
                  <InputLabel>Event Type (Optional)</InputLabel>
                  <Select
                    value={formData.event_type || ''}
                    label="Event Type (Optional)"
                    onChange={(e) => handleInputChange('event_type', e.target.value || null)}
                    disabled={isLoadingEventTypes}
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
                  {isLoadingEventTypes && (
                    <Box display="flex" justifyContent="center" mt={1}>
                      <CircularProgress size={20} />
                    </Box>
                  )}
                </FormControl>
              </Stack>
          </ModernCard>

          {/* Contract Content */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="none"
          >
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  Contract Content
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<PreviewIcon />}
                  onClick={handlePreview}
                  disabled={!formData.content}
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
                      background: `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.primary[100]} 100%)`,
                    },
                  }}
                >
                  Preview
                </Button>
              </Box>

              <Stack spacing={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Contract Content (Visual Editor)
                </Typography>
                
                <RichTextEditor
                  value={formData.content}
                  onChange={(value) => handleInputChange('content', value)}
                  placeholder="Enter your contract content here. Use variables like {{ client_name }} for dynamic content."
                  minHeight={10}
                />
              </Stack>
          </ModernCard>

          {/* Variable Helper */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="none"
          >
              <ContractVariableInserter
                onVariableInsert={handleVariableInsert}
                onTemplateLoad={loadTemplate}
              />
          </ModernCard>

          {/* Variables Management */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="none"
          >
              <Typography variant="h6" gutterBottom>
                Template Variables
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Variables used in this template
              </Typography>
              
              <Box display="flex" gap={1} mb={2}>
                <TextField
                  size="small"
                  placeholder="Enter variable name"
                  value={newVariable}
                  onChange={(e) => setNewVariable(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleAddVariable();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddVariable}
                  disabled={!newVariable.trim()}
                >
                  Add
                </Button>
              </Box>

              <Box display="flex" flexWrap="wrap" gap={1}>
                {(formData.variables ?? []).map((variable) => (
                  <Chip
                    key={variable}
                    label={`{{${variable}}}`}
                    onDelete={() => handleRemoveVariable(variable)}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
          </ModernCard>

          {/* Signature Settings */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="none"
          >
              <Typography variant="h6" gutterBottom>
                Signature Settings
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
                  <FormControl fullWidth>
                    <InputLabel>Required Signature Roles</InputLabel>
                    <Select
                      multiple
                      value={formData.signature_requirements}
                      onChange={(e) => handleInputChange('signature_requirements', e.target.value)}
                      label="Required Signature Roles"
                      renderValue={(selected) => (
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {selected.map((value) => (
                            <Chip 
                              key={value} 
                              label={SIGNATURE_ROLES.find(role => role.value === value)?.label}
                              size="small" 
                            />
                          ))}
                        </Box>
                      )}
                    >
                      {SIGNATURE_ROLES.map((role) => (
                        <MenuItem key={role.value} value={role.value}>
                          {role.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requires_witness}
                      onChange={(e) => handleInputChange('requires_witness', e.target.checked)}
                    />
                  }
                  label="Requires Witness"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.requires_company_signature}
                      onChange={(e) => handleInputChange('requires_company_signature', e.target.checked)}
                    />
                  }
                  label="Requires Company Signature"
                />
              </Stack>
          </ModernCard>

          {/* Amendment Settings */}
          <ModernCard
            variant="glass"
            size="medium"
            animation="none"
          >
              <Typography variant="h6" gutterBottom>
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
                    label="Amendments Require Signature"
                  />
                )}
              </Stack>
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
                  Contract Preview
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 3, bgcolor: 'grey.50' }}>
                  <Box 
                    dangerouslySetInnerHTML={{ __html: sanitizeHTML(previewData, 'preview') }}
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
                </Paper>

                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Preview Note:</strong> This preview uses sample data. Actual contracts will use real client and event information.
                  </Typography>
                </Alert>
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
    </Box>
  );
};

export default ContractTemplateForm;