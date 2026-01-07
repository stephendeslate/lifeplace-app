/**
 * SegmentControl Component
 *
 * Reusable segmented control / tab bar for switching between views.
 * Consistent with the app's design system using proper animations and haptics.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
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

export interface Segment<T = string> {
  id: string;
  label: string;
  value: T;
  icon?: React.ReactNode;
}

export interface SegmentControlProps<T = string> {
  segments: Segment<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SegmentControl<T = string>({
  segments,
  selectedValue,
  onSelect,
  style,
  testID,
}: SegmentControlProps<T>) {
  const handleSelect = (value: T) => {
    if (value !== selectedValue) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(value);
    }
  };

  return (
    <View style={[styles.container, style]} testID={testID}>
      {segments.map((segment) => (
        <SegmentItem
          key={segment.id}
          segment={segment}
          isSelected={segment.value === selectedValue}
          onPress={() => handleSelect(segment.value)}
        />
      ))}
    </View>
  );
}

interface SegmentItemProps<T> {
  segment: Segment<T>;
  isSelected: boolean;
  onPress: () => void;
}

function SegmentItem<T>({
  segment,
  isSelected,
  onPress,
}: SegmentItemProps<T>) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
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
        styles.segment,
        isSelected ? styles.segmentSelected : styles.segmentDefault,
        animatedStyle,
      ]}
    >
      {segment.icon && (
        <View style={styles.iconContainer}>{segment.icon}</View>
      )}
      <Text
        style={[
          styles.segmentLabel,
          isSelected ? styles.segmentLabelSelected : styles.segmentLabelDefault,
        ]}
      >
        {segment.label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  segmentDefault: {
    backgroundColor: theme.colors.neutral.sand,
  },
  segmentSelected: {
    backgroundColor: theme.colors.primary.black,
  },
  segmentLabel: {
    fontFamily: theme.typeScale.labelLarge.fontFamily,
    fontSize: theme.typeScale.labelLarge.fontSize,
    lineHeight: theme.typeScale.labelLarge.lineHeight,
  },
  segmentLabelDefault: {
    color: theme.colors.neutral.gray,
  },
  segmentLabelSelected: {
    color: theme.colors.neutral.white,
  },
  iconContainer: {
    marginRight: theme.spacing.xxs,
  },
});

export default SegmentControl;
