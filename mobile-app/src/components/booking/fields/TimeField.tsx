/**
 * TimeField - Time Picker Field
 *
 * Time input with picker modal.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Clock, Warning, X, Check } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';

interface TimeFieldProps {
  field: QuestionnaireField;
  value: string | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

// Generate time slots
const generateTimeSlots = (interval: number = 30): string[] => {
  const slots: string[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += interval) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
    }
  }
  return slots;
};

const formatTimeDisplay = (time: string): string => {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export function TimeField({ field, value, onChange, error }: TimeFieldProps) {
  const [showPicker, setShowPicker] = useState(false);

  const {
    label,
    placeholder,
    help_text,
    is_required,
    validation_rules,
  } = field;

  const interval = validation_rules?.time_interval ?? 30;
  const timeSlots = generateTimeSlots(interval);

  const handleSelect = async (time: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: time,
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
        <Clock size={20} color={colors.neutral.gray} />
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {value ? formatTimeDisplay(value) : placeholder || 'Select time'}
        </Text>
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

      {/* Time Picker Modal */}
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

          {/* Time Slots */}
          <ScrollView
            style={styles.slotsContainer}
            contentContainerStyle={styles.slotsContent}
            showsVerticalScrollIndicator={false}
          >
            {timeSlots.map((time) => {
              const isSelected = value === time;
              return (
                <TouchableOpacity
                  key={time}
                  style={[styles.slot, isSelected && styles.slotSelected]}
                  onPress={() => handleSelect(time)}
                >
                  <Text style={[styles.slotText, isSelected && styles.slotTextSelected]}>
                    {formatTimeDisplay(time)}
                  </Text>
                  {isSelected && (
                    <Check size={20} color={colors.neutral.white} weight="bold" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.neutral.warmGray,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
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
  slotsContainer: {
    flex: 1,
  },
  slotsContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    ...shadows.xs,
  },
  slotSelected: {
    backgroundColor: colors.primary.black,
  },
  slotText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  slotTextSelected: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
});

export default TimeField;
