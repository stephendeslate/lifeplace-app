/**
 * useProducts Hook
 *
 * React Query hooks for package and addon selection.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ProductsAPI } from '@/apis/booking';
import type { ProductOption, ProductCategory, Discount } from '@/apis/booking/products.api';
import type {
  PackageSelectionStepData,
  AddonSelectionStepData,
  StepValidationResult,
} from '@/types/booking';

// =============================================================================
// QUERY KEYS
// =============================================================================

export const productKeys = {
  all: ['products'] as const,
  categories: () => [...productKeys.all, 'categories'] as const,
  products: () => [...productKeys.all, 'products'] as const,
  packages: (eventTypeId?: number) => [...productKeys.all, 'packages', { eventTypeId }] as const,
  addons: () => [...productKeys.all, 'addons'] as const,
  packagesByCategory: (categoryId: number) =>
    [...productKeys.all, 'packages', { categoryId }] as const,
  addonsByCategory: (categoryId: number) => [...productKeys.addons(), { categoryId }] as const,
  product: (productId: number) => [...productKeys.all, 'product', productId] as const,
  productsBatch: (productIds: number[]) =>
    [...productKeys.all, 'batch', { productIds: productIds.sort() }] as const,
  discounts: () => [...productKeys.all, 'discounts'] as const,
};

// =============================================================================
// QUERY HOOKS
// =============================================================================

/**
 * Fetch all product categories.
 */
export function useProductCategories() {
  return useQuery({
    queryKey: productKeys.categories(),
    queryFn: () => ProductsAPI.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Fetch all product options.
 */
export function useProductOptions() {
  return useQuery({
    queryKey: productKeys.products(),
    queryFn: () => ProductsAPI.getProductOptions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch packages, optionally filtered by event type.
 *
 * @param eventTypeId - Optional event type ID to filter packages.
 *                      If provided, only packages associated with this event type are returned.
 *                      Packages with no event types are excluded when filtering.
 * @param options - Additional options
 * @param options.filterByEventType - Whether to apply event type filtering (default: true when eventTypeId provided)
 */
export function usePackages(eventTypeId?: number, options?: { filterByEventType?: boolean }) {
  const shouldFilter = options?.filterByEventType ?? (eventTypeId !== undefined);
  const effectiveEventTypeId = shouldFilter ? eventTypeId : undefined;

  return useQuery({
    queryKey: productKeys.packages(effectiveEventTypeId),
    queryFn: () => ProductsAPI.getPackages(effectiveEventTypeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch all addons.
 */
export function useAddons() {
  return useQuery({
    queryKey: productKeys.addons(),
    queryFn: () => ProductsAPI.getAddons(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch packages by category.
 */
export function usePackagesByCategory(categoryId: number) {
  return useQuery({
    queryKey: productKeys.packagesByCategory(categoryId),
    queryFn: () => ProductsAPI.getPackagesByCategory(categoryId),
    enabled: categoryId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch addons by category.
 */
export function useAddonsByCategory(categoryId: number) {
  return useQuery({
    queryKey: productKeys.addonsByCategory(categoryId),
    queryFn: () => ProductsAPI.getAddonsByCategory(categoryId),
    enabled: categoryId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch a specific product by ID.
 */
export function useProduct(productId: number) {
  return useQuery({
    queryKey: productKeys.product(productId),
    queryFn: () => ProductsAPI.getProductOption(productId),
    enabled: productId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch multiple products by IDs (batch).
 */
export function useProductsByIds(productIds: number[]) {
  return useQuery({
    queryKey: productKeys.productsBatch(productIds),
    queryFn: () => ProductsAPI.getProductsByIds(productIds),
    enabled: productIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch active discounts.
 */
export function useDiscounts() {
  return useQuery({
    queryKey: productKeys.discounts(),
    queryFn: () => ProductsAPI.getDiscounts(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// =============================================================================
// MUTATION HOOKS
// =============================================================================

/**
 * Validate package selection step data.
 */
export function useValidatePackageSelection() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
    }: {
      sessionId: string;
      stepId: number;
      stepData: PackageSelectionStepData;
    }) => ProductsAPI.validatePackageStepData(sessionId, stepId, stepData),
  });
}

/**
 * Update package selection step data.
 */
export function useUpdatePackageSelection() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
      markCompleted,
    }: {
      sessionId: string;
      stepId: number;
      stepData: PackageSelectionStepData;
      markCompleted?: boolean;
    }) => ProductsAPI.updatePackageStepData(sessionId, stepId, stepData, markCompleted),
  });
}

/**
 * Validate addon selection step data.
 */
export function useValidateAddonSelection() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
    }: {
      sessionId: string;
      stepId: number;
      stepData: AddonSelectionStepData;
    }) => ProductsAPI.validateAddonStepData(sessionId, stepId, stepData),
  });
}

/**
 * Update addon selection step data.
 */
export function useUpdateAddonSelection() {
  return useMutation({
    mutationFn: ({
      sessionId,
      stepId,
      stepData,
      markCompleted,
    }: {
      sessionId: string;
      stepId: number;
      stepData: AddonSelectionStepData;
      markCompleted?: boolean;
    }) => ProductsAPI.updateAddonStepData(sessionId, stepId, stepData, markCompleted),
  });
}

// =============================================================================
// UTILITY HOOKS
// =============================================================================

/**
 * Get filtered available products.
 */
export function useAvailableProducts(products: ProductOption[], bookingDate?: string) {
  return ProductsAPI.filterAvailableProducts(products, bookingDate);
}

/**
 * Group products by category.
 */
export function useGroupedProducts(products: ProductOption[]) {
  return ProductsAPI.groupProductsByCategory(products);
}

/**
 * Sort products.
 */
export function useSortedProducts(products: ProductOption[]) {
  return ProductsAPI.sortProducts(products);
}

/**
 * Calculate package price with duration.
 */
export function usePackagePrice(packageOption: ProductOption, duration: number) {
  return ProductsAPI.calculatePackagePrice(packageOption, duration);
}

/**
 * Calculate addon price with quantity.
 */
export function useAddonPrice(addon: ProductOption, quantity: number = 1) {
  return ProductsAPI.calculateAddonPrice(addon, quantity);
}

/**
 * Prefetch product data.
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  return (productId: number) => {
    queryClient.prefetchQuery({
      queryKey: productKeys.product(productId),
      queryFn: () => ProductsAPI.getProductOption(productId),
      staleTime: 5 * 60 * 1000,
    });
  };
}

/**
 * Invalidate product queries.
 */
export function useInvalidateProducts() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: productKeys.all });
  };
}
