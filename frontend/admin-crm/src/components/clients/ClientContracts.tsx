// frontend/admin-crm/src/components/clients/ClientContracts.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Description as ContractIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Send as SendIcon,
  GetApp as DownloadIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useContractsForClient } from '../../hooks/useContracts';
import type { EventContract } from '../../types/contracts.types';
import type { Client } from '../../types/clients.types';

interface ClientContractsProps {
  client: Client;
}

export const ClientContracts: React.FC<ClientContractsProps> = ({ client }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContract, setSelectedContract] = useState<EventContract | null>(null);

  const { data: contracts = [], isLoading } = useContractsForClient(client.id);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, contract: EventContract) => {
    setAnchorEl(event.currentTarget);
    setSelectedContract(contract);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedContract(null);
  };

  const handleViewContract = (contract: EventContract) => {
    navigate(`/contracts/${contract.id}`);
  };

  const handleEditContract = (contract: EventContract) => {
    navigate(`/contracts/${contract.id}/edit`);
  };

  const handleCreateContract = () => {
    navigate(`/contracts/new?client=${client.id}`);
  };

  const formatCurrency = (amount: string | number | null) => {
    if (amount === null || amount === undefined) {
      return '-';
    }
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  const getStatusColor = (status: string): "default" | "primary" | "success" | "warning" | "error" => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'SENT':
        return 'primary';
      case 'SIGNED':
        return 'success';
      case 'VOID':
        return 'error';
      case 'EXPIRED':
        return 'warning';
      default:
        return 'default';
    }
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
          Create a contract to formalize agreements with this client.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateContract}
        >
          Create Contract
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Contracts</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateContract}
          size="small"
        >
          Create Contract
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell>Contract Value</TableCell>
              <TableCell>Valid Until</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Signatures</TableCell>
              <TableCell>Created</TableCell>
              <TableCell width="50"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {contract.event_details?.name || `Event #${contract.event}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatCurrency(contract.contract_value)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {contract.valid_until ? new Date(contract.valid_until).toLocaleDateString() : '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={contract.status_display || contract.status}
                    size="small"
                    color={getStatusColor(contract.status)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {contract.signature_progress 
                      ? `${contract.signature_progress.signed_count} / ${contract.signature_progress.total_required}` 
                      : `${contract.signatures?.length || 0} / -`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(contract.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, contract)}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedContract && handleViewContract(selectedContract)}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View</ListItemText>
        </MenuItem>
        {selectedContract?.status === 'DRAFT' && (
          <MenuItem onClick={() => selectedContract && handleEditContract(selectedContract)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {selectedContract?.status === 'DRAFT' && (
          <MenuItem onClick={handleMenuClose}>
            <ListItemIcon>
              <SendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Send for Signature</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Download PDF</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
};