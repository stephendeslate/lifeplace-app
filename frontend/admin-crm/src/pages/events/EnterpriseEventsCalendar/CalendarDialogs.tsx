import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import { EventNote as EventIcon, Close as CloseIcon } from '@mui/icons-material';
import { EventForm } from '@/components/events/EventForm';
import { AvailabilityIndicator } from '@/components/availability/AvailabilityIndicator';

import type { Event, CreateEventData } from '@/types/events.types';
import type { CalendarDateInfo } from '@/types/availability.types';
import type { EnhancedCalendarSettings } from './types';

interface CalendarDialogsProps {
  // Create event dialog
  createDialogOpen: boolean;
  onCloseCreateDialog: () => void;
  isCreatingEvent: boolean;
  onCreateEvent: (data: CreateEventData, options?: { onSuccess: () => void }) => void;

  // Action menu
  menuAnchor: HTMLElement | null;
  selectedEvent: Event | null;
  onMenuClose: () => void;
  onNavigateToEvent: (id: number) => void;

  // Availability detail dialog
  availabilityDetailOpen: boolean;
  onCloseAvailabilityDetail: () => void;
  selectedDate: string | null;
  getDateAvailability: (date: string) => CalendarDateInfo | undefined;

  // Settings dialog
  settingsOpen: boolean;
  onCloseSettings: () => void;
  settings: EnhancedCalendarSettings;
  onSettingChange: (key: keyof EnhancedCalendarSettings, value: unknown) => void;
}

export const CalendarDialogs: React.FC<CalendarDialogsProps> = ({
  createDialogOpen,
  onCloseCreateDialog,
  isCreatingEvent,
  onCreateEvent,
  menuAnchor,
  selectedEvent,
  onMenuClose,
  onNavigateToEvent,
  availabilityDetailOpen,
  onCloseAvailabilityDetail,
  selectedDate,
  getDateAvailability,
  settingsOpen,
  onCloseSettings,
  settings,
  onSettingChange,
}) => {
  return (
    <>
      {/* Action Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={onMenuClose}>
        <MenuItem
          onClick={() => {
            if (selectedEvent) onNavigateToEvent(selectedEvent.id);
            onMenuClose();
          }}
        >
          <EventIcon sx={{ mr: 1 }} />
          View Event
        </MenuItem>
      </Menu>

      {/* Create Event Dialog */}
      <Dialog open={createDialogOpen} onClose={onCloseCreateDialog} maxWidth="md" fullWidth>
        <DialogTitle>Create New Event</DialogTitle>
        <DialogContent>
          <EventForm
            onSubmit={(data) => {
              onCreateEvent(data as CreateEventData, {
                onSuccess: () => onCloseCreateDialog(),
              });
            }}
            onCancel={onCloseCreateDialog}
            isLoading={isCreatingEvent}
          />
        </DialogContent>
      </Dialog>

      {/* Availability Detail Dialog */}
      <Dialog
        open={availabilityDetailOpen}
        onClose={onCloseAvailabilityDetail}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Availability Details</Typography>
            <IconButton onClick={onCloseAvailabilityDetail}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedDate && (
            <AvailabilityIndicator
              availability={
                getDateAvailability(selectedDate) || {
                  date: selectedDate,
                  status: 'available',
                  conflict_level: 'none',
                  confirmed_events_count: 0,
                  lead_events_count: 0,
                  total_events_count: 0,
                  can_book_event: true,
                  can_create_lead: true,
                  conflicts: [],
                  reasons: [],
                  buffer_conflicts: [],
                }
              }
              showDetails={true}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={onCloseSettings} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Calendar Settings</Typography>
            <IconButton onClick={onCloseSettings}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.showAvailabilityIndicators}
                  onChange={(e) => onSettingChange('showAvailabilityIndicators', e.target.checked)}
                />
              }
              label="Show Availability Indicators"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showConflictDetails}
                  onChange={(e) => onSettingChange('showConflictDetails', e.target.checked)}
                />
              }
              label="Show Conflict Details"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.highlightUnavailableDates}
                  onChange={(e) => onSettingChange('highlightUnavailableDates', e.target.checked)}
                />
              }
              label="Highlight Unavailable Dates"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showAvailabilityStats}
                  onChange={(e) => onSettingChange('showAvailabilityStats', e.target.checked)}
                />
              }
              label="Show Availability Statistics"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.enableRealTimeUpdates}
                  onChange={(e) => onSettingChange('enableRealTimeUpdates', e.target.checked)}
                />
              }
              label="Enable Real-time Updates"
            />
          </Stack>
        </DialogContent>
      </Dialog>
    </>
  );
};
