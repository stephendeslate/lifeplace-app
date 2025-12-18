// frontend/admin-crm/src/components/products/PackageVendorsSection.tsx

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Store as VendorIcon,
} from '@mui/icons-material';
import { useVendors, usePackageVendors } from '../../hooks/useVendors';
import type { VendorListItem, PackageVendorInline, VendorServiceCategory } from '../../types/vendors.types';

interface PackageVendorsSectionProps {
  packageId: number;
}

const getCategoryLabel = (category: VendorServiceCategory): string => {
  const labels: Record<VendorServiceCategory, string> = {
    CATERING: 'Catering',
    PHOTOGRAPHY: 'Photography',
    VIDEOGRAPHY: 'Videography',
    DJ: 'DJ / Music',
    FLORIST: 'Florist',
    DECORATOR: 'Decorator',
    ENTERTAINMENT: 'Entertainment',
    TRANSPORTATION: 'Transportation',
    MAKEUP: 'Makeup & Styling',
    RENTALS: 'Equipment Rentals',
    OFFICIANT: 'Officiant',
    COORDINATION: 'Event Coordination',
    OTHER: 'Other',
  };
  return labels[category] || 'Other';
};

const getCategoryColor = (category: VendorServiceCategory): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const colors: Record<VendorServiceCategory, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    CATERING: 'warning',
    PHOTOGRAPHY: 'info',
    VIDEOGRAPHY: 'info',
    DJ: 'secondary',
    FLORIST: 'success',
    DECORATOR: 'primary',
    ENTERTAINMENT: 'secondary',
    TRANSPORTATION: 'default',
    MAKEUP: 'error',
    RENTALS: 'default',
    OFFICIANT: 'primary',
    COORDINATION: 'warning',
    OTHER: 'default',
  };
  return colors[category] || 'default';
};

export const PackageVendorsSection: React.FC<PackageVendorsSectionProps> = ({
  packageId,
}) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<VendorListItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ id: number; notes: string } | null>(null);

  // Get all vendors for selection
  const { vendors: allVendors, isLoadingVendors } = useVendors({ is_active: true });

  // Get assigned vendors for this package
  const {
    useVendorsForPackage,
    createPackageVendor,
    updatePackageVendor,
    deletePackageVendor,
    isCreatingPackageVendor,
    isUpdatingPackageVendor,
    isDeletingPackageVendor,
  } = usePackageVendors();

  const { data: assignedVendors = [], isLoading: isLoadingAssigned } = useVendorsForPackage(packageId);

  // Filter out already-assigned vendors
  const availableVendors = useMemo(() => {
    const assignedIds = new Set(assignedVendors.map((v: PackageVendorInline) => v.vendor));
    return allVendors.filter((v) => !assignedIds.has(v.id));
  }, [allVendors, assignedVendors]);

  // Handlers
  const handleAddVendor = () => {
    if (!selectedVendor) return;

    const nextOrder = assignedVendors.length > 0
      ? Math.max(...assignedVendors.map((v: PackageVendorInline) => v.sort_order)) + 1
      : 1;

    createPackageVendor({
      package: packageId,
      vendor: selectedVendor.id,
      sort_order: nextOrder,
    });

    setSelectedVendor(null);
    setAddDialogOpen(false);
  };

  const handleDeleteVendor = (id: number) => {
    deletePackageVendor(id);
    setDeleteConfirmId(null);
  };

  const handleSaveNotes = () => {
    if (!editingNotes) return;
    updatePackageVendor({ id: editingNotes.id, data: { notes: editingNotes.notes } });
    setEditingNotes(null);
  };

  const isLoading = isLoadingVendors || isLoadingAssigned;
  const isMutating = isCreatingPackageVendor || isUpdatingPackageVendor || isDeletingPackageVendor;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Included Vendors</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
          disabled={isMutating || availableVendors.length === 0}
        >
          Add Vendor
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress size={24} />
        </Box>
      ) : assignedVendors.length === 0 ? (
        <Alert severity="info">
          No vendors assigned to this package yet. Add vendors to define which service providers are included.
        </Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Vendor</TableCell>
                <TableCell width={150}>Category</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell width={60}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignedVendors
                .sort((a: PackageVendorInline, b: PackageVendorInline) => a.sort_order - b.sort_order)
                .map((pv: PackageVendorInline) => (
                  <TableRow key={pv.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <VendorIcon fontSize="small" color="action" />
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {pv.vendor_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {pv.vendor_code}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={getCategoryLabel(pv.vendor_service_category)}
                        variant="outlined"
                        color={getCategoryColor(pv.vendor_service_category)}
                      />
                    </TableCell>
                    <TableCell>
                      {editingNotes?.id === pv.id ? (
                        <TextField
                          size="small"
                          value={editingNotes.notes}
                          onChange={(e) => setEditingNotes({ id: pv.id, notes: e.target.value })}
                          onBlur={handleSaveNotes}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveNotes()}
                          placeholder="Add notes..."
                          fullWidth
                          autoFocus
                        />
                      ) : (
                        <Typography
                          variant="body2"
                          color={pv.notes ? 'text.primary' : 'text.secondary'}
                          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          onClick={() => setEditingNotes({ id: pv.id, notes: pv.notes || '' })}
                        >
                          {pv.notes || 'Click to add notes'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => setDeleteConfirmId(pv.id)}
                        disabled={isMutating}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Vendor Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Vendor to Package</DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <Autocomplete
              options={availableVendors}
              getOptionLabel={(option) => `${option.name} (${option.code})`}
              value={selectedVendor}
              onChange={(_, newValue) => setSelectedVendor(newValue)}
              loading={isLoadingVendors}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Vendor"
                  placeholder="Search vendors..."
                  helperText={availableVendors.length === 0 ? 'All vendors are already assigned' : undefined}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...rest } = props;
                return (
                  <li key={key} {...rest}>
                    <Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        <VendorIcon fontSize="small" color="action" />
                        <Typography>{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({option.code})
                        </Typography>
                      </Box>
                      <Chip
                        size="small"
                        label={getCategoryLabel(option.service_category)}
                        variant="outlined"
                        color={getCategoryColor(option.service_category)}
                        sx={{ ml: 3.5, mt: 0.5 }}
                      />
                    </Box>
                  </li>
                );
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAddVendor}
            disabled={!selectedVendor || isCreatingPackageVendor}
            startIcon={isCreatingPackageVendor ? <CircularProgress size={16} /> : undefined}
          >
            Add Vendor
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Remove Vendor</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this vendor from the package?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmId && handleDeleteVendor(deleteConfirmId)}
            disabled={isDeletingPackageVendor}
            startIcon={isDeletingPackageVendor ? <CircularProgress size={16} /> : undefined}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
