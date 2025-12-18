// frontend/admin-crm/src/types/vendors.types.ts

export type VendorServiceCategory =
  | 'CATERING'
  | 'PHOTOGRAPHY'
  | 'VIDEOGRAPHY'
  | 'DJ'
  | 'FLORIST'
  | 'DECORATOR'
  | 'ENTERTAINMENT'
  | 'TRANSPORTATION'
  | 'MAKEUP'
  | 'RENTALS'
  | 'OFFICIANT'
  | 'COORDINATION'
  | 'OTHER';

export const VENDOR_SERVICE_CATEGORIES: Array<{
  value: VendorServiceCategory;
  label: string;
}> = [
  { value: 'CATERING', label: 'Catering' },
  { value: 'PHOTOGRAPHY', label: 'Photography' },
  { value: 'VIDEOGRAPHY', label: 'Videography' },
  { value: 'DJ', label: 'DJ / Music' },
  { value: 'FLORIST', label: 'Florist' },
  { value: 'DECORATOR', label: 'Decorator' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'TRANSPORTATION', label: 'Transportation' },
  { value: 'MAKEUP', label: 'Makeup & Styling' },
  { value: 'RENTALS', label: 'Equipment Rentals' },
  { value: 'OFFICIANT', label: 'Officiant' },
  { value: 'COORDINATION', label: 'Event Coordination' },
  { value: 'OTHER', label: 'Other' },
];

export interface VendorOperatingRules {
  id: number;
  // Lead time
  minimum_lead_days: number;
  // Service duration
  minimum_service_hours: string | null;
  maximum_service_hours: string | null;
  // Setup/Teardown
  setup_hours: string;
  teardown_hours: string;
  // Custom Rules
  custom_rules: Record<string, unknown>;
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface Vendor {
  id: number;
  name: string;
  code: string;
  description: string;
  service_category: VendorServiceCategory;
  service_description: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  company_name: string;
  address: string;
  website: string;
  pricing_notes: string;
  is_active: boolean;
  is_bookable: boolean;
  featured_image: string | null;
  sort_order: number;
  operating_rules: VendorOperatingRules | null;
  packages_count: number;
  created_at: string;
  updated_at: string;
}

export interface VendorListItem {
  id: number;
  name: string;
  code: string;
  service_category: VendorServiceCategory;
  is_active: boolean;
  is_bookable: boolean;
  featured_image: string | null;
  sort_order: number;
  has_operating_rules: boolean;
  packages_count: number;
}

export interface VendorDetail extends Vendor {
  packages: PackageVendorInfo[];
}

export interface PackageVendorInfo {
  id: number;
  name: string;
  notes: string;
  sort_order: number;
}

export interface CreateVendorData {
  name: string;
  code: string;
  description?: string;
  service_category?: VendorServiceCategory;
  service_description?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  company_name?: string;
  address?: string;
  website?: string;
  pricing_notes?: string;
  is_active?: boolean;
  is_bookable?: boolean;
  featured_image?: string | null;
  sort_order?: number;
  operating_rules?: CreateOperatingRulesData;
}

export type UpdateVendorData = Partial<CreateVendorData>;

export interface CreateOperatingRulesData {
  minimum_lead_days?: number;
  minimum_service_hours?: string | null;
  maximum_service_hours?: string | null;
  setup_hours?: string;
  teardown_hours?: string;
  custom_rules?: Record<string, unknown>;
}

// Package-Vendor relationship
export interface PackageVendor {
  id: number;
  package: number;
  package_name: string;
  vendor: number;
  vendor_name: string;
  vendor_code: string;
  vendor_service_category: VendorServiceCategory;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PackageVendorInline {
  id: number;
  vendor: number;
  vendor_name: string;
  vendor_code: string;
  vendor_service_category: VendorServiceCategory;
  notes: string;
  sort_order: number;
  operating_rules: VendorOperatingRules | null;
}

export interface CreatePackageVendorData {
  package: number;
  vendor: number;
  notes?: string;
  sort_order?: number;
}

export interface BulkAssignVendorsData {
  package_id: number;
  vendors: Array<{
    vendor_id: number;
    notes?: string;
    sort_order?: number;
  }>;
}

// Filter types
export interface VendorFilters {
  search?: string;
  is_active?: boolean;
  is_bookable?: boolean;
  service_category?: VendorServiceCategory;
}

export interface PackageVendorFilters {
  package_id?: number;
  vendor_id?: number;
}
