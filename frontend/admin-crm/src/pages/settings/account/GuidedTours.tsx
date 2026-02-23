// frontend/admin-crm/src/pages/settings/account/GuidedTours.tsx

import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Divider,
  Paper,
  Stack,
} from '@mui/material';
import {
  School as TourIcon,
  Refresh as ResetIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompletedIcon,
  SkipNext as SkippedIcon,
} from '@mui/icons-material';
import { useWalkthrough } from '../../../contexts/WalkthroughContext';
import { getAllTours } from '../../../config/walkthrough-tours';
import { useLayout } from '../../../contexts/LayoutContext';
import { ModernPageHeader } from '../../../components/common/ModernPageHeader';
import { tokens } from '../../../design-system';

export const GuidedTours: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const {
    preferences,
    setAutoShowTours,
    resetTourProgress,
    resetAllTours,
    isTourDismissed,
    startTour,
  } = useWalkthrough();

  const tours = getAllTours();

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Account Management' },
      { label: 'Guided Tours' },
    ]);
  }, [setBreadcrumbs]);

  const getTourStatus = (tourId: string) => {
    const progress = preferences.completedTours.find((t) => t.tourId === tourId);
    if (progress?.completed) return 'completed';
    if (progress?.skipped) return 'skipped';
    if (isTourDismissed(tourId as never)) return 'dismissed';
    return 'not_started';
  };

  return (
    <Box>
      <ModernPageHeader
        title="Guided Tours"
        subtitle="Manage your tour preferences and restart guided walkthroughs"
        icon={<TourIcon />}
        size="medium"
      />

      {/* Preferences Section */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 2,
          border: `1px solid ${tokens.color.neutral[200]}`,
        }}
      >
        <Typography variant="h6" fontWeight={600} mb={2}>
          Tour Preferences
        </Typography>

        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={preferences.autoShowTours}
                onChange={(e) => setAutoShowTours(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Box>
                <Typography variant="body1">Automatically show tours for new features</Typography>
                <Typography variant="body2" color="text.secondary">
                  When enabled, relevant tours will automatically start when you visit new features
                </Typography>
              </Box>
            }
            sx={{ alignItems: 'flex-start', ml: 0 }}
          />

          <Divider />

          <Box>
            <Typography variant="body2" color="text.secondary" mb={1}>
              Reset all tour progress to see them again
            </Typography>
            <Button
              variant="outlined"
              color="warning"
              startIcon={<ResetIcon />}
              onClick={resetAllTours}
              size="small"
            >
              Reset All Tour Progress
            </Button>
          </Box>
        </Stack>
      </Paper>

      {/* Available Tours Section */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2,
          border: `1px solid ${tokens.color.neutral[200]}`,
        }}
      >
        <Typography variant="h6" fontWeight={600} mb={2}>
          Available Tours
        </Typography>

        <Typography variant="body2" color="text.secondary" mb={3}>
          Click "Start" to begin a tour or "Restart" to see a completed tour again.
        </Typography>

        <List disablePadding>
          {tours.map((tour, index) => {
            const status = getTourStatus(tour.id);
            const Icon = tour.icon || TourIcon;

            return (
              <React.Fragment key={tour.id}>
                {index > 0 && <Divider sx={{ my: 1 }} />}
                <ListItem
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: tokens.color.neutral[50],
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 48 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor:
                          status === 'completed'
                            ? tokens.color.success[50]
                            : tokens.color.primary[50],
                      }}
                    >
                      <Icon
                        sx={{
                          color:
                            status === 'completed'
                              ? tokens.color.success[600]
                              : tokens.color.primary[600],
                        }}
                      />
                    </Box>
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="subtitle1" fontWeight={500}>
                          {tour.name}
                        </Typography>
                        {status === 'completed' && (
                          <Chip
                            size="small"
                            icon={<CompletedIcon sx={{ fontSize: 16 }} />}
                            label="Completed"
                            color="success"
                            variant="outlined"
                            sx={{ height: 24 }}
                          />
                        )}
                        {status === 'skipped' && (
                          <Chip
                            size="small"
                            icon={<SkippedIcon sx={{ fontSize: 16 }} />}
                            label="Skipped"
                            color="warning"
                            variant="outlined"
                            sx={{ height: 24 }}
                          />
                        )}
                        {tour.category && (
                          <Chip
                            size="small"
                            label={tour.category}
                            variant="outlined"
                            sx={{
                              height: 24,
                              textTransform: 'capitalize',
                              borderColor: tokens.color.neutral[300],
                              color: tokens.color.neutral[600],
                            }}
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        {tour.description} ({tour.steps.length} steps)
                      </Typography>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1}>
                      {(status === 'completed' || status === 'skipped') && (
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<ResetIcon />}
                          onClick={() => resetTourProgress(tour.id)}
                          sx={{ minWidth: 90 }}
                        >
                          Reset
                        </Button>
                      )}
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<StartIcon />}
                        onClick={() => startTour(tour.id)}
                        sx={{ minWidth: 90 }}
                      >
                        {status === 'not_started' ? 'Start' : 'Restart'}
                      </Button>
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              </React.Fragment>
            );
          })}
        </List>
      </Paper>
    </Box>
  );
};

export default GuidedTours;
