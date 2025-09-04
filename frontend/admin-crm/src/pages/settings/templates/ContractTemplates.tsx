// frontend/admin-crm/src/pages/settings/templates/ContractTemplates.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  InputAdornment,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Description as ContractIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { ContractTemplatesTable } from '../../../components/contracts/ContractTemplatesTable';
import { ContractTemplateForm } from '../../../components/contracts/ContractTemplateForm';
import {
  useContractTemplates,
  useCreateContractTemplate,
  useUpdateContractTemplate,
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
import { ModernPageHeader, type HeaderAction, createRefreshAction, createAddAction } from '../../../components/common/ModernPageHeader';
import { ModernEmptyState } from '../../../components/common/ModernEmptyState';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

type ViewMode = 'list' | 'create' | 'edit';

export const ContractTemplates: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<ContractTemplateFilters>({});
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchField, setShowSearchField] = useState(false);

  // Set breadcrumbs
  useEffect(() => {
    const baseBreadcrumbs = [
      { label: 'Settings', path: '/settings' },
      { label: 'Templates' },
      { label: 'Contract Templates', path: '/settings/templates/contract-templates' },
    ];

    if (viewMode === 'create') {
      setBreadcrumbs([...baseBreadcrumbs, { label: 'Create Contract Template' }]);
    } else if (viewMode === 'edit' && editingTemplate) {
      setBreadcrumbs([...baseBreadcrumbs, { label: editingTemplate.name }]);
    } else {
      setBreadcrumbs(baseBreadcrumbs);
    }
  }, [setBreadcrumbs, viewMode, editingTemplate]);

  // Queries and mutations
  const { data: templates = [], isLoading, error, refetch } = useContractTemplates(filters);

  const createTemplateMutation = useCreateContractTemplate();
  const updateTemplateMutation = useUpdateContractTemplate();
  const deleteTemplateMutation = useDeleteContractTemplate();

  // Handlers

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Update filters to include search
    setFilters(prev => ({
      ...prev,
      search: query || undefined
    }));
  };

  const handleToggleSearch = () => {
    setShowSearchField(!showSearchField);
    if (!showSearchField) {
      setSearchQuery('');
      setFilters(prev => ({ ...prev, search: undefined }));
    }
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

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

  // Error state
  if (error) {
    return (
      <ModernSettingsLayout>
        <ModernCard
          variant="glass"
          color="error"
          size="medium"
          animation="fade"
        >
          <Alert 
            severity="error"
            sx={{
              backgroundColor: 'transparent',
              border: 'none',
              '& .MuiAlert-message': {
                color: tokens.color.error[700],
              },
            }}
          >
            Failed to load contract templates. Please try refreshing the page.
          </Alert>
        </ModernCard>
      </ModernSettingsLayout>
    );
  }

  // Form view (create or edit)
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ModernSettingsLayout>
        {/* Modern Back button */}
        <Box mb={4}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToList}
            disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            sx={{
              ...glassPresets.light,
              border: `1px solid ${tokens.color.neutral[300]}`,
              borderRadius: tokens.spacing.radius.full,
              px: 3,
              py: 1.25,
              fontWeight: 600,
              color: tokens.color.neutral[700],
              transition: createTransition(['transform', 'background'], 'fast'),
              
              '&:hover': {
                ...glassPresets.medium,
                transform: 'translateY(-1px)',
              },
            }}
          >
            Back to Contract Templates
          </Button>
        </Box>

        {/* Form */}
        <ModernCard
          variant="glass"
          size="large"
          animation="fade"
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

  // Calculate stats
  const signingTemplates = templates.filter(t => t.requires_signature).length;
  
  // Header actions
  const headerActions: HeaderAction[] = [
    {
      icon: <SearchIcon />,
      label: showSearchField ? 'Hide Search' : 'Search',
      onClick: handleToggleSearch,
      variant: 'icon',
      tooltip: showSearchField ? 'Hide search field' : 'Search contract templates',
    },
    createRefreshAction(() => refetch()),
  ];

  const primaryAction = createAddAction('New Template', handleCreateNew, 'primary');

  // List view - Always show table structure
  return (
    <ModernSettingsLayout>
      {/* Modern Header */}
      <ModernPageHeader
        title="Contract Templates"
        subtitle="Manage contract templates for legal agreements"
        icon={<ContractIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Templates' },
          { label: 'Contract Templates' },
        ]}
        primaryAction={primaryAction}
        secondaryActions={headerActions}
        stats={[
          { label: 'Total Templates', value: templates.length },
          { label: 'Signature Required', value: signingTemplates },
          { label: 'Amendment Allowed', value: templates.filter(t => t.allows_amendments).length },
        ]}
        size="medium"
        gradient
        glass
      />

      {/* Search Field - Conditionally Shown */}
      {showSearchField && (
        <Box sx={{ mb: 4 }}>
          <ModernCard
            variant="glass"
            size="large"
            color="primary"
            animation="fade"
            sx={{
              '&::before': {
                background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.primary[600]}03 100%)`,
              },
            }}
          >
            <Box sx={{ position: 'relative' }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  color: tokens.color.neutral[800],
                  fontWeight: 600,
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <SearchIcon sx={{ color: tokens.color.primary[600] }} />
                Search Contract Templates
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: tokens.color.neutral[600],
                  mb: 3,
                }}
              >
                Find templates by name, description, event type, or content
              </Typography>

              <TextField
                fullWidth
                placeholder="Search by name, description, event type..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                autoFocus
                sx={{
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
        </Box>
      )}

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
        {templates.length === 0 ? (
          <ModernEmptyState
            icon={ContractIcon}
            title={hasActiveFilters ? 'No templates match your filters' : 'No Contract Templates Yet'}
            description={hasActiveFilters 
              ? 'Try adjusting your search criteria or clear the filters'
              : 'Create your first contract template to standardize legal agreements and streamline contract generation for events.'
            }
            primaryAction={{
              label: hasActiveFilters ? 'Clear Filters' : 'Create Template',
              onClick: hasActiveFilters ? handleClearFilters : handleCreateNew,
              icon: hasActiveFilters ? <FilterIcon /> : <AddIcon />,
              color: 'primary',
            }}
            tip={{
              text: "Contract templates help maintain legal consistency and speed up the contract creation process",
              type: "info",
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
          <DialogContentText sx={{ color: tokens.color.neutral[700] }}>
            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
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
                background: `linear-gradient(135deg, ${tokens.color.error[600]} 0%, ${tokens.color.error[700]} 100())`,
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