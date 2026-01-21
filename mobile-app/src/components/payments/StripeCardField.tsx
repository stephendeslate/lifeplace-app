/**
 * StripeCardField
 *
 * Styled wrapper around Stripe's CardField component.
 * Provides consistent styling with LifePlace design system.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CardField, type CardFieldInput } from '@stripe/stripe-react-native';
import { Warning } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout } from '@/theme';

export interface StripeCardFieldProps {
  onCardChange: (details: CardFieldInput.Details) => void;
  error?: string | null;
  disabled?: boolean;
  testID?: string;
}

export function StripeCardField({
  onCardChange,
  error,
  disabled = false,
  testID,
}: StripeCardFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Card Information</Text>

      <View
        style={[
          styles.fieldContainer,
          error && styles.fieldContainerError,
          disabled && styles.fieldContainerDisabled,
        ]}
      >
        <CardField
          postalCodeEnabled={false}
          placeholders={{
            number: '4242 4242 4242 4242',
            expiration: 'MM/YY',
            cvc: 'CVC',
          }}
          cardStyle={{
            backgroundColor: colors.neutral.white,
            textColor: colors.primary.black,
            textErrorColor: colors.semantic.error,
            placeholderColor: colors.neutral.gray,
            fontSize: 16,
            fontFamily: 'System',
          }}
          style={styles.cardField}
          onCardChange={onCardChange}
          testID={testID}
          dangerouslyGetFullCardDetails={false}
        />
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Warning size={14} color={colors.semantic.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <View style={styles.brandsContainer}>
        <Text style={styles.acceptedText}>
          We accept Visa, Mastercard, and American Express
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    marginBottom: spacing.sm,
  },
  fieldContainer: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral.warmGray,
    overflow: 'hidden',
  },
  fieldContainerError: {
    borderColor: colors.semantic.error,
  },
  fieldContainerDisabled: {
    backgroundColor: colors.neutral.sand,
    opacity: 0.7,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
  },
  brandsContainer: {
    marginTop: spacing.sm,
  },
  acceptedText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
});

export default StripeCardField;
