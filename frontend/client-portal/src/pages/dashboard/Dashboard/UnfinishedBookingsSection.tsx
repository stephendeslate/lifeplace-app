import React from 'react';
import { Box, Typography, Stack, Button, LinearProgress, useTheme, alpha } from '@mui/material';
import { ShoppingCart as BookingIcon, ArrowForward as ArrowForwardIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import type { UnfinishedBookingSession } from '@/hooks/useUnfinishedBookings';

interface UnfinishedBookingsSectionProps {
  unfinishedBookings: UnfinishedBookingSession[];
  onNavigate: (path: string) => void;
}

const UnfinishedBookingsSection: React.FC<UnfinishedBookingsSectionProps> = ({
  unfinishedBookings,
  onNavigate,
}) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <BookingIcon color="primary" />
        Continue Your Booking
      </Typography>

      <Stack spacing={2}>
        {unfinishedBookings.map((session) => (
          <GlassCard
            key={session.session_id}
            variant="light"
            intensity="subtle"
            hover={true}
            sx={{
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              cursor: 'pointer',
            }}
            onClick={() => onNavigate(`/book?session_id=${session.session_id}`)}
          >
            <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} p={2}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: alpha(theme.palette.primary.main, 0.15),
                  color: theme.palette.primary.main,
                }}
              >
                <BookingIcon />
              </Box>
              <Box
                sx={{
                  flex: 1,
                  minWidth: { xs: 'calc(100% - 56px)', sm: 0 },
                }}
              >
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {session.booking_flow?.name || 'Booking in Progress'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {session.current_step?.name || 'Step'} - {session.progress_percentage}% complete
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <LinearProgress
                  variant="determinate"
                  value={session.progress_percentage}
                  sx={{ width: 60, height: 6, borderRadius: 3 }}
                />
                <Button
                  variant="contained"
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate(`/book?session_id=${session.session_id}`);
                  }}
                >
                  Continue
                </Button>
              </Box>
            </Box>
          </GlassCard>
        ))}
      </Stack>
    </Box>
  );
};

export default UnfinishedBookingsSection;
