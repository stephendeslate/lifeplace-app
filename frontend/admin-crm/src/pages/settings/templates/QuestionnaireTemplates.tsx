// frontend/admin-crm/src/pages/settings/templates/QuestionnaireTemplates.tsx

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
} from '@mui/material';
import {
  Add as AddIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  SwapVert as ReorderIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useQuestionnaires } from '../../../hooks/useQuestionnaires';
import { QuestionnairesTable } from '../../../components/questionnaires/QuestionnairesTable';
import { QuestionnaireFormDialog } from '../../../components/questionnaires/QuestionnaireFormDialog';
import { QuestionnairePreview } from '../../../components/questionnaires/QuestionnairePreview';
import { QuestionnaireReorderDialog } from '../../../components/questionnaires/QuestionnaireReorderDialog';
import type { 
  Questionnaire, 
  QuestionnaireFilters,
  CreateQuestionnaireData,
  UpdateQuestionnaireData 
} from '../../../types/questionnaires.types';

export const QuestionnaireTemplates: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [filters, setFilters] = useState<QuestionnaireFilters>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);
  const [editingQuestionnaire, setEditingQuestionnaire] = useState<Questionnaire | null>(null);
  const [previewingQuestionnaire, setPreviewingQuestionnaire] = useState<Questionnaire | null>(null);
  const [questionnaireToDelete, setQuestionnaireToDelete] = useState<Questionnaire | null>(null);

  const {
    questionnaires,
    isLoadingQuestionnaires,
    createQuestionnaire,
    updateQuestionnaire,
    deleteQuestionnaire,
    isCreatingQuestionnaire,
    isUpdatingQuestionnaire,
    isDeletingQuestionnaire,
    refetchQuestionnaires,
    useQuestionnaire,
  } = useQuestionnaires(filters);

  // Hook to fetch detailed questionnaire data when editing/previewing
  const { 
    data: detailedQuestionnaire, 
    isLoading: isLoadingDetails  } = useQuestionnaire(editingQuestionnaire?.id || previewingQuestionnaire?.id || 0);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Template Management' },
      { label: 'Questionnaire Templates' },
    ]);
  }, [setBreadcrumbs]);

  const handleFilterChange = (key: keyof QuestionnaireFilters, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value === 'all' ? undefined : value
    }));
  };

  const handleClearFilters = () => {
    setFilters({});
  };

  const handleCreateNew = () => {
    setEditingQuestionnaire(null);
    setDialogOpen(true);
  };

  const handleEdit = (questionnaire: Questionnaire) => {
    setEditingQuestionnaire(questionnaire);
    setDialogOpen(true);
  };

  const handlePreview = (questionnaire: Questionnaire) => {
    setPreviewingQuestionnaire(questionnaire);
    setPreviewDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    const questionnaire = questionnaires.find(q => q.id === id);
    if (questionnaire) {
      setQuestionnaireToDelete(questionnaire);
      setDeleteDialogOpen(true);
    }
  };

  const handleDeleteConfirm = () => {
    if (questionnaireToDelete) {
      deleteQuestionnaire(questionnaireToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setQuestionnaireToDelete(null);
        }
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setQuestionnaireToDelete(null);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingQuestionnaire(null);
  };

  const handlePreviewDialogClose = () => {
    setPreviewDialogOpen(false);
    setPreviewingQuestionnaire(null);
  };

  const handleSubmit = (data: CreateQuestionnaireData | UpdateQuestionnaireData) => {
    if (editingQuestionnaire) {
      updateQuestionnaire({ 
        id: editingQuestionnaire.id, 
        data: data as UpdateQuestionnaireData 
      });
    } else {
      createQuestionnaire(data as CreateQuestionnaireData);
    }
    handleDialogClose();
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');
  const isLoading = isCreatingQuestionnaire || isUpdatingQuestionnaire;

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Questionnaire Templates
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Create and manage questionnaire templates for gathering client information
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<ReorderIcon />}
            onClick={() => setReorderDialogOpen(true)}
            disabled={questionnaires.length === 0}
          >
            Reorder
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateNew}
            sx={{ minWidth: 160 }}
          >
            New Questionnaire
          </Button>
        </Box>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Questionnaires can be assigned to event types for automatic inclusion in booking flows, 
        or sent manually to clients through the communications system.
      </Alert>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            <TextField
              size="small"
              placeholder="Search questionnaires..."
              value={filters.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              sx={{ flex: 1, minWidth: 250 }}
            />
            
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
                onClick={() => refetchQuestionnaires()}
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

      {/* Questionnaires Table */}
      <Card>
        <QuestionnairesTable
          questionnaires={questionnaires}
          isLoading={isLoadingQuestionnaires}
          onEdit={handleEdit}
          onPreview={handlePreview}
          onDelete={handleDelete}
          isDeleting={isDeletingQuestionnaire}
        />
      </Card>

      {/* Form Dialog */}
      <QuestionnaireFormDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editingQuestionnaire={detailedQuestionnaire || editingQuestionnaire}
        onSubmit={handleSubmit}
        isLoading={isLoading || isLoadingDetails}
      />

      {/* Preview Dialog */}
      <Dialog 
        open={previewDialogOpen} 
        onClose={handlePreviewDialogClose}
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              Questionnaire Preview
            </Typography>
            <Button
              onClick={handlePreviewDialogClose}
              startIcon={<CloseIcon />}
            >
              Close
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {isLoadingDetails ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : detailedQuestionnaire ? (
            <QuestionnairePreview questionnaire={detailedQuestionnaire} />
          ) : (
            <Alert severity="error">
              Failed to load questionnaire details
            </Alert>
          )}
        </DialogContent>
      </Dialog>

      {/* Reorder Dialog */}
      <QuestionnaireReorderDialog
        open={reorderDialogOpen}
        onClose={() => setReorderDialogOpen(false)}
        questionnaires={questionnaires}
        onReorderComplete={() => {
          refetchQuestionnaires();
          setReorderDialogOpen(false);
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Questionnaire</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{questionnaireToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeletingQuestionnaire}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeletingQuestionnaire}
          >
            {isDeletingQuestionnaire ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};