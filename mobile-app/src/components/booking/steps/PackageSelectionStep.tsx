/**
 * PackageSelectionStep
 *
 * Package selection with support for pre-made packages and custom venue bundles.
 * Aligned with: frontend/client-portal/src/components/booking/steps/CleanPackageSelectionStep.tsx
 */

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import {
  Check,
  Package,
  Clock,
  Plus,
  Minus,
  Wrench,
  Info,
  CheckCircle,
} from "phosphor-react-native";
import { colors, spacing, typeScale, layout, shadows } from "@/theme";
import { usePackages, useRentableVenues } from "@/hooks/booking";
import { useBookingContext } from "@/contexts/BookingContext";
import { VenuesAPI } from "@/apis/booking";
import { formatCurrency } from "@/utils/currency";
import { differenceInDays, parseISO } from "date-fns";
import type { StepComponentProps } from "../StepRenderer";
import type {
  PackageSelectionStepData,
  PackageSelectionStepConfiguration,
  SelectedPackage,
  AttendeeBreakdown,
  RentableVenueWithEventType,
} from "@/types/booking";
import type { ProductOption } from "@/apis/booking/products.api";
import * as Haptics from "expo-haptics";

type PackageSelectionStepProps = StepComponentProps<
  PackageSelectionStepData,
  PackageSelectionStepConfiguration
>;

// =============================================================================
// UTILITY: EXTRACT GUEST COUNT FROM QUESTIONNAIRE
// =============================================================================

/**
 * Extracts total guest count from questionnaire responses by looking for fields
 * marked with is_guest_count in the booking flow step configuration.
 */
function extractGuestCount(
  questionnaireResponses: Record<string, unknown> | undefined,
  enabledSteps:
    | Array<{
        step_type: string;
        configuration_data?: Record<string, unknown> | null;
      }>
    | undefined,
): number | null {
  if (!questionnaireResponses || !enabledSteps) return null;

  let totalGuests = 0;
  let found = false;

  for (const step of enabledSteps) {
    if (step.step_type !== "questionnaire" || !step.configuration_data)
      continue;
    const configData = step.configuration_data as Record<string, unknown>;
    const items = (configData.questionnaire_items || []) as Array<
      Record<string, unknown>
    >;
    for (const item of items) {
      const details = item.questionnaire_details as
        | Record<string, unknown>
        | undefined;
      const fields = (details?.fields || []) as Array<Record<string, unknown>>;
      for (const field of fields) {
        if (field.is_guest_count) {
          const key = `field_${field.id}`;
          const value = questionnaireResponses[key];
          if (value != null) {
            const num =
              typeof value === "number" ? value : parseInt(String(value), 10);
            if (!isNaN(num)) {
              totalGuests += num;
              found = true;
            }
          }
        }
      }
    }
  }

  return found ? totalGuests : null;
}

// =============================================================================
// UTILITY: EXTRACT CHILD PRICING CONFIG
// =============================================================================

interface ChildPricingTier {
  min_age: number;
  max_age: number;
  discount_percentage: number;
  label: string;
}

interface ChildPricingConfig {
  enabled: boolean;
  tiers: ChildPricingTier[];
}

/**
 * Extracts child pricing configuration from the payment_info step's
 * effective_payment_terms in the booking flow.
 */
function extractChildPricingConfig(
  enabledSteps:
    | Array<{
        step_type: string;
        configuration_data?: Record<string, unknown> | null;
      }>
    | undefined,
): ChildPricingConfig {
  if (!enabledSteps) return { enabled: false, tiers: [] };
  for (const step of enabledSteps) {
    if (step.step_type !== "payment_info" || !step.configuration_data) continue;
    const configData = step.configuration_data as Record<string, unknown>;
    const effectiveTerms = configData.effective_payment_terms as
      | Record<string, unknown>
      | undefined;
    if (!effectiveTerms) continue;
    const enabled = effectiveTerms.child_pricing_enabled === true;
    const tiers = (effectiveTerms.child_pricing_tiers ||
      []) as ChildPricingTier[];
    return { enabled: enabled && tiers.length > 0, tiers };
  }
  return { enabled: false, tiers: [] };
}

// =============================================================================
// VENUE HOURS SELECTOR COMPONENT
// =============================================================================

interface VenueHoursSelectorProps {
  venues: RentableVenueWithEventType[];
  venueHours: Record<number, number>;
  onHoursChange: (venueId: number, hours: number) => void;
  maxHours?: number;
}

function VenueHoursSelector({
  venues,
  venueHours,
  onHoursChange,
  maxHours = 10,
}: VenueHoursSelectorProps) {
  return (
    <View style={styles.venueHoursContainer}>
      <Text style={styles.venueHoursTitle}>Customize Your Hours</Text>
      <Text style={styles.venueHoursSubtitle}>
        Need more time? Add additional hours to your venues.
      </Text>

      {venues.map((venue) => {
        const pricing = VenuesAPI.getEffectivePricing(venue);
        const additionalHours = venueHours[venue.id] || 0;
        const excessPrice = parseFloat(pricing.excessHourPrice || "0");
        const includedHours = pricing.includedHours;
        const totalCost = additionalHours * excessPrice;

        // Skip hours selector for all-day access venues
        if (pricing.isAllDayAccess) {
          return (
            <View key={venue.id} style={styles.venueHoursItemAllDay}>
              <View style={styles.venueHoursInfo}>
                <Text style={styles.venueHoursVenueName}>{venue.name}</Text>
                <Text style={styles.allDayLabel}>All-day access included</Text>
              </View>
              <View style={styles.allDayBadge}>
                <Text style={styles.allDayBadgeText}>All Day</Text>
              </View>
            </View>
          );
        }

        return (
          <View key={venue.id} style={styles.venueHoursItem}>
            <View style={styles.venueHoursInfo}>
              <Text style={styles.venueHoursVenueName}>{venue.name}</Text>
              <Text style={styles.venueHoursIncluded}>
                Includes {includedHours} hours
              </Text>
            </View>

            <View style={styles.venueHoursControls}>
              <Text style={styles.needMoreLabel}>Need more?</Text>

              <View style={styles.hoursStepper}>
                <TouchableOpacity
                  style={[
                    styles.hoursStepperButton,
                    additionalHours === 0 && styles.hoursStepperButtonDisabled,
                  ]}
                  onPress={() =>
                    onHoursChange(venue.id, Math.max(0, additionalHours - 1))
                  }
                  disabled={additionalHours === 0}
                >
                  <Minus
                    size={16}
                    color={
                      additionalHours === 0
                        ? colors.neutral.gray
                        : colors.primary.black
                    }
                  />
                </TouchableOpacity>

                <Text style={styles.hoursStepperValue}>+{additionalHours}</Text>

                <TouchableOpacity
                  style={[
                    styles.hoursStepperButton,
                    additionalHours >= maxHours &&
                      styles.hoursStepperButtonDisabled,
                  ]}
                  onPress={() =>
                    onHoursChange(
                      venue.id,
                      Math.min(maxHours, additionalHours + 1),
                    )
                  }
                  disabled={additionalHours >= maxHours}
                >
                  <Plus
                    size={16}
                    color={
                      additionalHours >= maxHours
                        ? colors.neutral.gray
                        : colors.primary.black
                    }
                  />
                </TouchableOpacity>
              </View>

              {additionalHours > 0 && (
                <View style={styles.hoursAddedBadge}>
                  <Text style={styles.hoursAddedText}>
                    +{formatCurrency(totalCost, { currency: "PHP" })}
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.excessRateText}>
              Additional hours:{" "}
              {formatCurrency(excessPrice, { currency: "PHP" })}/hr
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// =============================================================================
// PACKAGE CARD COMPONENT
// =============================================================================

interface PackageCardProps {
  package: ProductOption;
  selected: boolean;
  quantity: number;
  onPress: () => void;
  onQuantityChange: (delta: number) => void;
  showPricing?: boolean;
  showDescription?: boolean;
  showImage?: boolean;
  showQuantity?: boolean;
  disabled?: boolean;
  isCustomBundle?: boolean;
  isMultiVenue?: boolean;
  // Child pricing / attendee breakdown props
  childPricingEnabled?: boolean;
  attendeeBreakdown?: AttendeeBreakdown[];
  onAttendeeCountChange?: (tierIndex: number, delta: number) => void;
}

function PackageCard({
  package: pkg,
  selected,
  quantity,
  onPress,
  onQuantityChange,
  showPricing = true,
  showDescription = true,
  showImage = true,
  showQuantity = false,
  disabled = false,
  isCustomBundle = false,
  isMultiVenue = false,
  childPricingEnabled = false,
  attendeeBreakdown,
  onAttendeeCountChange,
}: PackageCardProps) {
  const {
    name,
    description,
    thumbnail_url,
    effective_featured_image,
    base_price,
    pricing_model,
    pricing_unit,
    pricing_unit_display,
    minimum_guests,
    maximum_guests,
    included_hours,
    excess_hour_price,
    has_excess_hours,
    is_tax_inclusive,
  } = pkg;

  const isPerPerson = pricing_unit === "PER_PERSON";
  const perPersonMin = minimum_guests || 1;
  const perPersonMax = maximum_guests || undefined;
  const basePriceNum = parseFloat(base_price);

  // Use effective_featured_image (inherits from venue) or fall back to thumbnail_url
  const displayImage = effective_featured_image || thumbnail_url;

  return (
    <TouchableOpacity
      style={[
        styles.packageCard,
        selected && styles.packageCardSelected,
        disabled && styles.packageCardDisabled,
        isCustomBundle && styles.packageCardCustomBundle,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {/* Custom Bundle Badge */}
      {isCustomBundle && (
        <View style={styles.customBundleBadge}>
          <Wrench size={14} color={colors.neutral.white} />
          <Text style={styles.customBundleBadgeText}>
            {isMultiVenue ? "Custom Bundle" : "Venue Package"}
          </Text>
        </View>
      )}

      {/* Image */}
      {showImage && displayImage && !isCustomBundle && (
        <Image
          source={{ uri: displayImage }}
          style={styles.packageImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      )}

      {/* Content */}
      <View
        style={[
          styles.packageContent,
          isCustomBundle && styles.packageContentCustomBundle,
        ]}
      >
        <View style={styles.packageHeader}>
          <View style={styles.packageTitleRow}>
            <Package
              size={20}
              color={isCustomBundle ? colors.tertiary.teal : colors.accent.wood}
            />
            <Text style={styles.packageName} numberOfLines={1}>
              {name}
            </Text>
          </View>
          {selected && (
            <View
              style={[
                styles.selectedIndicator,
                isCustomBundle && styles.selectedIndicatorCustom,
              ]}
            >
              <Check size={16} color={colors.neutral.white} weight="bold" />
            </View>
          )}
        </View>

        {showDescription && description && (
          <Text style={styles.packageDescription} numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Hours info */}
        {included_hours && (
          <View style={styles.hoursInfo}>
            <Clock size={14} color={colors.neutral.darkGray} />
            <Text style={styles.hoursText}>
              {included_hours === "All day"
                ? "All-day access"
                : `${included_hours} hours included`}
            </Text>
          </View>
        )}

        {/* Pricing */}
        {showPricing && (
          <View style={styles.packagePricing}>
            <View>
              <View style={styles.priceRow}>
                <Text
                  style={[
                    styles.packagePrice,
                    isCustomBundle && styles.packagePriceCustom,
                  ]}
                >
                  {formatCurrency(parseFloat(base_price), { currency: "PHP" })}
                </Text>
                {is_tax_inclusive && (
                  <View style={styles.taxInclusiveBadge}>
                    <Text style={styles.taxInclusiveBadgeText}>Tax Incl.</Text>
                  </View>
                )}
              </View>
              <Text style={styles.packagePriceUnit}>
                {pricing_unit_display?.toLowerCase() ||
                  (pricing_unit
                    ? pricing_unit.replace("PER_", "per ").toLowerCase()
                    : pricing_model === "HOURLY"
                      ? "per hour"
                      : "per event")}
              </Text>
              {/* Per-person pricing highlight */}
              {isPerPerson && (
                <View style={styles.perPersonHighlight}>
                  {minimum_guests && minimum_guests > 1 ? (
                    <>
                      <Text style={styles.perPersonMinLabel}>
                        Minimum {minimum_guests} persons
                      </Text>
                      <Text style={styles.perPersonFromPrice}>
                        Starting at{" "}
                        {formatCurrency(basePriceNum * minimum_guests, {
                          currency: "PHP",
                        })}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.perPersonMinLabel}>
                      Price is per person
                    </Text>
                  )}
                </View>
              )}
            </View>

            {/* Excess hour pricing */}
            {has_excess_hours && excess_hour_price && (
              <View style={styles.excessHourInfo}>
                <Text style={styles.excessHourLabel}>Additional hours:</Text>
                <Text style={styles.excessHourPrice}>
                  {formatCurrency(parseFloat(excess_hour_price), {
                    currency: "PHP",
                  })}
                  /hr
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Quantity Selector (non-per-person packages) */}
        {showQuantity && !isPerPerson && (
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              <Minus
                size={18}
                color={
                  quantity <= 1 ? colors.neutral.gray : colors.primary.black
                }
              />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onQuantityChange(1)}
            >
              <Plus size={18} color={colors.primary.black} />
            </TouchableOpacity>
          </View>
        )}

        {/* Per-Person Headcount Stepper (simple mode — no child pricing) */}
        {showQuantity && isPerPerson && !childPricingEnabled && (
          <View style={styles.headcountContainer}>
            <Text style={styles.headcountLabel}>
              Number of Guests
              {perPersonMin > 1 ? ` (minimum ${perPersonMin})` : ""}
            </Text>
            <View style={styles.headcountStepper}>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  quantity <= perPersonMin && styles.headcountButtonDisabled,
                ]}
                onPress={() => onQuantityChange(-1)}
                disabled={quantity <= perPersonMin}
              >
                <Minus
                  size={18}
                  color={
                    quantity <= perPersonMin
                      ? colors.neutral.gray
                      : colors.primary.black
                  }
                />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  perPersonMax !== undefined &&
                    quantity >= perPersonMax &&
                    styles.headcountButtonDisabled,
                ]}
                onPress={() => onQuantityChange(1)}
                disabled={
                  perPersonMax !== undefined && quantity >= perPersonMax
                }
              >
                <Plus
                  size={18}
                  color={
                    perPersonMax !== undefined && quantity >= perPersonMax
                      ? colors.neutral.gray
                      : colors.primary.black
                  }
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.headcountBreakdown}>
              {quantity} x {formatCurrency(basePriceNum, { currency: "PHP" })}
              /person ={" "}
              {formatCurrency(basePriceNum * quantity, { currency: "PHP" })}
            </Text>
          </View>
        )}

        {/* Per-Person Attendee Breakdown (child pricing enabled) */}
        {showQuantity &&
          isPerPerson &&
          childPricingEnabled &&
          attendeeBreakdown &&
          onAttendeeCountChange && (
            <View style={styles.attendeeBreakdownContainer}>
              <Text style={styles.headcountLabel}>Attendee Breakdown</Text>

              {attendeeBreakdown.map((tier, index) => {
                const totalCount = attendeeBreakdown.reduce(
                  (sum, t) => sum + t.count,
                  0,
                );
                const isMinusDisabled = tier.count <= 0;
                const isPlusDisabled =
                  perPersonMax !== undefined && totalCount >= perPersonMax;

                return (
                  <View key={index} style={styles.attendeeTierRow}>
                    <View style={styles.attendeeTierInfo}>
                      <Text style={styles.attendeeTierLabel}>
                        {tier.tier_label}
                      </Text>
                      <View style={styles.attendeeTierPriceRow}>
                        <Text style={styles.attendeeTierPrice}>
                          {formatCurrency(tier.unit_price, { currency: "PHP" })}
                          /person
                        </Text>
                        {tier.discount_percentage > 0 && (
                          <View style={styles.attendeeDiscountBadge}>
                            <Text style={styles.attendeeDiscountBadgeText}>
                              {tier.discount_percentage}% off
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.attendeeTierControls}>
                      <TouchableOpacity
                        style={[
                          styles.attendeeStepperButton,
                          isMinusDisabled &&
                            styles.attendeeStepperButtonDisabled,
                        ]}
                        onPress={() => onAttendeeCountChange(index, -1)}
                        disabled={isMinusDisabled}
                      >
                        <Minus
                          size={16}
                          color={
                            isMinusDisabled
                              ? colors.neutral.gray
                              : colors.primary.black
                          }
                        />
                      </TouchableOpacity>
                      <Text style={styles.attendeeTierCount}>{tier.count}</Text>
                      <TouchableOpacity
                        style={[
                          styles.attendeeStepperButton,
                          isPlusDisabled &&
                            styles.attendeeStepperButtonDisabled,
                        ]}
                        onPress={() => onAttendeeCountChange(index, 1)}
                        disabled={isPlusDisabled}
                      >
                        <Plus
                          size={16}
                          color={
                            isPlusDisabled
                              ? colors.neutral.gray
                              : colors.primary.black
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Attendee Breakdown Totals */}
              <View style={styles.attendeeTotalRow}>
                <Text style={styles.attendeeTotalLabel}>
                  Total:{" "}
                  {attendeeBreakdown.reduce((sum, t) => sum + t.count, 0)}{" "}
                  {attendeeBreakdown.reduce((sum, t) => sum + t.count, 0) === 1
                    ? "person"
                    : "persons"}
                </Text>
                <Text style={styles.attendeeTotalPrice}>
                  {formatCurrency(
                    attendeeBreakdown.reduce((sum, t) => sum + t.subtotal, 0),
                    { currency: "PHP" },
                  )}
                </Text>
              </View>

              {/* Min guests warning */}
              {perPersonMin > 1 &&
                attendeeBreakdown.reduce((sum, t) => sum + t.count, 0) <
                  perPersonMin && (
                  <Text style={styles.attendeeMinWarning}>
                    Minimum {perPersonMin} persons required
                  </Text>
                )}
            </View>
          )}
      </View>
    </TouchableOpacity>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PackageSelectionStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: PackageSelectionStepProps) {
  const { state, actions } = useBookingContext();

  // Use refs for action functions to avoid them being dependencies in useEffect
  // This prevents infinite loops when actions object changes
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Get configuration values
  const {
    selection_type = "SINGLE",
    min_selection = 1,
    max_selection = 1,
    show_pricing = true,
    show_descriptions = true,
    show_images = true,
    filter_by_event_type = true, // Default to true - filter packages by event type
  } = configuration || {};

  // Get event type ID from flow (event_type is the ID directly)
  const eventTypeId = state.currentFlow?.event_type;

  // Fetch packages - filter by event type if configuration enables it
  // When filter_by_event_type is true, only packages associated with the current event type are shown
  // Packages with no event types are hidden when filtering is enabled
  const {
    data: packages,
    isLoading,
    error,
  } = usePackages(filter_by_event_type ? eventTypeId : undefined, {
    filterByEventType: filter_by_event_type,
  });

  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>(
    data.selected_packages || [],
  );
  const [venueAdditionalHours, setVenueAdditionalHours] = useState<
    Record<number, number>
  >(
    data.venue_additional_hours
      ? Object.entries(data.venue_additional_hours).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [parseInt(key)]: value,
          }),
          {} as Record<number, number>,
        )
      : {},
  );

  const isMultiSelect = selection_type === "MULTIPLE" || max_selection > 1;

  // Extract child pricing config from payment_info step
  const childPricingConfig = useMemo(
    () => extractChildPricingConfig(state.currentFlow?.enabled_steps),
    [state.currentFlow?.enabled_steps],
  );

  // Get selected venue IDs from venue selection step
  const selectedVenueIds =
    state.stepData.venue_selection?.selected_venue_ids || [];
  const hasVenueSelection = selectedVenueIds.length > 0;

  // Fetch rentable venues with event-type-specific pricing
  const { data: allVenues } = useRentableVenues(eventTypeId);

  // Get selected venue objects
  const selectedVenues = useMemo(() => {
    if (!allVenues || !hasVenueSelection) return [];
    return allVenues.filter((v) => selectedVenueIds.includes(v.id));
  }, [allVenues, selectedVenueIds, hasVenueSelection]);

  // Calculate event days from date step data
  const eventDays = useMemo(() => {
    const dateData = state.stepData.date_time;
    if (!dateData?.start_date) return null;
    if (!dateData?.end_date) return 1;

    const start = parseISO(dateData.start_date);
    const end = parseISO(dateData.end_date);
    return differenceInDays(end, start) + 1;
  }, [state.stepData.date_time]);

  // Filter packages by event_days
  const filteredPackages = useMemo(() => {
    if (!packages || eventDays === null) return packages || [];

    return packages.filter((pkg) => {
      // If package has no event_days restriction, it's available for all durations
      if (pkg.event_days === null || pkg.event_days === undefined) return true;
      // Otherwise, exact match required
      return pkg.event_days === eventDays;
    });
  }, [packages, eventDays]);

  // Calculate custom bundle pricing using effective pricing
  const customBundlePricing = useMemo(() => {
    if (selectedVenues.length === 0) return null;

    const venuePricings = selectedVenues.map((v) => ({
      venue: v,
      pricing: VenuesAPI.getEffectivePricing(v),
    }));

    const subtotal = venuePricings.reduce(
      (sum, { pricing }) => sum + parseFloat(pricing.basePrice || "0"),
      0,
    );

    const hasAllDayAccess = venuePricings.some(
      ({ pricing }) => pricing.isAllDayAccess,
    );

    const totalHours = hasAllDayAccess
      ? 24
      : venuePricings.reduce(
          (sum, { pricing }) => sum + (pricing.includedHours || 0),
          0,
        );

    const hasDiscount = selectedVenues.length > 1;
    const discountPercent = 10; // 10% bundle discount for multi-venue
    const discountAmount = hasDiscount ? subtotal * (discountPercent / 100) : 0;
    const total = subtotal - discountAmount;

    const firstVenuePricing = venuePricings[0]?.pricing;
    const excessHourPrice = hasAllDayAccess
      ? "0"
      : firstVenuePricing?.excessHourPrice || "0";

    return {
      subtotal,
      totalHours,
      hasDiscount,
      discountPercent,
      discountAmount,
      total,
      excessHourPrice,
      venueNames: selectedVenues.map((v) => v.name).join(" + "),
      hasAllDayAccess,
    };
  }, [selectedVenues]);

  // Create virtual custom bundle package
  const isMultiVenue = selectedVenues.length > 1;
  const customBundlePackage: ProductOption | null = useMemo(() => {
    if (!customBundlePricing || selectedVenues.length === 0) return null;

    const packageName = isMultiVenue
      ? `Custom: ${customBundlePricing.venueNames}`
      : selectedVenues[0]?.name || "Your Venue";

    let packageDescription: string;
    if (isMultiVenue) {
      packageDescription = `Your custom package with ${selectedVenues.length} venues. Includes ${customBundlePricing.discountPercent}% multi-venue discount.`;
    } else if (customBundlePricing.hasAllDayAccess) {
      packageDescription = `Book ${selectedVenues[0]?.name} with all-day access for your event.`;
    } else {
      packageDescription = `Book ${selectedVenues[0]?.name} for your event.`;
    }

    return {
      id: -1, // Virtual ID for custom package
      name: packageName,
      description: packageDescription,
      base_price: customBundlePricing.total.toString(),
      included_hours: customBundlePricing.hasAllDayAccess
        ? "All day"
        : customBundlePricing.totalHours.toString(),
      excess_hour_price: customBundlePricing.excessHourPrice,
      has_excess_hours: !customBundlePricing.hasAllDayAccess,
      pricing_model: "FIXED",
      type: "PACKAGE",
      is_active: true,
      is_featured: false,
    } as ProductOption;
  }, [customBundlePricing, selectedVenues, isMultiVenue]);

  useEffect(() => {
    setSelectedPackages(data.selected_packages || []);
  }, [data.selected_packages]);

  // Build complete data with venue hours
  const buildCompleteData = useCallback(
    (packages: SelectedPackage[]): PackageSelectionStepData => {
      const venueHoursForApi = Object.entries(venueAdditionalHours).reduce(
        (acc, [key, value]) => ({
          ...acc,
          [key]: value,
        }),
        {} as Record<string, number>,
      );

      const dataToSend: PackageSelectionStepData = {
        selected_packages: packages,
      };

      if (
        selectedVenues.length > 0 &&
        Object.keys(venueHoursForApi).length > 0
      ) {
        dataToSend.venue_additional_hours = venueHoursForApi;
      }

      return dataToSend;
    },
    [venueAdditionalHours, selectedVenues.length],
  );

  const isPackageSelected = (packageId: number): boolean => {
    return selectedPackages.some((p) => p.product_id === packageId);
  };

  const getPackageQuantity = (packageId: number): number => {
    const pkg = selectedPackages.find((p) => p.product_id === packageId);
    return pkg?.quantity || 0;
  };

  const handleTogglePackage = useCallback(
    async (pkg: ProductOption) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      let newSelection: SelectedPackage[];

      if (isPackageSelected(pkg.id)) {
        // Remove package
        newSelection = selectedPackages.filter((p) => p.product_id !== pkg.id);
      } else {
        // Add package — for PER_PERSON, initialize quantity from guest count
        const isPerPerson = pkg.pricing_unit === "PER_PERSON";
        const effectiveMin = isPerPerson ? pkg.minimum_guests || 1 : 1;
        const guestCount = isPerPerson
          ? extractGuestCount(
              state.stepData?.questionnaire?.responses as
                | Record<string, unknown>
                | undefined,
              state.currentFlow?.enabled_steps,
            )
          : null;
        const initialQuantity = isPerPerson
          ? Math.max(effectiveMin, guestCount || 0)
          : 1;

        const newPackage: SelectedPackage = {
          product_id: pkg.id,
          name: pkg.name,
          price: pkg.base_price,
          quantity: initialQuantity,
          is_tax_inclusive: pkg.is_tax_inclusive ?? false,
          included_hours: pkg.included_hours ?? undefined,
          excess_hour_rate: pkg.excess_hour_price ?? undefined,
          pricing_unit: pkg.pricing_unit,
          pricing_unit_display: pkg.pricing_unit_display,
          minimum_guests: pkg.minimum_guests,
          maximum_guests: pkg.maximum_guests,
        };

        // Initialize attendee breakdown for per-person packages with child pricing
        if (isPerPerson && childPricingConfig.enabled) {
          const adultTier =
            childPricingConfig.tiers.find((t) => t.discount_percentage === 0) ||
            childPricingConfig.tiers[0];
          const basePriceNum = parseFloat(pkg.base_price);
          newPackage.attendee_breakdown = childPricingConfig.tiers.map(
            (tier) => ({
              tier_label: tier.label,
              min_age: tier.min_age,
              max_age: tier.max_age,
              count: tier === adultTier ? initialQuantity : 0,
              discount_percentage: tier.discount_percentage,
              unit_price: basePriceNum * (1 - tier.discount_percentage / 100),
              subtotal:
                tier === adultTier
                  ? basePriceNum *
                    (1 - tier.discount_percentage / 100) *
                    initialQuantity
                  : 0,
            }),
          );
        }

        // For custom bundle
        if (pkg.id === -1) {
          newPackage.is_custom_bundle = true;
          newPackage.venue_ids = selectedVenueIds;
        }

        if (isMultiSelect) {
          if (selectedPackages.length < max_selection) {
            newSelection = [...selectedPackages, newPackage];
          } else {
            return; // Max selection reached
          }
        } else {
          newSelection = [newPackage];
        }
      }

      setSelectedPackages(newSelection);
      onDataChange(buildCompleteData(newSelection));
    },
    [
      selectedPackages,
      isMultiSelect,
      max_selection,
      onDataChange,
      selectedVenueIds,
      buildCompleteData,
      state.stepData?.questionnaire,
      state.currentFlow?.enabled_steps,
      childPricingConfig,
    ],
  );

  const handleQuantityChange = useCallback(
    async (packageId: number, delta: number) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Find the source ProductOption to check pricing_unit and guest limits
      const allAvailablePackages = [
        ...(filteredPackages || []),
        ...(customBundlePackage ? [customBundlePackage] : []),
      ];
      const sourcePkg = allAvailablePackages.find((p) => p.id === packageId);

      const newSelection = selectedPackages.map((p) => {
        if (p.product_id === packageId) {
          // For PER_PERSON packages, enforce minimum_guests as the floor
          const isPerPerson = sourcePkg?.pricing_unit === "PER_PERSON";
          const minQty = isPerPerson ? sourcePkg?.minimum_guests || 1 : 1;
          const maxQty = isPerPerson
            ? sourcePkg?.maximum_guests || undefined
            : undefined;
          let newQuantity = Math.max(minQty, p.quantity + delta);
          if (maxQty !== undefined) {
            newQuantity = Math.min(maxQty, newQuantity);
          }
          return { ...p, quantity: newQuantity };
        }
        return p;
      });

      setSelectedPackages(newSelection);
      onDataChange(buildCompleteData(newSelection));
    },
    [
      selectedPackages,
      onDataChange,
      buildCompleteData,
      filteredPackages,
      customBundlePackage,
    ],
  );

  const handleAttendeeCountChange = useCallback(
    async (packageId: number, tierIndex: number, delta: number) => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Find the source ProductOption for guest limits
      const allAvailablePackages = [
        ...(filteredPackages || []),
        ...(customBundlePackage ? [customBundlePackage] : []),
      ];
      const sourcePkg = allAvailablePackages.find((p) => p.id === packageId);
      const minGuests = sourcePkg?.minimum_guests || 1;
      const maxGuests = sourcePkg?.maximum_guests || undefined;

      const newSelection = selectedPackages.map((p) => {
        if (p.product_id !== packageId || !p.attendee_breakdown) return p;

        const updatedBreakdown = p.attendee_breakdown.map((tier, idx) => {
          if (idx !== tierIndex) return tier;
          const newCount = Math.max(0, tier.count + delta);
          return {
            ...tier,
            count: newCount,
            subtotal: newCount * tier.unit_price,
          };
        });

        // Calculate total count across all tiers
        const totalCount = updatedBreakdown.reduce(
          (sum, t) => sum + t.count,
          0,
        );

        // Enforce maximum_guests: if adding would exceed max, don't change
        if (maxGuests !== undefined && totalCount > maxGuests && delta > 0) {
          return p;
        }

        return {
          ...p,
          attendee_breakdown: updatedBreakdown,
          quantity: Math.max(minGuests, totalCount),
        };
      });

      setSelectedPackages(newSelection);
      onDataChange(buildCompleteData(newSelection));
    },
    [
      selectedPackages,
      onDataChange,
      buildCompleteData,
      filteredPackages,
      customBundlePackage,
    ],
  );

  const handleVenueHoursChange = useCallback(
    (venueId: number, hours: number) => {
      const newHours = {
        ...venueAdditionalHours,
        [venueId]: hours,
      };
      setVenueAdditionalHours(newHours);

      // Update data with new hours
      if (selectedPackages.length > 0) {
        const venueHoursForApi = Object.entries(newHours).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value,
          }),
          {} as Record<string, number>,
        );

        onDataChange({
          selected_packages: selectedPackages,
          venue_additional_hours: venueHoursForApi,
        });
      }
    },
    [venueAdditionalHours, selectedPackages, onDataChange],
  );

  // Calculate subtotal for display (packages + excess hours)
  // Follows client-portal pattern: CleanPackageSelectionStep.tsx
  const subtotalPrice = useMemo(() => {
    const packagesPrice = selectedPackages.reduce((sum, pkg) => {
      return sum + parseFloat(pkg.price) * pkg.quantity;
    }, 0);

    // Add excess hours cost for selected venues (using effective pricing)
    const excessHoursCost = selectedVenues.reduce((sum, venue) => {
      const additionalHours = venueAdditionalHours[venue.id] || 0;
      const effectivePricing = VenuesAPI.getEffectivePricing(venue);
      const excessPrice = parseFloat(effectivePricing.excessHourPrice || "0");
      return sum + additionalHours * excessPrice;
    }, 0);

    return packagesPrice + excessHoursCost;
  }, [selectedPackages, selectedVenues, venueAdditionalHours]);

  // Calculate total with tax for display (using configured rate from context)
  const totalPrice = useMemo(() => {
    const tax = subtotalPrice * (state.taxRate || 0);
    return subtotalPrice + tax;
  }, [subtotalPrice, state.taxRate]);

  // Update global price immediately for optimistic UI (footer display)
  // Follows client-portal pattern: triggers PricingSummaryBar as soon as packages selected
  useEffect(() => {
    if (totalPrice > 0) {
      const taxRate = state.taxRate || 0; // No hardcoded fallback - use backend TaxRate
      const tax = subtotalPrice * taxRate;

      // Update pricing breakdown for detailed footer display
      // Using ref to avoid infinite loops when actions object changes
      actionsRef.current.setPricingBreakdown({
        subtotal: subtotalPrice.toFixed(2),
        tax: tax.toFixed(2),
        tax_rate: taxRate,
        discount: "0.00",
        total: totalPrice.toFixed(2),
        formattedSubtotal: formatCurrency(subtotalPrice, { currency: "PHP" }),
        formattedTax: formatCurrency(tax, { currency: "PHP" }),
        formattedDiscount: "",
        formattedTotal: formatCurrency(totalPrice, { currency: "PHP" }),
        lineItems: [],
      });
    }
  }, [totalPrice, subtotalPrice, state.taxRate]);

  const isCustomBundleSelected = isPackageSelected(-1);

  const getValidationMessage = (): string | null => {
    if (selectedPackages.length < min_selection) {
      return `Please select at least ${min_selection} package${min_selection > 1 ? "s" : ""}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading packages...</Text>
      </View>
    );
  }

  if (error || !packages) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Couldn't Load Packages</Text>
        <Text style={styles.errorText}>
          There was a problem loading available packages. Please try again.
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
        <Text style={styles.title}>Choose Your Package</Text>
        <Text style={styles.subtitle}>
          {isMultiSelect
            ? `Choose up to ${max_selection} packages for your event`
            : "Choose the package that best fits your needs"}
        </Text>

        {/* Venue context */}
        {hasVenueSelection && selectedVenues.length > 0 && (
          <Text style={styles.venueContext}>
            Based on your selection:{" "}
            {selectedVenues.map((v) => v.name).join(", ")}
          </Text>
        )}
      </View>

      {/* Selection count */}
      {isMultiSelect && (
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedPackages.length} of {max_selection} packages selected
          </Text>
          {totalPrice > 0 && (
            <Text style={styles.totalPrice}>
              Total: {formatCurrency(totalPrice, { currency: "PHP" })}
            </Text>
          )}
        </View>
      )}

      {/* Custom Bundle Option */}
      {customBundlePackage && (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isMultiVenue ? "Create Custom Bundle" : "Book Your Venue"}
            </Text>
          </View>

          <PackageCard
            key="custom-bundle"
            package={customBundlePackage}
            selected={isCustomBundleSelected}
            quantity={getPackageQuantity(-1)}
            onPress={() => handleTogglePackage(customBundlePackage)}
            onQuantityChange={(delta) => handleQuantityChange(-1, delta)}
            showPricing={show_pricing}
            showDescription={show_descriptions}
            showImage={false}
            showQuantity={isMultiSelect && isCustomBundleSelected}
            disabled={
              !isCustomBundleSelected &&
              selectedPackages.length >= max_selection
            }
            isCustomBundle={true}
            isMultiVenue={isMultiVenue}
          />

          {/* Venue Hours Selector when custom bundle is selected */}
          {isCustomBundleSelected && selectedVenues.length > 0 && (
            <VenueHoursSelector
              venues={selectedVenues}
              venueHours={venueAdditionalHours}
              onHoursChange={handleVenueHoursChange}
              maxHours={10}
            />
          )}

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR CHOOSE A PRE-MADE PACKAGE</Text>
            <View style={styles.dividerLine} />
          </View>
        </>
      )}

      {/* Pre-made Package List */}
      <View style={styles.packageList}>
        {filteredPackages.length > 0 ? (
          filteredPackages.map((pkg) => {
            const pkgSelected = isPackageSelected(pkg.id);
            const isPerPersonPkg = pkg.pricing_unit === "PER_PERSON";
            const selectedPkgData = selectedPackages.find(
              (p) => p.product_id === pkg.id,
            );
            return (
              <PackageCard
                key={pkg.id}
                package={pkg}
                selected={pkgSelected}
                quantity={getPackageQuantity(pkg.id)}
                onPress={() => handleTogglePackage(pkg)}
                onQuantityChange={(delta) =>
                  handleQuantityChange(pkg.id, delta)
                }
                showPricing={show_pricing}
                showDescription={show_descriptions}
                showImage={show_images}
                showQuantity={
                  (isMultiSelect && pkgSelected) ||
                  (isPerPersonPkg && pkgSelected)
                }
                disabled={
                  !pkgSelected && selectedPackages.length >= max_selection
                }
                childPricingEnabled={
                  isPerPersonPkg && childPricingConfig.enabled
                }
                attendeeBreakdown={selectedPkgData?.attendee_breakdown}
                onAttendeeCountChange={
                  isPerPersonPkg && childPricingConfig.enabled
                    ? (tierIndex, delta) =>
                        handleAttendeeCountChange(pkg.id, tierIndex, delta)
                    : undefined
                }
              />
            );
          })
        ) : (
          <View style={styles.noPackages}>
            <Text style={styles.noPackagesTitle}>No packages available</Text>
            {customBundlePackage && (
              <Text style={styles.noPackagesText}>
                You can create a custom package from your venue selection.
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Validation message */}
      {(validationErrors?.selected_packages || getValidationMessage()) && (
        <Text style={styles.validationError}>
          {validationErrors?.selected_packages?.[0] || getValidationMessage()}
        </Text>
      )}

      {/* Total Summary */}
      {selectedPackages.length > 0 && (
        <View style={styles.totalSummary}>
          <CheckCircle
            size={24}
            color={colors.secondary.forest}
            weight="fill"
          />
          <View style={styles.totalSummaryContent}>
            <Text style={styles.totalSummaryTitle}>
              {selectedPackages.length}{" "}
              {selectedPackages.length === 1 ? "package" : "packages"} selected
            </Text>
            {/* Per-person breakdown detail */}
            {selectedPackages.map((pkg) =>
              pkg.pricing_unit === "PER_PERSON" ? (
                <Text key={pkg.product_id} style={styles.totalSummaryDetail}>
                  {pkg.quantity} {pkg.quantity === 1 ? "person" : "persons"} ×{" "}
                  {formatCurrency(parseFloat(pkg.price), { currency: "PHP" })}
                  /person
                </Text>
              ) : null,
            )}
            <Text style={styles.totalSummaryPrice}>
              {formatCurrency(totalPrice, { currency: "PHP" })}
            </Text>
          </View>
        </View>
      )}
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
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    textAlign: "center",
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
  venueContext: {
    ...typeScale.labelMedium,
    color: colors.tertiary.teal,
    marginTop: spacing.sm,
    fontWeight: "600",
  },
  selectionInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  selectionText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  totalPrice: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: "700",
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.neutral.warmGray,
  },
  dividerText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginHorizontal: spacing.md,
  },
  packageList: {
    gap: spacing.md,
  },
  noPackages: {
    alignItems: "center",
    padding: spacing.xxl,
  },
  noPackagesTitle: {
    ...typeScale.titleMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  noPackagesText: {
    ...typeScale.bodySmall,
    color: colors.neutral.gray,
    textAlign: "center",
  },
  packageCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    ...shadows.sm,
  },
  packageCardSelected: {
    borderColor: colors.primary.black,
  },
  packageCardDisabled: {
    opacity: 0.5,
  },
  packageCardCustomBundle: {
    borderColor: colors.tertiary.teal + "40",
    backgroundColor: colors.tertiary.tealSubtle,
  },
  customBundleBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tertiary.teal,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    zIndex: 1,
  },
  customBundleBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: "600",
  },
  packageImage: {
    width: "100%",
    height: 140,
    backgroundColor: colors.neutral.sand,
  },
  packageContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  packageContentCustomBundle: {
    paddingTop: spacing.xl + spacing.sm,
  },
  packageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packageTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  packageName: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    flex: 1,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary.forest,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedIndicatorCustom: {
    backgroundColor: colors.tertiary.teal,
  },
  packageDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  hoursInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  hoursText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  packagePricing: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  packagePrice: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
    fontWeight: "700",
  },
  packagePriceCustom: {
    color: colors.tertiary.teal,
  },
  taxInclusiveBadge: {
    backgroundColor: colors.accent.wood,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  taxInclusiveBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: "600",
    fontSize: 10,
  },
  packagePriceUnit: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  perPersonHighlight: {
    marginTop: spacing.xs,
    backgroundColor: colors.accent.wood + "15",
    borderWidth: 1,
    borderColor: colors.accent.wood + "30",
    borderRadius: layout.borderRadius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  perPersonMinLabel: {
    ...typeScale.labelSmall,
    color: colors.accent.wood,
    fontWeight: "700",
  },
  perPersonFromPrice: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: "700",
    marginTop: 2,
  },
  excessHourInfo: {
    alignItems: "flex-end",
  },
  excessHourLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  excessHourPrice: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: "600",
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.sand,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityText: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    fontWeight: "700",
    minWidth: 40,
    textAlign: "center",
  },
  // Per-person headcount stepper styles
  headcountContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
    alignItems: "center",
    gap: spacing.xs,
  },
  headcountLabel: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: "600",
  },
  headcountStepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  headcountButtonDisabled: {
    opacity: 0.4,
  },
  headcountBreakdown: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    textAlign: "center",
  },
  // Attendee breakdown styles (child pricing)
  attendeeBreakdownContainer: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
    gap: spacing.sm,
  },
  attendeeTierRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  attendeeTierInfo: {
    flex: 1,
    gap: 2,
  },
  attendeeTierLabel: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: "600",
  },
  attendeeTierPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  attendeeTierPrice: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  attendeeDiscountBadge: {
    backgroundColor: colors.accent.wood,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  attendeeDiscountBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: "600",
    fontSize: 10,
  },
  attendeeTierControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  attendeeStepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.white,
    alignItems: "center",
    justifyContent: "center",
  },
  attendeeStepperButtonDisabled: {
    opacity: 0.3,
  },
  attendeeTierCount: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: "700",
    minWidth: 28,
    textAlign: "center",
  },
  attendeeTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  attendeeTotalLabel: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: "600",
  },
  attendeeTotalPrice: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: "700",
  },
  attendeeMinWarning: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    textAlign: "center",
  },
  validationError: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: spacing.md,
    textAlign: "center",
  },
  totalSummary: {
    marginTop: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.secondary.forest + "10",
    borderWidth: 1,
    borderColor: colors.secondary.forest + "30",
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
  },
  totalSummaryContent: {
    flex: 1,
  },
  totalSummaryTitle: {
    ...typeScale.titleSmall,
    color: colors.secondary.forest,
    fontWeight: "600",
  },
  totalSummaryDetail: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    marginTop: 2,
  },
  totalSummaryPrice: {
    ...typeScale.titleMedium,
    color: colors.secondary.forest,
    fontWeight: "700",
    textAlign: "right",
    marginTop: spacing.xs,
  },
  // Venue Hours Selector Styles
  venueHoursContainer: {
    marginTop: spacing.lg,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
  },
  venueHoursTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: "600",
    marginBottom: spacing.xs,
  },
  venueHoursSubtitle: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.md,
  },
  venueHoursItem: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  venueHoursItemAllDay: {
    backgroundColor: colors.secondary.forest + "10",
    borderWidth: 1,
    borderColor: colors.secondary.forest + "30",
    borderRadius: layout.borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  venueHoursInfo: {
    marginBottom: spacing.xs,
  },
  venueHoursVenueName: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: "600",
  },
  venueHoursIncluded: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  allDayLabel: {
    ...typeScale.labelSmall,
    color: colors.secondary.forest,
    fontWeight: "500",
  },
  allDayBadge: {
    backgroundColor: colors.secondary.forest,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.full,
  },
  allDayBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: "600",
  },
  venueHoursControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flexWrap: "wrap",
  },
  needMoreLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  hoursStepper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.sm,
    padding: spacing.xxs,
    gap: spacing.xs,
  },
  hoursStepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.neutral.white,
    alignItems: "center",
    justifyContent: "center",
  },
  hoursStepperButtonDisabled: {
    opacity: 0.3,
  },
  hoursStepperValue: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "center",
  },
  hoursAddedBadge: {
    backgroundColor: colors.tertiary.teal,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.full,
  },
  hoursAddedText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: "600",
  },
  excessRateText: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
});

export default PackageSelectionStep;
