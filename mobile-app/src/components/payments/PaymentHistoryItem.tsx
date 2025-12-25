/**
 * PaymentHistoryItem Component
 *
 * Displays a payment transaction in history list.
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import {
  CheckCircle,
  Clock,
  XCircle,
  ArrowClockwise,
  CaretRight,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import { formatCurrency, formatCardDate } from '@/utils/formatting';
import type { Payment, PaymentStatus } from '@/apis/payments.api';

interface PaymentHistoryItemProps {
  payment: Payment;
  onPress?: () => void;
  testID?: string;
}

const statusConfig: Record<
  PaymentStatus,
  { icon: typeof CheckCircle; color: string; label: string }
> = {
  COMPLETED: {
    icon: CheckCircle,
    color: theme.colors.semantic.success,
    label: 'Completed',
  },
  PENDING: {
    icon: Clock,
    color: theme.colors.semantic.warning,
    label: 'Pending',
  },
  PROCESSING: {
    icon: ArrowClockwise,
    color: theme.colors.tertiary.teal,
    label: 'Processing',
  },
  FAILED: {
    icon: XCircle,
    color: theme.colors.semantic.error,
    label: 'Failed',
  },
  REFUNDED: {
    icon: ArrowClockwise,
    color: theme.colors.neutral.gray,
    label: 'Refunded',
  },
  CANCELLED: {
    icon: XCircle,
    color: theme.colors.neutral.gray,
    label: 'Cancelled',
  },
};

export function PaymentHistoryItem({
  payment,
  onPress,
  testID,
}: PaymentHistoryItemProps) {
  const config = statusConfig[payment.status] || statusConfig.PENDING;
  const Icon = config.icon;
  const amount = parseFloat(payment.amount);
  const isPositive = payment.status === 'COMPLETED';

  const content = (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
        <Icon size={20} color={config.color} weight="fill" />
      </View>

      <View style={styles.content}>
        <Text style={styles.eventName} numberOfLines={1}>
          {payment.event_name}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{payment.payment_number}</Text>
          <View style={styles.dot} />
          <Text style={styles.metaText}>
            {formatCardDate(payment.paid_on || payment.created_at)}
          </Text>
        </View>
      </View>

      <View style={styles.amountSection}>
        <Text
          style={[
            styles.amount,
            isPositive ? styles.amountPositive : styles.amountNeutral,
          ]}
        >
          {isPositive ? '-' : ''}{formatCurrency(amount, payment.currency)}
        </Text>
        <Text style={[styles.status, { color: config.color }]}>{config.label}</Text>
      </View>

      {onPress && <CaretRight size={16} color={theme.colors.neutral.gray} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        testID={testID}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return <View testID={testID}>{content}</View>;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.warmGray,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  eventName: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.primary.black,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  metaText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.neutral.gray,
    marginHorizontal: theme.spacing.xs,
  },
  amountSection: {
    alignItems: 'flex-end',
    marginRight: theme.spacing.xs,
  },
  amount: {
    ...theme.typeScale.labelMedium,
    fontWeight: '600',
  },
  amountPositive: {
    color: theme.colors.semantic.success,
  },
  amountNeutral: {
    color: theme.colors.primary.black,
  },
  status: {
    ...theme.typeScale.labelSmall,
    marginTop: 2,
  },
});

export default PaymentHistoryItem;
