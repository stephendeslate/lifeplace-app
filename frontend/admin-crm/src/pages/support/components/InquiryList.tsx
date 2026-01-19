// frontend/admin-crm/src/pages/support/components/InquiryList.tsx

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Typography,
  Box,
  Avatar,
} from '@mui/material';
import { Person as PersonIcon } from '@mui/icons-material';
import type { SupportInquiry, SupportStatus, SupportPriority } from '../../../types/support.types';

interface InquiryListProps {
  inquiries: SupportInquiry[];
  onSelect: (inquiry: SupportInquiry) => void;
}

const STATUS_CONFIG: Record<SupportStatus, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  active: { label: 'Open', color: 'info' },
  waiting: { label: 'Awaiting', color: 'warning' },
  resolved: { label: 'Resolved', color: 'success' },
  archived: { label: 'Archived', color: 'default' },
};

const PRIORITY_CONFIG: Record<SupportPriority, { label: string; color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' }> = {
  urgent: { label: 'Urgent', color: 'error' },
  high: { label: 'High', color: 'warning' },
  normal: { label: 'Normal', color: 'default' },
  low: { label: 'Low', color: 'default' },
};

const CATEGORY_LABELS: Record<string, string> = {
  billing: 'Billing',
  event: 'Event',
  technical: 'Technical',
  general: 'General',
};

export const InquiryList: React.FC<InquiryListProps> = ({ inquiries, onSelect }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${Math.floor(diffHours)}h ago`;
    } else if (diffHours < 48) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>Subject</TableCell>
          <TableCell>Client</TableCell>
          <TableCell>Category</TableCell>
          <TableCell>Status</TableCell>
          <TableCell>Priority</TableCell>
          <TableCell>Assigned To</TableCell>
          <TableCell>Last Activity</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {inquiries.map((inquiry) => {
          const statusConfig = STATUS_CONFIG[inquiry.status];
          const priorityConfig = PRIORITY_CONFIG[inquiry.priority];

          return (
            <TableRow
              key={inquiry.id}
              hover
              onClick={() => onSelect(inquiry)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {inquiry.subject}
                  </Typography>
                  {inquiry.event_name && (
                    <Typography variant="caption" color="text.secondary">
                      Event: {inquiry.event_name}
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                    <PersonIcon fontSize="small" />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {inquiry.client_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {inquiry.client_email}
                    </Typography>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={CATEGORY_LABELS[inquiry.category] || inquiry.category}
                  size="small"
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={statusConfig.label}
                  size="small"
                  color={statusConfig.color}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={priorityConfig.label}
                  size="small"
                  color={priorityConfig.color}
                  variant={inquiry.priority === 'normal' || inquiry.priority === 'low' ? 'outlined' : 'filled'}
                />
              </TableCell>
              <TableCell>
                {inquiry.assigned_admin_name ? (
                  <Typography variant="body2">{inquiry.assigned_admin_name}</Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Unassigned
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {inquiry.last_message_at
                    ? formatDate(inquiry.last_message_at)
                    : formatDate(inquiry.created_at)}
                </Typography>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
