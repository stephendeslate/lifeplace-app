/**
 * ConfirmationStep
 *
 * Booking confirmation with completion processing and details summary.
 * Features:
 * - Completion processing states (pending/processing/completed/failed)
 * - Quote vs payment completion type differentiation
 * - Booking summary with pricing breakdown
 * - Payment summary with refund policy
 * - Next steps and contact information
 * - Add to calendar and share actions
 *
 * Adapted from: frontend/client-portal/src/components/booking/steps/ConfirmationStep.tsx
 */

import React, { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import {
  CheckCircle,
  Calendar,
  MapPin,
  Receipt,
  Envelope,
  Phone,
  Copy,
  ShareNetwork,
  CalendarPlus,
  Info,
  CaretRight,
  Warning,
  Clock,
  Shield,
  House,
  Quotes,
  SpinnerGap,
  XCircle,
  User,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { formatCurrency } from '@/utils/currency';
import { format, parseISO } from 'date-fns';
import { useConfirmationManager } from '@/hooks/booking/useConfirmation';
import { useSimplePricing } from '@/hooks/booking/useSimplePricing';
import { usePaymentPlanSettings, useRefundPolicy } from '@/hooks/usePaymentPlanSettings';
import type { StepComponentProps } from '../StepRenderer';
import type {
  ConfirmationStepData,
  ConfirmationStepConfiguration,
  DateTimeStepData,
  VenueSelectionStepData,
  ContactInfoStepData,
  PaymentStepData,
  PackageSelectionStepData,
  AddonSelectionStepData,
  PricingSummaryStepData,
} from '@/types/booking';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

type ConfirmationStepProps = StepComponentProps<ConfirmationStepData, ConfirmationStepConfiguration>;

type CompletionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export function ConfirmationStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: ConfirmationStepProps) {
  const { state } = useBookingContext();
  const completionProcessedRef = useRef(false);

  const {
    show_add_to_calendar = true,
    show_share_buttons = true,
    show_next_steps = true,
    show_booking_summary = true,
    custom_success_message,
    redirect_url,
  } = configuration || {};

  // Get session ID
  const sessionId = state.currentSession?.session_id;

  // Use confirmation manager hook
  const {
    completeBooking,
    completing,
    error: completionError,
    completionStatus,
    completionResult,
    bookingReference,
    confirmationContent,
    isCompleted,
    isQuoteCompletion,
    resetCompletion,
  } = useConfirmationManager(sessionId, configuration);

  // Get payment plan settings for refund policy
  const { data: paymentSettings } = usePaymentPlanSettings();
  const { allowRefunds, refundPercentage, refundDeadlineHours, refundPolicyText } = useRefundPolicy();

  // Get step data from booking state
  // NOTE: Step data keys must match StepDataMap types (e.g., payment_info, not payment)
  const dateTimeData = state.stepData.date_time as DateTimeStepData | undefined;
  const venueData = state.stepData.venue_selection as VenueSelectionStepData | undefined;
  const contactInfo = state.stepData.contact_info as ContactInfoStepData | undefined;
  const paymentData = state.stepData.payment_info as PaymentStepData | undefined;
  const packageData = state.stepData.package_selection as PackageSelectionStepData | undefined;
  const addonData = state.stepData.addon_selection as AddonSelectionStepData | undefined;
  const pricingData = state.stepData.pricing_summary as PricingSummaryStepData | undefined;

  // Get completion type from payment step data
  const completionType = paymentData?.completion_type || 'quote';
  const isQuoteRequest = completionType === 'quote';

  // Calculate pricing using simplified pricing hook
  const selectedPackages = packageData?.selected_packages || [];
  const selectedAddons = addonData?.selected_addons || [];
  const discountCode = pricingData?.applied_discount_code;

  const { pricing, loading: pricingLoading } = useSimplePricing(
    selectedPackages,
    selectedAddons,
    discountCode
  );

  // Local state for tracking completion status in UI
  const [localStatus, setLocalStatus] = useState<CompletionStatus>(
    data.completion_status || 'pending'
  );

  // Derive values from data or context
  const eventDate = dateTimeData?.start_date;
  const endDate = dateTimeData?.end_date;
  const venueIds = venueData?.selected_venue_ids;
  const total = pricing.total || 0;

  // Payment summary values
  const paymentType = paymentData?.payment_type || 'DEPOSIT';
  const depositPercentage = paymentData?.deposit_percentage || paymentSettings?.default_deposit_percentage || 50;
  const depositAmount = paymentData?.deposit_amount || (total * depositPercentage / 100);
  const amountPaid = paymentType === 'DEPOSIT' ? depositAmount : total;
  const balanceDue = paymentType === 'DEPOSIT' ? total - depositAmount : 0;
  const balanceDueDays = paymentData?.balance_due_days || paymentSettings?.balance_due_days || 7;

  // Generate booking reference
  const displayReference = useMemo(() => {
    if (bookingReference) return bookingReference;
    if (data.booking_reference) return data.booking_reference;
    if (sessionId) return sessionId.slice(0, 8).toUpperCase();
    return 'PENDING';
  }, [bookingReference, data.booking_reference, sessionId]);

  // Sync local status with hook status
  useEffect(() => {
    if (completionStatus && completionStatus !== localStatus) {
      setLocalStatus(completionStatus);
      onDataChange({
        ...data,
        completion_status: completionStatus,
      });
    }
  }, [completionStatus]);

  // Update step data when completion is done
  useEffect(() => {
    if (
      completionResult &&
      localStatus === 'completed' &&
      !completionProcessedRef.current
    ) {
      completionProcessedRef.current = true;
      onDataChange({
        ...data,
        completion_status: 'completed',
        booking_reference: completionResult.booking_reference || displayReference,
        completed_at: new Date().toISOString(),
        confirmation_email_sent: true,
      });
    }
  }, [completionResult, localStatus, displayReference]);

  // Handle complete booking
  const handleCompleteBooking = useCallback(async () => {
    if (isCompleted || completing) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLocalStatus('processing');
    onDataChange({
      ...data,
      completion_status: 'processing',
    });

    const success = await completeBooking(completionType);

    if (success) {
      setLocalStatus('completed');
    } else {
      setLocalStatus('failed');
      onDataChange({
        ...data,
        completion_status: 'failed',
        error_message: completionError || 'Failed to complete booking',
      });
    }
  }, [isCompleted, completing, completeBooking, completionType, data, onDataChange, completionError]);

  // Handle retry after failure
  const handleRetry = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    completionProcessedRef.current = false;
    resetCompletion();
    setLocalStatus('pending');
    onDataChange({
      ...data,
      completion_status: 'pending',
      error_message: undefined,
    });
  }, [resetCompletion, data, onDataChange]);

  const handleCopyReference = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(displayReference);
    // Would show toast in production
  };

  const handleShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const shareMessage = isQuoteRequest
        ? `I just requested a quote from LifePlace! 🎉\n\nRequest Reference: ${displayReference}\n\nCheck out LifePlace for your next event!`
        : `I just booked an event at LifePlace! 🎉\n\nBooking Reference: ${displayReference}\nDate: ${eventDate ? format(parseISO(eventDate), 'MMMM d, yyyy') : 'TBD'}\n\nCheck out LifePlace for your next event!`;

      await Share.share({
        message: shareMessage,
        title: isQuoteRequest ? 'LifePlace Quote Request' : 'LifePlace Booking Confirmation',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleAddToCalendar = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Would integrate with expo-calendar in production
  };

  // Render processing state
  if (localStatus === 'processing' || completing) {
    return (
      <View style={styles.processingContainer}>
        <ActivityIndicator size="large" color={colors.secondary.forest} />
        <Text style={styles.processingTitle}>
          Processing Your {isQuoteRequest ? 'Quote Request' : 'Booking'}...
        </Text>
        <Text style={styles.processingSubtitle}>
          Please wait while we confirm your details.
        </Text>
      </View>
    );
  }

  // Render failed state
  if (localStatus === 'failed') {
    return (
      <View style={styles.failedContainer}>
        <View style={styles.failedIconContainer}>
          <XCircle size={64} color={colors.semantic.error} weight="fill" />
        </View>
        <Text style={styles.failedTitle}>Something Went Wrong</Text>
        <Text style={styles.failedMessage}>
          There was an issue completing your {isQuoteRequest ? 'quote request' : 'booking'}.
          Please try again or contact support.
        </Text>
        {(completionError || data.error_message) && (
          <View style={styles.errorBox}>
            <Warning size={18} color={colors.semantic.error} />
            <Text style={styles.errorBoxText}>
              {completionError || data.error_message}
            </Text>
          </View>
        )}
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Render pending state (ready to complete)
  if (localStatus === 'pending') {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Ready to Complete Header */}
        <View style={styles.pendingHeader}>
          <View style={styles.pendingIconContainer}>
            <Info size={64} color={colors.tertiary.teal} weight="fill" />
          </View>
          <Text style={styles.pendingTitle}>
            Ready to Complete Your {isQuoteRequest ? 'Quote Request' : 'Booking'}
          </Text>
          <Text style={styles.pendingMessage}>
            Please review your details below and tap confirm to complete.
          </Text>
        </View>

        {/* Booking Summary */}
        {show_booking_summary && (
          <View style={styles.summaryCard}>
            <Text style={styles.sectionTitle}>Booking Summary</Text>

            {eventDate && (
              <View style={styles.summaryRow}>
                <Calendar size={18} color={colors.accent.wood} />
                <View style={styles.summaryRowContent}>
                  <Text style={styles.summaryLabel}>Date</Text>
                  <Text style={styles.summaryValue}>
                    {format(parseISO(eventDate), 'EEEE, MMMM d, yyyy')}
                    {endDate && endDate !== eventDate && ` - ${format(parseISO(endDate), 'MMMM d, yyyy')}`}
                  </Text>
                </View>
              </View>
            )}

            {selectedPackages.length > 0 && (
              <View style={styles.summaryRow}>
                <Receipt size={18} color={colors.secondary.forest} />
                <View style={styles.summaryRowContent}>
                  <Text style={styles.summaryLabel}>
                    {selectedPackages.length === 1 ? 'Package' : 'Packages'}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {selectedPackages.map(p => p.name).join(', ')}
                  </Text>
                </View>
              </View>
            )}

            {selectedAddons.length > 0 && (
              <View style={styles.summaryRow}>
                <Info size={18} color={colors.tertiary.teal} />
                <View style={styles.summaryRowContent}>
                  <Text style={styles.summaryLabel}>Add-ons</Text>
                  <Text style={styles.summaryValue}>
                    {selectedAddons.length} add-on{selectedAddons.length > 1 ? 's' : ''} selected
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Quote Message (if quote request) */}
        {isQuoteRequest && paymentData?.quote_message && (
          <View style={styles.quoteMessageCard}>
            <View style={styles.quoteMessageHeader}>
              <Quotes size={20} color={colors.secondary.forest} />
              <Text style={styles.quoteMessageTitle}>Your Message</Text>
            </View>
            <Text style={styles.quoteMessageText}>{paymentData.quote_message}</Text>
          </View>
        )}

        {/* Payment Summary (only for payment, not quote) */}
        {!isQuoteRequest && (
          <View style={styles.paymentCard}>
            <Text style={styles.sectionTitle}>Payment Summary</Text>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Total Amount</Text>
              <Text style={styles.paymentTotal}>
                {formatCurrency(total, { currency: 'PHP' })}
              </Text>
            </View>

            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>
                {paymentType === 'DEPOSIT' ? 'Deposit Paid' : 'Amount Paid'}
              </Text>
              <Text style={styles.paymentPaid}>
                {formatCurrency(amountPaid, { currency: 'PHP' })}
              </Text>
            </View>

            {balanceDue > 0 && (
              <>
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentLabel}>Balance Due</Text>
                  <Text style={styles.paymentDue}>
                    {formatCurrency(balanceDue, { currency: 'PHP' })}
                  </Text>
                </View>
                <View style={styles.balanceNote}>
                  <Clock size={16} color={colors.semantic.warning} />
                  <Text style={styles.balanceNoteText}>
                    Balance due {balanceDueDays} days before your event
                  </Text>
                </View>
              </>
            )}

            {/* Refund Policy */}
            {allowRefunds && (
              <View style={styles.refundPolicy}>
                <Shield size={16} color={colors.tertiary.teal} />
                <Text style={styles.refundPolicyText}>
                  {refundPolicyText ||
                    `${refundPercentage}% refund available if cancelled within ${refundDeadlineHours} hours`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Contact Info */}
        {contactInfo && (
          <View style={styles.contactCard}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.contactRow}>
              <User size={18} color={colors.neutral.darkGray} />
              <Text style={styles.contactText}>
                {contactInfo.full_name || `${contactInfo.first_name} ${contactInfo.last_name}`}
              </Text>
            </View>
            <View style={styles.contactRow}>
              <Envelope size={18} color={colors.neutral.darkGray} />
              <Text style={styles.contactText}>{contactInfo.email}</Text>
            </View>
            {contactInfo.phone && (
              <View style={styles.contactRow}>
                <Phone size={18} color={colors.neutral.darkGray} />
                <Text style={styles.contactText}>{contactInfo.phone}</Text>
              </View>
            )}
          </View>
        )}

        {/* Special Requests */}
        {pricingData?.special_requests && (
          <View style={styles.specialRequestsCard}>
            <Text style={styles.sectionTitle}>Special Requests</Text>
            <Text style={styles.specialRequestsText}>{pricingData.special_requests}</Text>
          </View>
        )}

        {/* Complete Button */}
        <TouchableOpacity
          style={styles.completeButton}
          onPress={handleCompleteBooking}
          disabled={completing}
        >
          <CheckCircle size={20} color={colors.neutral.white} weight="fill" />
          <Text style={styles.completeButtonText}>
            Confirm {isQuoteRequest ? 'Quote Request' : 'Booking'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Render completed state
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Success Header */}
      <View style={styles.successHeader}>
        <View style={styles.successIconContainer}>
          <CheckCircle size={64} color={colors.secondary.forest} weight="fill" />
        </View>
        <Text style={styles.successTitle}>
          {confirmationContent?.title || (isQuoteRequest ? 'Quote Request Submitted!' : 'Booking Confirmed!')}
        </Text>
        <Text style={styles.successMessage}>
          {confirmationContent?.message || custom_success_message || (
            isQuoteRequest
              ? "Thank you for your request. We'll send you a custom quote within 24 hours!"
              : "Thank you for your booking. We've sent a confirmation email with all the details."
          )}
        </Text>
      </View>

      {/* Booking Reference */}
      <View style={styles.referenceCard}>
        <Text style={styles.referenceLabel}>
          {isQuoteRequest ? 'Request Reference' : 'Booking Reference'}
        </Text>
        <View style={styles.referenceRow}>
          <Text style={styles.referenceNumber}>{displayReference}</Text>
          <TouchableOpacity style={styles.copyButton} onPress={handleCopyReference}>
            <Copy size={18} color={colors.primary.black} />
          </TouchableOpacity>
        </View>
        <Text style={styles.referenceHint}>Save this reference for your records</Text>
      </View>

      {/* Booking Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Event Details</Text>

        {eventDate && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color={colors.accent.wood} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {format(parseISO(eventDate), 'EEEE, MMMM d, yyyy')}
                {endDate && endDate !== eventDate && ` - ${format(parseISO(endDate), 'MMMM d, yyyy')}`}
              </Text>
            </View>
          </View>
        )}

        {venueIds && venueIds.length > 0 && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MapPin size={20} color={colors.tertiary.teal} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Venue</Text>
              <Text style={styles.detailValue}>
                {venueIds.length === 1 ? '1 venue selected' : `${venueIds.length} venues selected`}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Receipt size={20} color={colors.secondary.forest} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>
              {isQuoteRequest ? 'Estimated Total' : 'Total Amount'}
            </Text>
            <Text style={styles.detailValue}>
              {formatCurrency(total, { currency: 'PHP' })}
            </Text>
          </View>
        </View>
      </View>

      {/* Payment Summary (only for payment, not quote) */}
      {!isQuoteRequest && (
        <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Amount Paid</Text>
            <Text style={styles.paymentPaid}>
              {formatCurrency(amountPaid, { currency: 'PHP' })}
            </Text>
          </View>

          {balanceDue > 0 && (
            <>
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Balance Due</Text>
                <Text style={styles.paymentDue}>
                  {formatCurrency(balanceDue, { currency: 'PHP' })}
                </Text>
              </View>

              <View style={styles.balanceNote}>
                <Info size={16} color={colors.semantic.warning} />
                <Text style={styles.balanceNoteText}>
                  Please pay the remaining balance {balanceDueDays} days before your event
                </Text>
              </View>
            </>
          )}
        </View>
      )}

      {/* Contact Info */}
      {contactInfo && (
        <View style={styles.contactCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.contactRow}>
            <Envelope size={18} color={colors.neutral.darkGray} />
            <Text style={styles.contactText}>{contactInfo.email}</Text>
          </View>

          {contactInfo.phone && (
            <View style={styles.contactRow}>
              <Phone size={18} color={colors.neutral.darkGray} />
              <Text style={styles.contactText}>{contactInfo.phone}</Text>
            </View>
          )}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        {show_add_to_calendar && !isQuoteRequest && (
          <TouchableOpacity style={styles.actionButton} onPress={handleAddToCalendar}>
            <CalendarPlus size={20} color={colors.primary.black} />
            <Text style={styles.actionButtonText}>Add to Calendar</Text>
            <CaretRight size={18} color={colors.neutral.gray} />
          </TouchableOpacity>
        )}

        {show_share_buttons && (
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <ShareNetwork size={20} color={colors.primary.black} />
            <Text style={styles.actionButtonText}>
              Share {isQuoteRequest ? 'Request' : 'Booking'}
            </Text>
            <CaretRight size={18} color={colors.neutral.gray} />
          </TouchableOpacity>
        )}
      </View>

      {/* Next Steps */}
      {show_next_steps && (
        <View style={styles.nextStepsCard}>
          <Text style={styles.sectionTitle}>What's Next?</Text>

          <View style={styles.stepsList}>
            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Check Your Email</Text>
                <Text style={styles.stepDesc}>
                  We've sent a detailed {isQuoteRequest ? 'confirmation' : 'confirmation'} to your email
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>
                  {isQuoteRequest ? 'Receive Your Quote' : 'Our Team Will Contact You'}
                </Text>
                <Text style={styles.stepDesc}>
                  {isQuoteRequest
                    ? 'We\'ll send your custom quote within 24 hours'
                    : 'Within 24-48 hours to finalize details'}
                </Text>
              </View>
            </View>

            {!isQuoteRequest && balanceDue > 0 && (
              <View style={styles.stepItem}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Complete Balance Payment</Text>
                  <Text style={styles.stepDesc}>
                    Pay remaining balance {balanceDueDays} days before your event
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Support Info */}
      <View style={styles.supportInfo}>
        <Text style={styles.supportText}>
          Questions about your {isQuoteRequest ? 'request' : 'booking'}?{' '}
          <Text style={styles.supportLink}>Contact our team</Text>
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

  // Processing State
  processingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  processingTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  processingSubtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Failed State
  failedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  failedIconContainer: {
    marginBottom: spacing.lg,
  },
  failedTitle: {
    ...typeScale.headlineSmall,
    color: colors.semantic.error,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  failedMessage: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.semantic.error + '10',
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  errorBoxText: {
    ...typeScale.bodySmall,
    color: colors.semantic.error,
    flex: 1,
  },
  retryButton: {
    backgroundColor: colors.secondary.forest,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: layout.borderRadius.md,
  },
  retryButtonText: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
    fontWeight: '600',
  },

  // Pending State
  pendingHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  pendingIconContainer: {
    marginBottom: spacing.md,
  },
  pendingTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  pendingMessage: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  summaryRowContent: {
    flex: 1,
  },
  summaryLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.xxs,
  },
  summaryValue: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },

  // Quote Message Card
  quoteMessageCard: {
    backgroundColor: colors.secondary.forestSubtle,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  quoteMessageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  quoteMessageTitle: {
    ...typeScale.titleSmall,
    color: colors.secondary.forest,
  },
  quoteMessageText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },

  // Complete Button
  completeButton: {
    backgroundColor: colors.secondary.forest,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    marginTop: spacing.lg,
  },
  completeButtonText: {
    ...typeScale.titleSmall,
    color: colors.neutral.white,
    fontWeight: '700',
  },

  // Success Header
  successHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  successIconContainer: {
    marginBottom: spacing.md,
  },
  successTitle: {
    ...typeScale.headlineMedium,
    color: colors.primary.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  successMessage: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  // Reference Card
  referenceCard: {
    backgroundColor: colors.primary.black,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  referenceLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.warmGray,
    marginBottom: spacing.xs,
  },
  referenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  referenceNumber: {
    ...typeScale.headlineLarge,
    color: colors.neutral.white,
    fontFamily: 'monospace',
    letterSpacing: 4,
  },
  copyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referenceHint: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
    marginTop: spacing.sm,
  },

  // Details Card
  detailsCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  sectionTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.xxs,
  },
  detailValue: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    fontWeight: '500',
  },

  // Payment Card
  paymentCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  paymentLabel: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  paymentTotal: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '600',
  },
  paymentPaid: {
    ...typeScale.titleSmall,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
  paymentDue: {
    ...typeScale.titleSmall,
    color: colors.semantic.warning,
    fontWeight: '600',
  },
  balanceNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.semantic.warning + '15',
    padding: spacing.sm,
    borderRadius: layout.borderRadius.sm,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  balanceNoteText: {
    ...typeScale.bodySmall,
    color: colors.semantic.warning,
    flex: 1,
  },
  refundPolicy: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.tertiary.tealSubtle,
    padding: spacing.sm,
    borderRadius: layout.borderRadius.sm,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  refundPolicyText: {
    ...typeScale.bodySmall,
    color: colors.tertiary.tealDark,
    flex: 1,
  },

  // Contact Card
  contactCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  contactText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },

  // Special Requests Card
  specialRequestsCard: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  specialRequestsText: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
  },

  // Actions Section
  actionsSection: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.sm,
  },
  actionButtonText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    flex: 1,
  },

  // Next Steps Card
  nextStepsCard: {
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.cardBorderRadius,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stepsList: {
    gap: spacing.md,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    ...typeScale.labelMedium,
    color: colors.neutral.white,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
    marginBottom: spacing.xxs,
  },
  stepDesc: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },

  // Support Info
  supportInfo: {
    alignItems: 'center',
    padding: spacing.md,
  },
  supportText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  supportLink: {
    color: colors.tertiary.teal,
    fontWeight: '600',
  },
});

export default ConfirmationStep;
