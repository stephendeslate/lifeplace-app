import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  useQuestionnaireFileUpload,
  useDynamicQuestionnaire,
  useQuestionnaireSummary,
} from '@/hooks/booking/useQuestionnaire';
import type {
  QuestionnaireStepConfiguration,
  QuestionnaireField,
  QuestionnaireDetailResponse,
  StepValidationResult,
} from '@/types/booking';
import QuestionnaireApi from '@/apis/booking/questionnaire.api';

export interface QuestionnaireStepProps {
  stepData?: Record<string, unknown>;
  config: QuestionnaireStepConfiguration | null;
  onDataChange: (data: Record<string, unknown>) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  onValidate?: (data: Record<string, unknown>) => Promise<StepValidationResult>;
}

export function useQuestionnaireStepLogic({
  stepData = {},
  config,
  onDataChange,
  validationErrors,
  onValidate,
}: QuestionnaireStepProps) {
  const [questionnairesWithFields, setQuestionnairesWithFields] = useState<
    Map<number, QuestionnaireDetailResponse>
  >(new Map());
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState<Set<number>>(new Set());
  const [loadErrors, setLoadErrors] = useState<Map<number, string>>(new Map());

  // Use props stepData as single source of truth
  const responses = stepData;

  // File upload hook
  const { uploadFiles, getUploadedFiles, isUploading, getUploadError } =
    useQuestionnaireFileUpload();

  // Update response helper that directly calls parent's onDataChange
  const updateResponse = useCallback(
    (fieldId: string | number, value: unknown) => {
      const updatedData = {
        ...responses,
        [`field_${fieldId}`]: value,
      };
      onDataChange(updatedData);

      // Auto-validate if onValidate is provided
      if (onValidate) {
        onValidate(updatedData).catch((error) => {
          if (import.meta.env.DEV) console.warn('Validation failed:', error);
        });
      }
    },
    [responses, onDataChange, onValidate],
  );

  // Get response for a specific field
  const getResponse = useCallback(
    (fieldKey: string) => {
      return responses[fieldKey];
    },
    [responses],
  );

  // Check if a field has a response
  const hasResponse = useCallback(
    (fieldKey: string) => {
      const response = responses[fieldKey];
      return response !== undefined && response !== null && response !== '';
    },
    [responses],
  );

  // Get validation error for a field
  const getFieldError = useCallback(
    (fieldKey: string) => {
      return validationErrors[fieldKey]?.[0];
    },
    [validationErrors],
  );

  // Check if a field has validation errors
  const hasFieldError = useCallback(
    (fieldKey: string) => {
      return !!(validationErrors[fieldKey]?.length > 0);
    },
    [validationErrors],
  );

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    const allFields: QuestionnaireField[] = [];
    questionnairesWithFields.forEach((q) => {
      allFields.push(...q.fields);
    });

    if (allFields.length === 0) return 0;

    const responseCount = allFields.filter((field) => hasResponse(`field_${field.id}`)).length;

    return Math.round((responseCount / allFields.length) * 100);
  }, [questionnairesWithFields, hasResponse]);

  // Get required fields that are missing responses
  const missingRequiredFields = useMemo(() => {
    const allFields: QuestionnaireField[] = [];
    questionnairesWithFields.forEach((q) => {
      allFields.push(...q.fields);
    });

    return allFields.filter((field) => field.required && !hasResponse(`field_${field.id}`));
  }, [questionnairesWithFields, hasResponse]);

  // Load questionnaire details
  const loadQuestionnaireDetails = useCallback(
    async (questionnaireId: number) => {
      if (
        questionnairesWithFields.has(questionnaireId) ||
        loadingQuestionnaires.has(questionnaireId)
      ) {
        return;
      }

      setLoadingQuestionnaires((prev) => new Set([...prev, questionnaireId]));
      setLoadErrors((prev) => {
        const newErrors = new Map(prev);
        newErrors.delete(questionnaireId);
        return newErrors;
      });

      try {
        const questionnaire = await QuestionnaireApi.getQuestionnaireDetail(questionnaireId);

        if (questionnaire) {
          setQuestionnairesWithFields(
            (prev) => new Map([...prev, [questionnaireId, questionnaire]]),
          );
        }
      } catch (error) {
        if (import.meta.env.DEV)
          console.error(`Failed to load questionnaire ${questionnaireId}:`, error);
        setLoadErrors(
          (prev) => new Map([...prev, [questionnaireId, 'Failed to load questionnaire']]),
        );
      } finally {
        setLoadingQuestionnaires((prev) => {
          const newLoading = new Set(prev);
          newLoading.delete(questionnaireId);
          return newLoading;
        });
      }
    },
    [questionnairesWithFields, loadingQuestionnaires],
  );

  // Load all questionnaires on mount
  useEffect(() => {
    if (config?.questionnaire_items) {
      config.questionnaire_items.forEach((item) => {
        loadQuestionnaireDetails(item.questionnaire);
      });
    }
  }, [config?.questionnaire_items, loadQuestionnaireDetails]);

  // Dynamic questionnaire logic
  const allQuestionnaires = Array.from(questionnairesWithFields.values());
  const { visibleQuestionnaires, getVisibleFields, shouldShowQuestionnaire, shouldShowField } =
    useDynamicQuestionnaire(allQuestionnaires, responses);

  // Summary for validation
  const { hasAnyResponses, responseCount } = useQuestionnaireSummary(
    visibleQuestionnaires,
    responses,
  );

  const handleFieldChange = async (fieldId: string, value: unknown) => {
    updateResponse(fieldId.replace('field_', ''), value);
  };

  const handleFileUpload = async (fieldId: number, files: File[]) => {
    const questionnaireId = findQuestionnaireForField(fieldId);
    if (!questionnaireId) return;

    try {
      const uploadedUrls = await uploadFiles(questionnaireId, fieldId, files);
      updateResponse(fieldId, uploadedUrls);
    } catch (error) {
      if (import.meta.env.DEV) console.error('File upload failed:', error);
    }
  };

  const findQuestionnaireForField = (fieldId: number): number | null => {
    for (const [qId, questionnaire] of questionnairesWithFields) {
      if (questionnaire.fields.some((field) => field.id === fieldId)) {
        return qId;
      }
    }
    return null;
  };

  return {
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
  };
}
