/**
 * LifePlace Mobile App - Component Style Examples
 *
 * Ready-to-use StyleSheet definitions for common components.
 * Import theme values and use these as starting points.
 */

import { StyleSheet, Platform } from 'react-native';
import { colors, spacing, layout, shadows, typeScale, fontWeights } from './index';

// =============================================================================
// BUTTON STYLES
// =============================================================================

export const buttonStyles = StyleSheet.create({
  // Primary Button
  primaryButton: {
    backgroundColor: colors.primary.charcoal,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  primaryButtonPressed: {
    backgroundColor: colors.primary.charcoalDark,
  },
  primaryButtonDisabled: {
    backgroundColor: colors.neutral.warmGray,
  },
  primaryButtonText: {
    fontSize: typeScale.labelLarge.fontSize,
    lineHeight: typeScale.labelLarge.lineHeight,
    fontWeight: fontWeights.medium,
    color: colors.neutral.white,
  },

  // Secondary Button
  secondaryButton: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary.charcoal,
    paddingVertical: spacing.md - 1.5,
    paddingHorizontal: spacing.xl,
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.neutral.sand,
  },
  secondaryButtonText: {
    fontSize: typeScale.labelLarge.fontSize,
    lineHeight: typeScale.labelLarge.lineHeight,
    fontWeight: fontWeights.medium,
    color: colors.primary.charcoal,
  },

  // Accent Button
  accentButton: {
    backgroundColor: colors.accent.lavender,
    borderRadius: layout.borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    minHeight: layout.buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentButtonPressed: {
    backgroundColor: colors.accent.lavenderDark,
  },
  accentButtonText: {
    fontSize: typeScale.labelLarge.fontSize,
    lineHeight: typeScale.labelLarge.lineHeight,
    fontWeight: fontWeights.medium,
    color: colors.neutral.white,
  },

  // Small Button
  smallButton: {
    borderRadius: layout.borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: layout.buttonHeightSmall,
  },
  smallButtonText: {
    fontSize: typeScale.labelMedium.fontSize,
    lineHeight: typeScale.labelMedium.lineHeight,
  },

  // Icon Button (circular)
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.alpha.white90,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  iconButtonDark: {
    backgroundColor: colors.primary.charcoal,
  },
  iconButtonTransparent: {
    backgroundColor: colors.alpha.black10,
  },
});

// =============================================================================
// CARD STYLES
// =============================================================================

export const cardStyles = StyleSheet.create({
  // Base Card
  card: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    ...shadows.sm,
  },

  // ==========================================================================
  // VENUE CARDS - For displaying Venue entities
  // Backend: Venue.name, Venue.featured_image, Venue.gallery_images,
  //          Venue.minimum_capacity, Venue.maximum_capacity, Venue.is_overnight
  // ==========================================================================

  // Featured Venue Card (large, with overlay)
  venueCardFeatured: {
    borderRadius: layout.cardBorderRadiusLarge,
    overflow: 'hidden',
    backgroundColor: colors.neutral.white,
    ...shadows.md,
  },
  venueCardImage: {
    width: '100%',
    aspectRatio: layout.aspectRatio.card,
  },
  venueCardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  venueCardContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
  },
  venueCardTitle: {
    fontSize: typeScale.titleLarge.fontSize,
    lineHeight: typeScale.titleLarge.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.neutral.white,
    marginBottom: spacing.xxs,
  },
  venueCardCapacity: {
    fontSize: typeScale.bodySmall.fontSize,
    lineHeight: typeScale.bodySmall.lineHeight,
    color: colors.alpha.white80,
  },
  venueCardOvernightBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: colors.accent.lavender,
    borderRadius: layout.borderRadius.sm,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  venueCardOvernightText: {
    fontSize: typeScale.labelSmall.fontSize,
    fontWeight: fontWeights.semibold,
    color: colors.neutral.white,
  },
  venueCardFavorite: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
  },

  // Compact Venue Card (horizontal, for lists)
  venueCardCompact: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    overflow: 'hidden',
    ...shadows.sm,
  },
  venueCardCompactImage: {
    width: 120,
    height: 120,
    borderRadius: layout.cardBorderRadius,
    margin: spacing.sm,
  },
  venueCardCompactContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  venueCardCompactTitle: {
    fontSize: typeScale.titleMedium.fontSize,
    lineHeight: typeScale.titleMedium.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
    marginBottom: spacing.xxs,
  },
  venueCardCompactMeta: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.gray,
    marginBottom: spacing.xs,
  },

  // ==========================================================================
  // PACKAGE CARDS - For displaying ProductOption entities (type=PACKAGE)
  // Backend: ProductOption.name, description, base_price, pricing_model,
  //          minimum_guests, maximum_guests, minimum_hours, event_days
  // ==========================================================================

  packageCard: {
    borderRadius: layout.cardBorderRadiusLarge,
    overflow: 'hidden',
    backgroundColor: colors.neutral.white,
    ...shadows.md,
  },
  packageCardImage: {
    width: '100%',
    aspectRatio: layout.aspectRatio.card,
  },
  packageCardContent: {
    padding: spacing.lg,
  },
  packageCardTitle: {
    fontSize: typeScale.titleLarge.fontSize,
    lineHeight: typeScale.titleLarge.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
    marginBottom: spacing.xxs,
  },
  packageCardDescription: {
    fontSize: typeScale.bodySmall.fontSize,
    lineHeight: typeScale.bodySmall.lineHeight,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
  },
  packageCardMetaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  packageCardMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  packageCardMetaText: {
    fontSize: typeScale.labelSmall.fontSize,
    color: colors.neutral.darkGray,
  },
  packageCardPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },

  // ==========================================================================
  // EVENT CARDS - For displaying Event (booking) entities
  // Backend: Event.name, status, payment_status, start_date, end_date,
  //          venue, num_participants, total_amount_due, total_amount_paid
  // ==========================================================================

  eventCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    overflow: 'hidden',
    ...shadows.sm,
  },
  eventCardImage: {
    width: '100%',
    height: 140,
  },
  eventCardContent: {
    padding: spacing.md,
  },
  eventCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  eventCardTitle: {
    fontSize: typeScale.titleMedium.fontSize,
    lineHeight: typeScale.titleMedium.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
    flex: 1,
  },
  eventCardVenue: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.darkGray,
    marginBottom: spacing.xs,
  },
  eventCardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xxs,
  },
  eventCardDateText: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.darkGray,
  },
  eventCardPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
    marginTop: spacing.sm,
  },
  eventCardPaymentText: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.darkGray,
  },
  eventCardPaymentAmount: {
    fontSize: typeScale.titleSmall.fontSize,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
  },

  // Info Card (generic)
  infoCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.lg,
    ...shadows.sm,
  },
  infoCardIconBox: {
    width: 48,
    height: 48,
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.accent.lavenderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});

// =============================================================================
// CHIP & TAG STYLES
// =============================================================================

export const chipStyles = StyleSheet.create({
  // ==========================================================================
  // Category/Filter Chips - For ProductCategory.name, EventType.name
  // ==========================================================================
  categoryChip: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: layout.borderRadius.full,
    backgroundColor: colors.neutral.white,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
  },
  categoryChipActive: {
    backgroundColor: colors.primary.charcoal,
    borderColor: colors.primary.charcoal,
  },
  categoryChipText: {
    fontSize: typeScale.labelMedium.fontSize,
    lineHeight: typeScale.labelMedium.lineHeight,
    fontWeight: fontWeights.medium,
    color: colors.primary.charcoal,
  },
  categoryChipTextActive: {
    color: colors.neutral.white,
  },

  // ==========================================================================
  // Venue Feature Chip - For venue characteristics (is_overnight, capacity, etc.)
  // ==========================================================================
  venueFeatureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.sm,
    backgroundColor: colors.neutral.sand,
    gap: spacing.xs,
  },
  venueFeatureChipText: {
    fontSize: typeScale.labelSmall.fontSize,
    lineHeight: typeScale.labelSmall.lineHeight,
    fontWeight: fontWeights.medium,
    color: colors.primary.charcoal,
  },

  // ==========================================================================
  // Status Badges - For Event.status, Event.payment_status
  // Backend values: LEAD, CONFIRMED, COMPLETED, CANCELLED
  // Backend values: UNPAID, PARTIALLY_PAID, PAID
  // ==========================================================================
  statusBadgeBase: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: typeScale.labelSmall.fontSize,
    lineHeight: typeScale.labelSmall.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.neutral.white,
  },

  // Event Status Colors
  statusLead: {
    backgroundColor: colors.semantic.info,
  },
  statusConfirmed: {
    backgroundColor: colors.secondary.sage,
  },
  statusCompleted: {
    backgroundColor: colors.neutral.darkGray,
  },
  statusCancelled: {
    backgroundColor: colors.semantic.error,
  },

  // Payment Status Colors
  paymentUnpaid: {
    backgroundColor: colors.semantic.error,
  },
  paymentPartiallyPaid: {
    backgroundColor: colors.semantic.warning,
  },
  paymentPaid: {
    backgroundColor: colors.secondary.sage,
  },

  // ==========================================================================
  // Generic Badges
  // ==========================================================================
  badge: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: 6,
    backgroundColor: colors.accent.lavender,
  },
  badgeText: {
    fontSize: typeScale.labelSmall.fontSize,
    lineHeight: typeScale.labelSmall.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.neutral.white,
  },
  badgeSuccess: {
    backgroundColor: colors.secondary.sage,
  },
  badgeWarning: {
    backgroundColor: colors.semantic.warning,
  },
  badgeError: {
    backgroundColor: colors.semantic.error,
  },
  badgeInfo: {
    backgroundColor: colors.semantic.info,
  },
});

// =============================================================================
// INPUT STYLES
// =============================================================================

export const inputStyles = StyleSheet.create({
  // Text Input
  inputContainer: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: layout.inputHeight,
  },
  inputContainerFocused: {
    borderColor: colors.primary.charcoal,
    backgroundColor: colors.neutral.white,
  },
  inputContainerError: {
    borderColor: colors.semantic.error,
  },
  inputLabel: {
    fontSize: typeScale.labelSmall.fontSize,
    lineHeight: typeScale.labelSmall.lineHeight,
    fontWeight: fontWeights.medium,
    color: colors.neutral.gray,
    marginBottom: spacing.xs,
  },
  inputText: {
    fontSize: typeScale.bodyLarge.fontSize,
    lineHeight: typeScale.bodyLarge.lineHeight,
    color: colors.primary.charcoal,
    padding: 0,
  },
  inputPlaceholder: {
    color: colors.neutral.gray,
  },
  inputError: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.semantic.error,
    marginTop: spacing.xs,
  },

  // Search Bar
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typeScale.bodyMedium.fontSize,
    lineHeight: typeScale.bodyMedium.lineHeight,
    color: colors.primary.charcoal,
    padding: 0,
  },
  searchActionButton: {
    width: 40,
    height: 40,
    borderRadius: layout.borderRadius.md,
    backgroundColor: colors.primary.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// =============================================================================
// NAVIGATION STYLES
// =============================================================================

export const navigationStyles = StyleSheet.create({
  // Bottom Navigation Bar
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: layout.borderRadius.xl,
    borderTopRightRadius: layout.borderRadius.xl,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.xl,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-around',
    ...shadows.bottomNav,
  },
  bottomNavItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    minWidth: 60,
  },
  bottomNavActiveIndicator: {
    width: 48,
    height: 48,
    borderRadius: layout.borderRadius.lg,
    backgroundColor: colors.primary.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavLabel: {
    fontSize: typeScale.labelSmall.fontSize,
    lineHeight: typeScale.labelSmall.lineHeight,
    fontWeight: fontWeights.medium,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },
  bottomNavLabelActive: {
    color: colors.primary.charcoal,
    fontWeight: fontWeights.semibold,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
    minHeight: layout.headerHeight,
  },
  headerTransparent: {
    backgroundColor: 'transparent',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: typeScale.titleMedium.fontSize,
    lineHeight: typeScale.titleMedium.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
  },
  headerBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.alpha.white90,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});

// =============================================================================
// MODAL & SHEET STYLES
// =============================================================================

export const modalStyles = StyleSheet.create({
  // Bottom Sheet
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: colors.alpha.black40,
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: layout.borderRadius.xl,
    borderTopRightRadius: layout.borderRadius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxxl,
    maxHeight: '90%',
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral.warmGray,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  bottomSheetTitle: {
    fontSize: typeScale.headlineSmall.fontSize,
    lineHeight: typeScale.headlineSmall.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
  },
});

// =============================================================================
// RATING & REVIEW STYLES
// =============================================================================

export const ratingStyles = StyleSheet.create({
  // Star Rating
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  starRatingText: {
    fontSize: typeScale.labelMedium.fontSize,
    lineHeight: typeScale.labelMedium.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
    marginLeft: spacing.xs,
  },
  reviewCountText: {
    fontSize: typeScale.labelSmall.fontSize,
    lineHeight: typeScale.labelSmall.lineHeight,
    color: colors.neutral.gray,
    marginLeft: spacing.xxs,
  },

  // Review Card
  reviewCard: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.lg,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  reviewAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  reviewAuthor: {
    fontSize: typeScale.titleSmall.fontSize,
    lineHeight: typeScale.titleSmall.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
  },
  reviewDate: {
    fontSize: typeScale.labelSmall.fontSize,
    color: colors.neutral.gray,
  },
  reviewQuote: {
    fontSize: typeScale.bodyMedium.fontSize,
    lineHeight: typeScale.bodyMedium.lineHeight,
    color: colors.primary.charcoal,
    fontStyle: 'italic',
  },
});

// =============================================================================
// VENUE INFO BOX STYLES - For displaying venue/event details
// =============================================================================

export const venueInfoStyles = StyleSheet.create({
  // ==========================================================================
  // Info Boxes - For Venue detail screens
  // Display: capacity, is_overnight, program_hours, check_in_time
  // From: Venue model and VenueOperatingRules
  // ==========================================================================
  infoBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
    minWidth: 80,
  },
  infoBoxValue: {
    fontSize: typeScale.titleSmall.fontSize,
    lineHeight: typeScale.titleSmall.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
    marginTop: spacing.xs,
  },
  infoBoxLabel: {
    fontSize: typeScale.labelSmall.fontSize,
    color: colors.neutral.gray,
    marginTop: spacing.xxs,
  },

  // Info Row (horizontal list of info boxes)
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },

  // Inline info item (icon + text)
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoItemText: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.darkGray,
  },

  // ==========================================================================
  // Capacity Display - For Venue.minimum_capacity, maximum_capacity
  // ==========================================================================
  capacityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  capacityText: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.darkGray,
  },
  capacityRange: {
    fontSize: typeScale.labelMedium.fontSize,
    fontWeight: fontWeights.medium,
    color: colors.primary.charcoal,
  },
});

// =============================================================================
// PRICE STYLES
// For: ProductOption.base_price, ProductOption.pricing_model,
//      Event.total_amount_due, Event.total_amount_paid
// Currency: PHP (₱)
// =============================================================================

export const priceStyles = StyleSheet.create({
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  // Main price display (e.g., "₱5,000")
  priceMain: {
    fontSize: typeScale.priceMain.fontSize,
    lineHeight: typeScale.priceMain.lineHeight,
    fontWeight: fontWeights.bold,
    color: colors.primary.charcoal,
  },
  // Unit suffix (e.g., "/hour" for HOURLY pricing_model, "/pax" for per-person)
  priceUnit: {
    fontSize: typeScale.priceUnit.fontSize,
    lineHeight: typeScale.priceUnit.lineHeight,
    color: colors.neutral.darkGray,
    marginLeft: spacing.xxs,
  },
  // Original price when discounted
  priceStrikethrough: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.gray,
    textDecorationLine: 'line-through',
    marginRight: spacing.xs,
  },
  // For displaying payment progress (paid / total)
  paymentProgress: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  paidAmount: {
    fontSize: typeScale.titleSmall.fontSize,
    fontWeight: fontWeights.semibold,
    color: colors.secondary.sage,
  },
  totalAmount: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.gray,
  },
  separator: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.gray,
    marginHorizontal: spacing.xxs,
  },
});

// =============================================================================
// SCREEN LAYOUT STYLES
// =============================================================================

export const screenStyles = StyleSheet.create({
  // Safe container
  safeContainer: {
    flex: 1,
    backgroundColor: colors.neutral.white,
  },
  creamContainer: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },

  // Content padding
  screenPadding: {
    paddingHorizontal: layout.screenPaddingHorizontal,
  },

  // Sticky footer
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.neutral.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'ios' ? spacing.xxxl : spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },

  // Section
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: layout.screenPaddingHorizontal,
  },
  sectionTitle: {
    fontSize: typeScale.headlineSmall.fontSize,
    lineHeight: typeScale.headlineSmall.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
  },
  sectionLink: {
    fontSize: typeScale.labelMedium.fontSize,
    fontWeight: fontWeights.medium,
    color: colors.accent.lavender,
  },
});

// =============================================================================
// PROGRESS STYLES
// For: BookingSession.progress_percentage, BookingFlowStep.order
// =============================================================================

export const progressStyles = StyleSheet.create({
  // Progress bar (for booking flow)
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.neutral.warmGray,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary.charcoal,
    borderRadius: 2,
  },

  // Step indicator (dot-based)
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutral.warmGray,
  },
  stepDotActive: {
    width: 24,
    backgroundColor: colors.primary.charcoal,
  },

  // Step counter text (e.g., "Step 2 of 8")
  stepCounterText: {
    fontSize: typeScale.labelMedium.fontSize,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
});

// =============================================================================
// BOOKING FLOW STYLES
// For: BookingFlow, BookingFlowStep, BookingSession
// Step types: introduction, venue_selection, date_time, questionnaire,
//             package_selection, addon_selection, pricing_summary,
//             contact_info, payment_info, confirmation
// =============================================================================

export const bookingFlowStyles = StyleSheet.create({
  // Step Header
  stepHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.neutral.white,
  },
  stepTitle: {
    fontSize: typeScale.headlineMedium.fontSize,
    lineHeight: typeScale.headlineMedium.lineHeight,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: typeScale.bodyMedium.fontSize,
    lineHeight: typeScale.bodyMedium.lineHeight,
    color: colors.neutral.darkGray,
  },

  // ==========================================================================
  // Selection Cards (for venue_selection, package_selection, addon_selection)
  // ==========================================================================
  selectionCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  selectionCardSelected: {
    borderColor: colors.primary.charcoal,
    borderWidth: 2,
  },
  selectionCardImage: {
    width: 100,
    height: 100,
  },
  selectionCardContent: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  selectionCardTitle: {
    fontSize: typeScale.titleMedium.fontSize,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
    marginBottom: spacing.xxs,
  },
  selectionCardMeta: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.darkGray,
  },
  selectionCardPrice: {
    fontSize: typeScale.titleSmall.fontSize,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
    marginTop: spacing.xs,
  },
  selectionCardCheckbox: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionCardCheckboxSelected: {
    backgroundColor: colors.primary.charcoal,
    borderColor: colors.primary.charcoal,
  },

  // ==========================================================================
  // Pricing Summary (for pricing_summary step)
  // From: EventProductOption, EventQuote
  // ==========================================================================
  summarySection: {
    marginBottom: spacing.lg,
  },
  summarySectionTitle: {
    fontSize: typeScale.titleSmall.fontSize,
    fontWeight: fontWeights.semibold,
    color: colors.neutral.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  summaryLabel: {
    fontSize: typeScale.bodyMedium.fontSize,
    color: colors.primary.charcoal,
    flex: 1,
  },
  summaryValue: {
    fontSize: typeScale.bodyMedium.fontSize,
    fontWeight: fontWeights.medium,
    color: colors.primary.charcoal,
  },
  summarySubtext: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.gray,
    marginLeft: spacing.md,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.neutral.warmGray,
    marginVertical: spacing.sm,
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.primary.charcoal,
    marginTop: spacing.sm,
  },
  summaryTotalLabel: {
    fontSize: typeScale.titleMedium.fontSize,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
  },
  summaryTotalValue: {
    fontSize: typeScale.headlineSmall.fontSize,
    fontWeight: fontWeights.bold,
    color: colors.primary.charcoal,
  },

  // ==========================================================================
  // Payment Plan Display (for payment_info step)
  // From: PaymentPlan, PaymentInstallment
  // ==========================================================================
  paymentPlanCard: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  installmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  installmentRowLast: {
    borderBottomWidth: 0,
  },
  installmentLabel: {
    fontSize: typeScale.bodyMedium.fontSize,
    color: colors.primary.charcoal,
  },
  installmentDate: {
    fontSize: typeScale.bodySmall.fontSize,
    color: colors.neutral.gray,
  },
  installmentAmount: {
    fontSize: typeScale.titleSmall.fontSize,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
  },
  installmentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },

  // ==========================================================================
  // Confirmation Screen
  // ==========================================================================
  confirmationContainer: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  confirmationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.secondary.sageSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  confirmationTitle: {
    fontSize: typeScale.headlineMedium.fontSize,
    fontWeight: fontWeights.semibold,
    color: colors.primary.charcoal,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  confirmationMessage: {
    fontSize: typeScale.bodyMedium.fontSize,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    lineHeight: typeScale.bodyMedium.lineHeight * 1.2,
  },
});
