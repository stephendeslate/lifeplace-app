import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { sanitizeHTML } from '@/utils/security';
import type { CommunicationRecord } from '@/types/communications.types';
import { getStatusIcon, getStatusColor, getCategoryColor } from './helpers';

interface MessageDetailDialogProps {
  open: boolean;
  onClose: () => void;
  record: CommunicationRecord | null;
}

export const MessageDetailDialog: React.FC<MessageDetailDialogProps> = ({
  open,
  onClose,
  record,
}) => {
  const theme = useTheme();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: alpha('#fff', 0.95),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#fff', 0.2)}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle>Message Details</DialogTitle>
      <DialogContent>
        {record && (
          <Stack spacing={3}>
            {/* Basic Info */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Message Information
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    From:
                  </Typography>
                  <Typography variant="body2">
                    {record.sent_by_name || 'LifePlace System'}
                  </Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Template:
                  </Typography>
                  <Typography variant="body2">{record.template_name}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Channel:
                  </Typography>
                  <Chip
                    label={record.channel}
                    size="small"
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(5px)',
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                    }}
                  />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Type:
                  </Typography>
                  <Chip
                    label={
                      record.category === 'SYSTEM'
                        ? 'System'
                        : record.category === 'AUTO'
                          ? 'Automated'
                          : 'Manual'
                    }
                    size="small"
                    color={
                      getCategoryColor(record.category) as
                        | 'primary'
                        | 'secondary'
                        | 'error'
                        | 'info'
                        | 'success'
                        | 'warning'
                    }
                    sx={{
                      backgroundColor: alpha('#fff', 0.1),
                      backdropFilter: 'blur(5px)',
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            {/* Status */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Status
              </Typography>
              <Stack spacing={1}>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Status:
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getStatusIcon(record.is_opened)}
                    <Chip
                      label={record.is_opened ? 'Read' : 'Unread'}
                      size="small"
                      color={getStatusColor(record.is_opened)}
                      sx={{
                        backgroundColor: alpha('#fff', 0.1),
                        backdropFilter: 'blur(5px)',
                        border: `1px solid ${alpha('#fff', 0.2)}`,
                      }}
                    />
                  </Box>
                </Box>
                {record.sent_at && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Received:
                    </Typography>
                    <Typography variant="body2">
                      {new Date(record.sent_at).toLocaleString()}
                    </Typography>
                  </Box>
                )}
                {record.opened_at && (
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Read:
                    </Typography>
                    <Typography variant="body2">
                      {new Date(record.opened_at).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            {/* Content */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Message Content
              </Typography>
              {record.subject && (
                <Box mb={2}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Subject:
                  </Typography>
                  <GlassCard
                    variant="light"
                    intensity="subtle"
                    sx={{
                      p: 2,
                      backgroundColor: alpha(theme.palette.grey[50], 0.3),
                      border: `1px solid ${alpha('#fff', 0.2)}`,
                    }}
                  >
                    <Typography variant="body2">{record.subject}</Typography>
                  </GlassCard>
                </Box>
              )}
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                {record.channel === 'EMAIL' ? 'Message:' : 'Text Message:'}
              </Typography>
              <GlassCard
                variant="light"
                intensity="subtle"
                sx={{
                  p: 2,
                  backgroundColor: alpha(theme.palette.grey[50], 0.3),
                  border: `1px solid ${alpha('#fff', 0.2)}`,
                  maxHeight: 400,
                  overflow: 'auto',
                }}
              >
                {record.channel === 'EMAIL' ? (
                  <Box
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHTML(record.body, 'email'),
                    }}
                    sx={{
                      '& *': { maxWidth: '100%' },
                      wordBreak: 'break-word',
                    }}
                  />
                ) : (
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {record.body}
                  </Typography>
                )}
              </GlassCard>
            </Box>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button variant="contained" onClick={onClose} sx={{ textTransform: 'none' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
