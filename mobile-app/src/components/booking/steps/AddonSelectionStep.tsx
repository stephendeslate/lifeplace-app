/**
 * AddonSelectionStep
 *
 * Optional add-on selection with quantity controls.
 * Features:
 * - Venue additional hours management (sync from package step)
 * - Tax-inclusive badge display for tax-inclusive items
 * - Validation indicator during validation
 *
 * Adapted from: frontend/client-portal/src/components/booking/steps/AddonSelectionStep.tsx
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Plus, Minus, Check, ShoppingBag, Tag, Clock, Sun } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useAddons, useRentableVenues } from '@/hooks/booking';
import { useBookingContext } from '@/contexts/BookingContext';
import { VenuesAPI } from '@/apis/booking/venues.api';
import { formatCurrency } from '@/utils/currency';
import type { StepComponentProps } from '../StepRenderer';
import type {
  AddonSelectionStepData,
  AddonSelectionStepConfiguration,
  SelectedAddon,
  PackageSelectionStepData,
  VenueSelectionStepData,
} from '@/types/booking';
import type { ProductOption } from '@/apis/booking/products.api';
import * as Haptics from 'expo-haptics';

type AddonSelectionStepProps = StepComponentProps<AddonSelectionStepData, AddonSelectionStepConfiguration> & {
  /** Whether step is currently being validated */
  isValidating?: boolean;
};

export function AddonSelectionStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
  isValidating = false,
}: AddonSelectionStepProps) {
  const { state, actions } = useBookingContext();
  const { data: addons, isLoading, error } = useAddons();

  // Use refs for action functions to avoid them being dependencies in useEffect
  // This prevents infinite loops when actions object changes
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Get selected venue IDs from venue selection step
  const venueSelectionData = state.stepData.venue_selection as VenueSelectionStepData | undefined;
  const selectedVenueIds = venueSelectionData?.selected_venue_ids || [];

  // Get event type ID from flow for fetching venues with correct pricing (event_type is the ID directly)
  const eventTypeId = state.currentFlow?.event_type;

  // Fetch rentable venues with event-type-specific pricing
  const { data: allVenues } = useRentableVenues(eventTypeId);

  // Get actual venue objects from IDs
  const selectedVenues = useMemo(() => {
    if (!allVenues || selectedVenueIds.length === 0) return [];
    return allVenues.filter((v) => selectedVenueIds.includes(v.id));
  }, [allVenues, selectedVenueIds]);

  // Get venue additional hours from package selection step
  const packageStepData = state.stepData.package_selection as PackageSelectionStepData | undefined;
  const venueAdditionalHoursFromPackage = packageStepData?.venue_additional_hours || {};

  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>(
    data.selected_addons || []
  );

  // Venue additional hours state (convert string keys to number keys)
  const [venueAdditionalHours, setVenueAdditionalHours] = useState<Record<number, number>>(() => {
    return Object.entries(venueAdditionalHoursFromPackage).reduce((acc, [key, value]) => ({
      ...acc,
      [parseInt(key, 10)]: value,
    }), {});
  });

  const {
    min_selection = 0,
    max_selection = 99,
    group_by_category = true,
    show_recommendations = true,
    title = 'Add Extras',
    description,
  } = configuration || {};

  useEffect(() => {
    setSelectedAddons(data.selected_addons || []);
  }, [data.selected_addons]);

  // Sync venue hours from package step data when they change
  useEffect(() => {
    const packageHours = Object.entries(venueAdditionalHoursFromPackage).reduce((acc, [key, value]) => ({
      ...acc,
      [parseInt(key, 10)]: value,
    }), {} as Record<number, number>);

    // Only update if package step has hours that aren't in local state
    const hasNewHours = Object.keys(packageHours).length > 0 &&
      Object.keys(venueAdditionalHours).length === 0;
    if (hasNewHours) {
      setVenueAdditionalHours(packageHours);
    }
  }, [venueAdditionalHoursFromPackage]); // eslint-disable-line react-hooks/exhaustive-deps

  const getAddonQuantity = (addonId: number): number => {
    const addon = selectedAddons.find((a) => a.product_id === addonId);
    return addon?.quantity || 0;
  };

  // Helper to build complete data with venue hours
  const buildCompleteData = useCallback((addons: SelectedAddon[]): AddonSelectionStepData => {
    const venueHoursForApi = Object.entries(venueAdditionalHours).reduce((acc, [key, value]) => ({
      ...acc,
      [key]: value, // Keep as string key for API
    }), {} as Record<string, number>);

    const dataToSend: AddonSelectionStepData = {
      selected_addons: addons,
    };

    if (selectedVenues.length > 0 && Object.keys(venueHoursForApi).length > 0) {
      dataToSend.venue_additional_hours = venueHoursForApi;
    }

    return dataToSend;
  }, [venueAdditionalHours, selectedVenues.length]);

  // Handle venue hours change
  const handleVenueHoursChange = useCallback(async (venueId: number, hours: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setVenueAdditionalHours((prev) => ({
      ...prev,
      [venueId]: hours,
    }));
  }, []);

  // Effect to update venue hours when they change (without changing addons)
  useEffect(() => {
    if (selectedVenues.length > 0) {
      onDataChange(buildCompleteData(selectedAddons));
    }
  }, [venueAdditionalHours]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleQuantityChange = useCallback(async (addon: ProductOption, delta: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentQty = getAddonQuantity(addon.id);
    const newQty = Math.max(0, currentQty + delta);

    let newSelection: SelectedAddon[];

    if (newQty === 0) {
      // Remove addon
      newSelection = selectedAddons.filter((a) => a.product_id !== addon.id);
    } else if (currentQty === 0) {
      // Add new addon with tax information
      const newAddon: SelectedAddon = {
        product_id: addon.id,
        name: addon.name,
        price: addon.base_price,
        quantity: newQty,
        // Include tax information for proper pricing calculation
        is_tax_inclusive: addon.is_tax_inclusive ?? false,
        price_with_tax: addon.price_with_tax,
        category_id: addon.category_id ?? undefined,
      };
      newSelection = [...selectedAddons, newAddon];
    } else {
      // Update quantity
      newSelection = selectedAddons.map((a) =>
        a.product_id === addon.id ? { ...a, quantity: newQty } : a
      );
    }

    setSelectedAddons(newSelection);
    onDataChange(buildCompleteData(newSelection));
  }, [selectedAddons, onDataChange, buildCompleteData]);

  const totalItems = useMemo(() => {
    return selectedAddons.reduce((sum, addon) => sum + addon.quantity, 0);
  }, [selectedAddons]);

  // Get selected packages from package selection step for combined pricing
  const selectedPackagesFromState = packageStepData?.selected_packages || [];

  // Calculate combined subtotal (packages + addons + excess hours)
  // Follows client-portal pattern for optimistic pricing
  const subtotalPrice = useMemo(() => {
    // Packages total
    const packagesTotal = selectedPackagesFromState.reduce((sum, pkg) => {
      return sum + parseFloat(pkg.price) * pkg.quantity;
    }, 0);

    // Addons total
    const addonsTotal = selectedAddons.reduce((sum, addon) => {
      return sum + parseFloat(addon.price) * addon.quantity;
    }, 0);

    // Excess hours cost for selected venues
    const excessHoursCost = selectedVenues.reduce((sum, venue) => {
      const additionalHours = venueAdditionalHours[venue.id] || 0;
      const effectivePricing = VenuesAPI.getEffectivePricing(venue);
      const excessPrice = parseFloat(effectivePricing.excessHourPrice || '0');
      return sum + additionalHours * excessPrice;
    }, 0);

    return packagesTotal + addonsTotal + excessHoursCost;
  }, [selectedPackagesFromState, selectedAddons, selectedVenues, venueAdditionalHours]);

  // Calculate total with tax (using configured rate from context)
  const totalPrice = useMemo(() => {
    const tax = subtotalPrice * (state.taxRate || 0);
    return subtotalPrice + tax;
  }, [subtotalPrice, state.taxRate]);

  // Addons-only subtotal for display in summary bar
  const addonsOnlyTotal = useMemo(() => {
    return selectedAddons.reduce((sum, addon) => {
      return sum + parseFloat(addon.price) * addon.quantity;
    }, 0);
  }, [selectedAddons]);

  // Update global price immediately for optimistic UI (footer display)
  // Follows client-portal pattern: triggers PricingSummaryBar update
  useEffect(() => {
    if (totalPrice > 0) {
      const taxRate = state.taxRate || 0; // No hardcoded fallback - use backend TaxRate
      const tax = subtotalPrice * taxRate;

      // Update pricing breakdown for detailed footer display
      actionsRef.current.setPricingBreakdown({
        subtotal: subtotalPrice.toFixed(2),
        tax: tax.toFixed(2),
        tax_rate: taxRate,
        discount: '0.00',
        total: totalPrice.toFixed(2),
        formattedSubtotal: formatCurrency(subtotalPrice, { currency: 'PHP' }),
        formattedTax: formatCurrency(tax, { currency: 'PHP' }),
        formattedDiscount: '',
        formattedTotal: formatCurrency(totalPrice, { currency: 'PHP' }),
        lineItems: [],
      });
    }
  }, [totalPrice, subtotalPrice, state.taxRate]);

  // Group addons by category
  const groupedAddons = useMemo(() => {
    if (!addons || !group_by_category) {
      return { 'All Add-ons': addons || [] };
    }

    return addons.reduce((acc, addon) => {
      const category = addon.category_name || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(addon);
      return acc;
    }, {} as Record<string, ProductOption[]>);
  }, [addons, group_by_category]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading add-ons...</Text>
      </View>
    );
  }

  if (error || !addons) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Couldn't Load Add-ons</Text>
        <Text style={styles.errorText}>
          There was a problem loading available add-ons. Please try again.
        </Text>
      </View>
    );
  }

  if (addons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ShoppingBag size={48} color={colors.neutral.gray} />
        <Text style={styles.emptyTitle}>No Add-ons Available</Text>
        <Text style={styles.emptyText}>
          There are no additional items available for this event.
          You can continue to the next step.
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
      {/* Venue Additional Hours Section */}
      {selectedVenues.length > 0 && (
        <View style={styles.venueHoursSection}>
          <Text style={styles.sectionTitle}>Additional Hours</Text>
          <Text style={styles.sectionSubtitle}>
            Extend your time at any venue. These hours are in addition to what's included in your package.
          </Text>

          {selectedVenues.map((venue) => {
            const pricing = VenuesAPI.getEffectivePricing(venue);
            const additionalHours = venueAdditionalHours[venue.id] || 0;
            const excessPrice = parseFloat(pricing.excessHourPrice || '0');
            const includedHours = pricing.includedHours || 0;
            const totalCost = additionalHours * excessPrice;

            // All-day access venues don't need additional hours
            if (pricing.isAllDayAccess) {
              return (
                <View key={venue.id} style={styles.venueHoursCardAllDay}>
                  <View style={styles.venueHoursInfo}>
                    <Text style={styles.venueHoursName}>{venue.name}</Text>
                    <View style={styles.allDayBadge}>
                      <Sun size={14} color={colors.secondary.forest} weight="fill" />
                      <Text style={styles.allDayText}>All-day access included</Text>
                    </View>
                  </View>
                </View>
              );
            }

            return (
              <View key={venue.id} style={styles.venueHoursCard}>
                <View style={styles.venueHoursInfo}>
                  <Text style={styles.venueHoursName}>{venue.name}</Text>
                  <Text style={styles.venueHoursIncluded}>
                    Includes {includedHours} hours
                  </Text>
                </View>

                <View style={styles.venueHoursControls}>
                  <TouchableOpacity
                    style={[styles.hoursButton, additionalHours === 0 && styles.hoursButtonDisabled]}
                    onPress={() => handleVenueHoursChange(venue.id, Math.max(0, additionalHours - 1))}
                    disabled={additionalHours === 0}
                  >
                    <Minus size={16} color={additionalHours === 0 ? colors.neutral.gray : colors.primary.black} weight="bold" />
                  </TouchableOpacity>

                  <Text style={styles.hoursValue}>+{additionalHours}</Text>

                  <TouchableOpacity
                    style={[styles.hoursButton, additionalHours >= 10 && styles.hoursButtonDisabled]}
                    onPress={() => handleVenueHoursChange(venue.id, Math.min(10, additionalHours + 1))}
                    disabled={additionalHours >= 10}
                  >
                    <Plus size={16} color={additionalHours >= 10 ? colors.neutral.gray : colors.primary.black} weight="bold" />
                  </TouchableOpacity>

                  {additionalHours > 0 && (
                    <View style={styles.hoursCostBadge}>
                      <Text style={styles.hoursCostText}>
                        +{formatCurrency(totalCost, { currency: 'PHP' })}
                      </Text>
                    </View>
                  )}
                </View>

                <Text style={styles.excessRateText}>
                  {formatCurrency(excessPrice, { currency: 'PHP' })}/hr for additional hours
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Divider between sections */}
      {selectedVenues.length > 0 && addons && addons.length > 0 && (
        <View style={styles.sectionDivider} />
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          {description || 'Enhance your event with optional add-ons'}
        </Text>
      </View>

      {/* Summary Bar */}
      {totalItems > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryLeft}>
            <ShoppingBag size={18} color={colors.primary.black} />
            <Text style={styles.summaryText}>
              {totalItems} item{totalItems !== 1 ? 's' : ''} selected
            </Text>
          </View>
          <Text style={styles.summaryPrice}>
            {formatCurrency(addonsOnlyTotal, { currency: 'PHP' })}
          </Text>
        </View>
      )}

      {/* Grouped Addons */}
      {Object.entries(groupedAddons).map(([category, categoryAddons]) => (
        <View key={category} style={styles.categorySection}>
          {group_by_category && Object.keys(groupedAddons).length > 1 && (
            <Text style={styles.categoryTitle}>{category}</Text>
          )}
          <View style={styles.addonList}>
            {categoryAddons.map((addon) => (
              <AddonCard
                key={addon.id}
                addon={addon}
                quantity={getAddonQuantity(addon.id)}
                onQuantityChange={(delta) => handleQuantityChange(addon, delta)}
                showTax={true}
              />
            ))}
          </View>
        </View>
      ))}

      {/* Skip hint */}
      <View style={styles.skipHint}>
        <Text style={styles.skipHintText}>
          Add-ons are optional. You can skip this step if you don't need any extras.
        </Text>
      </View>

      {/* Validation indicator */}
      {isValidating && (
        <View style={styles.validatingContainer}>
          <ActivityIndicator size="small" color={colors.neutral.darkGray} />
          <Text style={styles.validatingText}>Validating selection...</Text>
        </View>
      )}
    </ScrollView>
  );
}

interface AddonCardProps {
  addon: ProductOption;
  quantity: number;
  onQuantityChange: (delta: number) => void;
  showTax?: boolean;
}

function AddonCard({ addon, quantity, onQuantityChange, showTax = false }: AddonCardProps) {
  const { name, description, thumbnail_url, base_price, is_tax_inclusive, price_with_tax } = addon;
  const isSelected = quantity > 0;

  // Display tax indicator - show "Tax Incl." badge for tax-inclusive items
  const showTaxInclusiveBadge = is_tax_inclusive;
  const priceWithTaxValue = price_with_tax ? parseFloat(price_with_tax) : null;

  return (
    <View style={[styles.addonCard, isSelected && styles.addonCardSelected]}>
      {/* Image */}
      {thumbnail_url ? (
        <Image
          source={{ uri: thumbnail_url }}
          style={styles.addonImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.addonImage, styles.addonImagePlaceholder]}>
          <Tag size={24} color={colors.neutral.gray} />
        </View>
      )}

      {/* Content */}
      <View style={styles.addonContent}>
        <View style={styles.addonHeader}>
          <Text style={styles.addonName} numberOfLines={1}>{name}</Text>
        </View>

        {description && (
          <Text style={styles.addonDescription} numberOfLines={2}>
            {description}
          </Text>
        )}

        <View style={styles.addonFooter}>
          <View style={styles.addonPriceContainer}>
            <View style={styles.addonPriceRow}>
              <Text style={styles.addonPrice}>
                {formatCurrency(parseFloat(base_price), { currency: 'PHP' })}
              </Text>
              {showTaxInclusiveBadge && (
                <View style={styles.taxInclusiveBadge}>
                  <Text style={styles.taxInclusiveBadgeText}>Tax Incl.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Quantity Controls */}
          <View style={styles.quantityControls}>
            {isSelected ? (
              <>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => onQuantityChange(-1)}
                >
                  <Minus size={16} color={colors.primary.black} weight="bold" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => onQuantityChange(1)}
                >
                  <Plus size={16} color={colors.primary.black} weight="bold" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => onQuantityChange(1)}
              >
                <Plus size={16} color={colors.neutral.white} weight="bold" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </View>
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
  },
  errorTitle: {
    ...typeScale.titleMedium,
    color: colors.semantic.error,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  emptyText: {
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
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.secondary.forestSubtle,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    marginBottom: spacing.lg,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  summaryPrice: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typeScale.titleSmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addonList: {
    gap: spacing.sm,
  },
  addonCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  addonCardSelected: {
    borderColor: colors.secondary.forest,
    backgroundColor: colors.secondary.forestSubtle,
  },
  addonImage: {
    width: 80,
    height: 80,
    backgroundColor: colors.neutral.sand,
  },
  addonImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addonContent: {
    flex: 1,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  addonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addonName: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    flex: 1,
  },
  popularBadge: {
    backgroundColor: colors.semantic.warning,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: layout.borderRadius.xs,
  },
  popularBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
    fontSize: 9,
  },
  addonDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  addonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  addonPriceContainer: {
    flex: 1,
  },
  addonPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  addonPrice: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  taxInclusiveBadge: {
    backgroundColor: colors.secondary.forestSubtle,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: layout.borderRadius.xs,
  },
  taxInclusiveBadgeText: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
    fontWeight: '600',
    fontSize: 9,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.black,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.sm,
    gap: spacing.xxs,
  },
  addButtonText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  skipHint: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
  },
  skipHintText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  // Venue hours section styles
  venueHoursSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.md,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.neutral.warmGray,
    marginVertical: spacing.lg,
  },
  venueHoursCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  venueHoursCardAllDay: {
    backgroundColor: colors.secondary.forestSubtle,
    borderWidth: 1,
    borderColor: colors.secondary.forest,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  venueHoursInfo: {
    marginBottom: spacing.sm,
  },
  venueHoursName: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '600',
  },
  venueHoursIncluded: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  allDayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    marginTop: spacing.xs,
  },
  allDayText: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
    fontWeight: '500',
  },
  venueHoursControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  hoursButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoursButtonDisabled: {
    opacity: 0.5,
  },
  hoursValue: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    minWidth: 40,
    textAlign: 'center',
  },
  hoursCostBadge: {
    backgroundColor: colors.secondary.forestSubtle,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.sm,
  },
  hoursCostText: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  excessRateText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  // Validation indicator
  validatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  validatingText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
});

export default AddonSelectionStep;
