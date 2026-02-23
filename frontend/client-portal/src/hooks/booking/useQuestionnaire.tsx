// frontend/client-portal/src/hooks/booking/useQuestionnaire.ts

import { useState, useEffect, useCallback, useMemo } from 'react';
import { QuestionnaireApi } from '../../apis/booking/questionnaire.api';
import { ErrorHandler } from '../../utils/errorHandler';
import type {
  Questionnaire,
  QuestionnaireField,
  QuestionnaireDetailResponse,
} from '../../types/booking';

// Hook for managing questionnaires list
export const useQuestionnaires = (eventTypeId?: number) => {
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestionnaires = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let data: Questionnaire[];

      if (eventTypeId) {
        data = await QuestionnaireApi.getQuestionnairesByEventType(eventTypeId);
      } else {
        data = await QuestionnaireApi.getQuestionnaires();
      }

      setQuestionnaires(data);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [eventTypeId]);

  useEffect(() => {
    fetchQuestionnaires();
  }, [fetchQuestionnaires]);

  return {
    questionnaires,
    loading,
    error,
    refetch: fetchQuestionnaires,
  };
};

// Hook for managing a single questionnaire detail
export const useQuestionnaireDetail = (questionnaireId?: number) => {
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuestionnaire = useCallback(async () => {
    if (!questionnaireId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await QuestionnaireApi.getQuestionnaireDetail(questionnaireId);
      setQuestionnaire(data);
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [questionnaireId]);

  useEffect(() => {
    fetchQuestionnaire();
  }, [fetchQuestionnaire]);

  return {
    questionnaire,
    loading,
    error,
    refetch: fetchQuestionnaire,
  };
};

// Hook for managing questionnaire fields
export const useQuestionnaireFields = (questionnaireId?: number) => {
  const [fields, setFields] = useState<QuestionnaireField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    if (!questionnaireId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await QuestionnaireApi.getQuestionnaireFields(questionnaireId);
      setFields(data.sort((a, b) => a.order - b.order));
    } catch (err) {
      const errorMessage = ErrorHandler.extractMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [questionnaireId]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  return {
    fields,
    loading,
    error,
    refetch: fetchFields,
  };
};

// Hook for managing questionnaire responses
export const useQuestionnaireResponses = (fields: QuestionnaireField[] = []) => {
  const [responses, setResponses] = useState<Record<string, unknown>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string[]>>({});
  const [isValid, setIsValid] = useState(false);

  // Update a single response
  const updateResponse = useCallback((fieldId: string | number, value: Record<string, unknown>) => {
    setResponses((prev) => ({
      ...prev,
      [fieldId.toString()]: value,
    }));
  }, []);

  // Update multiple responses
  const updateResponses = useCallback((newResponses: Record<string, unknown>) => {
    setResponses((prev) => ({
      ...prev,
      ...newResponses,
    }));
  }, []);

  // Clear all responses
  const clearResponses = useCallback(() => {
    setResponses({});
    setValidationErrors({});
  }, []);

  // Clear a specific response
  const clearResponse = useCallback((fieldId: string | number) => {
    setResponses((prev) => {
      const updated = { ...prev };
      delete updated[fieldId.toString()];
      return updated;
    });
  }, []);

  // Validate all responses
  const validateResponses = useCallback(() => {
    const validation = QuestionnaireApi.validateResponses(fields, responses);
    setValidationErrors(validation.errors);
    setIsValid(validation.isValid);
    return validation;
  }, [fields, responses]);

  // Get formatted responses for submission
  const getFormattedResponses = useCallback(() => {
    return QuestionnaireApi.formatResponses(fields, responses);
  }, [fields, responses]);

  // Get response for a specific field
  const getResponse = useCallback(
    (fieldId: string | number) => {
      return responses[fieldId.toString()];
    },
    [responses],
  );

  // Check if a field has a response
  const hasResponse = useCallback(
    (fieldId: string | number) => {
      const response = responses[fieldId.toString()];
      return response !== undefined && response !== null && response !== '';
    },
    [responses],
  );

  // Get validation error for a field
  const getFieldError = useCallback(
    (fieldId: string | number) => {
      return validationErrors[fieldId.toString()]?.[0];
    },
    [validationErrors],
  );

  // Check if a field has validation errors
  const hasFieldError = useCallback(
    (fieldId: string | number) => {
      return !!(validationErrors[fieldId.toString()]?.length > 0);
    },
    [validationErrors],
  );

  // Auto-validate when responses or fields change
  useEffect(() => {
    if (fields.length > 0) {
      validateResponses();
    }
  }, [fields, responses, validateResponses]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (fields.length === 0) return 0;

    const responseCount = fields.filter((field) => hasResponse(field.id)).length;

    return Math.round((responseCount / fields.length) * 100);
  }, [fields, hasResponse]);

  // Get required fields that are missing responses
  const missingRequiredFields = useMemo(() => {
    return fields.filter((field) => field.required && !hasResponse(field.id));
  }, [fields, hasResponse]);

  return {
    responses,
    validationErrors,
    isValid,
    updateResponse,
    updateResponses,
    clearResponses,
    clearResponse,
    validateResponses,
    getFormattedResponses,
    getResponse,
    hasResponse,
    getFieldError,
    hasFieldError,
    completionPercentage,
    missingRequiredFields,
  };
};

// Hook for file upload management
export const useQuestionnaireFileUpload = () => {
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string[]>>({});
  const [uploadLoading, setUploadLoading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const uploadFiles = useCallback(
    async (questionnaireId: number, fieldId: number, files: File[]) => {
      const fieldKey = fieldId.toString();

      setUploadLoading((prev) => ({ ...prev, [fieldKey]: true }));
      setUploadErrors((prev) => ({ ...prev, [fieldKey]: '' }));

      try {
        const uploadedUrls = await QuestionnaireApi.processFileUploads(
          questionnaireId,
          fieldId,
          files,
        );

        setUploadedFiles((prev) => ({
          ...prev,
          [fieldKey]: [...(prev[fieldKey] || []), ...uploadedUrls],
        }));

        return uploadedUrls;
      } catch (err) {
        const errorMessage = QuestionnaireApi.handleQuestionnaireError(err);
        setUploadErrors((prev) => ({ ...prev, [fieldKey]: errorMessage }));
        throw err;
      } finally {
        setUploadLoading((prev) => ({ ...prev, [fieldKey]: false }));
      }
    },
    [],
  );

  const removeFile = useCallback((fieldId: number, fileIndex: number) => {
    const fieldKey = fieldId.toString();

    setUploadedFiles((prev) => ({
      ...prev,
      [fieldKey]: prev[fieldKey]?.filter((_, index) => index !== fileIndex) || [],
    }));
  }, []);

  const clearFiles = useCallback((fieldId: number) => {
    const fieldKey = fieldId.toString();

    setUploadedFiles((prev) => ({
      ...prev,
      [fieldKey]: [],
    }));
  }, []);

  const getUploadedFiles = useCallback(
    (fieldId: number) => {
      return uploadedFiles[fieldId.toString()] || [];
    },
    [uploadedFiles],
  );

  const isUploading = useCallback(
    (fieldId: number) => {
      return uploadLoading[fieldId.toString()] || false;
    },
    [uploadLoading],
  );

  const getUploadError = useCallback(
    (fieldId: number) => {
      return uploadErrors[fieldId.toString()] || '';
    },
    [uploadErrors],
  );

  return {
    uploadedFiles,
    uploadFiles,
    removeFile,
    clearFiles,
    getUploadedFiles,
    isUploading,
    getUploadError,
  };
};

// Hook for questionnaire summary and display
export const useQuestionnaireSummary = (
  questionnaires: QuestionnaireDetailResponse[],
  responses: Record<string, unknown>,
) => {
  const summary = useMemo(() => {
    return QuestionnaireApi.generateResponseSummary(questionnaires, responses);
  }, [questionnaires, responses]);

  const getDisplayValue = useCallback(
    (field: QuestionnaireField, response: Record<string, unknown>) => {
      return QuestionnaireApi.getResponseDisplayValue(field, response);
    },
    [],
  );

  const hasAnyResponses = useMemo(() => {
    return Object.keys(responses).some((key) => {
      const value = responses[key];
      return value !== undefined && value !== null && value !== '';
    });
  }, [responses]);

  const responseCount = useMemo(() => {
    return Object.keys(responses).filter((key) => {
      const value = responses[key];
      return value !== undefined && value !== null && value !== '';
    }).length;
  }, [responses]);

  return {
    summary,
    getDisplayValue,
    hasAnyResponses,
    responseCount,
  };
};

// Hook for dynamic questionnaire logic
export const useDynamicQuestionnaire = (
  questionnaires: QuestionnaireDetailResponse[],
  _responses: Record<string, unknown>,
) => {
  // Get visible questionnaires based on conditions
  const visibleQuestionnaires = useMemo(() => {
    return questionnaires.filter(() => {
      // Add logic here for conditional questionnaire display
      // For now, show all questionnaires
      return true;
    });
  }, [questionnaires]);

  // Get visible fields for a questionnaire
  const getVisibleFields = useCallback((questionnaire: QuestionnaireDetailResponse) => {
    return questionnaire.fields.filter(() => {
      // Add logic here for conditional field display
      // For now, show all fields
      return true;
    });
  }, []);

  // Check if questionnaire should be shown
  const shouldShowQuestionnaire = useCallback(
    (questionnaire: QuestionnaireDetailResponse) => {
      return visibleQuestionnaires.some((q) => q.id === questionnaire.id);
    },
    [visibleQuestionnaires],
  );

  // Check if field should be shown
  const shouldShowField = useCallback(
    (questionnaire: QuestionnaireDetailResponse, field: QuestionnaireField) => {
      if (!shouldShowQuestionnaire(questionnaire)) return false;

      const visibleFields = getVisibleFields(questionnaire);
      return visibleFields.some((f) => f.id === field.id);
    },
    [shouldShowQuestionnaire, getVisibleFields],
  );

  return {
    visibleQuestionnaires,
    getVisibleFields,
    shouldShowQuestionnaire,
    shouldShowField,
  };
};
