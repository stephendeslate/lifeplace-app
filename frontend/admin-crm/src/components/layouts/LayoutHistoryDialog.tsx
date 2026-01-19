// frontend/admin-crm/src/components/layouts/LayoutHistoryDialog.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { useLayouts } from '../../hooks/useLayouts';
import type { EmailLayout } from '../../types/layouts.types';

interface LayoutHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  layout: EmailLayout;
}

export const LayoutHistoryDialog: React.FC<LayoutHistoryDialogProps> = ({
  open,
  onClose,
  layout,
}) => {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [confirmRollback, setConfirmRollback] = useState(false);

  const { useLayoutHistory, useRollbackLayout } = useLayouts();
  const { data: history = [], isLoading } = useLayoutHistory(layout.id);
  const { mutate: rollbackLayout, isPending: isRollingBack } = useRollbackLayout();

  const handleRollback = () => {
    if (selectedVersion !== null) {
      rollbackLayout(
        { id: layout.id, version: selectedVersion },
        {
          onSuccess: () => {
            setConfirmRollback(false);
            setSelectedVersion(null);
            onClose();
          },
        }
      );
    }
  };

  const getReasonColor = (reason: string) => {
    switch (reason) {
      case 'CREATE':
        return 'success';
      case 'UPDATE':
        return 'primary';
      case 'ROLLBACK':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">History: {layout.name}</Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : history.length === 0 ? (
          <Alert severity="info">No history available for this layout.</Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>Change Type</TableCell>
                  <TableCell>Changed By</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((entry) => (
                  <TableRow
                    key={entry.id}
                    sx={{
                      bgcolor: selectedVersion === entry.version ? 'action.selected' : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Chip label={`v${entry.version}`} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={entry.reason}
                        size="small"
                        color={getReasonColor(entry.reason) as 'success' | 'primary' | 'warning' | 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {entry.changed_by_name || 'System'}
                    </TableCell>
                    <TableCell>
                      {new Date(entry.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 200 }} noWrap>
                        {entry.notes || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        startIcon={<RestoreIcon />}
                        onClick={() => {
                          setSelectedVersion(entry.version);
                          setConfirmRollback(true);
                        }}
                        disabled={isRollingBack}
                      >
                        Restore
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Rollback Confirmation */}
        {confirmRollback && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Are you sure you want to restore to version {selectedVersion}?
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              This will overwrite the current layout with the selected version. A new history entry will be created.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <Button
                size="small"
                variant="contained"
                color="warning"
                onClick={handleRollback}
                disabled={isRollingBack}
                startIcon={isRollingBack ? <CircularProgress size={16} /> : <RestoreIcon />}
              >
                {isRollingBack ? 'Restoring...' : 'Confirm Restore'}
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  setConfirmRollback(false);
                  setSelectedVersion(null);
                }}
                disabled={isRollingBack}
              >
                Cancel
              </Button>
            </Box>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default LayoutHistoryDialog;
