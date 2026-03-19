import React from 'react';
import { Chip, Typography } from '@mui/material';
import type { SettingsTableColumn } from '@/components/common/settings';
import type { BookingFlowStep, StepType } from '@/types/bookingflows';
import type { ModernFormSection } from '@/components/common/ModernForm';

export const STEP_TYPE_OPTIONS = [
  { value: 'introduction', label: 'Introduction' },
  { value: 'venue_selection', label: 'Venue Selection' },
  { value: 'date_time', label: 'Date & Time Selection' },
  { value: 'questionnaire', label: 'Questionnaire' },
  { value: 'package_selection', label: 'Package Selection' },
  { value: 'addon_selection', label: 'Add-on Selection' },
  { value: 'pricing_summary', label: 'Pricing Summary' },
  { value: 'contact_info', label: 'Contact Information' },
  { value: 'payment_info', label: 'Payment Information' },
  { value: 'confirmation', label: 'Confirmation' },
];

export const columns: SettingsTableColumn<BookingFlowStep>[] = [
  {
    key: 'order',
    label: 'Order',
    align: 'center',
    width: '60px',
    render: (value) =>
      React.createElement(Chip, {
        label: String(value),
        size: 'small',
        variant: 'outlined',
        color: 'default',
      }),
  },
  {
    key: 'step_type_display',
    label: 'Type',
    render: (value, row) => {
      const colors: Record<
        string,
        'primary' | 'info' | 'success' | 'warning' | 'secondary' | 'error' | 'default'
      > = {
        introduction: 'primary',
        venue_selection: 'info',
        date_time: 'info',
        questionnaire: 'success',
        package_selection: 'warning',
        addon_selection: 'warning',
        pricing_summary: 'secondary',
        contact_info: 'success',
        payment_info: 'error',
        confirmation: 'success',
      };

      return React.createElement(Chip, {
        label: String(value),
        size: 'small',
        color: colors[row.step_type as string] || 'default',
        variant: 'outlined',
      });
    },
  },
  {
    key: 'is_required',
    label: 'Required',
    align: 'center',
    render: (value) =>
      value
        ? React.createElement(Chip, {
            label: 'Required',
            size: 'small',
            color: 'error',
            variant: 'outlined',
          })
        : React.createElement(
            Typography,
            { variant: 'caption', color: 'text.secondary' },
            'Optional',
          ),
  },
];

export const formSections: ModernFormSection[] = [
  {
    title: 'Basic Information',
    fields: [
      {
        name: 'step_type',
        label: 'Step Type',
        type: 'select',
        required: true,
        helperText: 'The type of step - this determines the step name displayed to users',
        options: STEP_TYPE_OPTIONS,
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        multiline: true,
        rows: 2,
        placeholder: 'Brief description of what this step does...',
        helperText: 'Optional description for internal reference',
      },
    ],
  },
  {
    title: 'Step Behavior',
    fields: [
      {
        name: 'is_enabled',
        label: 'Enabled',
        type: 'switch',
        helperText: 'Whether this step is active in the booking flow',
      },
      {
        name: 'is_required',
        label: 'Required',
        type: 'switch',
        helperText: 'Whether clients must complete this step',
      },
      {
        name: 'is_skippable',
        label: 'Skippable',
        type: 'switch',
        helperText: 'Whether clients can skip this step',
      },
    ],
  },
];

export const defaultStepValues: BookingFlowStep = {
  id: 0,
  booking_flow: 0,
  description: '',
  step_type: 'contact_info' as StepType,
  step_type_display: 'Contact Information',
  order: 1,
  is_enabled: true,
  is_required: true,
  is_skippable: false,
  display_conditions: {},
  validation_rules: {},
  configuration: {},
  configuration_data: undefined,
  created_at: '',
  updated_at: '',
};
