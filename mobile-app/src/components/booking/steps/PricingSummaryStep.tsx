/**
 * PricingSummaryStep
 *
 * Displays complete pricing breakdown with packages, addons, taxes, and discounts.
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  Receipt,
  Package,
  Tag,
  Percent,
  Calculator,
  Info,
  CaretDown,
  CaretUp,
  Check,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { formatCurrency } from '@/utils/currency';
import type { StepComponentProps } from '../StepRenderer';
import type { PricingSummaryStepData, PricingSummaryStepConfiguration } from '@/types/booking';

type PricingSummaryStepProps = StepComponentProps<PricingSummaryStepData, PricingSummaryStepConfiguration>;

export function PricingSummaryStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: PricingSummaryStepProps) {
  const { state } = useBookingContext();
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['packages', 'addons'])
  );

  const {
    show_itemized = true,
    show_tax_breakdown = true,
    show_payment_schedule = true,
    allow_promo_code = true,
  } = configuration || {};

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  // Calculate pricing from booking state
  const pricing = useMemo(() => {
    const packages = state.stepData.package_selection?.selected_packages || [];
    const addons = state.stepData.addon_selection?.selected_addons || [];

    const packageSubtotal = packages.reduce((sum, pkg) => {
      return sum + parseFloat(pkg.price) * pkg.quantity;
    }, 0);

    const addonSubtotal = addons.reduce((sum, addon) => {
      return sum + parseFloat(addon.price) * addon.quantity;
    }, 0);

    const subtotal = packageSubtotal + addonSubtotal;

    // Calculate tax (simplified - in production, use actual tax rates)
    const taxRate = 0.12; // 12% VAT
    const taxAmount = subtotal * taxRate;

    // Discount (would come from promo code)
    const discountAmount = data.discount_amount || 0;

    const total = subtotal + taxAmount - discountAmount;

    return {
      packages,
      addons,
      packageSubtotal,
      addonSubtotal,
      subtotal,
      taxRate,
      taxAmount,
      discountAmount,
      total,
    };
  }, [state.stepData, data.discount_amount]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Pricing Summary</Text>
        <Text style={styles.subtitle}>
          Review your booking details and pricing
        </Text>
      </View>

      {/* Packages Section */}
      {show_itemized && pricing.packages.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('packages')}
          >
            <View style={styles.sectionHeaderLeft}>
              <Package size={20} color={colors.accent.wood} />
              <Text style={styles.sectionTitle}>Packages</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pricing.packages.length}</Text>
              </View>
            </View>
            <View style={styles.sectionHeaderRight}>
              <Text style={styles.sectionTotal}>
                {formatCurrency(pricing.packageSubtotal, { currency: 'PHP' })}
              </Text>
              {expandedSections.has('packages') ? (
                <CaretUp size={20} color={colors.neutral.darkGray} />
              ) : (
                <CaretDown size={20} color={colors.neutral.darkGray} />
              )}
            </View>
          </TouchableOpacity>

          {expandedSections.has('packages') && (
            <View style={styles.sectionContent}>
              {pricing.packages.map((pkg, index) => (
                <View key={`pkg-${index}`} style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemName}>{pkg.name}</Text>
                    {pkg.quantity > 1 && (
                      <Text style={styles.lineItemQuantity}>
                        × {pkg.quantity}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.lineItemPrice}>
                    {formatCurrency(parseFloat(pkg.price) * pkg.quantity, { currency: 'PHP' })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Addons Section */}
      {show_itemized && pricing.addons.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('addons')}
          >
            <View style={styles.sectionHeaderLeft}>
              <Tag size={20} color={colors.tertiary.teal} />
              <Text style={styles.sectionTitle}>Add-ons</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pricing.addons.length}</Text>
              </View>
            </View>
            <View style={styles.sectionHeaderRight}>
              <Text style={styles.sectionTotal}>
                {formatCurrency(pricing.addonSubtotal, { currency: 'PHP' })}
              </Text>
              {expandedSections.has('addons') ? (
                <CaretUp size={20} color={colors.neutral.darkGray} />
              ) : (
                <CaretDown size={20} color={colors.neutral.darkGray} />
              )}
            </View>
          </TouchableOpacity>

          {expandedSections.has('addons') && (
            <View style={styles.sectionContent}>
              {pricing.addons.map((addon, index) => (
                <View key={`addon-${index}`} style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemName}>{addon.name}</Text>
                    {addon.quantity > 1 && (
                      <Text style={styles.lineItemQuantity}>
                        × {addon.quantity}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.lineItemPrice}>
                    {formatCurrency(parseFloat(addon.price) * addon.quantity, { currency: 'PHP' })}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Promo Code */}
      {allow_promo_code && (
        <View style={styles.promoSection}>
          <View style={styles.promoHeader}>
            <Percent size={18} color={colors.secondary.forest} />
            <Text style={styles.promoTitle}>Promo Code</Text>
          </View>
          {data.promo_code ? (
            <View style={styles.promoApplied}>
              <View style={styles.promoCodeBadge}>
                <Check size={14} color={colors.secondary.forest} weight="bold" />
                <Text style={styles.promoCodeText}>{data.promo_code}</Text>
              </View>
              <Text style={styles.promoDiscount}>
                -{formatCurrency(pricing.discountAmount, { currency: 'PHP' })}
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.promoButton}>
              <Text style={styles.promoButtonText}>Add promo code</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(pricing.subtotal, { currency: 'PHP' })}
          </Text>
        </View>

        {show_tax_breakdown && (
          <View style={styles.totalRow}>
            <View style={styles.taxLabelContainer}>
              <Text style={styles.totalLabel}>VAT ({(pricing.taxRate * 100).toFixed(0)}%)</Text>
              <TouchableOpacity>
                <Info size={14} color={colors.neutral.gray} />
              </TouchableOpacity>
            </View>
            <Text style={styles.totalValue}>
              {formatCurrency(pricing.taxAmount, { currency: 'PHP' })}
            </Text>
          </View>
        )}

        {pricing.discountAmount > 0 && (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.discountLabel]}>Discount</Text>
            <Text style={[styles.totalValue, styles.discountValue]}>
              -{formatCurrency(pricing.discountAmount, { currency: 'PHP' })}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>
            {formatCurrency(pricing.total, { currency: 'PHP' })}
          </Text>
        </View>
      </View>

      {/* Payment Schedule */}
      {show_payment_schedule && (
        <View style={styles.paymentSchedule}>
          <View style={styles.paymentScheduleHeader}>
            <Calculator size={18} color={colors.primary.black} />
            <Text style={styles.paymentScheduleTitle}>Payment Schedule</Text>
          </View>
          <View style={styles.paymentScheduleItems}>
            <View style={styles.paymentItem}>
              <View style={styles.paymentItemLeft}>
                <View style={[styles.paymentDot, styles.paymentDotDue]} />
                <View>
                  <Text style={styles.paymentItemLabel}>Due Now</Text>
                  <Text style={styles.paymentItemDesc}>Reservation fee (50%)</Text>
                </View>
              </View>
              <Text style={styles.paymentItemAmount}>
                {formatCurrency(pricing.total * 0.5, { currency: 'PHP' })}
              </Text>
            </View>
            <View style={styles.paymentItem}>
              <View style={styles.paymentItemLeft}>
                <View style={[styles.paymentDot, styles.paymentDotFuture]} />
                <View>
                  <Text style={styles.paymentItemLabel}>Balance</Text>
                  <Text style={styles.paymentItemDesc}>Due 7 days before event</Text>
                </View>
              </View>
              <Text style={styles.paymentItemAmount}>
                {formatCurrency(pricing.total * 0.5, { currency: 'PHP' })}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Info Note */}
      <View style={styles.infoNote}>
        <Info size={16} color={colors.tertiary.teal} />
        <Text style={styles.infoNoteText}>
          Prices are inclusive of applicable taxes. Final amount may vary based on
          actual event duration and additional services requested.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  section: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    marginBottom: spacing.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  badge: {
    backgroundColor: colors.neutral.sand,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: layout.borderRadius.xs,
  },
  badgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  sectionTotal: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '600',
  },
  sectionContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
    paddingTop: spacing.sm,
  },
  lineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lineItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  lineItemName: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  lineItemQuantity: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  lineItemPrice: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  promoSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  promoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  promoTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  promoApplied: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.forestSubtle,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.sm,
    gap: spacing.xs,
  },
  promoCodeText: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  promoDiscount: {
    ...typeScale.titleSmall,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  promoButton: {
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
    borderStyle: 'dashed',
    borderRadius: layout.borderRadius.sm,
    padding: spacing.sm,
    alignItems: 'center',
  },
  promoButtonText: {
    ...typeScale.labelMedium,
    color: colors.tertiary.teal,
  },
  totalsSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  taxLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  totalLabel: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  totalValue: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  discountLabel: {
    color: colors.secondary.forest,
  },
  discountValue: {
    color: colors.secondary.forest,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral.warmGray,
    marginVertical: spacing.sm,
  },
  grandTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  grandTotalLabel: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  grandTotalValue: {
    ...typeScale.headlineSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  paymentSchedule: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  paymentScheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  paymentScheduleTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
  },
  paymentScheduleItems: {
    gap: spacing.md,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  paymentDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  paymentDotDue: {
    backgroundColor: colors.secondary.forest,
  },
  paymentDotFuture: {
    backgroundColor: colors.neutral.gray,
  },
  paymentItemLabel: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  paymentItemDesc: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  paymentItemAmount: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '600',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tertiary.tealSubtle,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  infoNoteText: {
    ...typeScale.bodySmall,
    color: colors.tertiary.tealDark,
    flex: 1,
  },
});

export default PricingSummaryStep;
