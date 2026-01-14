// Discounts Settings Page - Standardized Version
// Migrated to use the unified settings system

import React from 'react';
import { LocalOffer as DiscountIcon } from '@mui/icons-material';
import { PermissionAwareSettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';
import { useDiscounts } from '../../../hooks/useProducts';
import type { Discount, CreateDiscountData, UpdateDiscountData } from '../../../types/products.types';
import type { ModernFormSection } from '../../../components/common/ModernForm';

// Table columns configuration
const columns: SettingsTableColumn<Discount>[] = [
  {
    key: 'name',
    label: 'Discount Name',
    sortable: true,
    searchable: true,
  },
  {
    key: 'code',
    label: 'Code',
    render: (value) => value ? String(value) : '-',
  },
  {
    key: 'discount_type_display',
    label: 'Type',
    render: (value) => String(value),
  },
  {
    key: 'value',
    label: 'Value',
    align: 'center',
    render: (value, row) => {
      const discount = row as Discount;
      if (discount.discount_type === 'PERCENTAGE') {
        return `${value}%`;
      } else if (discount.discount_type === 'FREE_HOURS') {
        return `${value} hours`;
      }
      return `${discount.currency} ${value}`;
    },
  },
  {
    key: 'application_type_display',
    label: 'Application',
    render: (value) => String(value),
  },
  {
    key: 'current_uses',
    label: 'Uses',
    align: 'center',
    render: (value, row) => {
      const discount = row as Discount;
      if (discount.max_uses) {
        return `${value}/${discount.max_uses}`;
      }
      return String(value || 0);
    },
  },
  {
    key: 'valid_until',
    label: 'Expires',
    render: (value) => value ? new Date(String(value)).toLocaleDateString() : 'No expiry',
  },
  {
    key: 'is_valid_now',
    label: 'Status',
    align: 'center',
    render: (value, row) => {
      const discount = row as Discount;
      if (!discount.is_active) return 'Inactive';
      return value ? 'Valid' : 'Expired';
    },
  },
];

// Form sections
const formSections: ModernFormSection[] = [
  {
    title: 'Basic Information',
    fields: [
      {
        name: 'name',
        label: 'Discount Name',
        type: 'text',
        required: true,
        placeholder: 'e.g., Early Bird Special',
        helperText: 'A descriptive name for this discount',
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        multiline: true,
        rows: 3,
        placeholder: 'Describe when and how this discount applies...',
        helperText: 'Description shown to clients',
      },
      {
        name: 'code',
        label: 'Discount Code',
        type: 'text',
        placeholder: 'SAVE20',
        helperText: 'Leave empty for automatic discounts',
      },
    ],
  },
  {
    title: 'Discount Configuration',
    fields: [
      {
        name: 'discount_type',
        label: 'Discount Type',
        type: 'select',
        required: true,
        helperText: 'How the discount value should be applied',
        options: [
          { value: 'PERCENTAGE', label: 'Percentage Off' },
          { value: 'FIXED', label: 'Fixed Amount Off' },
          { value: 'FREE_HOURS', label: 'Free Hours' },
        ],
      },
      {
        name: 'value',
        label: 'Discount Value',
        type: 'number',
        required: true,
        helperText: 'The discount amount (percentage, dollars, or hours)',
      },
      {
        name: 'application_type',
        label: 'Application Type',
        type: 'select',
        required: true,
        helperText: 'How clients can apply this discount',
        options: [
          { value: 'AUTOMATIC', label: 'Automatic' },
          { value: 'CODE_REQUIRED', label: 'Code Required' },
          { value: 'ADMIN_ONLY', label: 'Admin Only' },
        ],
      },
    ],
  },
  {
    title: 'Validity Period',
    fields: [
      {
        name: 'valid_from',
        label: 'Valid From',
        type: 'text',
        required: true,
        placeholder: 'YYYY-MM-DD',
        helperText: 'When this discount becomes active (YYYY-MM-DD format)',
      },
      {
        name: 'valid_until',
        label: 'Valid Until',
        type: 'text',
        placeholder: 'YYYY-MM-DD',
        helperText: 'Leave empty for no expiry date (YYYY-MM-DD format)',
      },
    ],
  },
  {
    title: 'Usage Limits',
    fields: [
      {
        name: 'max_uses',
        label: 'Maximum Total Uses',
        type: 'number',
        helperText: 'Leave empty for unlimited uses',
      },
      {
        name: 'max_uses_per_client',
        label: 'Maximum Uses Per Client',
        type: 'number',
        helperText: 'Leave empty for unlimited uses per client',
      },
      {
        name: 'minimum_order_amount',
        label: 'Minimum Order Amount',
        type: 'number',
        helperText: 'Minimum order value required',
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
        helperText: 'Active discounts are available for use',
      },
    ],
  },
];

// Default values for new discounts
const defaultDiscount: Discount = {
  id: 0,
  name: '',
  code: null,
  description: '',
  discount_type: 'PERCENTAGE',
  discount_type_display: 'Percentage Off',
  application_type: 'CODE_REQUIRED',
  application_type_display: 'Code Required',
  value: '0',
  is_active: true,
  valid_from: new Date().toISOString().split('T')[0],
  valid_until: null,
  currency: 'USD',
  max_uses: null,
  max_uses_per_client: null,
  current_uses: 0,
  minimum_order_amount: null,
  minimum_hours: null,
  applicable_products: [],
  applicable_categories: [],
  is_valid_now: true,
  applicable_products_count: 0,
  applicable_categories_count: 0,
  usage_percentage: null,
  created_at: '',
  updated_at: '',
};

export const Discounts = () => {
  // Get discounts
  const {
    discounts = [],
    isLoadingDiscounts,
    discountsError,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    refetchDiscounts,
    isCreatingDiscount,
    isUpdatingDiscount,
    isDeletingDiscount,
  } = useDiscounts();

  // Settings page configuration
  const config: SettingsPageConfig<Discount> = {
    page: {
      title: 'Promotional Discounts',
      subtitle: 'Manage promotional discounts and special offers',
      icon: React.createElement(DiscountIcon),
      breadcrumbs: [
        { label: 'Settings', href: '/settings' },
        { label: 'Commerce', href: '/settings/commerce' },
        { label: 'Discounts' },
      ],
    },

    table: {
      columns,
      searchFields: ['name', 'code', 'description'],
      defaultSort: { key: 'name', order: 'asc' },
      emptyState: {
        icon: React.createElement(DiscountIcon),
        title: 'No Discounts Found',
        description: 'Create your first discount to start offering promotions.',
      },
    },

    form: {
      title: 'Promotional Discount',
      subtitle: 'Configure discount settings and validity conditions.',
      sections: formSections,
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
  const handleRefresh = () => refetchDiscounts();

  const handleCreate = async (data: Discount) => {
    const createData: CreateDiscountData = {
      name: data.name,
      code: data.code || null,
      description: data.description,
      discount_type: data.discount_type,
      application_type: data.application_type,
      value: data.value,
      is_active: data.is_active,
      valid_from: data.valid_from,
      valid_until: data.valid_until || null,
      max_uses: data.max_uses,
      max_uses_per_client: data.max_uses_per_client,
      minimum_order_amount: data.minimum_order_amount,
      minimum_hours: data.minimum_hours,
    };

    return new Promise<void>((resolve, reject) => {
      createDiscount(createData, {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  const handleUpdate = async (id: string | number, data: Discount) => {
    const updateData: UpdateDiscountData = {
      name: data.name,
      code: data.code || null,
      description: data.description,
      discount_type: data.discount_type,
      application_type: data.application_type,
      value: data.value,
      is_active: data.is_active,
      valid_from: data.valid_from,
      valid_until: data.valid_until || null,
      max_uses: data.max_uses,
      max_uses_per_client: data.max_uses_per_client,
      minimum_order_amount: data.minimum_order_amount,
      minimum_hours: data.minimum_hours,
    };

    return new Promise<void>((resolve, reject) => {
      updateDiscount({
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
      deleteDiscount(Number(id), {
        onSuccess: () => resolve(),
        onError: reject,
      });
    });
  };

  return (
    <PermissionAwareSettingsPage
      config={config}
      requiredPermissions={['can_manage_financial_settings']}
      data={discounts}
      defaultValues={defaultDiscount}
      isLoading={isLoadingDiscounts}
      error={discountsError?.message}
      onRefresh={handleRefresh}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      isCreating={isCreatingDiscount}
      isUpdating={isUpdatingDiscount}
      isDeleting={isDeletingDiscount}
    />
  );
};

export default Discounts;