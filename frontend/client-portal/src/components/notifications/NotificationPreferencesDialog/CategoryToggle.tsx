import React from 'react';
import { Box, Typography, Switch, FormControlLabel, Chip } from '@mui/material';
import {
  Email as EmailIcon,
  Sms as SmsIcon,
  Notifications as InAppIcon,
  Event as EventIcon,
  Payment as PaymentIcon,
  Message as MessageIcon,
  Settings as SettingsIcon,
  Assignment as TaskIcon,
  Person as PersonIcon,
  Description as ContractIcon,
  AccountTree as WorkflowIcon,
  Campaign as CampaignIcon,
  PhoneIphone as PushIcon,
} from '@mui/icons-material';
import type { UpdateNotificationPreferenceData } from '@/types/notifications.types';

export const getCategoryIcon = (categoryValue: string) => {
  switch (categoryValue) {
    case 'EVENT':
      return <EventIcon fontSize="small" />;
    case 'PAYMENT':
      return <PaymentIcon fontSize="small" />;
    case 'COMMUNICATION':
      return <MessageIcon fontSize="small" />;
    case 'SYSTEM':
      return <SettingsIcon fontSize="small" />;
    case 'TASK':
      return <TaskIcon fontSize="small" />;
    case 'CLIENT':
      return <PersonIcon fontSize="small" />;
    case 'CONTRACT':
      return <ContractIcon fontSize="small" />;
    case 'WORKFLOW':
      return <WorkflowIcon fontSize="small" />;
    case 'MARKETING':
      return <CampaignIcon fontSize="small" />;
    default:
      return <InAppIcon fontSize="small" />;
  }
};

interface CategoryToggleProps {
  categoryKey: string;
  label: string;
  isMarketing?: boolean;
  formData: Partial<UpdateNotificationPreferenceData>;
  onToggle: (field: keyof UpdateNotificationPreferenceData) => void;
}

export const CategoryToggle: React.FC<CategoryToggleProps> = ({
  categoryKey,
  label,
  isMarketing = false,
  formData,
  onToggle,
}) => {
  const emailKey = `${categoryKey}_email` as keyof UpdateNotificationPreferenceData;
  const smsKey = `${categoryKey}_sms` as keyof UpdateNotificationPreferenceData;
  const inAppKey = `${categoryKey}_in_app` as keyof UpdateNotificationPreferenceData;
  const pushKey = `${categoryKey}_push` as keyof UpdateNotificationPreferenceData;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 1.5,
        ...(isMarketing && {
          bgcolor: 'warning.50',
          mx: -2,
          px: 2,
          borderRadius: 1,
        }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {getCategoryIcon(categoryKey.toUpperCase())}
        <Typography variant="body2">{label}</Typography>
        {isMarketing && (
          <Chip
            label="Consent"
            size="small"
            color="warning"
            variant="outlined"
            sx={{ ml: 0.5, height: 20 }}
          />
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={Boolean(formData[emailKey])}
              onChange={() => onToggle(emailKey)}
              disabled={!formData.email_enabled}
            />
          }
          label={<EmailIcon fontSize="small" color={formData[emailKey] ? 'primary' : 'disabled'} />}
          labelPlacement="top"
          sx={{ mx: 0 }}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={Boolean(formData[smsKey])}
              onChange={() => onToggle(smsKey)}
              disabled={!formData.sms_enabled}
            />
          }
          label={<SmsIcon fontSize="small" color={formData[smsKey] ? 'primary' : 'disabled'} />}
          labelPlacement="top"
          sx={{ mx: 0 }}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={Boolean(formData[inAppKey])}
              onChange={() => onToggle(inAppKey)}
              disabled={!formData.in_app_enabled}
            />
          }
          label={<InAppIcon fontSize="small" color={formData[inAppKey] ? 'primary' : 'disabled'} />}
          labelPlacement="top"
          sx={{ mx: 0 }}
        />
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={Boolean(formData[pushKey])}
              onChange={() => onToggle(pushKey)}
              disabled={!formData.push_enabled}
            />
          }
          label={<PushIcon fontSize="small" color={formData[pushKey] ? 'primary' : 'disabled'} />}
          labelPlacement="top"
          sx={{ mx: 0 }}
        />
      </Box>
    </Box>
  );
};
