// frontend/admin-crm/src/components/events/InquiryDetails.tsx

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import {
  ContactMail as InquiryIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import type { InquiryData } from '../../types/events.types';

interface InquiryDetailsProps {
  inquiry: InquiryData;
}

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  GENERAL: 'General Inquiry',
  EVENT_QUESTION: 'Event Question',
  PARTNERSHIP: 'Partnership Interest',
  PRICING: 'Pricing Question',
  OTHER: 'Other',
};

const INQUIRY_TYPE_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'info' | 'warning'> = {
  GENERAL: 'info',
  EVENT_QUESTION: 'primary',
  PARTNERSHIP: 'secondary',
  PRICING: 'success',
  OTHER: 'default',
};

export const InquiryDetails: React.FC<InquiryDetailsProps> = ({ inquiry }) => {
  const formatSubmittedDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'MMM d, yyyy h:mm a');
    } catch {
      return dateStr;
    }
  };

  return (
    <Box sx={{ borderRadius: 1, bgcolor: 'background.paper', p: 3, height: '100%' }}>
      <Stack spacing={3}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <InquiryIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              Contact Form Submission
            </Typography>
          </Box>
          <Chip
            label={INQUIRY_TYPE_LABELS[inquiry.type] || inquiry.type}
            color={INQUIRY_TYPE_COLORS[inquiry.type] || 'default'}
            size="small"
            variant="outlined"
          />
        </Box>

        <Stack spacing={2}>
          {/* Inquiry Type */}
          <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Inquiry Type
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mt={1}>
              <CategoryIcon color="action" sx={{ fontSize: 20 }} />
              <Typography variant="body2" fontWeight={500}>
                {INQUIRY_TYPE_LABELS[inquiry.type] || inquiry.type}
              </Typography>
            </Box>
          </Box>

          {/* Message */}
          <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Message
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
              {inquiry.message}
            </Typography>
          </Box>

          {/* Phone (if provided) */}
          {inquiry.phone && (
            <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
                Phone Number
              </Typography>
              <Box display="flex" alignItems="center" gap={2} mt={1}>
                <PhoneIcon color="action" sx={{ fontSize: 20 }} />
                <Typography variant="body2" fontWeight={500}>{inquiry.phone}</Typography>
              </Box>
            </Box>
          )}

          {/* Submitted At */}
          <Box sx={{ p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>
              Submitted At
            </Typography>
            <Box display="flex" alignItems="center" gap={2} mt={1}>
              <ScheduleIcon color="action" sx={{ fontSize: 20 }} />
              <Typography variant="body2" fontWeight={500}>
                {formatSubmittedDate(inquiry.submitted_at)}
              </Typography>
            </Box>
          </Box>
        </Stack>
      </Stack>
    </Box>
  );
};
