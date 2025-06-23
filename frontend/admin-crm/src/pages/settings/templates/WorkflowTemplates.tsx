// frontend/admin-crm/src/pages/settings/templates/WorkflowTemplates.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Fade,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useWorkflowTemplates } from '../../../hooks/useWorkflows';
import { useEventTypes } from '../../../hooks/useEvents';
import { WorkflowTemplatesTable } from '../../../components/workflows/WorkflowTemplatesTable';
import { WorkflowTemplateForm } from '../../../components/workflows/WorkflowTemplateForm';
import { WorkflowVisualization } from '../../../components/workflows/WorkflowVisualization';
import type { 
  WorkflowTemplate, 
  WorkflowTemplateFilters,
  CreateWorkflowTemplateData,
  UpdateWorkflowTemplateData 
} from '../../../types/workflows.types';

type ViewMode = 'list' | 'create' | 'edit' | 'view';

export const WorkflowTemplates: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filters, setFilters] = useState<WorkflowTemplateFilters>({});
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<WorkflowTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<WorkflowTemplate | null>(null);

  const {
    templates,
    isLoadingTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    isCreatingTemplate,
    isUpdatingTemplate,
    isDeletingTemplate,
    refetchTemplates,
    useWorkflowTemplate,
  } = useWorkflowTemplates(filters);

  const { useActiveEventTypes } = useEventTypes();
  const { data: eventTypes = [] } = useActiveEventTypes();

  // Hook to fetch detailed template data when editing/viewing
  const { 
    data: detailedTemplate, 
    isLoading: isLoadingDetails 
  } = useWorkflowTemplate(editingTemplate?.id || viewingTemplate?.id || 0);

  useEffect(() => {
    const baseBreadcrumbs = [
      { label: 'Settings', path: '/settings' },
      { label: 'Template Management' },
      { label: 'Workflow Templates' },
    ];

    if (viewMode === 'create') {
      setBreadcrumbs([...baseBreadcrumbs, { label: 'Create Template' }]);
    } else if (viewMode === 'edit' && editingTemplate) {
      setBreadcrumbs([...baseBreadcrumbs, { label: editingTemplate.name }]);
    } else if (viewMode === 'view' && viewingTemplate) {
      setBreadcrumbs([...baseBreadcrumbs, { label: viewingTemplate.name }]);
    } else {
      setBreadcrumbs(baseBreadcrumbs);
    }
  }, [setBreadcrumbs, viewMode, editingTemplate, viewingTemplate]);

  const handleFilterChange = (key: keyof WorkflowTemplateFilters, value: string | number | boolean | undefined) => {
      setFilters(prev => ({
        ...prev,
        [key]: value === 'all' ? undefined : value
      }));
    };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setViewMode('create');
  };

  const handleEdit = (template: WorkflowTemplate) => {
    setEditingTemplate(template);
    setViewMode('edit');
  };

  const handleView = (template: WorkflowTemplate) => {
    setViewingTemplate(template);
    setViewMode('view');
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
      deleteTemplate(templateToDelete.id, {
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

  const handleBackToList = () => {
    setViewMode('list');
    setEditingTemplate(null);
    setViewingTemplate(null);
  };

  const handleFormSave = (data: CreateWorkflowTemplateData | UpdateWorkflowTemplateData) => {
    if (editingTemplate) {
      updateTemplate({ 
        id: editingTemplate.id, 
        data: data as UpdateWorkflowTemplateData 
      }, {
        onSuccess: () => {
          handleBackToList();
        }
      });
    } else {
      createTemplate(data as CreateWorkflowTemplateData, {
        onSuccess: () => {
          handleBackToList();
        }
      });
    }
  };

  const handleDuplicate = (template: WorkflowTemplate) => {
    const duplicateData: CreateWorkflowTemplateData = {
      name: `${template.name} (Copy)`,
      description: template.description,
      event_type: template.event_type,
      is_active: template.is_active,
    };

    createTemplate(duplicateData);
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');
  const isLoading = isCreatingTemplate || isUpdatingTemplate;

  // Form view (create or edit)
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <Fade in>
        <Box>
          {/* Back button */}
          <Box mb={2}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToList}
              disabled={isLoading}
            >
              Back to Templates
            </Button>
          </Box>

          {/* Form */}
          <WorkflowTemplateForm
            template={detailedTemplate || editingTemplate || undefined}
            onSave={handleFormSave}
            onCancel={handleBackToList}
          />
        </Box>
      </Fade>
    );
  }

  // View mode
  if (viewMode === 'view') {
    return (
      <Fade in>
        <Box>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToList}
            >
              Back to Templates
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleEdit(viewingTemplate!)}
            >
              Edit Template
            </Button>
          </Box>

          {/* Template Visualization */}
          {isLoadingDetails ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : detailedTemplate ? (
            <WorkflowVisualization template={detailedTemplate} />
          ) : (
            <Alert severity="error">
              Failed to load template details
            </Alert>
          )}
        </Box>
      </Fade>
    );
  }

  // List view
  return (
    <Fade in>
      <Box>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Workflow Templates
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Create and manage workflow templates to automate event processes
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            sx={{ minWidth: 160 }}
          >
            New Template
          </Button>
        </Box>

        {/* Info Alert */}
        <Alert severity="info" sx={{ mb: 3 }}>
          Workflow templates define the stages and automated actions that events progress through from lead to completion.
        </Alert>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                size="small"
                placeholder="Search templates..."
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                sx={{ flex: 1, minWidth: 250 }}
              />
              
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Event Type</InputLabel>
                <Select
                  value={filters.event_type !== undefined ? String(filters.event_type) : 'all'}
                  label="Event Type"
                  onChange={(e) =>
                    handleFilterChange(
                      'event_type',
                      e.target.value === 'all' ? undefined : parseInt(e.target.value as string)
                    )
                  }
                >
                  <MenuItem value="all">All Types</MenuItem>
                  {eventTypes.map((eventType) => (
                    <MenuItem key={eventType.id} value={String(eventType.id)}>
                      {eventType.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.is_active === undefined ? 'all' : filters.is_active.toString()}
                  label="Status"
                  onChange={(e) => handleFilterChange('is_active', e.target.value === 'true')}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </Select>
              </FormControl>
              
              <Box display="flex" gap={1}>
                {hasActiveFilters && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleClearFilters}
                    startIcon={<FilterIcon />}
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => refetchTemplates()}
                  startIcon={<RefreshIcon />}
                >
                  Refresh
                </Button>
              </Box>
            </Stack>
            
            {hasActiveFilters && (
              <Box mt={2}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Active filters:
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {filters.search && (
                    <Chip 
                      label={`Search: "${filters.search}"`} 
                      size="small" 
                      onDelete={() => handleFilterChange('search', '')} 
                    />
                  )}
                  {filters.event_type && (
                    <Chip 
                      label={`Event Type: ${eventTypes.find(et => et.id === filters.event_type)?.name}`} 
                      size="small" 
                      onDelete={() => handleFilterChange('event_type', 'all')} 
                    />
                  )}
                  {filters.is_active !== undefined && (
                    <Chip 
                      label={`Status: ${filters.is_active ? 'Active' : 'Inactive'}`} 
                      size="small" 
                      onDelete={() => handleFilterChange('is_active', 'all')} 
                    />
                  )}
                </Stack>
              </Box>
            )}
          </CardContent>
        </Card>

        {/* Templates Table */}
        <Card>
          <WorkflowTemplatesTable
            templates={templates}
            isLoading={isLoadingTemplates}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            isDeleting={isDeletingTemplate}
          />
        </Card>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={handleDeleteCancel}
        >
          <DialogTitle>Delete Workflow Template</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteCancel} disabled={isDeletingTemplate}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteConfirm} 
              color="error" 
              variant="contained"
              disabled={isDeletingTemplate}
            >
              {isDeletingTemplate ? <CircularProgress size={20} /> : 'Delete'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
};