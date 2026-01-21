/**
 * ActionCard Component
 *
 * Card for displaying critical actions that need user attention.
 */

import React, { memo } from 'react';
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
import { formatCurrency } from '@/utils/formatting';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type ActionType = 'quote' | 'payment' | 'contract' | 'task';

export interface ActionCardMetadata {
  /** Amount to display (e.g., quote total, payment due) */
  amount?: number;
  /** Currency code for amount formatting */
  currency?: string;
  /** Days info text (e.g., "Expires in 3 days", "5 days overdue") */
  daysInfo?: string;
  /** Signature progress for contracts */
  signatureProgress?: {
    signed: number;
    total: number;
  };
}

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
  /** Optional metadata to display (amount, due date, signature progress) */
  metadata?: ActionCardMetadata;
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

export const ActionCard = memo(function ActionCard({
  type,
  title,
  subtitle,
  urgency = 'medium',
  onPress,
  onPrimaryAction,
  onSecondaryAction,
  primaryActionLabel,
  secondaryActionLabel,
  metadata,
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

  // Check if we have any metadata to display
  const hasMetadata = metadata && (
    (metadata.amount !== undefined && metadata.currency) ||
    metadata.daysInfo ||
    metadata.signatureProgress
  );

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

      {/* Metadata Row */}
      {hasMetadata && (
        <View style={styles.metadataRow}>
          {metadata.amount !== undefined && metadata.currency && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Amount</Text>
              <Text style={[styles.metadataValue, { color }]}>
                {formatCurrency(metadata.amount, metadata.currency)}
              </Text>
            </View>
          )}
          {metadata.signatureProgress && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Signatures</Text>
              <Text style={[styles.metadataValue, { color }]}>
                {metadata.signatureProgress.signed}/{metadata.signatureProgress.total}
              </Text>
            </View>
          )}
          {metadata.daysInfo && (
            <View style={styles.metadataItem}>
              <Text style={styles.metadataLabel}>Due</Text>
              <Text style={[styles.metadataValue, { color }]}>
                {metadata.daysInfo}
              </Text>
            </View>
          )}
        </View>
      )}

      {(onPrimaryAction || onSecondaryAction) && (
        <View style={styles.actions}>
          {onSecondaryAction && secondaryActionLabel && (
            <Button
              variant="secondary"
              size="sm"
              onPress={handleSecondaryAction}
              fullWidth={false}
            >
              {secondaryActionLabel}
            </Button>
          )}
          {onPrimaryAction && primaryActionLabel && (
            <Button
              variant="primary"
              size="sm"
              onPress={handlePrimaryAction}
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
        style={[styles.container, { borderLeftColor: color }, animatedStyle]}
        testID={testID}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return (
    <View style={[styles.container, { borderLeftColor: color }]} testID={testID}>
      {content}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderLeftWidth: 4,
    overflow: 'hidden',
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
  metadataRow: {
    flexDirection: 'row',
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    gap: theme.spacing.lg,
  },
  metadataItem: {
    flex: 1,
  },
  metadataLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
    marginBottom: 2,
  },
  metadataValue: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
  },
});

export default ActionCard;

// Display name for debugging
ActionCard.displayName = 'ActionCard';
