// frontend/admin-crm/src/types/products.types.ts

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
  children?: ProductCategory[];
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  parent?: number | null;
  is_active?: boolean;
  sort_order?: number;
  requires_venue?: boolean;
  typical_duration_hours?: number | null;
}

export type UpdateCategoryData = Partial<CreateCategoryData>;

export type PricingModel = 'FIXED' | 'HOURLY' | 'TIERED' | 'CUSTOM';
export type ProductType = 'PRODUCT' | 'PACKAGE';

export interface ProductOption {
  id: number;
  name: string;
  description: string;
  category: number;
  category_name: string;
  category_path: string;
  pricing_model: PricingModel;
  pricing_model_display: string;
  base_price: string;
  currency: string;
  tax_rate: string;
  is_tax_inclusive: boolean;
  type: ProductType;
  type_display: string;
  is_active: boolean;
  is_featured: boolean;
  allow_multiple: boolean;
  requires_approval: boolean;
  has_excess_hours: boolean;
  included_hours: number | null;
  excess_hour_price: string | null;
  minimum_hours: number | null;
  maximum_hours: number | null;
  advance_booking_days: number;
  maximum_booking_days: number | null;
  sku: string | null;
  sort_order: number;
  event_type: number | null;
  formatted_price: string;
  price_with_tax: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductData {
  name: string;
  description: string;
  category: number;
  pricing_model?: PricingModel;
  base_price: string;
  currency?: string;
  tax_rate?: string;
  type: ProductType;
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

export type UpdateProductData = Partial<CreateProductData>;

export type DiscountType = 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS';
export type ApplicationType = 'AUTOMATIC' | 'CODE_REQUIRED' | 'ADMIN_ONLY';

export interface Discount {
  id: number;
  name: string;
  code: string | null;
  description: string;
  discount_type: DiscountType;
  discount_type_display: string;
  application_type: ApplicationType;
  application_type_display: string;
  value: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string | null;
  currency: string;
  max_uses: number | null;
  max_uses_per_client: number | null;
  current_uses: number;
  minimum_order_amount: string | null;
  minimum_hours: number | null;
  applicable_products: number[];
  applicable_categories: number[];
  is_valid_now: boolean;
  applicable_products_count: number;
  applicable_categories_count: number;
  usage_percentage: number | null;
  created_at: string;
  updated_at: string;
}

export interface DiscountDetail extends Omit<Discount, 'applicable_products' | 'applicable_categories'> {
  applicable_products: ProductOption[];
  applicable_categories: ProductCategory[];
}

export interface CreateDiscountData {
  name: string;
  code?: string | null;
  description: string;
  discount_type: DiscountType;
  application_type?: ApplicationType;
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

export type UpdateDiscountData = Partial<CreateDiscountData>;

export interface ProductFilters {
  search?: string;
  type?: ProductType;
  is_active?: boolean;
  category_id?: number;
  is_featured?: boolean;
}

export interface CategoryFilters {
  search?: string;
  is_active?: boolean;
  parent_id?: number | null;
}

export interface DiscountFilters {
  search?: string;
  is_active?: boolean;
  is_valid?: boolean;
  discount_type?: DiscountType;
}

export interface DiscountValidation {
  is_valid: boolean;
  message: string;
  discount: Discount;
}

export interface ValidateDiscountData {
  client_id: number;
  products?: number[];
  categories?: number[];
  order_amount?: string;
  order_hours?: number;
}

// Form data interfaces for components
export interface ProductFormData {
  name: string;
  description: string;
  category: string;
  pricing_model: PricingModel;
  base_price: string;
  currency: string;
  tax_rate: string;
  type: ProductType;
  is_active: boolean;
  is_featured: boolean;
  allow_multiple: boolean;
  requires_approval: boolean;
  has_excess_hours: boolean;
  included_hours: string;
  excess_hour_price: string;
  minimum_hours: string;
  maximum_hours: string;
  advance_booking_days: string;
  maximum_booking_days: string;
  sku: string;
  sort_order: string;
}

export interface CategoryFormData {
  name: string;
  description: string;
  parent: string;
  is_active: boolean;
  sort_order: string;
  requires_venue: boolean;
  typical_duration_hours: string;
}

export interface DiscountFormData {
  name: string;
  code: string;
  description: string;
  discount_type: DiscountType;
  application_type: ApplicationType;
  value: string;
  is_active: boolean;
  valid_from: string;
  valid_until: string;
  max_uses: string;
  max_uses_per_client: string;
  minimum_order_amount: string;
  minimum_hours: string;
  applicable_products: number[];
  applicable_categories: number[];
}