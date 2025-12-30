import type { ReactNode } from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type TouchableOpacityProps,
  type GestureResponderEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { colors, spacing, typeScale, layout, animation } from '@/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export type ButtonVariant = 'primary' | 'secondary' | 'cta' | 'accent';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  children: ReactNode;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  textStyle,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = (e: GestureResponderEvent) => {
    scale.value = withTiming(animation.buttonPress.scale, {
      duration: animation.buttonPress.duration,
    });
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    scale.value = withTiming(1, {
      duration: animation.buttonPress.duration,
    });
    onPressOut?.(e);
  };

  const variantStyles = getVariantStyles(variant);
  const isDisabled = disabled || loading;

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        variantStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
      disabled={isDisabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyles.text.color}
          size="small"
        />
      ) : (
        <Text style={[styles.text, variantStyles.text, textStyle]}>
          {children}
        </Text>
      )}
    </AnimatedTouchable>
  );
}

const getVariantStyles = (variant: ButtonVariant) => {
  switch (variant) {
    case 'secondary':
      return {
        container: styles.secondaryContainer,
        text: styles.secondaryText,
      };
    case 'cta':
      return {
        container: styles.ctaContainer,
        text: styles.ctaText,
      };
    case 'accent':
      return {
        container: styles.accentContainer,
        text: styles.accentText,
      };
    case 'primary':
    default:
      return {
        container: styles.primaryContainer,
        text: styles.primaryText,
      };
  }
};

const styles = StyleSheet.create({
  base: {
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...typeScale.labelLarge,
    textAlign: 'center',
  },
  // Primary variant (black)
  primaryContainer: {
    backgroundColor: colors.primary.black,
  },
  primaryText: {
    color: colors.neutral.white,
  },
  // Secondary variant (outlined)
  secondaryContainer: {
    backgroundColor: colors.neutral.white,
    borderWidth: 1.5,
    borderColor: colors.primary.black,
  },
  secondaryText: {
    color: colors.primary.black,
  },
  // CTA variant (forest green)
  ctaContainer: {
    backgroundColor: colors.secondary.forest,
  },
  ctaText: {
    color: colors.neutral.white,
  },
  // Accent variant (wood brown)
  accentContainer: {
    backgroundColor: colors.accent.wood,
  },
  accentText: {
    color: colors.neutral.white,
  },
});

export default Button;
