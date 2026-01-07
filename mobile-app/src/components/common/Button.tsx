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
import { colors, spacing, typeScale, layout, animation, semanticTokens, brandColors } from '@/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export type ButtonVariant = 'primary' | 'secondary' | 'cta' | 'accent' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
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
  const sizeStyles = getSizeStyles(size);
  const isDisabled = disabled || loading;

  return (
    <AnimatedTouchable
      style={[
        styles.base,
        sizeStyles.container,
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
        <Text style={[styles.text, sizeStyles.text, variantStyles.text, textStyle]}>
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
    case 'ghost':
      return {
        container: styles.ghostContainer,
        text: styles.ghostText,
      };
    case 'danger':
      return {
        container: styles.dangerContainer,
        text: styles.dangerText,
      };
    case 'primary':
    default:
      return {
        container: styles.primaryContainer,
        text: styles.primaryText,
      };
  }
};

const getSizeStyles = (size: ButtonSize) => {
  switch (size) {
    case 'sm':
      return {
        container: styles.sizeSm,
        text: styles.textSm,
      };
    case 'lg':
      return {
        container: styles.sizeLg,
        text: styles.textLg,
      };
    case 'md':
    default:
      return {
        container: styles.sizeMd,
        text: styles.textMd,
      };
  }
};

const styles = StyleSheet.create({
  base: {
    borderRadius: layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    textAlign: 'center',
  },

  // Size variants
  sizeSm: {
    paddingVertical: spacing.sm - 2,
    paddingHorizontal: spacing.md,
    minHeight: 40,
  },
  sizeMd: {
    paddingVertical: spacing.md - 2,
    paddingHorizontal: spacing.xl,
    minHeight: 50,
  },
  sizeLg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
    minHeight: 58,
  },
  textSm: {
    ...typeScale.labelMedium,
  },
  textMd: {
    ...typeScale.labelLarge,
  },
  textLg: {
    ...typeScale.labelLarge,
    fontSize: 17,
  },

  // Primary variant (soft black)
  primaryContainer: {
    backgroundColor: semanticTokens.interactive.primary,
  },
  primaryText: {
    color: semanticTokens.text.inverse,
  },

  // Secondary variant (outlined)
  secondaryContainer: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: semanticTokens.border.strong,
  },
  secondaryText: {
    color: semanticTokens.text.primary,
  },

  // CTA variant (brand green)
  ctaContainer: {
    backgroundColor: semanticTokens.interactive.accent,
  },
  ctaText: {
    color: semanticTokens.text.inverse,
  },

  // Accent variant (earth brown - use sparingly)
  accentContainer: {
    backgroundColor: brandColors.earth[400],
  },
  accentText: {
    color: semanticTokens.text.inverse,
  },

  // Ghost variant (text only - for tertiary actions)
  ghostContainer: {
    backgroundColor: 'transparent',
  },
  ghostText: {
    color: semanticTokens.text.link,
  },

  // Danger variant (destructive actions)
  dangerContainer: {
    backgroundColor: colors.semantic.error,
  },
  dangerText: {
    color: semanticTokens.text.inverse,
  },
});

export default Button;
