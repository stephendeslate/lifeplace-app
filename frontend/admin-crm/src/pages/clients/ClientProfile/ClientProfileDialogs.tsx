import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
} from '@mui/material';
import { ClientForm } from '@/components/clients/ClientForm';
import { SendMessageDialog } from '@/components/communications/SendMessageDialog';
import { NoteFormDialog } from '@/components/notes';
import { ClientNotificationPreferences } from '@/components/notifications';
import { EventFormDialog } from '@/components/events';
import type { Client, UpdateClientData } from '@/types/clients.types';
import type { CreateNoteData } from '@/types/notes.types';
import type { CreateEventData, Event } from '@/types/events.types';
import type { UseMutateFunction } from '@tanstack/react-query';
import type { Note } from '@/types/notes.types';

interface ClientProfileDialogsProps {
  client: Client;
  clientId: number;

  // Edit dialog
  editDialogOpen: boolean;
  onEditDialogClose: () => void;
  onEdit: (data: UpdateClientData) => void;
  isUpdatingClient: boolean;

  // Delete dialog
  deleteDialogOpen: boolean;
  onDeleteDialogClose: () => void;
  onDelete: () => void;
  isDeletingClient: boolean;

  // Send message dialog
  sendMessageDialogOpen: boolean;
  onSendMessageDialogClose: () => void;

  // Add note dialog
  addNoteDialogOpen: boolean;
  onAddNoteDialogClose: () => void;
  createNote: UseMutateFunction<Note, unknown, CreateNoteData>;
  isCreatingNote: boolean;

  // Create event dialog
  createEventDialogOpen: boolean;
  onCreateEventDialogClose: () => void;
  createEvent: UseMutateFunction<Event, unknown, CreateEventData>;
  isCreatingEvent: boolean;
  onEventCreated: (newEvent: { id: number }) => void;

  // Notification preferences dialog
  notifPrefsDialogOpen: boolean;
  onNotifPrefsDialogClose: () => void;
}

export const ClientProfileDialogs: React.FC<ClientProfileDialogsProps> = ({
  client,
  clientId,
  editDialogOpen,
  onEditDialogClose,
  onEdit,
  isUpdatingClient,
  deleteDialogOpen,
  onDeleteDialogClose,
  onDelete,
  isDeletingClient,
  sendMessageDialogOpen,
  onSendMessageDialogClose,
  addNoteDialogOpen,
  onAddNoteDialogClose,
  createNote,
  isCreatingNote,
  createEventDialogOpen,
  onCreateEventDialogClose,
  createEvent,
  isCreatingEvent,
  onEventCreated,
  notifPrefsDialogOpen,
  onNotifPrefsDialogClose,
}) => {
  return (
    <>
      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={onEditDialogClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Edit Client</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <ClientForm
            client={client}
            onSubmit={onEdit}
            onCancel={onEditDialogClose}
            isLoading={isUpdatingClient}
          />
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={onDeleteDialogClose}
        PaperProps={{ sx: { borderRadius: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, color: 'error.main' }}>Deactivate Client</DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <DialogContentText>
            Are you sure you want to deactivate{' '}
            <strong>
              {client.first_name} {client.last_name}
            </strong>
            ? This will make their account inactive but preserve all data.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0, gap: 2 }}>
          <Button onClick={onDeleteDialogClose}>Cancel</Button>
          <Button onClick={onDelete} color="error" variant="contained" disabled={isDeletingClient}>
            {isDeletingClient ? <CircularProgress size={20} color="inherit" /> : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Send Email Dialog */}
      <SendMessageDialog
        open={sendMessageDialogOpen}
        onClose={onSendMessageDialogClose}
        client={client}
      />

      {/* Add Note Dialog */}
      <NoteFormDialog
        open={addNoteDialogOpen}
        onClose={onAddNoteDialogClose}
        contentType="client"
        objectId={clientId}
        onSubmit={(data) => {
          createNote(data as Parameters<typeof createNote>[0], {
            onSuccess: () => onAddNoteDialogClose(),
          });
        }}
        isLoading={isCreatingNote}
      />

      {/* Create Event Dialog */}
      <EventFormDialog
        open={createEventDialogOpen}
        onClose={onCreateEventDialogClose}
        defaultClientId={clientId}
        title={`Create Event for ${client?.first_name} ${client?.last_name}`}
        onSubmit={(data) => {
          createEvent(data as Parameters<typeof createEvent>[0], {
            onSuccess: (newEvent) => {
              onCreateEventDialogClose();
              onEventCreated(newEvent);
            },
          });
        }}
        isLoading={isCreatingEvent}
      />

      {/* Client Notification Preferences Dialog */}
      <ClientNotificationPreferences
        open={notifPrefsDialogOpen}
        onClose={onNotifPrefsDialogClose}
        userId={client.id}
        clientName={`${client.first_name} ${client.last_name}`}
      />
    </>
  );
};
