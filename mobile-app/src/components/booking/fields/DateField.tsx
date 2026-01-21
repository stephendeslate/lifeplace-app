/**
 * DateField - Date Picker Field
 *
 * Date input with calendar picker modal.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { Calendar, CaretLeft, CaretRight, Warning, X } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, isAfter, startOfDay } from 'date-fns';
import type { QuestionnaireField, QuestionnaireFieldResponse } from '@/types/booking';
import * as Haptics from 'expo-haptics';

interface DateFieldProps {
  field: QuestionnaireField;
  value: string | undefined;
  onChange: (response: QuestionnaireFieldResponse) => void;
  error?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DateField({ field, value, onChange, error }: DateFieldProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  const {
    label,
    placeholder,
    help_text,
    is_required,
    validation_rules,
  } = field;

  const minDate = validation_rules?.min_date ? new Date(validation_rules.min_date) : undefined;
  const maxDate = validation_rules?.max_date ? new Date(validation_rules.max_date) : undefined;

  const selectedDate = value ? new Date(value) : undefined;

  const handleSelect = async (date: Date) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange({
      field_id: field.id,
      field_type: field.field_type,
      value: format(date, 'yyyy-MM-dd'),
    });
    setShowPicker(false);
  };

  const isDateDisabled = (date: Date): boolean => {
    if (minDate && isBefore(startOfDay(date), startOfDay(minDate))) return true;
    if (maxDate && isAfter(startOfDay(date), startOfDay(maxDate))) return true;
    return false;
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(viewDate);
    const end = endOfMonth(viewDate);
    const days = eachDayOfInterval({ start, end });

    // Pad start of month
    const startPadding = start.getDay();
    const paddedDays: (Date | null)[] = Array(startPadding).fill(null);

    return [...paddedDays, ...days];
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
        <Calendar size={20} color={colors.neutral.gray} />
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {value ? format(new Date(value), 'MMMM d, yyyy') : placeholder || 'Select date'}
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

      {/* Calendar Modal */}
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

          {/* Calendar */}
          <View style={styles.calendar}>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <TouchableOpacity
                onPress={() => setViewDate(subMonths(viewDate, 1))}
                style={styles.monthNavButton}
              >
                <CaretLeft size={24} color={colors.primary.black} />
              </TouchableOpacity>
              <Text style={styles.monthTitle}>
                {format(viewDate, 'MMMM yyyy')}
              </Text>
              <TouchableOpacity
                onPress={() => setViewDate(addMonths(viewDate, 1))}
                style={styles.monthNavButton}
              >
                <CaretRight size={24} color={colors.primary.black} />
              </TouchableOpacity>
            </View>

            {/* Day Headers */}
            <View style={styles.dayHeaders}>
              {DAYS.map((day) => (
                <View key={day} style={styles.dayHeader}>
                  <Text style={styles.dayHeaderText}>{day}</Text>
                </View>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.daysGrid}>
              {getDaysInMonth().map((day, index) => {
                if (!day) {
                  return <View key={`empty-${index}`} style={styles.dayCell} />;
                }

                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isDisabled = isDateDisabled(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isToday && !isSelected && styles.dayCellToday,
                      isDisabled && styles.dayCellDisabled,
                    ]}
                    onPress={() => !isDisabled && handleSelect(day)}
                    disabled={isDisabled}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday,
                        isDisabled && styles.dayTextDisabled,
                      ]}
                    >
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
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
  calendar: {
    backgroundColor: colors.neutral.white,
    margin: spacing.md,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    ...shadows.sm,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthNavButton: {
    padding: spacing.sm,
  },
  monthTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  dayHeader: {
    flex: 1,
    alignItems: 'center',
  },
  dayHeaderText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: layout.borderRadius.sm,
  },
  dayCellSelected: {
    backgroundColor: colors.primary.black,
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: colors.tertiary.teal,
  },
  dayCellDisabled: {
    opacity: 0.3,
  },
  dayText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  dayTextSelected: {
    color: colors.neutral.white,
    fontWeight: '600',
  },
  dayTextToday: {
    color: colors.tertiary.teal,
    fontWeight: '600',
  },
  dayTextDisabled: {
    color: colors.neutral.gray,
  },
});

export default DateField;
