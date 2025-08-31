// frontend/admin-crm/src/components/communications/TemplateList.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Message as MessageIcon,
  SearchOff as SearchOffIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import type { CommunicationTemplate, CommunicationFilters } from '../../types/communications.types';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';
import { 
  ModernEmptyState,
  ModernLoadingStates,
  ModernTable,
  ModernDialog,
  createDeleteActions
} from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common/ModernTable';

interface TemplateListProps {
  onCreateClick: () => void;
  onEditClick: (template: CommunicationTemplate) => void;
  onPreviewClick: (template: CommunicationTemplate) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  onCreateClick,
  onEditClick,
  onPreviewClick
}) => {
  const [filters, setFilters] = useState<CommunicationFilters>({});
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<CommunicationTemplate | null>(null);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { useTemplates, useDeleteTemplate } = useCommunications();
  const { data: templates, isLoading } = useTemplates(filters);
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();

  const handleMenuClose = () => {
    // Menu close handler (kept for consistency)
  };

  const handleDeleteClick = (template?: CommunicationTemplate) => {
    const templateToDelete = template || selectedTemplate;
    if (templateToDelete) {
      setTemplateToDelete(templateToDelete);
      setDeleteDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      console.log('Deleting template:', templateToDelete.id, templateToDelete.name);
      deleteTemplate(templateToDelete.id, {
        onSuccess: () => {
          console.log('Template deleted successfully');
          setDeleteDialogOpen(false);
          setTemplateToDelete(null);
          setSelectedTemplate(null);
        },
        onError: (error) => {
          console.error('Failed to delete template:', error);
          // Dialog will remain open so user can try again
        }
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
    setSelectedTemplate(null);
  };

  const handleFilterChange = (key: keyof CommunicationFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'EMAIL' ? <EmailIcon /> : <SmsIcon />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SYSTEM': return 'primary';
      case 'AUTO': return 'secondary';
      case 'MANUAL': return 'default';
      default: return 'default';
    }
  };

  const handleSort = (column: string) => {
    const isAsc = sortBy === column && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortBy(column);
  };

  // Define table columns for ModernTable
  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Template Name',
      sortable: true,
      render: (_, row) => {
        const template = row as unknown as CommunicationTemplate;
        return (
        <Box display="flex" alignItems="center" gap={2}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: tokens.spacing.radius.lg,
              background: `${tokens.color.primary[50]}80`,
              border: `1px solid ${tokens.color.primary[200]}40`,
            }}
          >
            {getChannelIcon(template.channel)}
          </Box>
          <Box>
            <Typography variant="subtitle2" fontWeight="600" sx={{ mb: 0.5 }}>
              {template.name}
            </Typography>
            {template.is_system && (
              <Chip 
                label="System" 
                size="small" 
                color="info" 
                variant="filled"
                sx={{
                  height: 20,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                }}
              />
            )}
          </Box>
        </Box>
        );
      }
    },
    {
      key: 'channel',
      label: 'Channel',
      render: (value, _) => (
        <Chip
          label={String(value)}
          size="small"
          variant="outlined"
          color={value === 'EMAIL' ? 'primary' : 'secondary'}
          sx={{
            fontWeight: 500,
            borderWidth: 1.5,
          }}
        />
      )
    },
    {
      key: 'category',
      label: 'Category',
      render: (value, _) => (
        <Chip
          label={String(value)}
          size="small"
          color={getCategoryColor(String(value)) as 'primary' | 'secondary' | 'default'}
          variant="outlined"
          sx={{
            fontWeight: 500,
            borderWidth: 1.5,
          }}
        />
      )
    },
    {
      key: 'subject_template',
      label: 'Subject/Content',
      render: (value, _) => (
        <Box>
          {value ? (
            <Tooltip title={String(value)} arrow>
              <Typography 
                variant="body2" 
                color="text.primary"
                sx={{
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontWeight: 500,
                }}
              >
                {String(value)}
              </Typography>
            </Tooltip>
          ) : (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              No subject
            </Typography>
          )}
        </Box>
      )
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      sortable: true,
      render: (value, _) => (
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight="500">
            {new Date(String(value)).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(String(value)).toLocaleTimeString()}
          </Typography>
        </Box>
      )
    }
  ];

  // Define table actions for ModernTable
  const actions: ModernTableAction[] = [
    {
      label: 'Preview Template',
      icon: <PreviewIcon fontSize="small" />,
      onClick: (row) => onPreviewClick(row as unknown as CommunicationTemplate),
      color: 'secondary'
    },
    {
      label: 'Edit Template',
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => onEditClick(row as unknown as CommunicationTemplate),
      color: 'primary'
    },
    {
      label: 'Delete Template',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (row) => handleDeleteClick(row as unknown as CommunicationTemplate),
      color: 'error',
      show: (row) => {
        const template = row as unknown as CommunicationTemplate;
        return template && !template.is_system;
      }
    }
  ];

  const hasActiveFilters = Object.values(filters).some(value => value);
  const filteredTemplatesCount = templates?.length || 0;

  // Modern empty states using ModernEmptyState
  const renderNoTemplatesState = () => (
    <ModernEmptyState
      icon={MessageIcon}
      title="No Communication Templates Yet"
      description="Communication templates help you send consistent, professional messages to your clients. Create your first template to get started with automated communications."
      primaryAction={{
        label: 'Create Your First Template',
        onClick: onCreateClick,
        icon: <AddIcon />,
        color: 'primary'
      }}
      tip={{
        text: "You can create templates for email communications, SMS messages, and automated workflows. System templates for admin invitations are created automatically.",
        type: 'info'
      }}
      size="large"
      color="primary"
      illustration="gradient"
    />
  );

  const renderNoResultsState = () => (
    <ModernEmptyState
      icon={SearchOffIcon}
      title="No Templates Match Your Filters"
      description="Try adjusting your search criteria or clearing filters to see more templates."
      primaryAction={{
        label: 'Clear All Filters',
        onClick: handleClearFilters,
        icon: <FilterIcon />,
        color: 'secondary'
      }}
      size="medium"
      color="secondary"
    />
  );

  if (isLoading) {
    return (
      <ModernLoadingStates.ModernTableSkeleton
        rows={5}
        columns={6}
        hasHeader
      />
    );
  }

  // Show appropriate empty state
  if (!templates || templates.length === 0) {
    return (
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h5" fontWeight="bold">
            Communication Templates
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={onCreateClick}
          >
            Create Template
          </Button>
        </Box>

        {hasActiveFilters ? renderNoResultsState() : renderNoTemplatesState()}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight="bold">
            Communication Templates
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {filteredTemplatesCount} template{filteredTemplatesCount !== 1 ? 's' : ''} found
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onCreateClick}
        >
          Create Template
        </Button>
      </Box>

      {/* Modern Filters */}
      <Box sx={{ mb: 4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search templates..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            sx={{
              flex: 1,
              minWidth: 250,
              '& .MuiOutlinedInput-root': {
                ...glassPresets.light,
                borderRadius: tokens.spacing.radius.lg,
                border: `1px solid ${tokens.color.borders.glass}`,
                '&:hover': {
                  border: `1px solid ${tokens.color.primary[300]}`,
                },
                '&.Mui-focused': {
                  border: `1px solid ${tokens.color.primary[500]}`,
                  boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: tokens.color.primary[600] }} />
                </InputAdornment>
              ),
            }}
          />
          
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={filters.category || ''}
              label="Category"
              onChange={(e) => handleFilterChange('category', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  ...glassPresets.light,
                  borderRadius: tokens.spacing.radius.lg,
                },
              }}
            >
              <MenuItem value="">All Categories</MenuItem>
              <MenuItem value="SYSTEM">System</MenuItem>
              <MenuItem value="MANUAL">Manual</MenuItem>
              <MenuItem value="AUTO">Auto</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Channel</InputLabel>
            <Select
              value={filters.channel || ''}
              label="Channel"
              onChange={(e) => handleFilterChange('channel', e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  ...glassPresets.light,
                  borderRadius: tokens.spacing.radius.lg,
                },
              }}
            >
              <MenuItem value="">All Channels</MenuItem>
              <MenuItem value="EMAIL">Email</MenuItem>
              <MenuItem value="SMS">SMS</MenuItem>
            </Select>
          </FormControl>
          
          <Box display="flex" gap={1}>
            {hasActiveFilters && (
              <Button
                variant="outlined"
                size="small"
                onClick={handleClearFilters}
                startIcon={<FilterIcon />}
                sx={{
                  ...glassPresets.light,
                  border: `1px solid ${tokens.color.neutral[300]}`,
                  borderRadius: tokens.spacing.radius.full,
                  '&:hover': {
                    ...glassPresets.medium,
                  },
                }}
              >
                Clear
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={() => window.location.reload()}
              startIcon={<RefreshIcon />}
              sx={{
                ...glassPresets.light,
                border: `1px solid ${tokens.color.neutral[300]}`,
                borderRadius: tokens.spacing.radius.full,
                '&:hover': {
                  ...glassPresets.medium,
                },
              }}
            >
              Refresh
            </Button>
          </Box>
        </Stack>
      </Box>

      {/* Modern Table */}
      <ModernTable
        columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
        data={(templates || []) as unknown as Record<string, unknown>[]}
        actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
        onRowClick={(row) => onEditClick(row as unknown as CommunicationTemplate)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        loading={isLoading}
        emptyState={hasActiveFilters ? renderNoResultsState() : renderNoTemplatesState()}
      />


      {/* Modern Delete Confirmation Dialog */}
      <ModernDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        title="Delete Communication Template"
        maxWidth="sm"
        fullWidth
        actions={createDeleteActions(handleDeleteCancel, handleDeleteConfirm, isDeleting)}
      >
        <Typography sx={{ fontSize: '1rem', lineHeight: 1.6 }}>
          Are you sure you want to delete <strong>"{templateToDelete?.name}"</strong>? This action cannot be undone.
        </Typography>
      </ModernDialog>
    </Box>
  );
};