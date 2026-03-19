import React from 'react';
import { Box, Typography, Chip, Stack, Tooltip } from '@mui/material';
import {
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import type { Client } from '@/types/clients.types';

interface ClientOverviewCardsProps {
  client: Client;
  events: { length: number };
  totalClientValue: string;
  statusSummary: {
    active: { label: string; color: string };
    registration: {
      label: string;
      color: 'success' | 'error' | 'warning' | 'info' | 'default' | 'primary' | 'secondary';
      icon: React.ReactElement;
      tooltip?: string;
    };
  };
}

export const ClientOverviewCards: React.FC<ClientOverviewCardsProps> = ({
  client,
  events,
  totalClientValue,
  statusSummary,
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
      {/* Contact Information */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Stack spacing={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <PersonIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Contact Details
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Email Address
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                  <EmailIcon color="action" sx={{ fontSize: 20 }} />
                  <Typography variant="body1" fontWeight="medium">
                    {client.email}
                  </Typography>
                </Box>
              </Box>

              {client.profile?.phone && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Phone Number
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <PhoneIcon color="action" sx={{ fontSize: 20 }} />
                    <Typography variant="body1" fontWeight="medium">
                      {client.profile.phone}
                    </Typography>
                  </Box>
                </Box>
              )}

              {client.profile?.company && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                    Company
                  </Typography>
                  <Box display="flex" alignItems="center" gap={2}>
                    <BusinessIcon color="action" sx={{ fontSize: 20 }} />
                    <Typography variant="body1" fontWeight="medium">
                      {client.profile.company}
                    </Typography>
                  </Box>
                </Box>
              )}
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Client Statistics */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Stack spacing={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <TrendingUpIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Performance
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Total Events
                </Typography>
                <Typography variant="h4" color="primary.main" fontWeight={700}>
                  {events.length}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Lifetime Value
                </Typography>
                <Typography variant="h4" color="success.main" fontWeight={700}>
                  {totalClientValue}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
                  Member Since
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {new Date(client.date_joined).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Box>
      </Box>

      {/* Account Status */}
      <Box sx={{ flex: 1 }}>
        <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Stack spacing={3}>
            <Box display="flex" alignItems="center" gap={2}>
              <CalendarIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Status & Activity
              </Typography>
            </Box>

            <Stack spacing={2}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Account Status
                </Typography>
                <Chip
                  label={client.is_active ? 'Active' : 'Inactive'}
                  color={client.is_active ? 'success' : 'error'}
                  sx={{ fontWeight: 600 }}
                />
              </Box>

              <Box>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Portal Access
                </Typography>
                <Tooltip title={statusSummary.registration.tooltip || ''}>
                  <Chip
                    icon={statusSummary.registration.icon}
                    label={statusSummary.registration.label}
                    color={statusSummary.registration.color}
                    sx={{ fontWeight: 600 }}
                  />
                </Tooltip>
              </Box>
            </Stack>
          </Stack>
        </Box>
      </Box>
    </Box>
  );
};
