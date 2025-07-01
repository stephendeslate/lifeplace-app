// frontend/client-portal/src/components/booking/steps/QuestionnaireStep.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormGroup,
  Select,
  MenuItem,
  Chip,
  Button,
  LinearProgress,
  Alert,
  Divider,
  useTheme,
  alpha,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
} from '@mui/material';
import {
  Quiz,
  ExpandMore,
  CheckCircle,
  RadioButtonUnchecked,
  Upload,
  Delete,
  Info,
  Warning,
} from '@mui/icons-material';
import { useStepQuestionnaires } from '../../../hooks/useBookingFlow';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
} from '../../../types/bookingflow.types';

interface Question {
  id: number;
  type: 'text' | 'textarea' | 'number' | 'email' | 'phone' | 'single_choice' | 'multiple_choice' | 'boolean' | 'file' | 'date' | 'rating';
  question: string;
  description?: string;
  is_required: boolean;
  options?: string[];
  validation_rules?: {
    min_length?: number;
    max_length?: number;
    min_value?: number;
    max_value?: number;
    file_types?: string[];
    max_file_size?: number;
  };
  conditional_logic?: {
    depends_on: number;
    condition: 'equals' | 'not_equals' | 'contains';
    value: any;
  };
}

interface Questionnaire {
  id: number;
  name: string;
  description: string;
  questions: Question[];
  order: number;
  is_conditional: boolean;
  show_conditions?: Record<string, any>;
}

interface QuestionnaireStepProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

const QuestionnaireStep: React.FC<QuestionnaireStepProps> = ({
  step,
  session,
  data,
  validationErrors,
  onChange,
  onValidate,
  isLoading = false,
  isReadOnly = false,
}) => {
  const theme = useTheme();

  // Get step questionnaires
  const {
    data: questionnaires = [],
    isLoading: isLoadingQuestionnaires,
    error: questionnairesError,
  } = useStepQuestionnaires(step.id);

  // Get step configuration
  // Get step configuration
  const config = step.configuration_data as any;
  // Form state
  const [responses, setResponses] = useState<Record<string, any>>(
    data.questionnaire_responses || {}
  );
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});
  const [expandedQuestionnaires, setExpandedQuestionnaires] = useState<Set<number>>(new Set());

  // Auto-expand questionnaires on load
  useEffect(() => {
    if (questionnaires.length > 0) {
      const visibleQuestionnaires = questionnaires.filter(q => shouldShowQuestionnaire(q));
      if (visibleQuestionnaires.length === 1) {
        setExpandedQuestionnaires(new Set([visibleQuestionnaires[0].id]));
      }
    }
  }, [questionnaires]);

  // Check if questionnaire should be shown based on conditions
  const shouldShowQuestionnaire = (questionnaire: Questionnaire): boolean => {
    if (!questionnaire.is_conditional || !questionnaire.show_conditions) {
      return true;
    }

    // Check conditions against session data
    for (const [key, expectedValue] of Object.entries(questionnaire.show_conditions)) {
      const sessionValue = session.booking_data[key];
      if (sessionValue !== expectedValue) {
        return false;
      }
    }

    return true;
  };

  // Check if question should be shown based on conditional logic
  const shouldShowQuestion = (question: Question): boolean => {
    if (!question.conditional_logic) {
      return true;
    }

    const dependsOnResponse = responses[question.conditional_logic.depends_on];
    const conditionValue = question.conditional_logic.value;

    switch (question.conditional_logic.condition) {
      case 'equals':
        return dependsOnResponse === conditionValue;
      case 'not_equals':
        return dependsOnResponse !== conditionValue;
      case 'contains':
        return Array.isArray(dependsOnResponse) 
          ? dependsOnResponse.includes(conditionValue)
          : String(dependsOnResponse || '').includes(String(conditionValue));
      default:
        return true;
    }
  };

  // Handle response change
  const handleResponseChange = useCallback((questionId: number, value: any) => {
    const newResponses = { ...responses, [questionId]: value };
    setResponses(newResponses);
    
    // Update session data
    const newData = {
      ...data,
      questionnaire_responses: newResponses,
    };
    onChange(newData);
  }, [responses, data, onChange]);

  // Handle file upload
  const handleFileUpload = (questionId: number, files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    setUploadedFiles(prev => ({ ...prev, [questionId]: fileArray }));
    
    // For now, store file names in responses
    // In a real implementation, you'd upload files and store URLs
    handleResponseChange(questionId, fileArray.map(f => f.name));
  };

  // Handle file removal
  const handleFileRemove = (questionId: number, fileIndex: number) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      if (newFiles[questionId]) {
        newFiles[questionId].splice(fileIndex, 1);
        if (newFiles[questionId].length === 0) {
          delete newFiles[questionId];
        }
      }
      return newFiles;
    });

    // Update responses
    const currentFiles = uploadedFiles[questionId] || [];
    const updatedFileNames = currentFiles
      .filter((_, index) => index !== fileIndex)
      .map(f => f.name);
    
    handleResponseChange(questionId, updatedFileNames.length > 0 ? updatedFileNames : undefined);
  };

  // Render question based on type
  const renderQuestion = (question: Question) => {
    const questionKey = question.id.toString();
    const currentValue = responses[question.id];
    const hasError = validationErrors?.[questionKey];

    if (!shouldShowQuestion(question)) {
      return null;
    }

    const commonProps = {
      disabled: isReadOnly,
      error: !!hasError,
      helperText: hasError?.[0] || question.description,
    };

    switch (question.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <TextField
            key={question.id}
            label={question.question}
            type={question.type === 'email' ? 'email' : question.type === 'phone' ? 'tel' : 'text'}
            value={currentValue || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            required={question.is_required}
            fullWidth
            {...commonProps}
          />
        );

      case 'textarea':
        return (
          <TextField
            key={question.id}
            label={question.question}
            value={currentValue || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            required={question.is_required}
            multiline
            rows={4}
            fullWidth
            {...commonProps}
          />
        );

      case 'number':
        return (
          <TextField
            key={question.id}
            label={question.question}
            type="number"
            value={currentValue || ''}
            onChange={(e) => handleResponseChange(question.id, parseFloat(e.target.value) || null)}
            required={question.is_required}
            inputProps={{
              min: question.validation_rules?.min_value,
              max: question.validation_rules?.max_value,
            }}
            fullWidth
            {...commonProps}
          />
        );

      case 'single_choice':
        return (
          <FormControl key={question.id} fullWidth error={!!hasError}>
            <FormLabel component="legend" required={question.is_required}>
              {question.question}
            </FormLabel>
            <RadioGroup
              value={currentValue || ''}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
            >
              {question.options?.map((option, index) => (
                <FormControlLabel
                  key={index}
                  value={option}
                  control={<Radio disabled={isReadOnly} />}
                  label={option}
                />
              ))}
            </RadioGroup>
            {(hasError?.[0] || question.description) && (
              <Typography variant="caption" color={hasError ? 'error' : 'text.secondary'} sx={{ mt: 0.5 }}>
                {hasError?.[0] || question.description}
              </Typography>
            )}
          </FormControl>
        );

      case 'multiple_choice':
        return (
          <FormControl key={question.id} fullWidth error={!!hasError}>
            <FormLabel component="legend" required={question.is_required}>
              {question.question}
            </FormLabel>
            <FormGroup>
              {question.options?.map((option, index) => (
                <FormControlLabel
                  key={index}
                  control={
                    <Checkbox
                      checked={(currentValue || []).includes(option)}
                      onChange={(e) => {
                        const currentArray = currentValue || [];
                        const newArray = e.target.checked
                          ? [...currentArray, option]
                          : currentArray.filter((item: string) => item !== option);
                        handleResponseChange(question.id, newArray.length > 0 ? newArray : undefined);
                      }}
                      disabled={isReadOnly}
                    />
                  }
                  label={option}
                />
              ))}
            </FormGroup>
            {(hasError?.[0] || question.description) && (
              <Typography variant="caption" color={hasError ? 'error' : 'text.secondary'} sx={{ mt: 0.5 }}>
                {hasError?.[0] || question.description}
              </Typography>
            )}
          </FormControl>
        );

      case 'boolean':
        return (
          <FormControl key={question.id} fullWidth>
            <FormControlLabel
              control={
                <Checkbox
                  checked={!!currentValue}
                  onChange={(e) => handleResponseChange(question.id, e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label={question.question}
            />
            {question.description && (
              <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                {question.description}
              </Typography>
            )}
            {hasError && (
              <Typography variant="caption" color="error" sx={{ ml: 4 }}>
                {hasError[0]}
              </Typography>
            )}
          </FormControl>
        );

      case 'file':
        return (
          <Box key={question.id}>
            <FormLabel component="legend" required={question.is_required} sx={{ mb: 1, display: 'block' }}>
              {question.question}
            </FormLabel>
            
            {!isReadOnly && (
              <Button
                variant="outlined"
                component="label"
                startIcon={<Upload />}
                sx={{ mb: 2 }}
              >
                Upload Files
                <input
                  type="file"
                  hidden
                  multiple={true}
                  accept={question.validation_rules?.file_types?.map(type => `.${type}`).join(',')}
                  onChange={(e) => handleFileUpload(question.id, e.target.files)}
                />
              </Button>
            )}

            {/* Display uploaded files */}
            {uploadedFiles[question.id]?.map((file, index) => (
              <Chip
                key={index}
                label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                onDelete={isReadOnly ? undefined : () => handleFileRemove(question.id, index)}
                deleteIcon={<Delete />}
                sx={{ mr: 1, mb: 1 }}
              />
            ))}

            {question.description && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {question.description}
              </Typography>
            )}
            
            {question.validation_rules?.file_types && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Accepted formats: {question.validation_rules.file_types.join(', ')}
              </Typography>
            )}
            
            {question.validation_rules?.max_file_size && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                Max file size: {question.validation_rules.max_file_size} MB
              </Typography>
            )}

            {hasError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                {hasError[0]}
              </Typography>
            )}
          </Box>
        );

      case 'date':
        return (
          <TextField
            key={question.id}
            label={question.question}
            type="date"
            value={currentValue || ''}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            required={question.is_required}
            InputLabelProps={{ shrink: true }}
            fullWidth
            {...commonProps}
          />
        );

      case 'rating':
        const maxRating = question.validation_rules?.max_value || 5;
        return (
          <Box key={question.id}>
            <FormLabel component="legend" required={question.is_required} sx={{ mb: 2, display: 'block' }}>
              {question.question}
            </FormLabel>
            
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
              {Array.from({ length: maxRating }, (_, index) => (
                <IconButton
                  key={index}
                  onClick={() => handleResponseChange(question.id, index + 1)}
                  disabled={isReadOnly}
                  sx={{
                    color: (currentValue || 0) > index ? 'primary.main' : 'text.disabled',
                    '&:hover': {
                      color: 'primary.main',
                    },
                  }}
                >
                  <CheckCircle />
                </IconButton>
              ))}
              {currentValue && (
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  {currentValue} / {maxRating}
                </Typography>
              )}
            </Box>

            {question.description && (
              <Typography variant="caption" color="text.secondary">
                {question.description}
              </Typography>
            )}

            {hasError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                {hasError[0]}
              </Typography>
            )}
          </Box>
        );

      default:
        return (
          <Alert severity="warning" key={question.id}>
            Question type "{question.type}" is not yet supported.
          </Alert>
        );
    }
  };

  // Calculate completion percentage
  const calculateCompletion = (): number => {
    const visibleQuestionnaires = questionnaires.filter(shouldShowQuestionnaire);
    if (visibleQuestionnaires.length === 0) return 100;

    let totalQuestions = 0;
    let answeredQuestions = 0;

    visibleQuestionnaires.forEach(questionnaire => {
      questionnaire.questions.forEach((question: Question) => {
        if (shouldShowQuestion(question)) {
          totalQuestions++;
          const response = responses[question.id];
          if (response !== undefined && response !== null && response !== '') {
            answeredQuestions++;
          }
        }
      });
    });

    return totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 100;
  };

  // Validation
  const validate = (): StepValidationResult => {
    const errors: Record<string, string[]> = {};
    const visibleQuestionnaires = questionnaires.filter(shouldShowQuestionnaire);

    visibleQuestionnaires.forEach(questionnaire => {
      questionnaire.questions.forEach((question: Question) => {
        if (!shouldShowQuestion(question)) return;

        const questionKey = question.id.toString();
        const response = responses[question.id];

        // Required field validation
        if (question.is_required && (response === undefined || response === null || response === '')) {
          errors[questionKey] = ['This field is required'];
          return;
        }

        // Skip further validation if no response
        if (!response) return;

        // Type-specific validation
        if (question.type === 'email' && response) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(response)) {
            errors[questionKey] = ['Please enter a valid email address'];
          }
        }

        if (question.type === 'phone' && response) {
          const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
          if (!phoneRegex.test(response.replace(/[\s\-\(\)]/g, ''))) {
            errors[questionKey] = ['Please enter a valid phone number'];
          }
        }

        // Validation rules
        if (question.validation_rules) {
          const rules = question.validation_rules;

          if (rules.min_length && response.length < rules.min_length) {
            errors[questionKey] = [`Minimum ${rules.min_length} characters required`];
          }

          if (rules.max_length && response.length > rules.max_length) {
            errors[questionKey] = [`Maximum ${rules.max_length} characters allowed`];
          }

          if (rules.min_value && parseFloat(response) < rules.min_value) {
            errors[questionKey] = [`Minimum value is ${rules.min_value}`];
          }

          if (rules.max_value && parseFloat(response) > rules.max_value) {
            errors[questionKey] = [`Maximum value is ${rules.max_value}`];
          }
        }
      });
    });

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Call validation when responses change
  useEffect(() => {
    if (onValidate) {
      onValidate(data);
    }
  }, [responses, onValidate, data]);

  // Toggle questionnaire expansion
  const toggleQuestionnaire = (questionnaireId: number) => {
    setExpandedQuestionnaires(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionnaireId)) {
        newSet.delete(questionnaireId);
      } else {
        newSet.add(questionnaireId);
      }
      return newSet;
    });
  };

  if (isLoadingQuestionnaires) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Loading questionnaires...
        </Typography>
      </Box>
    );
  }

  if (questionnairesError) {
    return (
      <Alert severity="error">
        <Typography variant="h6" gutterBottom>
          Failed to Load Questionnaires
        </Typography>
        <Typography variant="body2">
          There was an error loading the questionnaires for this step. Please try refreshing the page.
        </Typography>
      </Alert>
    );
  }

  const visibleQuestionnaires = questionnaires.filter(shouldShowQuestionnaire);
  const completionPercentage = calculateCompletion();

  if (visibleQuestionnaires.length === 0) {
    return (
      <Alert severity="info" icon={<Info />}>
        <Typography variant="h6" gutterBottom>
          No Questionnaires Available
        </Typography>
        <Typography variant="body2">
          There are no questionnaires configured for this step, or none match your current selections.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Stack spacing={3}>
        {/* Progress Indicator */}
        <Card elevation={1}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Quiz color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                Questionnaire Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {Math.round(completionPercentage)}% Complete
              </Typography>
            </Box>
            
            <LinearProgress
              variant="determinate"
              value={completionPercentage}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                },
              }}
            />
          </CardContent>
        </Card>

        {/* File Upload Info */}
        {config?.allow_file_uploads && (
          <Alert severity="info">
            <Typography variant="body2">
              File uploads are enabled for this questionnaire. 
              {config.max_file_size_mb && ` Maximum file size: ${config.max_file_size_mb} MB.`}
              {config.allowed_file_types?.length && ` Allowed types: ${config.allowed_file_types.join(', ')}.`}
            </Typography>
          </Alert>
        )}

        {/* Questionnaires */}
        {visibleQuestionnaires.map((questionnaire) => {
          const isExpanded = expandedQuestionnaires.has(questionnaire.id);
          const questionnaireQuestions = questionnaire.questions.filter(shouldShowQuestion);
          const answeredCount = questionnaireQuestions.filter((q: Question) => {
            const response = responses[q.id];
            return response !== undefined && response !== null && response !== '';
          }).length;

          return (
            <Accordion
              key={questionnaire.id}
              expanded={isExpanded}
              onChange={() => toggleQuestionnaire(questionnaire.id)}
              elevation={2}
            >
              <AccordionSummary
                expandIcon={<ExpandMore />}
                sx={{
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  '&.Mui-expanded': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {questionnaire.name}
                    </Typography>
                    {questionnaire.description && (
                      <Typography variant="body2" color="text.secondary">
                        {questionnaire.description}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size="small"
                      label={`${answeredCount}/${questionnaireQuestions.length}`}
                      color={answeredCount === questionnaireQuestions.length ? 'success' : 'default'}
                      icon={answeredCount === questionnaireQuestions.length ? <CheckCircle /> : <RadioButtonUnchecked />}
                    />
                  </Box>
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Stack spacing={3}>
                  {questionnaireQuestions.map((question: Question, index: number) => (
                    <Box key={question.id}>
                      {index > 0 && <Divider sx={{ my: 2 }} />}
                      {renderQuestion(question)}
                    </Box>
                  ))}
                  
                  {questionnaireQuestions.length === 0 && (
                    <Alert severity="info">
                      <Typography variant="body2">
                        No questions are currently visible in this questionnaire based on your previous responses.
                      </Typography>
                    </Alert>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}

        {/* Summary */}
        {completionPercentage === 100 && (
          <Alert severity="success" icon={<CheckCircle />}>
            <Typography variant="h6" gutterBottom>
              Questionnaire Complete!
            </Typography>
            <Typography variant="body2">
              You have successfully answered all required questions. You can proceed to the next step.
            </Typography>
          </Alert>
        )}
      </Stack>
    </Box>
  );
};

export default QuestionnaireStep;