// frontend/admin-crm/src/components/payments/TaxRateTable.tsx

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
  Star as StarIcon,
} from '@mui/icons-material';
import { formatDistanceToNow } from 'date-fns';
import { useDeleteTaxRate } from '../../hooks/usePayments';
import type { TaxRate } from '../../types/payments.types';

interface TaxRateTableProps {
  taxRates: TaxRate[];
  isLoading: boolean;
  onEdit: (taxRate: TaxRate) => void;
}

export const TaxRateTable: React.FC<TaxRateTableProps> = ({
  taxRates,
  isLoading,
  onEdit,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTaxRate, setSelectedTaxRate] = useState<TaxRate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taxRateToDelete, setTaxRateToDelete] = useState<TaxRate | null>(null);

  const { mutate: deleteTaxRate, isPending: isDeleting } = useDeleteTaxRate();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, taxRate: TaxRate) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedTaxRate(taxRate);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedTaxRate(null);
  };

  const handleEdit = () => {
    if (selectedTaxRate) {
      onEdit(selectedTaxRate);
      handleMenuClose();
    }
  };

  const handleDelete = () => {
    if (selectedTaxRate) {
      setTaxRateToDelete(selectedTaxRate);
      setDeleteDialogOpen(true);
      handleMenuClose();
    }
  };

  const handleDeleteConfirm = () => {
    if (taxRateToDelete) {
      deleteTaxRate(taxRateToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setTaxRateToDelete(null);
        },
      });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setTaxRateToDelete(null);
  };

  const formatTaxRate = (rate: string) => {
    const numRate = parseFloat(rate);
    return `${numRate.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (taxRates.length === 0) {
    return (
      <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No tax rates configured yet.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Add tax rates to apply them to invoices and quotes.
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
              <TableCell><strong>Rate</strong></TableCell>
              <TableCell><strong>Region</strong></TableCell>
              <TableCell><strong>Default</strong></TableCell>
              <TableCell><strong>Created</strong></TableCell>
              <TableCell align="right"><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {taxRates.map((taxRate) => (
              <TableRow key={taxRate.id} hover>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight="medium">
                      {taxRate.name}
                    </Typography>
                    {taxRate.is_default && (
                      <Tooltip title="Default tax rate">
                        <StarIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatTaxRate(taxRate.rate)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {taxRate.region || 'Global'}
                  </Typography>
                </TableCell>
                <TableCell>
                  {taxRate.is_default ? (
                    <Chip
                      label="Default"
                      color="warning"
                      size="small"
                      icon={<StarIcon />}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      —
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Tooltip title={new Date(taxRate.created_at).toLocaleString()}>
                    <Typography variant="body2" color="text.secondary">
                      {formatDistanceToNow(new Date(taxRate.created_at), { addSuffix: true })}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, taxRate)}
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
        <DialogTitle>Delete Tax Rate</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{taxRateToDelete?.name}"? This action cannot be undone.
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