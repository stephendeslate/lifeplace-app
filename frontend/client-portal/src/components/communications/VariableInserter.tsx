// frontend/client-portal/src/components/communications/VariableInserter.tsx

import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  TextField,
  InputAdornment,
  Tooltip,
  Button,
  Collapse,
  IconButton,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Info as InfoIcon,
  ExpandMore as ExpandIcon,
  Category as CategoryIcon,
  Code as VariableIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import type { 
  CommunicationTemplate, 
  TemplateVariable
} from '../../types/communications.types';

interface VariableInserterProps {
  template?: CommunicationTemplate | null;
  onVariableInsert: (variable: string) => void;
  compact?: boolean;
  maxHeight?: number;
}

interface VariableCardProps {
  variable: TemplateVariable;
  onInsert: (variableName: string) => void;
  compact?: boolean;
}

const getVariableTypeColor = (type: string): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info' => {
  switch (type) {
    case 'string':
      return 'primary';
    case 'number':
      return 'secondary';
    case 'boolean':
      return 'success';
    case 'date':
      return 'warning';
    default:
      return 'default';
  }
};

const getVariableTypeIcon = (type: string) => {
  switch (type) {
    case 'string':
      return '📝';
    case 'number':
      return '🔢';
    case 'boolean':
      return '✓/✗';
    case 'date':
      return '📅';
    default:
      return '💾';
  }
};

const VariableCard: React.FC<VariableCardProps> = ({
  variable,
  onInsert,
  compact = false,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  
  const variableString = `{{${variable.name}}}`;

  const handleInsert = () => {
    onInsert(variable.name);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(variableString);
      // You could show a toast notification here
    } catch (error) {
      console.error('Failed to copy variable:', error);
    }
  };

  const handleToggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!compact) {
      setExpanded(!expanded);
    }
  };

  return (
    <AnimatedElement animation="slideUp">
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          mb: 1,
          cursor: 'pointer',
          border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          '&:hover': {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.03),
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease',
        }}
        onClick={handleInsert}
      >
        <Box sx={{ p: compact ? 1.5 : 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Variable Info */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography
                  variant={compact ? 'body2' : 'body1'}
                  sx={{
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: theme.palette.primary.main,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {variableString}
                </Typography>
                
                {variable.required && (
                  <Chip
                    label="Required"
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{
                      height: 18,
                      fontSize: '0.6rem',
                      '& .MuiChip-label': { px: 1 },
                    }}
                  />
                )}
              </Box>

              <Stack direction="row" spacing={1} alignItems="center">
                <Chip
                  label={variable.type}
                  size="small"
                  color={getVariableTypeColor(variable.type)}
                  variant="outlined"
                  icon={<span style={{ fontSize: '0.8rem' }}>{getVariableTypeIcon(variable.type)}</span>}
                  sx={{
                    height: 20,
                    fontSize: '0.7rem',
                    '& .MuiChip-icon': { fontSize: '0.8rem' },
                  }}
                />

                {variable.description && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: compact ? 'nowrap' : 'normal',
                      maxWidth: compact ? 200 : 'none',
                    }}
                  >
                    {variable.description}
                  </Typography>
                )}
              </Stack>
            </Box>

            {/* Action Buttons */}
            <Stack direction="row" spacing={0.5}>
              <Tooltip title="Copy variable">
                <IconButton
                  size="small"
                  onClick={handleCopy}
                  sx={{
                    backgroundColor: alpha(theme.palette.grey[500], 0.1),
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.grey[500], 0.2),
                    },
                  }}
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              <Tooltip title="Insert variable">
                <IconButton
                  size="small"
                  onClick={handleInsert}
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
              </Tooltip>

              {!compact && (variable.description || variable.default_value || variable.example_value) && (
                <IconButton
                  size="small"
                  onClick={handleToggleExpanded}
                  sx={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <ExpandIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Box>

          {/* Expandable Details */}
          {!compact && (
            <Collapse in={expanded} timeout="auto">
              <Box sx={{ pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Stack spacing={1}>
                  {variable.description && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Description:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {variable.description}
                      </Typography>
                    </Box>
                  )}

                  {variable.default_value !== undefined && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Default Value:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.5,
                          fontFamily: 'monospace',
                          backgroundColor: alpha(theme.palette.grey[100], 0.5),
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          display: 'inline-block',
                        }}
                      >
                        {String(variable.default_value)}
                      </Typography>
                    </Box>
                  )}

                  {variable.example_value !== undefined && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                        Example:
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 0.5,
                          fontFamily: 'monospace',
                          backgroundColor: alpha(theme.palette.info.main, 0.1),
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          display: 'inline-block',
                          color: theme.palette.info.main,
                        }}
                      >
                        {String(variable.example_value)}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </Collapse>
          )}
        </Box>
      </GlassCard>
    </AnimatedElement>
  );
};

export const VariableInserter: React.FC<VariableInserterProps> = ({
  template,
  onVariableInsert,
  compact = false,
  maxHeight = 400,
}) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [showRequired, setShowRequired] = useState(false);

  // Extract variables from template
  const variables = useMemo((): TemplateVariable[] => {
    if (!template?.variables_schema) return [];
    
    return Object.keys(template.variables_schema).map((key): TemplateVariable => ({
      name: key,
      type: (template.variables_schema[key]?.type as 'string' | 'number' | 'boolean' | 'date') || 'string',
      required: template.variables_schema[key]?.required || false,
      description: template.variables_schema[key]?.description,
      default_value: undefined,
      example_value: undefined,
    }));
  }, [template?.variables_schema]);

  // Filter variables based on search and requirements
  const filteredVariables = useMemo(() => {
    let filtered = variables;

    if (searchTerm) {
      const lowercaseSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(variable =>
        variable.name.toLowerCase().includes(lowercaseSearch) ||
        variable.description?.toLowerCase().includes(lowercaseSearch) ||
        variable.type.toLowerCase().includes(lowercaseSearch)
      );
    }

    if (showRequired) {
      filtered = filtered.filter(variable => variable.required);
    }

    return filtered.sort((a, b) => {
      // Sort required variables first, then alphabetically
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [variables, searchTerm, showRequired]);

  const handleVariableInsert = (variableName: string) => {
    onVariableInsert(`{{${variableName}}}`);
  };

  const requiredCount = variables.filter(v => v.required).length;
  const optionalCount = variables.length - requiredCount;

  if (!template) {
    return (
      <GlassCard variant="light" intensity="subtle" sx={{ p: 3, textAlign: 'center' }}>
        <InfoIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No Template Selected
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select a template to see available variables
        </Typography>
      </GlassCard>
    );
  }

  if (variables.length === 0) {
    return (
      <GlassCard variant="light" intensity="subtle" sx={{ p: 3, textAlign: 'center' }}>
        <VariableIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No Variables Available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This template doesn't have any variables to insert
        </Typography>
      </GlassCard>
    );
  }

  return (
    <Box>
      {/* Header */}
      {!compact && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            Template Variables
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Click to insert variables into your message
          </Typography>
        </Box>
      )}

      {/* Template Info */}
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          mb: 2,
          p: 2,
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <CategoryIcon color="info" />
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            {template.name}
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={2} divider={<Divider orientation="vertical" flexItem />}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total Variables:
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {variables.length}
            </Typography>
          </Box>
          {requiredCount > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Required:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.error.main }}>
                {requiredCount}
              </Typography>
            </Box>
          )}
          {optionalCount > 0 && (
            <Box>
              <Typography variant="caption" color="text.secondary">
                Optional:
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                {optionalCount}
              </Typography>
            </Box>
          )}
        </Stack>
      </GlassCard>

      {/* Controls */}
      <Stack spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search variables..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />

        {requiredCount > 0 && (
          <Stack direction="row" spacing={1}>
            <Button
              size="small"
              variant={showRequired ? 'contained' : 'outlined'}
              color="error"
              onClick={() => setShowRequired(!showRequired)}
            >
              {showRequired ? 'Show All' : 'Required Only'}
            </Button>
          </Stack>
        )}
      </Stack>

      {/* Variables List */}
      <Box sx={{ maxHeight, overflow: 'auto' }}>
        {filteredVariables.length === 0 ? (
          <GlassCard variant="light" intensity="subtle" sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {searchTerm 
                ? `No variables match "${searchTerm}"`
                : showRequired
                ? 'No required variables'
                : 'No variables available'
              }
            </Typography>
          </GlassCard>
        ) : (
          <Stack spacing={compact ? 0.5 : 1}>
            {filteredVariables.map((variable) => (
              <VariableCard
                key={variable.name}
                variable={variable}
                onInsert={handleVariableInsert}
                compact={compact}
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Footer Info */}
      {filteredVariables.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Typography variant="caption" color="text.secondary">
            {filteredVariables.length} variable{filteredVariables.length === 1 ? '' : 's'} 
            {searchTerm && ` matching "${searchTerm}"`}
            {showRequired && ' (required only)'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default VariableInserter;