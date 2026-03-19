import React from 'react';
import { Box, Chip, Stack, Typography, useTheme, alpha } from '@mui/material';
import { formatPhilippinesTime } from '@/utils/timezone';
import { GlassCard } from '@/design-system/components/GlassCard';
import type { CommunicationRecord } from '@/types/communications.types';
import { getChannelIcon, getStatusColor, getCategoryColor } from './helpers';

interface MobileRecordCardProps {
  record: CommunicationRecord;
  onViewDetail: (record: CommunicationRecord) => void;
}

export const MobileRecordCard: React.FC<MobileRecordCardProps> = ({ record, onViewDetail }) => {
  const theme = useTheme();

  return (
    <GlassCard
      variant="light"
      intensity="medium"
      sx={{
        p: 2,
        cursor: 'pointer',
        border: `1px solid ${alpha('#fff', 0.1)}`,
        backgroundColor: record.is_opened ? 'transparent' : alpha(theme.palette.info.main, 0.04),
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.08),
        },
        transition: 'background-color 0.2s ease',
      }}
      onClick={() => onViewDetail(record)}
    >
      {/* Top row: channel icon + subject + read/unread chip */}
      <Box display="flex" alignItems="flex-start" gap={1} mb={1}>
        <Box
          sx={{
            mt: 0.25,
            color: 'text.secondary',
            display: 'flex',
          }}
        >
          {getChannelIcon(record.channel)}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={record.is_opened ? 'medium' : 'bold'} noWrap>
            {record.subject || record.template_name}
          </Typography>
          {record.sent_by_name && (
            <Typography variant="caption" color="text.secondary">
              From: {record.sent_by_name}
            </Typography>
          )}
        </Box>
        <Chip
          label={record.is_opened ? 'Read' : 'Unread'}
          size="small"
          color={getStatusColor(record.is_opened)}
          variant="outlined"
          sx={{ fontSize: '0.65rem', height: 22, flexShrink: 0 }}
        />
      </Box>

      {/* Content preview */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          mb: 1,
        }}
      >
        {record.body.replace(/<[^>]*>/g, '').substring(0, 100)}
      </Typography>

      {/* Bottom row: type chip + channel chip + date */}
      <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip
          label={
            record.category === 'SYSTEM' ? 'System' : record.category === 'AUTO' ? 'Auto' : 'Manual'
          }
          size="small"
          color={getCategoryColor(record.category) as 'primary' | 'secondary' | 'default'}
          variant="outlined"
          sx={{ fontSize: '0.65rem', height: 20 }}
        />
        <Chip
          label={record.channel}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.65rem', height: 20 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
          {record.sent_at ? formatPhilippinesTime(record.sent_at, false, 'MMM d, yyyy') : '-'}
        </Typography>
      </Stack>
    </GlassCard>
  );
};
