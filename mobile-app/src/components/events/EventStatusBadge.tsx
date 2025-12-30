/**
 * EventStatusBadge Component
 *
 * Badge specifically for displaying event status with appropriate styling.
 */

import React from 'react';
import { StyleSheet, Text, View, type ViewStyle, type StyleProp } from 'react-native';
import {
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  type IconProps,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import type { EventStatus } from '@/types/events.types';

export interface EventStatusBadgeProps {
  status: EventStatus;
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const statusConfig: Record<
  EventStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ComponentType<IconProps>;
  }
> = {
  LEAD: {
    label: 'Lead',
    color: theme.colors.neutral[600],
    bgColor: theme.colors.neutral[100],
    icon: FileText,
  },
  DRAFT: {
    label: 'Draft',
    color: theme.colors.neutral[600],
    bgColor: theme.colors.neutral[100],
    icon: FileText,
  },
  CONFIRMED: {
    label: 'Confirmed',
    color: theme.colors.primary[600],
    bgColor: theme.colors.primary[100],
    icon: Calendar,
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: theme.colors.warning[600],
    bgColor: theme.colors.warning[100],
    icon: Clock,
  },
  COMPLETED: {
    label: 'Completed',
    color: theme.colors.success[600],
    bgColor: theme.colors.success[100],
    icon: CheckCircle,
  },
  CANCELLED: {
    label: 'Cancelled',
    color: theme.colors.error[600],
    bgColor: theme.colors.error[100],
    icon: XCircle,
  },
};

export function EventStatusBadge({
  status,
  size = 'medium',
  showIcon = true,
  style,
  testID,
}: EventStatusBadgeProps) {
  const config = statusConfig[status];
  const IconComponent = config.icon;
  const sizeStyles = getSizeStyles(size);

  return (
    <View
      style={[
        styles.container,
        sizeStyles.container,
        { backgroundColor: config.bgColor },
        style,
      ]}
      testID={testID}
    >
      {showIcon && (
        <IconComponent
          size={sizeStyles.iconSize}
          color={config.color}
          weight="bold"
        />
      )}
      <Text
        style={[
          styles.label,
          sizeStyles.label,
          { color: config.color },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

function getSizeStyles(size: EventStatusBadgeProps['size']) {
  switch (size) {
    case 'small':
      return {
        container: {
          paddingHorizontal: theme.spacing.xs,
          paddingVertical: 2,
          borderRadius: theme.borderRadius.sm,
          gap: 2,
        } as ViewStyle,
        label: {
          fontSize: theme.typography.sizes.xs,
        },
        iconSize: 12,
      };
    case 'large':
      return {
        container: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
          gap: theme.spacing.sm,
        } as ViewStyle,
        label: {
          fontSize: theme.typography.sizes.md,
        },
        iconSize: 20,
      };
    default:
      return {
        container: {
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 4,
          borderRadius: theme.borderRadius.sm,
          gap: 4,
        } as ViewStyle,
        label: {
          fontSize: theme.typography.sizes.sm,
        },
        iconSize: 14,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: theme.typography.fonts.semibold,
  },
});

export default EventStatusBadge;
