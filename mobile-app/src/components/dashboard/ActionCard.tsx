/**
 * ActionCard Component
 *
 * Card for displaying critical actions that need user attention.
 */

import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  FileText,
  Receipt,
  Warning,
  Clock,
  ArrowRight,
  CheckCircle,
  XCircle,
} from 'phosphor-react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { theme } from '@/theme';
import { Button } from '@/components/common';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ActionType = 'quote' | 'payment' | 'contract' | 'task';

export interface ActionCardProps {
  type: ActionType;
  title: string;
  subtitle: string;
  urgency?: 'critical' | 'high' | 'medium' | 'low';
  onPress?: () => void;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  testID?: string;
}

const iconMap = {
  quote: FileText,
  payment: Receipt,
  contract: FileText,
  task: Clock,
};

const urgencyColors = {
  critical: theme.colors.error[500],
  high: theme.colors.warning[500],
  medium: theme.colors.primary[500],
  low: theme.colors.neutral[500],
};

const urgencyBgColors = {
  critical: theme.colors.error[50],
  high: theme.colors.warning[50],
  medium: theme.colors.primary[50],
  low: theme.colors.neutral[100],
};

export function ActionCard({
  type,
  title,
  subtitle,
  urgency = 'medium',
  onPress,
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel,
  secondaryActionLabel,
  testID,
}: ActionCardProps) {
  const scale = useSharedValue(1);
  const IconComponent = iconMap[type];
  const color = urgencyColors[urgency];
  const bgColor = urgencyBgColors[urgency];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const handlePrimaryAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPrimaryAction?.();
  };

  const handleSecondaryAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSecondaryAction?.();
  };

  const content = (
    <>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <IconComponent size={24} color={color} weight="bold" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color }]} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {onPress && !onPrimaryAction && (
          <ArrowRight size={20} color={theme.colors.neutral[400]} />
        )}
      </View>

      {(onPrimaryAction || onSecondaryAction) && (
        <View style={styles.actions}>
          {onSecondaryAction && secondaryActionLabel && (
            <Button
              variant="secondary"
              onPress={handleSecondaryAction}
              style={styles.actionButton}
              fullWidth={false}
            >
              {secondaryActionLabel}
            </Button>
          )}
          {onPrimaryAction && primaryActionLabel && (
            <Button
              variant="primary"
              onPress={handlePrimaryAction}
              style={styles.actionButton}
              fullWidth={false}
            >
              {primaryActionLabel}
            </Button>
          )}
        </View>
      )}
    </>
  );

  if (onPress && !onPrimaryAction) {
    return (
      <AnimatedPressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.container, animatedStyle]}
        testID={testID}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
  },
  actionButton: {
    flex: 1,
    maxWidth: 140,
  },
});

export default ActionCard;
