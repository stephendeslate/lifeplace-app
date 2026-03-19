import React from 'react';
import { Box, Typography, Paper, Alert, CircularProgress, LinearProgress } from '@mui/material';
import { CheckCircle, Warning } from '@mui/icons-material';
import { useQuestionnaireStepLogic } from './useQuestionnaireStepLogic';
import { QuestionnaireFieldRenderer } from './QuestionnaireFieldRenderer';
import type { QuestionnaireStepProps } from './useQuestionnaireStepLogic';

export const QuestionnaireStep: React.FC<QuestionnaireStepProps> = (props) => {
  const { config } = props;
  const {
    questionnairesWithFields,
    loadingQuestionnaires,
    loadErrors,
    validationErrors,
    completionPercentage,
    missingRequiredFields,
    visibleQuestionnaires,
    getVisibleFields,
    shouldShowQuestionnaire,
    shouldShowField,
    hasAnyResponses,
    responseCount,
    handleFieldChange,
    handleFileUpload,
    getResponse,
    getFieldError,
    hasFieldError,
    isUploading,
    getUploadError,
    getUploadedFiles,
  } = useQuestionnaireStepLogic(props);

  // Loading state
  if (loadingQuestionnaires.size > 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading questionnaire fields...
        </Typography>
      </Box>
    );
  }

  // Error state
  if (loadErrors.size > 0) {
    return (
      <Alert severity="error">
        Failed to load some questionnaires. Please try again.
        <br />
        {Array.from(loadErrors.values()).join(', ')}
      </Alert>
    );
  }

  if (!config || !config.questionnaire_items || config.questionnaire_items.length === 0) {
    return <Alert severity="info">No questionnaires configured for this step</Alert>;
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
        Event Information
      </Typography>

      <Typography variant="body1" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
        Please provide the following information about your event
      </Typography>

      {/* Progress indicator */}
      {visibleQuestionnaires.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Typography variant="body2" color="text.secondary">
              Completion Progress
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {completionPercentage}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={completionPercentage}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {config.questionnaire_items.map((questionnaireItem) => {
          const questionnaire = questionnairesWithFields.get(questionnaireItem.questionnaire);

          if (!questionnaire) {
            const error = loadErrors.get(questionnaireItem.questionnaire);
            return (
              <Paper
                key={questionnaireItem.id}
                elevation={0}
                sx={{ p: 3, border: 1, borderColor: 'divider' }}
              >
                <Alert severity="warning">{error || 'Unable to load questionnaire'}</Alert>
              </Paper>
            );
          }

          if (!shouldShowQuestionnaire(questionnaire)) {
            return null;
          }

          const visibleFields = getVisibleFields(questionnaire);

          if (visibleFields.length === 0) {
            return null;
          }

          return (
            <Paper
              key={questionnaireItem.id}
              elevation={0}
              sx={{ p: 3, border: 1, borderColor: 'divider' }}
            >
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                {questionnaire.name}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visibleFields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <Box key={field.id}>
                      <QuestionnaireFieldRenderer
                        field={field}
                        questionnaire={questionnaire}
                        config={config}
                        shouldShowField={shouldShowField}
                        getResponse={getResponse}
                        getFieldError={getFieldError}
                        hasFieldError={hasFieldError}
                        validationErrors={validationErrors}
                        handleFieldChange={handleFieldChange}
                        handleFileUpload={handleFileUpload}
                        isUploading={isUploading}
                        getUploadError={getUploadError}
                        getUploadedFiles={getUploadedFiles}
                      />
                    </Box>
                  ))}
              </Box>
            </Paper>
          );
        })}
      </Box>

      {/* Validation summary */}
      {missingRequiredFields.length > 0 && (
        <Alert severity="warning" sx={{ mt: 3 }} icon={<Warning />}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
            Missing Required Information:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {missingRequiredFields.map((field) => (
              <li key={field.id}>{field.name}</li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Completion status */}
      {missingRequiredFields.length === 0 && hasAnyResponses && (
        <Alert severity="success" sx={{ mt: 3 }} icon={<CheckCircle />}>
          All required information has been provided ({responseCount} responses).
        </Alert>
      )}

      {/* File upload information */}
      {config.allow_file_uploads && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>File Upload Information:</strong>
            <br />
            Maximum file size: {config.max_file_size_mb}MB
            <br />
            {config.allowed_file_types && config.allowed_file_types.length > 0 && (
              <>Allowed file types: {config.allowed_file_types.join(', ')}</>
            )}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};
