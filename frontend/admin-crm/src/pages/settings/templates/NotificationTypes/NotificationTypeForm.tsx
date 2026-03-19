// Notification Type edit/create form component

import React from 'react';
import { Box, Switch, FormControlLabel, TextField, MenuItem, Typography } from '@mui/material';
import type {
  NotificationType,
  NotificationCategory,
  NotificationPriority,
} from '@/types/notifications.types';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_PRIORITIES } from '@/types/notifications.types';

interface NotificationTypeFormProps {
  item: NotificationType;
  onChange: (data: Partial<NotificationType>) => void;
  isNew: boolean;
}

export const NotificationTypeForm: React.FC<NotificationTypeFormProps> = ({
  item,
  onChange,
  isNew,
}) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 1 }}>
      {/* Basic Info */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
        Basic Information
      </Typography>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Name"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
          required
          fullWidth
          placeholder="e.g., Event Booking Confirmed"
        />
        <TextField
          label="Code"
          value={item.code}
          onChange={(e) =>
            onChange({
              code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'),
            })
          }
          required
          fullWidth
          disabled={!isNew && item.is_system}
          placeholder="e.g., EVENT_BOOKING_CONFIRMED"
          helperText={
            !isNew && item.is_system
              ? 'System type codes cannot be changed'
              : 'Uppercase, underscores only'
          }
          slotProps={{ htmlInput: { style: { fontFamily: 'monospace' } } }}
        />
      </Box>
      <TextField
        label="Description"
        value={item.description}
        onChange={(e) => onChange({ description: e.target.value })}
        fullWidth
        multiline
        rows={2}
        placeholder="Brief description of when this notification is triggered"
      />
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          select
          label="Category"
          value={item.category}
          onChange={(e) => onChange({ category: e.target.value as NotificationCategory })}
          required
          fullWidth
        >
          {NOTIFICATION_CATEGORIES.map((c) => (
            <MenuItem key={c.value} value={c.value}>
              {c.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          label="Priority"
          value={item.priority}
          onChange={(e) => onChange({ priority: e.target.value as NotificationPriority })}
          required
          fullWidth
        >
          {NOTIFICATION_PRIORITIES.map((p) => (
            <MenuItem key={p.value} value={p.value}>
              {p.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <TextField
          label="Icon"
          value={item.icon}
          onChange={(e) => onChange({ icon: e.target.value })}
          fullWidth
          placeholder="e.g., event_note"
          helperText="MUI icon name"
        />
        <TextField
          label="Color"
          type="color"
          value={item.color}
          onChange={(e) => onChange({ color: e.target.value })}
          fullWidth
          slotProps={{ htmlInput: { style: { height: 40 } } }}
        />
      </Box>

      {/* Delivery Channels */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mt: 1 }}>
        Delivery Channels
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <FormControlLabel
          control={
            <Switch
              checked={item.is_active}
              onChange={(e) => onChange({ is_active: e.target.checked })}
            />
          }
          label="Active"
        />
        <FormControlLabel
          control={
            <Switch
              checked={item.supports_email}
              onChange={(e) => onChange({ supports_email: e.target.checked })}
            />
          }
          label="Email"
        />
        <FormControlLabel
          control={
            <Switch
              checked={item.supports_sms}
              onChange={(e) => onChange({ supports_sms: e.target.checked })}
            />
          }
          label="SMS"
        />
        <FormControlLabel
          control={
            <Switch
              checked={item.supports_push ?? true}
              onChange={(e) => onChange({ supports_push: e.target.checked })}
            />
          }
          label="Push"
        />
      </Box>
      <TextField
        label="Auto-read after (days)"
        type="number"
        value={item.auto_read_after_days ?? ''}
        onChange={(e) =>
          onChange({
            auto_read_after_days: e.target.value ? Number(e.target.value) : null,
          })
        }
        fullWidth
        helperText="Leave empty for no auto-read"
        slotProps={{ htmlInput: { min: 1 } }}
      />

      {/* Message Templates */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600, mt: 1 }}>
        Message Templates
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Use {'{{variable_name}}'} syntax for dynamic content. Common variables: user_name,
        event_name, client_name, action_url
      </Typography>
      <TextField
        label="Title Template"
        value={item.default_title_template}
        onChange={(e) => onChange({ default_title_template: e.target.value })}
        required
        fullWidth
        placeholder='e.g., Your event "{{event_name}}" has been confirmed'
      />
      <TextField
        label="Content Template"
        value={item.default_content_template}
        onChange={(e) => onChange({ default_content_template: e.target.value })}
        required
        fullWidth
        multiline
        rows={3}
        placeholder="The in-app notification message body"
      />
      <TextField
        label="Email Template (optional)"
        value={item.default_email_template}
        onChange={(e) => onChange({ default_email_template: e.target.value })}
        fullWidth
        multiline
        rows={3}
        placeholder="Email-specific template content (uses title template if empty)"
        helperText="Only used if email delivery is enabled"
      />
      <TextField
        label="SMS Template (optional)"
        value={item.default_sms_template}
        onChange={(e) => onChange({ default_sms_template: e.target.value })}
        fullWidth
        multiline
        rows={2}
        placeholder="SMS-specific template content (keep under 160 chars)"
        helperText="Only used if SMS delivery is enabled"
      />
    </Box>
  );
};
