// Categories Settings Page - Standardized Version
// Migrated to use the unified settings system

import React from 'react';
import { Category as CategoryIcon } from '@mui/icons-material';
import { PermissionAwareSettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';
import { useProductCategories } from '../../../hooks/useProducts';
import type { ProductCategory, CreateCategoryData, UpdateCategoryData } from '../../../types/products.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';

// Table columns configuration
const columns: SettingsTableColumn<ProductCategory>[] = [
  {
    key: 'name',
    label: 'Category Name',
    sortable: true,
    searchable: true,
  },
  {
    key: 'full_path',
    label: 'Path',
    render: (value) => String(value || '-'),
  },
  {
    key: 'products_count',
    label: 'Products',
    align: 'center',
    render: (value) => String(value || 0),
  },
  {
    key: 'children_count',
    label: 'Subcategories',
    align: 'center',
    render: (value) => String(value || 0),
  },
  {
    key: 'sort_order',
    label: 'Order',
    align: 'center',
    sortable: true,
  },
  {
    key: 'requires_venue',
    label: 'Venue Required',
    align: 'center',
    render: (value) => value ? 'Yes' : 'No',
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

// Form sections
const formSections: ModernFormSection[] = [
  {
    title: 'Basic Information',
    fields: [
      {
        name: 'name',
        label: 'Category Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Wedding Photography',
        helperText: 'A descriptive name for this category',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        multiline: true,
        rows: 3,
        placeholder: 'Describe what products belong in this category...',
        helperText: 'Optional description for internal reference',
      },
      {
        name: 'parent',
        label: 'Parent Category',
        type: 'select',
        helperText: 'Leave empty for top-level category',
        options: [
          { value: '', label: 'No Parent (Top Level)' },
          // TODO: Add dynamic parent categories
        ],
      },
    ],
  },
  {
    title: 'Category Settings',
    fields: [
      {
        name: 'sort_order',
        label: 'Display Order',
        type: 'number',
        required: true,
        helperText: 'Order in which this category appears (lower numbers first)',
      },
      {
        name: 'requires_venue',
        label: 'Requires Venue',
        type: 'switch',
        helperText: 'Products in this category require a venue selection',
      },
      {
        name: 'typical_duration_hours',
        label: 'Typical Duration (Hours)',
        type: 'number',
        helperText: 'Default duration for products in this category',
      },
    ],
  },
  {
    title: 'Status',
    fields: [
      {
        name: 'is_active',
        label: 'Active',
        type: 'switch',
        helperText: 'Active categories are shown in product selection',
      },
    ],
  },
];

// Default values for new categories
const defaultCategory: ProductCategory = {
  id: 0,
  name: '',
  description: '',
  slug: '',
  parent: null,
  is_active: true,
  sort_order: 1,
  requires_venue: false,
  typical_duration_hours: null,
  full_path: '',
  level: 0,
  children_count: 0,
  products_count: 0,
  created_at: '',
  updated_at: '',
};

export const Categories = () => {
  // Get categories
  const {
    categories = [],
    isLoadingCategories,
    categoriesError,
    createCategory,
    updateCategory,
    deleteCategory,
    refetchCategories,
    isCreatingCategory,
    isUpdatingCategory,
    isDeletingCategory,
  } = useProductCategories();

  // Settings page configuration
  const config: SettingsPageConfig<ProductCategory> = {
    page: {
      title: 'Product Categories',
      subtitle: 'Organize your products into categories for better management',
      icon: React.createElement(CategoryIcon),
      breadcrumbs: [
        { label: 'Settings', href: '/settings' },
        { label: 'Commerce', href: '/settings/commerce' },
        { label: 'Categories' },
      ],
    },

    table: {
      columns,
      searchFields: ['name', 'description'],
      defaultSort: { key: 'sort_order', order: 'asc' },
      emptyState: {
        icon: React.createElement(CategoryIcon),
        title: 'No Categories Found',
        description: 'Create your first category to start organizing your products.',
      },
    },

    form: {
      title: 'Product Category',
      subtitle: 'Configure category settings and organization.',
      sections: formSections,
      maxWidth: 'md',
    },

    features: {
      create: true,
      edit: true,
      delete: true,
      duplicate: false,
      search: true,
      refresh: true,
    },
  };

  // Action handlers
  const handleRefresh = () => refetchCategories();

  const handleCreate = async (data: ProductCategory) => {
    const createData: CreateCategoryData = {
      name: data.name,
      description: data.description,
      parent: data.parent,
      is_active: data.is_active,
      sort_order: data.sort_order,
      requires_venue: data.requires_venue,
      typical_duration_hours: data.typical_duration_hours,
    };

    return new Promise<void>((resolve, reject) => {
      createCategory(createData, {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleUpdate = async (id: string | number, data: ProductCategory) => {
    const updateData: UpdateCategoryData = {
      name: data.name,
      description: data.description,
      parent: data.parent,
      is_active: data.is_active,
      sort_order: data.sort_order,
      requires_venue: data.requires_venue,
      typical_duration_hours: data.typical_duration_hours,
    };

    return new Promise<void>((resolve, reject) => {
      updateCategory({
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
      deleteCategory(Number(id), {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  return (
    <PermissionAwareSettingsPage
      config={config}
      requiredPermissions={['can_manage_financial_settings']}
      data={categories}
      defaultValues={defaultCategory}
      isLoading={isLoadingCategories}
      error={categoriesError?.message}
      onRefresh={handleRefresh}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      isCreating={isCreatingCategory}
      isUpdating={isUpdatingCategory}
      isDeleting={isDeletingCategory}
    />
  );
};

export default Categories;