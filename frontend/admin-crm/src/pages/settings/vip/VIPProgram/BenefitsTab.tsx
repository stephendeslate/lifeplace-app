import React from 'react';
import { CardGiftcard as BenefitIcon } from '@mui/icons-material';
import { type ModernFormSection } from '@/components/common/ModernForm';
import {
  PermissionAwareSettingsPage,
  type SettingsPageConfig,
  type SettingsTableColumn,
} from '@/components/common/settings';
import { useVIPTiers, useVIPBenefits } from '@/hooks/useVIP';
import type {
  VIPBenefit,
  CreateVIPBenefitData,
  UpdateVIPBenefitData,
  BenefitType,
  ApplicationMode,
} from '@/types/vip.types';

export const BenefitsTab = () => {
  const { activeTiers } = useVIPTiers();
  const {
    benefits = [],
    benefitTypes = [],
    isLoadingBenefits,
    benefitsError,
    createBenefit,
    updateBenefit,
    deleteBenefit,
    refetchBenefits,
    isCreatingBenefit,
    isUpdatingBenefit,
    isDeletingBenefit,
  } = useVIPBenefits();

  const columns: SettingsTableColumn<VIPBenefit>[] = [
    {
      key: 'tier_name',
      label: 'Tier',
      sortable: true,
    },
    {
      key: 'benefit_type_display',
      label: 'Benefit Type',
      sortable: true,
      searchable: true,
    },
    {
      key: 'value',
      label: 'Value',
      align: 'center',
      render: (value, row) => {
        const benefit = row as VIPBenefit;
        if (!value) return '-';
        if (benefit.benefit_type === 'PERCENTAGE_DISCOUNT') return `${value}%`;
        if (benefit.benefit_type === 'FREE_HOURS') return `${value} hrs`;
        if (benefit.benefit_type === 'FIXED_DISCOUNT') return `PHP ${value}`;
        return String(value);
      },
    },
    {
      key: 'application_mode_display',
      label: 'Mode',
    },
    {
      key: 'points_cost',
      label: 'Points Cost',
      align: 'center',
      render: (value) => (value ? String(value) : 'Free'),
    },
    {
      key: 'is_active',
      label: 'Status',
      align: 'center',
      render: (value) => (value ? 'Active' : 'Inactive'),
    },
  ];

  const formSections: ModernFormSection[] = [
    {
      title: 'Benefit Configuration',
      fields: [
        {
          name: 'tier',
          label: 'Tier',
          type: 'select',
          required: true,
          options: activeTiers.map((t) => ({ value: t.id, label: t.name })),
          helperText: 'Which tier receives this benefit',
        },
        {
          name: 'benefit_type',
          label: 'Benefit Type',
          type: 'select',
          required: true,
          options: benefitTypes.map((bt) => ({
            value: bt.value,
            label: bt.label,
          })),
          helperText: 'Type of benefit to grant',
        },
        {
          name: 'display_name',
          label: 'Display Name',
          type: 'text',
          placeholder: 'e.g., 10% VIP Discount',
          helperText: 'Client-facing name for this benefit',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          rows: 2,
          placeholder: 'Describe this benefit...',
        },
      ],
    },
    {
      title: 'Value & Application',
      fields: [
        {
          name: 'value',
          label: 'Benefit Value',
          type: 'number',
          helperText: 'Percentage, amount, or hours depending on type',
        },
        {
          name: 'application_mode',
          label: 'Application Mode',
          type: 'select',
          options: [
            { value: 'AUTOMATIC', label: 'Apply Automatically' },
            { value: 'REDEEMABLE', label: 'Redeemable from Pool' },
          ],
          helperText: 'How the benefit is applied',
        },
        {
          name: 'points_cost',
          label: 'Points Cost',
          type: 'number',
          helperText: 'Points required to redeem (0 = free)',
        },
      ],
    },
    {
      title: 'Usage Limits',
      fields: [
        {
          name: 'max_uses_per_booking',
          label: 'Max Uses Per Booking',
          type: 'number',
          helperText: 'Leave empty for unlimited',
        },
        {
          name: 'max_uses_per_month',
          label: 'Max Uses Per Month',
          type: 'number',
          helperText: 'Leave empty for unlimited',
        },
        {
          name: 'is_active',
          label: 'Active',
          type: 'switch',
          helperText: 'Only active benefits are available',
        },
      ],
    },
  ];

  const defaultBenefit: VIPBenefit = {
    id: 0,
    tier: activeTiers[0]?.id || 0,
    tier_name: '',
    benefit_type: 'PERCENTAGE_DISCOUNT' as BenefitType,
    benefit_type_display: '',
    application_mode: 'AUTOMATIC' as ApplicationMode,
    application_mode_display: '',
    value: null,
    applicable_products: [],
    max_uses_per_booking: null,
    max_uses_per_month: null,
    points_cost: 0,
    is_active: true,
    description: '',
    display_name: '',
    created_at: '',
    updated_at: '',
  };

  const config: SettingsPageConfig<VIPBenefit> = {
    page: {
      title: 'VIP Benefits',
      subtitle: 'Configure benefits for each tier',
      icon: React.createElement(BenefitIcon),
    },
    table: {
      columns,
      searchFields: ['tier_name', 'benefit_type_display', 'display_name'],
      defaultSort: { key: 'tier_name', order: 'asc' },
      emptyState: {
        icon: React.createElement(BenefitIcon),
        title: 'No Benefits Found',
        description: 'Create benefits to reward your VIP clients.',
      },
    },
    form: {
      title: 'VIP Benefit',
      subtitle: 'Configure benefit settings.',
      sections: formSections,
      maxWidth: 'md',
    },
    features: {
      create: true,
      edit: true,
      delete: true,
      search: true,
      refresh: true,
    },
  };

  const handleCreate = async (data: VIPBenefit) => {
    const createData: CreateVIPBenefitData = {
      tier: data.tier,
      benefit_type: data.benefit_type,
      application_mode: data.application_mode,
      value: data.value,
      max_uses_per_booking: data.max_uses_per_booking,
      max_uses_per_month: data.max_uses_per_month,
      points_cost: data.points_cost,
      is_active: data.is_active,
      description: data.description,
      display_name: data.display_name,
    };
    await createBenefit(createData);
  };

  const handleUpdate = async (id: string | number, data: VIPBenefit) => {
    const updateData: UpdateVIPBenefitData = {
      tier: data.tier,
      benefit_type: data.benefit_type,
      application_mode: data.application_mode,
      value: data.value,
      max_uses_per_booking: data.max_uses_per_booking,
      max_uses_per_month: data.max_uses_per_month,
      points_cost: data.points_cost,
      is_active: data.is_active,
      description: data.description,
      display_name: data.display_name,
    };
    await updateBenefit(Number(id), updateData);
  };

  const handleDelete = async (id: string | number) => {
    await deleteBenefit(Number(id));
  };

  // Fetch fresh benefit data before editing to ensure we have the latest values
  const handleFetchItem = async (id: string | number): Promise<VIPBenefit> => {
    const { vipApi } = await import('@/apis/vip.api');
    return vipApi.getBenefit(Number(id));
  };

  return (
    <PermissionAwareSettingsPage
      config={config}
      requiredPermissions={['can_manage_financial_settings']}
      data={benefits}
      defaultValues={defaultBenefit}
      isLoading={isLoadingBenefits}
      error={benefitsError?.message}
      onRefresh={refetchBenefits}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onFetchItem={handleFetchItem}
      isCreating={isCreatingBenefit}
      isUpdating={isUpdatingBenefit}
      isDeleting={isDeletingBenefit}
      hidePageHeader
    />
  );
};
