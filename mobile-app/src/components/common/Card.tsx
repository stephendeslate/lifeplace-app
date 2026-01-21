/**
 * Card Component
 *
 * A versatile card component with shadow, press animation, and variants.
 */

import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { theme } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined' | 'filled';
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({
  children,
  variant = 'default',
  onPress,
  disabled = false,
  style,
  contentStyle,
  testID,
}: CardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress && !disabled) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const variantStyles = getVariantStyles(variant);

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[styles.base, variantStyles, animatedStyle, style]}
        testID={testID}
      >
        <View style={[styles.content, contentStyle]}>{children}</View>
      </AnimatedPressable>
    );
  }

  return (
    <View style={[styles.base, variantStyles, style]} testID={testID}>
      <View style={[styles.content, contentStyle]}>{children}</View>
    </View>
  );
}

function getVariantStyles(variant: CardProps['variant']): ViewStyle {
  switch (variant) {
    case 'elevated':
      return styles.elevated;
    case 'outlined':
      return styles.outlined;
    case 'filled':
      return styles.filled;
    default:
      return styles.default;
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  content: {
    padding: theme.spacing.md,
  },
  default: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, // Reduced for minimal aesthetic
    shadowRadius: 8,
    elevation: 2,
  },
  elevated: {
    backgroundColor: theme.colors.surface,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06, // Reduced for minimal aesthetic
    shadowRadius: 12,
    elevation: 4,
  },
  outlined: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  filled: {
    backgroundColor: theme.colors.neutral[100],
  },
});

export default Card;
