/**
 * CategoryChips Component
 *
 * Horizontal scrollable chips for category/event type filtering:
 * - "All" option
 * - Category name chips
 * - Active state styling
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ViewStyle,
} from 'react-native';

import { colors, spacing, typeScale, layout } from '@/theme';

interface CategoryOption {
  id: number | null;
  name: string;
}

interface CategoryChipsProps {
  options: CategoryOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  allLabel?: string;
  style?: ViewStyle;
}

export function CategoryChips({
  options,
  selectedId,
  onSelect,
  allLabel = 'All',
  style,
}: CategoryChipsProps) {
  const allOptions: CategoryOption[] = [
    { id: null, name: allLabel },
    ...options,
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
    >
      {allOptions.map((option) => {
        const isActive = option.id === selectedId;

        return (
          <Pressable
            key={option.id ?? 'all'}
            onPress={() => onSelect(option.id)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
              {option.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
  },
  chipActive: {
    backgroundColor: colors.primary.black,
    borderColor: colors.primary.black,
  },
  chipText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  chipTextActive: {
    color: colors.neutral.white,
  },
});
