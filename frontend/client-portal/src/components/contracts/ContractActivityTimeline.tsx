// frontend/client-portal/src/components/contracts/ContractActivityTimeline.tsx

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  Avatar,
  useTheme,
  alpha,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as CompletedIcon,
  Schedule as PendingIcon,
  Error as FailedIcon,
  Create as CreatedIcon,
  Send as SentIcon,
  Edit as SignedIcon,
  Gavel as AmendedIcon,
  Cancel as VoidedIcon,
  AccessTime as ExpiredIcon,
  AttachFile as DocumentIcon,
  Note as NoteIcon,
  TrendingUp as ValueChangedIcon,
  Visibility as ViewedIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import type { 
  ContractTimelineEvent, 
  ContractActivityType, 
  Contract,
  ContractSignature
} from '../../types/contracts.types';

interface ContractActivityTimelineProps {
  contract: Contract;
  showFilters?: boolean;
  maxEvents?: number;
  interactive?: boolean;
}

interface TimelineEventProps {
  event: ContractTimelineEvent;
  isLast: boolean;
  index: number;
}

const getActivityIcon = (type: ContractActivityType) => {
  switch (type) {
    case 'CREATED':
      return <CreatedIcon />;
    case 'SENT':
      return <SentIcon />;
    case 'VIEWED':
      return <ViewedIcon />;
    case 'SIGNED':
    case 'FULLY_SIGNED':
      return <SignedIcon />;
    case 'AMENDED':
      return <AmendedIcon />;
    case 'VOIDED':
      return <VoidedIcon />;
    case 'EXPIRED':
      return <ExpiredIcon />;
    case 'DOCUMENT_ADDED':
      return <DocumentIcon />;
    case 'NOTE_ADDED':
      return <NoteIcon />;
    case 'VALUE_CHANGED':
      return <ValueChangedIcon />;
    default:
      return <CreatedIcon />;
  }
};

const getActivityColor = (type: ContractActivityType): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
  switch (type) {
    case 'CREATED':
    case 'SENT':
      return 'primary';
    case 'SIGNED':
    case 'FULLY_SIGNED':
    case 'DOCUMENT_ADDED':
      return 'success';
    case 'VIEWED':
    case 'NOTE_ADDED':
      return 'info';
    case 'AMENDED':
    case 'VALUE_CHANGED':
      return 'warning';
    case 'VOIDED':
    case 'EXPIRED':
      return 'error';
    default:
      return 'primary';
  }
};

const getStatusIcon = (status?: 'completed' | 'pending' | 'failed') => {
  switch (status) {
    case 'completed':
      return <CompletedIcon color="success" fontSize="small" />;
    case 'pending':
      return <PendingIcon color="warning" fontSize="small" />;
    case 'failed':
      return <FailedIcon color="error" fontSize="small" />;
    default:
      return null;
  }
};

const TimelineEvent: React.FC<TimelineEventProps> = ({ event, isLast, index }) => {
  const theme = useTheme();
  const activityColor = getActivityColor(event.type);
  const activityIcon = getActivityIcon(event.type);
  const statusIcon = getStatusIcon(event.status);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      year: date.getFullYear(),
    };
  };

  const formattedDate = formatDate(event.date);

  return (
    <AnimatedElement animation="slideUp" delay={index * 100}>
      <Box sx={{ position: 'relative', pb: isLast ? 0 : 4 }}>
        {/* Timeline Line */}
        {!isLast && (
          <Box
            sx={{
              position: 'absolute',
              left: 20,
              top: 40,
              bottom: -16,
              width: 2,
              background: `linear-gradient(180deg, ${alpha(theme.palette[activityColor].main, 0.6)} 0%, ${alpha(theme.palette[activityColor].main, 0.2)} 100%)`,
            }}
          />
        )}

        {/* Event Container */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {/* Timeline Dot */}
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Avatar
              sx={{
                width: 40,
                height: 40,
                backgroundColor: alpha(theme.palette[activityColor].main, 0.15),
                color: theme.palette[activityColor].main,
                border: `2px solid ${theme.palette[activityColor].main}`,
                backdropFilter: 'blur(10px)',
              }}
            >
              {activityIcon}
            </Avatar>
          </Box>

          {/* Event Content */}
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              flex: 1,
              p: 3,
              border: `1px solid ${alpha(theme.palette[activityColor].main, 0.2)}`,
              backgroundColor: alpha(theme.palette[activityColor].main, 0.05),
              position: 'relative',
            }}
          >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                    {event.title}
                  </Typography>
                  {statusIcon}
                </Box>
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {event.description}
                </Typography>

                {/* User Information */}
                {event.user && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Avatar sx={{ width: 20, height: 20, fontSize: '0.75rem' }}>
                      {event.user.first_name?.[0]}{event.user.last_name?.[0]}
                    </Avatar>
                    <Typography variant="caption" color="text.secondary">
                      by {event.user.first_name} {event.user.last_name}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Date and Actions */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={event.type.replace('_', ' ').toLowerCase()}
                    size="small"
                    color={activityColor}
                    variant="outlined"
                    sx={{
                      backgroundColor: alpha(theme.palette[activityColor].main, 0.1),
                      textTransform: 'capitalize',
                      fontSize: '0.7rem',
                      height: 20,
                    }}
                  />
                  <Tooltip title="More options">
                    <IconButton size="small" sx={{ opacity: 0.7 }}>
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
                
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: 'block' }}>
                    {formattedDate.date}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    {formattedDate.time}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {/* Metadata */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 1, display: 'block' }}>
                  Additional Details:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {Object.entries(event.metadata).map(([key, value]) => (
                    <Chip
                      key={key}
                      label={`${key}: ${value}`}
                      size="small"
                      variant="outlined"
                      sx={{
                        fontSize: '0.65rem',
                        height: 18,
                        backgroundColor: alpha(theme.palette.background.paper, 0.5),
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </GlassCard>
        </Box>
      </Box>
    </AnimatedElement>
  );
};

export const ContractActivityTimeline: React.FC<ContractActivityTimelineProps> = ({
  contract,
  maxEvents = 50,
}) => {
  const theme = useTheme();

  // Generate timeline events from contract data
  const timelineEvents = useMemo((): ContractTimelineEvent[] => {
    const events: ContractTimelineEvent[] = [];

    // Contract created
    events.push({
      id: `created-${contract.id}`,
      type: 'CREATED',
      title: 'Contract Created',
      description: `Contract created from template: ${contract.template.name}`,
      date: contract.created_at,
      status: 'completed',
    });

    // Contract sent
    if (contract.sent_at) {
      events.push({
        id: `sent-${contract.id}`,
        type: 'SENT',
        title: 'Contract Sent',
        description: 'Contract sent to client for signature',
        date: contract.sent_at,
        status: 'completed',
      });
    }

    // Signatures
    contract.signatures?.forEach((signature: ContractSignature, index: number) => {
      events.push({
        id: `signature-${signature.id}`,
        type: index === contract.signatures.length - 1 && contract.is_fully_signed ? 'FULLY_SIGNED' : 'SIGNED',
        title: index === contract.signatures.length - 1 && contract.is_fully_signed 
          ? 'Contract Fully Signed' 
          : `Contract Signed by ${signature.role_display}`,
        description: `${signature.signer_name} signed as ${signature.role_display}`,
        date: signature.signed_at,
        user: signature.signer,
        status: 'completed',
        metadata: {
          role: signature.role_display,
          verification: signature.verification_method,
        },
      });
    });

    // Contract value changes (if any)
    if (contract.contract_value) {
      events.push({
        id: `value-${contract.id}`,
        type: 'VALUE_CHANGED',
        title: 'Contract Value Set',
        description: `Contract value set to ${contract.currency} ${parseFloat(contract.contract_value).toLocaleString()}`,
        date: contract.updated_at,
        status: 'completed',
        metadata: {
          value: contract.contract_value,
          currency: contract.currency,
        },
      });
    }

    // Sort events by date
    return events
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, maxEvents);
  }, [contract, maxEvents]);

  if (timelineEvents.length === 0) {
    return (
      <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No timeline events available for this contract.
        </Typography>
      </GlassCard>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          Contract Timeline
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Detailed activity history for this contract
        </Typography>
      </Box>

      {/* Timeline */}
      <Box sx={{ position: 'relative' }}>
        {timelineEvents.map((event, index) => (
          <TimelineEvent
            key={event.id}
            event={event}
            isLast={index === timelineEvents.length - 1}
            index={index}
          />
        ))}
      </Box>

      {/* Summary */}
      <GlassCard
        variant="light"
        intensity="subtle"
        sx={{
          mt: 3,
          p: 2,
          backgroundColor: alpha(theme.palette.info.main, 0.05),
          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="body2" color="text.secondary">
            Timeline Summary
          </Typography>
          <Stack direction="row" spacing={2}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {timelineEvents.length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Events
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="success.main" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                {contract.signatures?.length || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Signatures
              </Typography>
            </Box>
            {contract.is_fully_signed && (
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h6" color="success.main" sx={{ fontWeight: 600, fontSize: '1rem' }}>
                  ✓
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Complete
                </Typography>
              </Box>
            )}
          </Stack>
        </Stack>
      </GlassCard>
    </Box>
  );
};

export default ContractActivityTimeline;