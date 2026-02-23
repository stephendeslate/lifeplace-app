// frontend/admin-crm/src/apis/products.api.ts

import api from '../utils/api';
import type {
  ProductCategory,
  ProductOption,
  Discount,
  DiscountDetail,
  CreateCategoryData,
  UpdateCategoryData,
  CreateProductData,
  UpdateProductData,
  CreateDiscountData,
  UpdateDiscountData,
  ProductFilters,
  CategoryFilters,
  DiscountFilters,
  DiscountValidation,
  ValidateDiscountData,
} from '../types/products.types';
import type { PaginatedResponse } from '../types/common.types';

export const productsApi = {
  // Categories
  getCategories: async (
    filters?: CategoryFilters & { use_pagination?: boolean },
  ): Promise<ProductCategory[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.parent_id !== undefined) {
      params.append('parent_id', filters.parent_id?.toString() || '0');
    }

    // Use the /all endpoint for non-paginated results
    const endpoint = filters?.use_pagination
      ? `/products/categories/?${params.toString()}`
      : `/products/categories/all/?${params.toString()}`;

    const response = await api.get(endpoint);

    // Handle both paginated and non-paginated responses
    if (filters?.use_pagination) {
      const data = response.data as PaginatedResponse<ProductCategory> | ProductCategory[];
      return Array.isArray(data) ? data : data.results || [];
    } else {
      return Array.isArray(response.data) ? response.data : [];
    }
  },

  getCategoriesTree: async (): Promise<ProductCategory[]> => {
    const response = await api.get<ProductCategory[]>('/products/categories/tree/');
    return response.data;
  },

  getRootCategories: async (): Promise<ProductCategory[]> => {
    const response = await api.get('/products/categories/root/');
    const data = response.data as PaginatedResponse<ProductCategory> | ProductCategory[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getCategory: async (id: number): Promise<ProductCategory> => {
    const response = await api.get<ProductCategory>(`/products/categories/${id}/`);
    return response.data;
  },

  createCategory: async (data: CreateCategoryData): Promise<ProductCategory> => {
    const response = await api.post<ProductCategory>('/products/categories/', data);
    return response.data;
  },

  updateCategory: async (id: number, data: UpdateCategoryData): Promise<ProductCategory> => {
    const response = await api.patch<ProductCategory>(`/products/categories/${id}/`, data);
    return response.data;
  },

  deleteCategory: async (id: number): Promise<void> => {
    await api.delete(`/products/categories/${id}/`);
  },

  // Products
  getProducts: async (
    filters?: ProductFilters & { use_pagination?: boolean },
  ): Promise<ProductOption[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.category_id) params.append('category_id', filters.category_id.toString());
    if (filters?.is_featured !== undefined)
      params.append('is_featured', filters.is_featured.toString());

    // Use the /all endpoint for non-paginated results
    const endpoint = filters?.use_pagination
      ? `/products/products/?${params.toString()}`
      : `/products/products/all/?${params.toString()}`;

    const response = await api.get(endpoint);

    // Handle both paginated and non-paginated responses
    if (filters?.use_pagination) {
      const data = response.data as PaginatedResponse<ProductOption> | ProductOption[];
      return Array.isArray(data) ? data : data.results || [];
    } else {
      return Array.isArray(response.data) ? response.data : [];
    }
  },

  getProductsOnly: async (): Promise<ProductOption[]> => {
    const response = await api.get('/products/products/products/');
    const data = response.data as PaginatedResponse<ProductOption> | ProductOption[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getPackagesOnly: async (): Promise<ProductOption[]> => {
    const response = await api.get('/products/products/packages/');
    const data = response.data as PaginatedResponse<ProductOption> | ProductOption[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getActiveProducts: async (): Promise<ProductOption[]> => {
    const response = await api.get('/products/products/active/');
    const data = response.data as PaginatedResponse<ProductOption> | ProductOption[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getFeaturedProducts: async (): Promise<ProductOption[]> => {
    const response = await api.get('/products/products/featured/');
    const data = response.data as PaginatedResponse<ProductOption> | ProductOption[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getProductsByCategory: async (categoryId: number): Promise<ProductOption[]> => {
    const response = await api.get(`/products/products/by_category/?category_id=${categoryId}`);
    const data = response.data as PaginatedResponse<ProductOption> | ProductOption[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getProduct: async (id: number): Promise<ProductOption> => {
    const response = await api.get<ProductOption>(`/products/products/${id}/`);
    return response.data;
  },

  createProduct: async (data: CreateProductData, formData?: FormData): Promise<ProductOption> => {
    // Transform event_type_ids to input_event_type_ids for backend
    const transformedData = {
      ...data,
      input_event_type_ids: data.event_type_ids,
    };
    delete (transformedData as Record<string, unknown>).event_type_ids;

    // Use FormData if provided (for image uploads), otherwise use JSON
    if (formData) {
      // FormData already has the fields appended, but we need to rename event_type_ids
      // The form dialog already handles this by sending as JSON string
      if (formData.has('event_type_ids')) {
        const eventTypeIds = formData.get('event_type_ids');
        formData.delete('event_type_ids');
        if (eventTypeIds) {
          formData.append('input_event_type_ids', eventTypeIds as string);
        }
      }
      const response = await api.post<ProductOption>('/products/products/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
    const response = await api.post<ProductOption>('/products/products/', transformedData);
    return response.data;
  },

  updateProduct: async (
    id: number,
    data: UpdateProductData,
    formData?: FormData,
  ): Promise<ProductOption> => {
    // Transform event_type_ids to input_event_type_ids for backend
    const transformedData = {
      ...data,
      input_event_type_ids: data.event_type_ids,
    };
    delete (transformedData as Record<string, unknown>).event_type_ids;

    // Use FormData if provided (for image uploads), otherwise use JSON
    if (formData) {
      // FormData already has the fields appended, but we need to rename event_type_ids
      if (formData.has('event_type_ids')) {
        const eventTypeIds = formData.get('event_type_ids');
        formData.delete('event_type_ids');
        if (eventTypeIds) {
          formData.append('input_event_type_ids', eventTypeIds as string);
        }
      }
      const response = await api.patch<ProductOption>(`/products/products/${id}/`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    }
    const response = await api.patch<ProductOption>(`/products/products/${id}/`, transformedData);
    return response.data;
  },

  deleteProduct: async (id: number): Promise<void> => {
    await api.delete(`/products/products/${id}/`);
  },

  // Discounts
  getDiscounts: async (
    filters?: DiscountFilters & { use_pagination?: boolean },
  ): Promise<Discount[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    if (filters?.is_valid !== undefined) params.append('is_valid', filters.is_valid.toString());
    if (filters?.discount_type) params.append('discount_type', filters.discount_type);

    // Use the /all endpoint for non-paginated results
    const endpoint = filters?.use_pagination
      ? `/products/discounts/?${params.toString()}`
      : `/products/discounts/all/?${params.toString()}`;

    const response = await api.get(endpoint);

    // Handle both paginated and non-paginated responses
    if (filters?.use_pagination) {
      const data = response.data as PaginatedResponse<Discount> | Discount[];
      return Array.isArray(data) ? data : data.results || [];
    } else {
      return Array.isArray(response.data) ? response.data : [];
    }
  },

  getValidDiscounts: async (): Promise<Discount[]> => {
    const response = await api.get('/products/discounts/valid/');
    const data = response.data as PaginatedResponse<Discount> | Discount[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getDiscountsByType: async (type: string): Promise<Discount[]> => {
    const response = await api.get(`/products/discounts/by_type/?type=${type}`);
    const data = response.data as PaginatedResponse<Discount> | Discount[];
    return Array.isArray(data) ? data : data.results || [];
  },

  getDiscount: async (id: number): Promise<DiscountDetail> => {
    const response = await api.get<DiscountDetail>(`/products/discounts/${id}/`);
    return response.data;
  },

  createDiscount: async (data: CreateDiscountData): Promise<Discount> => {
    const response = await api.post<Discount>('/products/discounts/', data);
    return response.data;
  },

  updateDiscount: async (id: number, data: UpdateDiscountData): Promise<Discount> => {
    const response = await api.patch<Discount>(`/products/discounts/${id}/`, data);
    return response.data;
  },

  deleteDiscount: async (id: number): Promise<void> => {
    await api.delete(`/products/discounts/${id}/`);
  },

  incrementDiscountUsage: async (id: number): Promise<Discount> => {
    const response = await api.post<Discount>(`/products/discounts/${id}/increment_usage/`);
    return response.data;
  },

  validateDiscountForOrder: async (
    id: number,
    data: ValidateDiscountData,
  ): Promise<DiscountValidation> => {
    const response = await api.post<DiscountValidation>(
      `/products/discounts/${id}/validate_for_order/`,
      data,
    );
    return response.data;
  },
};
