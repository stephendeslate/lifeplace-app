/**
 * Products API
 *
 * API functions for package and addon selection in booking flow.
 * Adapted from: frontend/client-portal/src/apis/booking/products.api.ts
 */

import api from '@/utils/api';
import { ErrorHandler } from '@/utils/errorHandler';
import type {
  SelectedPackage,
  SelectedAddon,
  PackageSelectionStepData,
  AddonSelectionStepData,
  StepValidationResult,
} from '@/types/booking';

// =============================================================================
// TYPES
// =============================================================================

export interface ProductCategory {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface ProductOption {
  id: number;
  name: string;
  description: string;
  short_description: string;
  type: 'PACKAGE' | 'PRODUCT';
  category_id: number | null;
  category_name: string | null;
  base_price: string;
  price_with_tax?: string;
  tax_rate: string;
  currency: string;
  pricing_model: 'FIXED' | 'HOURLY' | 'DAILY' | 'CUSTOM';
  unit_label: string | null;
  has_excess_hours: boolean;
  included_hours: number | string | null;
  excess_hour_price: string | null;
  minimum_quantity: number;
  maximum_quantity: number | null;
  is_active: boolean;
  is_featured?: boolean;
  sort_order: number;
  // Direct image fields
  thumbnail_url: string | null;
  featured_image?: string | null;
  gallery_images?: string[];
  images: Array<{ id: number; image_url: string; alt_text: string }>;
  // Inherited image fields (falls back to venue images for packages)
  effective_featured_image?: string | null;
  effective_gallery_images?: string[];
  advance_booking_days: number | null;
  maximum_booking_days: number | null;
  included_venues: Array<{ venue_id: number; venue_name: string }>;
  event_days?: number | null;
}

export interface Discount {
  id: number;
  code: string;
  name: string;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: string;
  minimum_amount: string | null;
  maximum_discount: string | null;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  usage_limit: number | null;
  times_used: number;
}

// =============================================================================
// PRODUCTS API
// =============================================================================

export const ProductsAPI = {
  /**
   * Get all active product categories.
   *
   * GET /products/categories/
   */
  getCategories: async (): Promise<ProductCategory[]> => {
    const response = await api.get<ProductCategory[]>('/products/categories/', {
      params: { is_active: true },
    });
    return response.data;
  },

  /**
   * Get category by ID.
   *
   * GET /products/categories/:categoryId/
   */
  getCategory: async (categoryId: number): Promise<ProductCategory> => {
    const response = await api.get<ProductCategory>(`/products/categories/${categoryId}/`);
    return response.data;
  },

  /**
   * Get all active product options (packages and products).
   *
   * GET /products/products/
   */
  getProductOptions: async (): Promise<ProductOption[]> => {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: ProductOption[];
    }>('/products/products/', {
      params: { is_active: true },
    });
    return response.data.results || [];
  },

  /**
   * Get packages only (type = 'PACKAGE').
   *
   * GET /products/products/
   */
  getPackages: async (): Promise<ProductOption[]> => {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: ProductOption[];
    }>('/products/products/', {
      params: {
        is_active: true,
        type: 'PACKAGE',
      },
    });
    return response.data.results || [];
  },

  /**
   * Get products/addons only (type = 'PRODUCT').
   *
   * GET /products/products/
   */
  getAddons: async (): Promise<ProductOption[]> => {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: ProductOption[];
    }>('/products/products/', {
      params: {
        is_active: true,
        type: 'PRODUCT',
      },
    });
    return response.data.results || [];
  },

  /**
   * Get packages by category.
   *
   * GET /products/products/
   */
  getPackagesByCategory: async (categoryId: number): Promise<ProductOption[]> => {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: ProductOption[];
    }>('/products/products/', {
      params: {
        is_active: true,
        type: 'PACKAGE',
        category_id: categoryId,
      },
    });
    return response.data.results || [];
  },

  /**
   * Get addons by category.
   *
   * GET /products/products/
   */
  getAddonsByCategory: async (categoryId: number): Promise<ProductOption[]> => {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: ProductOption[];
    }>('/products/products/', {
      params: {
        is_active: true,
        type: 'PRODUCT',
        category_id: categoryId,
      },
    });
    return response.data.results || [];
  },

  /**
   * Get product option by ID.
   *
   * GET /products/products/:productId/
   */
  getProductOption: async (productId: number): Promise<ProductOption> => {
    const response = await api.get<ProductOption>(`/products/products/${productId}/`);
    return response.data;
  },

  /**
   * Get multiple products by IDs using batch API endpoint.
   *
   * GET /products/products/batch/
   */
  getProductsByIds: async (productIds: number[]): Promise<Map<number, ProductOption>> => {
    if (productIds.length === 0) {
      return new Map();
    }

    try {
      const idsString = productIds.join(',');
      const response = await api.get<{ count: number; products: ProductOption[] }>(
        '/products/products/batch/',
        { params: { ids: idsString } }
      );

      const productMap = new Map<number, ProductOption>();
      response.data.products.forEach((product) => {
        productMap.set(product.id, product);
      });

      return productMap;
    } catch (error) {
      console.warn('Failed to fetch products by IDs via batch API:', error);

      // Fallback to individual requests
      const productMap = new Map<number, ProductOption>();

      for (const id of productIds) {
        try {
          const product = await ProductsAPI.getProductOption(id);
          productMap.set(id, product);
        } catch (err) {
          console.warn(`Failed to fetch product ${id}:`, err);
        }
      }

      return productMap;
    }
  },

  /**
   * Get active discounts.
   *
   * GET /products/discounts/
   */
  getDiscounts: async (): Promise<Discount[]> => {
    const response = await api.get<Discount[]>('/products/discounts/', {
      params: { is_active: true },
    });
    return response.data;
  },

  /**
   * Validate discount code.
   *
   * POST /products/discounts/validate/
   */
  validateDiscountCode: async (code: string): Promise<Discount> => {
    const response = await api.post<Discount>('/products/discounts/validate/', {
      code: code,
    });
    return response.data;
  },

  /**
   * Validate package selection step data.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate/
   */
  validatePackageStepData: async (
    sessionId: string,
    stepId: number,
    stepData: PackageSelectionStepData
  ): Promise<StepValidationResult> => {
    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      {
        step_id: stepId,
        step_data: stepData,
      }
    );
    return response.data;
  },

  /**
   * Validate addon selection step data.
   *
   * POST /bookingflow/public/flows/session/:sessionId/validate/
   */
  validateAddonStepData: async (
    sessionId: string,
    stepId: number,
    stepData: AddonSelectionStepData
  ): Promise<StepValidationResult> => {
    const response = await api.post<StepValidationResult>(
      `/bookingflow/public/flows/session/${sessionId}/validate/`,
      {
        step_id: stepId,
        step_data: stepData,
      }
    );
    return response.data;
  },

  /**
   * Update package selection step data.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/update/
   */
  updatePackageStepData: async (
    sessionId: string,
    stepId: number,
    stepData: PackageSelectionStepData,
    markCompleted: boolean = false
  ): Promise<Record<string, unknown>> => {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted,
      }
    );
    return response.data as Record<string, unknown>;
  },

  /**
   * Update addon selection step data.
   *
   * PATCH /bookingflow/public/flows/session/:sessionId/update/
   */
  updateAddonStepData: async (
    sessionId: string,
    stepId: number,
    stepData: AddonSelectionStepData,
    markCompleted: boolean = false
  ): Promise<Record<string, unknown>> => {
    const response = await api.patch(
      `/bookingflow/public/flows/session/${sessionId}/update/`,
      {
        step_id: stepId,
        step_data: stepData,
        mark_completed: markCompleted,
      }
    );
    return response.data as Record<string, unknown>;
  },

  // ===========================================================================
  // PRICE CALCULATION HELPERS
  // ===========================================================================

  /**
   * Calculate package price with duration.
   */
  calculatePackagePrice: (packageOption: ProductOption, duration: number): number => {
    const basePrice = parseFloat(packageOption.base_price);

    if (packageOption.has_excess_hours && packageOption.included_hours) {
      const includedHours =
        typeof packageOption.included_hours === 'number'
          ? packageOption.included_hours
          : parseFloat(String(packageOption.included_hours)) || 0;

      if (duration <= includedHours) {
        return basePrice;
      } else {
        const excessHours = duration - includedHours;
        const excessPrice = parseFloat(packageOption.excess_hour_price || '0');
        return basePrice + excessHours * excessPrice;
      }
    }

    if (packageOption.pricing_model === 'HOURLY') {
      return basePrice * duration;
    }

    return basePrice;
  },

  /**
   * Calculate addon price with quantity.
   */
  calculateAddonPrice: (addon: ProductOption, quantity: number = 1): number => {
    const basePrice = parseFloat(addon.base_price);
    return basePrice * quantity;
  },

  /**
   * Calculate price with tax.
   */
  calculatePriceWithTax: (price: number, taxRate: string | number): number => {
    const rate = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate;
    const taxMultiplier = 1 + rate / 100;
    return price * taxMultiplier;
  },

  /**
   * Format price for display.
   */
  formatPrice: (amount: string | number, currency: string = 'PHP'): string => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (currency === 'PHP') {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
      }).format(num);
    }

    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    }).format(num);
  },

  /**
   * Check if product is available for booking.
   */
  isProductAvailable: (product: ProductOption, bookingDate?: string): boolean => {
    if (!product.is_active) {
      return false;
    }

    if (bookingDate && product.advance_booking_days) {
      const booking = new Date(bookingDate);
      const today = new Date();
      const daysDifference = Math.ceil(
        (booking.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDifference < product.advance_booking_days) {
        return false;
      }

      if (product.maximum_booking_days && daysDifference > product.maximum_booking_days) {
        return false;
      }
    }

    return true;
  },

  /**
   * Filter products by availability.
   */
  filterAvailableProducts: (products: ProductOption[], bookingDate?: string): ProductOption[] => {
    return products.filter((product) => ProductsAPI.isProductAvailable(product, bookingDate));
  },

  /**
   * Group products by category.
   */
  groupProductsByCategory: (products: ProductOption[]): Record<string, ProductOption[]> => {
    return products.reduce(
      (grouped, product) => {
        const categoryName = product.category_name || 'Uncategorized';
        if (!grouped[categoryName]) {
          grouped[categoryName] = [];
        }
        grouped[categoryName].push(product);
        return grouped;
      },
      {} as Record<string, ProductOption[]>
    );
  },

  /**
   * Sort products by sort order and name.
   */
  sortProducts: (products: ProductOption[]): ProductOption[] => {
    return [...products].sort((a, b) => {
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      return a.name.localeCompare(b.name);
    });
  },

  // ===========================================================================
  // VALIDATION HELPERS
  // ===========================================================================

  /**
   * Validate package selection data client-side.
   */
  validatePackageData: (
    data: PackageSelectionStepData,
    minSelection: number = 1,
    maxSelection: number = 10
  ): { isValid: boolean; errors: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};

    if (!data.selected_packages || data.selected_packages.length === 0) {
      errors.selected_packages = ['Please select at least one package'];
    } else if (data.selected_packages.length < minSelection) {
      errors.selected_packages = [`Please select at least ${minSelection} package(s)`];
    } else if (data.selected_packages.length > maxSelection) {
      errors.selected_packages = [`You can select up to ${maxSelection} packages`];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Validate addon selection data client-side.
   */
  validateAddonData: (
    data: AddonSelectionStepData,
    minSelection: number = 0,
    maxSelection: number = 100
  ): { isValid: boolean; errors: Record<string, string[]> } => {
    const errors: Record<string, string[]> = {};

    if (minSelection > 0 && (!data.selected_addons || data.selected_addons.length < minSelection)) {
      errors.selected_addons = [`Please select at least ${minSelection} add-on(s)`];
    } else if (data.selected_addons && data.selected_addons.length > maxSelection) {
      errors.selected_addons = [`You can select up to ${maxSelection} add-ons`];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  },

  /**
   * Get default package data.
   */
  getDefaultPackageData: (): PackageSelectionStepData => {
    return {
      selected_packages: [],
    };
  },

  /**
   * Get default addon data.
   */
  getDefaultAddonData: (): AddonSelectionStepData => {
    return {
      selected_addons: [],
    };
  },

  /**
   * Handle products API errors.
   */
  handleProductsError: (error: unknown): string => {
    return ErrorHandler.extractMessage(error);
  },
};

export default ProductsAPI;
