/**
 * Add Payment Method Screen
 *
 * Allows authenticated users to add and save payment methods.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useStripe } from '@stripe/stripe-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CaretLeft, Check } from 'phosphor-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { StripeCardField } from '@/components/payment/StripeCardField';
import { Button } from '@/components/common/Button';
import { colors, spacing, typeScale, layout } from '@/theme';
import { useToast } from '@/contexts/ToastContext';
import api from '@/utils/api';

export default function AddPaymentMethodScreen() {
  const router = useRouter();
  const { createPaymentMethod } = useStripe();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Save payment method to backend
  const savePaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const response = await api.post('/payments/client/payment-methods/', {
        stripe_payment_method_id: paymentMethodId,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      showToast('Payment method added successfully', 'success');
      router.back();
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { detail?: string } } };
      const message = err.response?.data?.detail || 'Failed to save payment method';
      showToast(message, 'error');
    },
  });

  const handleCardChange = (details: { complete: boolean; validationError?: { message: string } }) => {
    setCardComplete(details.complete);
    setCardError(details.validationError?.message || null);
  };

  const handleAddMethod = async () => {
    if (!cardComplete) {
      Alert.alert('Incomplete', 'Please complete the card details');
      return;
    }

    setIsLoading(true);

    try {
      const { paymentMethod, error } = await createPaymentMethod({
        paymentMethodType: 'Card',
      });

      if (error) {
        setCardError(error.message);
        setIsLoading(false);
        return;
      }

      if (paymentMethod) {
        await savePaymentMethod.mutateAsync(paymentMethod.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add payment method';
      showToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <CaretLeft size={24} color={colors.primary.black} />
        </TouchableOpacity>
        <Text style={styles.title}>Add Payment Method</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.subtitle}>
          Add a credit or debit card for faster checkout
        </Text>

        <StripeCardField
          onCardChange={handleCardChange}
          error={cardError}
          disabled={isLoading}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your card information is securely stored with Stripe.
            We never store your full card number.
          </Text>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          variant="cta"
          onPress={handleAddMethod}
          loading={isLoading || savePaymentMethod.isPending}
          disabled={!cardComplete}
        >
          Add Card
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.neutral.cream,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  title: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  subtitle: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    marginBottom: spacing.xl,
  },
  infoBox: {
    backgroundColor: colors.neutral.sand,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    marginTop: spacing.lg,
  },
  infoText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
  footer: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
});
