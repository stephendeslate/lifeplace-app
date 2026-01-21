/**
 * EmptyState Component
 *
 * Generic empty state with icon, title, description, and optional CTA.
 */

import React from 'react';
import { StyleSheet, Text, View, type ViewStyle, type StyleProp } from 'react-native';
import {
  Calendar,
  FileText,
  Bell,
  ShoppingCart,
  Heart,
  MagnifyingGlass,
  User,
  Warning,
  CheckCircle,
  Buildings,
  Package,
  type IconProps,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { Button } from './Button';

export type EmptyStateIcon =
  | 'calendar'
  | 'document'
  | 'notification'
  | 'cart'
  | 'heart'
  | 'search'
  | 'user'
  | 'warning'
  | 'success'
  | 'building'
  | 'package';

export interface EmptyStateProps {
  icon?: EmptyStateIcon;
  customIcon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const iconMap: Record<EmptyStateIcon, React.ComponentType<IconProps>> = {
  calendar: Calendar,
  document: FileText,
  notification: Bell,
  cart: ShoppingCart,
  heart: Heart,
  search: MagnifyingGlass,
  user: User,
  warning: Warning,
  success: CheckCircle,
  building: Buildings,
  package: Package,
};

export function EmptyState({
  icon = 'document',
  customIcon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
  testID,
}: EmptyStateProps) {
  const IconComponent = iconMap[icon];

  return (
    <View style={[styles.container, style]} testID={testID}>
      <View style={styles.iconContainer}>
        {customIcon || (
          <IconComponent
            size={64}
            color={theme.colors.neutral[300]}
            weight="light"
          />
        )}
      </View>

      <Text style={styles.title}>{title}</Text>

      {description && <Text style={styles.description}>{description}</Text>}

      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actionsContainer}>
          {actionLabel && onAction && (
            <Button onPress={onAction} variant="primary" fullWidth={false}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              onPress={onSecondaryAction}
              variant="secondary"
              fullWidth={false}
              style={styles.secondaryButton}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xxl,
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.lg,
    color: theme.colors.neutral[800],
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  description: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  actionsContainer: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  secondaryButton: {
    marginTop: theme.spacing.xs,
  },
});

export default EmptyState;
