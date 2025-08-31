// frontend/admin-crm/src/pages/settings/templates/ContractTemplates.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Description as ContractIcon,
  List as ListIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { ContractTemplatesTable } from '../../../components/contracts/ContractTemplatesTable';
import { ContractTemplateForm } from '../../../components/contracts/ContractTemplateForm';
import {
  useContractTemplates,
  useCreateContractTemplate,
  useDeleteContractTemplate,
} from '../../../hooks/useContracts';
import type {
  ContractTemplate,
  CreateContractTemplateData,
  ContractTemplateFilters,
} from '../../../types/contracts.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader, createAddAction, createRefreshAction } from '../../../components/common/ModernPageHeader';
import { ModernEmptyState } from '../../../components/common/ModernEmptyState';
import ModernLoadingStates from '../../../components/common/ModernLoadingStates';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

type ViewMode = 'list' | 'create' | 'edit';

export const ContractTemplates: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters] = useState<ContractTemplateFilters>({});
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);

  // Set breadcrumbs
  useEffect(() => {
    const baseBreadcrumbs = [
      { label: 'Settings' },
      { label: 'Templates' },
      { label: 'Contracts' },
    ];

    if (viewMode === 'create') {
      setBreadcrumbs([...baseBreadcrumbs, { label: 'Create Template' }]);
    } else if (viewMode === 'edit' && editingTemplate) {
      setBreadcrumbs([...baseBreadcrumbs, { label: editingTemplate.name }]);
    } else {
      setBreadcrumbs(baseBreadcrumbs);
    }
  }, [setBreadcrumbs, viewMode, editingTemplate]);

  // Queries and mutations
  const { data: templates = [], isLoading, error } = useContractTemplates({
    ...filters,
    search: searchQuery || undefined,
  });

  const createTemplateMutation = useCreateContractTemplate();
  const deleteTemplateMutation = useDeleteContractTemplate();

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setViewMode('create');
  };

  const handleEdit = (template: ContractTemplate) => {
    setEditingTemplate(template);
    setViewMode('edit');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setEditingTemplate(null);
  };

  const handleDelete = (id: number) => {
    const template = templates.find(t => t.id === id);
    if (template) {
      setTemplateToDelete(template);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (templateToDelete) {
      deleteTemplateMutation.mutate(templateToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setTemplateToDelete(null);
        }
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTemplateToDelete(null);
  };

  const handleFormSave = () => {
    // The form component will handle the actual save logic
    // We just need to navigate back to the list
    handleBackToList();
  };


  const handleDuplicate = (template: ContractTemplate) => {
    const duplicateData: CreateContractTemplateData = {
      name: `${template.name} (Copy)`,
      description: template.description,
      event_type: template.event_type,
      content: template.content,
      variables: template.variables,
      requires_signature: template.requires_signature,
      sections: template.sections,
      signature_requirements: template.signature_requirements,
      requires_witness: template.requires_witness,
      requires_company_signature: template.requires_company_signature,
      allows_amendments: template.allows_amendments,
      amendment_requires_signature: template.amendment_requires_signature,
    };

    createTemplateMutation.mutate(duplicateData);
  };

  // Modern header actions for different view modes
  const getHeaderActions = () => {
    const actions = [];
    
    if (viewMode === 'list') {
      actions.push(createAddAction('Create Template', handleCreateNew, 'primary'));
      actions.push(createRefreshAction(() => window.location.reload()));
    } else {
      actions.push({
        icon: <ListIcon />,
        label: 'Back to List',
        variant: 'outlined' as const,
        onClick: handleBackToList,
        tooltip: 'Return to template list',
      });
    }
    
    return actions;
  };

  const getHeaderTitle = () => {
    switch (viewMode) {
      case 'create':
        return 'Create Contract Template';
      case 'edit':
        return `Edit Template: ${editingTemplate?.name || ''}`;
      default:
        return 'Contract Templates';
    }
  };

  const getHeaderSubtitle = () => {
    switch (viewMode) {
      case 'create':
        return 'Create a new contract template for events';
      case 'edit':
        return 'Modify the contract template content and settings';
      default:
        return 'Manage contract templates for different event types';
    }
  };

  // Error state
  if (error) {
    return (
      <ModernSettingsLayout>
        <ModernCard
          variant="glass"
          color="error"
          size="medium"
          animation="none"
        >
          <ModernEmptyState
            icon={ContractIcon}
            title="Failed to Load Templates"
            description="Unable to load contract templates. Please check your connection and try again."
            variant="error"
            primaryAction={{
              label: "Refresh Page",
              onClick: () => window.location.reload(),
              icon: <RefreshIcon />,
              color: "error",
            }}
            size="medium"
          />
        </ModernCard>
      </ModernSettingsLayout>
    );
  }

  // Form view (create or edit)
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ModernSettingsLayout>
        {/* Modern Header */}
        <ModernPageHeader
          title={getHeaderTitle()}
          subtitle={getHeaderSubtitle()}
          icon={<ContractIcon />}
          breadcrumbs={[
            { label: 'Settings' },
            { label: 'Templates' },
            { label: 'Contracts' },
            { label: viewMode === 'create' ? 'Create Template' : editingTemplate?.name || 'Edit' },
          ]}
          secondaryActions={getHeaderActions()}
          size="medium"
          gradient
          glass
        />

        {/* Form */}
        <ModernCard
          variant="glass"
          size="large"
          animation="none"
          sx={{
            overflow: 'visible',
            position: 'relative',
          }}
        >
          <ContractTemplateForm
            template={editingTemplate || undefined}
            onSave={handleFormSave}
            onCancel={handleBackToList}
          />
        </ModernCard>
      </ModernSettingsLayout>
    );
  }

  // List view
  return (
    <ModernSettingsLayout>
      {/* Modern Header */}
      <ModernPageHeader
        title={getHeaderTitle()}
        subtitle={getHeaderSubtitle()}
        icon={<ContractIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Templates' },
          { label: 'Contract Templates' },
        ]}
        primaryAction={getHeaderActions().find(a => a.label === 'Create Template')}
        secondaryActions={getHeaderActions().filter(a => a.label !== 'Create Template')}
        stats={[
          { label: 'Total Templates', value: templates.length },
        ]}
        size="medium"
        gradient
        glass
      />

      {/* Search and Filters */}
      <ModernCard
        variant="glass"
        size="medium"
        animation="none"
        sx={{ mb: 4 }}
      >
        <Box display="flex" gap={2} alignItems="center">
          <TextField
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            variant="outlined"
            size="small"
            sx={{
              flex: 1,
              minWidth: 300,
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
        </Box>
      </ModernCard>

      {/* Templates Table */}
      <ModernCard
        variant="glass"
        size="large"
        animation="none"
        sx={{
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {isLoading ? (
          <ModernLoadingStates.ModernTableSkeleton
            rows={5}
            columns={6}
          />
        ) : templates.length === 0 ? (
          <ModernEmptyState
            icon={ContractIcon}
            title={searchQuery ? 'No templates match your search' : 'No contract templates found'}
            description={searchQuery 
              ? 'Try adjusting your search criteria or create a new template'
              : 'Create your first contract template to get started with automated contract generation'
            }
            primaryAction={{
              label: searchQuery ? 'Clear Search' : 'Create Template',
              onClick: searchQuery ? () => setSearchQuery('') : handleCreateNew,
              icon: searchQuery ? <FilterIcon /> : <AddIcon />,
              color: 'primary',
            }}
            tip={{
              text: 'Contract templates help standardize legal documents across your events',
              type: 'info',
            }}
            size="medium"
            illustration="gradient"
          />
        ) : (
          <ContractTemplatesTable
            templates={templates}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            isDeleting={deleteTemplateMutation.isPending}
          />
        )}
      </ModernCard>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        PaperProps={{
          sx: {
            ...glassPresets.light,
            borderRadius: tokens.spacing.radius.xxl,
            border: `1px solid ${tokens.color.borders.glass}`,
            background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
          },
        }}
      >
        <DialogTitle 
          sx={{ 
            background: `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[500]} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 700,
          }}
        >
          Delete Contract Template
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: tokens.color.neutral[700], mb: 2 }}>
            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone and will affect any contracts using this template.
          </DialogContentText>
          {templateToDelete && (
            <ModernCard
              variant="glass"
              color="error"
              size="small"
              animation="none"
              sx={{ mt: 2 }}
            >
              <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                <strong>Template:</strong> {templateToDelete.name}
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                <strong>Event Type:</strong> {templateToDelete.event_type_name || 'All Types'}
              </Typography>
              <Typography variant="body2" sx={{ color: tokens.color.neutral[600] }}>
                <strong>Created:</strong> {new Date(templateToDelete.created_at).toLocaleDateString()}
              </Typography>
            </ModernCard>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={deleteTemplateMutation.isPending}
            sx={{
              ...glassPresets.light,
              border: `1px solid ${tokens.color.neutral[300]}`,
              borderRadius: tokens.spacing.radius.full,
              px: 3,
              '&:hover': {
                ...glassPresets.medium,
              },
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={deleteTemplateMutation.isPending}
            sx={{
              background: `linear-gradient(135deg, ${tokens.color.error[500]} 0%, ${tokens.color.error[600]} 100%)`,
              borderRadius: tokens.spacing.radius.full,
              px: 4,
              boxShadow: `0 8px 32px ${tokens.color.error[500]}25`,
              '&:hover': {
                background: `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[700]} 100%)`,
                boxShadow: `0 12px 40px ${tokens.color.error[500]}35`,
              },
            }}
          >
            {deleteTemplateMutation.isPending ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </ModernSettingsLayout>
  );
};