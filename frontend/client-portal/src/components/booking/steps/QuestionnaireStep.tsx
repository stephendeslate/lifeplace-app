// frontend/client-portal/src/components/booking/steps/QuestionnaireStep.tsx

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  FormControl,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
  Checkbox,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  CircularProgress,
  InputLabel,
  Chip,
  OutlinedInput,
  LinearProgress,
} from '@mui/material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CheckCircle, Warning } from '@mui/icons-material';
import {
  useQuestionnaireDetail,
  useQuestionnaireFileUpload,
  useDynamicQuestionnaire,
  useQuestionnaireSummary
} from '../../../hooks/booking/useQuestionnaire';
import type { 
  QuestionnaireStepConfiguration,
  QuestionnaireStepItem,
  QuestionnaireField,
  QuestionnaireDetailResponse,
  StepValidationResult
} from '../../../types/booking';
import QuestionnaireApi from '../../../apis/booking/questionnaire.api';

interface QuestionnaireStepProps {
  stepData?: Record<string, any>;
  config: QuestionnaireStepConfiguration | null;
  onDataChange: (data: Record<string, any>) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  onValidate?: (data: any) => Promise<StepValidationResult>;
}

export const QuestionnaireStep: React.FC<QuestionnaireStepProps> = ({
  stepData = {},
  config,
  onDataChange,
  validationErrors,
  isValidating,
  onValidate,
}) => {
  const [questionnairesWithFields, setQuestionnairesWithFields] = useState<Map<number, QuestionnaireDetailResponse>>(new Map());
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState<Set<number>>(new Set());
  const [loadErrors, setLoadErrors] = useState<Map<number, string>>(new Map());

  // Use props stepData as single source of truth
  const responses = stepData;

  // File upload hook
  const {
    uploadFiles,
    removeFile,
    getUploadedFiles,
    isUploading,
    getUploadError,
  } = useQuestionnaireFileUpload();

  // Update response helper that directly calls parent's onDataChange
  const updateResponse = useCallback((fieldId: string | number, value: any) => {
    const updatedData = {
      ...responses,
      [`field_${fieldId}`]: value,
    };
    onDataChange(updatedData);

    // Auto-validate if onValidate is provided
    if (onValidate) {
      onValidate(updatedData).catch(error => {
        console.warn('Validation failed:', error);
      });
    }
  }, [responses, onDataChange, onValidate]);

  // Get response for a specific field
  const getResponse = useCallback((fieldKey: string) => {
    return responses[fieldKey];
  }, [responses]);

  // Check if a field has a response
  const hasResponse = useCallback((fieldKey: string) => {
    const response = responses[fieldKey];
    return response !== undefined && response !== null && response !== '';
  }, [responses]);

  // Get validation error for a field
  const getFieldError = useCallback((fieldKey: string) => {
    return validationErrors[fieldKey]?.[0];
  }, [validationErrors]);

  // Check if a field has validation errors
  const hasFieldError = useCallback((fieldKey: string) => {
    return !!(validationErrors[fieldKey]?.length > 0);
  }, [validationErrors]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const allFields: QuestionnaireField[] = [];
    questionnairesWithFields.forEach(q => {
      allFields.push(...q.fields);
    });
    
    if (allFields.length === 0) return 0;
    
    const responseCount = allFields.filter(field => 
      hasResponse(`field_${field.id}`)
    ).length;
    
    return Math.round((responseCount / allFields.length) * 100);
  }, [questionnairesWithFields, hasResponse]);

  // Get required fields that are missing responses
  const missingRequiredFields = useMemo(() => {
    const allFields: QuestionnaireField[] = [];
    questionnairesWithFields.forEach(q => {
      allFields.push(...q.fields);
    });
    
    return allFields.filter(field => 
      field.required && !hasResponse(`field_${field.id}`)
    );
  }, [questionnairesWithFields, hasResponse]);

  // Load questionnaire details
  const loadQuestionnaireDetails = useCallback(async (questionnaireId: number) => {
    if (questionnairesWithFields.has(questionnaireId) || loadingQuestionnaires.has(questionnaireId)) {
      return;
    }

    setLoadingQuestionnaires(prev => new Set([...prev, questionnaireId]));
    setLoadErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(questionnaireId);
      return newErrors;
    });

    try {
      // ✅ FIX: Use the API directly instead of the hook
      const questionnaire = await QuestionnaireApi.getQuestionnaireDetail(questionnaireId);
      
      if (questionnaire) {
        setQuestionnairesWithFields(prev => new Map([...prev, [questionnaireId, questionnaire]]));
      }
    } catch (error) {
      console.error(`Failed to load questionnaire ${questionnaireId}:`, error);
      setLoadErrors(prev => new Map([...prev, [questionnaireId, 'Failed to load questionnaire']]));
    } finally {
      setLoadingQuestionnaires(prev => {
        const newLoading = new Set(prev);
        newLoading.delete(questionnaireId);
        return newLoading;
      });
    }
  }, [questionnairesWithFields, loadingQuestionnaires]);

  // Load all questionnaires on mount
  React.useEffect(() => {
    if (config?.questionnaire_items) {
      config.questionnaire_items.forEach(item => {
        loadQuestionnaireDetails(item.questionnaire);
      });
    }
  }, [config?.questionnaire_items, loadQuestionnaireDetails]);

  // Dynamic questionnaire logic
  const allQuestionnaires = Array.from(questionnairesWithFields.values());
  const {
    visibleQuestionnaires,
    getVisibleFields,
    shouldShowQuestionnaire,
    shouldShowField,
  } = useDynamicQuestionnaire(allQuestionnaires, responses);

  // Summary for validation
  const { summary, hasAnyResponses, responseCount } = useQuestionnaireSummary(
    visibleQuestionnaires,
    responses
  );

  const handleFieldChange = async (fieldId: string, value: any) => {
    updateResponse(fieldId.replace('field_', ''), value);
  };

  const handleFileUpload = async (fieldId: number, files: File[]) => {
    const questionnaireId = findQuestionnaireForField(fieldId);
    if (!questionnaireId) return;

    try {
      const uploadedUrls = await uploadFiles(questionnaireId, fieldId, files);
      updateResponse(fieldId, uploadedUrls);
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  const findQuestionnaireForField = (fieldId: number): number | null => {
    for (const [qId, questionnaire] of questionnairesWithFields) {
      if (questionnaire.fields.some(field => field.id === fieldId)) {
        return qId;
      }
    }
    return null;
  };

  const renderField = (field: QuestionnaireField, questionnaire: QuestionnaireDetailResponse) => {
    const fieldKey = `field_${field.id}`;
    const value = getResponse(fieldKey) || '';
    const error = getFieldError(fieldKey) || validationErrors[fieldKey]?.[0];
    const hasError = hasFieldError(fieldKey) || !!validationErrors[fieldKey];

    // Check if field should be visible
    if (!shouldShowField(questionnaire, field)) {
      return null;
    }

    switch (field.type) {
      case 'text':
        return (
          <TextField
            fullWidth
            label={field.name}
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            required={field.required}
            error={hasError}
            helperText={error || field.help_text}
            placeholder={field.placeholder}
            multiline={false}
          />
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            label={field.name}
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            required={field.required}
            error={hasError}
            helperText={error || field.help_text}
            placeholder={field.placeholder}
            multiline
            rows={4}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            label={field.name}
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            required={field.required}
            error={hasError}
            helperText={error || field.help_text}
            placeholder={field.placeholder}
          />
        );

      case 'email':
        return (
          <TextField
            fullWidth
            type="email"
            label={field.name}
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            required={field.required}
            error={hasError}
            helperText={error || field.help_text}
            placeholder={field.placeholder}
          />
        );

      case 'phone':
        return (
          <TextField
            fullWidth
            type="tel"
            label={field.name}
            value={value}
            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            required={field.required}
            error={hasError}
            helperText={error || field.help_text}
            placeholder={field.placeholder}
          />
        );

      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={field.name}
              value={value ? new Date(value) : null}
              onChange={(date) => handleFieldChange(fieldKey, date?.toISOString().split('T')[0] || '')}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: field.required,
                  error: hasError,
                  helperText: error || field.help_text,
                },
              }}
            />
          </LocalizationProvider>
        );

      case 'time':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <TimePicker
              label={field.name}
              value={value ? new Date(`2000-01-01T${value}`) : null}
              onChange={(time) => handleFieldChange(fieldKey, time?.toTimeString().split(' ')[0] || '')}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: field.required,
                  error: hasError,
                  helperText: error || field.help_text,
                },
              }}
            />
          </LocalizationProvider>
        );

      case 'boolean':
        return (
          <FormControl error={hasError}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={value === 'true' || value === true}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.checked)}
                />
              }
              label={field.name}
            />
            {(error || field.help_text) && (
              <FormHelperText>{error || field.help_text}</FormHelperText>
            )}
          </FormControl>
        );

      case 'select':
        return (
          <FormControl fullWidth error={hasError}>
            <InputLabel>{field.name}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              label={field.name}
              required={field.required}
            >
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {(error || field.help_text) && (
              <FormHelperText>{error || field.help_text}</FormHelperText>
            )}
          </FormControl>
        );

      case 'multi-select':
        return (
          <FormControl fullWidth error={hasError}>
            <InputLabel>{field.name}</InputLabel>
            <Select
              multiple
              value={Array.isArray(value) ? value : []}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
              input={<OutlinedInput label={field.name} />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {(selected as string[]).map((val) => (
                    <Chip key={val} label={val} size="small" />
                  ))}
                </Box>
              )}
              required={field.required}
            >
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            {(error || field.help_text) && (
              <FormHelperText>{error || field.help_text}</FormHelperText>
            )}
          </FormControl>
        );

      case 'radio':
        return (
          <FormControl error={hasError}>
            <FormLabel component="legend">{field.name}</FormLabel>
            <RadioGroup
              value={value}
              onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
            {(error || field.help_text) && (
              <FormHelperText>{error || field.help_text}</FormHelperText>
            )}
          </FormControl>
        );

      case 'file':
        if (!config?.allow_file_uploads) {
          return (
            <Alert severity="info">
              File uploads are not enabled for this questionnaire
            </Alert>
          );
        }

        const uploadError = getUploadError(field.id);
        const uploading = isUploading(field.id);
        const uploadedFiles = getUploadedFiles(field.id);

        return (
          <FormControl fullWidth error={hasError}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {field.name} {field.required && '*'}
            </Typography>
            
            <TextField
              type="file"
              fullWidth
              onChange={(e: any) => {
                const files = Array.from(e.target.files || []) as File[];
                if (files.length > 0) {
                  // Validate file size
                  const maxSizeMB = config?.max_file_size_mb || 10;
                  const oversizedFiles = files.filter(file => file.size > maxSizeMB * 1024 * 1024);
                  
                  if (oversizedFiles.length > 0) {
                    alert(`Some files are too large. Maximum file size is ${maxSizeMB}MB`);
                    return;
                  }

                  // Validate file types
                  if (config?.allowed_file_types && config.allowed_file_types.length > 0) {
                    const invalidFiles = files.filter(file => {
                      const fileExt = file.name.split('.').pop()?.toLowerCase();
                      return !fileExt || !config.allowed_file_types.includes(fileExt);
                    });

                    if (invalidFiles.length > 0) {
                      alert(`Some files have invalid types. Allowed types: ${config.allowed_file_types.join(', ')}`);
                      return;
                    }
                  }

                  handleFileUpload(field.id, files);
                }
              }}
              inputProps={{
                accept: config?.allowed_file_types?.map(ext => `.${ext}`).join(','),
                multiple: true,
              }}
              error={hasError}
              helperText={error || field.help_text || `Max file size: ${config?.max_file_size_mb || 10}MB`}
              disabled={uploading}
            />

            {uploading && (
              <Box sx={{ mt: 1 }}>
                <LinearProgress />
                <Typography variant="caption" color="text.secondary">
                  Uploading files...
                </Typography>
              </Box>
            )}

            {uploadError && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {uploadError}
              </Alert>
            )}

            {uploadedFiles.length > 0 && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  Uploaded files: {uploadedFiles.length}
                </Typography>
              </Box>
            )}
          </FormControl>
        );

      case 'rating':
        return (
          <FormControl fullWidth error={hasError}>
            <FormLabel component="legend">{field.name}</FormLabel>
            <TextField
              type="number"
              value={value}
              onChange={(e) => handleFieldChange(fieldKey, parseInt(e.target.value) || 0)}
              inputProps={{ min: 1, max: 5 }}
              helperText={error || field.help_text || "Rate from 1 to 5"}
              error={hasError}
            />
          </FormControl>
        );

      default:
        return (
          <Alert severity="warning">
            Unsupported field type: {field.type}
          </Alert>
        );
    }
  };

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
    return (
      <Alert severity="info">
        No questionnaires configured for this step
      </Alert>
    );
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
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
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
              <Paper key={questionnaireItem.id} elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                <Alert severity="warning">
                  {error || 'Unable to load questionnaire'}
                </Alert>
              </Paper>
            );
          }

          // Check if questionnaire should be displayed
          if (!shouldShowQuestionnaire(questionnaire)) {
            return null;
          }

          const visibleFields = getVisibleFields(questionnaire);
          
          if (visibleFields.length === 0) {
            return null;
          }

          return (
            <Paper key={questionnaireItem.id} elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                {questionnaire.name}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visibleFields
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <Box key={field.id}>
                      {renderField(field, questionnaire)}
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
            {missingRequiredFields.map(field => (
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
            <strong>File Upload Information:</strong><br />
            Maximum file size: {config.max_file_size_mb}MB<br />
            {config.allowed_file_types && config.allowed_file_types.length > 0 && (
              <>Allowed file types: {config.allowed_file_types.join(', ')}</>
            )}
          </Typography>
        </Alert>
      )}
    </Box>
  );
};