// frontend/admin-crm/src/components/events/EventContracts.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Description as ContractIcon,
  Draw as SignIcon,
  Cancel as VoidIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useContractsForEvent, useContractTemplates, useCreateEventContract } from '../../hooks/useContracts';
import type { Event } from '../../types/events.types';
import type { EventContract } from '../../types/contracts.types';

interface EventContractsProps {
  event: Event;
}


const getStatusColor = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'SENT':
      return 'info';
    case 'PARTIALLY_SIGNED':
      return 'warning';
    case 'SIGNED':
      return 'success';
    case 'EXPIRED':
      return 'warning';
    case 'VOID':
      return 'error';
    case 'AMENDED':
      return 'info';
    default:
      return 'default';
  }
};

export const EventContracts: React.FC<EventContractsProps> = ({ event }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContract, setSelectedContract] = useState<EventContract | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');

  const { data: contracts = [], isLoading } = useContractsForEvent(event.id);
  const { data: templates = [] } = useContractTemplates({ 
    event_type: event.event_type !== null ? event.event_type : undefined
  });
  const { mutate: createContract, isPending: isCreating } = useCreateEventContract();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, contract: EventContract) => {
    setAnchorEl(event.currentTarget);
    setSelectedContract(contract);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedContract(null);
  };

  const handleCreateContract = () => {
    setCreateDialogOpen(true);
    // Set default valid until to 30 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setValidUntil(defaultDate.toISOString().split('T')[0]);
  };

  const handleSubmitCreate = () => {
    if (templateId) {
      createContract(
        {
          event: event.id,
          template: parseInt(templateId),
          valid_until: validUntil,
        },
        {
          onSuccess: () => {
            setCreateDialogOpen(false);
            setTemplateId('');
            setValidUntil('');
          },
        }
      );
    }
  };

  const handleViewContract = (contract: EventContract) => {
    navigate(`/contracts/${contract.id}`);
  };

  const handleEditContract = (contract: EventContract) => {
    navigate(`/contracts/${contract.id}/edit`);
  };

  const handleSendContract = (contract: EventContract) => {
    // Implementation for sending contract
    console.log('Send contract:', contract.id);
    handleMenuClose();
  };

  const handleVoidContract = (contract: EventContract) => {
    // Implementation for voiding contract
    console.log('Void contract:', contract.id);
    handleMenuClose();
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (contracts.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <ContractIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Contracts Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create a contract from a template to get started.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateContract}
          disabled={templates.length === 0}
        >
          Create Contract
        </Button>
        {templates.length === 0 && (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            No contract templates available for this event type.
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Event Contracts</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateContract}
          disabled={templates.length === 0}
        >
          Create Contract
        </Button>
      </Box>

      {/* Contracts Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Contract #</TableCell>
              <TableCell>Template</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Valid Until</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Signed</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    #{contract.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  Custom Contract
                </TableCell>
                <TableCell>
                  <Chip
                    label={contract.status_display || contract.status}
                    color={getStatusColor(contract.status) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {contract.contract_value
                    ? formatCurrency(contract.contract_value)
                    : '-'}
                </TableCell>
                <TableCell>
                  {contract.valid_until
                    ? format(new Date(contract.valid_until), 'MMM dd, yyyy')
                    : '-'}
                </TableCell>
                <TableCell>
                  {format(new Date(contract.created_at), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  {contract.fully_signed_at ? (
                    format(new Date(contract.fully_signed_at), 'MMM dd, yyyy')
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Not signed
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="View">
                      <IconButton
                        size="small"
                        onClick={() => handleViewContract(contract)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, contract)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedContract?.status === 'DRAFT' && (
          <MenuItem onClick={() => selectedContract && handleEditContract(selectedContract)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {selectedContract?.status === 'DRAFT' && (
          <MenuItem onClick={() => selectedContract && handleSendContract(selectedContract)}>
            <ListItemIcon>
              <SendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Send to Client</ListItemText>
          </MenuItem>
        )}
        {selectedContract?.status === 'SENT' && (
          <MenuItem onClick={() => navigate(`/contracts/${selectedContract?.id}/sign`)}>
            <ListItemIcon>
              <SignIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sign Contract</ListItemText>
          </MenuItem>
        )}
        {selectedContract && ['DRAFT', 'SENT', 'PARTIALLY_SIGNED'].includes(selectedContract.status) && (
          <MenuItem onClick={() => selectedContract && handleVoidContract(selectedContract)}>
            <ListItemIcon>
              <VoidIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Void Contract</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Create Contract Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Contract</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Contract Template</InputLabel>
              <Select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                label="Contract Template"
              >
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Valid Until"
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSubmitCreate}
            variant="contained"
            disabled={!templateId || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Contract'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Summary Card */}
      {contracts.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Contract Summary
            </Typography>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Contracts
                </Typography>
                <Typography variant="h6">{contracts.length}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Signed
                </Typography>
                <Typography variant="h6">
                  {contracts.filter((c) => c.status === 'SIGNED').length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Pending Signature
                </Typography>
                <Typography variant="h6">
                  {contracts.filter((c) => ['SENT', 'PARTIALLY_SIGNED'].includes(c.status)).length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Value
                </Typography>
                <Typography variant="h6">
                  {formatCurrency(
                    contracts
                      .filter((c) => c.contract_value)
                      .reduce((sum, c) => sum + parseFloat(c.contract_value || '0'), 0)
                  )}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};