// frontend/client-portal/src/components/booking/steps/CleanPackageSelectionStep/VenueHoursSelector.tsx

import React from 'react';
import { Box, Typography, Chip, IconButton, Paper, useTheme, alpha } from '@mui/material';
import { Remove as RemoveIcon, Add as AddIcon } from '@mui/icons-material';
import type { RentableVenue, RentableVenueWithEventType } from '@/types/booking/venues.types';
import { VenuesApi } from '@/apis/booking/venues.api';

interface VenueHoursSelectorProps {
  venues: (RentableVenue | RentableVenueWithEventType)[];
  venueHours: Record<number, number>;
  onHoursChange: (venueId: number, hours: number) => void;
  maxHours?: number;
}

const VenueHoursSelector: React.FC<VenueHoursSelectorProps> = ({
  venues,
  venueHours,
  onHoursChange,
  maxHours = 10,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Customize Your Hours
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Need more time? Add additional hours to your venues.
      </Typography>

      {venues.map((venue) => {
        const pricing = VenuesApi.getEffectivePricing(venue);
        const additionalHours = venueHours[venue.id] || 0;
        const excessPrice = parseFloat(pricing.excessHourPrice || '0');
        const includedHours = parseFloat(pricing.includedHours || '0');
        const totalCost = additionalHours * excessPrice;

        // Skip hours selector for all-day access venues
        if (pricing.isAllDayAccess) {
          return (
            <Paper
              key={venue.id}
              sx={{
                p: 2,
                mb: 2,
                backgroundColor: alpha(theme.palette.success.main, 0.08),
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography fontWeight={600}>{venue.name}</Typography>
                  <Typography variant="body2" color="success.main" fontWeight={500}>
                    All-day access included
                  </Typography>
                </Box>
                <Chip label="All Day" color="success" size="small" />
              </Box>
            </Paper>
          );
        }

        return (
          <Paper
            key={venue.id}
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: alpha('#fff', 0.08),
              border: `1px solid ${alpha('#fff', 0.1)}`,
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: alpha('#fff', 0.12),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              },
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              flexWrap="wrap"
              gap={2}
            >
              <Box sx={{ flex: '1 1 200px' }}>
                <Typography fontWeight={600}>{venue.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Includes {includedHours} hours
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={2} sx={{ flex: '0 0 auto' }}>
                <Typography variant="body2" color="text.secondary">
                  Need more?
                </Typography>

                <Box
                  display="flex"
                  alignItems="center"
                  gap={1}
                  sx={{
                    backgroundColor: alpha('#fff', 0.05),
                    borderRadius: 2,
                    p: 0.5,
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={() => onHoursChange(venue.id, Math.max(0, additionalHours - 1))}
                    disabled={additionalHours === 0}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                      '&.Mui-disabled': { opacity: 0.3 },
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>

                  <Typography
                    sx={{
                      minWidth: 50,
                      textAlign: 'center',
                      fontWeight: 600,
                      fontSize: '1.1rem',
                    }}
                  >
                    +{additionalHours}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={() => onHoursChange(venue.id, Math.min(maxHours, additionalHours + 1))}
                    disabled={additionalHours >= maxHours}
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      '&:hover': { backgroundColor: alpha('#fff', 0.2) },
                      '&.Mui-disabled': { opacity: 0.3 },
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>

                {additionalHours > 0 && (
                  <Chip
                    label={`+₱${totalCost.toLocaleString()}`}
                    color="secondary"
                    size="small"
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                    }}
                  />
                )}
              </Box>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Additional hours: ₱{excessPrice.toLocaleString()}/hr
            </Typography>
          </Paper>
        );
      })}
    </Box>
  );
};

export { VenueHoursSelector };
