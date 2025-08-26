// frontend/admin-crm/src/pages/settings/commerce/Sales.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
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
  UpdateQuoteTemplateData,
  QuoteTemplateFilters,
} from '../../../types/sales.types';

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
  const { data: templates = [], isLoading, error } = useQuoteTemplates({
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
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">
          Failed to load quote templates. Please try refreshing the page.
        </Alert>
      </Box>
    );
  }

  // Form view (create or edit)
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <Fade in>
        <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
          {/* Back button */}
          <Box mb={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToList}
              disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
            >
              Back to Quote Templates
            </Button>
          </Box>

          {/* Form */}
          <QuoteTemplateForm
            template={editingTemplate || undefined}
            onSave={handleFormSave}
            onCancel={handleBackToList}
          />
        </Box>
      </Fade>
    );
  }

  // List view - Always show table structure
  return (
    <Fade in>
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Sales & Quote Templates
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage quote templates for client proposals
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            disabled={createTemplateMutation.isPending}
          >
            Create Template
          </Button>
        </Box>

        {/* Search and Filters */}
        <Card elevation={0} sx={{ mb: 3 }}>
          <CardContent>
            <Box display="flex" gap={2} alignItems="center">
              <TextField
                placeholder="Search quote templates..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                variant="outlined"
                size="small"
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                }}
                sx={{ minWidth: 300 }}
              />
            </Box>
          </CardContent>
        </Card>

        {/* Templates Table */}
        <Card elevation={0}>
          <CardContent sx={{ p: 0 }}>
            <QuoteTemplatesTable
              templates={templates}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              isDeleting={deleteTemplateMutation.isPending}
            />
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
        >
          <DialogTitle>Delete Quote Template</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} disabled={deleteTemplateMutation.isPending}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              disabled={deleteTemplateMutation.isPending}
            >
              {deleteTemplateMutation.isPending ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
};