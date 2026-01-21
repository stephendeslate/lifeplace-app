// frontend/admin-crm/src/components/products/PackageVenuesSection.tsx

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
  Radio,
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
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  NightsStay as OvernightIcon,
  WbSunny as DayIcon,
  Star as PrimaryIcon,
} from '@mui/icons-material';
import { useVenues, usePackageVenues } from '../../hooks/useVenues';
import type { VenueListItem, PackageVenueInline } from '../../types/venues.types';

interface PackageVenuesSectionProps {
  packageId: number;
}

export const PackageVenuesSection: React.FC<PackageVenuesSectionProps> = ({
  packageId,
}) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<VenueListItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<{ id: number; notes: string } | null>(null);
  const [editingDuration, setEditingDuration] = useState<{ id: number; hours: string } | null>(null);

  // Get all venues for selection
  const { venues: allVenues, isLoadingVenues } = useVenues({ is_active: true });

  // Get assigned venues for this package
  const {
    useVenuesForPackage,
    createPackageVenue,
    updatePackageVenue,
    deletePackageVenue,
    isCreatingPackageVenue,
    isUpdatingPackageVenue,
    isDeletingPackageVenue,
  } = usePackageVenues();

  const { data: assignedVenues = [], isLoading: isLoadingAssigned } = useVenuesForPackage(packageId);

  // Filter out already-assigned venues
  const availableVenues = useMemo(() => {
    const assignedIds = new Set(assignedVenues.map((v: PackageVenueInline) => v.venue));
    return allVenues.filter((v) => !assignedIds.has(v.id));
  }, [allVenues, assignedVenues]);

  // Handlers
  const handleAddVenue = () => {
    if (!selectedVenue) return;

    const nextOrder = assignedVenues.length > 0
      ? Math.max(...assignedVenues.map((v: PackageVenueInline) => v.access_order)) + 1
      : 1;

    createPackageVenue({
      package: packageId,
      venue: selectedVenue.id,
      is_primary: assignedVenues.length === 0, // First venue is primary by default
      access_order: nextOrder,
    });

    setSelectedVenue(null);
    setAddDialogOpen(false);
  };

  const handleSetPrimary = (venueAssignmentId: number) => {
    // First, unset all others as primary, then set this one
    assignedVenues.forEach((v: PackageVenueInline) => {
      if (v.id === venueAssignmentId && !v.is_primary) {
        updatePackageVenue({ id: v.id, data: { is_primary: true } });
      } else if (v.id !== venueAssignmentId && v.is_primary) {
        updatePackageVenue({ id: v.id, data: { is_primary: false } });
      }
    });
  };

  const handleDeleteVenue = (id: number) => {
    deletePackageVenue(id);
    setDeleteConfirmId(null);
  };

  const handleSaveNotes = () => {
    if (!editingNotes) return;
    updatePackageVenue({ id: editingNotes.id, data: { notes: editingNotes.notes } });
    setEditingNotes(null);
  };

  const handleSaveDuration = () => {
    if (!editingDuration) return;
    const hours = editingDuration.hours ? editingDuration.hours : null;
    updatePackageVenue({ id: editingDuration.id, data: { access_duration_hours: hours } });
    setEditingDuration(null);
  };

  const isLoading = isLoadingVenues || isLoadingAssigned;
  const isMutating = isCreatingPackageVenue || isUpdatingPackageVenue || isDeletingPackageVenue;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Included Venues</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddDialogOpen(true)}
          disabled={isMutating || availableVenues.length === 0}
        >
          Add Venue
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress size={24} />
        </Box>
      ) : assignedVenues.length === 0 ? (
        <Alert severity="info">
          No venues assigned to this package yet. Add venues to define which spaces are included.
        </Alert>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell width={80}>Primary</TableCell>
                <TableCell>Venue</TableCell>
                <TableCell width={100}>Type</TableCell>
                <TableCell width={120}>Duration</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell width={60}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignedVenues
                .sort((a: PackageVenueInline, b: PackageVenueInline) => a.access_order - b.access_order)
                .map((pv: PackageVenueInline) => (
                  <TableRow key={pv.id}>
                    <TableCell>
                      <Radio
                        checked={pv.is_primary}
                        onChange={() => handleSetPrimary(pv.id)}
                        disabled={isMutating}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight={pv.is_primary ? 600 : 400}>
                          {pv.venue_name}
                        </Typography>
                        {pv.is_primary && (
                          <Tooltip title="Primary venue determines datetime rules">
                            <PrimaryIcon fontSize="small" color="primary" />
                          </Tooltip>
                        )}
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {pv.venue_code}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={pv.venue_is_overnight ? <OvernightIcon /> : <DayIcon />}
                        label={pv.venue_is_overnight ? 'Overnight' : 'Day'}
                        variant="outlined"
                        color={pv.venue_is_overnight ? 'secondary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {editingDuration?.id === pv.id ? (
                        <TextField
                          size="small"
                          value={editingDuration.hours}
                          onChange={(e) => setEditingDuration({ id: pv.id, hours: e.target.value })}
                          onBlur={handleSaveDuration}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveDuration()}
                          placeholder="Default"
                          type="number"
                          sx={{ width: 80 }}
                          autoFocus
                        />
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                          onClick={() => setEditingDuration({ id: pv.id, hours: pv.access_duration_hours || '' })}
                        >
                          {pv.access_duration_hours ? `${pv.access_duration_hours}h` : 'Default'}
                        </Typography>
                      )}
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

      {/* Add Venue Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Venue to Package</DialogTitle>
        <DialogContent>
          <Box pt={1}>
            <Autocomplete
              options={availableVenues}
              getOptionLabel={(option) => `${option.name} (${option.code})`}
              value={selectedVenue}
              onChange={(_, newValue) => setSelectedVenue(newValue)}
              loading={isLoadingVenues}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Venue"
                  placeholder="Search venues..."
                  helperText={availableVenues.length === 0 ? 'All venues are already assigned' : undefined}
                />
              )}
              renderOption={(props, option) => {
                const { key, ...rest } = props;
                return (
                  <li key={key} {...rest}>
                    <Box>
                      <Box display="flex" alignItems="center" gap={1}>
                        {option.is_overnight ? (
                          <OvernightIcon fontSize="small" color="secondary" />
                        ) : (
                          <DayIcon fontSize="small" color="action" />
                        )}
                        <Typography>{option.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({option.code})
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Capacity: {option.minimum_capacity}-{option.maximum_capacity} guests
                      </Typography>
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
            onClick={handleAddVenue}
            disabled={!selectedVenue || isCreatingPackageVenue}
            startIcon={isCreatingPackageVenue ? <CircularProgress size={16} /> : undefined}
          >
            Add Venue
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onClose={() => setDeleteConfirmId(null)}>
        <DialogTitle>Remove Venue</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove this venue from the package?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteConfirmId && handleDeleteVenue(deleteConfirmId)}
            disabled={isDeletingPackageVenue}
            startIcon={isDeletingPackageVenue ? <CircularProgress size={16} /> : undefined}
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
