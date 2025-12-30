/**
 * Consent Toggle Component
 *
 * A toggle switch for consent management with label and last updated timestamp.
 * Reference: CONSENT_MANAGEMENT_UI.md Section 4.2
 */

import React from 'react';
import { View, Text, StyleSheet, Switch, Pressable } from 'react-native';
import { format } from 'date-fns';

import { colors, spacing, typeScale } from '@/theme';
import type { ConsentType } from '@/types/privacy.types';

interface ConsentToggleProps {
  type: ConsentType;
  label: string;
  description?: string;
  isGranted: boolean;
  lastUpdated: string | null;
  canWithdraw: boolean;
  isLoading?: boolean;
  onToggle: (type: ConsentType, currentlyGranted: boolean) => void;
  onWithdrawPress?: (type: ConsentType) => void;
}

export function ConsentToggle({
  type,
  label,
  description,
  isGranted,
  lastUpdated,
  canWithdraw,
  isLoading = false,
  onToggle,
  onWithdrawPress,
}: ConsentToggleProps) {
  const handleToggle = () => {
    if (isGranted && canWithdraw && onWithdrawPress) {
      // Show withdrawal confirmation dialog
      onWithdrawPress(type);
    } else {
      onToggle(type, isGranted);
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    try {
      return format(new Date(lastUpdated), 'MMM d, yyyy');
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Pressable
      style={styles.container}
      onPress={handleToggle}
      disabled={isLoading || (!canWithdraw && isGranted)}
    >
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        {description && (
          <Text style={styles.description}>{description}</Text>
        )}
        <Text style={styles.lastUpdated}>
          Last updated: {formatLastUpdated()}
        </Text>
      </View>
      <Switch
        value={isGranted}
        onValueChange={handleToggle}
        disabled={isLoading || (!canWithdraw && isGranted)}
        trackColor={{
          false: colors.neutral.warmGray,
          true: colors.secondary.forest,
        }}
        thumbColor={colors.neutral.white}
        ios_backgroundColor={colors.neutral.warmGray}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.sand,
  },
  content: {
    flex: 1,
    marginRight: spacing.md,
  },
  label: {
    ...typeScale.bodyLarge,
    color: colors.primary.black,
    fontWeight: '500',
  },
  description: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginTop: spacing.xxs,
  },
  lastUpdated: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginTop: spacing.xs,
  },
});
