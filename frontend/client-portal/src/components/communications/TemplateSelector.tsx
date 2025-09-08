// frontend/client-portal/src/components/communications/TemplateSelector.tsx

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Collapse,
  Button,
  useTheme,
  alpha,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Search as SearchIcon,
  ExpandMore as ExpandIcon,
  AutoMode as AutoIcon,
  Person as ManualIcon,
  Settings as SystemIcon,
  Preview as PreviewIcon,
  Check as SelectIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { useCommunications } from '../../hooks/useCommunications';
import type { 
  CommunicationTemplate, 
  TemplateVariable
} from '../../types/communications.types';

interface TemplateSelectorProps {
  selectedTemplate?: CommunicationTemplate | null;
  onTemplateSelect: (template: CommunicationTemplate | null) => void;
  channel?: 'EMAIL' | 'SMS' | null;
  onChannelChange?: (channel: 'EMAIL' | 'SMS') => void;
  showChannelSelector?: boolean;
  compact?: boolean;
  maxHeight?: number;
}

interface TemplateCardProps {
  template: CommunicationTemplate;
  isSelected: boolean;
  onSelect: (template: CommunicationTemplate) => void;
  onPreview?: (template: CommunicationTemplate) => void;
  compact?: boolean;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'SYSTEM':
      return <SystemIcon fontSize="small" />;
    case 'AUTO':
      return <AutoIcon fontSize="small" />;
    case 'MANUAL':
      return <ManualIcon fontSize="small" />;
    default:
      return <ManualIcon fontSize="small" />;
  }
};

const getCategoryColor = (category: string): 'primary' | 'secondary' | 'info' => {
  switch (category) {
    case 'SYSTEM':
      return 'primary';
    case 'AUTO':
      return 'secondary';
    case 'MANUAL':
      return 'info';
    default:
      return 'info';
  }
};

const getChannelIcon = (channel: string) => {
  return channel === 'EMAIL' ? <EmailIcon fontSize="small" /> : <SmsIcon fontSize="small" />;
};

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  isSelected,
  onSelect,
  onPreview,
  compact = false,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const handleToggleExpanded = () => {
    if (!compact) {
      setExpanded(!expanded);
    }
  };

  const variables = useMemo(() => {
    return Object.keys(template.variables_schema || {}).map((key): TemplateVariable => ({
      name: key,
      type: (template.variables_schema[key]?.type as 'string' | 'number' | 'boolean' | 'date') || 'string',
      required: template.variables_schema[key]?.required || false,
      description: template.variables_schema[key]?.description,
    }));
  }, [template.variables_schema]);

  return (
    <AnimatedElement animation="slideUp">
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          mb: 1,
          cursor: 'pointer',
          border: isSelected 
            ? `2px solid ${theme.palette.primary.main}`
            : `1px solid ${alpha(theme.palette.divider, 0.2)}`,
          backgroundColor: isSelected 
            ? alpha(theme.palette.primary.main, 0.05)
            : 'transparent',
          '&:hover': {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.03),
            transform: 'translateY(-2px)',
          },
          transition: 'all 0.2s ease',
        }}
        onClick={() => onSelect(template)}
      >
        <Box sx={{ p: compact ? 2 : 3 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: compact ? 1 : 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getChannelIcon(template.channel)}
              {getCategoryIcon(template.category)}
            </Box>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography 
                  variant={compact ? 'body2' : 'h6'} 
                  sx={{ 
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                >
                  {template.name}
                </Typography>
                {isSelected && (
                  <SelectIcon 
                    color="primary" 
                    sx={{ fontSize: compact ? 18 : 20 }} 
                  />
                )}
              </Box>

              {false && (
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ 
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: compact ? 'nowrap' : 'normal',
                    maxHeight: compact ? 'none' : 40,
                  }}
                >
                  {/* template.description */}
                </Typography>
              )}

              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 0.5 }}>
                <Chip
                  label={template.channel}
                  size="small"
                  color={template.channel === 'EMAIL' ? 'primary' : 'secondary'}
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
                <Chip
                  label={template.category === 'SYSTEM' ? 'System' : template.category === 'AUTO' ? 'Auto' : 'Manual'}
                  size="small"
                  color={getCategoryColor(template.category)}
                  variant="outlined"
                  sx={{ height: 20, fontSize: '0.7rem' }}
                />
                {variables.length > 0 && (
                  <Chip
                    label={`${variables.length} variables`}
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                )}
              </Stack>
            </Box>

            {!compact && (
              <Stack direction="row" spacing={0.5}>
                {onPreview && (
                  <Tooltip title="Preview template">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPreview(template);
                      }}
                      sx={{
                        backgroundColor: alpha(theme.palette.info.main, 0.1),
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.info.main, 0.2),
                        },
                      }}
                    >
                      <PreviewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleExpanded();
                  }}
                  sx={{
                    transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease',
                  }}
                >
                  <ExpandIcon fontSize="small" />
                </IconButton>
              </Stack>
            )}
          </Box>

          {/* Expandable Content */}
          {!compact && (
            <Collapse in={expanded} timeout="auto">
              <Box sx={{ pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                {/* Subject Template */}
                {template.subject_template && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Subject Template:
                    </Typography>
                    <GlassCard
                      variant="light"
                      intensity="subtle"
                      sx={{
                        p: 2,
                        backgroundColor: alpha(theme.palette.grey[50], 0.5),
                      }}
                    >
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                        {template.subject_template}
                      </Typography>
                    </GlassCard>
                  </Box>
                )}

                {/* Body Template Preview */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Body Template Preview:
                  </Typography>
                  <GlassCard
                    variant="light"
                    intensity="subtle"
                    sx={{
                      p: 2,
                      backgroundColor: alpha(theme.palette.grey[50], 0.5),
                      maxHeight: 120,
                      overflow: 'auto',
                    }}
                  >
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {template.body_template.length > 200 
                        ? `${template.body_template.substring(0, 200)}...`
                        : template.body_template
                      }
                    </Typography>
                  </GlassCard>
                </Box>

                {/* Variables */}
                {variables.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                      Available Variables:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {variables.map((variable) => (
                        <Tooltip
                          key={variable.name}
                          title={variable.description || `${variable.type} variable${variable.required ? ' (required)' : ''}`}
                        >
                          <Chip
                            label={`{{${variable.name}}}`}
                            size="small"
                            variant="outlined"
                            color={variable.required ? 'warning' : 'default'}
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: '0.7rem',
                              height: 22,
                            }}
                          />
                        </Tooltip>
                      ))}
                    </Box>
                  </Box>
                )}
              </Box>
            </Collapse>
          )}
        </Box>
      </GlassCard>
    </AnimatedElement>
  );
};

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplate,
  onTemplateSelect,
  channel,
  onChannelChange,
  showChannelSelector = true,
  compact = false,
  maxHeight = 600,
}) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const { useTemplates } = useCommunications();
  
  const filters = useMemo(() => {
    const baseFilters: { category?: string; channel?: string } = {};
    if (categoryFilter !== 'all') baseFilters.category = categoryFilter;
    if (channel) baseFilters.channel = channel;
    return baseFilters;
  }, [categoryFilter, channel]);

  const { data: templates = [], isLoading } = useTemplates(filters);

  // Filter templates by search term
  const filteredTemplates = useMemo(() => {
    if (!searchTerm) return templates;
    const lowercaseSearch = searchTerm.toLowerCase();
    return templates.filter(template =>
      template.name.toLowerCase().includes(lowercaseSearch) ||
      template.body_template.toLowerCase().includes(lowercaseSearch)
    );
  }, [templates, searchTerm]);

  const handleTemplateSelect = (template: CommunicationTemplate) => {
    if (selectedTemplate?.id === template.id) {
      onTemplateSelect(null); // Deselect if already selected
    } else {
      onTemplateSelect(template);
    }
  };

  const handleClearSelection = () => {
    onTemplateSelect(null);
  };

  if (isLoading) {
    return (
      <GlassCard variant="light" intensity="subtle" sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Loading templates...
        </Typography>
      </GlassCard>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Select Template
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a template to compose your message
        </Typography>
      </Box>

      {/* Controls */}
      <Stack spacing={2} sx={{ mb: 3 }}>
        {/* Channel Selector */}
        {showChannelSelector && (
          <FormControl size="small">
            <InputLabel>Channel</InputLabel>
            <Select
              value={channel || ''}
              label="Channel"
              onChange={(e) => onChannelChange?.(e.target.value as 'EMAIL' | 'SMS')}
              displayEmpty
            >
              <MenuItem value="">All Channels</MenuItem>
              <MenuItem value="EMAIL">Email</MenuItem>
              <MenuItem value="SMS">SMS</MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Search and Filters */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={categoryFilter}
              label="Category"
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <MenuItem value="all">All Categories</MenuItem>
              <MenuItem value="MANUAL">Manual</MenuItem>
              <MenuItem value="AUTO">Automated</MenuItem>
              <MenuItem value="SYSTEM">System</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {/* Selected Template Info */}
      {selectedTemplate && (
        <GlassCard
          variant="light"
          intensity="strong"
          sx={{
            mb: 3,
            p: 2,
            backgroundColor: alpha(theme.palette.success.main, 0.05),
            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getChannelIcon(selectedTemplate.channel)}
                <SelectIcon color="success" />
              </Box>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {selectedTemplate.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedTemplate.channel} • {selectedTemplate.category}
                </Typography>
              </Box>
            </Box>
            <Button
              size="small"
              onClick={handleClearSelection}
              color="primary"
              variant="outlined"
            >
              Clear Selection
            </Button>
          </Box>
        </GlassCard>
      )}

      {/* Templates List */}
      <Box sx={{ maxHeight, overflow: 'auto' }}>
        {filteredTemplates.length === 0 ? (
          <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              No Templates Found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm 
                ? `No templates match "${searchTerm}". Try adjusting your search or filters.`
                : 'No templates are available for the selected criteria.'
              }
            </Typography>
          </GlassCard>
        ) : (
          <Stack spacing={1}>
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                isSelected={selectedTemplate?.id === template.id}
                onSelect={handleTemplateSelect}
                compact={compact}
              />
            ))}
          </Stack>
        )}
      </Box>

      {/* Footer Info */}
      {filteredTemplates.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <Typography variant="caption" color="text.secondary">
            {filteredTemplates.length} template{filteredTemplates.length === 1 ? '' : 's'} available
            {searchTerm && ` for "${searchTerm}"`}
            {channel && ` in ${channel.toLowerCase()}`}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TemplateSelector;