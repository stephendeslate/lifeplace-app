// frontend/admin-crm/src/pages/settings/templates/ContractTemplates.tsx

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
  UpdateContractTemplateData,
  ContractTemplateFilters,
} from '../../../types/contracts.types';

type ViewMode = 'list' | 'create' | 'edit';

export const ContractTemplates: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ContractTemplateFilters>({});
  const [editingTemplate, setEditingTemplate] = useState<ContractTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<ContractTemplate | null>(null);

  // Set breadcrumbs
  useEffect(() => {
    const baseBreadcrumbs = [
      { label: 'Settings', path: '/settings' },
      { label: 'Templates' },
      { label: 'Contracts', path: '/settings/templates/contracts' },
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
  const updateTemplateMutation = useUpdateContractTemplate();
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

  const handleFormSubmit = (data: CreateContractTemplateData | UpdateContractTemplateData) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate(
        { id: editingTemplate.id, data },
        {
          onSuccess: () => {
            handleBackToList();
          }
        }
      );
    } else {
      createTemplateMutation.mutate(data as CreateContractTemplateData, {
        onSuccess: () => {
          handleBackToList();
        }
      });
    }
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
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error">
          Failed to load contract templates. Please try refreshing the page.
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
              Back to Templates
            </Button>
          </Box>

          {/* Form */}
          <ContractTemplateForm
            template={editingTemplate || undefined}
            onSave={handleFormSave}
            onCancel={handleBackToList}
          />
        </Box>
      </Fade>
    );
  }

  // List view
  return (
    <Fade in>
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Contract Templates
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage contract templates for different event types
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
                placeholder="Search templates..."
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
            <ContractTemplatesTable
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
          <DialogTitle>Delete Contract Template</DialogTitle>
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