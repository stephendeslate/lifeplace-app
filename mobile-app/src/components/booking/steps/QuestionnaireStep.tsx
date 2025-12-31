/**
 * QuestionnaireStep
 *
 * Dynamic questionnaire with all 14 field types.
 * Loads questionnaires from step configuration (questionnaire_items).
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { ClipboardText, Check, Star, Upload } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout } from '@/theme';
import { QuestionnaireAPI } from '@/apis/booking/questionnaire.api';
import type { StepComponentProps } from '../StepRenderer';
import type {
  QuestionnaireStepData,
  QuestionnaireStepConfiguration,
  QuestionnaireField,
  QuestionnaireFieldType,
  QuestionnaireFieldValues,
  Questionnaire,
} from '@/types/booking';

type QuestionnaireStepProps = StepComponentProps<QuestionnaireStepData, QuestionnaireStepConfiguration>;

export function QuestionnaireStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: QuestionnaireStepProps) {
  // Extract field values from data - handles both:
  // - Flat structure (new): { field_1: value, field_2: value }
  // - Wrapped structure (old): { responses: { field_1: value, field_2: value } }
  // This ensures backward compatibility with existing session data
  const extractFieldValues = (stepData: QuestionnaireStepData | undefined): QuestionnaireFieldValues => {
    if (!stepData) return {};

    // Check for wrapped structure first (backward compatibility)
    if (stepData.responses && typeof stepData.responses === 'object') {
      return stepData.responses;
    }

    // Otherwise extract flat field values (new pattern matching client portal)
    const fieldValues: QuestionnaireFieldValues = {};
    const dataRecord = stepData as unknown as Record<string, unknown>;
    for (const key of Object.keys(dataRecord)) {
      if (key.startsWith('field_')) {
        fieldValues[key] = dataRecord[key] as QuestionnaireFieldValues[string];
      }
    }
    return fieldValues;
  };

  const [responses, setResponses] = useState<QuestionnaireFieldValues>(extractFieldValues(data));
  const [loadedQuestionnaires, setLoadedQuestionnaires] = useState<Map<number, Questionnaire>>(new Map());
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState<Set<number>>(new Set());
  const [loadErrors, setLoadErrors] = useState<Map<number, string>>(new Map());
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  // Track if user has started editing to prevent overwriting their changes
  const isUserEditing = useRef(false);

  const { allow_file_uploads = true, max_file_size_mb = 10, questionnaire_items = [] } = configuration || {};

  // Load questionnaire details from configuration
  const loadQuestionnaireDetails = useCallback(async (questionnaireId: number) => {
    if (loadedQuestionnaires.has(questionnaireId) || loadingQuestionnaires.has(questionnaireId)) {
      return;
    }

    setLoadingQuestionnaires(prev => new Set(prev).add(questionnaireId));

    try {
      const questionnaire = await QuestionnaireAPI.getQuestionnaireDetail(questionnaireId);
      setLoadedQuestionnaires(prev => new Map(prev).set(questionnaireId, questionnaire));
      setLoadErrors(prev => {
        const next = new Map(prev);
        next.delete(questionnaireId);
        return next;
      });
    } catch (error) {
      console.error(`Failed to load questionnaire ${questionnaireId}:`, error);
      setLoadErrors(prev => new Map(prev).set(questionnaireId, 'Failed to load questionnaire'));
    } finally {
      setLoadingQuestionnaires(prev => {
        const next = new Set(prev);
        next.delete(questionnaireId);
        return next;
      });
    }
  }, [loadedQuestionnaires, loadingQuestionnaires]);

  // Load all questionnaires from configuration on mount
  useEffect(() => {
    if (questionnaire_items && questionnaire_items.length > 0) {
      const loadAll = async () => {
        setIsInitialLoading(true);
        for (const item of questionnaire_items) {
          await loadQuestionnaireDetails(item.questionnaire);
        }
        setIsInitialLoading(false);
      };
      loadAll();
    } else {
      setIsInitialLoading(false);
    }
  }, [questionnaire_items]);

  // Sync responses from saved data (e.g., when navigating back to this step)
  // Only update if user hasn't started editing in this session
  useEffect(() => {
    if (!isUserEditing.current && data) {
      const fieldValues = extractFieldValues(data);
      if (Object.keys(fieldValues).length > 0) {
        setResponses(fieldValues);
      }
    }
  }, [data]);

  const handleFieldChange = useCallback((fieldId: number, value: unknown) => {
    // Mark that user has started editing to prevent data sync from overwriting
    isUserEditing.current = true;

    const fieldKey = `field_${fieldId}`;
    const newResponses: QuestionnaireFieldValues = {
      ...responses,
      [fieldKey]: value as QuestionnaireFieldValues[string]
    };
    setResponses(newResponses);
    // Send field values directly (not wrapped in { responses: ... }) to match client portal pattern
    onDataChange(newResponses);
  }, [responses, onDataChange]);

  const getFieldValue = (fieldId: number): unknown => {
    return responses[`field_${fieldId}`];
  };

  const getFieldError = (fieldId: number): string | undefined => {
    return validationErrors?.[`field_${fieldId}`]?.[0];
  };

  // Flatten all fields from loaded questionnaires, sorted by order
  const allFields = useMemo(() => {
    const fields: QuestionnaireField[] = [];

    // Use questionnaire_items order to maintain proper ordering
    for (const item of questionnaire_items) {
      const questionnaire = loadedQuestionnaires.get(item.questionnaire);
      if (questionnaire?.fields) {
        fields.push(...questionnaire.fields);
      }
    }

    return fields.sort((a, b) => a.order - b.order);
  }, [questionnaire_items, loadedQuestionnaires]);

  const isLoading = isInitialLoading || loadingQuestionnaires.size > 0;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading questionnaire...</Text>
      </View>
    );
  }

  if (questionnaire_items.length === 0 || allFields.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ClipboardText size={48} color={colors.neutral.gray} />
        <Text style={styles.emptyTitle}>No Additional Information Needed</Text>
        <Text style={styles.emptyText}>
          You can continue to the next step.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Event Details</Text>
        <Text style={styles.subtitle}>
          Please provide some additional information about your event
        </Text>
      </View>

      {/* Fields */}
      <View style={styles.fieldsList}>
        {allFields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={getFieldValue(field.id)}
            onChange={(value) => handleFieldChange(field.id, value)}
            error={getFieldError(field.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

interface FieldRendererProps {
  field: QuestionnaireField;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  // Handle both backend format (name, type, required) and expected format (label, field_type, is_required)
  const fieldType = (field.field_type || (field as unknown as { type?: string }).type || 'text').toLowerCase();
  const fieldLabel = field.label || (field as unknown as { name?: string }).name || 'Field';
  const isRequired = field.is_required ?? (field as unknown as { required?: boolean }).required ?? false;
  const placeholder = field.placeholder;
  const helpText = field.help_text;

  // Handle options - backend returns string[], type expects FieldOption[]
  const rawOptions = field.options || [];
  const options = rawOptions.map((opt) => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  const renderField = () => {
    switch (fieldType) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <TextInput
            style={[styles.textInput, error && styles.inputError]}
            value={(value as string) || ''}
            onChangeText={onChange}
            placeholder={placeholder || `Enter ${fieldLabel.toLowerCase()}`}
            placeholderTextColor={colors.neutral.gray}
            keyboardType={
              fieldType === 'email' ? 'email-address' :
              fieldType === 'phone' ? 'phone-pad' : 'default'
            }
            autoCapitalize={fieldType === 'email' ? 'none' : 'sentences'}
          />
        );

      case 'textarea':
        return (
          <TextInput
            style={[styles.textInput, styles.textareaInput, error && styles.inputError]}
            value={(value as string) || ''}
            onChangeText={onChange}
            placeholder={placeholder || `Enter ${fieldLabel.toLowerCase()}`}
            placeholderTextColor={colors.neutral.gray}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        );

      case 'number':
        return (
          <TextInput
            style={[styles.textInput, error && styles.inputError]}
            value={(value as string)?.toString() || ''}
            onChangeText={(text) => onChange(text ? parseInt(text, 10) : '')}
            placeholder={placeholder || '0'}
            placeholderTextColor={colors.neutral.gray}
            keyboardType="numeric"
          />
        );

      case 'boolean':
        return (
          <View style={styles.switchContainer}>
            <Switch
              value={value as boolean}
              onValueChange={onChange}
              trackColor={{ false: colors.neutral.warmGray, true: colors.secondary.forestLight }}
              thumbColor={value ? colors.secondary.forest : colors.neutral.gray}
            />
            <Text style={styles.switchLabel}>
              {value ? 'Yes' : 'No'}
            </Text>
          </View>
        );

      case 'checkbox':
        return (
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => onChange(!value)}
          >
            <View style={[styles.checkbox, !!value && styles.checkboxChecked]}>
              {!!value && <Check size={14} color={colors.neutral.white} weight="bold" />}
            </View>
            <Text style={styles.checkboxLabel}>{fieldLabel}</Text>
          </TouchableOpacity>
        );

      case 'select':
        return (
          <View style={styles.selectContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.selectOption,
                  value === option.value && styles.selectOptionSelected,
                ]}
                onPress={() => onChange(option.value)}
              >
                <Text style={[
                  styles.selectOptionText,
                  value === option.value && styles.selectOptionTextSelected,
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'multi_select':
      case 'multi-select':
        const selectedValues = (value as string[]) || [];
        return (
          <View style={styles.multiSelectContainer}>
            {options.map((option) => {
              const isSelected = selectedValues.includes(option.value);
              return (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.multiSelectOption,
                    isSelected && styles.multiSelectOptionSelected,
                  ]}
                  onPress={() => {
                    if (isSelected) {
                      onChange(selectedValues.filter((v) => v !== option.value));
                    } else {
                      onChange([...selectedValues, option.value]);
                    }
                  }}
                >
                  {isSelected && <Check size={12} color={colors.neutral.white} weight="bold" />}
                  <Text style={[
                    styles.multiSelectOptionText,
                    isSelected && styles.multiSelectOptionTextSelected,
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        );

      case 'radio':
        return (
          <View style={styles.radioContainer}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.radioOption}
                onPress={() => onChange(option.value)}
              >
                <View style={[
                  styles.radioCircle,
                  value === option.value && styles.radioCircleSelected,
                ]}>
                  {value === option.value && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'rating':
        const ratingValue = (value as number) || 0;
        return (
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => onChange(star)}
                style={styles.ratingButton}
              >
                <Star
                  size={32}
                  color={star <= ratingValue ? colors.semantic.warning : colors.neutral.warmGray}
                  weight={star <= ratingValue ? 'fill' : 'regular'}
                />
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'date':
      case 'time':
        return (
          <TextInput
            style={[styles.textInput, error && styles.inputError]}
            value={(value as string) || ''}
            onChangeText={onChange}
            placeholder={fieldType === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
            placeholderTextColor={colors.neutral.gray}
          />
        );

      case 'file':
        return (
          <TouchableOpacity style={styles.fileUpload}>
            <Upload size={24} color={colors.neutral.darkGray} />
            <Text style={styles.fileUploadText}>
              {value ? 'File selected' : 'Tap to upload file'}
            </Text>
          </TouchableOpacity>
        );

      default:
        return (
          <TextInput
            style={[styles.textInput, error && styles.inputError]}
            value={(value as string) || ''}
            onChangeText={onChange}
            placeholder={placeholder || `Enter ${fieldLabel.toLowerCase()}`}
            placeholderTextColor={colors.neutral.gray}
          />
        );
    }
  };

  // For checkbox, the label is already shown inline
  if (fieldType === 'checkbox') {
    return (
      <View style={styles.fieldContainer}>
        {renderField()}
        {helpText && <Text style={styles.helpText}>{helpText}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.fieldContainer}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{fieldLabel}</Text>
        {isRequired && <Text style={styles.requiredIndicator}>*</Text>}
      </View>
      {helpText && <Text style={styles.helpText}>{helpText}</Text>}
      {renderField()}
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  emptyText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  fieldsList: {
    gap: spacing.lg,
  },
  fieldContainer: {
    gap: spacing.xs,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  label: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
  },
  requiredIndicator: {
    ...typeScale.labelLarge,
    color: colors.semantic.error,
  },
  helpText: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
  },
  textInput: {
    backgroundColor: colors.neutral.beige,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  textareaInput: {
    minHeight: 100,
  },
  inputError: {
    borderColor: colors.semantic.error,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  switchLabel: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: layout.borderRadius.xs,
    borderWidth: 2,
    borderColor: colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
  },
  checkboxChecked: {
    backgroundColor: colors.secondary.forest,
    borderColor: colors.secondary.forest,
  },
  checkboxLabel: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    flex: 1,
  },
  selectContainer: {
    gap: spacing.xs,
  },
  selectOption: {
    padding: spacing.md,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectOptionSelected: {
    backgroundColor: colors.secondary.forestSubtle,
    borderColor: colors.secondary.forest,
  },
  selectOptionText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  selectOptionTextSelected: {
    fontWeight: '600',
  },
  multiSelectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  multiSelectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.full,
    gap: spacing.xxs,
  },
  multiSelectOptionSelected: {
    backgroundColor: colors.secondary.forest,
  },
  multiSelectOptionText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  multiSelectOptionTextSelected: {
    color: colors.neutral.white,
  },
  radioContainer: {
    gap: spacing.sm,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
  },
  radioCircleSelected: {
    borderColor: colors.secondary.forest,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary.forest,
  },
  radioLabel: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ratingButton: {
    padding: spacing.xxs,
  },
  fileUpload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    borderWidth: 2,
    borderColor: colors.neutral.warmGray,
    borderStyle: 'dashed',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  fileUploadText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
});

export default QuestionnaireStep;
