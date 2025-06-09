// frontend/admin-crm/src/components/communications/VariableInserter.tsx

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

interface VariableInserterProps {
  variableSchemas?: {
    client_variables: Record<string, string>;
    system_variables: Record<string, string>;
    admin_invitation_variables: Record<string, string>;
  };
  onVariableInsert: (variable: string) => void;
  onTemplateLoad?: (templateKey: string) => void;
  channel: 'EMAIL' | 'SMS';
}

export const VariableInserter: React.FC<VariableInserterProps> = ({
  variableSchemas,
  onVariableInsert,
  onTemplateLoad,
  channel
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

  const getTemplateStarters = () => {
    if (channel === 'SMS') {
      return {
        reminder: {
          name: 'SMS Reminder',
          description: 'Short event reminder'
        },
        confirmation: {
          name: 'SMS Confirmation', 
          description: 'Booking confirmation'
        }
      };
    }

    return {
      welcome: {
        name: 'Welcome Email',
        description: 'Professional welcome message'
      },
      reminder: {
        name: 'Event Reminder',
        description: 'Event reminder with details'
      },
      followup: {
        name: 'Follow-up',
        description: 'Post-event follow-up'
      }
    };
  };

  if (!variableSchemas) return null;

  const variableGroups = [
    {
      key: 'system',
      title: 'System Variables',
      variables: variableSchemas.system_variables,
      color: 'primary' as const
    },
    {
      key: 'client',
      title: 'Client Variables', 
      variables: variableSchemas.client_variables,
      color: 'secondary' as const
    },
    {
      key: 'invitation',
      title: 'Invitation Variables',
      variables: variableSchemas.admin_invitation_variables,
      color: 'info' as const
    }
  ];

  return (
    <Box>
      {/* Variables Section */}
      <Accordion 
        expanded={expandedPanel === 'variables'} 
        onChange={handlePanelChange('variables')}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography variant="body2" fontWeight="medium">
            📋 Available Variables
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Click any variable to insert it at the cursor position
            </Typography>
            
            {variableGroups.map((group) => (
              <Box key={group.key}>
                <Typography variant="subtitle2" gutterBottom color={`${group.color}.main`}>
                  {group.title}
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                  {Object.entries(group.variables).map(([key, description]) => (
                    <Chip
                      key={key}
                      label={`{{ ${key} }}`}
                      size="small"
                      variant="outlined"
                      color={group.color}
                      clickable
                      onClick={() => onVariableInsert(key)}
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
                Add your own variable (e.g., event_location, custom_message)
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
              🚀 Quick Start Templates
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Load a pre-made template to get started quickly (this will replace current content)
              </Typography>
              
              {Object.entries(getTemplateStarters()).map(([key, template]) => (
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
      {channel === 'EMAIL' && (
        <Accordion 
          expanded={expandedPanel === 'tips'} 
          onChange={handlePanelChange('tips')}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="body2" fontWeight="medium">
              💡 Formatting Tips
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
                <Chip label="Ctrl+Z = Undo" size="small" variant="outlined" />
              </Box>
              
              <Divider sx={{ my: 1 }} />
              
              <Typography variant="caption" color="text.secondary">
                <strong>Tips:</strong>
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="caption" color="text.secondary">
                  Select text and use toolbar buttons for formatting
                </Typography>
                <Typography component="li" variant="caption" color="text.secondary">
                  Variables are automatically styled when preview is generated
                </Typography>
                <Typography component="li" variant="caption" color="text.secondary">
                  Use lists and links to make emails more engaging
                </Typography>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default VariableInserter;