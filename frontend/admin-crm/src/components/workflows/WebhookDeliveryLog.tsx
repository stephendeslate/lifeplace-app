// frontend/admin-crm/src/components/workflows/WebhookDeliveryLog.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Typography,
  Box,
  IconButton,
  Collapse,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon,
  Loop as RetryingIcon,
} from '@mui/icons-material';
import { formatDistanceToNow, format } from 'date-fns';
import type { WorkflowWebhookDelivery, WebhookDeliveryStatus } from '../../types/workflows';

interface WebhookDeliveryLogProps {
  open: boolean;
  onClose: () => void;
  webhookName: string;
  deliveries: WorkflowWebhookDelivery[];
  isLoading: boolean;
  onRefresh: () => void;
}

const getStatusConfig = (status: WebhookDeliveryStatus) => {
  switch (status) {
    case 'SUCCESS':
      return {
        icon: <SuccessIcon fontSize="small" />,
        color: 'success' as const,
        label: 'Success',
      };
    case 'FAILED':
      return { icon: <ErrorIcon fontSize="small" />, color: 'error' as const, label: 'Failed' };
    case 'PENDING':
      return {
        icon: <PendingIcon fontSize="small" />,
        color: 'default' as const,
        label: 'Pending',
      };
    case 'RETRYING':
      return {
        icon: <RetryingIcon fontSize="small" />,
        color: 'warning' as const,
        label: 'Retrying',
      };
    default:
      return { icon: null, color: 'default' as const, label: status };
  }
};

interface DeliveryRowProps {
  delivery: WorkflowWebhookDelivery;
}

const DeliveryRow: React.FC<DeliveryRowProps> = ({ delivery }) => {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = getStatusConfig(delivery.status);

  return (
    <>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell>
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Chip
            icon={statusConfig.icon || undefined}
            label={statusConfig.label}
            size="small"
            color={statusConfig.color}
            variant="outlined"
          />
        </TableCell>
        <TableCell>
          <Chip label={delivery.event_type.replace(/_/g, ' ')} size="small" variant="outlined" />
        </TableCell>
        <TableCell>{delivery.response_status_code || '-'}</TableCell>
        <TableCell>{delivery.attempt_count}</TableCell>
        <TableCell>
          <Tooltip title={format(new Date(delivery.created_at), 'PPpp')}>
            <span>{formatDistanceToNow(new Date(delivery.created_at), { addSuffix: true })}</span>
          </Tooltip>
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              {/* Error Message */}
              {delivery.error_message && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="error" gutterBottom>
                    Error Message
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'error.50' }}>
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        m: 0,
                      }}
                    >
                      {delivery.error_message}
                    </Typography>
                  </Paper>
                </Box>
              )}

              {/* Next Retry */}
              {delivery.next_retry_at && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Next Retry
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {format(new Date(delivery.next_retry_at), 'PPpp')}
                  </Typography>
                </Box>
              )}

              {/* Request Payload */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Request Payload
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    bgcolor: 'grey.50',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  <Typography
                    variant="body2"
                    component="pre"
                    sx={{
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      m: 0,
                    }}
                  >
                    {JSON.stringify(delivery.payload, null, 2)}
                  </Typography>
                </Paper>
              </Box>

              {/* Response Body */}
              {delivery.response_body && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Response Body
                  </Typography>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 1.5,
                      bgcolor: 'grey.50',
                      maxHeight: 200,
                      overflow: 'auto',
                    }}
                  >
                    <Typography
                      variant="body2"
                      component="pre"
                      sx={{
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        m: 0,
                      }}
                    >
                      {delivery.response_body}
                    </Typography>
                  </Paper>
                </Box>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export const WebhookDeliveryLog: React.FC<WebhookDeliveryLogProps> = ({
  open,
  onClose,
  webhookName,
  deliveries,
  isLoading,
  onRefresh,
}) => {
  const successCount = deliveries.filter((d) => d.status === 'SUCCESS').length;
  const failedCount = deliveries.filter((d) => d.status === 'FAILED').length;
  const retryingCount = deliveries.filter((d) => d.status === 'RETRYING').length;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { maxHeight: '85vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6">Delivery History</Typography>
            <Typography variant="body2" color="text.secondary">
              {webhookName}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<SuccessIcon />}
              label={successCount}
              size="small"
              color="success"
              variant="outlined"
            />
            <Chip
              icon={<ErrorIcon />}
              label={failedCount}
              size="small"
              color="error"
              variant="outlined"
            />
            {retryingCount > 0 && (
              <Chip
                icon={<RetryingIcon />}
                label={retryingCount}
                size="small"
                color="warning"
                variant="outlined"
              />
            )}
            <Tooltip title="Refresh">
              <IconButton onClick={onRefresh} disabled={isLoading} size="small">
                {isLoading ? <CircularProgress size={20} /> : <RefreshIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {deliveries.length === 0 ? (
          <Alert severity="info">
            No delivery history yet. Deliveries will appear here when webhook events are triggered.
          </Alert>
        ) : (
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: 50 }} />
                  <TableCell>Status</TableCell>
                  <TableCell>Event</TableCell>
                  <TableCell>HTTP Code</TableCell>
                  <TableCell>Attempts</TableCell>
                  <TableCell>Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deliveries.map((delivery) => (
                  <DeliveryRow key={delivery.id} delivery={delivery} />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default WebhookDeliveryLog;
