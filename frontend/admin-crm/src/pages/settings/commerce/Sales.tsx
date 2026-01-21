// frontend/admin-crm/src/pages/settings/commerce/Sales.tsx

import React, { useState, useMemo, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Assignment as TemplateIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import {
  useQuoteTemplates,
  useCreateQuoteTemplate,
  useUpdateQuoteTemplate,
  useDeleteQuoteTemplate,
} from '../../../hooks/useSales';
import {
  ModernPageHeader,
  ModernDialog,
  createDeleteActions,
  ModernSettingsLayout
} from '../../../components/common';
import { createAddAction, createRefreshAction } from '../../../components/common/ModernPageHeader';
import { QuoteTemplatesTable } from '../../../components/sales/QuoteTemplatesTable';
import { QuoteTemplateFormDialog } from '../../../components/sales/QuoteTemplateFormDialog';
import type {
  QuoteTemplate,
  CreateQuoteTemplateData,
  UpdateQuoteTemplateData,
  QuoteTemplateFilters,
} from '../../../types/sales.types';

export const Sales: React.FC = () => {
  const { setBreadcrumbs } = useLayout();

  // Quote Templates state
  const [templateSearch, setTemplateSearch] = useState('');
  const [templateActiveFilter, _setTemplateActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showSearchField, setShowSearchField] = useState(false);

  // Dialog states
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings' },
      { label: 'Commerce' },
      { label: 'Sales' },
    ]);
  }, [setBreadcrumbs]);

  // Create filters for API calls
  const templateFilters = useMemo((): QuoteTemplateFilters => ({
    search: templateSearch || undefined,
    is_active: templateActiveFilter === 'all' ? undefined : templateActiveFilter === 'active',
  }), [templateSearch, templateActiveFilter]);

  // Quote Templates hooks
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuoteTemplates(templateFilters);
  const { mutate: createTemplate, isPending: isCreatingTemplate } = useCreateQuoteTemplate();
  const { mutate: updateTemplate, isPending: isUpdatingTemplate } = useUpdateQuoteTemplate();
  const { mutate: deleteTemplate, isPending: isDeletingTemplate } = useDeleteQuoteTemplate();

  // Event handlers
  const handleCreateNew = () => {
    setEditingTemplate(null);
    setTemplateDialogOpen(true);
  };

  const handleSearch = (query: string) => {
    setTemplateSearch(query);
  };

  const handleToggleSearch = () => {
    setShowSearchField(!showSearchField);
    if (!showSearchField) {
      setTemplateSearch('');
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleEditTemplate = (template: QuoteTemplate) => {
    setEditingTemplate(template);
    setTemplateDialogOpen(true);
  };

  const handleDeleteTemplate = (id: number) => {
    const template = templates.find(t => t.id === id);
    if (template) {
      setItemToDelete({
        id,
        name: template.name
      });
      setDeleteDialogOpen(true);
    }
  };

  const handleTemplateSubmit = (data: CreateQuoteTemplateData | UpdateQuoteTemplateData) => {
    if (editingTemplate) {
      updateTemplate({ id: editingTemplate.id, data: data as UpdateQuoteTemplateData });
    } else {
      createTemplate(data as CreateQuoteTemplateData);
    }
    setTemplateDialogOpen(false);
  };

  // Delete handlers
  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;

    deleteTemplate(itemToDelete.id);
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  // Header actions
  const headerActions = [
    {
      icon: <SearchIcon />,
      label: showSearchField ? 'Hide Search' : 'Search',
      onClick: handleToggleSearch,
      variant: 'icon' as const,
      tooltip: showSearchField ? 'Hide search field' : 'Search quote templates',
    },
    createRefreshAction(handleRefresh),
  ];

  const primaryAction = createAddAction('New Template', handleCreateNew, 'primary');

  return (
    <ModernSettingsLayout>
      {/* Header */}
      <ModernPageHeader
        title="Quote Templates"
        subtitle="Create and manage standardized quote templates for your events"
        icon={<TemplateIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Commerce' },
          { label: 'Sales' },
        ]}
        primaryAction={primaryAction}
        secondaryActions={headerActions}
        stats={[
          { label: 'Total Templates', value: templates.length },
          { label: 'Active Templates', value: templates.filter(t => t.is_active).length },
          { label: 'Inactive Templates', value: templates.filter(t => !t.is_active).length },
        ]}
        size="medium"
      />

      {/* Search Field - Conditionally Shown */}
      {showSearchField && (
        <Box sx={{ mb: 4, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <SearchIcon color="primary" />
            <Typography variant="h6" fontWeight="600">
              Search Quote Templates
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Find templates by name, description, or content
          </Typography>
          <TextField
            fullWidth
            placeholder="Search by name, description, or content..."
            value={templateSearch}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Quote Templates Section */}
      <Box sx={{ mb: 3, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
        {/* Templates Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          Quote templates allow you to create standardized quotes quickly.
          Define products, pricing, terms, and workflows that can be applied to events.
        </Alert>

        {/* Templates Table */}
        <QuoteTemplatesTable
          templates={templates}
          isLoading={isLoadingTemplates}
          onEdit={handleEditTemplate}
          onDelete={handleDeleteTemplate}
          isDeleting={isDeletingTemplate}
        />
      </Box>

      {/* Dialogs */}
      <QuoteTemplateFormDialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        editingTemplate={editingTemplate}
        onSubmit={handleTemplateSubmit}
        isLoading={isCreatingTemplate || isUpdatingTemplate}
      />

      {/* Delete Confirmation Dialog */}
      <ModernDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        title="Delete Quote Template"
        maxWidth="sm"
        fullWidth
        actions={createDeleteActions(handleDeleteCancel, handleDeleteConfirm, isDeletingTemplate)}
      >
        <Typography>
          Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
        </Typography>
      </ModernDialog>
    </ModernSettingsLayout>
  );
};
