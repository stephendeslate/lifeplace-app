/**
 * AddonSelectionStep
 *
 * Optional add-on selection with quantity controls.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Plus, Minus, Check, ShoppingBag, Tag } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { useAddons } from '@/hooks/booking';
import { formatCurrency } from '@/utils/currency';
import type { StepComponentProps } from '../StepRenderer';
import type {
  AddonSelectionStepData,
  AddonSelectionStepConfiguration,
  SelectedAddon,
} from '@/types/booking';
import type { ProductOption } from '@/apis/booking/products.api';
import * as Haptics from 'expo-haptics';

type AddonSelectionStepProps = StepComponentProps<AddonSelectionStepData, AddonSelectionStepConfiguration>;

export function AddonSelectionStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: AddonSelectionStepProps) {
  const { data: addons, isLoading, error } = useAddons();

  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>(
    data.selected_addons || []
  );

  const {
    min_selection = 0,
    max_selection = 99,
    group_by_category = true,
    show_recommendations = true,
  } = configuration || {};

  useEffect(() => {
    setSelectedAddons(data.selected_addons || []);
  }, [data.selected_addons]);

  const getAddonQuantity = (addonId: number): number => {
    const addon = selectedAddons.find((a) => a.product_id === addonId);
    return addon?.quantity || 0;
  };

  const handleQuantityChange = useCallback(async (addon: ProductOption, delta: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentQty = getAddonQuantity(addon.id);
    const newQty = Math.max(0, currentQty + delta);

    let newSelection: SelectedAddon[];

    if (newQty === 0) {
      // Remove addon
      newSelection = selectedAddons.filter((a) => a.product_id !== addon.id);
    } else if (currentQty === 0) {
      // Add new addon
      const newAddon: SelectedAddon = {
        product_id: addon.id,
        name: addon.name,
        price: addon.base_price,
        quantity: newQty,
        tax_rate: parseFloat(addon.tax_rate),
        category_id: addon.category_id ?? undefined,
      };
      newSelection = [...selectedAddons, newAddon];
    } else {
      // Update quantity
      newSelection = selectedAddons.map((a) =>
        a.product_id === addon.id ? { ...a, quantity: newQty } : a
      );
    }

    setSelectedAddons(newSelection);
    onDataChange({ selected_addons: newSelection });
  }, [selectedAddons, onDataChange]);

  const totalItems = useMemo(() => {
    return selectedAddons.reduce((sum, addon) => sum + addon.quantity, 0);
  }, [selectedAddons]);

  const totalPrice = useMemo(() => {
    return selectedAddons.reduce((sum, addon) => {
      return sum + parseFloat(addon.price) * addon.quantity;
    }, 0);
  }, [selectedAddons]);

  // Group addons by category
  const groupedAddons = useMemo(() => {
    if (!addons || !group_by_category) {
      return { 'All Add-ons': addons || [] };
    }

    return addons.reduce((acc, addon) => {
      const category = addon.category_name || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(addon);
      return acc;
    }, {} as Record<string, ProductOption[]>);
  }, [addons, group_by_category]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading add-ons...</Text>
      </View>
    );
  }

  if (error || !addons) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Couldn't Load Add-ons</Text>
        <Text style={styles.errorText}>
          There was a problem loading available add-ons. Please try again.
        </Text>
      </View>
    );
  }

  if (addons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ShoppingBag size={48} color={colors.neutral.gray} />
        <Text style={styles.emptyTitle}>No Add-ons Available</Text>
        <Text style={styles.emptyText}>
          There are no additional items available for this event.
          You can continue to the next step.
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
        <Text style={styles.title}>Add Extras</Text>
        <Text style={styles.subtitle}>
          Enhance your event with optional add-ons
        </Text>
      </View>

      {/* Summary Bar */}
      {totalItems > 0 && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryLeft}>
            <ShoppingBag size={18} color={colors.primary.black} />
            <Text style={styles.summaryText}>
              {totalItems} item{totalItems !== 1 ? 's' : ''} selected
            </Text>
          </View>
          <Text style={styles.summaryPrice}>
            {formatCurrency(totalPrice, { currency: 'PHP' })}
          </Text>
        </View>
      )}

      {/* Grouped Addons */}
      {Object.entries(groupedAddons).map(([category, categoryAddons]) => (
        <View key={category} style={styles.categorySection}>
          {group_by_category && Object.keys(groupedAddons).length > 1 && (
            <Text style={styles.categoryTitle}>{category}</Text>
          )}
          <View style={styles.addonList}>
            {categoryAddons.map((addon) => (
              <AddonCard
                key={addon.id}
                addon={addon}
                quantity={getAddonQuantity(addon.id)}
                onQuantityChange={(delta) => handleQuantityChange(addon, delta)}
              />
            ))}
          </View>
        </View>
      ))}

      {/* Skip hint */}
      <View style={styles.skipHint}>
        <Text style={styles.skipHintText}>
          Add-ons are optional. You can skip this step if you don't need any extras.
        </Text>
      </View>
    </ScrollView>
  );
}

interface AddonCardProps {
  addon: ProductOption;
  quantity: number;
  onQuantityChange: (delta: number) => void;
}

function AddonCard({ addon, quantity, onQuantityChange }: AddonCardProps) {
  const { name, description, thumbnail_url, base_price } = addon;
  const isSelected = quantity > 0;

  return (
    <View style={[styles.addonCard, isSelected && styles.addonCardSelected]}>
      {/* Image */}
      {thumbnail_url ? (
        <Image
          source={{ uri: thumbnail_url }}
          style={styles.addonImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.addonImage, styles.addonImagePlaceholder]}>
          <Tag size={24} color={colors.neutral.gray} />
        </View>
      )}

      {/* Content */}
      <View style={styles.addonContent}>
        <View style={styles.addonHeader}>
          <Text style={styles.addonName} numberOfLines={1}>{name}</Text>
        </View>

        {description && (
          <Text style={styles.addonDescription} numberOfLines={2}>
            {description}
          </Text>
        )}

        <View style={styles.addonFooter}>
          <Text style={styles.addonPrice}>
            {formatCurrency(parseFloat(base_price), { currency: 'PHP' })}
          </Text>

          {/* Quantity Controls */}
          <View style={styles.quantityControls}>
            {isSelected ? (
              <>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => onQuantityChange(-1)}
                >
                  <Minus size={16} color={colors.primary.black} weight="bold" />
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => onQuantityChange(1)}
                >
                  <Plus size={16} color={colors.primary.black} weight="bold" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => onQuantityChange(1)}
              >
                <Plus size={16} color={colors.neutral.white} weight="bold" />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  emptyTitle: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
  },
  emptyText: {
    ...typeScale.bodyMedium,
    color: colors.neutral.darkGray,
    textAlign: 'center',
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
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.secondary.forestSubtle,
    padding: spacing.md,
    borderRadius: layout.borderRadius.md,
    marginBottom: spacing.lg,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  summaryText: {
    ...typeScale.labelMedium,
    color: colors.primary.black,
  },
  summaryPrice: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typeScale.titleSmall,
    color: colors.neutral.darkGray,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addonList: {
    gap: spacing.sm,
  },
  addonCard: {
    flexDirection: 'row',
    backgroundColor: colors.neutral.white,
    borderRadius: layout.borderRadius.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  addonCardSelected: {
    borderColor: colors.secondary.forest,
    backgroundColor: colors.secondary.forestSubtle,
  },
  addonImage: {
    width: 80,
    height: 80,
    backgroundColor: colors.neutral.sand,
  },
  addonImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addonContent: {
    flex: 1,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
  addonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  addonName: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    flex: 1,
  },
  popularBadge: {
    backgroundColor: colors.semantic.warning,
    paddingVertical: 2,
    paddingHorizontal: spacing.xs,
    borderRadius: layout.borderRadius.xs,
  },
  popularBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
    fontSize: 9,
  },
  addonDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  addonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  addonPrice: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral.warmGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...typeScale.labelLarge,
    color: colors.primary.black,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary.black,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.sm,
    gap: spacing.xxs,
  },
  addButtonText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  skipHint: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.neutral.sand,
    borderRadius: layout.borderRadius.md,
  },
  skipHintText: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
    textAlign: 'center',
  },
});

export default AddonSelectionStep;
