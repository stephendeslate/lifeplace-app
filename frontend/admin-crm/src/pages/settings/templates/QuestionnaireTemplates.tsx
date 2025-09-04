// frontend/admin-crm/src/pages/settings/templates/QuestionnaireTemplates.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
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
  Close as CloseIcon,
  Quiz as QuizIcon,
  Search as SearchIcon,
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

// Modern Design System imports
import { ModernSettingsLayout } from '../../../components/common/ModernPageLayout';
import { ModernCard } from '../../../components/common/ModernCard';
import { ModernPageHeader, createAddAction, createRefreshAction } from '../../../components/common/ModernPageHeader';
import { ModernEmptyState } from '../../../components/common/ModernEmptyState';
import ModernLoadingStates from '../../../components/common/ModernLoadingStates';
import { tokens } from '../../../design-system';
import { glassPresets } from '../../../design-system/utils/glassmorphism';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchField, setShowSearchField] = useState(false);

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
      { label: 'Settings' },
      { label: 'Templates' },
      { label: 'Questionnaire Templates' },
    ]);
  }, [setBreadcrumbs]);


  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery('');
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

  // Modern header actions
  const headerActions = [
    {
      icon: <SearchIcon />,
      label: showSearchField ? 'Hide Search' : 'Search',
      onClick: handleToggleSearch,
      variant: 'icon' as const,
      tooltip: showSearchField ? 'Hide search field' : 'Search questionnaire templates',
    },
    createRefreshAction(() => refetchQuestionnaires()),
    ...(hasActiveFilters ? [{
      icon: <FilterIcon />,
      label: 'Clear Filters',
      variant: 'outlined' as const,
      onClick: handleClearFilters,
      tooltip: 'Clear all active filters',
    }] : []),
  ];

  const primaryAction = createAddAction('New Questionnaire', handleCreateNew, 'primary');

  return (
    <ModernSettingsLayout>
      {/* Modern Header */}
      <ModernPageHeader
        title="Questionnaire Templates"
        subtitle="Create and manage questionnaire templates for gathering client information"
        icon={<QuizIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Templates' },
          { label: 'Questionnaire Templates' },
        ]}
        primaryAction={primaryAction}
        secondaryActions={headerActions}
        stats={[
          { label: 'Total Templates', value: questionnaires.length },
          { label: 'Active', value: questionnaires.filter(q => q.is_active).length },
        ]}
        size="medium"
        gradient
        glass
      />

      {/* Info Alert */}
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
            Questionnaires can be assigned to event types for automatic inclusion in booking flows, 
            or sent manually to clients through the communications system.
          </Alert>
        </ModernCard>
      </Box>

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
                Search Questionnaire Templates
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: tokens.color.neutral[600],
                  mb: 3,
                }}
              >
                Find templates by name, description, or event type
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

      {/* Questionnaires Table */}
      <ModernCard
        variant="glass"
        size="large"
        animation="none"
        sx={{
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {isLoadingQuestionnaires ? (
          <ModernLoadingStates.ModernTableSkeleton
            rows={5}
            columns={6}
          />
        ) : questionnaires.length === 0 ? (
          <ModernEmptyState
            icon={QuizIcon}
            title={hasActiveFilters ? 'No questionnaires match your filters' : 'No questionnaire templates found'}
            description={hasActiveFilters 
              ? 'Try adjusting your search criteria or clear the filters'
              : 'Create your first questionnaire template to start gathering client information'
            }
            primaryAction={{
              label: hasActiveFilters ? 'Clear Filters' : 'Create Questionnaire',
              onClick: hasActiveFilters ? handleClearFilters : handleCreateNew,
              icon: hasActiveFilters ? <FilterIcon /> : <AddIcon />,
              color: 'primary',
            }}
            tip={{
              text: 'Questionnaires help you collect important client information early in the booking process',
              type: 'info',
            }}
            size="medium"
            illustration="gradient"
          />
        ) : (
          <QuestionnairesTable
            questionnaires={questionnaires}
            isLoading={isLoadingQuestionnaires}
            onEdit={handleEdit}
            onPreview={handlePreview}
            onDelete={handleDelete}
            isDeleting={isDeletingQuestionnaire}
          />
        )}
      </ModernCard>

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
          Delete Questionnaire
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: tokens.color.neutral[700] }}>
            Are you sure you want to delete "{questionnaireToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 2 }}>
          <Button 
            onClick={handleDeleteCancel} 
            disabled={isDeletingQuestionnaire}
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
            disabled={isDeletingQuestionnaire}
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
            {isDeletingQuestionnaire ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </ModernSettingsLayout>
  );
};