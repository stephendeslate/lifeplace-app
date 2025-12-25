/**
 * FinancialSummaryCard Component
 *
 * Card for displaying financial summary on the dashboard.
 */

import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  CurrencyCircleDollar,
  Warning,
  ArrowRight,
  CalendarBlank,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { Badge } from '@/components/common';
import { formatCurrency, formatCardDate } from '@/utils/formatting';
import type { FinancialSummary } from '@/types/dashboard.types';

export interface FinancialSummaryCardProps {
  summary: FinancialSummary;
  onPress?: () => void;
  testID?: string;
}

const urgencyColors = {
  critical: theme.colors.error[500],
  high: theme.colors.warning[500],
  medium: theme.colors.primary[500],
  low: theme.colors.success[500],
};

const urgencyBgColors = {
  critical: theme.colors.error[50],
  high: theme.colors.warning[50],
  medium: theme.colors.primary[50],
  low: theme.colors.success[50],
};

const urgencyLabels = {
  critical: 'Action Required',
  high: 'Due Soon',
  medium: 'Pending',
  low: 'All Clear',
};

export function FinancialSummaryCard({
  summary,
  onPress,
  testID,
}: FinancialSummaryCardProps) {
  const color = urgencyColors[summary.urgency_level];
  const bgColor = urgencyBgColors[summary.urgency_level];
  const hasOutstanding = summary.total_outstanding > 0;

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={!onPress}
      style={[styles.container, { borderColor: color }]}
      testID={testID}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <CurrencyCircleDollar size={28} color={color} weight="bold" />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Financial Summary</Text>
          <Badge
            label={urgencyLabels[summary.urgency_level]}
            variant={
              summary.urgency_level === 'critical'
                ? 'error'
                : summary.urgency_level === 'high'
                  ? 'warning'
                  : summary.urgency_level === 'medium'
                    ? 'primary'
                    : 'success'
            }
            size="small"
          />
        </View>
        {onPress && <ArrowRight size={20} color={theme.colors.neutral[400]} />}
      </View>

      <View style={styles.amountContainer}>
        <Text style={styles.amountLabel}>Total Outstanding</Text>
        <Text style={[styles.amount, { color: hasOutstanding ? color : theme.colors.success[500] }]}>
          {formatCurrency(summary.total_outstanding, summary.currency)}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {summary.overdue_count > 0 && (
          <View style={styles.stat}>
            <Warning size={16} color={theme.colors.error[500]} />
            <Text style={styles.statText}>
              {summary.overdue_count} overdue
            </Text>
          </View>
        )}
        {summary.pending_count > 0 && (
          <View style={styles.stat}>
            <CalendarBlank size={16} color={theme.colors.warning[500]} />
            <Text style={styles.statText}>
              {summary.pending_count} pending
            </Text>
          </View>
        )}
      </View>

      {/* Next payment */}
      {summary.next_payment_date && summary.next_payment_amount && (
        <View style={styles.nextPayment}>
          <Text style={styles.nextPaymentLabel}>Next payment due</Text>
          <View style={styles.nextPaymentDetails}>
            <Text style={styles.nextPaymentAmount}>
              {formatCurrency(summary.next_payment_amount, summary.currency)}
            </Text>
            <Text style={styles.nextPaymentDate}>
              by {formatCardDate(summary.next_payment_date)}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
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
    marginBottom: theme.spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  headerTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
    marginBottom: theme.spacing.md,
  },
  amountLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.xs,
  },
  amount: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: theme.typography.sizes.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  statText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
  nextPayment: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  nextPaymentLabel: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.xs,
    color: theme.colors.neutral[500],
    marginBottom: 4,
  },
  nextPaymentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextPaymentAmount: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[800],
  },
  nextPaymentDate: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
  },
});

export default FinancialSummaryCard;
