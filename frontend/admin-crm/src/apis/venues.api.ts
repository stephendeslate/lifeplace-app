// frontend/admin-crm/src/apis/venues.api.ts

import api from '../utils/api';
import type {
  VenueListItem,
  VenueDetail,
  VenueOperatingRules,
  CreateVenueData,
  UpdateVenueData,
  CreateOperatingRulesData,
  PackageVenue,
  PackageVenueInline,
  CreatePackageVenueData,
  BulkAssignVenuesData,
  VenueBlockedDate,
  CreateBlockedDateData,
  VenueTimeCalculation,
  CalculateTimesRequest,
  VenueAvailabilityResponse,
} from '../types/venues.types';
import type { PaginatedResponse } from '../types/common.types';

export interface VenueFilters {
  search?: string;
  is_active?: boolean;
  is_bookable?: boolean;
  is_overnight?: boolean;
}

export interface PackageVenueFilters {
  package_id?: number;
  venue_id?: number;
}

export interface BlockedDateFilters {
  venue_id?: number;
  start_date?: string;
  end_date?: string;
}

export const venuesApi = {
  // === Venues ===

  getVenues: async (filters?: VenueFilters): Promise<VenueListItem[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.is_bookable !== undefined) params.append('is_bookable', filters.is_bookable.toString());
    if (filters?.is_overnight !== undefined) params.append('is_overnight', filters.is_overnight.toString());

    const response = await api.get(`/venues/venues/?${params.toString()}`);
    const data = response.data as PaginatedResponse<VenueListItem> | VenueListItem[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getAllVenues: async (): Promise<VenueListItem[]> => {
    const response = await api.get<VenueListItem[]>('/venues/venues/all/');
    return response.data;
  },

  getActiveVenues: async (): Promise<VenueListItem[]> => {
    const response = await api.get<VenueListItem[]>('/venues/venues/active/');
    return response.data;
  },

  getVenue: async (id: number): Promise<VenueDetail> => {
    const response = await api.get<VenueDetail>(`/venues/venues/${id}/`);
    return response.data;
  },

  createVenue: async (data: CreateVenueData): Promise<VenueDetail> => {
    const response = await api.post<VenueDetail>('/venues/venues/', data);
    return response.data;
  },

  updateVenue: async (id: number, data: UpdateVenueData): Promise<VenueDetail> => {
    const response = await api.patch<VenueDetail>(`/venues/venues/${id}/`, data);
    return response.data;
  },

  deleteVenue: async (id: number): Promise<void> => {
    await api.delete(`/venues/venues/${id}/`);
  },

  // === Operating Rules ===

  getOperatingRules: async (venueId: number): Promise<VenueOperatingRules> => {
    const response = await api.get<VenueOperatingRules>(`/venues/venues/${venueId}/operating_rules/`);
    return response.data;
  },

  updateOperatingRules: async (venueId: number, data: CreateOperatingRulesData): Promise<VenueOperatingRules> => {
    const response = await api.patch<VenueOperatingRules>(`/venues/venues/${venueId}/operating_rules/`, data);
    return response.data;
  },

  // === Package Venues (venue-product assignment) ===

  getPackageVenues: async (filters?: PackageVenueFilters): Promise<PackageVenue[]> => {
    const params = new URLSearchParams();
    if (filters?.package_id) params.append('package_id', filters.package_id.toString());
    if (filters?.venue_id) params.append('venue_id', filters.venue_id.toString());

    const response = await api.get(`/venues/package-venues/?${params.toString()}`);
    const data = response.data as PaginatedResponse<PackageVenue> | PackageVenue[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getVenuesForPackage: async (packageId: number): Promise<PackageVenueInline[]> => {
    const response = await api.get<PackageVenueInline[]>(`/venues/package-venues/by_package/?package_id=${packageId}`);
    return response.data;
  },

  getPackagesForVenue: async (venueId: number): Promise<PackageVenue[]> => {
    const response = await api.get<PackageVenue[]>(`/venues/venues/${venueId}/packages/`);
    return response.data;
  },

  createPackageVenue: async (data: CreatePackageVenueData): Promise<PackageVenue> => {
    const response = await api.post<PackageVenue>('/venues/package-venues/', data);
    return response.data;
  },

  updatePackageVenue: async (id: number, data: Partial<CreatePackageVenueData>): Promise<PackageVenue> => {
    const response = await api.patch<PackageVenue>(`/venues/package-venues/${id}/`, data);
    return response.data;
  },

  deletePackageVenue: async (id: number): Promise<void> => {
    await api.delete(`/venues/package-venues/${id}/`);
  },

  bulkAssignVenues: async (data: BulkAssignVenuesData): Promise<PackageVenue[]> => {
    const response = await api.post<PackageVenue[]>('/venues/package-venues/bulk_assign/', data);
    return response.data;
  },

  // === Blocked Dates ===

  getBlockedDates: async (filters?: BlockedDateFilters): Promise<VenueBlockedDate[]> => {
    const params = new URLSearchParams();
    if (filters?.venue_id) params.append('venue_id', filters.venue_id.toString());
    if (filters?.start_date) params.append('start_date', filters.start_date);
    if (filters?.end_date) params.append('end_date', filters.end_date);

    const response = await api.get(`/venues/blocked-dates/?${params.toString()}`);
    const data = response.data as PaginatedResponse<VenueBlockedDate> | VenueBlockedDate[];
    return Array.isArray(data) ? data : data.results || [];
  },

  createBlockedDate: async (data: CreateBlockedDateData): Promise<VenueBlockedDate> => {
    const response = await api.post<VenueBlockedDate>('/venues/blocked-dates/', data);
    return response.data;
  },

  deleteBlockedDate: async (id: number): Promise<void> => {
    await api.delete(`/venues/blocked-dates/${id}/`);
  },

  // === Availability & Time Calculations ===

  getVenueAvailability: async (
    venueId: number,
    startDate: string,
    endDate: string
  ): Promise<VenueAvailabilityResponse> => {
    const response = await api.get<VenueAvailabilityResponse>(
      `/venues/venues/${venueId}/availability/?start_date=${startDate}&end_date=${endDate}`
    );
    return response.data;
  },

  calculateTimes: async (venueId: number, data: CalculateTimesRequest): Promise<VenueTimeCalculation> => {
    const response = await api.post<VenueTimeCalculation>(`/venues/venues/${venueId}/calculate_times/`, data);
    return response.data;
  },
};

export default venuesApi;
