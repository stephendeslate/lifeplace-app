import React from 'react';
import {
  Box,
  Button,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  AppBar,
  Toolbar,
  Chip,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Computer as DesktopIcon,
  PhoneAndroid as MobileIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  Timeline as StepsIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import type { BookingFlowDetail } from '@/types/bookingflows';
import type { ViewMode } from './useBookingFlowPreviewLogic';

interface PreviewHeaderProps {
  flow: BookingFlowDetail;
  viewMode: ViewMode;
  isFullscreen: boolean;
  onViewModeChange: (_event: React.MouseEvent<HTMLElement>, newMode: ViewMode) => void;
  onBackToFlow: () => void;
  onEditFlow: () => void;
  onRefresh: () => void;
  onToggleFullscreen: () => void;
}

export const PreviewHeader: React.FC<PreviewHeaderProps> = ({
  flow,
  viewMode,
  isFullscreen,
  onViewModeChange,
  onBackToFlow,
  onEditFlow,
  onRefresh,
  onToggleFullscreen,
}) => (
  <AppBar
    position="sticky"
    color="default"
    elevation={1}
    sx={{
      backgroundColor: 'background.paper',
      borderBottom: 1,
      borderColor: 'divider',
    }}
  >
    <Toolbar sx={{ gap: 2 }}>
      <IconButton edge="start" onClick={onBackToFlow} aria-label="back to flow details">
        <BackIcon />
      </IconButton>

      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="div" noWrap>
          Preview: {flow.name}
        </Typography>
        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
          {/* Event Type Chip */}
          <Chip
            label={flow.event_type_name || 'Any Event Type'}
            size="small"
            color={flow.event_type ? 'primary' : 'default'}
            variant="outlined"
          />

          {/* Status Chip */}
          <Chip
            icon={flow.is_active ? <ActiveIcon /> : <InactiveIcon />}
            label={flow.is_test_mode ? 'Test Mode' : flow.is_active ? 'Active' : 'Inactive'}
            size="small"
            color={flow.is_test_mode ? 'warning' : flow.is_active ? 'success' : 'default'}
            variant={flow.is_active || flow.is_test_mode ? 'filled' : 'outlined'}
          />

          {/* Steps Count Chip */}
          <Chip
            icon={<StepsIcon />}
            label={`${flow.enabled_steps_count}/${flow.total_steps} steps`}
            size="small"
            color={flow.enabled_steps_count === flow.total_steps ? 'success' : 'warning'}
            variant="outlined"
          />
        </Box>
      </Box>

      <ToggleButtonGroup
        value={viewMode}
        exclusive
        onChange={onViewModeChange}
        size="small"
        aria-label="view mode"
      >
        <ToggleButton value="desktop" aria-label="desktop view">
          <DesktopIcon />
        </ToggleButton>
        <ToggleButton value="mobile" aria-label="mobile view">
          <MobileIcon />
        </ToggleButton>
      </ToggleButtonGroup>

      <IconButton onClick={onRefresh} aria-label="refresh preview">
        <RefreshIcon />
      </IconButton>

      <IconButton onClick={onToggleFullscreen} aria-label="toggle fullscreen">
        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
      </IconButton>

      <Button variant="outlined" startIcon={<SettingsIcon />} onClick={onEditFlow}>
        Edit Flow
      </Button>
    </Toolbar>
  </AppBar>
);
