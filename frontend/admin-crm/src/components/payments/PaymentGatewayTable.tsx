// frontend/admin-crm/src/components/payments/PaymentGatewayTable.tsx

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useDeletePaymentGateway } from '../../hooks/usePayments';
import type { PaymentGateway } from '../../types/payments.types';

interface PaymentGatewayTableProps {
  gateways: PaymentGateway[];
  isLoading: boolean;
  onEdit: (gateway: PaymentGateway) => void;
}

export const PaymentGatewayTable: React.FC<PaymentGatewayTableProps> = ({
  gateways,
  isLoading,
  onEdit,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [gatewayToDelete, setGatewayToDelete] = useState<PaymentGateway | null>(null);

  const { mutate: deleteGateway, isPending: isDeleting } = useDeletePaymentGateway();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, gateway: PaymentGateway) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedGateway(gateway);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedGateway(null);
  };

  const handleEdit = () => {
    if (selectedGateway) {
      onEdit(selectedGateway);
      handleMenuClose();
    }
  };

  const handleDelete = () => {
    if (selectedGateway) {
      setGatewayToDelete(selectedGateway);
      setDeleteDialogOpen(true);
      handleMenuClose();
    }
  };

  const handleDeleteConfirm = () => {
    if (gatewayToDelete) {
      deleteGateway(gatewayToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setGatewayToDelete(null);
        },
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setGatewayToDelete(null);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (gateways.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No payment gateways configured yet.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add a payment gateway to start processing payments.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>Name</strong></TableCell>
              <TableCell><strong>Code</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Description</strong></TableCell>
              <TableCell><strong>Created</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {gateways.map((gateway) => (
              <TableRow key={gateway.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {gateway.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontFamily="monospace">
                    {gateway.code}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={gateway.is_active ? 'Active' : 'Inactive'}
                    color={gateway.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {gateway.description || 'No description'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title={new Date(gateway.created_at).toLocaleString()}>
                    <Typography variant="body2" color="text.secondary">
                      {formatDistanceToNow(new Date(gateway.created_at), { addSuffix: true })}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, gateway)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete Payment Gateway</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{gatewayToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};