// frontend/client-portal/src/types/products.types.ts

// Base types for products domain
export interface ProductCategory {
  id: number;
  name: string;
  description: string;
  slug: string;
  parent: number | null;
  is_active: boolean;
  sort_order: number;
  requires_venue: boolean;
  typical_duration_hours: number | null;
  full_path: string;
  level: number;
  children_count: number;
  products_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProductCategoryTree extends ProductCategory {
  children: ProductCategory[];
}

export interface ProductOption {
  id: number;
  name: string;
  description: string;
  category: number;
  category_name: string;
  category_path: string;
  
  // Pricing
  pricing_model: 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';
  pricing_model_display: string;
  base_price: string; // Decimal as string
  currency: string;
  tax_rate: string; // Decimal as string
  formatted_price: string;
  price_with_tax: string; // Decimal as string
  
  // Product configuration
  type: 'PRODUCT' | 'PACKAGE';
  type_display: string;
  is_active: boolean;
  is_featured: boolean;
  allow_multiple: boolean;
  requires_approval: boolean;
  
  // Time-based configuration
  has_excess_hours: boolean;
  included_hours: number | null;
  excess_hour_price: string | null; // Decimal as string
  minimum_hours: number | null;
  maximum_hours: number | null;
  
  // Booking constraints
  advance_booking_days: number;
  maximum_booking_days: number | null;
  
  // Business metadata
  sku: string | null;
  sort_order: number;
  event_type: number | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface Discount {
  id: number;
  name: string;
  code: string | null;
  description: string;
  currency: string;
  
  // Discount configuration
  discount_type: 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS';
  discount_type_display: string;
  application_type: 'AUTOMATIC' | 'CODE_REQUIRED' | 'ADMIN_ONLY';
  application_type_display: string;
  value: string; // Decimal as string
  
  // Validity
  is_active: boolean;
  valid_from: string; // Date as string
  valid_until: string | null; // Date as string
  
  // Usage limits
  max_uses: number | null;
  max_uses_per_client: number | null;
  current_uses: number;
  
  // Minimum requirements
  minimum_order_amount: string | null; // Decimal as string
  minimum_hours: number | null;
  
  // Applicable items
  applicable_products: number[];
  applicable_categories: number[];
  
  // Computed fields
  is_valid_now: boolean;
  applicable_products_count: number;
  applicable_categories_count: number;
  usage_percentage: number | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface DiscountDetail {
  id: number;
  name: string;
  code: string | null;
  description: string;
  currency: string;

  // Discount configuration
  discount_type: 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS';
  discount_type_display: string;
  application_type: 'AUTOMATIC' | 'CODE_REQUIRED' | 'ADMIN_ONLY';
  application_type_display: string;
  value: string;

  // Validity
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;

  // Usage limits
  max_uses: number | null;
  max_uses_per_client: number | null;
  current_uses: number;

  // Minimum requirements
  minimum_order_amount: string | null;
  minimum_hours: number | null;

  // Applicable items
  applicable_products: ProductOption[];
  applicable_categories: ProductCategory[];

  // Computed fields
  is_valid_now: boolean;
  applicable_products_count: number;
  applicable_categories_count: number;
  usage_percentage: number | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

// Request/Response types for API operations
export interface ProductCategoryCreateRequest {
  name: string;
  description?: string;
  parent?: number | null;
  is_active?: boolean;
  sort_order?: number;
  requires_venue?: boolean;
  typical_duration_hours?: number | null;
}

export interface ProductCategoryUpdateRequest extends Partial<ProductCategoryCreateRequest> {}

export interface ProductOptionCreateRequest {
  name: string;
  description: string;
  category: number;
  pricing_model?: 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';
  base_price: string;
  currency?: string;
  tax_rate?: string;
  type: 'PRODUCT' | 'PACKAGE';
  is_active?: boolean;
  is_featured?: boolean;
  allow_multiple?: boolean;
  requires_approval?: boolean;
  has_excess_hours?: boolean;
  included_hours?: number | null;
  excess_hour_price?: string | null;
  minimum_hours?: number | null;
  maximum_hours?: number | null;
  advance_booking_days?: number;
  maximum_booking_days?: number | null;
  sku?: string | null;
  sort_order?: number;
  event_type?: number | null;
}

export interface ProductOptionUpdateRequest extends Partial<ProductOptionCreateRequest> {}

export interface DiscountCreateRequest {
  name: string;
  code?: string | null;
  description: string;
  discount_type: 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS';
  application_type?: 'AUTOMATIC' | 'CODE_REQUIRED' | 'ADMIN_ONLY';
  value: string;
  is_active?: boolean;
  valid_from: string;
  valid_until?: string | null;
  max_uses?: number | null;
  max_uses_per_client?: number | null;
  minimum_order_amount?: string | null;
  minimum_hours?: number | null;
  applicable_products?: number[];
  applicable_categories?: number[];
}

export interface DiscountUpdateRequest extends Partial<DiscountCreateRequest> {}

// Validation and utility types
export interface DiscountValidationRequest {
  code: string;
  order_amount?: number;
  order_hours?: number;
  client_id?: number;
}

export interface DiscountValidationResponse {
  valid: boolean;
  discount: Discount | null;
  discount_amount: number;
  error?: string;
}

export interface ProductPricingRequest {
  product_id: number;
  quantity?: number;
  guest_count?: number;
  duration_hours?: number;
  event_date?: string;
  additional_options?: Record<string, any>;
}

export interface ProductPricingResponse {
  base_price: number;
  final_price: number;
  tax_amount: number;
  total_price: number;
  breakdown: {
    base: number;
    excess_hours?: number;
    quantity_discount?: number;
    guest_count_adjustment?: number;
    date_premium?: number;
    taxes: number;
  };
  currency: string;
}

// Booking/Cart related types
export interface ProductSelectionItem {
  product: ProductOption;
  quantity: number;
  selected_options?: Record<string, any>;
  calculated_price?: number;
  duration_hours?: number;
  guest_count?: number;
}

export interface CartItem {
  id: string; // Unique cart item ID
  product_option: ProductOption;
  quantity: number;
  unit_price: number;
  total_price: number;
  options?: Record<string, any>;
  notes?: string;
  added_at: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  applied_discount?: Discount;
  currency: string;
  updated_at: string;
}

// Filter and search types
export interface ProductCategoryFilters {
  parent?: number | null;
  is_active?: boolean;
  requires_venue?: boolean;
  search?: string;
  level?: number;
}

export interface ProductOptionFilters {
  category?: number;
  type?: 'PRODUCT' | 'PACKAGE';
  pricing_model?: 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';
  is_active?: boolean;
  is_featured?: boolean;
  event_type?: number;
  min_price?: number;
  max_price?: number;
  has_excess_hours?: boolean;
  search?: string;
  guest_count?: number;
  duration_hours?: number;
}

export interface DiscountFilters {
  discount_type?: 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS';
  application_type?: 'AUTOMATIC' | 'CODE_REQUIRED' | 'ADMIN_ONLY';
  is_active?: boolean;
  is_valid?: boolean;
  search?: string;
  category?: number;
  product?: number;
}

// UI state types
export interface ProductSelectionState {
  selectedProducts: ProductSelectionItem[];
  cart: Cart;
  appliedDiscount: Discount | null;
  isCalculatingPricing: boolean;
  pricingErrors: Record<string, string>;
}

export interface ProductCatalogState {
  categories: ProductCategory[];
  products: ProductOption[];
  selectedCategory: number | null;
  filters: ProductOptionFilters;
  view: 'grid' | 'list';
  sortBy: 'name' | 'price' | 'featured' | 'category';
  sortOrder: 'asc' | 'desc';
}

// Event integration types (for booking flow)
export interface EventProductSelection {
  product_option: number;
  quantity: number;
  final_price: number;
  num_participants?: number;
  duration_hours?: number;
  options?: Record<string, any>;
}

// Analytics and reporting types
export interface ProductAnalytics {
  product_id: number;
  total_bookings: number;
  total_revenue: number;
  average_rating: number | null;
  popularity_rank: number;
  seasonal_demand: Record<string, number>;
  client_feedback: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface CategoryAnalytics {
  category_id: number;
  total_products: number;
  active_products: number;
  total_bookings: number;
  total_revenue: number;
  top_products: ProductOption[];
  demand_trends: Record<string, number>;
}

// Error handling types
export interface ProductError {
  code: string;
  message: string;
  field?: string;
  product_id?: number;
  category_id?: number;
}

export interface ProductValidationError {
  product_id: number;
  field: string;
  message: string;
  current_value?: any;
  expected_value?: any;
}

// Pricing calculation types
export interface PricingCalculation {
  base_amount: number;
  quantity_multiplier: number;
  duration_multiplier: number;
  guest_count_adjustment: number;
  date_premium: number;
  category_discount: number;
  volume_discount: number;
  seasonal_adjustment: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  final_total: number;
  currency: string;
  breakdown_notes: string[];
}

// Availability types
export interface ProductAvailability {
  product_id: number;
  date: string;
  available: boolean;
  max_quantity: number;
  booked_quantity: number;
  remaining_quantity: number;
  time_slots?: string[];
  restrictions?: string[];
}

// Package/bundle types
export interface PackageComponent {
  id: number;
  package_id: number;
  product_option: ProductOption;
  quantity: number;
  is_optional: boolean;
  discount_percentage: number;
  sort_order: number;
}

export interface PackageBundle extends ProductOption {
  components: PackageComponent[];
  total_component_value: number;
  package_savings: number;
  savings_percentage: number;
}

// Recommendation types
export interface ProductRecommendation {
  product: ProductOption;
  score: number;
  reason: 'similar_bookings' | 'category_match' | 'price_range' | 'guest_count_fit' | 'seasonal_popular';
  description: string;
  confidence: number;
}

export interface RecommendationRequest {
  guest_count?: number;
  event_date?: string;
  budget_range?: {
    min: number;
    max: number;
  };
  preferred_categories?: number[];
  exclude_products?: number[];
  max_recommendations?: number;
}

// Export utility types for convenience
export type ProductType = 'PRODUCT' | 'PACKAGE';
export type PricingModel = 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';
export type DiscountType = 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS';
export type ApplicationType = 'AUTOMATIC' | 'CODE_REQUIRED' | 'ADMIN_ONLY';

// Form data types for UI components
export type ProductFormData = Omit<ProductOptionCreateRequest, 'base_price' | 'tax_rate' | 'excess_hour_price'> & {
  base_price: number;
  tax_rate: number;
  excess_hour_price: number | null;
};

export type CategoryFormData = ProductCategoryCreateRequest;

export type DiscountFormData = Omit<DiscountCreateRequest, 'value' | 'minimum_order_amount'> & {
  value: number;
  minimum_order_amount: number | null;
};