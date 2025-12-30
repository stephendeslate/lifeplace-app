/**
 * DropdownField - Dropdown Select Field
 *
 * Dropdown picker for selecting from a list of options.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { CaretDown, Check, Warning, X } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';

interface DropdownFieldProps {
  field: QuestionnaireField;
  value: string | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

export function DropdownField({ field, value, onChange, error }: DropdownFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const {
    label,
    placeholder,
    help_text,
    is_required,
    options = [],
  } = field;

  const selectedOption = options.find((o) => o.value === value);

  const handleSelect = async (optionValue: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: optionValue,
    });
    setShowPicker(false);
  };

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {is_required && <Text style={styles.required}>*</Text>}
      </View>

      {/* Trigger */}
      <TouchableOpacity
        style={[styles.trigger, error && styles.triggerError]}
        onPress={() => setShowPicker(true)}
      >
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {selectedOption?.label || placeholder || 'Select an option'}
        </Text>
        <CaretDown size={20} color={colors.neutral.gray} />
      </TouchableOpacity>

      {/* Help text */}
      {help_text && !error && (
        <Text style={styles.helpText}>{help_text}</Text>
      )}

      {/* Error */}
      {error && (
        <View style={styles.errorRow}>
          <Warning size={14} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{label}</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowPicker(false)}
            >
              <X size={24} color={colors.primary.black} />
            </TouchableOpacity>
          </View>

          {/* Options List */}
          <FlatList
            data={options}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const isSelected = value === item.value;
              return (
                <TouchableOpacity
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleSelect(item.value)}
                >
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {item.label}
                    </Text>
                    {item.description && (
                      <Text style={styles.optionDesc}>{item.description}</Text>
                    )}
                  </View>
                  {isSelected && (
                    <Check size={20} color={colors.secondary.forest} weight="bold" />
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  required: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
    marginLeft: spacing.xxs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.warmGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...shadows.xs,
  },
  triggerError: {
    borderColor: colors.semantic.error,
  },
  triggerText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    flex: 1,
  },
  triggerPlaceholder: {
    color: colors.neutral.gray,
  },
  helpText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xs,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.neutral.sand,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  modalTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  closeButton: {
    padding: spacing.xs,
  },
  listContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    ...shadows.xs,
  },
  optionSelected: {
    backgroundColor: colors.secondary.forestSubtle,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  optionLabelSelected: {
    fontWeight: '600',
  },
  optionDesc: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xxs,
  },
});

export default DropdownField;
