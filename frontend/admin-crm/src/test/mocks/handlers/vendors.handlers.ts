// frontend/admin-crm/src/test/mocks/handlers/vendors.handlers.ts

import { http, HttpResponse, delay } from "msw";
import { mockVendors, createMockVendor } from "../data/vendors.mock";
import type {
  Vendor,
  PackageVendor,
  VendorServiceCategory,
} from "../../../types/vendors.types";

const BASE_URL = "http://localhost:8000/api";

// Mutable stores for testing mutations
let vendorsStore = [...mockVendors];
const packageVendorsStore: PackageVendor[] = [
  {
    id: 1,
    package: 1,
    package_name: "Wedding Photography Package",
    vendor: 1,
    vendor_name: "Snap Studio Photography",
    role: "PRIMARY",
    notes: "",
    is_confirmed: true,
    confirmed_at: "2024-06-15T10:00:00Z",
    created_at: "2024-06-15T10:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
  },
];

export const resetVendorsStore = () => {
  vendorsStore = [...mockVendors];
};

export const vendorsHandlers = [
  // === Vendors ===

  // GET /api/vendors/vendors/
  http.get(`${BASE_URL}/vendors/vendors/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const search = url.searchParams.get("search");
    const isActive = url.searchParams.get("is_active");
    const isBookable = url.searchParams.get("is_bookable");
    const serviceCategory = url.searchParams.get("service_category");

    let filtered = [...vendorsStore];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(searchLower) ||
          v.company_name.toLowerCase().includes(searchLower) ||
          v.contact_name.toLowerCase().includes(searchLower),
      );
    }
    if (isActive !== null && isActive !== undefined) {
      const isActiveBool = isActive === "true";
      filtered = filtered.filter((v) => v.is_active === isActiveBool);
    }
    if (isBookable !== null && isBookable !== undefined) {
      const isBookableBool = isBookable === "true";
      filtered = filtered.filter((v) => v.is_bookable === isBookableBool);
    }
    if (serviceCategory) {
      filtered = filtered.filter((v) => v.service_category === serviceCategory);
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/vendors/vendors/all/
  http.get(`${BASE_URL}/vendors/vendors/all/`, async () => {
    await delay(30);
    return HttpResponse.json(vendorsStore);
  }),

  // GET /api/vendors/vendors/active/
  http.get(`${BASE_URL}/vendors/vendors/active/`, async () => {
    await delay(30);
    const active = vendorsStore.filter((v) => v.is_active);
    return HttpResponse.json(active);
  }),

  // GET /api/vendors/vendors/categories/
  http.get(`${BASE_URL}/vendors/vendors/categories/`, async () => {
    await delay(30);
    return HttpResponse.json([
      { value: "PHOTOGRAPHY", label: "Photography" },
      { value: "VIDEOGRAPHY", label: "Videography" },
      { value: "CATERING", label: "Catering" },
      { value: "DJ", label: "DJ / Music" },
      { value: "FLORIST", label: "Florist" },
      { value: "DECORATOR", label: "Decorator" },
      { value: "MC", label: "Emcee / Host" },
      { value: "PHOTO_BOOTH", label: "Photo Booth" },
      { value: "ENTERTAINMENT", label: "Entertainment" },
      { value: "OTHER", label: "Other" },
    ]);
  }),

  // GET /api/vendors/vendors/:id/
  http.get(`${BASE_URL}/vendors/vendors/:id/`, async ({ params }) => {
    await delay(30);

    const id = parseInt(params.id as string);
    const vendor = vendorsStore.find((v) => v.id === id);

    if (!vendor) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    // Return as VendorDetail
    return HttpResponse.json({
      ...vendor,
      notes: "",
      tags: [],
    });
  }),

  // POST /api/vendors/vendors/
  http.post(`${BASE_URL}/vendors/vendors/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;
    const newVendor = createMockVendor({
      id: vendorsStore.length + 1,
      name: body.name as string,
      code: body.code as string,
      description: (body.description as string) || "",
      service_category:
        (body.service_category as VendorServiceCategory) || "OTHER",
      contact_name: (body.contact_name as string) || "",
      contact_email: (body.contact_email as string) || "",
      contact_phone: (body.contact_phone as string) || "",
      company_name: (body.company_name as string) || "",
      is_active: (body.is_active as boolean) ?? true,
      is_bookable: (body.is_bookable as boolean) ?? true,
    });

    vendorsStore.push(newVendor);
    return HttpResponse.json(
      { ...newVendor, notes: "", tags: [] },
      { status: 201 },
    );
  }),

  // PATCH /api/vendors/vendors/:id/
  http.patch(
    `${BASE_URL}/vendors/vendors/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = vendorsStore.findIndex((v) => v.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as Record<string, unknown>;
      vendorsStore[idx] = { ...vendorsStore[idx], ...updates } as Vendor;
      return HttpResponse.json({ ...vendorsStore[idx], notes: "", tags: [] });
    },
  ),

  // DELETE /api/vendors/vendors/:id/
  http.delete(`${BASE_URL}/vendors/vendors/:id/`, async ({ params }) => {
    await delay(50);

    const id = parseInt(params.id as string);
    const idx = vendorsStore.findIndex((v) => v.id === id);

    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found" }, { status: 404 });
    }

    vendorsStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // === Operating Rules ===

  // GET /api/vendors/vendors/:id/operating_rules/
  http.get(
    `${BASE_URL}/vendors/vendors/:id/operating_rules/`,
    async ({ params }) => {
      await delay(30);

      const id = parseInt(params.id as string);
      const vendor = vendorsStore.find((v) => v.id === id);

      if (!vendor) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      return HttpResponse.json({
        vendor: id,
        vendor_name: vendor.name,
        max_events_per_day: 2,
        min_booking_hours: 4,
        max_booking_hours: 12,
        min_advance_booking_days: 14,
        max_advance_booking_days: 365,
        blocked_dates: [],
        available_days: [0, 1, 2, 3, 4, 5, 6],
        break_between_events_hours: 2,
        setup_time_hours: 1,
        teardown_time_hours: 1,
        created_at: "2024-06-15T10:00:00Z",
        updated_at: "2024-06-15T10:00:00Z",
      });
    },
  ),

  // PATCH /api/vendors/vendors/:id/operating_rules/
  http.patch(
    `${BASE_URL}/vendors/vendors/:id/operating_rules/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const vendor = vendorsStore.find((v) => v.id === id);

      if (!vendor) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const body = (await request.json()) as Record<string, unknown>;
      return HttpResponse.json({
        vendor: id,
        vendor_name: vendor.name,
        max_events_per_day: 2,
        min_booking_hours: 4,
        max_booking_hours: 12,
        min_advance_booking_days: 14,
        max_advance_booking_days: 365,
        blocked_dates: [],
        available_days: [0, 1, 2, 3, 4, 5, 6],
        break_between_events_hours: 2,
        setup_time_hours: 1,
        teardown_time_hours: 1,
        ...body,
        updated_at: new Date().toISOString(),
      });
    },
  ),

  // GET /api/vendors/vendors/:id/packages/
  http.get(`${BASE_URL}/vendors/vendors/:id/packages/`, async ({ params }) => {
    await delay(30);

    const vendorId = parseInt(params.id as string);
    const filtered = packageVendorsStore.filter((pv) => pv.vendor === vendorId);
    return HttpResponse.json(filtered);
  }),

  // === Package Vendors ===

  // GET /api/vendors/package-vendors/
  http.get(`${BASE_URL}/vendors/package-vendors/`, async ({ request }) => {
    await delay(30);

    const url = new URL(request.url);
    const packageId = url.searchParams.get("package_id");
    const vendorId = url.searchParams.get("vendor_id");

    let filtered = [...packageVendorsStore];

    if (packageId) {
      filtered = filtered.filter((pv) => pv.package === parseInt(packageId));
    }
    if (vendorId) {
      filtered = filtered.filter((pv) => pv.vendor === parseInt(vendorId));
    }

    return HttpResponse.json({ results: filtered, count: filtered.length });
  }),

  // GET /api/vendors/package-vendors/by_package/
  http.get(
    `${BASE_URL}/vendors/package-vendors/by_package/`,
    async ({ request }) => {
      await delay(30);

      const url = new URL(request.url);
      const packageId = url.searchParams.get("package_id");

      const filtered = packageId
        ? packageVendorsStore.filter((pv) => pv.package === parseInt(packageId))
        : packageVendorsStore;

      return HttpResponse.json(
        filtered.map((pv) => ({
          id: pv.id,
          vendor: pv.vendor,
          vendor_name: pv.vendor_name,
          role: pv.role,
          notes: pv.notes,
          is_confirmed: pv.is_confirmed,
        })),
      );
    },
  ),

  // POST /api/vendors/package-vendors/
  http.post(`${BASE_URL}/vendors/package-vendors/`, async ({ request }) => {
    await delay(50);

    const body = (await request.json()) as Record<string, unknown>;
    const newPV: PackageVendor = {
      id: packageVendorsStore.length + 1,
      package: body.package as number,
      package_name: "Package",
      vendor: body.vendor as number,
      vendor_name: "Vendor",
      role: (body.role as string) || "PRIMARY",
      notes: (body.notes as string) || "",
      is_confirmed: false,
      confirmed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    packageVendorsStore.push(newPV);
    return HttpResponse.json(newPV, { status: 201 });
  }),

  // PATCH /api/vendors/package-vendors/:id/
  http.patch(
    `${BASE_URL}/vendors/package-vendors/:id/`,
    async ({ params, request }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = packageVendorsStore.findIndex((pv) => pv.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      const updates = (await request.json()) as Record<string, unknown>;
      packageVendorsStore[idx] = {
        ...packageVendorsStore[idx],
        ...updates,
      } as PackageVendor;
      return HttpResponse.json(packageVendorsStore[idx]);
    },
  ),

  // DELETE /api/vendors/package-vendors/:id/
  http.delete(
    `${BASE_URL}/vendors/package-vendors/:id/`,
    async ({ params }) => {
      await delay(50);

      const id = parseInt(params.id as string);
      const idx = packageVendorsStore.findIndex((pv) => pv.id === id);

      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found" }, { status: 404 });
      }

      packageVendorsStore.splice(idx, 1);
      return new HttpResponse(null, { status: 204 });
    },
  ),

  // POST /api/vendors/package-vendors/bulk_assign/
  http.post(
    `${BASE_URL}/vendors/package-vendors/bulk_assign/`,
    async ({ request }) => {
      await delay(50);

      const body = (await request.json()) as {
        package_id: number;
        vendor_ids: number[];
      };
      const newPVs: PackageVendor[] = body.vendor_ids.map((vendorId, i) => ({
        id: packageVendorsStore.length + i + 1,
        package: body.package_id,
        package_name: "Package",
        vendor: vendorId,
        vendor_name: `Vendor ${vendorId}`,
        role: "PRIMARY",
        notes: "",
        is_confirmed: false,
        confirmed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      packageVendorsStore.push(...newPVs);
      return HttpResponse.json(newPVs, { status: 201 });
    },
  ),
];
