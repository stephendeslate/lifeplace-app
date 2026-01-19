// frontend/client-portal/src/pages/support/components/InquiryList.tsx

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import type { SupportInquiry } from '../../../types/support.types';
import { getStatusConfig, getCategoryLabel } from '../../../constants/support.constants';

interface InquiryListProps {
  inquiries: SupportInquiry[];
  onSelect: (inquiry: SupportInquiry) => void;
}

export const InquiryList: React.FC<InquiryListProps> = ({ inquiries, onSelect }) => {
  const theme = useTheme();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  return (
    <Stack spacing={2}>
      {inquiries.map((inquiry, index) => {
        const statusConfig = getStatusConfig(inquiry.status);

        return (
          <AnimatedElement key={inquiry.id} animation="slideUp" delay={index * 50}>
            <GlassCard
              variant="light"
              intensity="subtle"
              hover
              onClick={() => onSelect(inquiry)}
              sx={{
                p: 2.5,
                cursor: 'pointer',
                backgroundColor: alpha('#fff', 0.05),
                border: `1px solid ${alpha('#fff', 0.1)}`,
                '&:hover': {
                  backgroundColor: alpha('#fff', 0.1),
                  transform: 'translateX(4px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ flex: 1, mr: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {inquiry.subject}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Chip
                      label={statusConfig.label}
                      size="small"
                      color={statusConfig.color}
                      sx={{ height: 24 }}
                    />
                    <Chip
                      label={getCategoryLabel(inquiry.category)}
                      size="small"
                      variant="outlined"
                      sx={{
                        height: 24,
                        borderColor: alpha('#fff', 0.3),
                      }}
                    />
                    {inquiry.event_name && (
                      <Typography variant="caption" color="text.secondary">
                        {inquiry.event_name}
                      </Typography>
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {inquiry.last_message_at
                      ? `Last activity: ${formatDate(inquiry.last_message_at)}`
                      : `Created: ${formatDate(inquiry.created_at)}`}
                  </Typography>
                </Box>
                <ChevronRightIcon sx={{ color: alpha('#fff', 0.5), mt: 0.5 }} />
              </Box>
            </GlassCard>
          </AnimatedElement>
        );
      })}
    </Stack>
  );
};
