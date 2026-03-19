import React from 'react';
import { Box, Chip } from '@mui/material';
import { EmojiEvents as TierIcon } from '@mui/icons-material';
import { type ModernFormSection } from '@/components/common/ModernForm';
import {
  PermissionAwareSettingsPage,
  type SettingsPageConfig,
  type SettingsTableColumn,
} from '@/components/common/settings';
import { useVIPTiers } from '@/hooks/useVIP';
import { useSettingsPagination } from '@/hooks/useSettingsPagination';
import type { VIPTier, CreateVIPTierData, UpdateVIPTierData } from '@/types/vip.types';

export const TiersTab = () => {
  const paginationState = useSettingsPagination({ defaultPageSize: 25 });

  const {
    tiers = [],
    totalCount,
    pageCount,
    isLoadingTiers,
    tiersError,
    createTier,
    updateTier,
    deleteTier,
    refetchTiers,
    isCreatingTier,
    isUpdatingTier,
    isDeletingTier,
  } = useVIPTiers({
    page: paginationState.page,
    page_size: paginationState.pageSize,
    search: paginationState.search || undefined,
    ordering: paginationState.ordering || undefined,
  });

  const columns: SettingsTableColumn<VIPTier>[] = [
    {
      key: 'level',
      label: 'Level',
      sortable: true,
      align: 'center',
    },
    {
      key: 'name',
      label: 'Tier Name',
      sortable: true,
      searchable: true,
      render: (value, row) => {
        const tier = row as VIPTier;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: tier.color,
              }}
            />
            <span>{String(value)}</span>
            {tier.is_default && <Chip size="small" label="Default" variant="outlined" />}
          </Box>
        );
      },
    },
    {
      key: 'min_total_spent',
      label: 'Min. Spending',
      render: (value) => (value ? `PHP ${Number(value).toLocaleString()}` : '-'),
    },
    {
      key: 'min_completed_bookings',
      label: 'Min. Bookings',
      align: 'center',
      render: (value) => (value != null ? String(value) : '-'),
    },
    {
      key: 'benefits_count',
      label: 'Benefits',
      align: 'center',
    },
    {
      key: 'members_count',
      label: 'Members',
      align: 'center',
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
      title: 'Tier Information',
      fields: [
        {
          name: 'name',
          label: 'Tier Name',
          type: 'text',
          required: true,
          placeholder: 'e.g., Gold, Platinum',
          helperText: 'Display name for this tier',
        },
        {
          name: 'description',
          label: 'Description',
          type: 'textarea',
          rows: 2,
          placeholder: 'Describe the benefits of this tier...',
        },
        {
          name: 'level',
          label: 'Tier Level',
          type: 'number',
          required: true,
          helperText: 'Higher levels are more exclusive (0 = Standard)',
        },
        {
          name: 'is_default',
          label: 'Default Tier',
          type: 'switch',
          helperText: 'New clients start at the default tier',
        },
      ],
    },
    {
      title: 'Qualification Thresholds',
      description: 'Set the criteria for automatic tier qualification.',
      fields: [
        {
          name: 'min_total_spent',
          label: 'Minimum Total Spending',
          type: 'number',
          helperText: 'Total spending required to qualify',
        },
        {
          name: 'min_completed_bookings',
          label: 'Minimum Completed Bookings',
          type: 'number',
          helperText: 'Number of completed bookings required',
        },
        {
          name: 'min_points_required',
          label: 'Minimum Points Balance',
          type: 'number',
          helperText: 'Points required to qualify (if points enabled)',
        },
      ],
    },
    {
      title: 'Display Settings',
      fields: [
        {
          name: 'color',
          label: 'Tier Color',
          type: 'text',
          placeholder: '#FFD700',
          helperText: 'Hex color for tier badge (e.g., #FFD700 for gold)',
        },
        {
          name: 'icon',
          label: 'Icon Name',
          type: 'text',
          placeholder: 'star',
          helperText: 'Icon identifier for display',
        },
        {
          name: 'is_active',
          label: 'Active',
          type: 'switch',
          helperText: 'Only active tiers are available',
        },
      ],
    },
  ];

  const defaultTier: VIPTier = {
    id: 0,
    name: '',
    slug: '',
    description: '',
    level: tiers.length,
    is_default: false,
    min_total_spent: null,
    min_completed_bookings: null,
    min_points_required: null,
    color: '#6B7280',
    icon: '',
    is_active: true,
    benefits_count: 0,
    members_count: 0,
    created_at: '',
    updated_at: '',
  };

  const config: SettingsPageConfig<VIPTier> = {
    page: {
      title: 'VIP Tiers',
      subtitle: 'Configure tier levels and qualification criteria',
      icon: React.createElement(TierIcon),
    },
    table: {
      columns,
      searchFields: ['name', 'description'],
      defaultSort: { key: 'level', order: 'asc' },
      emptyState: {
        icon: React.createElement(TierIcon),
        title: 'No Tiers Found',
        description: 'Create your first VIP tier to get started.',
      },
    },
    form: {
      title: 'VIP Tier',
      subtitle: 'Configure tier settings and qualification thresholds.',
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

  const handleCreate = async (data: VIPTier) => {
    const createData: CreateVIPTierData = {
      name: data.name,
      description: data.description,
      level: data.level,
      is_default: data.is_default,
      min_total_spent: data.min_total_spent,
      min_completed_bookings: data.min_completed_bookings,
      min_points_required: data.min_points_required,
      color: data.color,
      icon: data.icon,
      is_active: data.is_active,
    };
    await createTier(createData);
  };

  const handleUpdate = async (id: string | number, data: VIPTier) => {
    const updateData: UpdateVIPTierData = {
      name: data.name,
      description: data.description,
      level: data.level,
      is_default: data.is_default,
      min_total_spent: data.min_total_spent,
      min_completed_bookings: data.min_completed_bookings,
      min_points_required: data.min_points_required,
      color: data.color,
      icon: data.icon,
      is_active: data.is_active,
    };
    await updateTier(Number(id), updateData);
  };

  const handleDelete = async (id: string | number) => {
    await deleteTier(Number(id));
  };

  // Fetch fresh tier data before editing to ensure we have the latest values
  const handleFetchItem = async (id: string | number): Promise<VIPTier> => {
    const { vipApi } = await import('@/apis/vip.api');
    return vipApi.getTier(Number(id));
  };

  return (
    <PermissionAwareSettingsPage
      config={config}
      requiredPermissions={['can_manage_financial_settings']}
      data={tiers}
      defaultValues={defaultTier}
      isLoading={isLoadingTiers}
      error={tiersError?.message}
      onRefresh={refetchTiers}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onFetchItem={handleFetchItem}
      isCreating={isCreatingTier}
      isUpdating={isUpdatingTier}
      isDeleting={isDeletingTier}
      hidePageHeader
      pagination={{
        totalCount,
        currentPage: paginationState.currentPage,
        pageSize: paginationState.pageSize,
        pageCount,
        onPageChange: paginationState.onPageChange,
        onPageSizeChange: paginationState.onPageSizeChange,
      }}
      onSearchChange={paginationState.setSearch}
      onFilterChange={paginationState.setFilters}
      onSortChange={paginationState.setOrdering}
    />
  );
};
