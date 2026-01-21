/**
 * QuickActionRow Component
 *
 * Row of quick action buttons for the dashboard.
 */

import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  CalendarPlus,
  CalendarBlank,
  FolderOpen,
  ChatCircle,
  Receipt,
  Gear,
  Bell,
  Headset,
  type IconProps,
} from 'phosphor-react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { theme } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type QuickActionType =
  | 'book'
  | 'new-booking'
  | 'my-events'
  | 'documents'
  | 'messages'
  | 'payments'
  | 'settings'
  | 'notifications'
  | 'support';

export interface QuickAction {
  type: QuickActionType;
  label: string;
  badge?: number;
}

export interface QuickActionRowProps {
  actions: QuickAction[];
  onActionPress?: (type: QuickActionType) => void;
  testID?: string;
}

const iconMap: Record<QuickActionType, React.ComponentType<IconProps>> = {
  book: CalendarPlus,
  'new-booking': CalendarPlus,
  'my-events': CalendarBlank,
  documents: FolderOpen,
  messages: ChatCircle,
  payments: Receipt,
  settings: Gear,
  notifications: Bell,
  support: Headset,
};

const colorMap: Record<QuickActionType, string> = {
  book: theme.colors.primary[500],
  'new-booking': theme.colors.primary[500],
  'my-events': theme.colors.success[500],
  documents: theme.colors.success[500],
  messages: theme.colors.warning[500],
  payments: theme.colors.error[500],
  settings: theme.colors.neutral[600],
  notifications: theme.colors.primary[400],
  support: theme.colors.warning[500],
};

const bgColorMap: Record<QuickActionType, string> = {
  book: theme.colors.primary[50],
  'new-booking': theme.colors.primary[50],
  'my-events': theme.colors.success[50],
  documents: theme.colors.success[50],
  messages: theme.colors.warning[50],
  payments: theme.colors.error[50],
  settings: theme.colors.neutral[100],
  notifications: theme.colors.primary[50],
  support: theme.colors.warning[50],
};

export function QuickActionRow({ actions, onActionPress, testID }: QuickActionRowProps) {
  return (
    <View style={styles.container} testID={testID}>
      {actions.map((action) => (
        <QuickActionButton
          key={action.type}
          action={action}
          onPress={() => onActionPress?.(action.type)}
        />
      ))}
    </View>
  );
}

interface QuickActionButtonProps {
  action: QuickAction;
  onPress?: () => void;
}

function QuickActionButton({ action, onPress }: QuickActionButtonProps) {
  const scale = useSharedValue(1);
  const IconComponent = iconMap[action.type];
  const color = colorMap[action.type];
  const bgColor = bgColorMap[action.type];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.button, animatedStyle]}
    >
      <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
        <IconComponent size={24} color={color} weight="bold" />
        {action.badge !== undefined && action.badge > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {action.badge > 99 ? '99+' : action.badge}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {action.label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  button: {
    flex: 1,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  label: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[700],
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.error[500],
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  badgeText: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 10,
    color: theme.colors.surface,
  },
});

export default QuickActionRow;
