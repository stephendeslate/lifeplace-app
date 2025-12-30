/**
 * SavedPaymentMethods
 *
 * Displays and manages user's saved payment methods.
 * Allows selection for payment and management (delete, set default).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard, Plus, Check, Star } from 'phosphor-react-native';
import { useRouter } from 'expo-router';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useToast } from '@/contexts/ToastContext';
import api from '@/utils/api';

interface SavedPaymentMethod {
  id: number;
  last_four: string;
  brand: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

export interface SavedPaymentMethodsProps {
  selectedId?: number;
  onSelect?: (method: SavedPaymentMethod) => void;
  showAddButton?: boolean;
  allowManagement?: boolean;
}

export function SavedPaymentMethods({
  selectedId,
  onSelect,
  showAddButton = true,
  allowManagement = true,
}: SavedPaymentMethodsProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Fetch saved payment methods
  const { data: methods, isLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: async () => {
      const response = await api.get<SavedPaymentMethod[]>(
        '/payments/client/payment-methods/'
      );
      return response.data;
    },
  });

  // Delete payment method
  const deleteMethod = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/payments/client/payment-methods/${id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      showToast('Payment method removed', 'success');
    },
  });

  // Set default payment method
  const setDefault = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/payments/client/payment-methods/${id}/set_default/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentMethods'] });
      showToast('Default payment method updated', 'success');
    },
  });

  const getBrandIcon = (brand: string) => {
    // Could use brand-specific icons here
    return <CreditCard size={24} color={colors.primary.black} weight="duotone" />;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.secondary.forest} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Cards</Text>

      {methods?.length === 0 ? (
        <Text style={styles.emptyText}>No saved payment methods</Text>
      ) : (
        <View style={styles.methodsList}>
          {methods?.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                selectedId === method.id && styles.methodCardSelected,
              ]}
              onPress={() => onSelect?.(method)}
            >
              <View style={styles.methodLeft}>
                {getBrandIcon(method.brand)}
                <View>
                  <Text style={styles.methodBrand}>
                    {method.brand} •••• {method.last_four}
                  </Text>
                  <Text style={styles.methodExpiry}>
                    Expires {method.exp_month}/{method.exp_year}
                  </Text>
                </View>
              </View>

              <View style={styles.methodRight}>
                {method.is_default && (
                  <View style={styles.defaultBadge}>
                    <Star size={12} color={colors.semantic.warning} weight="fill" />
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}

                {selectedId === method.id && (
                  <View style={styles.selectedCheck}>
                    <Check size={16} color={colors.neutral.white} weight="bold" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showAddButton && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/payments/add-method')}
        >
          <Plus size={20} color={colors.secondary.forest} />
          <Text style={styles.addButtonText}>Add New Card</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  title: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    padding: spacing.lg,
  },
  methodsList: {
    gap: spacing.sm,
  },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.neutral.white,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  methodCardSelected: {
    borderColor: colors.secondary.forest,
    backgroundColor: colors.secondary.forestSubtle,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  methodBrand: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    textTransform: 'capitalize',
  },
  methodExpiry: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  methodRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    backgroundColor: colors.semantic.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: layout.borderRadius.full,
  },
  defaultText: {
    ...typeScale.labelSmall,
    color: colors.semantic.warning,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.md,
    borderRadius: layout.borderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.secondary.forest,
  },
  addButtonText: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
  },
});

export default SavedPaymentMethods;
