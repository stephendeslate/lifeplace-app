/**
 * PaymentMethodCard Component
 *
 * Card displaying payment method with icon and details.
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import {
  CreditCard,
  Bank,
  Money,
  Check,
  DotsThree,
  CaretRight,
} from 'phosphor-react-native';
import { theme } from '@/theme';
import type { PaymentMethod } from '@/apis/payments.api';

export interface PaymentMethodCardProps {
  method: PaymentMethod;
  label?: string;
  last4?: string;
  isDefault?: boolean;
  onPress?: () => void;
  testID?: string;
}

const methodConfig: Record<
  PaymentMethod,
  { icon: typeof CreditCard; label: string; color: string }
> = {
  STRIPE: {
    icon: CreditCard,
    label: 'Credit Card',
    color: theme.colors.accent.wood,
  },
  BANK_TRANSFER: {
    icon: Bank,
    label: 'Bank Transfer',
    color: theme.colors.secondary.forest,
  },
  CASH: {
    icon: Money,
    label: 'Cash',
    color: theme.colors.semantic.success,
  },
  CHECK: {
    icon: Check,
    label: 'Check',
    color: theme.colors.tertiary.teal,
  },
  OTHER: {
    icon: DotsThree,
    label: 'Other',
    color: theme.colors.neutral.gray,
  },
};

export function PaymentMethodCard({
  method,
  label,
  last4,
  isDefault = false,
  onPress,
  testID,
}: PaymentMethodCardProps) {
  const config = methodConfig[method] || methodConfig.OTHER;
  const Icon = config.icon;

  const content = (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: `${config.color}15` }]}>
        <Icon size={24} color={config.color} />
      </View>

      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={styles.methodLabel}>{label || config.label}</Text>
          {isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>
        {last4 && (
          <Text style={styles.cardNumber}>•••• {last4}</Text>
        )}
      </View>

      {onPress && <CaretRight size={20} color={theme.colors.neutral.gray} />}
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
    backgroundColor: theme.colors.neutral.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: theme.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  methodLabel: {
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
  },
  defaultBadge: {
    backgroundColor: theme.colors.secondary.forestSubtle,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  defaultText: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.secondary.forest,
  },
  cardNumber: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
    marginTop: 2,
  },
});

export default PaymentMethodCard;
