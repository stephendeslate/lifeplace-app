// frontend/admin-crm/src/hooks/useProducts.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { productsApi } from '../apis/products.api';
import { useToastActions } from '../contexts/ToastContext';
import type {
  ProductFilters,
  CategoryFilters,
  DiscountFilters,
  UpdateCategoryData,
  UpdateProductData,
  UpdateDiscountData,
  ValidateDiscountData,
} from '../types/products.types';

export const useProductCategories = (filters?: CategoryFilters & { use_pagination?: boolean }) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
    refetch: refetchCategories
  } = useQuery({
    queryKey: ['product-categories', filters],
    queryFn: () => productsApi.getCategories(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const useCategoriesTree = () => {
    return useQuery({
      queryKey: ['product-categories-tree'],
      queryFn: () => productsApi.getCategoriesTree(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const useRootCategories = () => {
    return useQuery({
      queryKey: ['product-categories-root'],
      queryFn: () => productsApi.getRootCategories(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const useCategory = (id: number) => {
    return useQuery({
      queryKey: ['product-category', id],
      queryFn: () => productsApi.getCategory(id),
      enabled: !!id,
    });
  };

  // Mutations
  const createCategoryMutation = useMutation({
    mutationFn: productsApi.createCategory,
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      showSuccess('Category Created', `${newCategory.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to create category'
        : 'Failed to create category';
      showError('Create Failed', message);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateCategoryData }) => 
      productsApi.updateCategory(id, data),
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      queryClient.invalidateQueries({ queryKey: ['product-category', updatedCategory.id] });
      showSuccess('Category Updated', `${updatedCategory.name} has been updated successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update category'
        : 'Failed to update category';
      showError('Update Failed', message);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: productsApi.deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-categories'] });
      showSuccess('Category Deleted', 'Category has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete category'
        : 'Failed to delete category';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    categories,
    
    // Loading states
    isLoadingCategories,
    isCreatingCategory: createCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
    
    // Error states
    categoriesError,
    createError: createCategoryMutation.error,
    updateError: updateCategoryMutation.error,
    deleteError: deleteCategoryMutation.error,
    
    // Actions
    createCategory: createCategoryMutation.mutate,
    updateCategory: updateCategoryMutation.mutate,
    deleteCategory: deleteCategoryMutation.mutate,
    refetchCategories,
    
    // Hooks for specific queries
    useCategoriesTree,
    useRootCategories,
    useCategory,
  };
};

export const useProducts = (filters?: ProductFilters & { use_pagination?: boolean }) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: products = [],
    isLoading: isLoadingProducts,
    error: productsError,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productsApi.getProducts(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useProduct = (id: number) => {
    return useQuery({
      queryKey: ['product', id],
      queryFn: () => productsApi.getProduct(id),
      enabled: !!id,
    });
  };

  const useProductsOnly = () => {
    return useQuery({
      queryKey: ['products-only'],
      queryFn: () => productsApi.getProductsOnly(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const usePackagesOnly = () => {
    return useQuery({
      queryKey: ['packages-only'],
      queryFn: () => productsApi.getPackagesOnly(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const useActiveProducts = () => {
    return useQuery({
      queryKey: ['active-products'],
      queryFn: () => productsApi.getActiveProducts(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const useFeaturedProducts = () => {
    return useQuery({
      queryKey: ['featured-products'],
      queryFn: () => productsApi.getFeaturedProducts(),
      staleTime: 5 * 60 * 1000,
    });
  };

  const useProductsByCategory = (categoryId: number) => {
    return useQuery({
      queryKey: ['products-by-category', categoryId],
      queryFn: () => productsApi.getProductsByCategory(categoryId),
      enabled: !!categoryId,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: productsApi.createProduct,
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showSuccess('Product Created', `${newProduct.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to create product'
        : 'Failed to create product';
      showError('Create Failed', message);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateProductData }) => 
      productsApi.updateProduct(id, data),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product', updatedProduct.id] });
      showSuccess('Product Updated', `${updatedProduct.name} has been updated successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update product'
        : 'Failed to update product';
      showError('Update Failed', message);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: productsApi.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showSuccess('Product Deleted', 'Product has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete product'
        : 'Failed to delete product';
      showError('Delete Failed', message);
    },
  });

  return {
    // Data
    products,
    
    // Loading states
    isLoadingProducts,
    isCreatingProduct: createProductMutation.isPending,
    isUpdatingProduct: updateProductMutation.isPending,
    isDeletingProduct: deleteProductMutation.isPending,
    
    // Error states
    productsError,
    createError: createProductMutation.error,
    updateError: updateProductMutation.error,
    deleteError: deleteProductMutation.error,
    
    // Actions
    createProduct: createProductMutation.mutate,
    updateProduct: updateProductMutation.mutate,
    deleteProduct: deleteProductMutation.mutate,
    refetchProducts,
    
    // Hooks for specific queries
    useProduct,
    useProductsOnly,
    usePackagesOnly,
    useActiveProducts,
    useFeaturedProducts,
    useProductsByCategory,
  };
};

export const useDiscounts = (filters?: DiscountFilters & { use_pagination?: boolean }) => {
  const { showSuccess, showError } = useToastActions();
  const queryClient = useQueryClient();

  // Queries
  const {
    data: discounts = [],
    isLoading: isLoadingDiscounts,
    error: discountsError,
    refetch: refetchDiscounts
  } = useQuery({
    queryKey: ['discounts', filters],
    queryFn: () => productsApi.getDiscounts(filters),
    staleTime: 5 * 60 * 1000,
  });

  const useDiscount = (id: number) => {
    return useQuery({
      queryKey: ['discount', id],
      queryFn: () => productsApi.getDiscount(id),
      enabled: !!id,
    });
  };

  const useValidDiscounts = () => {
    return useQuery({
      queryKey: ['valid-discounts'],
      queryFn: () => productsApi.getValidDiscounts(),
      staleTime: 2 * 60 * 1000, // 2 minutes
    });
  };

  const useDiscountsByType = (type: string) => {
    return useQuery({
      queryKey: ['discounts-by-type', type],
      queryFn: () => productsApi.getDiscountsByType(type),
      enabled: !!type,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Mutations
  const createDiscountMutation = useMutation({
    mutationFn: productsApi.createDiscount,
    onSuccess: (newDiscount) => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      showSuccess('Discount Created', `${newDiscount.name} has been created successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to create discount'
        : 'Failed to create discount';
      showError('Create Failed', message);
    },
  });

  const updateDiscountMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDiscountData }) => 
      productsApi.updateDiscount(id, data),
    onSuccess: (updatedDiscount) => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      queryClient.invalidateQueries({ queryKey: ['discount', updatedDiscount.id] });
      showSuccess('Discount Updated', `${updatedDiscount.name} has been updated successfully.`);
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to update discount'
        : 'Failed to update discount';
      showError('Update Failed', message);
    },
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: productsApi.deleteDiscount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      showSuccess('Discount Deleted', 'Discount has been deleted successfully.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to delete discount'
        : 'Failed to delete discount';
      showError('Delete Failed', message);
    },
  });

  const incrementUsageMutation = useMutation({
    mutationFn: productsApi.incrementDiscountUsage,
    onSuccess: (updatedDiscount) => {
      queryClient.invalidateQueries({ queryKey: ['discounts'] });
      queryClient.invalidateQueries({ queryKey: ['discount', updatedDiscount.id] });
      showSuccess('Usage Updated', 'Discount usage has been incremented.');
    },
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to increment usage'
        : 'Failed to increment usage';
      showError('Update Failed', message);
    },
  });

  const validateDiscountMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ValidateDiscountData }) =>
      productsApi.validateDiscountForOrder(id, data),
    onError: (error: unknown) => {
      const message = (error && typeof error === 'object' && 'response' in error)
        ? String((error as { response?: { data?: { detail?: string } } }).response?.data?.detail) || 'Failed to validate discount'
        : 'Failed to validate discount';
      showError('Validation Failed', message);
    },
  });

  return {
    // Data
    discounts,
    
    // Loading states
    isLoadingDiscounts,
    isCreatingDiscount: createDiscountMutation.isPending,
    isUpdatingDiscount: updateDiscountMutation.isPending,
    isDeletingDiscount: deleteDiscountMutation.isPending,
    isIncrementingUsage: incrementUsageMutation.isPending,
    isValidatingDiscount: validateDiscountMutation.isPending,
    
    // Error states
    discountsError,
    createError: createDiscountMutation.error,
    updateError: updateDiscountMutation.error,
    deleteError: deleteDiscountMutation.error,
    incrementError: incrementUsageMutation.error,
    validateError: validateDiscountMutation.error,
    
    // Actions
    createDiscount: createDiscountMutation.mutate,
    updateDiscount: updateDiscountMutation.mutate,
    deleteDiscount: deleteDiscountMutation.mutate,
    incrementUsage: incrementUsageMutation.mutate,
    validateDiscount: validateDiscountMutation.mutate,
    refetchDiscounts,
    
    // Hooks for specific queries
    useDiscount,
    useValidDiscounts,
    useDiscountsByType,
    
    // Mutation results
    validationResult: validateDiscountMutation.data,
  };
};