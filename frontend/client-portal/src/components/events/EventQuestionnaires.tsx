// frontend/client-portal/src/components/events/EventQuestionnaires.tsx

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Skeleton,
  Chip,
  Button,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  Assignment as QuestionnaireIcon,
  CheckCircle as CompletedIcon,
  HourglassEmpty as PendingIcon,
  Error as RequiredIcon,
  Visibility as ViewIcon,
  Edit as FillIcon,
} from '@mui/icons-material';
import { useEventQuestionnaires } from '../../hooks/useEventQuestionnaires';
import type { Questionnaire, QuestionnaireResponse } from '../../types/questionnaires.types';

interface EventQuestionnairesProps {
  eventId: number;
}

interface QuestionnaireWithStatus extends Questionnaire {
  status: 'COMPLETE' | 'PENDING' | 'REQUIRED';
  completedFields: number;
  totalFields: number;
  hasResponses: boolean;
}

const EventQuestionnaires: React.FC<EventQuestionnairesProps> = ({ eventId }) => {
  const { useActiveQuestionnaires, useEventResponses } = useEventQuestionnaires();

  const {
    data: questionnaires,
    isLoading: isLoadingQuestionnaires,
    error: questionnairesError
  } = useActiveQuestionnaires();

  const {
    data: responses,
    isLoading: isLoadingResponses,
    error: responsesError
  } = useEventResponses(eventId);

  // Combine questionnaires with response status
  const questionnairesWithStatus = useMemo<QuestionnaireWithStatus[]>(() => {
    if (!questionnaires || !responses) return [];

    return questionnaires.map((questionnaire) => {
      const questionnaireResponses = responses.filter(
        (response: QuestionnaireResponse) =>
          questionnaire.fields.some(field => field.id === response.field)
      );

      const requiredFields = questionnaire.fields.filter(field => field.required);
      const completedRequiredFields = requiredFields.filter(field =>
        questionnaireResponses.some((response: QuestionnaireResponse) =>
          response.field === field.id && response.value.trim()
        )
      );

      const completedFields = questionnaire.fields.filter(field =>
        questionnaireResponses.some((response: QuestionnaireResponse) =>
          response.field === field.id && response.value.trim()
        )
      ).length;

      const hasResponses = questionnaireResponses.length > 0;
      const allRequiredComplete = completedRequiredFields.length === requiredFields.length;

      let status: 'COMPLETE' | 'PENDING' | 'REQUIRED';
      if (requiredFields.length > 0 && !allRequiredComplete) {
        status = 'REQUIRED';
      } else if (completedFields === questionnaire.fields.length) {
        status = 'COMPLETE';
      } else {
        status = 'PENDING';
      }

      return {
        ...questionnaire,
        status,
        completedFields,
        totalFields: questionnaire.fields.length,
        hasResponses,
      };
    });
  }, [questionnaires, responses]);

  const getStatusConfig = (status: QuestionnaireWithStatus['status']) => {
    switch (status) {
      case 'COMPLETE':
        return {
          color: 'success' as const,
          label: 'Complete',
          icon: <CompletedIcon fontSize="small" />
        };
      case 'REQUIRED':
        return {
          color: 'error' as const,
          label: 'Required',
          icon: <RequiredIcon fontSize="small" />
        };
      case 'PENDING':
      default:
        return {
          color: 'warning' as const,
          label: 'Pending',
          icon: <PendingIcon fontSize="small" />
        };
    }
  };

  const calculateProgress = (questionnaire: QuestionnaireWithStatus) => {
    if (questionnaire.totalFields === 0) return 0;
    return (questionnaire.completedFields / questionnaire.totalFields) * 100;
  };

  const loading = isLoadingQuestionnaires || isLoadingResponses;
  const error = questionnairesError || responsesError;

  if (loading) {
    return (
      <Box>
        <Stack spacing={2}>
          {[1, 2, 3].map((item) => (
            <Paper key={item} sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Skeleton variant="text" width="60%" height={32} />
                  <Skeleton variant="rectangular" width={80} height={24} />
                </Box>
                <Skeleton variant="text" width="40%" />
                <Box display="flex" gap={1}>
                  <Skeleton variant="rectangular" width={100} height={32} />
                  <Skeleton variant="rectangular" width={120} height={32} />
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Unable to load questionnaires. Please try again later.
      </Alert>
    );
  }

  if (!questionnairesWithStatus || questionnairesWithStatus.length === 0) {
    return (
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          backgroundColor: 'grey.50',
        }}
      >
        <QuestionnaireIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No questionnaires available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Questionnaires for this event will appear here when available.
        </Typography>
      </Paper>
    );
  }

  const completedCount = questionnairesWithStatus.filter(q => q.status === 'COMPLETE').length;
  const requiredCount = questionnairesWithStatus.filter(q => q.status === 'REQUIRED').length;

  return (
    <Box role="region" aria-label="Event questionnaires">
      {/* Summary */}
      {questionnairesWithStatus.length > 0 && (
        <Paper sx={{ p: 2, mb: 3, backgroundColor: 'primary.50' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Questionnaire Progress: {completedCount} of {questionnairesWithStatus.length} completed
            </Typography>
            {requiredCount > 0 && (
              <Chip
                label={`${requiredCount} Required`}
                color="error"
                size="small"
                variant="filled"
              />
            )}
          </Stack>
        </Paper>
      )}

      {/* Questionnaires List */}
      <Stack spacing={2}>
        {questionnairesWithStatus.map((questionnaire) => {
          const statusConfig = getStatusConfig(questionnaire.status);
          const progress = calculateProgress(questionnaire);

          return (
            <Paper key={questionnaire.id} sx={{ p: 3 }}>
              <Stack spacing={2}>
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                  <Box flex={1}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {questionnaire.name}
                    </Typography>

                    <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                      <Chip
                        label={statusConfig.label}
                        color={statusConfig.color}
                        size="small"
                        icon={statusConfig.icon}
                        variant="filled"
                        sx={{ fontWeight: 500 }}
                      />

                      <Typography variant="body2" color="text.secondary">
                        {questionnaire.fields_count} field{questionnaire.fields_count !== 1 ? 's' : ''}
                      </Typography>
                    </Stack>
                  </Box>
                </Box>

                {/* Progress Bar */}
                {questionnaire.totalFields > 0 && (
                  <Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        Progress: {questionnaire.completedFields} of {questionnaire.totalFields} fields
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {Math.round(progress)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={progress}
                      color={
                        questionnaire.status === 'COMPLETE' ? 'success' :
                        questionnaire.status === 'REQUIRED' ? 'error' :
                        'primary'
                      }
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                )}

                {/* Actions */}
                <Stack direction="row" spacing={2} justifyContent="flex-start">
                  <Button
                    variant={questionnaire.status === 'REQUIRED' ? 'contained' : 'outlined'}
                    color={questionnaire.status === 'REQUIRED' ? 'error' : 'primary'}
                    startIcon={<FillIcon />}
                    size="small"
                    onClick={() => {
                      // TODO: Navigate to questionnaire fill page
                      console.log('Fill questionnaire:', questionnaire.id);
                    }}
                  >
                    {questionnaire.hasResponses ? 'Update Responses' : 'Fill Out'}
                  </Button>

                  {questionnaire.hasResponses && (
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<ViewIcon />}
                      size="small"
                      onClick={() => {
                        // TODO: Navigate to view responses page
                        console.log('View responses:', questionnaire.id);
                      }}
                    >
                      View Responses
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>

      {/* Footer Summary */}
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          {questionnairesWithStatus.length} questionnaire{questionnairesWithStatus.length !== 1 ? 's' : ''}
        </Typography>
      </Box>
    </Box>
  );
};

export default EventQuestionnaires;