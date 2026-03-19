// All dialogs for Event Profile: Edit, Delete, CheckIn, Checkout, NoShow, Headcount

import React from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import {
  Login as CheckInIcon,
  Logout as CheckOutIcon,
  EventBusy as NoShowIcon,
} from '@mui/icons-material';
import { EventForm } from '@/components/events/EventForm';
import { UpdateHeadcountDialog } from '@/components/events/UpdateHeadcountDialog';
import type { UpdateEventData } from '@/types/events.types';
import type { EventProfileLogic } from './useEventProfileLogic';

interface EventProfileDialogsProps {
  event: NonNullable<EventProfileLogic['event']>;

  // Edit dialog
  editDialogOpen: boolean;
  onEditClose: () => void;
  onEdit: (data: UpdateEventData) => void;
  isUpdatingEvent: boolean;

  // Delete dialog
  deleteDialogOpen: boolean;
  onDeleteClose: () => void;
  onDelete: () => void;
  isDeletingEvent: boolean;

  // Check-in dialog
  checkInDialogOpen: boolean;
  onCheckInClose: () => void;
  onCheckIn: () => void;
  checkInNotes: string;
  onCheckInNotesChange: (value: string) => void;

  // Checkout dialog
  checkOutDialogOpen: boolean;
  onCheckOutClose: () => void;
  onCheckout: () => void;
  checkOutNotes: string;
  onCheckOutNotesChange: (value: string) => void;

  // No-show dialog
  noShowDialogOpen: boolean;
  onNoShowClose: () => void;
  onNoShow: () => void;

  // Shared check-in processing state
  isProcessingCheckIn: boolean;

  // Headcount dialog
  headcountDialogOpen: boolean;
  onHeadcountClose: () => void;
}

export const EventProfileDialogs: React.FC<EventProfileDialogsProps> = ({
  event,
  editDialogOpen,
  onEditClose,
  onEdit,
  isUpdatingEvent,
  deleteDialogOpen,
  onDeleteClose,
  onDelete,
  isDeletingEvent,
  checkInDialogOpen,
  onCheckInClose,
  onCheckIn,
  checkInNotes,
  onCheckInNotesChange,
  checkOutDialogOpen,
  onCheckOutClose,
  onCheckout,
  checkOutNotes,
  onCheckOutNotesChange,
  noShowDialogOpen,
  onNoShowClose,
  onNoShow,
  isProcessingCheckIn,
  headcountDialogOpen,
  onHeadcountClose,
}) => {
  const eventName = event.name || 'this event';

  return (
    <>
      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={onEditClose} maxWidth="md" fullWidth>
        <DialogTitle>Edit Event</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <EventForm
            event={event}
            onSubmit={onEdit}
            onCancel={onEditClose}
            isLoading={isUpdatingEvent}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={onDeleteClose}>
        <DialogTitle color="error">Delete Event</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete &quot;{eventName}&quot;? This action cannot be undone
            and will remove all associated data.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onDeleteClose}>Cancel</Button>
          <Button onClick={onDelete} variant="contained" color="error" disabled={isDeletingEvent}>
            {isDeletingEvent ? <CircularProgress size={20} color="inherit" /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Check-in Dialog */}
      <Dialog open={checkInDialogOpen} onClose={onCheckInClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'success.main',
          }}
        >
          <CheckInIcon /> Check In Guest
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Confirm check-in for &quot;{eventName}&quot;. This will record the current time as the
            actual check-in time.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Check-in Notes (Optional)"
            placeholder="Add any notes about the check-in..."
            value={checkInNotes}
            onChange={(e) => onCheckInNotesChange(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => {
              onCheckInClose();
              onCheckInNotesChange('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onCheckIn}
            variant="contained"
            color="success"
            disabled={isProcessingCheckIn}
          >
            {isProcessingCheckIn ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Confirm Check-in'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Checkout Dialog */}
      <Dialog open={checkOutDialogOpen} onClose={onCheckOutClose} maxWidth="sm" fullWidth>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'primary.main',
          }}
        >
          <CheckOutIcon /> Checkout Guest
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            Confirm checkout for &quot;{eventName}&quot;. This will record the current time as the
            actual checkout time. Any applicable late checkout fees will be calculated
            automatically.
          </DialogContentText>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Checkout Notes (Optional)"
            placeholder="Add any notes about the checkout..."
            value={checkOutNotes}
            onChange={(e) => onCheckOutNotesChange(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => {
              onCheckOutClose();
              onCheckOutNotesChange('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={onCheckout}
            variant="contained"
            color="primary"
            disabled={isProcessingCheckIn}
          >
            {isProcessingCheckIn ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Confirm Checkout'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* No Show Dialog */}
      <Dialog open={noShowDialogOpen} onClose={onNoShowClose}>
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'error.main',
          }}
        >
          <NoShowIcon /> Mark as No Show
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to mark &quot;{eventName}&quot; as a no-show? This indicates the
            guest did not arrive for their scheduled event.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onNoShowClose}>Cancel</Button>
          <Button
            onClick={onNoShow}
            variant="contained"
            color="error"
            disabled={isProcessingCheckIn}
          >
            {isProcessingCheckIn ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              'Confirm No Show'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Update Headcount Dialog */}
      <UpdateHeadcountDialog open={headcountDialogOpen} onClose={onHeadcountClose} event={event} />
    </>
  );
};
