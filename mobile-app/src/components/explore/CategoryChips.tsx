/**
 * CategoryChips Component
 *
 * Horizontal scrollable chips for category/event type filtering.
 * Consistent with FilterChips patterns (animations, haptics, spacing).
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

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CategoryOption {
  id: number | null;
  name: string;
}

export interface CategoryChipsProps {
  options: CategoryOption[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  allLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function CategoryChips({
  options,
  selectedId,
  onSelect,
  allLabel = 'All',
  style,
  testID,
}: CategoryChipsProps) {
  const allOptions: CategoryOption[] = [
    { id: null, name: allLabel },
    ...options,
  ];

  const handleSelect = (id: number | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.container, style]}
      testID={testID}
    >
      {allOptions.map((option) => (
        <CategoryChipItem
          key={option.id ?? 'all'}
          option={option}
          isSelected={option.id === selectedId}
          onPress={() => handleSelect(option.id)}
        />
      ))}
    </ScrollView>
  );
}

interface CategoryChipItemProps {
  option: CategoryOption;
  isSelected: boolean;
  onPress: () => void;
}

function CategoryChipItem({
  option,
  isSelected,
  onPress,
}: CategoryChipItemProps) {
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
        {option.name}
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
