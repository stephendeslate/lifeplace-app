// frontend/admin-crm/src/components/venues/VenuesTable.tsx

import React from 'react';
import { Box, Typography, Chip, Tooltip, Stack } from '@mui/material';
import {
  LocationOn as VenueIcon,
  NightsStay as OvernightIcon,
  WbSunny as DayIcon,
  People as CapacityIcon,
  Settings as RulesIcon,
} from '@mui/icons-material';
import type { VenueListItem } from '../../types/venues.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState, createStandardActions } from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common';

interface VenuesTableProps {
  venues: VenueListItem[];
  isLoading: boolean;
  onEdit: (venue: VenueListItem) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export const VenuesTable: React.FC<VenuesTableProps> = ({
  venues,
  isLoading,
  onEdit,
  onDelete,
}) => {
  const getTypeChip = (isOvernight: boolean) => (
    <Chip
      icon={isOvernight ? <OvernightIcon /> : <DayIcon />}
      label={isOvernight ? 'Overnight' : 'Day Event'}
      size="small"
      color={isOvernight ? 'secondary' : 'primary'}
      variant="outlined"
    />
  );

  const getStatusChip = (isActive: boolean, isBookable: boolean) => (
    <Stack direction="row" spacing={0.5}>
      <Chip
        label={isActive ? 'Active' : 'Inactive'}
        size="small"
        color={isActive ? 'success' : 'default'}
        variant={isActive ? 'filled' : 'outlined'}
      />
      {isActive && (
        <Chip
          label={isBookable ? 'Bookable' : 'Not Bookable'}
          size="small"
          color={isBookable ? 'info' : 'warning'}
          variant="outlined"
        />
      )}
    </Stack>
  );

  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Venue',
      sortable: true,
      render: (_, row) => {
        const venue = row as unknown as VenueListItem;
        return (
          <Box display="flex" alignItems="center" gap={1}>
            <VenueIcon color="primary" fontSize="small" />
            <Box>
              <Typography variant="subtitle2" fontWeight="medium">
                {venue.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Code: {venue.code}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      render: (_, row) => {
        const venue = row as unknown as VenueListItem;
        return getTypeChip(venue.is_overnight);
      },
    },
    {
      key: 'capacity',
      label: 'Capacity',
      render: (_, row) => {
        const venue = row as unknown as VenueListItem;
        return (
          <Box display="flex" alignItems="center" gap={0.5}>
            <CapacityIcon fontSize="small" color="action" />
            <Typography variant="body2">
              {venue.minimum_capacity} - {venue.maximum_capacity}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, row) => {
        const venue = row as unknown as VenueListItem;
        return getStatusChip(venue.is_active, venue.is_bookable);
      },
    },
    {
      key: 'has_operating_rules',
      label: 'Rules',
      align: 'center',
      render: (_, row) => {
        const venue = row as unknown as VenueListItem;
        return (
          venue.has_operating_rules ? (
            <Tooltip title="Has operating rules configured">
              <RulesIcon color="success" />
            </Tooltip>
          ) : (
            <Tooltip title="No operating rules configured">
              <RulesIcon color="disabled" />
            </Tooltip>
          )
        );
      },
    },
    {
      key: 'packages_count',
      label: 'Packages',
      align: 'center',
      render: (_, row) => {
        const venue = row as unknown as VenueListItem;
        return (
          <Chip
            label={venue.packages_count}
            size="small"
            variant="outlined"
            color={venue.packages_count > 0 ? 'primary' : 'default'}
          />
        );
      },
    },
  ];

  const actions = createStandardActions(
    (venue: VenueListItem) => onEdit(venue),
    (venue: VenueListItem) => onDelete(venue.id),
    {
      editLabel: 'Edit Venue',
      deleteLabel: 'Delete Venue',
    }
  );

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (venues.length === 0) {
    return (
      <ModernEmptyState
        icon={VenueIcon}
        title="No venues found"
        description="Create your first venue to get started with venue-based booking rules"
        tip={{ text: "Venues define operating hours, capacity limits, and booking constraints", type: "info" }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={venues as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
      onRowClick={(row) => onEdit(row as unknown as VenueListItem)}
      sortBy="name"
      sortOrder="asc"
    />
  );
};
