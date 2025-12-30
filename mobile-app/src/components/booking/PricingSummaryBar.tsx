/**
 * PricingSummaryBar
 *
 * Compact pricing summary displayed at the bottom of booking steps.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { CaretUp, CaretDown, Tag } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { formatCurrency } from '@/utils/currency';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface PricingSummaryBarProps {
  subtotal: number | string;
  tax?: number | string;
  discount?: number | string;
  total: number | string;
  currency?: string;
  discountCode?: string;
  expandable?: boolean;
  showTaxBreakdown?: boolean;
  taxLabel?: string;
  discountLabel?: string;
}

export function PricingSummaryBar({
  subtotal,
  tax = 0,
  discount = 0,
  total,
  currency = 'PHP',
  discountCode,
  expandable = true,
  showTaxBreakdown = true,
  taxLabel = 'Tax',
  discountLabel,
}: PricingSummaryBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  };

  const formatAmount = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
    return formatCurrency(numAmount, { currency });
  };

  const subtotalNum = typeof subtotal === 'string' ? parseFloat(subtotal) || 0 : subtotal;
  const taxNum = typeof tax === 'string' ? parseFloat(tax) || 0 : tax;
  const discountNum = typeof discount === 'string' ? parseFloat(discount) || 0 : discount;
  const totalNum = typeof total === 'string' ? parseFloat(total) || 0 : total;

  const hasDiscount = discountNum > 0;
  const hasTax = taxNum > 0;

  return (
    <View style={styles.container}>
      {/* Expandable Details */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <View style={styles.row}>
            <Text style={styles.label}>Subtotal</Text>
            <Text style={styles.value}>{formatAmount(subtotalNum)}</Text>
          </View>

          {showTaxBreakdown && hasTax && (
            <View style={styles.row}>
              <Text style={styles.label}>{taxLabel}</Text>
              <Text style={styles.value}>{formatAmount(taxNum)}</Text>
            </View>
          )}

          {hasDiscount && (
            <View style={styles.row}>
              <View style={styles.discountLabel}>
                <Tag size={14} color={colors.secondary.forest} />
                <Text style={styles.discountText}>
                  {discountLabel || (discountCode ? `Discount (${discountCode})` : 'Discount')}
                </Text>
              </View>
              <Text style={styles.discountValue}>-{formatAmount(discountNum)}</Text>
            </View>
          )}

          <View style={styles.divider} />
        </View>
      )}

      {/* Main Summary Row */}
      <TouchableOpacity
        style={styles.mainRow}
        onPress={expandable ? toggleExpanded : undefined}
        activeOpacity={expandable ? 0.7 : 1}
        disabled={!expandable}
      >
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          {hasDiscount && !isExpanded && (
            <View style={styles.discountBadge}>
              <Tag size={12} color={colors.secondary.forest} />
              <Text style={styles.discountBadgeText}>Discount applied</Text>
            </View>
          )}
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.totalAmount}>{formatAmount(totalNum)}</Text>
          {expandable && (
            isExpanded ? (
              <CaretDown size={18} color={colors.neutral.darkGray} />
            ) : (
              <CaretUp size={18} color={colors.neutral.darkGray} />
            )
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.neutral.white,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  expandedContent: {
    paddingBottom: spacing.sm,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xxs,
  },
  label: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  value: {
    ...typeScale.bodySmall,
    color: colors.primary.black,
  },
  discountLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  discountText: {
    ...typeScale.bodySmall,
    color: colors.secondary.forest,
  },
  discountValue: {
    ...typeScale.bodySmall,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.warmGray,
    marginTop: spacing.sm,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  totalLabel: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.forestSubtle,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.xs,
    borderRadius: layout.borderRadius.full,
    gap: spacing.xxs,
  },
  discountBadgeText: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  totalAmount: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
    fontWeight: '700',
  },
});

export default PricingSummaryBar;
