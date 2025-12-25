/**
 * FilterModal Component
 *
 * Bottom sheet modal for filtering actions by type and urgency.
 */

import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { X, Funnel } from 'phosphor-react-native';
import { theme } from '@/theme';
import type { ActionType, UrgencyLevel } from '@/types/action-center.types';
import { ACTION_TYPE_CONFIGS, URGENCY_CONFIGS } from '@/types/action-center.types';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  selectedTypes: ActionType[];
  onTypesChange: (types: ActionType[]) => void;
  selectedUrgencies: UrgencyLevel[];
  onUrgenciesChange: (urgencies: UrgencyLevel[]) => void;
  onClearAll: () => void;
}

export function FilterModal({
  visible,
  onClose,
  selectedTypes,
  onTypesChange,
  selectedUrgencies,
  onUrgenciesChange,
  onClearAll,
}: FilterModalProps) {
  const actionTypes: ActionType[] = ['TASK', 'QUOTE', 'CONTRACT', 'PAYMENT'];
  const urgencyLevels: UrgencyLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

  const toggleType = (type: ActionType) => {
    if (selectedTypes.includes(type)) {
      onTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onTypesChange([...selectedTypes, type]);
    }
  };

  const toggleUrgency = (urgency: UrgencyLevel) => {
    if (selectedUrgencies.includes(urgency)) {
      onUrgenciesChange(selectedUrgencies.filter((u) => u !== urgency));
    } else {
      onUrgenciesChange([...selectedUrgencies, urgency]);
    }
  };

  const hasFilters = selectedTypes.length > 0 || selectedUrgencies.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.container} onPress={(e) => e.stopPropagation()}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Funnel size={24} color={theme.colors.primary.black} />
              <Text style={styles.title}>Filters</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.colors.primary.black} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Action Types */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Action Type</Text>
              <View style={styles.chipsContainer}>
                {actionTypes.map((type) => {
                  const config = ACTION_TYPE_CONFIGS[type];
                  const isSelected = selectedTypes.includes(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.chip,
                        isSelected && {
                          backgroundColor: config.color,
                          borderColor: config.color,
                        },
                      ]}
                      onPress={() => toggleType(type)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Urgency Levels */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Urgency</Text>
              <View style={styles.chipsContainer}>
                {urgencyLevels.map((urgency) => {
                  const config = URGENCY_CONFIGS[urgency];
                  const isSelected = selectedUrgencies.includes(urgency);
                  return (
                    <TouchableOpacity
                      key={urgency}
                      style={[
                        styles.chip,
                        isSelected && {
                          backgroundColor: config.color,
                          borderColor: config.color,
                        },
                      ]}
                      onPress={() => toggleUrgency(urgency)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          isSelected && styles.chipTextSelected,
                        ]}
                      >
                        {config.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.clearButton]}
              onPress={onClearAll}
              disabled={!hasFilters}
            >
              <Text
                style={[
                  styles.buttonText,
                  styles.clearButtonText,
                  !hasFilters && styles.buttonTextDisabled,
                ]}
              >
                Clear All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, styles.applyButtonText]}>
                Apply Filters
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: theme.colors.neutral.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '70%',
    ...theme.shadows.lg,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.neutral.warmGray,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: theme.spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.warmGray,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typeScale.titleLarge,
    color: theme.colors.primary.black,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
    marginBottom: theme.spacing.sm,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.neutral.warmGray,
    backgroundColor: theme.colors.neutral.white,
  },
  chipText: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.primary.black,
  },
  chipTextSelected: {
    color: theme.colors.neutral.white,
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral.warmGray,
  },
  button: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: theme.colors.neutral.sand,
  },
  applyButton: {
    backgroundColor: theme.colors.primary.black,
  },
  buttonText: {
    ...theme.typeScale.labelLarge,
  },
  clearButtonText: {
    color: theme.colors.primary.black,
  },
  applyButtonText: {
    color: theme.colors.neutral.white,
  },
  buttonTextDisabled: {
    color: theme.colors.neutral.gray,
  },
});

export default FilterModal;
