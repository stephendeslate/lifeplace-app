// frontend/admin-crm/src/components/contracts/ContractVariableInserter.tsx

import React, { useState } from 'react';
import {
  Box,
  Chip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Button,
  TextField,
  Paper,
  Divider
} from '@mui/material';
import {
  ExpandMore,
  Add as AddIcon
} from '@mui/icons-material';

interface ContractVariableInserterProps {
  onVariableInsert: (variable: string) => void;
  onTemplateLoad?: (templateKey: string) => void;
}

export const ContractVariableInserter: React.FC<ContractVariableInserterProps> = ({
  onVariableInsert,
  onTemplateLoad
}) => {
  const [expandedPanel, setExpandedPanel] = useState<string | false>('variables');
  const [customVariable, setCustomVariable] = useState('');

  const handlePanelChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleCustomVariableAdd = () => {
    if (customVariable.trim()) {
      onVariableInsert(customVariable.trim());
      setCustomVariable('');
    }
  };

  // Contract-specific variables
  const contractVariables = {
    client_info: {
      title: 'Client Information',
      variables: {
        client_name: 'Full name of the client',
        client_first_name: 'Client\'s first name',
        client_last_name: 'Client\'s last name',
        client_email: 'Client\'s email address',
        client_phone: 'Client\'s phone number',
        client_address: 'Client\'s full address',
        client_company: 'Client\'s company name',
      },
      color: 'primary' as const
    },
    event_details: {
      title: 'Event Details',
      variables: {
        event_name: 'Name of the event',
        event_date: 'Event start date',
        event_start_time: 'Event start time',
        event_end_date: 'Event end date',
        event_end_time: 'Event end time',
        event_venue: 'Event venue/location',
        event_type: 'Type of event',
        event_duration: 'Duration of event',
        event_description: 'Event description',
      },
      color: 'secondary' as const
    },
    contract_details: {
      title: 'Contract Details',
      variables: {
        contract_date: 'Contract creation date',
        contract_number: 'Unique contract number',
        contract_value: 'Total contract value',
        contract_currency: 'Contract currency',
        payment_schedule: 'Payment schedule details',
        valid_until: 'Contract expiration date',
        signature_deadline: 'Deadline for signatures',
      },
      color: 'info' as const
    },
    company_info: {
      title: 'Company Information',
      variables: {
        company_name: 'Your company name',
        company_address: 'Company address',
        company_phone: 'Company phone number',
        company_email: 'Company email address',
        company_website: 'Company website',
        company_representative: 'Company representative name',
        company_title: 'Representative title',
      },
      color: 'success' as const
    },
    legal_terms: {
      title: 'Legal Terms',
      variables: {
        cancellation_policy: 'Cancellation policy details',
        force_majeure: 'Force majeure clause',
        liability_limit: 'Liability limitation',
        jurisdiction: 'Legal jurisdiction',
        governing_law: 'Governing law',
        dispute_resolution: 'Dispute resolution method',
      },
      color: 'warning' as const
    }
  };

  const contractTemplates = {
    service_agreement: {
      name: 'Service Agreement',
      description: 'Standard service agreement template'
    },
    venue_rental: {
      name: 'Venue Rental Contract',
      description: 'Contract for venue rental services'
    },
    catering_contract: {
      name: 'Catering Contract',
      description: 'Catering services agreement'
    },
    photography_contract: {
      name: 'Photography Contract',
      description: 'Photography services agreement'
    },
    entertainment_contract: {
      name: 'Entertainment Contract',
      description: 'Entertainment services agreement'
    }
  };

  return (
    <Box>
      {/* Variables Section */}
      <Accordion 
        expanded={expandedPanel === 'variables'} 
        onChange={handlePanelChange('variables')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body2" fontWeight="medium">
            📋 Available Contract Variables
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Click any variable to insert it at the cursor position
            </Typography>
            
            {Object.entries(contractVariables).map(([key, group]) => (
              <Box key={key}>
                <Typography variant="subtitle2" gutterBottom color={`${group.color}.main`}>
                  {group.title}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                  {Object.entries(group.variables).map(([varKey, description]) => (
                    <Chip
                      key={varKey}
                      label={`{{ ${varKey} }}`}
                      size="small"
                      variant="outlined"
                      color={group.color}
                      clickable
                      onClick={() => onVariableInsert(varKey)}
                      title={description}
                      sx={{ 
                        fontSize: '0.75rem',
                        '&:hover': {
                          backgroundColor: `${group.color}.50`
                        }
                      }}
                    />
                  ))}
                </Box>
              </Box>
            ))}

            {/* Custom Variable Input */}
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="subtitle2" gutterBottom>
                Custom Variable
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  size="small"
                  placeholder="variable_name"
                  value={customVariable}
                  onChange={(e) => setCustomVariable(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCustomVariableAdd()}
                  sx={{ flex: 1 }}
                />
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleCustomVariableAdd}
                  disabled={!customVariable.trim()}
                >
                  Insert
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                Add your own variable (e.g., special_requirements, additional_terms)
              </Typography>
            </Paper>
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Template Starters */}
      {onTemplateLoad && (
        <Accordion 
          expanded={expandedPanel === 'templates'} 
          onChange={handlePanelChange('templates')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="body2" fontWeight="medium">
              🚀 Contract Template Starters
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Load a pre-made contract template to get started quickly (this will replace current content)
              </Typography>
              
              {Object.entries(contractTemplates).map(([key, template]) => (
                <Paper 
                  key={key}
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      borderColor: 'primary.main'
                    }
                  }}
                  onClick={() => onTemplateLoad(key)}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {template.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {template.description}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Formatting Tips */}
      <Accordion 
        expanded={expandedPanel === 'tips'} 
        onChange={handlePanelChange('tips')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body2" fontWeight="medium">
            💡 Contract Formatting Tips
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              <strong>Keyboard Shortcuts:</strong>
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1}>
              <Chip label="Ctrl+B = Bold" size="small" variant="outlined" />
              <Chip label="Ctrl+I = Italic" size="small" variant="outlined" />
              <Chip label="Ctrl+U = Underline" size="small" variant="outlined" />
              <Chip label="Ctrl+L = Align Left" size="small" variant="outlined" />
              <Chip label="Ctrl+E = Center" size="small" variant="outlined" />
              <Chip label="Ctrl+R = Align Right" size="small" variant="outlined" />
            </Box>
            
            <Divider sx={{ my: 1 }} />
            
            <Typography variant="caption" color="text.secondary">
              <strong>Contract Writing Tips:</strong>
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="caption" color="text.secondary">
                Use clear, professional language throughout the contract
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Include all essential terms: parties, services, payment, cancellation
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Variables will be automatically replaced with actual values
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Consider adding signature blocks at the end of the contract
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Review and validate all legal terms with appropriate counsel
              </Typography>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ContractVariableInserter;