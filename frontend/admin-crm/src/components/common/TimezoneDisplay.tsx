// frontend/admin-crm/src/components/common/TimezoneDisplay.tsx

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  Tooltip,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Alert
} from '@mui/material';
import {
  AccessTime,
  Public,
  Settings,
  BusinessCenter,
  Schedule
} from '@mui/icons-material';
import {
  formatPhilippinesTime,
  formatWithUserPreference,
  formatDualTimezone,
  getBusinessHoursStatus,
  BUSINESS_TIMEZONE_DISPLAY,
  BUSINESS_TIMEZONE_FULL,
  ADMIN_TIMEZONES
} from '../../utils/timezone';

interface AdminTimezoneDisplayProps {
  date: string | Date;
  displayMode?: 'business_only' | 'business_with_local' | 'dual_display';
  userTimezone?: string;
  showSettings?: boolean;
  onDisplayModeChange?: (mode: 'business_only' | 'business_with_local' | 'dual_display') => void;
  onTimezoneChange?: (timezone: string) => void;
}

/**
 * Admin timezone display with configurable viewing options
 */
export const AdminTimezoneDisplay: React.FC<AdminTimezoneDisplayProps> = ({
  date,
  displayMode = 'business_only',
  userTimezone = 'America/Los_Angeles',
  showSettings = true,
  onDisplayModeChange,
  onTimezoneChange
}) => {
  const [settingsAnchor, setSettingsAnchor] = React.useState<null | HTMLElement>(null);
  
  const formatted = formatWithUserPreference(date, { mode: displayMode, userTimezone });
  
  const handleSettingsClick = (event: React.MouseEvent<HTMLElement>) => {
    setSettingsAnchor(event.currentTarget);
  };
  
  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };
  
  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <AccessTime fontSize="small" color="action" />
      
      <Typography variant="body1">
        {formatted.primary}
      </Typography>
      
      {formatted.secondary && (
        <Typography variant="body2" color="text.secondary">
          {formatted.secondary}
        </Typography>
      )}
      
      {showSettings && (
        <>
          <IconButton size="small" onClick={handleSettingsClick}>
            <Settings fontSize="small" />
          </IconButton>
          
          <Menu
            anchorEl={settingsAnchor}
            open={Boolean(settingsAnchor)}
            onClose={handleSettingsClose}
          >
            <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
              Display Settings
            </Typography>
            <Divider />
            
            <MenuItem
              onClick={() => {
                onDisplayModeChange?.('business_only');
                handleSettingsClose();
              }}
              selected={displayMode === 'business_only'}
            >
              Philippines Time Only
            </MenuItem>
            
            <MenuItem
              onClick={() => {
                onDisplayModeChange?.('business_with_local');
                handleSettingsClose();
              }}
              selected={displayMode === 'business_with_local'}
            >
              Philippines + My Time
            </MenuItem>
            
            <MenuItem
              onClick={() => {
                onDisplayModeChange?.('dual_display');
                handleSettingsClose();
              }}
              selected={displayMode === 'dual_display'}
            >
              Side by Side
            </MenuItem>
            
            <Divider />
            
            <Typography variant="subtitle2" sx={{ px: 2, py: 1 }}>
              My Timezone
            </Typography>
            
            {ADMIN_TIMEZONES.map(tz => (
              <MenuItem
                key={tz.value}
                onClick={() => {
                  onTimezoneChange?.(tz.value);
                  handleSettingsClose();
                }}
                selected={userTimezone === tz.value}
                dense
              >
                {tz.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      )}
    </Stack>
  );
};

/**
 * Business hours indicator
 */
export const BusinessHoursIndicator: React.FC = () => {
  const status = getBusinessHoursStatus();
  
  return (
    <Alert
      severity={status.isOpen ? 'success' : 'info'}
      icon={<BusinessCenter />}
      sx={{
        '& .MuiAlert-message': {
          width: '100%'
        }
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="body2" fontWeight="medium">
            Philippines Business Hours: 9 AM - 6 PM {BUSINESS_TIMEZONE_DISPLAY} (Mon-Fri)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {status.message}
            {status.nextOpenTime && ` • Opens at ${status.nextOpenTime}`}
          </Typography>
        </Box>
        
        <Chip
          label={status.isOpen ? 'OPEN' : 'CLOSED'}
          color={status.isOpen ? 'success' : 'default'}
          size="small"
          variant={status.isOpen ? 'filled' : 'outlined'}
        />
      </Stack>
    </Alert>
  );
};

/**
 * Event time display for event details
 */
export const EventTimeDisplay: React.FC<{
  startDate: string | Date;
  endDate?: string | Date;
  adminTimezone?: string;
  showDual?: boolean;
}> = ({ startDate, endDate, adminTimezone = 'America/Los_Angeles', showDual = false }) => {
  const startDual = showDual ? formatDualTimezone(startDate, adminTimezone) : null;
  const endDual = endDate && showDual ? formatDualTimezone(endDate, adminTimezone) : null;
  
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: 'primary.50',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'primary.200'
      }}
    >
      <Stack spacing={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Schedule color="primary" />
          <Typography variant="h6" color="primary.main">
            Event Schedule
          </Typography>
          <Chip
            label={BUSINESS_TIMEZONE_DISPLAY}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Stack>
        
        <Box>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Start Time
          </Typography>
          <Typography variant="body1" fontWeight="medium">
            {formatPhilippinesTime(startDate, true, 'EEEE, MMMM d, yyyy • h:mm a')}
          </Typography>
          {startDual && showDual && (
            <Typography variant="body2" color="text.secondary">
              Your time: {startDual.admin}
              {!startDual.isSameDay && ' (different day)'}
            </Typography>
          )}
        </Box>
        
        {endDate && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              End Time
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatPhilippinesTime(endDate, true, 'EEEE, MMMM d, yyyy • h:mm a')}
            </Typography>
            {endDual && showDual && (
              <Typography variant="body2" color="text.secondary">
                Your time: {endDual.admin}
                {!endDual.isSameDay && ' (different day)'}
              </Typography>
            )}
          </Box>
        )}
        
        <Alert severity="info" sx={{ mt: 1 }}>
          <Typography variant="caption">
            All events take place in the Philippines. Times shown are in {BUSINESS_TIMEZONE_FULL}.
          </Typography>
        </Alert>
      </Stack>
    </Box>
  );
};

/**
 * Compact timezone badge
 */
export const TimezoneBadge: React.FC<{
  timezone?: 'business' | 'user';
  label?: string;
}> = ({ timezone = 'business', label }) => {
  return (
    <Tooltip title={timezone === 'business' ? `${BUSINESS_TIMEZONE_FULL} (UTC+8)` : 'Your local timezone'}>
      <Chip
        label={label || (timezone === 'business' ? BUSINESS_TIMEZONE_DISPLAY : 'Local')}
        size="small"
        color={timezone === 'business' ? 'primary' : 'default'}
        icon={<Public fontSize="small" />}
        sx={{
          height: 24,
          fontSize: '0.75rem',
          fontWeight: 600
        }}
      />
    </Tooltip>
  );
};