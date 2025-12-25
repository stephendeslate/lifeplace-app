/**
 * QuoteLineItem Component
 *
 * Displays a single line item from a quote.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/theme';
import { formatCurrency } from '@/utils/formatting';
import type { QuoteLineItem as QuoteLineItemType } from '@/apis/quotes.api';

interface QuoteLineItemProps {
  item: QuoteLineItemType;
  currency?: string;
}

export function QuoteLineItem({ item, currency = 'PHP' }: QuoteLineItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.description}>{item.description}</Text>
        <Text style={styles.details}>
          {item.quantity} × {formatCurrency(item.unit_price, currency)}
        </Text>
      </View>
      <Text style={styles.total}>{formatCurrency(item.total_price, currency)}</Text>
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
  left: {
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
    ...theme.typeScale.titleSmall,
    color: theme.colors.primary.black,
  },
});

export default QuoteLineItem;
