/**
 * Badge Component
 *
 * Status badge/chip component with color variants.
 */

import React from 'react';
import { StyleSheet, Text, View, type ViewStyle, type StyleProp } from 'react-native';
import { theme } from '@/theme';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
export type BadgeSize = 'small' | 'medium' | 'large';

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Badge({
  label,
  variant = 'default',
  size = 'medium',
  icon,
  style,
  testID,
}: BadgeProps) {
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  return (
    <View
      style={[
        styles.base,
        variantStyles.container,
        sizeStyles.container,
        style,
      ]}
      testID={testID}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.label, variantStyles.label, sizeStyles.label]}>
        {label}
      </Text>
    </View>
  );
}

function getVariantStyles(variant: BadgeVariant) {
  switch (variant) {
    case 'primary':
      return {
        container: {
          backgroundColor: theme.colors.primary[100],
        } as ViewStyle,
        label: {
          color: theme.colors.primary[700],
        },
      };
    case 'success':
      return {
        container: {
          backgroundColor: theme.colors.success[100],
        } as ViewStyle,
        label: {
          color: theme.colors.success[700],
        },
      };
    case 'warning':
      return {
        container: {
          backgroundColor: theme.colors.warning[100],
        } as ViewStyle,
        label: {
          color: theme.colors.warning[700],
        },
      };
    case 'error':
      return {
        container: {
          backgroundColor: theme.colors.error[100],
        } as ViewStyle,
        label: {
          color: theme.colors.error[700],
        },
      };
    case 'info':
      return {
        container: {
          backgroundColor: theme.colors.primary[50],
        } as ViewStyle,
        label: {
          color: theme.colors.primary[600],
        },
      };
    default:
      return {
        container: {
          backgroundColor: theme.colors.neutral[100],
        } as ViewStyle,
        label: {
          color: theme.colors.neutral[700],
        },
      };
  }
}

function getSizeStyles(size: BadgeSize) {
  switch (size) {
    case 'small':
      return {
        container: {
          paddingHorizontal: theme.spacing.xs,
          paddingVertical: 2,
          borderRadius: theme.borderRadius.sm,
        } as ViewStyle,
        label: {
          fontSize: theme.typography.sizes.xs,
        },
      };
    case 'large':
      return {
        container: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderRadius: theme.borderRadius.md,
        } as ViewStyle,
        label: {
          fontSize: theme.typography.sizes.md,
        },
      };
    default:
      return {
        container: {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 4,
          borderRadius: theme.borderRadius.sm,
        } as ViewStyle,
        label: {
          fontSize: theme.typography.sizes.sm,
        },
      };
  }
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 4,
  },
  label: {
    fontFamily: theme.typography.fonts.medium,
    textTransform: 'capitalize',
  },
});

export default Badge;
