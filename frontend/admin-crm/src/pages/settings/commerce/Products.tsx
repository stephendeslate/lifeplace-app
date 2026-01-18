// Products Settings Page - Standardized Version
// Migrated to use the unified settings system

import React from 'react';
import { Inventory as ProductIcon } from '@mui/icons-material';
import { PermissionAwareSettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';
import { useProducts, useProductCategories } from '../../../hooks/useProducts';
import type { ProductOption, CreateProductData, UpdateProductData } from '../../../types/products.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';

// Table columns configuration
const columns: SettingsTableColumn<ProductOption>[] = [
  {
    key: 'name',
    label: 'Product Name',
    sortable: true,
    searchable: true,
  },
  {
    key: 'type_display',
    label: 'Type',
    render: (value) => String(value),
  },
  {
    key: 'category_name',
    label: 'Category',
    render: (value) => String(value || '-'),
  },
  {
    key: 'formatted_price',
    label: 'Price',
    align: 'right',
    render: (value) => String(value),
  },
  {
    key: 'pricing_model_display',
    label: 'Pricing Model',
    render: (value) => String(value),
  },
  {
    key: 'is_featured',
    label: 'Featured',
    align: 'center',
    render: (value) => value ? '⭐' : '-',
  },
  {
    key: 'is_active',
    label: 'Status',
    align: 'center',
    render: (value) => value ? 'Active' : 'Inactive',
  },
  {
    key: 'updated_at',
    label: 'Last Modified',
    sortable: true,
    render: (value) => value ? new Date(String(value)).toLocaleDateString() : '-',
  },
];

// Create form sections dynamically with categories
const createFormSections = (categories: Array<{ id: number; name: string }>): ModernFormSection[] => [
  {
    title: 'Basic Information',
    fields: [
      {
        name: 'name',
        label: 'Product Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Wedding Photography Package',
        helperText: 'A descriptive name for this product or package',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        multiline: true,
        rows: 3,
        placeholder: 'Describe what this product includes...',
        helperText: 'Detailed description shown to clients',
      },
      {
        name: 'type',
        label: 'Type',
        type: 'select',
        required: true,
        helperText: 'Whether this is an individual product or a package bundle',
        options: [
          { value: 'PRODUCT', label: 'Product (Individual Service)' },
          { value: 'PACKAGE', label: 'Package (Bundle of Services)' },
        ],
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        required: true,
        helperText: 'Select the category this product belongs to',
        options: categories.map(cat => ({ value: cat.id, label: cat.name })),
      },
    ],
  },
  {
    title: 'Pricing',
    fields: [
      {
        name: 'pricing_model',
        label: 'Pricing Model',
        type: 'select',
        required: true,
        helperText: 'How this product is priced',
        options: [
          { value: 'FIXED', label: 'Fixed Price' },
          { value: 'HOURLY', label: 'Hourly Rate' },
          { value: 'TIERED', label: 'Tiered Pricing' },
          { value: 'CUSTOM', label: 'Custom Quote' },
        ],
      },
      {
        name: 'base_price',
        label: 'Base Price',
        type: 'number',
        required: true,
        helperText: 'Base price in your default currency',
      },
      {
        name: 'is_tax_inclusive',
        label: 'Tax Inclusive',
        type: 'switch',
        helperText: 'If enabled, the base price already includes tax',
      },
    ],
  },
  {
    title: 'Settings',
    fields: [
      {
        name: 'is_active',
        label: 'Active',
        type: 'switch',
        helperText: 'Active products are available for booking',
      },
      {
        name: 'is_featured',
        label: 'Featured',
        type: 'switch',
        helperText: 'Featured products are highlighted to clients',
      },
      {
        name: 'allow_multiple',
        label: 'Allow Multiple',
        type: 'switch',
        helperText: 'Clients can select multiple quantities of this product',
      },
      {
        name: 'requires_approval',
        label: 'Requires Approval',
        type: 'switch',
        helperText: 'Bookings with this product require admin approval',
      },
    ],
  },
];

// Default values for new products
const defaultProduct: ProductOption = {
  id: 0,
  name: '',
  description: '',
  category: 0,
  category_name: '',
  category_path: '',
  pricing_model: 'FIXED',
  pricing_model_display: 'Fixed Price',
  base_price: '0.00',
  currency: 'USD',
  is_tax_inclusive: false,
  type: 'PRODUCT',
  type_display: 'Product',
  is_active: true,
  is_featured: false,
  allow_multiple: false,
  requires_approval: false,
  minimum_hours: null,
  maximum_hours: null,
  advance_booking_days: 30,
  maximum_booking_days: null,
  event_days: null,
  sku: null,
  sort_order: 1,
  event_type_ids: [],
  event_type_names: [],
  formatted_price: '$0.00',
  price_with_tax: null,
  featured_image: null,
  gallery_images: [],
  created_at: '',
  updated_at: '',
};

export const Products = () => {
  // Get products and categories
  const {
    products = [],
    isLoadingProducts,
    productsError,
    createProduct,
    updateProduct,
    deleteProduct,
    refetchProducts,
    isCreatingProduct,
    isUpdatingProduct,
    isDeletingProduct,
  } = useProducts();

  // Get categories for the form dropdown
  const { categories = [] } = useProductCategories();

  // Settings page configuration
  const config: SettingsPageConfig<ProductOption> = {
    page: {
      title: 'Products & Packages',
      subtitle: 'Manage your service offerings and package bundles',
      icon: React.createElement(ProductIcon),
      breadcrumbs: [
        { label: 'Settings', href: '/settings' },
        { label: 'Commerce', href: '/settings/commerce' },
        { label: 'Products & Packages' },
      ],
    },

    table: {
      columns,
      searchFields: ['name', 'description'],
      defaultSort: { key: 'name', order: 'asc' },
      emptyState: {
        icon: React.createElement(ProductIcon),
        title: 'No Products Found',
        description: 'Create your first product or package to start offering services.',
      },
    },

    form: {
      title: 'Product & Package',
      subtitle: 'Configure your service offerings and pricing.',
      sections: createFormSections(categories),
      maxWidth: 'lg',
    },

    features: {
      create: true,
      edit: true,
      delete: true,
      duplicate: true,
      search: true,
      refresh: true,
    },
  };

  // Action handlers
  const handleRefresh = () => refetchProducts();

  const handleCreate = async (data: ProductOption) => {
    const createData: CreateProductData = {
      name: data.name,
      description: data.description,
      category: data.category,
      pricing_model: data.pricing_model,
      base_price: data.base_price,
      is_tax_inclusive: data.is_tax_inclusive,
      type: data.type,
      is_active: data.is_active,
      is_featured: data.is_featured,
      allow_multiple: data.allow_multiple,
      requires_approval: data.requires_approval,
    };

    return new Promise<void>((resolve, reject) => {
      createProduct({ data: createData }, {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleUpdate = async (id: string | number, data: ProductOption) => {
    const updateData: UpdateProductData = {
      name: data.name,
      description: data.description,
      category: data.category,
      pricing_model: data.pricing_model,
      base_price: data.base_price,
      is_tax_inclusive: data.is_tax_inclusive,
      type: data.type,
      is_active: data.is_active,
      is_featured: data.is_featured,
      allow_multiple: data.allow_multiple,
      requires_approval: data.requires_approval,
    };

    return new Promise<void>((resolve, reject) => {
      updateProduct({
        id: Number(id),
        data: updateData
      }, {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleDelete = async (id: string | number) => {
    return new Promise<void>((resolve, reject) => {
      deleteProduct(Number(id), {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  return (
    <PermissionAwareSettingsPage
      config={config}
      requiredPermissions={['can_manage_financial_settings']}
      data={products}
      defaultValues={defaultProduct}
      isLoading={isLoadingProducts}
      error={productsError?.message}
      onRefresh={handleRefresh}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      isCreating={isCreatingProduct}
      isUpdating={isUpdatingProduct}
      isDeleting={isDeletingProduct}
    />
  );
};

export default Products;