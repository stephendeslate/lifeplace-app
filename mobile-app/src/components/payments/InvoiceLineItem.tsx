/**
 * InvoiceLineItem Component
 *
 * Displays a single line item from an invoice.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';
import { formatCurrency } from '@/utils/formatting';
import type { InvoiceLineItem as InvoiceLineItemType } from '@/apis/payments.api';

export interface InvoiceLineItemProps {
  item: InvoiceLineItemType;
  currency: string;
}

export function InvoiceLineItem({ item, currency }: InvoiceLineItemProps) {
  const unitPrice = parseFloat(item.unit_price);
  const totalPrice = parseFloat(item.total_price);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.details}>
          {item.quantity} × {formatCurrency(unitPrice, currency)}
        </Text>
      </View>
      <Text style={styles.total}>{formatCurrency(totalPrice, currency)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral.warmGray,
  },
  content: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  description: {
    ...theme.typeScale.bodyMedium,
    color: theme.colors.primary.black,
  },
  details: {
    ...theme.typeScale.labelSmall,
    color: theme.colors.neutral.gray,
    marginTop: 2,
  },
  total: {
    ...theme.typeScale.labelMedium,
    color: theme.colors.primary.black,
    fontWeight: '500',
  },
});

export default InvoiceLineItem;
