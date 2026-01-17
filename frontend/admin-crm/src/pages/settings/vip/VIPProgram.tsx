// VIP & Loyalty Program Settings Page
// Settings, Tiers, and Benefits management with tabbed interface

import React, { useState } from 'react';
import {
  Box,
  Tab,
  Tabs,
  Chip,
} from '@mui/material';
import {
  Star as StarIcon,
  Settings as SettingsIcon,
  EmojiEvents as TierIcon,
  CardGiftcard as BenefitIcon,
} from '@mui/icons-material';

import {
  ModernPageHeader,
  ModernCard,
  ModernSettingsLayout,
} from '../../../components/common';
import { ModernForm, type ModernFormSection } from '../../../components/common/ModernForm';
import { PermissionAwareSettingsPage, type SettingsPageConfig, type SettingsTableColumn } from '../../../components/common/settings';

import { useVIPSettings, useVIPTiers, useVIPBenefits } from '../../../hooks/useVIP';
import type {
  VIPSettings,
  VIPTier,
  VIPBenefit,
  CreateVIPTierData,
  UpdateVIPTierData,
  CreateVIPBenefitData,
  UpdateVIPBenefitData,
  BenefitType,
  ApplicationMode,
} from '../../../types/vip.types';

// Tab panel component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vip-tabpanel-${index}`}
      aria-labelledby={`vip-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

// ============================================
// Program Settings Tab
// ============================================

const ProgramSettingsTab = () => {
  const { settings, isLoadingSettings, updateSettings, isUpdatingSettings } = useVIPSettings();
  const [formValues, setFormValues] = useState<Partial<VIPSettings>>({});

  React.useEffect(() => {
    if (settings) {
      setFormValues(settings);
    }
  }, [settings]);

  const settingsFormSections: ModernFormSection[] = [
    {
      title: 'Program Configuration',
      description: 'Enable or disable the VIP program and configure its name.',
      fields: [
        {
          name: 'is_program_enabled',
          label: 'Enable VIP Program',
          type: 'switch',
          helperText: 'Master toggle for the VIP & Loyalty program',
        },
        {
          name: 'program_name',
          label: 'Program Name',
          type: 'text',
          placeholder: 'VIP Program',
          helperText: 'Display name shown to clients',
        },
      ],
    },
    {
      title: 'Earning Methods',
      description: 'Configure how clients can earn VIP status.',
      fields: [
        {
          name: 'earning_automatic_enabled',
          label: 'Automatic Upgrades',
          type: 'switch',
          helperText: 'Automatically upgrade tiers based on spending or bookings',
        },
        {
          name: 'automatic_earning_type',
          label: 'Automatic Earning Criteria',
          type: 'select',
          helperText: 'What triggers automatic tier upgrades',
          options: [
            { value: 'SPENDING', label: 'Total Spending' },
            { value: 'BOOKINGS', label: 'Completed Bookings' },
            { value: 'BOTH', label: 'Both (Any Condition Met)' },
          ],
        },
        {
          name: 'earning_points_enabled',
          label: 'Points System',
          type: 'switch',
          helperText: 'Enable loyalty points for bookings',
        },
        {
          name: 'earning_manual_enabled',
          label: 'Manual Assignment',
          type: 'switch',
          helperText: 'Allow admins to manually assign tiers',
        },
      ],
    },
    {
      title: 'Points Configuration',
      description: 'Configure how points are earned (when points system is enabled).',
      fields: [
        {
          name: 'points_per_currency_spent',
          label: 'Points Per Currency Unit',
          type: 'number',
          helperText: 'Points earned per currency unit spent',
        },
        {
          name: 'points_currency_unit',
          label: 'Currency Unit Amount',
          type: 'number',
          helperText: 'Amount that earns the points above (e.g., 100 = 1 point per 100 PHP)',
        },
        {
          name: 'points_expiry_months',
          label: 'Points Expiry (Months)',
          type: 'number',
          helperText: 'Months until points expire (0 = never expire)',
        },
      ],
    },
    {
      title: 'VIP Status Expiration',
      description: 'Configure how VIP status expires.',
      fields: [
        {
          name: 'expiration_type',
          label: 'Expiration Type',
          type: 'select',
          options: [
            { value: 'NEVER', label: 'Never Expires' },
            { value: 'INACTIVITY', label: 'After X Months Inactivity' },
            { value: 'ANNUAL', label: 'Annual Renewal Required' },
          ],
        },
        {
          name: 'expiration_months',
          label: 'Expiration Months',
          type: 'number',
          helperText: 'Months for INACTIVITY or ANNUAL expiration',
        },
      ],
    },
    {
      title: 'Client Portal Visibility',
      description: 'Control what clients can see in their portal.',
      fields: [
        {
          name: 'show_vip_status_to_client',
          label: 'Show VIP Status',
          type: 'switch',
          helperText: 'Display VIP tier/status to clients',
        },
        {
          name: 'show_tier_progress_to_client',
          label: 'Show Tier Progress',
          type: 'switch',
          helperText: 'Show progress toward next tier',
        },
        {
          name: 'show_available_rewards_to_client',
          label: 'Show Available Rewards',
          type: 'switch',
          helperText: 'Display benefits and rewards',
        },
        {
          name: 'show_points_balance_to_client',
          label: 'Show Points Balance',
          type: 'switch',
          helperText: 'Display points balance to clients',
        },
      ],
    },
  ];

  const handleSaveSettings = async () => {
    await updateSettings(formValues);
  };

  if (isLoadingSettings) {
    return <Box sx={{ p: 3, textAlign: 'center' }}>Loading settings...</Box>;
  }

  const handleFormChange = (name: string, value: unknown) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  return (
    <ModernCard>
      <ModernForm
        sections={settingsFormSections}
        values={formValues}
        onChange={handleFormChange}
        onSubmit={handleSaveSettings}
        isSubmitting={isUpdatingSettings}
        submitLabel="Save Settings"
      />
    </ModernCard>
  );
};

// ============================================
// Tiers Tab
// ============================================

const TiersTab = () => {
  const {
    tiers = [],
    isLoadingTiers,
    tiersError,
    createTier,
    updateTier,
    deleteTier,
    refetchTiers,
    isCreatingTier,
    isUpdatingTier,
    isDeletingTier,
  } = useVIPTiers();

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
            {tier.is_default && (
              <Chip size="small" label="Default" variant="outlined" />
            )}
          </Box>
        );
      },
    },
    {
      key: 'min_total_spent',
      label: 'Min. Spending',
      render: (value) => value ? `PHP ${Number(value).toLocaleString()}` : '-',
    },
    {
      key: 'min_completed_bookings',
      label: 'Min. Bookings',
      align: 'center',
      render: (value) => value != null ? String(value) : '-',
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
      render: (value) => value ? 'Active' : 'Inactive',
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
      isCreating={isCreatingTier}
      isUpdating={isUpdatingTier}
      isDeleting={isDeletingTier}
      hidePageHeader
    />
  );
};

// ============================================
// Benefits Tab
// ============================================

const BenefitsTab = () => {
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
      render: (value) => value ? String(value) : 'Free',
    },
    {
      key: 'is_active',
      label: 'Status',
      align: 'center',
      render: (value) => value ? 'Active' : 'Inactive',
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
          options: activeTiers.map(t => ({ value: t.id, label: t.name })),
          helperText: 'Which tier receives this benefit',
        },
        {
          name: 'benefit_type',
          label: 'Benefit Type',
          type: 'select',
          required: true,
          options: benefitTypes.map(bt => ({ value: bt.value, label: bt.label })),
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
      isCreating={isCreatingBenefit}
      isUpdating={isUpdatingBenefit}
      isDeleting={isDeletingBenefit}
      hidePageHeader
    />
  );
};

// ============================================
// Main VIP Program Page
// ============================================

export const VIPProgram = () => {
  const [activeTab, setActiveTab] = useState(0);
  const { settings } = useVIPSettings();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <ModernSettingsLayout>
      <ModernPageHeader
        title="VIP & Loyalty Program"
        subtitle="Configure VIP tiers, benefits, and loyalty rewards"
        icon={<StarIcon />}
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Commerce' },
          { label: 'VIP & Loyalty' },
        ]}
        stats={[
          {
            label: 'Program Status',
            value: settings?.is_program_enabled ? 'Enabled' : 'Disabled',
          },
        ]}
        size="medium"
      />

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            aria-label="VIP program tabs"
          >
            <Tab
              icon={<SettingsIcon />}
              iconPosition="start"
              label="Program Settings"
              id="vip-tab-0"
              aria-controls="vip-tabpanel-0"
            />
            <Tab
              icon={<TierIcon />}
              iconPosition="start"
              label="Tiers"
              id="vip-tab-1"
              aria-controls="vip-tabpanel-1"
            />
            <Tab
              icon={<BenefitIcon />}
              iconPosition="start"
              label="Benefits"
              id="vip-tab-2"
              aria-controls="vip-tabpanel-2"
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <ProgramSettingsTab />
        </TabPanel>
        <TabPanel value={activeTab} index={1}>
          <TiersTab />
        </TabPanel>
        <TabPanel value={activeTab} index={2}>
          <BenefitsTab />
        </TabPanel>
    </ModernSettingsLayout>
  );
};

export default VIPProgram;
