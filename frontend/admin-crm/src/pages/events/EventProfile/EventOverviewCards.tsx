// Event Overview Cards: Client Info, VIP Status, Event Details, Workflow Progress

import React from 'react';
import { Box, Chip, CircularProgress, Stack, Tooltip, Typography } from '@mui/material';
import {
  Person as PersonIcon,
  Launch as LaunchIcon,
  EventNote as EventNoteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  LocalAtm as CashIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { ClientVIPStatusCard } from '@/components/events/ClientVIPStatusCard';
import { WorkflowVisualization, DateTimeFull } from '@/components/common';
import type { EventProfileLogic } from './useEventProfileLogic';

interface EventOverviewCardsProps {
  event: NonNullable<EventProfileLogic['event']>;
  client: EventProfileLogic['client'];
  clientId: number;
  navigate: EventProfileLogic['navigate'];
  transformedWorkflowStages: EventProfileLogic['transformedWorkflowStages'];
  isLoadingStages: boolean;
  formatEventPrice: EventProfileLogic['formatEventPrice'];
}

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Typography
    variant="caption"
    color="text.secondary"
    sx={{
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      fontWeight: 600,
    }}
  >
    {children}
  </Typography>
);

export const EventOverviewCards: React.FC<EventOverviewCardsProps> = ({
  event,
  client,
  clientId,
  navigate,
  transformedWorkflowStages,
  isLoadingStages,
  formatEventPrice,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', lg: 'row' },
        gap: 3,
        mb: 4,
      }}
    >
      {/* Client Info */}
      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            borderRadius: 1,
            bgcolor: 'background.paper',
            p: 3,
            height: '100%',
          }}
        >
          <Stack spacing={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <PersonIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Client Information
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                <FieldLabel>Client Name</FieldLabel>
                <Tooltip
                  title={clientId ? 'Click to view client profile' : ''}
                  placement="top"
                  arrow
                >
                  <Box
                    onClick={() => clientId && navigate(`/clients/${clientId}`)}
                    sx={{ cursor: clientId ? 'pointer' : 'default', mt: 0.5 }}
                  >
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <Typography
                        variant="body1"
                        color={clientId ? 'primary' : 'text.primary'}
                        fontWeight={600}
                      >
                        {event.client_name || 'Unknown Client'}
                      </Typography>
                      {clientId && <LaunchIcon sx={{ fontSize: '0.9rem' }} color="primary" />}
                    </Stack>
                  </Box>
                </Tooltip>
              </Box>

              {client?.email && (
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <FieldLabel>Email Address</FieldLabel>
                  <Box display="flex" alignItems="center" gap={2} mt={1}>
                    <EmailIcon color="action" sx={{ fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500}>
                      {client.email}
                    </Typography>
                  </Box>
                </Box>
              )}

              {client?.profile?.phone && (
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <FieldLabel>Phone Number</FieldLabel>
                  <Box display="flex" alignItems="center" gap={2} mt={1}>
                    <PhoneIcon color="action" sx={{ fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500}>
                      {client.profile.phone}
                    </Typography>
                  </Box>
                </Box>
              )}

              {client?.profile?.company && (
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <FieldLabel>Company</FieldLabel>
                  <Box display="flex" alignItems="center" gap={2} mt={1}>
                    <BusinessIcon color="action" sx={{ fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500}>
                      {client.profile.company}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Client VIP Status */}
      {clientId && (
        <Box sx={{ flex: 1, maxWidth: { lg: 280 } }}>
          <ClientVIPStatusCard clientId={clientId} clientName={event.client_name} />
        </Box>
      )}

      {/* Event Details */}
      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            borderRadius: 1,
            bgcolor: 'background.paper',
            p: 3,
            height: '100%',
          }}
        >
          <Stack spacing={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <EventNoteIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Event Details
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                <FieldLabel>Date &amp; Time</FieldLabel>
                <Box display="flex" alignItems="center" gap={2} mt={1}>
                  <ScheduleIcon color="action" sx={{ fontSize: 20 }} />
                  <DateTimeFull
                    date={event.start_date}
                    showDualTimezone
                    variant="body2"
                    fontWeight={500}
                    sx={{ flex: 1 }}
                  />
                </Box>
              </Box>

              {event.total_price && (
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <FieldLabel>Total Investment</FieldLabel>
                  <Box display="flex" alignItems="center" gap={2} mt={1}>
                    <CashIcon color="action" sx={{ fontSize: 20 }} />
                    <Typography variant="h6" color="success.main" fontWeight={700}>
                      {formatEventPrice(event.current_total_amount || event.total_price)}
                    </Typography>
                  </Box>
                </Box>
              )}

              {event.lead_source && (
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <FieldLabel>Lead Source</FieldLabel>
                  <Box display="flex" alignItems="center" gap={2} mt={1}>
                    <TrendingUpIcon color="action" sx={{ fontSize: 20 }} />
                    <Typography variant="body2" fontWeight={500}>
                      {event.lead_source}
                    </Typography>
                  </Box>
                </Box>
              )}

              {event.num_participants && (
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <FieldLabel>Number of Guests</FieldLabel>
                  <Box display="flex" alignItems="center" gap={2} mt={1}>
                    <PeopleIcon color="action" sx={{ fontSize: 20 }} />
                    <Typography variant="h6" color="info.main" fontWeight={700}>
                      {event.num_participants}
                    </Typography>
                  </Box>
                </Box>
              )}

              {event.payment_status && (
                <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
                  <FieldLabel>Payment Status</FieldLabel>
                  <Box mt={1}>
                    <Chip
                      label={event.payment_status.replace('_', ' ')}
                      color={
                        event.payment_status === 'PAID'
                          ? 'success'
                          : event.payment_status === 'PARTIALLY_PAID'
                            ? 'warning'
                            : 'default'
                      }
                      variant="outlined"
                      sx={{ fontWeight: 600 }}
                    />
                  </Box>
                </Box>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Workflow Visualization */}
      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            borderRadius: 1,
            bgcolor: 'background.paper',
            p: 3,
            height: '100%',
          }}
        >
          <Stack spacing={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <ScheduleIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Workflow Progress
              </Typography>
            </Box>

            <Box sx={{ mt: 2 }}>
              {isLoadingStages ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={4}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                    Loading workflow stages...
                  </Typography>
                </Box>
              ) : (
                <WorkflowVisualization
                  workflowName={event.workflow_template_name}
                  stages={transformedWorkflowStages}
                  currentStage={
                    typeof event.current_stage === 'object' && event.current_stage !== null
                      ? event.current_stage.id
                      : typeof event.current_stage === 'number'
                        ? event.current_stage
                        : undefined
                  }
                  overallProgress={event.workflow_progress}
                  layout="vertical"
                  showTasks={true}
                  showProgress={true}
                />
              )}
            </Box>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};
