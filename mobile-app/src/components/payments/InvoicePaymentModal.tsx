/**
 * InvoicePaymentModal
 *
 * Modal for paying an invoice with saved payment methods or new card.
 * Similar to booking flow payment but for standalone invoice payments.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStripe } from '@stripe/stripe-react-native';
import * as Haptics from 'expo-haptics';
import { X } from 'phosphor-react-native';

import { theme } from '@/theme';
import { Button } from '@/components/common';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { StripeCardField } from './StripeCardField';
import { usePayInvoice } from '@/hooks/useFinancial';
import { useAuthStore } from '@/stores/authStore';
import { formatCurrency } from '@/utils/formatting';
import type { Invoice } from '@/apis/payments.api';
import type { ClientPaymentMethod } from '@/types/booking';

export interface InvoicePaymentModalProps {
  visible: boolean;
  onClose: () => void;
  invoice: Invoice;
  onPaymentSuccess?: () => void;
}

export function InvoicePaymentModal({
  visible,
  onClose,
  invoice,
  onPaymentSuccess,
}: InvoicePaymentModalProps) {
  const insets = useSafeAreaInsets();
  const { createPaymentMethod } = useStripe();
  const { isAuthenticated } = useAuthStore();
  const payInvoice = usePayInvoice();

  // Payment method state
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<ClientPaymentMethod | null>(null);
  const [showNewCard, setShowNewCard] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [savePaymentMethod, setSavePaymentMethod] = useState(true);

  // Calculate amount due
  const amountDue = invoice.remaining_amount ?? invoice.total_amount;

  // Handle saved payment method selection
  const handleMethodSelect = useCallback((method: ClientPaymentMethod | null) => {
    setSelectedPaymentMethod(method);
    setShowNewCard(false);
  }, []);

  // Handle add new card
  const handleAddNewCard = useCallback(() => {
    setSelectedPaymentMethod(null);
    setShowNewCard(true);
  }, []);

  // Handle card change
  const handleCardChange = useCallback((details: { complete: boolean }) => {
    setCardComplete(details.complete);
  }, []);

  // Handle payment
  const handlePay = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (selectedPaymentMethod) {
        // Pay with saved payment method
        const result = await payInvoice.mutateAsync({
          invoiceId: invoice.id,
          paymentData: {
            payment_method: selectedPaymentMethod.id,
            payment_type: 'FULL',
          },
        });

        if (result.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onPaymentSuccess?.();
          onClose();
        } else {
          Alert.alert('Payment Failed', result.error || 'Please try again.');
        }
      } else if (showNewCard && cardComplete) {
        // Create payment method from card and pay
        const { paymentMethod, error } = await createPaymentMethod({
          paymentMethodType: 'Card',
          paymentMethodData: {
            billingDetails: {},
          },
        });

        if (error) {
          Alert.alert('Card Error', error.message);
          return;
        }

        if (!paymentMethod) {
          Alert.alert('Error', 'Failed to create payment method');
          return;
        }

        // Pay with the new payment method token
        const result = await payInvoice.mutateAsync({
          invoiceId: invoice.id,
          paymentData: {
            payment_method_id: paymentMethod.id,
            payment_type: 'FULL',
            save_payment_method: isAuthenticated && savePaymentMethod,
          },
        });

        if (result.success) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onPaymentSuccess?.();
          onClose();
        } else {
          Alert.alert('Payment Failed', result.error || 'Please try again.');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      // Error toast is shown by the hook
    }
  }, [
    selectedPaymentMethod,
    showNewCard,
    cardComplete,
    invoice.id,
    payInvoice,
    createPaymentMethod,
    isAuthenticated,
    savePaymentMethod,
    onPaymentSuccess,
    onClose,
  ]);

  // Determine if pay button should be enabled
  const canPay = selectedPaymentMethod || (showNewCard && cardComplete);
  const isLoading = payInvoice.isPending;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}>
          <Text style={styles.title}>Pay Invoice</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.neutral[700]} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Invoice Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.invoiceNumber}>Invoice #{invoice.invoice_number}</Text>
            <Text style={styles.eventName}>{invoice.event_name}</Text>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Amount Due</Text>
              <Text style={styles.amountValue}>
                {formatCurrency(amountDue, invoice.currency)}
              </Text>
            </View>
          </View>

          {/* Payment Method Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            <PaymentMethodSelector
              selectedMethodId={selectedPaymentMethod?.id ?? null}
              onMethodSelect={handleMethodSelect}
              onAddNewClick={handleAddNewCard}
              isAuthenticated={isAuthenticated}
              showAddNew={true}
            />

            {/* New Card Input */}
            {showNewCard && (
              <View style={styles.newCardSection}>
                <Text style={styles.newCardTitle}>Enter Card Details</Text>
                <View style={styles.cardField}>
                  <StripeCardField onCardChange={handleCardChange} />
                </View>

                {/* Save payment method toggle */}
                {isAuthenticated && (
                  <View style={styles.saveMethodRow}>
                    <Text style={styles.saveMethodLabel}>
                      Save card for future payments
                    </Text>
                    <Button
                      variant={savePaymentMethod ? 'primary' : 'secondary'}
                      size="sm"
                      onPress={() => setSavePaymentMethod(!savePaymentMethod)}
                    >
                      {savePaymentMethod ? 'Yes' : 'No'}
                    </Button>
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Footer with Pay Button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + theme.spacing.md }]}>
          <Button
            variant="primary"
            size="lg"
            onPress={handlePay}
            disabled={!canPay || isLoading}
            loading={isLoading}
            style={styles.payButton}
          >
            Pay {formatCurrency(amountDue, invoice.currency)}
          </Button>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.neutral[900],
  },
  closeButton: {
    padding: theme.spacing.sm,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: theme.spacing.lg,
  },
  summaryCard: {
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  invoiceNumber: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.primary[700],
    marginBottom: theme.spacing.xs,
  },
  eventName: {
    fontSize: theme.typography.sizes.lg,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.primary[200],
  },
  amountLabel: {
    fontSize: theme.typography.sizes.md,
    color: theme.colors.neutral[600],
  },
  amountValue: {
    fontSize: theme.typography.sizes.xl,
    fontWeight: '700',
    color: theme.colors.primary[700],
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.md,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
  },
  newCardSection: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.lg,
  },
  newCardTitle: {
    fontSize: theme.typography.sizes.sm,
    fontWeight: '600',
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing.md,
  },
  cardField: {
    marginBottom: theme.spacing.md,
  },
  saveMethodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  saveMethodLabel: {
    fontSize: theme.typography.sizes.sm,
    color: theme.colors.neutral[600],
    flex: 1,
    marginRight: theme.spacing.md,
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.surface,
  },
  payButton: {
    width: '100%',
  },
});

export default InvoicePaymentModal;
