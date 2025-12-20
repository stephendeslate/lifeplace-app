// frontend/admin-crm/src/components/shared/TemplateVariableInserter.tsx
// Domain-agnostic variable insertion component for template editing

import React, { useState, useMemo } from 'react';
import {
  Box,
  Chip,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Paper,
  Divider,
  Tooltip,
  Icon,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as RequiredIcon,
  RadioButtonUnchecked as OptionalIcon,
} from '@mui/icons-material';
import type {
  TemplateVariableInserterProps,
  TemplateStarter,
  VariableGroup,
} from '../../types/templates.types';
import { getVariableGroupTitle, getVariableGroupColor } from '../../hooks/useTemplateVariables';

/**
 * TemplateVariableInserter - A shared component for inserting template variables
 *
 * Works with both Communications and Contracts domains by accepting variable schemas
 * and callbacks for variable insertion and template loading.
 *
 * @example
 * // Communications usage with context type filtering
 * <TemplateVariableInserter
 *   variableSchemas={communicationSchemas}
 *   contextType="BOOKING"
 *   onVariableInsert={(variable) => insertAtCursor(variable)}
 * />
 *
 * @example
 * // Show all variables without filtering
 * <TemplateVariableInserter
 *   variableSchemas={contractSchemas}
 *   onVariableInsert={(variable) => insertAtCursor(variable)}
 * />
 */
export const TemplateVariableInserter: React.FC<TemplateVariableInserterProps> = ({
  variableSchemas,
  contextType,
  onVariableInsert,
  onTemplateLoad,
  templateStarters,
  showFormattingTips = false,
  groupColors,
}) => {
  const [expandedPanel, setExpandedPanel] = useState<string | false>('variables');

  const handlePanelChange = (panel: string) => (_: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Filter and transform variable groups based on context type
  const variableGroups = useMemo(() => {
    if (!variableSchemas?.variable_groups) return [];

    // Helper to get group color (inline to avoid dependency issues)
    const getGroupColor = (groupKey: string): 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error' => {
      if (groupColors && groupColors[groupKey]) {
        return groupColors[groupKey];
      }
      return getVariableGroupColor(groupKey);
    };

    const groups: Array<{
      key: string;
      title: string;
      icon: string;
      variables: Array<{
        name: string;
        description: string;
        required: boolean;
      }>;
      color: 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';
    }> = [];

    for (const [groupKey, groupData] of Object.entries(variableSchemas.variable_groups) as [string, VariableGroup][]) {
      // Filter by context type if specified
      if (contextType && !groupData.available_in.includes(contextType)) {
        continue;
      }

      const variables = Object.entries(groupData.variables).map(([name, def]) => ({
        name,
        description: def.description,
        required: def.required,
      }));

      if (variables.length > 0) {
        groups.push({
          key: groupKey,
          title: groupData.label || getVariableGroupTitle(groupKey),
          icon: groupData.icon || 'help',
          variables,
          color: getGroupColor(groupKey),
        });
      }
    }

    return groups;
  }, [variableSchemas, contextType, groupColors]);

  if (!variableSchemas) return null;

  return (
    <Box>
      {/* Variables Section */}
      <Accordion
        expanded={expandedPanel === 'variables'}
        onChange={handlePanelChange('variables')}
        defaultExpanded
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="body2" fontWeight="medium">
              Available Variables
            </Typography>
            {contextType && (
              <Chip
                label={contextType}
                size="small"
                color="primary"
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            )}
          </Stack>
        </AccordionSummary>
        <AccordionDetails>
          <Stack spacing={2}>
            <Typography variant="caption" color="text.secondary">
              Click any variable to insert it at the cursor position.
              <Box component="span" sx={{ ml: 1 }}>
                <RequiredIcon sx={{ fontSize: 12, color: 'success.main', verticalAlign: 'middle', mr: 0.5 }} />
                = always available
                <OptionalIcon sx={{ fontSize: 12, color: 'text.disabled', verticalAlign: 'middle', mx: 0.5 }} />
                = may be empty
              </Box>
            </Typography>

            {variableGroups.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                No variables available for this context type.
              </Typography>
            ) : (
              variableGroups.map((group) => (
                <Box key={group.key}>
                  <Stack direction="row" alignItems="center" spacing={0.5} mb={1}>
                    <Icon sx={{ fontSize: 18, color: `${group.color}.main` }}>{group.icon}</Icon>
                    <Typography variant="subtitle2" color={`${group.color}.main`}>
                      {group.title}
                    </Typography>
                  </Stack>
                  <Box display="flex" flexWrap="wrap" gap={0.5} mb={2}>
                    {group.variables.map((variable) => (
                      <Tooltip
                        key={variable.name}
                        title={
                          <Box>
                            <Typography variant="body2">{variable.description}</Typography>
                            <Typography variant="caption" color={variable.required ? 'success.light' : 'grey.400'}>
                              {variable.required ? 'Always available' : 'May be empty'}
                            </Typography>
                          </Box>
                        }
                        arrow
                        placement="top"
                      >
                        <Chip
                          label={
                            <Box display="flex" alignItems="center" gap={0.5}>
                              {variable.required ? (
                                <RequiredIcon sx={{ fontSize: 10, color: 'success.main' }} />
                              ) : (
                                <OptionalIcon sx={{ fontSize: 10, color: 'text.disabled' }} />
                              )}
                              <span>{`{{ ${variable.name} }}`}</span>
                            </Box>
                          }
                          size="small"
                          variant="outlined"
                          color={group.color}
                          clickable
                          onClick={() => onVariableInsert(variable.name)}
                          sx={{
                            fontSize: '0.75rem',
                            fontFamily: 'monospace',
                            '& .MuiChip-label': {
                              display: 'flex',
                              alignItems: 'center',
                            },
                            '&:hover': {
                              backgroundColor: `${group.color}.50`,
                            },
                          }}
                        />
                      </Tooltip>
                    ))}
                  </Box>
                </Box>
              ))
            )}
          </Stack>
        </AccordionDetails>
      </Accordion>

      {/* Template Starters */}
      {onTemplateLoad && templateStarters && Object.keys(templateStarters).length > 0 && (
        <Accordion
          expanded={expandedPanel === 'templates'}
          onChange={handlePanelChange('templates')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight="medium">
              Quick Start Templates
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Load a pre-made template to get started quickly (this will replace current content)
              </Typography>

              {Object.entries(templateStarters).map(([key, template]: [string, TemplateStarter]) => (
                <Paper
                  key={key}
                  variant="outlined"
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                      borderColor: 'primary.main',
                    },
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
      {showFormattingTips && (
        <Accordion
          expanded={expandedPanel === 'tips'}
          onChange={handlePanelChange('tips')}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="body2" fontWeight="medium">
              Formatting Tips
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
                  Use lists and links to make content more engaging
                </Typography>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
};

export default TemplateVariableInserter;
