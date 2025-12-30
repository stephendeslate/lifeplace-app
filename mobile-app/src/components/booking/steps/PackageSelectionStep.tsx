/**
 * PackageSelectionStep
 *
 * Package selection with support for pre-made packages and custom bundles.
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
import { Check, Package, Star, Clock, Plus, Minus } from 'phosphor-react-native';
import { colors, spacing, typeScale, layout, shadows } from '@/theme';
import { usePackages } from '@/hooks/booking';
import { useBookingContext } from '@/contexts/BookingContext';
import { formatCurrency } from '@/utils/currency';
import type { StepComponentProps } from '../StepRenderer';
import type {
  PackageSelectionStepData,
  PackageSelectionStepConfiguration,
  ProductOption,
  SelectedPackage,
} from '@/types/booking';
import * as Haptics from 'expo-haptics';

type PackageSelectionStepProps = StepComponentProps<PackageSelectionStepData, PackageSelectionStepConfiguration>;

export function PackageSelectionStep({
  step,
  data,
  configuration,
  onDataChange,
  validationErrors,
}: PackageSelectionStepProps) {
  const { state } = useBookingContext();

  const { data: packages, isLoading, error } = usePackages();

  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>(
    data.selected_packages || []
  );

  const {
    selection_type = 'SINGLE',
    min_selection = 1,
    max_selection = 1,
    show_pricing = true,
    show_descriptions = true,
    show_images = true,
    enable_comparison = false,
  } = configuration || {};

  const isMultiSelect = selection_type === 'MULTIPLE' || max_selection > 1;

  useEffect(() => {
    setSelectedPackages(data.selected_packages || []);
  }, [data.selected_packages]);

  const isPackageSelected = (packageId: number): boolean => {
    return selectedPackages.some((p) => p.product_id === packageId);
  };

  const getPackageQuantity = (packageId: number): number => {
    const pkg = selectedPackages.find((p) => p.product_id === packageId);
    return pkg?.quantity || 0;
  };

  const handleTogglePackage = useCallback(async (pkg: ProductOption) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    let newSelection: SelectedPackage[];

    if (isPackageSelected(pkg.id)) {
      // Remove package
      newSelection = selectedPackages.filter((p) => p.product_id !== pkg.id);
    } else {
      // Add package
      const newPackage: SelectedPackage = {
        product_id: pkg.id,
        name: pkg.name,
        price: pkg.price,
        quantity: 1,
        tax_rate: pkg.tax_rate,
        included_hours: pkg.included_hours,
        excess_hour_rate: pkg.excess_hour_rate,
      };

      if (isMultiSelect) {
        if (selectedPackages.length < max_selection) {
          newSelection = [...selectedPackages, newPackage];
        } else {
          return; // Max selection reached
        }
      } else {
        newSelection = [newPackage];
      }
    }

    setSelectedPackages(newSelection);
    onDataChange({ selected_packages: newSelection });
  }, [selectedPackages, isMultiSelect, max_selection, onDataChange]);

  const handleQuantityChange = useCallback(async (packageId: number, delta: number) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newSelection = selectedPackages.map((p) => {
      if (p.product_id === packageId) {
        const newQuantity = Math.max(1, p.quantity + delta);
        return { ...p, quantity: newQuantity };
      }
      return p;
    });

    setSelectedPackages(newSelection);
    onDataChange({ selected_packages: newSelection });
  }, [selectedPackages, onDataChange]);

  const totalPrice = useMemo(() => {
    return selectedPackages.reduce((sum, pkg) => {
      return sum + parseFloat(pkg.price) * pkg.quantity;
    }, 0);
  }, [selectedPackages]);

  const getValidationMessage = (): string | null => {
    if (selectedPackages.length < min_selection) {
      return `Please select at least ${min_selection} package${min_selection > 1 ? 's' : ''}`;
    }
    return null;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary.black} />
        <Text style={styles.loadingText}>Loading packages...</Text>
      </View>
    );
  }

  if (error || !packages) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Couldn't Load Packages</Text>
        <Text style={styles.errorText}>
          There was a problem loading available packages. Please try again.
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
        <Text style={styles.title}>Select Package</Text>
        <Text style={styles.subtitle}>
          {isMultiSelect
            ? `Choose up to ${max_selection} packages for your event`
            : 'Choose the package that best fits your needs'}
        </Text>
      </View>

      {/* Selection count */}
      {isMultiSelect && (
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedPackages.length} of {max_selection} packages selected
          </Text>
          {totalPrice > 0 && (
            <Text style={styles.totalPrice}>
              Total: {formatCurrency(totalPrice, { currency: 'PHP' })}
            </Text>
          )}
        </View>
      )}

      {/* Package List */}
      <View style={styles.packageList}>
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            package={pkg}
            selected={isPackageSelected(pkg.id)}
            quantity={getPackageQuantity(pkg.id)}
            onPress={() => handleTogglePackage(pkg)}
            onQuantityChange={(delta) => handleQuantityChange(pkg.id, delta)}
            showPricing={show_pricing}
            showDescription={show_descriptions}
            showImage={show_images}
            showQuantity={isMultiSelect && isPackageSelected(pkg.id)}
            disabled={!isPackageSelected(pkg.id) && selectedPackages.length >= max_selection}
          />
        ))}
      </View>

      {/* Validation message */}
      {(validationErrors?.selected_packages || getValidationMessage()) && (
        <Text style={styles.validationError}>
          {validationErrors?.selected_packages?.[0] || getValidationMessage()}
        </Text>
      )}
    </ScrollView>
  );
}

interface PackageCardProps {
  package: ProductOption;
  selected: boolean;
  quantity: number;
  onPress: () => void;
  onQuantityChange: (delta: number) => void;
  showPricing?: boolean;
  showDescription?: boolean;
  showImage?: boolean;
  showQuantity?: boolean;
  disabled?: boolean;
}

function PackageCard({
  package: pkg,
  selected,
  quantity,
  onPress,
  onQuantityChange,
  showPricing = true,
  showDescription = true,
  showImage = true,
  showQuantity = false,
  disabled = false,
}: PackageCardProps) {
  const {
    name,
    description,
    image_url,
    price,
    pricing_model,
    included_hours,
    min_hours,
    max_hours,
    is_featured,
    features = [],
  } = pkg;

  return (
    <TouchableOpacity
      style={[
        styles.packageCard,
        selected && styles.packageCardSelected,
        disabled && styles.packageCardDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      {/* Image */}
      {showImage && image_url && (
        <Image
          source={{ uri: image_url }}
          style={styles.packageImage}
          contentFit="cover"
          transition={200}
        />
      )}

      {/* Badges */}
      <View style={styles.packageBadges}>
        {is_featured && (
          <View style={styles.featuredBadge}>
            <Star size={12} color={colors.semantic.warning} weight="fill" />
            <Text style={styles.featuredBadgeText}>Popular</Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.packageContent}>
        <View style={styles.packageHeader}>
          <View style={styles.packageTitleRow}>
            <Package size={20} color={colors.accent.wood} />
            <Text style={styles.packageName} numberOfLines={1}>{name}</Text>
          </View>
          {selected && (
            <View style={styles.selectedIndicator}>
              <Check size={16} color={colors.neutral.white} weight="bold" />
            </View>
          )}
        </View>

        {showDescription && description && (
          <Text style={styles.packageDescription} numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Features */}
        {features.length > 0 && (
          <View style={styles.packageFeatures}>
            {features.slice(0, 3).map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Check size={12} color={colors.secondary.forest} weight="bold" />
                <Text style={styles.featureText} numberOfLines={1}>{feature}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Hours info */}
        {included_hours && (
          <View style={styles.hoursInfo}>
            <Clock size={14} color={colors.neutral.darkGray} />
            <Text style={styles.hoursText}>
              {included_hours} hours included
              {min_hours && max_hours && ` (${min_hours}-${max_hours} hrs)`}
            </Text>
          </View>
        )}

        {/* Pricing */}
        {showPricing && (
          <View style={styles.packagePricing}>
            <Text style={styles.packagePrice}>
              {formatCurrency(parseFloat(price), { currency: 'PHP' })}
            </Text>
            <Text style={styles.packagePriceUnit}>
              {pricing_model === 'HOURLY' ? '/ hour' : '/ package'}
            </Text>
          </View>
        )}

        {/* Quantity Selector */}
        {showQuantity && (
          <View style={styles.quantitySelector}>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onQuantityChange(-1)}
              disabled={quantity <= 1}
            >
              <Minus size={18} color={quantity <= 1 ? colors.neutral.gray : colors.primary.black} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onQuantityChange(1)}
            >
              <Plus size={18} color={colors.primary.black} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
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
  selectionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral.warmGray,
  },
  selectionText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  totalPrice: {
    ...typeScale.titleSmall,
    color: colors.primary.black,
    fontWeight: '700',
  },
  packageList: {
    gap: spacing.md,
  },
  packageCard: {
    backgroundColor: colors.neutral.white,
    borderRadius: layout.cardBorderRadius,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...shadows.sm,
  },
  packageCardSelected: {
    borderColor: colors.primary.black,
  },
  packageCardDisabled: {
    opacity: 0.5,
  },
  packageImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.neutral.sand,
  },
  packageBadges: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.alpha.black60,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    borderRadius: layout.borderRadius.full,
    gap: spacing.xxs,
  },
  featuredBadgeText: {
    ...typeScale.labelSmall,
    color: colors.neutral.white,
    fontWeight: '600',
  },
  packageContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  packageTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  packageName: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    flex: 1,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.secondary.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageDescription: {
    ...typeScale.bodySmall,
    color: colors.neutral.darkGray,
  },
  packageFeatures: {
    gap: spacing.xxs,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  featureText: {
    ...typeScale.bodySmall,
    color: colors.primary.black,
    flex: 1,
  },
  hoursInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  hoursText: {
    ...typeScale.labelSmall,
    color: colors.neutral.darkGray,
  },
  packagePricing: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xxs,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral.warmGray,
  },
  packagePrice: {
    ...typeScale.titleLarge,
    color: colors.primary.black,
    fontWeight: '700',
  },
  packagePriceUnit: {
    ...typeScale.labelSmall,
    color: colors.neutral.gray,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.neutral.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    ...typeScale.titleMedium,
    color: colors.primary.black,
    fontWeight: '700',
    minWidth: 40,
    textAlign: 'center',
  },
  validationError: {
    ...typeScale.labelSmall,
    color: colors.semantic.error,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});

export default PackageSelectionStep;
