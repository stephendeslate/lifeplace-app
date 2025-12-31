/**
 * PaymentMethodSelector
 *
 * Component for selecting between saved payment methods or adding a new one.
 * Similar to client-portal's PaymentMethodSelector but adapted for React Native.
 *
 * Features:
 * - Shows saved payment methods for authenticated users
 * - Radio selection UI for choosing saved method
 * - "Add New Payment Method" button to toggle to new card flow
 * - Default badge and card brand display
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import {
  CreditCard,
  Plus,
  Check,
  Star,
  Bank,
  Wallet,
} from 'phosphor-react-native';

import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { paymentsApi } from '@/apis/payments.api';
import type { ClientPaymentMethod } from '@/types/booking';

export interface PaymentMethodSelectorProps {
  /** Currently selected payment method ID */
  selectedMethodId?: number | null;
  /** Callback when a method is selected */
  onMethodSelect: (method: ClientPaymentMethod | null) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Show "Add New Payment Method" button */
  showAddNew?: boolean;
  /** Callback when "Add New" is clicked */
  onAddNewClick?: () => void;
  /** Whether user is authenticated (determines if we fetch methods) */
  isAuthenticated?: boolean;
}

/**
 * Get icon based on payment method type
 */
const PaymentMethodIcon: React.FC<{ type: ClientPaymentMethod['type'] }> = ({ type }) => {
  switch (type) {
    case 'CREDIT_CARD':
      return <CreditCard size={24} color={colors.primary.black} weight="duotone" />;
    case 'BANK_TRANSFER':
      return <Bank size={24} color={colors.primary.black} weight="duotone" />;
    case 'DIGITAL_WALLET':
      return <Wallet size={24} color={colors.primary.black} weight="duotone" />;
    default:
      return <CreditCard size={24} color={colors.primary.black} weight="duotone" />;
  }
};

/**
 * Get display text for card brand
 */
const getBrandDisplay = (brand?: string): string => {
  if (!brand) return '';

  const brandMap: Record<string, string> = {
    'visa': 'Visa',
    'mastercard': 'Mastercard',
    'amex': 'American Express',
    'discover': 'Discover',
    'jcb': 'JCB',
    'unionpay': 'UnionPay',
  };

  return brandMap[brand.toLowerCase()] || brand;
};

export function PaymentMethodSelector({
  selectedMethodId,
  onMethodSelect,
  disabled = false,
  showAddNew = true,
  onAddNewClick,
  isAuthenticated = false,
}: PaymentMethodSelectorProps) {
  // Fetch saved payment methods - only if authenticated
  const {
    data: paymentMethods,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentsApi.getPaymentMethods(),
    enabled: isAuthenticated,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      const errorObj = error as { response?: { status?: number } };
      if (errorObj.response?.status === 401 || errorObj.response?.status === 403) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Handle method selection
  const handleMethodSelect = (method: ClientPaymentMethod) => {
    if (disabled) return;
    onMethodSelect(method);
  };

  // Loading state
  if (isLoading && isAuthenticated) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.secondary.forest} />
        <Text style={styles.loadingText}>Loading saved payment methods...</Text>
      </View>
    );
  }

  // Error state - just show add new option
  if (isError && isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Unable to load saved payment methods</Text>
        {showAddNew && onAddNewClick && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddNewClick}
            disabled={disabled}
          >
            <Plus size={20} color={colors.secondary.forest} />
            <Text style={styles.addButtonText}>Add New Payment Method</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Non-authenticated user - show prompt for new method
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.guestText}>
          Enter your card details below to proceed
        </Text>
      </View>
    );
  }

  // No saved methods
  if (!paymentMethods || paymentMethods.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No saved payment methods</Text>
        {showAddNew && onAddNewClick && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={onAddNewClick}
            disabled={disabled}
          >
            <Plus size={20} color={colors.secondary.forest} />
            <Text style={styles.addButtonText}>Add New Payment Method</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Payment Methods</Text>

      <View style={styles.methodsList}>
        {paymentMethods.map((method) => {
          const isSelected = selectedMethodId === method.id;

          return (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.methodCard,
                isSelected && styles.methodCardSelected,
                disabled && styles.methodCardDisabled,
              ]}
              onPress={() => handleMethodSelect(method)}
              disabled={disabled}
              activeOpacity={0.7}
            >
              <View style={styles.methodLeft}>
                <View style={[
                  styles.radioOuter,
                  isSelected && styles.radioOuterSelected,
                ]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>

                <View style={styles.methodIconContainer}>
                  <PaymentMethodIcon type={method.type} />
                </View>

                <View style={styles.methodInfo}>
                  <Text style={styles.methodName}>
                    {method.nickname || method.type_display}
                  </Text>
                  <View style={styles.methodDetails}>
                    <Text style={styles.methodType}>
                      {method.type_display}
                    </Text>
                    {method.last_four && (
                      <Text style={styles.methodLastFour}>
                        •••• {method.last_four}
                      </Text>
                    )}
                    {method.card_brand && (
                      <Text style={styles.methodBrand}>
                        {getBrandDisplay(method.card_brand)}
                      </Text>
                    )}
                  </View>
                  {method.exp_month && method.exp_year && (
                    <Text style={styles.methodExpiry}>
                      Expires {method.exp_month.toString().padStart(2, '0')}/{method.exp_year}
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.methodRight}>
                {method.is_default && (
                  <View style={styles.defaultBadge}>
                    <Star size={12} color={colors.semantic.warning} weight="fill" />
                    <Text style={styles.defaultText}>Default</Text>
                  </View>
                )}

                {isSelected && (
                  <View style={styles.selectedCheck}>
                    <Check size={14} color={colors.neutral.white} weight="bold" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Add New Payment Method Button */}
      {showAddNew && onAddNewClick && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddNewClick}
          disabled={disabled}
        >
          <Plus size={20} color={colors.secondary.forest} />
          <Text style={styles.addButtonText}>Add New Payment Method</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
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
    padding: spacing.md,
  },
  guestText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
    padding: spacing.sm,
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
  methodCardDisabled: {
    opacity: 0.6,
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.neutral.gray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: colors.secondary.forest,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary.forest,
  },
  methodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
    fontWeight: '600',
  },
  methodDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
  methodType: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  methodLastFour: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  methodBrand: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
    textTransform: 'capitalize',
  },
  methodExpiry: {
    ...typeScale.labelSmall,
    color: colors.neutral.warmGray,
    marginTop: spacing.xxs,
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
    fontWeight: '600',
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
    backgroundColor: colors.neutral.white,
  },
  addButtonText: {
    ...typeScale.labelMedium,
    color: colors.secondary.forest,
    fontWeight: '600',
  },
});

export default PaymentMethodSelector;
