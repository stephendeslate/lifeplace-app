/**
 * ConfirmationStep
 *
 * Booking confirmation with details summary and next steps.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import {
  CheckCircle,
  Calendar,
  MapPin,
  Clock,
  Receipt,
  Envelope,
  Phone,
  Copy,
  ShareNetwork,
  CalendarPlus,
  Info,
  CaretRight,
} from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import { formatCurrency } from '@/utils/currency';
import { formatPhilippinesTime } from '@/utils/timezone';
import { format, parseISO } from 'date-fns';
import type { StepComponentProps } from '../StepRenderer';
import type { ConfirmationStepData, ConfirmationStepConfiguration } from '@/types/booking';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';

type ConfirmationStepProps = StepComponentProps<ConfirmationStepData, ConfirmationStepConfiguration>;

export function ConfirmationStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: ConfirmationStepProps) {
  const { state } = useBookingContext();

  const {
    show_calendar_link = true,
    show_share_options = true,
    show_next_steps = true,
    confirmation_message,
    redirect_url,
  } = configuration || {};

  // Get booking details from state
  const bookingRef = data.booking_reference || state.session?.id?.slice(0, 8).toUpperCase() || 'PENDING';
  const eventDate = state.stepData.datetime?.start_date;
  const venue = state.stepData.venue_selection?.selected_venues?.[0];
  const contactInfo = state.stepData.contact_info;
  const total = state.pricingSummary?.total || 0;
  const amountPaid = state.stepData.payment?.amount_to_pay || total * 0.5;
  const balanceDue = total - amountPaid;

  const handleCopyReference = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(bookingRef);
    // Would show toast in production
  };

  const handleShare = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await Share.share({
        message: `I just booked an event at LifePlace! 🎉\n\nBooking Reference: ${bookingRef}\nDate: ${eventDate ? format(parseISO(eventDate), 'MMMM d, yyyy') : 'TBD'}\n\nCheck out LifePlace for your next event!`,
        title: 'LifePlace Booking Confirmation',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleAddToCalendar = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Would integrate with expo-calendar in production
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Success Header */}
      <View style={styles.successHeader}>
        <View style={styles.successIconContainer}>
          <CheckCircle
            size={64}
            color={colors.secondary.forest}
            weight="fill"
          />
        </View>
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successMessage}>
          {confirmation_message ||
            'Thank you for your booking. We\'ve sent a confirmation email with all the details.'}
        </Text>
      </View>

      {/* Booking Reference */}
      <View style={styles.referenceCard}>
        <Text style={styles.referenceLabel}>Booking Reference</Text>
        <View style={styles.referenceRow}>
          <Text style={styles.referenceNumber}>{bookingRef}</Text>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyReference}
          >
            <Copy size={18} color={colors.primary.black} />
          </TouchableOpacity>
        </View>
        <Text style={styles.referenceHint}>
          Save this reference for your records
        </Text>
      </View>

      {/* Booking Details */}
      <View style={styles.detailsCard}>
        <Text style={styles.sectionTitle}>Booking Details</Text>

        {eventDate && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Calendar size={20} color={colors.accent.wood} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {format(parseISO(eventDate), 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
          </View>
        )}

        {venue && (
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <MapPin size={20} color={colors.tertiary.teal} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Venue</Text>
              <Text style={styles.detailValue}>{venue.name}</Text>
            </View>
          </View>
        )}

        <View style={styles.detailRow}>
          <View style={styles.detailIcon}>
            <Receipt size={20} color={colors.secondary.forest} />
          </View>
          <View style={styles.detailContent}>
            <Text style={styles.detailLabel}>Total Amount</Text>
            <Text style={styles.detailValue}>
              {formatCurrency(total, { currency: 'PHP' })}
            </Text>
          </View>
        </View>
      </View>

      {/* Payment Summary */}
      <View style={styles.paymentCard}>
        <Text style={styles.sectionTitle}>Payment Summary</Text>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Amount Paid</Text>
          <Text style={styles.paymentPaid}>
            {formatCurrency(amountPaid, { currency: 'PHP' })}
          </Text>
        </View>

        {balanceDue > 0 && (
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Balance Due</Text>
            <Text style={styles.paymentDue}>
              {formatCurrency(balanceDue, { currency: 'PHP' })}
            </Text>
          </View>
        )}

        {balanceDue > 0 && (
          <View style={styles.balanceNote}>
            <Info size={16} color={colors.semantic.warning} />
            <Text style={styles.balanceNoteText}>
              Please pay the remaining balance 7 days before your event
            </Text>
          </View>
        )}
      </View>

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
        {show_calendar_link && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddToCalendar}
          >
            <CalendarPlus size={20} color={colors.primary.black} />
            <Text style={styles.actionButtonText}>Add to Calendar</Text>
            <CaretRight size={18} color={colors.neutral.gray} />
          </TouchableOpacity>
        )}

        {show_share_options && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShare}
          >
            <ShareNetwork size={20} color={colors.primary.black} />
            <Text style={styles.actionButtonText}>Share Booking</Text>
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
                  We've sent a detailed confirmation to your email
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Our Team Will Contact You</Text>
                <Text style={styles.stepDesc}>
                  Within 24-48 hours to finalize details
                </Text>
              </View>
            </View>

            <View style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>Complete Balance Payment</Text>
                <Text style={styles.stepDesc}>
                  Pay remaining balance before your event
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Support Info */}
      <View style={styles.supportInfo}>
        <Text style={styles.supportText}>
          Questions about your booking?{' '}
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
    ...shadows.xs,
  },
  actionButtonText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    flex: 1,
  },
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
