import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Button,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from '@mui/material';
import { Email } from '@mui/icons-material';
import type { AdminInvitation } from '@/types/settings.types';
import type { CommunicationRecord } from './types';

interface CommunicationRecordsDialogProps {
  open: boolean;
  onClose: () => void;
  selectedInvitation: AdminInvitation | null;
  getInvitationRecord: (invitation: AdminInvitation) => CommunicationRecord | undefined;
}

export const CommunicationRecordsDialog: React.FC<CommunicationRecordsDialogProps> = ({
  open,
  onClose,
  selectedInvitation,
  getInvitationRecord,
}) => (
  <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
    <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'info.main' }}>
      <Email color="info" />
      Email Communication Status
    </DialogTitle>
    <DialogContent>
      {selectedInvitation && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Invitation for:{' '}
            <strong>
              {selectedInvitation.first_name} {selectedInvitation.last_name}
            </strong>{' '}
            ({selectedInvitation.email})
          </Typography>

          {(() => {
            const record = getInvitationRecord(selectedInvitation);
            if (!record) {
              return (
                <Alert severity="warning">
                  No email record found for this invitation. The invitation may have been created
                  before the communication system was implemented.
                </Alert>
              );
            }

            return (
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Stack spacing={2}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" fontWeight="600">
                      Status:
                    </Typography>
                    <Chip
                      label={record.delivery_status}
                      size="small"
                      color={
                        record.delivery_status === 'DELIVERED'
                          ? 'success'
                          : record.delivery_status === 'FAILED'
                            ? 'error'
                            : 'warning'
                      }
                    />
                  </Box>
                  <Divider />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="600">
                      Sent:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {record.sent_at ? new Date(record.sent_at).toLocaleString() : 'Not sent'}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="600">
                      Delivered:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {record.delivered_at
                        ? new Date(record.delivered_at).toLocaleString()
                        : 'Not delivered'}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="600">
                      Opened:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {record.is_opened
                        ? `Yes - ${new Date(record.opened_at!).toLocaleString()}`
                        : 'Not opened'}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          })()}
        </Box>
      )}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);
