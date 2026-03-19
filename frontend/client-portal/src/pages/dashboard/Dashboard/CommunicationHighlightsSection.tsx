import React from 'react';
import { Box, Typography, Stack, Chip, Button, useTheme, alpha } from '@mui/material';
import { Email as EmailIcon, Message as MessageIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import type { DashboardData } from '@/hooks/useDashboardData/dashboard-types';
import { safeFormatDate, PHILIPPINE_TIMEZONE } from './dashboard-utils';

interface CommunicationHighlightsSectionProps {
  communications: DashboardData['communications'];
  onNavigate: (path: string) => void;
}

const CommunicationHighlightsSection: React.FC<CommunicationHighlightsSectionProps> = ({
  communications,
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
        <MessageIcon color="primary" />
        Communication Highlights
        {communications.unreadCount > 0 && (
          <Chip
            label={`${communications.unreadCount} unread`}
            color="warning"
            size="small"
            sx={{ ml: 1 }}
          />
        )}
      </Typography>

      {communications.recentMessages.length > 0 ? (
        <Stack spacing={2}>
          {communications.recentMessages.slice(0, 3).map((message) => (
            <GlassCard
              key={message.id}
              variant="light"
              intensity="subtle"
              hover={true}
              sx={{
                cursor: 'pointer',
                backgroundColor: !message.is_opened
                  ? alpha(theme.palette.primary.main, 0.08)
                  : alpha('#fff', 0.03),
                border: `1px solid ${
                  !message.is_opened ? alpha(theme.palette.primary.main, 0.3) : alpha('#fff', 0.1)
                }`,
              }}
              onClick={() => onNavigate('/records')}
            >
              <Box display="flex" flexWrap="wrap" alignItems="center" gap={2} p={2}>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: alpha(theme.palette.info.main, 0.15),
                    color: theme.palette.info.main,
                  }}
                >
                  {message.channel === 'EMAIL' ? <EmailIcon /> : <MessageIcon />}
                </Box>
                <Box
                  sx={{
                    flex: 1,
                    minWidth: { xs: 'calc(100% - 56px)', sm: 0 },
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: !message.is_opened ? 600 : 500,
                    }}
                  >
                    {message.subject || 'No Subject'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {safeFormatDate(message.created_at, PHILIPPINE_TIMEZONE, 'MMM dd, yyyy')}
                  </Typography>
                </Box>
                <Chip
                  label={message.is_opened ? 'Read' : 'Unread'}
                  size="small"
                  color={message.is_opened ? 'success' : 'warning'}
                  variant="outlined"
                />
              </Box>
            </GlassCard>
          ))}
          <Button
            variant="outlined"
            onClick={() => onNavigate('/records')}
            sx={{ alignSelf: 'center' }}
          >
            View All Records
          </Button>
        </Stack>
      ) : (
        <GlassCard variant="light" intensity="subtle" sx={{ p: 3, textAlign: 'center' }}>
          <MessageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Recent Messages
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your communications will appear here.
          </Typography>
        </GlassCard>
      )}
    </Box>
  );
};

export default CommunicationHighlightsSection;
