// frontend/admin-crm/src/pages/settings/templates/WorkflowTemplates.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
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
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  AccountTree as WorkflowIcon,
  Search as SearchIcon,
  List as ListIcon,
  Edit as EditIcon,
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

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader, createAddAction, createRefreshAction } from '../../../components/common/ModernPageHeader';
import { ModernEmptyState } from '../../../components/common/ModernEmptyState';
import ModernLoadingStates from '../../../components/common/ModernLoadingStates';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

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
      { label: 'Settings' },
      { label: 'Templates' },
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

  // Modern header actions for different view modes
  const getHeaderActions = () => {
    const actions = [];
    
    if (viewMode === 'list') {
      actions.push(createAddAction('New Template', handleCreateNew, 'primary'));
      actions.push(createRefreshAction(() => refetchTemplates()));
      if (hasActiveFilters) {
        actions.push({
          icon: <FilterIcon />,
          label: 'Clear Filters',
          variant: 'outlined' as const,
          onClick: handleClearFilters,
          tooltip: 'Clear all active filters',
        });
      }
    } else {
      actions.push({
        icon: <ListIcon />,
        label: 'Back to List',
        variant: 'outlined' as const,
        onClick: handleBackToList,
        tooltip: 'Return to template list',
      });
      if (viewMode === 'view' && viewingTemplate) {
        actions.push({
          icon: <EditIcon />,
          label: 'Edit Template',
          variant: 'contained' as const,
          onClick: () => handleEdit(viewingTemplate),
          color: 'primary' as const,
        });
      }
    }
    
    return actions;
  };

  const getHeaderTitle = () => {
    switch (viewMode) {
      case 'create':
        return 'Create Workflow Template';
      case 'edit':
        return `Edit Template: ${editingTemplate?.name || ''}`;
      case 'view':
        return `View Template: ${viewingTemplate?.name || ''}`;
      default:
        return 'Workflow Templates';
    }
  };

  const getHeaderSubtitle = () => {
    switch (viewMode) {
      case 'create':
        return 'Create a new workflow template to automate event processes';
      case 'edit':
        return 'Modify the workflow template stages and automation rules';
      case 'view':
        return 'Review the workflow template structure and stages';
      default:
        return 'Create and manage workflow templates to automate event processes';
    }
  };

  // Form view (create or edit)
  if (viewMode === 'create' || viewMode === 'edit') {
    return (
      <ModernSettingsLayout>
        <ModernPageHeader
          title={getHeaderTitle()}
          subtitle={getHeaderSubtitle()}
          icon={<WorkflowIcon />}
          breadcrumbs={[
            { label: 'Settings' },
            { label: 'Templates' },
            { label: 'Workflow Templates' },
            { label: viewMode === 'create' ? 'Create Template' : editingTemplate?.name || 'Edit' },
          ]}
          secondaryActions={getHeaderActions()}
          size="medium"
          gradient
          glass
        />

        <ModernCard
          variant="glass"
          size="large"
          animation="none"
          sx={{ overflow: 'visible' }}
        >
          <WorkflowTemplateForm
            template={detailedTemplate || editingTemplate || undefined}
            onSave={handleFormSave}
            onCancel={handleBackToList}
          />
        </ModernCard>
      </ModernSettingsLayout>
    );
  }

  // View mode
  if (viewMode === 'view') {
    return (
      <ModernSettingsLayout>
        <ModernPageHeader
          title={getHeaderTitle()}
          subtitle={getHeaderSubtitle()}
          icon={<WorkflowIcon />}
          breadcrumbs={[
            { label: 'Settings' },
            { label: 'Templates' },
            { label: 'Workflow Templates' },
            { label: viewingTemplate?.name || 'View' },
          ]}
          secondaryActions={getHeaderActions()}
          size="medium"
          gradient
          glass
        />

        <ModernCard
          variant="glass"
          size="large"
          animation="none"
          sx={{ overflow: 'visible' }}
        >
          {isLoadingDetails ? (
            <ModernLoadingStates.ModernLoadingSpinner
              size={40}
              message="Loading template details..."
              variant="circular"
              glass
            />
          ) : detailedTemplate ? (
            <WorkflowVisualization template={detailedTemplate} />
          ) : (
            <ModernEmptyState
              icon={WorkflowIcon}
              title="Failed to Load Template"
              description="Unable to load template details. Please try refreshing the page."
              variant="error"
              primaryAction={{
                label: "Refresh",
                onClick: () => window.location.reload(),
                icon: <RefreshIcon />,
                color: "error",
              }}
              size="medium"
            />
          )}
        </ModernCard>
      </ModernSettingsLayout>
    );
  }

  // List view
  return (
    <ModernSettingsLayout>
      <ModernPageHeader
        title={getHeaderTitle()}
        subtitle={getHeaderSubtitle()}
        icon={<WorkflowIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Templates' },
          { label: 'Workflow Templates' },
        ]}
        primaryAction={getHeaderActions().find(a => a.label === 'New Template')}
        secondaryActions={getHeaderActions().filter(a => a.label !== 'New Template')}
        stats={[
          { label: 'Total Templates', value: templates.length },
          { label: 'Active', value: templates.filter(t => t.is_active).length },
        ]}
        size="medium"
        gradient
        glass
      />

      <Box sx={{ mb: 4 }}>
        <ModernCard
          variant="glass"
          color="primary"
          size="small"
          animation="none"
        >
          <Alert 
            severity="info"
            sx={{
              backgroundColor: 'transparent',
              border: 'none',
              '& .MuiAlert-message': {
                color: tokens.color.primary[700],
              },
            }}
          >
            Workflow templates define the stages and automated actions that events progress through from lead to completion.
          </Alert>
        </ModernCard>
      </Box>

      <ModernCard
        variant="glass"
        size="medium"
        animation="none"
        sx={{ mb: 4 }}
      >
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
        </ModernCard>

      <ModernCard
        variant="glass"
        size="large"
        animation="none"
        sx={{ overflow: 'visible', mb: 4 }}
      >
        {isLoadingTemplates ? (
          <ModernLoadingStates.ModernTableSkeleton
            rows={5}
            columns={6}
          />
        ) : templates.length === 0 ? (
          <ModernEmptyState
            icon={WorkflowIcon}
            title={hasActiveFilters ? 'No templates match your filters' : 'No workflow templates found'}
            description={hasActiveFilters 
              ? 'Try adjusting your search criteria or clear the filters'
              : 'Create your first workflow template to automate event processes'
            }
            primaryAction={{
              label: hasActiveFilters ? 'Clear Filters' : 'Create Template',
              onClick: hasActiveFilters ? handleClearFilters : handleCreateNew,
              icon: hasActiveFilters ? <FilterIcon /> : <AddIcon />,
              color: 'primary',
            }}
            tip={{
              text: 'Workflow templates help streamline event management and ensure consistent processes',
              type: 'info',
            }}
            size="medium"
            illustration="gradient"
          />
        ) : (
          <WorkflowTemplatesTable
            templates={templates}
            isLoading={isLoadingTemplates}
            onEdit={handleEdit}
            onView={handleView}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            isDeleting={isDeletingTemplate}
          />
        )}
      </ModernCard>

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
          Delete Workflow Template
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: tokens.color.neutral[700] }}>
            Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={isDeletingTemplate}
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
            disabled={isDeletingTemplate}
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
            {isDeletingTemplate ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </ModernSettingsLayout>
  );
};