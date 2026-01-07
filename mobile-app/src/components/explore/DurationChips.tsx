/**
 * DurationChips Component
 *
 * Horizontal scrollable chips for duration filtering.
 * Used for Camps & Retreats and Team Building packages.
 */

import React from 'react';
import {
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { theme } from '@/theme';
import type { DurationOption } from '@/types/explore.types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface DurationChipsProps {
  options: DurationOption[];
  selectedDays: number | null;
  onSelect: (days: number | null) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * Default duration options for camps & retreats
 */
export const CAMPS_DURATION_OPTIONS: DurationOption[] = [
  { id: null, label: 'All', days: null },
  { id: 1, label: 'Day Trip', days: 1 },
  { id: 2, label: '2D1N', days: 2 },
  { id: 3, label: '3D2N', days: 3 },
  { id: 4, label: '4D3N', days: 4 },
];

/**
 * Duration options for team building
 */
export const TEAM_BUILDING_DURATION_OPTIONS: DurationOption[] = [
  { id: null, label: 'All', days: null },
  { id: 1, label: 'Day Trip', days: 1 },
  { id: 2, label: '2D1N', days: 2 },
  { id: 3, label: '3D2N', days: 3 },
];

export function DurationChips({
  options,
  selectedDays,
  onSelect,
  style,
  testID,
}: DurationChipsProps) {
  const handleSelect = (days: number | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(days);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
      testID={testID}
    >
      {options.map((option) => (
        <DurationChipItem
          key={option.id ?? 'all'}
          option={option}
          isSelected={option.days === selectedDays}
          onPress={() => handleSelect(option.days)}
        />
      ))}
    </ScrollView>
  );
}

interface DurationChipItemProps {
  option: DurationOption;
  isSelected: boolean;
  onPress: () => void;
}

function DurationChipItem({
  option,
  isSelected,
  onPress,
}: DurationChipItemProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[
        styles.chip,
        isSelected ? styles.chipSelected : styles.chipDefault,
        animatedStyle,
      ]}
    >
      <Text
        style={[
          styles.chipText,
          isSelected ? styles.chipTextSelected : styles.chipTextDefault,
        ]}
      >
        {option.label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.md,
    height: 28,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
  },
  chipDefault: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.neutral[200],
  },
  chipSelected: {
    backgroundColor: theme.colors.primary[500],
    borderColor: theme.colors.primary[500],
  },
  chipText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
  },
  chipTextDefault: {
    color: theme.colors.neutral[700],
  },
  chipTextSelected: {
    color: theme.colors.surface,
  },
});

export default DurationChips;
