// frontend/client-portal/src/components/booking/steps/QuestionnaireStep.tsx

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  FormControl,
  FormLabel,
  FormControlLabel,
  FormGroup,
  Radio,
  RadioGroup,
  Checkbox,
  Select,
  MenuItem,
  Button,
  Chip,
  Alert,
  Divider,
  LinearProgress,
  InputLabel,
  Stack,
  Paper,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  Delete as DeleteIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { bookingFlowAPI } from '../../../apis/bookingflow.api';
import { useBookingSessionContext } from '../../../contexts/BookingSessionContext';
import type { 
  BaseStepProps,
  QuestionnaireQuestion,
} from '../../../types/booking-steps.types';
import type { 
  QuestionnaireStepData 
} from '../../../types/booking-session.types';
import type {
  QuestionnaireStepConfiguration
} from '../../../types/booking.types';

const QuestionnaireStep: React.FC<BaseStepProps<QuestionnaireStepData>> = ({
  step,
  data,
  onUpdate,
  onNext,
  onPrevious,
  onSave,
  isLoading = false,
  validationErrors = {},
  canGoNext = true,
  canGoPrevious = true,
  showSaveButton = true,
}) => {
  const { validateStepData } = useBookingSessionContext();
  
  const [responses, setResponses] = useState<Record<string, any>>(data.responses || {});
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File[]>>({});
  const [localErrors, setLocalErrors] = useState<Record<string, string[]>>({});
  const [isValidating, setIsValidating] = useState(false);

  const config = step.configuration_data as QuestionnaireStepConfiguration;

  // Get available questionnaires for this step
  const {
    data: questionnaires = [],
    isLoading: isLoadingQuestionnaires,
    error: questionnairesError
  } = useQuery({
    queryKey: ['questionnaire-step', step.id, 'questionnaires'],
    queryFn: () => bookingFlowAPI.getAvailableQuestionnaires(step.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Get questionnaire items from config, sorted by order
  const questionnaireItems = config?.questionnaire_items 
    ? [...config.questionnaire_items].sort((a, b) => a.order - b.order)
    : [];

  // Collect all questions from all questionnaires
  const allQuestions: QuestionnaireQuestion[] = React.useMemo(() => {
    if (!questionnaires.length || !questionnaireItems.length) return [];

    const questions: QuestionnaireQuestion[] = [];
    
    questionnaireItems.forEach(item => {
      const questionnaire = questionnaires.find(q => q.id === item.questionnaire);
      if (questionnaire) {
        // Since we don't have the full questionnaire details with questions,
        // we'll create placeholder questions based on the questionnaire
        // In a real implementation, you'd fetch the full questionnaire details
        questions.push({
          id: questionnaire.id,
          question_text: questionnaire.name,
          question_type: 'TEXTAREA',
          is_required: true,
          help_text: questionnaire.description,
        });
      }
    });

    return questions;
  }, [questionnaires, questionnaireItems]);

  // Update parent component when responses change
  useEffect(() => {
    const updatedData: QuestionnaireStepData = {
      responses,
      uploaded_files: Object.values(uploadedFiles).flat(),
    };
    onUpdate(updatedData);
  }, [responses, uploadedFiles, onUpdate]);

  // Handle response change
  const handleResponseChange = useCallback((questionId: number, value: any) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: value,
    }));
    
    // Clear local error for this field
    if (localErrors[questionId.toString()]) {
      setLocalErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[questionId.toString()];
        return newErrors;
      });
    }
  }, [localErrors]);

  // Handle file upload
  const handleFileUpload = useCallback((questionId: number, files: FileList | null) => {
    if (!files || !config?.allow_file_uploads) return;

    const fileArray = Array.from(files);
    const maxSize = (config.max_file_size_mb || 10) * 1024 * 1024; // Convert to bytes
    const allowedTypes = config.allowed_file_types || [];

    // Validate files
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach(file => {
      // Check file size
      if (file.size > maxSize) {
        errors.push(`${file.name} is too large (max ${config.max_file_size_mb}MB)`);
        return;
      }

      // Check file type if restrictions exist
      if (allowedTypes.length > 0) {
        const fileExtension = file.name.split('.').pop()?.toLowerCase();
        if (!fileExtension || !allowedTypes.includes(fileExtension)) {
          errors.push(`${file.name} type not allowed (allowed: ${allowedTypes.join(', ')})`);
          return;
        }
      }

      validFiles.push(file);
    });

    if (errors.length > 0) {
      setLocalErrors(prev => ({
        ...prev,
        [questionId.toString()]: errors,
      }));
      return;
    }

    setUploadedFiles(prev => ({
      ...prev,
      [questionId]: validFiles,
    }));

    // Update responses to include file references
    handleResponseChange(questionId, validFiles.map(f => f.name));
  }, [config, handleResponseChange]);

  // Remove uploaded file
  const handleFileRemove = useCallback((questionId: number, fileIndex: number) => {
    setUploadedFiles(prev => {
      const questionFiles = prev[questionId] || [];
      const newFiles = questionFiles.filter((_, index) => index !== fileIndex);
      
      return {
        ...prev,
        [questionId]: newFiles,
      };
    });

    // Update responses
    const questionFiles = uploadedFiles[questionId] || [];
    const newFileNames = questionFiles
      .filter((_, index) => index !== fileIndex)
      .map(f => f.name);
    
    handleResponseChange(questionId, newFileNames);
  }, [uploadedFiles, handleResponseChange]);

  // Validate responses
  const validateResponses = useCallback(async () => {
    setIsValidating(true);
    const errors: Record<string, string[]> = {};

    // Client-side validation
    allQuestions.forEach(question => {
      const response = responses[question.id];
      
      if (question.is_required && (!response || response === '')) {
        errors[question.id.toString()] = ['This field is required'];
      }
    });

    setLocalErrors(errors);

    // Server-side validation
    try {
      const result = await validateStepData(step.id, { responses });
      if (!result.isValid) {
        setLocalErrors(prev => ({
          ...prev,
          ...result.errors,
        }));
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }

    setIsValidating(false);
    return Object.keys(errors).length === 0;
  }, [allQuestions, responses, step.id, validateStepData]);

  // Handle next step
  const handleNext = useCallback(async () => {
    const isValid = await validateResponses();
    if (isValid) {
      onNext();
    }
  }, [validateResponses, onNext]);

  // Render question input based on type
  const renderQuestionInput = (question: QuestionnaireQuestion) => {
    const questionId = question.id.toString();
    const value = responses[question.id] || '';
    const error = localErrors[questionId] || validationErrors[questionId] || [];
    const hasError = error.length > 0;

    switch (question.question_type) {
      case 'TEXT':
        return (
          <TextField
            fullWidth
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            error={hasError}
            helperText={hasError ? error[0] : question.help_text}
            required={question.is_required}
            disabled={isLoading}
          />
        );

      case 'TEXTAREA':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            error={hasError}
            helperText={hasError ? error[0] : question.help_text}
            required={question.is_required}
            disabled={isLoading}
          />
        );

      case 'SELECT':
        return (
          <FormControl fullWidth error={hasError} required={question.is_required}>
            <InputLabel>Select an option</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
              disabled={isLoading}
            >
              {question.options?.map((option) => (
                <MenuItem key={option.id} value={option.value}>
                  {option.text}
                </MenuItem>
              ))}
            </Select>
            {(hasError || question.help_text) && (
              <Typography variant="caption" color={hasError ? 'error' : 'text.secondary'} sx={{ mt: 0.5, ml: 1.75 }}>
                {hasError ? error[0] : question.help_text}
              </Typography>
            )}
          </FormControl>
        );

      case 'RADIO':
        return (
          <FormControl error={hasError} required={question.is_required}>
            <RadioGroup
              value={value}
              onChange={(e) => handleResponseChange(question.id, e.target.value)}
            >
              {question.options?.map((option) => (
                <FormControlLabel
                  key={option.id}
                  value={option.value}
                  control={<Radio disabled={isLoading} />}
                  label={option.text}
                />
              ))}
            </RadioGroup>
            {(hasError || question.help_text) && (
              <Typography variant="caption" color={hasError ? 'error' : 'text.secondary'}>
                {hasError ? error[0] : question.help_text}
              </Typography>
            )}
          </FormControl>
        );

      case 'CHECKBOX':
        const checkboxValues = Array.isArray(value) ? value : [];
        return (
          <FormControl error={hasError} required={question.is_required}>
            <FormGroup>
              {question.options?.map((option) => (
                <FormControlLabel
                  key={option.id}
                  control={
                    <Checkbox
                      checked={checkboxValues.includes(option.value)}
                      onChange={(e) => {
                        const newValues = e.target.checked
                          ? [...checkboxValues, option.value]
                          : checkboxValues.filter(v => v !== option.value);
                        handleResponseChange(question.id, newValues);
                      }}
                      disabled={isLoading}
                    />
                  }
                  label={option.text}
                />
              ))}
            </FormGroup>
            {(hasError || question.help_text) && (
              <Typography variant="caption" color={hasError ? 'error' : 'text.secondary'}>
                {hasError ? error[0] : question.help_text}
              </Typography>
            )}
          </FormControl>
        );

      case 'DATE':
        return (
          <TextField
            fullWidth
            type="date"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            error={hasError}
            helperText={hasError ? error[0] : question.help_text}
            required={question.is_required}
            disabled={isLoading}
            InputLabelProps={{ shrink: true }}
          />
        );

      case 'NUMBER':
        return (
          <TextField
            fullWidth
            type="number"
            value={value}
            onChange={(e) => handleResponseChange(question.id, e.target.value)}
            error={hasError}
            helperText={hasError ? error[0] : question.help_text}
            required={question.is_required}
            disabled={isLoading}
          />
        );

      case 'FILE':
        if (!config?.allow_file_uploads) {
          return (
            <Alert severity="info">
              File uploads are not enabled for this questionnaire.
            </Alert>
          );
        }

        const questionFiles = uploadedFiles[question.id] || [];
        return (
          <Box>
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              disabled={isLoading}
              sx={{ mb: 2 }}
            >
              Upload Files
              <input
                type="file"
                hidden
                multiple
                onChange={(e) => handleFileUpload(question.id, e.target.files)}
                accept={config.allowed_file_types?.map(type => `.${type}`).join(',')}
              />
            </Button>

            {questionFiles.length > 0 && (
              <Stack spacing={1}>
                {questionFiles.map((file, index) => (
                  <Paper key={index} sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {file.name}
                    </Typography>
                    <Chip
                      label={`${Math.round(file.size / 1024)} KB`}
                      size="small"
                      variant="outlined"
                    />
                    <Button
                      size="small"
                      color="error"
                      onClick={() => handleFileRemove(question.id, index)}
                      startIcon={<DeleteIcon />}
                    >
                      Remove
                    </Button>
                  </Paper>
                ))}
              </Stack>
            )}

            {config.allowed_file_types && config.allowed_file_types.length > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Allowed file types: {config.allowed_file_types.join(', ')}
              </Typography>
            )}

            {config.max_file_size_mb && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Maximum file size: {config.max_file_size_mb}MB
              </Typography>
            )}

            {hasError && (
              <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                {error[0]}
              </Typography>
            )}

            {question.help_text && !hasError && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                {question.help_text}
              </Typography>
            )}
          </Box>
        );

      default:
        return (
          <Alert severity="warning">
            Unsupported question type: {question.question_type}
          </Alert>
        );
    }
  };

  if (isLoadingQuestionnaires) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 3 }} />
        <Typography>Loading questionnaire...</Typography>
      </Box>
    );
  }

  if (questionnairesError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load questionnaire. Please try again.
        </Alert>
      </Box>
    );
  }

  if (!allQuestions.length) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">
          No questionnaire has been configured for this step.
        </Alert>
        
        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          {canGoPrevious && (
            <Button
              variant="outlined"
              onClick={onPrevious}
              disabled={isLoading}
            >
              Previous
            </Button>
          )}
          
          {canGoNext && (
            <Button
              variant="contained"
              onClick={onNext}
              disabled={isLoading}
            >
              Continue
            </Button>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h4" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
        {step.name}
      </Typography>

      {step.description && (
        <Typography variant="body1" sx={{ mb: 4, color: 'text.secondary' }}>
          {step.description}
        </Typography>
      )}

      <Stack spacing={4}>
        {allQuestions.map((question, index) => (
          <Card key={question.id}>
            <CardContent>
              <FormLabel
                required={question.is_required}
                error={!!(localErrors[question.id.toString()] || validationErrors[question.id.toString()])}
                sx={{ mb: 2, display: 'block', fontWeight: 600 }}
              >
                {question.question_text}
              </FormLabel>
              
              {renderQuestionInput(question)}
              
              {index < allQuestions.length - 1 && <Divider sx={{ mt: 3 }} />}
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Navigation */}
      <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'space-between' }}>
        <Box>
          {canGoPrevious && (
            <Button
              variant="outlined"
              onClick={onPrevious}
              disabled={isLoading || isValidating}
            >
              Previous
            </Button>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {showSaveButton && (
            <Button
              variant="outlined"
              onClick={onSave}
              disabled={isLoading || isValidating}
            >
              Save Progress
            </Button>
          )}
          
          {canGoNext && (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={isLoading || isValidating}
            >
              {isValidating ? 'Validating...' : 'Continue'}
            </Button>
          )}
        </Box>
      </Box>

      {/* Validation errors */}
      {Object.keys(localErrors).length > 0 && (
        <Alert severity="error" sx={{ mt: 3 }} icon={<ErrorIcon />}>
          Please correct the errors above before continuing.
        </Alert>
      )}
    </Box>
  );
};

export default QuestionnaireStep;