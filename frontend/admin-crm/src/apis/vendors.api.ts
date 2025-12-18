// frontend/admin-crm/src/apis/vendors.api.ts

import api from '../utils/api';
import type {
  VendorListItem,
  VendorDetail,
  VendorOperatingRules,
  CreateVendorData,
  UpdateVendorData,
  CreateOperatingRulesData,
  PackageVendor,
  PackageVendorInline,
  CreatePackageVendorData,
  BulkAssignVendorsData,
  VendorFilters,
  PackageVendorFilters,
  VendorServiceCategory,
} from '../types/vendors.types';
import type { PaginatedResponse } from '../types/common.types';

export const vendorsApi = {
  // === Vendors ===

  getVendors: async (filters?: VendorFilters): Promise<VendorListItem[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.is_bookable !== undefined) params.append('is_bookable', filters.is_bookable.toString());
    if (filters?.service_category) params.append('service_category', filters.service_category);

    const response = await api.get(`/vendors/vendors/?${params.toString()}`);
    const data = response.data as PaginatedResponse<VendorListItem> | VendorListItem[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getAllVendors: async (): Promise<VendorListItem[]> => {
    const response = await api.get('/vendors/vendors/all/');
    return response.data;
  },

  getActiveVendors: async (): Promise<VendorListItem[]> => {
    const response = await api.get('/vendors/vendors/active/');
    return response.data;
  },

  getVendor: async (id: number): Promise<VendorDetail> => {
    const response = await api.get<VendorDetail>(`/vendors/vendors/${id}/`);
    return response.data;
  },

  createVendor: async (data: CreateVendorData): Promise<VendorDetail> => {
    const response = await api.post<VendorDetail>('/vendors/vendors/', data);
    return response.data;
  },

  updateVendor: async (id: number, data: UpdateVendorData): Promise<VendorDetail> => {
    const response = await api.patch<VendorDetail>(`/vendors/vendors/${id}/`, data);
    return response.data;
  },

  deleteVendor: async (id: number): Promise<void> => {
    await api.delete(`/vendors/vendors/${id}/`);
  },

  // === Operating Rules ===

  getOperatingRules: async (vendorId: number): Promise<VendorOperatingRules> => {
    const response = await api.get<VendorOperatingRules>(`/vendors/vendors/${vendorId}/operating_rules/`);
    return response.data;
  },

  updateOperatingRules: async (vendorId: number, data: CreateOperatingRulesData): Promise<VendorOperatingRules> => {
    const response = await api.patch<VendorOperatingRules>(`/vendors/vendors/${vendorId}/operating_rules/`, data);
    return response.data;
  },

  // === Service Categories ===

  getServiceCategories: async (): Promise<Array<{ value: VendorServiceCategory; label: string }>> => {
    const response = await api.get('/vendors/vendors/categories/');
    return response.data;
  },

  // === Package Vendors (vendor-package assignment) ===

  getPackageVendors: async (filters?: PackageVendorFilters): Promise<PackageVendor[]> => {
    const params = new URLSearchParams();
    if (filters?.package_id) params.append('package_id', filters.package_id.toString());
    if (filters?.vendor_id) params.append('vendor_id', filters.vendor_id.toString());

    const response = await api.get(`/vendors/package-vendors/?${params.toString()}`);
    const data = response.data as PaginatedResponse<PackageVendor> | PackageVendor[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getVendorsForPackage: async (packageId: number): Promise<PackageVendorInline[]> => {
    const response = await api.get<PackageVendorInline[]>(`/vendors/package-vendors/by_package/?package_id=${packageId}`);
    return response.data;
  },

  getPackagesForVendor: async (vendorId: number): Promise<PackageVendor[]> => {
    const response = await api.get(`/vendors/vendors/${vendorId}/packages/`);
    return response.data;
  },

  createPackageVendor: async (data: CreatePackageVendorData): Promise<PackageVendor> => {
    const response = await api.post<PackageVendor>('/vendors/package-vendors/', data);
    return response.data;
  },

  updatePackageVendor: async (id: number, data: Partial<CreatePackageVendorData>): Promise<PackageVendor> => {
    const response = await api.patch<PackageVendor>(`/vendors/package-vendors/${id}/`, data);
    return response.data;
  },

  deletePackageVendor: async (id: number): Promise<void> => {
    await api.delete(`/vendors/package-vendors/${id}/`);
  },

  bulkAssignVendors: async (data: BulkAssignVendorsData): Promise<PackageVendor[]> => {
    const response = await api.post<PackageVendor[]>('/vendors/package-vendors/bulk_assign/', data);
    return response.data;
  },
};

export default vendorsApi;
