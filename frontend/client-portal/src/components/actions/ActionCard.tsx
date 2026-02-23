// frontend/client-portal/src/components/actions/ActionCard.tsx

import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Avatar,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  RequestQuote as QuoteIcon,
  Description as ContractIcon,
  Payment as PaymentIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { AnyActionItem, ActionType } from '../../types/action-center.types';
import { ACTION_TYPE_CONFIGS, URGENCY_CONFIGS } from '../../types/action-center.types';

// Icon mapping for action types
const ACTION_ICONS: Record<ActionType, React.ElementType> = {
  TASK: TaskIcon,
  QUOTE: QuoteIcon,
  CONTRACT: ContractIcon,
  PAYMENT: PaymentIcon,
};

interface ActionCardProps {
  action: AnyActionItem;
  children?: React.ReactNode;
  onClick?: () => void;
  showEventLink?: boolean;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  children,
  onClick,
  showEventLink = true,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const typeConfig = ACTION_TYPE_CONFIGS[action.type];
  const urgencyConfig = URGENCY_CONFIGS[action.urgency];
  const IconComponent = ACTION_ICONS[action.type];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleEventClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/events/${action.eventId}`);
  };

  return (
    <Card
      sx={{
        mb: 1.5,
        border: `1px solid ${theme.palette.divider}`,
        borderLeft: `4px solid ${typeConfig.color}`,
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        '&:hover': onClick
          ? {
              borderColor: theme.palette.primary.main,
              boxShadow: theme.shadows[3],
              transform: 'translateY(-1px)',
            }
          : {},
      }}
      onClick={onClick}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header Row */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          {/* Icon */}
          <Avatar
            sx={{
              backgroundColor: alpha(typeConfig.color, 0.1),
              color: typeConfig.color,
              width: 40,
              height: 40,
            }}
          >
            <IconComponent fontSize="small" />
          </Avatar>

          {/* Title and Description */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 600,
                mb: 0.25,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {action.title}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {action.description}
            </Typography>
          </Box>

          {/* Urgency Badge */}
          <Chip
            label={urgencyConfig.label}
            size="small"
            sx={{
              backgroundColor: urgencyConfig.backgroundColor,
              color: urgencyConfig.color,
              fontWeight: 600,
              fontSize: '0.7rem',
              height: 22,
            }}
          />
        </Box>

        {/* Meta Row */}
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{ mb: children ? 1.5 : 0 }}
          flexWrap="wrap"
          gap={0.5}
        >
          {/* Action Type */}
          <Chip
            label={typeConfig.label}
            size="small"
            variant="outlined"
            sx={{
              borderColor: typeConfig.color,
              color: typeConfig.color,
              fontSize: '0.7rem',
              height: 20,
            }}
          />

          {/* Event Link */}
          {showEventLink && (
            <Chip
              icon={<EventIcon sx={{ fontSize: '0.875rem !important' }} />}
              label={action.eventName}
              size="small"
              variant="outlined"
              onClick={handleEventClick}
              sx={{
                fontSize: '0.7rem',
                height: 20,
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            />
          )}

          {/* Due Date */}
          {action.dueDate && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto !important' }}>
              Due: {formatDate(action.dueDate)}
            </Typography>
          )}
        </Stack>

        {/* Custom Content (Action Buttons) */}
        {children && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${theme.palette.divider}` }}>
            {children}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ActionCard;
