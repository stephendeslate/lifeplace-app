// frontend/client-portal/src/apis/booking/products.api.ts

import api from '../../utils/api';
import { ErrorHandler } from '../../utils/errorHandler';
import type {
  ProductCategory,
  ProductOption,
  Discount,
} from '../../types/booking';

/**
 * Products API functions for managing products, packages, and discounts
 */
export class ProductsApi {
  
  /**
   * Get all active product categories
   */
  static async getCategories(): Promise<ProductCategory[]> {
    const response = await api.get<ProductCategory[]>('/products/categories/', {
      params: { is_active: true }
    });
    return response.data;
  }

  /**
   * Get category by ID
   */
  static async getCategory(categoryId: number): Promise<ProductCategory> {
    const response = await api.get<ProductCategory>(`/products/categories/${categoryId}/`);
    return response.data;
  }

  /**
   * Get all active product options (packages and products)
   */
  static async getProductOptions(): Promise<ProductOption[]> {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: ProductOption[];
    }>('/products/products/', {  // Fixed: removed ${id} and corrected endpoint
      params: { is_active: true }
    });
    // Handle paginated response structure
    return response.data.results || [];
  }

  /**
   * Get packages only (type = 'PACKAGE')
   */
  static async getPackages(): Promise<ProductOption[]> {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: ProductOption[];
    }>('/products/products/', {  // Fixed: changed from /options/ to /products/
      params: { 
        is_active: true,
        type: 'PACKAGE'
      }
    });
    // Handle paginated response structure
    return response.data.results || [];
  }

  /**
   * Get products/addons only (type = 'PRODUCT')
   */
  static async getAddons(): Promise<ProductOption[]> {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: ProductOption[];
    }>('/products/products/', {  // Fixed: changed from /options/ to /products/
      params: { 
        is_active: true,
        type: 'PRODUCT'
      }
    });
    // Handle paginated response structure
    return response.data.results || [];
  }

  /**
   * Get packages by category
   */
  static async getPackagesByCategory(categoryId: number): Promise<ProductOption[]> {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: ProductOption[];
    }>('/products/products/', {  // Fixed: changed from /options/ to /products/
      params: { 
        is_active: true,
        type: 'PACKAGE',
        category_id: categoryId  // Fixed: changed from 'category' to 'category_id' to match backend
      }
    });
    // Handle paginated response structure
    return response.data.results || [];
  }

  /**
   * Get addons by category
   */
  static async getAddonsByCategory(categoryId: number): Promise<ProductOption[]> {
    const response = await api.get<{
      count: number;
      next: string | null;
      previous: string | null;
      results: ProductOption[];
    }>('/products/products/', {  // Fixed: changed from /options/ to /products/
      params: { 
        is_active: true,
        type: 'PRODUCT',
        category_id: categoryId  // Fixed: changed from 'category' to 'category_id' to match backend
      }
    });
    // Handle paginated response structure
    return response.data.results || [];
  }

  /**
   * Get product option by ID
   */
  static async getProductOption(productId: number): Promise<ProductOption> {
    const response = await api.get<ProductOption>(`/products/products/${productId}/`);  // Fixed: changed from /options/ to /products/
    return response.data;
  }

  /**
   * Get multiple products by IDs using batch API endpoint
   * Returns a Map for efficient lookup
   * 
   * CRITICAL FIX: This method was causing infinite loops in pricing summary
   * by making individual API calls. Now uses single batch request.
   */
  static async getProductsByIds(productIds: number[]): Promise<Map<number, ProductOption>> {
    if (productIds.length === 0) {
      return new Map();
    }

    try {
      // Use batch endpoint for single API call instead of multiple individual calls
      const idsString = productIds.join(',');
      const response = await api.get<{count: number, products: ProductOption[]}>(`/products/products/batch/`, {
        params: { ids: idsString }
      });
      
      // Convert to Map for efficient lookup
      const productMap = new Map<number, ProductOption>();
      response.data.products.forEach(product => {
        productMap.set(product.id, product);
      });
      
      return productMap;
    } catch (error) {
      console.error('Failed to fetch products by IDs via batch API:', error);
      
      // Fallback to individual requests only if batch API fails
      console.warn('Falling back to individual product requests');
      const productMap = new Map<number, ProductOption>();
      
      // Try fetching individually and handle failures gracefully
      for (const id of productIds) {
        try {
          const product = await this.getProductOption(id);
          productMap.set(id, product);
        } catch (err) {
          console.warn(`Failed to fetch product ${id}:`, err);
        }
      }
      
      return productMap;
    }
  }

  /**
   * Get active discounts
   */
  static async getDiscounts(): Promise<Discount[]> {
    const response = await api.get<Discount[]>('/products/discounts/', {
      params: { is_active: true }
    });
    return response.data;
  }

  /**
   * Validate discount code
   */
  static async validateDiscountCode(code: string): Promise<Discount> {
    const response = await api.post<Discount>('/products/discounts/validate/', {
      code: code
    });
    return response.data;
  }

  // Price calculation helpers

  /**
   * Calculate package price with duration
   */
  static calculatePackagePrice(
    packageOption: ProductOption,
    duration: number
  ): number {
    const basePrice = parseFloat(packageOption.base_price);
    
    if (packageOption.has_excess_hours && packageOption.included_hours) {
      const includedHours = packageOption.included_hours;
      
      if (duration <= includedHours) {
        return basePrice;
      } else {
        const excessHours = duration - includedHours;
        const excessPrice = parseFloat(packageOption.excess_hour_price || '0');
        return basePrice + (excessHours * excessPrice);
      }
    }
    
    if (packageOption.pricing_model === 'HOURLY') {
      return basePrice * duration;
    }
    
    return basePrice;
  }

  /**
   * Calculate addon price with quantity
   */
  static calculateAddonPrice(
    addon: ProductOption,
    quantity: number = 1
  ): number {
    const basePrice = parseFloat(addon.base_price);
    return basePrice * quantity;
  }

  /**
   * Calculate total with excess hours costs for venues
   */
  static calculateTotalWithExcessHours(
    basePrice: number,
    venues: Array<{ id: number; standalone_excess_hour_price: string }>,
    venueAdditionalHours: Record<number, number>
  ): number {
    let total = basePrice;

    venues.forEach(venue => {
      const additionalHours = venueAdditionalHours[venue.id] || 0;
      const excessPrice = parseFloat(venue.standalone_excess_hour_price || '0');
      total += additionalHours * excessPrice;
    });

    return total;
  }

  /**
   * Calculate price with tax
   */
  static calculatePriceWithTax(
    price: number,
    taxRate: string | number
  ): number {
    const rate = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate;
    const taxMultiplier = 1 + (rate / 100);
    return price * taxMultiplier;
  }

  /**
   * Format price for display
   */
  static formatPrice(
    amount: string | number,
    currency: string = 'PHP'
  ): string {
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
  }

  /**
   * Check if product is available for booking
   */
  static isProductAvailable(
    product: ProductOption,
    bookingDate?: string
  ): boolean {
    if (!product.is_active) {
      return false;
    }

    if (bookingDate && product.advance_booking_days) {
      const booking = new Date(bookingDate);
      const today = new Date();
      const daysDifference = Math.ceil((booking.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDifference < product.advance_booking_days) {
        return false;
      }
      
      if (product.maximum_booking_days && daysDifference > product.maximum_booking_days) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filter products by availability
   */
  static filterAvailableProducts(
    products: ProductOption[],
    bookingDate?: string
  ): ProductOption[] {
    return products.filter(product => 
      this.isProductAvailable(product, bookingDate)
    );
  }

  /**
   * Group products by category
   */
  static groupProductsByCategory(products: ProductOption[]): Record<string, ProductOption[]> {
    return products.reduce((grouped, product) => {
      const categoryName = product.category_name || 'Uncategorized';
      if (!grouped[categoryName]) {
        grouped[categoryName] = [];
      }
      grouped[categoryName].push(product);
      return grouped;
    }, {} as Record<string, ProductOption[]>);
  }

  /**
   * Sort products by sort order and name
   */
  static sortProducts(products: ProductOption[]): ProductOption[] {
    return [...products].sort((a, b) => {
      // First sort by sort_order
      if (a.sort_order !== b.sort_order) {
        return a.sort_order - b.sort_order;
      }
      // Then by name
      return a.name.localeCompare(b.name);
    });
  }

  // Error handling

  /**
   * Handle products API errors
   */
  static handleProductsError(error: unknown): string {
    return ErrorHandler.extractMessage(error);
  }
}

export default ProductsApi;