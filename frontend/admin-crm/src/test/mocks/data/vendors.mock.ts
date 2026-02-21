import type {
  Vendor,
  VendorServiceCategory,
} from "../../../types/vendors.types";

export function createMockVendor(overrides: Partial<Vendor> = {}): Vendor {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  const serviceCategory: VendorServiceCategory =
    overrides.service_category || "PHOTOGRAPHY";
  return {
    id,
    name: `Vendor ${id}`,
    code: `VENDOR-${id}`,
    description: `Description for vendor ${id}`,
    service_category: serviceCategory,
    service_description: `Professional ${serviceCategory.toLowerCase()} services`,
    contact_name: "Maria Santos",
    contact_email: `vendor${id}@example.com`,
    contact_phone: "+639171234567",
    company_name: `Vendor ${id} Company`,
    address: "123 Vendor Street, Makati City",
    website: `https://vendor${id}.example.com`,
    pricing_notes: "Contact for pricing details",
    is_active: true,
    is_bookable: true,
    featured_image: null,
    sort_order: id,
    operating_rules: null,
    packages_count: 3,
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
    ...overrides,
  };
}

export function createMockVendors(count: number): Vendor[] {
  const vendorConfigs: Array<{
    name: string;
    category: VendorServiceCategory;
    company: string;
  }> = [
    {
      name: "Snap Studio Photography",
      category: "PHOTOGRAPHY",
      company: "Snap Studio Inc.",
    },
    {
      name: "FilmWorks Videography",
      category: "VIDEOGRAPHY",
      company: "FilmWorks Media",
    },
    {
      name: "Gourmet Catering Co.",
      category: "CATERING",
      company: "Gourmet Catering Co.",
    },
    {
      name: "DJ Max Entertainment",
      category: "DJ",
      company: "Max Entertainment Group",
    },
    {
      name: "Flora Designs",
      category: "FLORIST",
      company: "Flora Designs Studio",
    },
  ];
  return Array.from({ length: count }, (_, i) => {
    const config = vendorConfigs[i % vendorConfigs.length];
    return createMockVendor({
      id: i + 1,
      name: config.name,
      code: `VENDOR-${String(i + 1).padStart(3, "0")}`,
      service_category: config.category,
      company_name: config.company,
      is_active: i % 5 !== 0,
      is_bookable: i % 4 !== 0,
      sort_order: i + 1,
      packages_count: (i % 4) + 1,
    });
  });
}

export const mockVendors = createMockVendors(5);
