/**
 * FilterChips Component
 *
 * Horizontal scrollable filter chips for filtering lists.
 */

import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  Pressable,
  View,
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface FilterChip<T = string> {
  id: string;
  label: string;
  value: T;
  count?: number;
  icon?: React.ReactNode;
}

export interface FilterChipsProps<T = string> {
  chips: FilterChip<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  showCounts?: boolean;
  testID?: string;
}

export function FilterChips<T = string>({
  chips,
  selectedValue,
  onSelect,
  style,
  showCounts = false,
  testID,
}: FilterChipsProps<T>) {
  const handleSelect = (value: T) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(value);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      style={style}
      testID={testID}
    >
      {chips.map((chip) => (
        <FilterChipItem
          key={chip.id}
          chip={chip}
          isSelected={chip.value === selectedValue}
          onPress={() => handleSelect(chip.value)}
          showCount={showCounts}
        />
      ))}
    </ScrollView>
  );
}

interface FilterChipItemProps {
  chip: FilterChip<unknown>;
  isSelected: boolean;
  onPress: () => void;
  showCount: boolean;
}

function FilterChipItem({
  chip,
  isSelected,
  onPress,
  showCount,
}: FilterChipItemProps) {
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
      {chip.icon && <View style={styles.iconContainer}>{chip.icon}</View>}
      <Text
        style={[
          styles.chipLabel,
          isSelected ? styles.chipLabelSelected : styles.chipLabelDefault,
        ]}
      >
        {chip.label}
      </Text>
      {showCount && chip.count !== undefined && (
        <View
          style={[
            styles.countBadge,
            isSelected ? styles.countBadgeSelected : styles.countBadgeDefault,
          ]}
        >
          <Text
            style={[
              styles.countText,
              isSelected ? styles.countTextSelected : styles.countTextDefault,
            ]}
          >
            {chip.count}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
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
  chipLabel: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
  },
  chipLabelDefault: {
    color: theme.colors.neutral[700],
  },
  chipLabelSelected: {
    color: theme.colors.surface,
  },
  iconContainer: {
    marginRight: theme.spacing.xs,
  },
  countBadge: {
    marginLeft: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.full,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeDefault: {
    backgroundColor: theme.colors.neutral[200],
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  countText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
  },
  countTextDefault: {
    color: theme.colors.neutral[600],
  },
  countTextSelected: {
    color: theme.colors.surface,
  },
});

export default FilterChips;
