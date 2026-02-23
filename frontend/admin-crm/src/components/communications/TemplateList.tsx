// frontend/admin-crm/src/components/communications/TemplateList.tsx

import React, { useState } from 'react';
import { Box, Chip, Typography, Tooltip } from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Preview as PreviewIcon,
  Email as EmailIcon,
  Sms as SmsIcon,
  Message as MessageIcon,
  SearchOff as SearchOffIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useCommunications } from '../../hooks/useCommunications';
import type { CommunicationTemplate, CommunicationFilters } from '../../types/communications.types';
import {
  ModernEmptyState,
  ModernLoadingStates,
  ModernTable,
  ModernDialog,
  createDeleteActions,
} from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common/ModernTable';
import { tokens } from '../../design-system';

interface TemplateListProps {
  searchQuery?: string;
  onEditClick: (template: CommunicationTemplate) => void;
  onPreviewClick: (template: CommunicationTemplate) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({
  searchQuery = '',
  onEditClick,
  onPreviewClick,
}) => {
  const [filters, setFilters] = useState<CommunicationFilters>({});
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<CommunicationTemplate | null>(null);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const { useTemplates, useDeleteTemplate } = useCommunications();

  // Apply search filter along with other filters
  const searchFilters = {
    ...filters,
    ...(searchQuery && { search: searchQuery }),
  };

  const { data: allTemplates, isLoading } = useTemplates(searchFilters);
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();

  // Filter templates based on search query if API doesn't support it
  const templates =
    allTemplates?.filter((template) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.channel.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.subject_template?.toLowerCase().includes(query) ||
        false
      );
    }) || [];

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
      deleteTemplate(templateToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setTemplateToDelete(null);
          setSelectedTemplate(null);
        },
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
    setSelectedTemplate(null);
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const getChannelIcon = (channel: string) => {
    return channel === 'EMAIL' ? <EmailIcon /> : <SmsIcon />;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'SYSTEM':
        return 'primary';
      case 'AUTO':
        return 'secondary';
      case 'MANUAL':
        return 'default';
      default:
        return 'default';
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
      },
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
      ),
    },
    {
      key: 'category',
      label: 'Category',
      hideBelow: 'md',
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
      ),
    },
    {
      key: 'subject_template',
      label: 'Subject/Content',
      hideBelow: 'lg',
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
      ),
    },
    {
      key: 'updated_at',
      label: 'Last Updated',
      sortable: true,
      hideBelow: 'lg',
      render: (value, _) => (
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight="500">
            {new Date(String(value)).toLocaleDateString()}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {new Date(String(value)).toLocaleTimeString()}
          </Typography>
        </Box>
      ),
    },
  ];

  // Define table actions for ModernTable
  const actions: ModernTableAction[] = [
    {
      label: 'Preview Template',
      icon: <PreviewIcon fontSize="small" />,
      onClick: (row) => onPreviewClick(row as unknown as CommunicationTemplate),
      color: 'secondary',
    },
    {
      label: 'Edit Template',
      icon: <EditIcon fontSize="small" />,
      onClick: (row) => onEditClick(row as unknown as CommunicationTemplate),
      color: 'primary',
    },
    {
      label: 'Delete Template',
      icon: <DeleteIcon fontSize="small" />,
      onClick: (row) => handleDeleteClick(row as unknown as CommunicationTemplate),
      color: 'error',
      show: (row) => {
        const template = row as unknown as CommunicationTemplate;
        return template && !template.is_system;
      },
    },
  ];

  const hasActiveFilters = Object.values(filters).some((value) => value);
  const filteredTemplatesCount = templates?.length || 0;

  // Modern empty states using ModernEmptyState
  const renderNoTemplatesState = () => (
    <ModernEmptyState
      icon={MessageIcon}
      title="No Communication Templates Yet"
      description="Communication templates help you send consistent, professional messages to your clients. Use the Create Template button above to get started with automated communications."
      tip={{
        text: 'You can create templates for email communications, SMS messages, and automated workflows. System templates for admin invitations are created automatically.',
        type: 'info',
      }}
      size="large"
      color="primary"
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
        color: 'secondary',
      }}
      size="medium"
      color="secondary"
    />
  );

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton rows={5} columns={6} hasHeader />;
  }

  // Show appropriate empty state
  if (!templates || templates.length === 0) {
    return (
      <Box>
        {hasActiveFilters || searchQuery ? renderNoResultsState() : renderNoTemplatesState()}
      </Box>
    );
  }

  return (
    <Box>
      {/* Results Summary */}
      {(searchQuery || hasActiveFilters) && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary">
            {searchQuery ? `Search results for "${searchQuery}" - ` : ''}
            {filteredTemplatesCount} template
            {filteredTemplatesCount !== 1 ? 's' : ''} found
            {hasActiveFilters && ' with current filters'}
          </Typography>
        </Box>
      )}

      {/* Modern Table with Embedded Filters */}
      <ModernTable
        columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
        data={(templates || []) as unknown as Record<string, unknown>[]}
        actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
        onRowClick={(row) => onEditClick(row as unknown as CommunicationTemplate)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        loading={isLoading}
        emptyState={
          hasActiveFilters || searchQuery ? renderNoResultsState() : renderNoTemplatesState()
        }
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
          Are you sure you want to delete <strong>"{templateToDelete?.name}"</strong>? This action
          cannot be undone.
        </Typography>
      </ModernDialog>
    </Box>
  );
};
