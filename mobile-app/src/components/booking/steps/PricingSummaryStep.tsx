/**
 * PricingSummaryStep
 *
 * Complete pricing breakdown with packages, addons, taxes, discounts,
 * booking review, and terms acceptance.
 * Aligned with: frontend/client-portal/src/components/booking/steps/PricingSummaryStep.tsx
 */

import React, { useMemo, useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Linking,
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
  User,
  Calendar,
  Clock,
  CheckSquare,
  Square,
  Note,
  Warning,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { formatCurrency } from '@/utils/currency';
import { useSimplePricing } from '@/hooks/booking/useSimplePricing';
import { usePaymentPlanSettings } from '@/hooks/usePaymentPlanSettings';
import { format, parseISO } from 'date-fns';
import type { StepComponentProps } from '../StepRenderer';
import type {
  PricingSummaryStepData,
  PricingSummaryStepConfiguration,
  SelectedPackage,
  SelectedAddon,
  PackageSelectionStepData,
  AddonSelectionStepData,
  ContactInfoStepData,
  DateTimeStepData,
} from '@/types/booking';

type PricingSummaryStepProps = StepComponentProps<PricingSummaryStepData, PricingSummaryStepConfiguration>;

export function PricingSummaryStep({
  step,
  sessionId,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: PricingSummaryStepProps) {
  const { state } = useBookingContext();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['packages', 'addons', 'review'])
  );
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoError, setPromoError] = useState<string | null>(null);

  const {
    show_itemized = true,
    show_tax_breakdown = true,
    show_payment_schedule = true,
    allow_promo_code = true,
    show_booking_review = true,
    show_event_details = true,
    show_contact_details = true,
    show_special_requests = true,
    show_terms_checkbox = true,
    show_marketing_consent = true,
    require_terms_acceptance = true,
    terms_text,
    terms_url,
    privacy_url,
  } = configuration || {};

  // Get packages and addons from booking state
  const packageStepData = state.stepData.package_selection as PackageSelectionStepData | undefined;
  const addonStepData = state.stepData.addon_selection as AddonSelectionStepData | undefined;
  const contactData = state.stepData.contact_info as ContactInfoStepData | undefined;
  const dateTimeData = state.stepData.date_time as DateTimeStepData | undefined;

  const selectedPackages: SelectedPackage[] = packageStepData?.selected_packages || [];
  const selectedAddons: SelectedAddon[] = addonStepData?.selected_addons || [];

  // Get venue_additional_hours from addon_selection or package_selection
  const venueAdditionalHours = addonStepData?.venue_additional_hours ||
    packageStepData?.venue_additional_hours ||
    undefined;

  // Use simplified unified pricing hook
  const {
    pricing,
    loading: calculatingPricing,
    error: pricingError,
    hasItems,
    recalculate,
  } = useSimplePricing(
    selectedPackages,
    selectedAddons,
    data.promo_code || data.applied_discount_code,
    venueAdditionalHours
  );

  // Get payment plan settings for deposit percentage
  const { data: paymentSettings } = usePaymentPlanSettings();
  const depositPercentage = paymentSettings?.default_deposit_percentage || 50;
  const balanceDueDays = paymentSettings?.balance_due_days || 7;

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

  // Handle terms acceptance change
  const handleTermsChange = useCallback((accepted: boolean) => {
    onDataChange({
      ...data,
      terms_accepted: accepted,
    });
  }, [data, onDataChange]);

  // Handle marketing consent change
  const handleMarketingConsentChange = useCallback((consent: boolean) => {
    onDataChange({
      ...data,
      marketing_consent: consent,
    });
  }, [data, onDataChange]);

  // Handle special requests change
  const handleSpecialRequestsChange = useCallback((text: string) => {
    onDataChange({
      ...data,
      special_requests: text,
    });
  }, [data, onDataChange]);

  // Handle promo code application
  const handleApplyPromoCode = useCallback(() => {
    if (!promoCodeInput.trim()) return;

    setPromoError(null);
    // For now, just apply the code - in production this would validate via API
    onDataChange({
      ...data,
      promo_code: promoCodeInput.trim(),
      applied_discount_code: promoCodeInput.trim(),
    });
    setPromoCodeInput('');
    recalculate?.();
  }, [promoCodeInput, data, onDataChange, recalculate]);

  // Handle promo code removal
  const handleRemovePromoCode = useCallback(() => {
    onDataChange({
      ...data,
      promo_code: undefined,
      applied_discount_code: undefined,
      discount_amount: undefined,
    });
    setPromoError(null);
    recalculate?.();
  }, [data, onDataChange, recalculate]);

  // Format date helper
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Not specified';
    try {
      return format(parseISO(dateString), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateString;
    }
  };

  // Open terms/privacy links
  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  };

  // Show loading state
  if (calculatingPricing && !hasItems) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Calculating pricing...</Text>
      </View>
    );
  }

  // Show error if no items
  if (!hasItems && !calculatingPricing) {
    return (
      <View style={styles.errorContainer}>
        <Warning size={48} color={colors.semantic.warning} />
        <Text style={styles.errorTitle}>No Items Selected</Text>
        <Text style={styles.errorText}>
          Please go back and select packages or add-ons to see the pricing summary.
        </Text>
      </View>
    );
  }

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
          Review your booking details and confirm your selection
        </Text>
      </View>

      {/* Pricing Error Warning */}
      {pricingError && hasItems && (
        <View style={styles.warningBanner}>
          <Warning size={16} color={colors.semantic.warning} />
          <Text style={styles.warningText}>{pricingError}</Text>
        </View>
      )}

      {/* Packages Section */}
      {show_itemized && selectedPackages.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('packages')}
          >
            <View style={styles.sectionHeaderLeft}>
              <Package size={20} color={colors.accent.wood} />
              <Text style={styles.sectionTitle}>Packages</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{selectedPackages.length}</Text>
              </View>
            </View>
            <View style={styles.sectionHeaderRight}>
              <Text style={styles.sectionTotal}>
                {pricing?.formattedSubtotal || formatCurrency(
                  selectedPackages.reduce((sum, pkg) => sum + parseFloat(pkg.price) * pkg.quantity, 0),
                  { currency: 'PHP' }
                )}
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
              {selectedPackages.map((pkg, index) => (
                <View key={`pkg-${index}`} style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemName}>{pkg.name}</Text>
                    {pkg.quantity > 1 && (
                      <Text style={styles.lineItemQuantity}>× {pkg.quantity}</Text>
                    )}
                    {pkg.is_custom_bundle && (
                      <View style={styles.customBundleBadge}>
                        <Text style={styles.customBundleBadgeText}>Custom</Text>
                      </View>
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
      {show_itemized && selectedAddons.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection('addons')}
          >
            <View style={styles.sectionHeaderLeft}>
              <Tag size={20} color={colors.tertiary.teal} />
              <Text style={styles.sectionTitle}>Add-ons</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{selectedAddons.length}</Text>
              </View>
            </View>
            <View style={styles.sectionHeaderRight}>
              <Text style={styles.sectionTotal}>
                {formatCurrency(
                  selectedAddons.reduce((sum, addon) => sum + parseFloat(addon.price) * addon.quantity, 0),
                  { currency: 'PHP' }
                )}
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
              {selectedAddons.map((addon, index) => (
                <View key={`addon-${index}`} style={styles.lineItem}>
                  <View style={styles.lineItemLeft}>
                    <Text style={styles.lineItemName}>{addon.name}</Text>
                    {addon.quantity > 1 && (
                      <Text style={styles.lineItemQuantity}>× {addon.quantity}</Text>
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
          {data.promo_code || data.applied_discount_code ? (
            <View style={styles.promoApplied}>
              <View style={styles.promoCodeBadge}>
                <Check size={14} color={colors.secondary.forest} weight="bold" />
                <Text style={styles.promoCodeText}>
                  {data.promo_code || data.applied_discount_code}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemovePromoCode}>
                <Text style={styles.promoRemove}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.promoInputRow}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter promo code"
                placeholderTextColor={colors.neutral.gray}
                value={promoCodeInput}
                onChangeText={setPromoCodeInput}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[styles.promoApplyButton, !promoCodeInput && styles.promoApplyButtonDisabled]}
                onPress={handleApplyPromoCode}
                disabled={!promoCodeInput}
              >
                <Text style={styles.promoApplyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          )}
          {promoError && (
            <Text style={styles.promoErrorText}>{promoError}</Text>
          )}
        </View>
      )}

      {/* Totals */}
      <View style={styles.totalsSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>{pricing?.formattedSubtotal}</Text>
        </View>

        {show_tax_breakdown && pricing?.tax > 0 && (
          <View style={styles.totalRow}>
            <View style={styles.taxLabelContainer}>
              <Text style={styles.totalLabel}>VAT ({(pricing.taxRate * 100).toFixed(0)}%)</Text>
              <TouchableOpacity>
                <Info size={14} color={colors.neutral.gray} />
              </TouchableOpacity>
            </View>
            <Text style={styles.totalValue}>{pricing?.formattedTax}</Text>
          </View>
        )}

        {pricing?.discount > 0 && (
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.discountLabel]}>Discount</Text>
            <Text style={[styles.totalValue, styles.discountValue]}>
              -{pricing?.formattedDiscount}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.grandTotalRow}>
          <Text style={styles.grandTotalLabel}>Total</Text>
          <Text style={styles.grandTotalValue}>{pricing?.formattedTotal}</Text>
        </View>
      </View>

      {/* Payment Schedule */}
      {show_payment_schedule && pricing?.total > 0 && (
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
                  <Text style={styles.paymentItemDesc}>
                    Reservation fee ({depositPercentage}%)
                  </Text>
                </View>
              </View>
              <Text style={styles.paymentItemAmount}>
                {formatCurrency(pricing.total * (depositPercentage / 100), { currency: 'PHP' })}
              </Text>
            </View>
            <View style={styles.paymentItem}>
              <View style={styles.paymentItemLeft}>
                <View style={[styles.paymentDot, styles.paymentDotFuture]} />
                <View>
                  <Text style={styles.paymentItemLabel}>Balance</Text>
                  <Text style={styles.paymentItemDesc}>
                    Due {balanceDueDays} days before event
                  </Text>
                </View>
              </View>
              <Text style={styles.paymentItemAmount}>
                {formatCurrency(pricing.total * ((100 - depositPercentage) / 100), { currency: 'PHP' })}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Booking Review Section */}
      {show_booking_review && (
        <>
          {/* Event Details */}
          {show_event_details && dateTimeData?.start_date && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionHeader}>
                <Calendar size={18} color={colors.tertiary.teal} />
                <Text style={styles.reviewSectionTitle}>Event Details</Text>
              </View>
              <View style={styles.reviewContent}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Event Type</Text>
                  <Text style={styles.reviewValue}>
                    {state.currentFlow?.event_type_name || 'Not specified'}
                  </Text>
                </View>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Event Date</Text>
                  <Text style={styles.reviewValue}>
                    {formatDate(dateTimeData.start_date)}
                  </Text>
                </View>
                {dateTimeData.end_date && dateTimeData.end_date !== dateTimeData.start_date && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>End Date</Text>
                    <Text style={styles.reviewValue}>
                      {formatDate(dateTimeData.end_date)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Contact Information */}
          {show_contact_details && contactData?.full_name && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionHeader}>
                <User size={18} color={colors.tertiary.teal} />
                <Text style={styles.reviewSectionTitle}>Contact Information</Text>
              </View>
              <View style={styles.reviewContent}>
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Name</Text>
                  <Text style={styles.reviewValue}>{contactData.full_name}</Text>
                </View>
                {contactData.email && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Email</Text>
                    <Text style={styles.reviewValue}>{contactData.email}</Text>
                  </View>
                )}
                {contactData.phone && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Phone</Text>
                    <Text style={styles.reviewValue}>{contactData.phone}</Text>
                  </View>
                )}
                {contactData.company && (
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Company</Text>
                    <Text style={styles.reviewValue}>{contactData.company}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Special Requests */}
          {show_special_requests && (
            <View style={styles.reviewSection}>
              <View style={styles.reviewSectionHeader}>
                <Note size={18} color={colors.tertiary.teal} />
                <Text style={styles.reviewSectionTitle}>Special Requests</Text>
              </View>
              <TextInput
                style={styles.specialRequestsInput}
                placeholder="Any additional requests or special requirements..."
                placeholderTextColor={colors.neutral.gray}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={data.special_requests || ''}
                onChangeText={handleSpecialRequestsChange}
              />
            </View>
          )}

          {/* Terms and Conditions */}
          {show_terms_checkbox && (
            <View style={styles.termsSection}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => handleTermsChange(!data.terms_accepted)}
                activeOpacity={0.7}
              >
                {data.terms_accepted ? (
                  <CheckSquare size={24} color={colors.secondary.forest} weight="fill" />
                ) : (
                  <Square size={24} color={colors.neutral.gray} />
                )}
                <Text style={styles.termsText}>
                  {terms_text || (
                    <>
                      I agree to the{' '}
                      <Text
                        style={styles.termsLink}
                        onPress={() => openLink(terms_url || '/terms')}
                      >
                        Terms of Service
                      </Text>
                      {' '}and{' '}
                      <Text
                        style={styles.termsLink}
                        onPress={() => openLink(privacy_url || '/privacy')}
                      >
                        Privacy Policy
                      </Text>
                    </>
                  )}
                </Text>
              </TouchableOpacity>

              {require_terms_acceptance && validationErrors?.terms_accepted && (
                <View style={styles.termsError}>
                  <Warning size={14} color={colors.semantic.error} />
                  <Text style={styles.termsErrorText}>
                    {validationErrors.terms_accepted[0]}
                  </Text>
                </View>
              )}

              {show_marketing_consent && (
                <TouchableOpacity
                  style={[styles.checkboxRow, styles.marketingCheckbox]}
                  onPress={() => handleMarketingConsentChange(!data.marketing_consent)}
                  activeOpacity={0.7}
                >
                  {data.marketing_consent ? (
                    <CheckSquare size={24} color={colors.secondary.forest} weight="fill" />
                  ) : (
                    <Square size={24} color={colors.neutral.gray} />
                  )}
                  <Text style={styles.marketingText}>
                    I would like to receive marketing updates and special offers (optional)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  errorText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.semantic.warning + '15',
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  warningText: {
    ...typeScale.labelSmall,
    color: colors.semantic.warning,
    flex: 1,
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
  customBundleBadge: {
    backgroundColor: colors.tertiary.teal + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: layout.borderRadius.xs,
  },
  customBundleBadgeText: {
    ...typeScale.labelSmall,
    color: colors.tertiary.teal,
    fontWeight: '600',
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
  promoRemove: {
    ...typeScale.labelMedium,
    color: colors.semantic.error,
  },
  promoInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
    borderRadius: layout.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  promoApplyButton: {
    backgroundColor: colors.primary.black,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: layout.borderRadius.sm,
    justifyContent: 'center',
  },
  promoApplyButtonDisabled: {
    backgroundColor: colors.neutral.gray,
  },
  promoApplyButtonText: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  promoErrorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: spacing.xs,
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
  reviewSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  reviewSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  reviewSectionTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '600',
  },
  reviewContent: {
    gap: spacing.sm,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewLabel: {
    ...typeScale.labelMedium,
    color: colors.neutral.gray,
  },
  reviewValue: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  specialRequestsInput: {
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
    borderRadius: layout.borderRadius.sm,
    padding: spacing.sm,
    minHeight: 80,
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },
  termsSection: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  marketingCheckbox: {
    marginTop: spacing.md,
  },
  termsText: {
    ...typeScale.bodySmall,
    color: colors.primary.black,
    flex: 1,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.tertiary.teal,
    textDecorationLine: 'underline',
  },
  marketingText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    flex: 1,
    lineHeight: 20,
  },
  termsError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    backgroundColor: colors.semantic.error + '10',
    padding: spacing.sm,
    borderRadius: layout.borderRadius.sm,
  },
  termsErrorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
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
