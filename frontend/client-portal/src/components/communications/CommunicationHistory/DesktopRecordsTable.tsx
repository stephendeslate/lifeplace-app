import React from 'react';
import {
  Box,
  Chip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';
import { formatPhilippinesTime } from '@/utils/timezone';
import { GlassCard } from '@/design-system/components/GlassCard';
import type { CommunicationRecord } from '@/types/communications.types';
import { getChannelIcon, getStatusIcon, getStatusColor, getCategoryColor } from './helpers';

interface DesktopRecordsTableProps {
  records: CommunicationRecord[];
  onViewDetail: (record: CommunicationRecord) => void;
}

export const DesktopRecordsTable: React.FC<DesktopRecordsTableProps> = ({
  records,
  onViewDetail,
}) => {
  const theme = useTheme();

  return (
    <GlassCard
      variant="light"
      intensity="medium"
      sx={{
        border: `1px solid ${alpha('#fff', 0.1)}`,
        overflow: 'hidden',
      }}
    >
      <TableContainer sx={{ backgroundColor: 'transparent' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Subject/Template</TableCell>
              <TableCell>Channel</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Content Preview</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Received</TableCell>
              <TableCell width="50"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {records.map((record) => (
              <TableRow
                key={record.id}
                hover
                onClick={() => onViewDetail(record)}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: record.is_opened
                    ? 'transparent'
                    : alpha(theme.palette.info.main, 0.04),
                  '&:hover': {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getChannelIcon(record.channel)}
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {record.subject || record.template_name}
                      </Typography>
                      {record.sent_by_name && (
                        <Typography variant="caption" color="text.secondary">
                          From: {record.sent_by_name}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={record.channel}
                    size="small"
                    variant="outlined"
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(5px)',
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={
                      record.category === 'SYSTEM'
                        ? 'System'
                        : record.category === 'AUTO'
                          ? 'Auto'
                          : 'Manual'
                    }
                    size="small"
                    color={getCategoryColor(record.category) as 'primary' | 'secondary' | 'default'}
                    variant="outlined"
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(5px)',
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {record.body.replace(/<[^>]*>/g, '').substring(0, 50)}
                    ...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Tooltip title={record.is_opened ? 'Read' : 'Unread'}>
                      <Box display="flex" alignItems="center">
                        {getStatusIcon(record.is_opened)}
                      </Box>
                    </Tooltip>
                    <Chip
                      label={record.is_opened ? 'Read' : 'Unread'}
                      size="small"
                      color={getStatusColor(record.is_opened)}
                      variant="outlined"
                      sx={{
                        backgroundColor: alpha('#fff', 0.1),
                        backdropFilter: 'blur(5px)',
                        border: `1px solid ${alpha('#fff', 0.2)}`,
                      }}
                    />
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {record.sent_at
                      ? formatPhilippinesTime(record.sent_at, false, 'MMM d, yyyy')
                      : '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetail(record);
                    }}
                    title="View message"
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(10px)',
                      border: `1px solid ${alpha('#fff', 0.1)}`,
                      '&:hover': {
                        backgroundColor: alpha('#fff', 0.2),
                        transform: 'scale(1.05)',
                      },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <ViewIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </GlassCard>
  );
};
