// frontend/admin-crm/src/components/sales/QuoteVariableInserter.tsx

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

interface QuoteVariableInserterProps {
  onVariableInsert: (variable: string) => void;
  onTemplateLoad?: (templateKey: string) => void;
}

export const QuoteVariableInserter: React.FC<QuoteVariableInserterProps> = ({
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

  // Quote-specific variables
  const quoteVariables = {
    client_info: {
      title: 'Client Information',
      variables: {
        client_name: 'Full name of the client',
        client_first_name: 'Client\'s first name',
        client_last_name: 'Client\'s last name',
        client_email: 'Client\'s email address',
        client_phone: 'Client\'s phone number',
        client_company: 'Client\'s company name',
        client_address: 'Client\'s address',
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
        event_guest_count: 'Expected number of guests',
        event_description: 'Event description',
      },
      color: 'secondary' as const
    },
    quote_details: {
      title: 'Quote Details',
      variables: {
        quote_number: 'Unique quote number',
        quote_date: 'Quote creation date',
        quote_valid_until: 'Quote expiration date',
        subtotal: 'Subtotal amount',
        tax_amount: 'Tax amount',
        discount_amount: 'Discount amount',
        total_amount: 'Total quote amount',
        currency: 'Quote currency',
        payment_terms: 'Payment terms',
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
        company_logo: 'Company logo URL',
        sales_representative: 'Sales representative name',
        sales_rep_email: 'Sales rep email',
        sales_rep_phone: 'Sales rep phone',
      },
      color: 'success' as const
    },
    line_items: {
      title: 'Line Items & Pricing',
      variables: {
        line_items_table: 'Table of all line items',
        item_descriptions: 'List of item descriptions',
        quantities: 'Item quantities',
        unit_prices: 'Unit prices for items',
        line_totals: 'Line item totals',
        hourly_rate: 'Hourly service rate',
        setup_fee: 'Setup or preparation fee',
        service_fee: 'Service fee amount',
        additional_charges: 'Any additional charges',
      },
      color: 'warning' as const
    },
    terms_and_policies: {
      title: 'Terms & Policies',
      variables: {
        payment_policy: 'Payment policy details',
        cancellation_policy: 'Cancellation policy',
        refund_policy: 'Refund policy',
        terms_and_conditions: 'General terms and conditions',
        deposit_required: 'Required deposit amount',
        deposit_percentage: 'Deposit percentage',
        final_payment_due: 'Final payment due date',
        late_fee: 'Late payment fee',
      },
      color: 'error' as const
    }
  };

  const quoteTemplates = {
    wedding_quote: {
      name: 'Wedding Quote',
      description: 'Comprehensive wedding services quote'
    },
    corporate_event: {
      name: 'Corporate Event Quote',
      description: 'Business event services quote'
    },
    birthday_party: {
      name: 'Birthday Party Quote',
      description: 'Birthday celebration services'
    },
    photography_package: {
      name: 'Photography Package',
      description: 'Photography services quote'
    },
    catering_quote: {
      name: 'Catering Quote',
      description: 'Food and beverage services'
    },
    venue_rental: {
      name: 'Venue Rental Quote',
      description: 'Venue rental services quote'
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
            📋 Available Quote Variables
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Click any variable to insert it at the cursor position
            </Typography>
            
            {Object.entries(quoteVariables).map(([key, group]) => (
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
                Add your own variable (e.g., special_offers, package_details)
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
              🚀 Quote Template Starters
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Load a pre-made quote template to get started quickly (this will replace current content)
              </Typography>
              
              {Object.entries(quoteTemplates).map(([key, template]) => (
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
            💡 Quote Formatting Tips
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
              <strong>Quote Writing Tips:</strong>
            </Typography>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="caption" color="text.secondary">
                Start with a compelling introduction that highlights your value proposition
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Include detailed line items with clear descriptions and pricing
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Add terms and conditions to set clear expectations
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Use professional formatting to make quotes easy to read
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Include contact information for questions and follow-ups
              </Typography>
              <Typography component="li" variant="caption" color="text.secondary">
                Variables will be automatically replaced with actual values
              </Typography>
            </Box>
          </Stack>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default QuoteVariableInserter;