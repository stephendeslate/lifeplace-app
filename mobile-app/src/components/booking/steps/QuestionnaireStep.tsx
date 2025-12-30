/**
 * QuestionnaireStep
 *
 * Dynamic questionnaire with all 14 field types.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { ClipboardText, Check, Star, Upload, CaretDown } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useQuestionnaires, useQuestionnaireFields } from '@/hooks/booking';
import { useBookingContext } from '@/contexts/BookingContext';
import type { StepComponentProps } from '../StepRenderer';
import type {
  QuestionnaireStepData,
  QuestionnaireStepConfiguration,
  QuestionnaireField,
  QuestionnaireFieldType,
} from '@/types/booking';

type QuestionnaireStepProps = StepComponentProps<QuestionnaireStepData, QuestionnaireStepConfiguration>;

export function QuestionnaireStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: QuestionnaireStepProps) {
  const { state } = useBookingContext();
  const eventTypeId = state.selectedEventType?.id;

  const { data: questionnaires, isLoading } = useQuestionnaires(eventTypeId);

  const [responses, setResponses] = useState<Record<string, unknown>>(data || {});

  const { allow_file_uploads = true, max_file_size_mb = 10 } = configuration || {};

  useEffect(() => {
    setResponses(data || {});
  }, [data]);

  const handleFieldChange = useCallback((fieldId: number, value: unknown) => {
    const fieldKey = `field_${fieldId}`;
    const newResponses = { ...responses, [fieldKey]: value };
    setResponses(newResponses);
    onDataChange(newResponses);
  }, [responses, onDataChange]);

  const getFieldValue = (fieldId: number): unknown => {
    return responses[`field_${fieldId}`];
  };

  const getFieldError = (fieldId: number): string | undefined => {
    return validationErrors?.[`field_${fieldId}`]?.[0];
  };

  // Flatten all fields from all questionnaires
  const allFields = useMemo(() => {
    if (!questionnaires) return [];
    return questionnaires.flatMap((q) => q.fields || []).sort((a, b) => a.order - b.order);
  }, [questionnaires]);

  // Calculate completion percentage
  const completionPercentage = useMemo(() => {
    if (allFields.length === 0) return 100;
    const requiredFields = allFields.filter((f) => f.is_required);
    if (requiredFields.length === 0) return 100;

    const completedRequired = requiredFields.filter((f) => {
      const value = getFieldValue(f.id);
      return value !== undefined && value !== null && value !== '';
    });

    return Math.round((completedRequired.length / requiredFields.length) * 100);
  }, [allFields, responses]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading questionnaire...</Text>
      </View>
    );
  }

  if (!questionnaires || questionnaires.length === 0) {
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

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${completionPercentage}%` }]} />
        </View>
        <Text style={styles.progressText}>{completionPercentage}% complete</Text>
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
  const { field_type, label, placeholder, help_text, is_required, options = [] } = field;

  const renderField = () => {
    switch (field_type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <TextInput
            style={[styles.textInput, error && styles.inputError]}
            value={(value as string) || ''}
            onChangeText={onChange}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            placeholderTextColor={colors.neutral.gray}
            keyboardType={
              field_type === 'email' ? 'email-address' :
              field_type === 'phone' ? 'phone-pad' : 'default'
            }
            autoCapitalize={field_type === 'email' ? 'none' : 'sentences'}
          />
        );

      case 'textarea':
        return (
          <TextInput
            style={[styles.textInput, styles.textareaInput, error && styles.inputError]}
            value={(value as string) || ''}
            onChangeText={onChange}
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
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
            <View style={[styles.checkbox, value && styles.checkboxChecked]}>
              {value && <Check size={14} color={colors.neutral.white} weight="bold" />}
            </View>
            <Text style={styles.checkboxLabel}>{label}</Text>
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
            placeholder={field_type === 'date' ? 'YYYY-MM-DD' : 'HH:MM'}
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
            placeholder={placeholder || `Enter ${label.toLowerCase()}`}
            placeholderTextColor={colors.neutral.gray}
          />
        );
    }
  };

  // For checkbox, the label is already shown inline
  if (field_type === 'checkbox') {
    return (
      <View style={styles.fieldContainer}>
        {renderField()}
        {help_text && <Text style={styles.helpText}>{help_text}</Text>}
        {error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.fieldContainer}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.requiredIndicator}>*</Text>}
      </View>
      {help_text && <Text style={styles.helpText}>{help_text}</Text>}
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
  progressContainer: {
    marginBottom: spacing.xl,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.neutral.warmGray,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary.forest,
    borderRadius: 3,
  },
  progressText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    textAlign: 'right',
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
