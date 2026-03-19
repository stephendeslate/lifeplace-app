import React, { useState } from 'react';
import { Box } from '@mui/material';
import { ModernCard } from '@/components/common';
import { ModernForm, type ModernFormSection } from '@/components/common/ModernForm';
import { useVIPSettings } from '@/hooks/useVIP';
import type { VIPSettings } from '@/types/vip.types';

export const ProgramSettingsTab = () => {
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
    setFormValues((prev) => ({ ...prev, [name]: value }));
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
