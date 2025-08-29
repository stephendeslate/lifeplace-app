// frontend/admin-crm/src/pages/settings/commerce/Sales.tsx

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
  Fade,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Receipt as SalesIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { QuoteTemplatesTable } from '../../../components/sales/QuoteTemplatesTable';
import { QuoteTemplateForm } from '../../../components/sales/QuoteTemplateForm';
import {
  useQuoteTemplates,
  useCreateQuoteTemplate,
  useUpdateQuoteTemplate,
  useDeleteQuoteTemplate,
} from '../../../hooks/useSales';
import type {
  QuoteTemplate,
  CreateQuoteTemplateData,
  QuoteTemplateFilters,
} from '../../../types/sales.types';

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader, createRefreshAction, createAddAction } from '../../../components/common/ModernPageHeader';
import { ModernEmptyState } from '../../../components/common/ModernEmptyState';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';
import { createTransition } from '../../../design-system/utils/animations';

type ViewMode = 'list' | 'create' | 'edit';

export const Sales: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters] = useState<QuoteTemplateFilters>({});
  const [editingTemplate, setEditingTemplate] = useState<QuoteTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<QuoteTemplate | null>(null);

  // Set breadcrumbs
  useEffect(() => {
    const baseBreadcrumbs = [
      { label: 'Settings', path: '/settings' },
      { label: 'Commerce' },
      { label: 'Sales', path: '/settings/commerce/sales' },
    ];

    if (viewMode === 'create') {
      setBreadcrumbs([...baseBreadcrumbs, { label: 'Create Quote Template' }]);
    } else if (viewMode === 'edit' && editingTemplate) {
      setBreadcrumbs([...baseBreadcrumbs, { label: editingTemplate.name }]);
    } else {
      setBreadcrumbs(baseBreadcrumbs);
    }
  }, [setBreadcrumbs, viewMode, editingTemplate]);

  // Queries and mutations
  const { data: templates = [], isLoading, error, refetch } = useQuoteTemplates({
    ...filters,
    search: searchQuery || undefined,
  });

  const createTemplateMutation = useCreateQuoteTemplate();
  const updateTemplateMutation = useUpdateQuoteTemplate();
  const deleteTemplateMutation = useDeleteQuoteTemplate();

  // Handlers
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setViewMode('create');
  };

  const handleEdit = (template: QuoteTemplate) => {
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


  const handleDuplicate = (template: QuoteTemplate) => {
    const duplicateData: CreateQuoteTemplateData = {
      name: `${template.name} (Copy)`,
      introduction: template.introduction,
      event_type: template.event_type,
      terms_and_conditions: template.terms_and_conditions,
      is_active: template.is_active,
      default_validity_days: template.default_validity_days,
      has_multiple_options: template.has_multiple_options,
      default_tax_rate: template.default_tax_rate,
      workflow_template: template.workflow_template,
      products: template.products?.map(p => ({
        product: p.product,
        quantity: p.quantity,
        is_required: p.is_required,
      })) || [],
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
            Failed to load quote templates. Please try refreshing the page.
          </Alert>
        </ModernCard>
      </ModernSettingsLayout>
    );
  }

  // Form view (create or edit)
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ModernSettingsLayout>
        <Fade in>
          <Box>
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
                Back to Quote Templates
              </Button>
            </Box>

            {/* Form */}
            <ModernCard
              variant="glass"
              size="large"
              animation="fade"
            >
              <QuoteTemplateForm
                template={editingTemplate || undefined}
                onSave={handleFormSave}
                onCancel={handleBackToList}
              />
            </ModernCard>
          </Box>
        </Fade>
      </ModernSettingsLayout>
    );
  }

  // Calculate stats
  const activeTemplates = templates.filter(t => t.is_active).length;
  
  // Header actions
  const headerActions = [
    createRefreshAction(() => refetch()),
  ];

  const primaryAction = createAddAction('New Template', handleCreateNew, 'primary');

  // List view - Always show table structure
  return (
    <ModernSettingsLayout>
      <Fade in>
        <Box>
          {/* Modern Header */}
          <ModernPageHeader
            title="Sales & Quote Templates"
            subtitle="Manage quote templates for client proposals"
            icon={<SalesIcon />}
            breadcrumbs={[
              { label: 'Settings' },
              { label: 'Commerce' },
              { label: 'Sales' },
            ]}
            primaryAction={primaryAction}
            secondaryActions={headerActions}
            stats={[
              { label: 'Total Templates', value: templates.length },
              { label: 'Active Templates', value: activeTemplates },
              { label: 'Inactive Templates', value: templates.length - activeTemplates },
            ]}
            size="medium"
            gradient
            glass
          />

          {/* Search and Filters */}
          <ModernCard
            variant="glass"
            size="small"
            animation="none"
            sx={{ mb: 4 }}
          >
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                placeholder="Search quote templates..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
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
            {templates.length === 0 && !isLoading ? (
              <ModernEmptyState
                icon={SalesIcon}
                title="No Quote Templates Yet"
                description="Create your first quote template to streamline your sales process and generate professional proposals for clients."
                primaryAction={{
                  label: "Create Template",
                  onClick: handleCreateNew,
                  icon: <AddIcon />,
                  color: "primary",
                }}
                tip={{
                  text: "Templates help maintain consistency and save time when creating quotes for clients",
                  type: "info",
                }}
                size="medium"
                illustration="gradient"
              />
            ) : (
              <QuoteTemplatesTable
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
              Delete Quote Template
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
        </Box>
      </Fade>
    </ModernSettingsLayout>
  );
};