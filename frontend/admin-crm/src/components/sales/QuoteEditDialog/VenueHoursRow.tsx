import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  TableCell,
  TableRow,
  Chip,
  Tooltip,
  TextField,
} from '@mui/material';
import { Info as InfoIcon } from '@mui/icons-material';
import type { LineItemFormData } from './types';

interface VenueHoursRowProps {
  item: LineItemFormData;
  index: number;
  isCalculating: number | null;
  onVenueHoursChange: (index: number, venueId: number, hours: number) => void;
}

export const VenueHoursRow: React.FC<VenueHoursRowProps> = ({
  item,
  index,
  isCalculating,
  onVenueHoursChange,
}) => {
  return (
    <TableRow>
      <TableCell colSpan={7} sx={{ py: 1.5, borderBottom: 'none', bgcolor: 'action.hover' }}>
        <Box sx={{ pl: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Tooltip title="Set additional hours per venue to calculate excess charges">
              <InfoIcon fontSize="small" color="info" />
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              Additional Hours by Venue
            </Typography>
            {item.excess_hours != null && item.excess_hours > 0 && (
              <Chip
                size="small"
                label={`Total: ${item.excess_hours}h = ₱${item.excess_cost || '0.00'}`}
                color="primary"
                variant="outlined"
              />
            )}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {item.available_venues?.map((venue) => {
              const currentHours = item.venue_additional_hours?.[String(venue.venue_id)] || 0;
              return (
                <Box
                  key={venue.venue_id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    border: 1,
                    borderColor: currentHours > 0 ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    bgcolor: 'background.paper',
                  }}
                >
                  <Box sx={{ minWidth: 120 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {venue.venue_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {venue.included_hours}h incl. | ₱{venue.excess_hour_price}/h extra
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                      size="small"
                      onClick={() =>
                        onVenueHoursChange(index, venue.venue_id, Math.max(0, currentHours - 1))
                      }
                      disabled={isCalculating === index || currentHours === 0}
                    >
                      <Typography variant="body1" fontWeight="bold">
                        −
                      </Typography>
                    </IconButton>
                    <TextField
                      size="small"
                      type="number"
                      value={currentHours}
                      onChange={(e) =>
                        onVenueHoursChange(
                          index,
                          venue.venue_id,
                          Math.max(0, parseInt(e.target.value) || 0),
                        )
                      }
                      disabled={isCalculating === index}
                      inputProps={{
                        min: 0,
                        style: { textAlign: 'center', width: '40px' },
                      }}
                      sx={{ '& input': { p: 0.5 } }}
                    />
                    <IconButton
                      size="small"
                      onClick={() => onVenueHoursChange(index, venue.venue_id, currentHours + 1)}
                      disabled={isCalculating === index}
                    >
                      <Typography variant="body1" fontWeight="bold">
                        +
                      </Typography>
                    </IconButton>
                  </Box>
                  {currentHours > 0 && (
                    <Chip
                      size="small"
                      label={`₱${(currentHours * venue.excess_hour_price).toFixed(2)}`}
                      color="primary"
                      variant="filled"
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </TableCell>
    </TableRow>
  );
};
