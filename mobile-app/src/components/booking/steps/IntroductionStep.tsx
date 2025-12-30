/**
 * IntroductionStep
 *
 * Welcome step with terms acknowledgment.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Image } from 'expo-image';
import { Check, ArrowRight, Sparkle } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useBookingContext } from '@/contexts/BookingContext';
import type { StepComponentProps } from '../StepRenderer';
import type { IntroductionStepData, IntroductionStepConfiguration } from '@/types/booking';
import * as Haptics from 'expo-haptics';

type IntroductionStepProps = StepComponentProps<IntroductionStepData, IntroductionStepConfiguration>;

export function IntroductionStep({
  step,
  sessionId,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: IntroductionStepProps) {
  const { state } = useBookingContext();
  const [acknowledged, setAcknowledged] = useState(data.acknowledged || false);
  const [scaleAnim] = useState(new Animated.Value(1));

  const {
    title = 'Welcome',
    content,
    show_event_details = true,
    show_pricing_overview = false,
    background_image,
  } = configuration || {};

  const eventType = state.selectedEventType;
  const flow = state.currentFlow;

  useEffect(() => {
    setAcknowledged(data.acknowledged || false);
  }, [data.acknowledged]);

  const handleToggleAcknowledge = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate the checkbox
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    const newValue = !acknowledged;
    setAcknowledged(newValue);
    onDataChange({ acknowledged: newValue });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View style={styles.heroSection}>
        {background_image || eventType?.image_url ? (
          <Image
            source={{ uri: background_image || eventType?.image_url }}
            style={styles.heroImage}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={styles.heroPlaceholder}>
            <Sparkle size={64} color={colors.accent.wood} weight="fill" />
          </View>
        )}
        <View style={styles.heroOverlay} />
        <View style={styles.heroContent}>
          <Text style={styles.welcomeText}>Welcome to</Text>
          <Text style={styles.heroTitle}>{eventType?.name || flow?.name || 'Your Booking'}</Text>
        </View>
      </View>

      {/* Event Details */}
      {show_event_details && eventType && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Your Event</Text>
          {eventType.description && (
            <Text style={styles.description}>{eventType.description}</Text>
          )}
          {eventType.features && eventType.features.length > 0 && (
            <View style={styles.featuresList}>
              {eventType.features.slice(0, 4).map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <View style={styles.featureIcon}>
                    <Check size={12} color={colors.secondary.forest} weight="bold" />
                  </View>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Custom Content */}
      {content && (
        <View style={styles.section}>
          <Text style={styles.customContent}>{content}</Text>
        </View>
      )}

      {/* Booking Process Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What to Expect</Text>
        <View style={styles.processList}>
          <ProcessStep number={1} title="Select Your Venue" description="Choose from our available venues" />
          <ProcessStep number={2} title="Pick Date & Time" description="Select when you'd like to host your event" />
          <ProcessStep number={3} title="Choose Package" description="Select the package that fits your needs" />
          <ProcessStep number={4} title="Add Extras" description="Customize with optional add-ons" />
          <ProcessStep number={5} title="Confirm & Pay" description="Review and complete your booking" />
        </View>
      </View>

      {/* Acknowledgment */}
      <View style={styles.acknowledgmentSection}>
        <TouchableOpacity
          style={[
            styles.checkboxContainer,
            acknowledged && styles.checkboxContainerChecked,
            validationErrors?.acknowledged && styles.checkboxContainerError,
          ]}
          onPress={handleToggleAcknowledge}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.checkbox,
              acknowledged && styles.checkboxChecked,
              { transform: [{ scale: scaleAnim }] },
            ]}
          >
            {acknowledged && (
              <Check size={14} color={colors.neutral.white} weight="bold" />
            )}
          </Animated.View>
          <Text style={styles.checkboxLabel}>
            I'm ready to start planning my event and understand the booking process
          </Text>
        </TouchableOpacity>

        {validationErrors?.acknowledged && (
          <Text style={styles.errorText}>
            {validationErrors.acknowledged[0] || 'Please acknowledge to continue'}
          </Text>
        )}
      </View>

      {/* Success Message */}
      {acknowledged && (
        <Animated.View style={styles.successMessage}>
          <Check size={20} color={colors.secondary.forest} weight="bold" />
          <Text style={styles.successText}>
            Great! Let's start planning your amazing event!
          </Text>
        </Animated.View>
      )}
    </ScrollView>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.processStep}>
      <View style={styles.processNumber}>
        <Text style={styles.processNumberText}>{number}</Text>
      </View>
      <View style={styles.processContent}>
        <Text style={styles.processTitle}>{title}</Text>
        <Text style={styles.processDescription}>{description}</Text>
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
  heroSection: {
    height: 200,
    position: 'relative',
    marginBottom: spacing.xl,
    borderRadius: layout.borderRadius.lg,
    overflow: 'hidden',
    marginHorizontal: -spacing.lg,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.neutral.sand,
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.accent.woodSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.alpha.black40,
  },
  heroContent: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
  welcomeText: {
    ...typeScale.labelMedium,
    color: colors.alpha.white80,
    marginBottom: spacing.xxs,
  },
  heroTitle: {
    ...typeScale.headlineLarge,
    color: colors.neutral.white,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  description: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    lineHeight: 24,
  },
  featuresList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary.forestSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  featureText: {
    ...typeScale.bodySmall,
    color: colors.primary.black,
    flex: 1,
  },
  customContent: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    lineHeight: 24,
  },
  processList: {
    gap: spacing.md,
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  processNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processNumberText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '700',
  },
  processContent: {
    flex: 1,
  },
  processTitle: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: 2,
  },
  processDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  acknowledgmentSection: {
    marginBottom: spacing.lg,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.neutral.sand,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  checkboxContainerChecked: {
    backgroundColor: colors.secondary.forestSubtle,
    borderColor: colors.secondary.forest,
  },
  checkboxContainerError: {
    borderColor: colors.semantic.error,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: layout.borderRadius.xs,
    borderWidth: 2,
    borderColor: colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral.white,
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: colors.secondary.forest,
    borderColor: colors.secondary.forest,
  },
  checkboxLabel: {
    ...typeScale.bodyMedium,
    color: colors.primary.black,
    flex: 1,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  successMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary.forestSubtle,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    gap: spacing.sm,
  },
  successText: {
    ...typeScale.bodyMedium,
    color: colors.secondary.forest,
    flex: 1,
    fontWeight: '500',
  },
});

export default IntroductionStep;
