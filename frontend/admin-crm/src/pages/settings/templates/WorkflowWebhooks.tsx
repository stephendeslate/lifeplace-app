// Workflow Webhooks Settings Page
// Manages webhook integrations for workflow events

import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Stack,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Webhook as WebhookIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  History as HistoryIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useWorkflowWebhooks } from '../../../hooks/useWorkflows';
import { WebhookConfigDialog } from '../../../components/workflows/WebhookConfigDialog';
import { WebhookDeliveryLog } from '../../../components/workflows/WebhookDeliveryLog';
import type {
  WorkflowWebhook,
  CreateWorkflowWebhookData,
  UpdateWorkflowWebhookData,
} from '../../../types/workflows.types';
import { SimpleConfirmDialog } from '../../../components/common/ConfirmDialog';

export const WorkflowWebhooks: React.FC = () => {
  const {
    webhooks,
    isLoadingWebhooks,
    isCreatingWebhook,
    isUpdatingWebhook,
    isDeletingWebhook: _isDeletingWebhook,
    isTestingWebhook,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    refetchWebhooks: _refetchWebhooks,
    useWebhookDeliveries,
  } = useWorkflowWebhooks();

  // Dialog states
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WorkflowWebhook | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [webhookToDelete, setWebhookToDelete] = useState<WorkflowWebhook | null>(null);
  const [deliveryLogOpen, setDeliveryLogOpen] = useState(false);
  const [selectedWebhookForLog, setSelectedWebhookForLog] = useState<WorkflowWebhook | null>(null);

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuWebhook, setMenuWebhook] = useState<WorkflowWebhook | null>(null);

  // Delivery history query - always call the hook unconditionally (it has enabled: !!webhookId internally)
  const deliveriesQuery = useWebhookDeliveries(selectedWebhookForLog?.id ?? 0);

  // Handlers
  const handleOpenCreate = () => {
    setEditingWebhook(null);
    setConfigDialogOpen(true);
  };

  const handleOpenEdit = (webhook: WorkflowWebhook) => {
    setEditingWebhook(webhook);
    setConfigDialogOpen(true);
    handleCloseMenu();
  };

  const handleCloseConfig = () => {
    setConfigDialogOpen(false);
    setEditingWebhook(null);
  };

  const handleSubmitConfig = (data: CreateWorkflowWebhookData | UpdateWorkflowWebhookData) => {
    if (editingWebhook) {
      updateWebhook({ id: editingWebhook.id, data }, { onSuccess: handleCloseConfig });
    } else {
      createWebhook(data as CreateWorkflowWebhookData, { onSuccess: handleCloseConfig });
    }
  };

  const handleOpenDelete = (webhook: WorkflowWebhook) => {
    setWebhookToDelete(webhook);
    setDeleteDialogOpen(true);
    handleCloseMenu();
  };

  const handleConfirmDelete = () => {
    if (webhookToDelete) {
      deleteWebhook(webhookToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setWebhookToDelete(null);
        },
      });
    }
  };

  const handleTest = (webhook: WorkflowWebhook) => {
    testWebhook(webhook.id);
    handleCloseMenu();
  };

  const handleOpenDeliveryLog = (webhook: WorkflowWebhook) => {
    setSelectedWebhookForLog(webhook);
    setDeliveryLogOpen(true);
    handleCloseMenu();
  };

  const handleCloseDeliveryLog = () => {
    setDeliveryLogOpen(false);
    setSelectedWebhookForLog(null);
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, webhook: WorkflowWebhook) => {
    setMenuAnchor(event.currentTarget);
    setMenuWebhook(webhook);
  };

  const handleCloseMenu = () => {
    setMenuAnchor(null);
    setMenuWebhook(null);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography
            variant="h5"
            gutterBottom
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <WebhookIcon />
            Workflow Webhooks
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure webhooks to send workflow events to external services
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
          Add Webhook
        </Button>
      </Box>

      {/* Info Alert */}
      <Alert severity="info" sx={{ mb: 3 }}>
        Webhooks allow you to integrate LifePlace workflows with external services like Zapier, Make
        (Integromat), custom APIs, and more. When workflow events occur, a signed HTTP request will
        be sent to your endpoint.
      </Alert>

      {/* Webhooks Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Events</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Success Rate</TableCell>
              <TableCell>Last Triggered</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoadingWebhooks ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Loading webhooks...
                  </Typography>
                </TableCell>
              </TableRow>
            ) : webhooks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <WebhookIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body1" color="text.secondary">
                    No webhooks configured
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Create your first webhook to start integrating with external services
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              webhooks.map((webhook) => (
                <TableRow key={webhook.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {webhook.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title={webhook.url}>
                      <Typography
                        variant="body2"
                        sx={{
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                        }}
                      >
                        {webhook.url}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {webhook.events.slice(0, 2).map((event) => (
                        <Chip
                          key={event}
                          label={event.replace(/_/g, ' ')}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      ))}
                      {webhook.events.length > 2 && (
                        <Chip
                          label={`+${webhook.events.length - 2}`}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.65rem' }}
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    {webhook.is_active ? (
                      <Chip
                        icon={<ActiveIcon />}
                        label="Active"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    ) : (
                      <Chip
                        icon={<InactiveIcon />}
                        label="Inactive"
                        size="small"
                        color="default"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {webhook.delivery_count && webhook.delivery_count > 0 ? (
                      <Tooltip title={`${webhook.delivery_count} total deliveries`}>
                        <Chip
                          label={`${Math.round((webhook.success_rate || 0) * 100)}%`}
                          size="small"
                          color={
                            (webhook.success_rate || 0) >= 0.9
                              ? 'success'
                              : (webhook.success_rate || 0) >= 0.5
                                ? 'warning'
                                : 'error'
                          }
                          variant="outlined"
                        />
                      </Tooltip>
                    ) : (
                      <Typography variant="caption" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {webhook.last_triggered_at ? (
                      <Typography variant="body2" color="text.secondary">
                        {formatDistanceToNow(new Date(webhook.last_triggered_at), {
                          addSuffix: true,
                        })}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Never
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={(e) => handleOpenMenu(e, webhook)}>
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={handleCloseMenu}>
        <MenuItem onClick={() => menuWebhook && handleTest(menuWebhook)}>
          <ListItemIcon>
            {isTestingWebhook ? <CircularProgress size={20} /> : <TestIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText>Send Test</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuWebhook && handleOpenDeliveryLog(menuWebhook)}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Deliveries</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuWebhook && handleOpenEdit(menuWebhook)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => menuWebhook && handleOpenDelete(menuWebhook)}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Config Dialog */}
      <WebhookConfigDialog
        open={configDialogOpen}
        onClose={handleCloseConfig}
        editingWebhook={editingWebhook}
        onSubmit={handleSubmitConfig}
        isLoading={isCreatingWebhook || isUpdatingWebhook}
      />

      {/* Delete Confirmation Dialog */}
      <SimpleConfirmDialog
        open={deleteDialogOpen}
        title="Delete Webhook"
        message={`Are you sure you want to delete the webhook "${webhookToDelete?.name}"?`}
        type="delete"
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteDialogOpen(false);
          setWebhookToDelete(null);
        }}
      />

      {/* Delivery Log Dialog */}
      {selectedWebhookForLog && (
        <WebhookDeliveryLog
          open={deliveryLogOpen}
          onClose={handleCloseDeliveryLog}
          webhookName={selectedWebhookForLog.name}
          deliveries={deliveriesQuery.data || []}
          isLoading={deliveriesQuery.isLoading}
          onRefresh={() => deliveriesQuery.refetch()}
        />
      )}
    </Box>
  );
};

export default WorkflowWebhooks;
