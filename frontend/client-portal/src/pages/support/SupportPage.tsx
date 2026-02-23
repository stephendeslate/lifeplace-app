// frontend/client-portal/src/pages/support/SupportPage.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { useSupport } from '../../hooks/useSupport';
import { InquiryList } from './components/InquiryList';
import { NewInquiryDialog } from './components/NewInquiryDialog';
import { InquiryDetail } from './components/InquiryDetail';
import type { SupportInquiry } from '../../types/support.types';

const SupportPage: React.FC = () => {
  useDocumentTitle('Support | LifePlace Alfonso');
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<SupportInquiry | null>(null);

  const { useSupportSettings, useSupportInquiries } = useSupport();
  const { data: settings, isLoading: settingsLoading } = useSupportSettings();
  const {
    data: inquiries,
    isLoading: inquiriesLoading,
    error: inquiriesError,
  } = useSupportInquiries();

  const handleInquirySelect = (inquiry: SupportInquiry) => {
    setSelectedInquiry(inquiry);
  };

  const handleBackToList = () => {
    setSelectedInquiry(null);
  };

  const formatSupportHours = (hours: Record<string, string> | undefined) => {
    if (!hours || Object.keys(hours).length === 0) {
      return 'Contact us anytime';
    }
    return Object.entries(hours)
      .map(([day, time]) => `${day}: ${time}`)
      .join(' | ');
  };

  // Show detail view if inquiry is selected
  if (selectedInquiry) {
    return <InquiryDetail inquiryId={selectedInquiry.id} onBack={handleBackToList} />;
  }

  return (
    <>
      <Box>
        {/* Header */}
        <AnimatedElement animation="slideDown" delay={100}>
          <Box
            sx={{
              mb: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'primary.main' }}>
                Help & Support
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Get assistance with your events and account
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setDialogOpen(true)}
              sx={{
                backgroundColor: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark,
                },
              }}
            >
              New Inquiry
            </Button>
          </Box>
        </AnimatedElement>

        {/* Support Contact Info */}
        <AnimatedElement animation="slideUp" delay={200}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              p: 3,
              mb: 4,
              backgroundColor: alpha(theme.palette.info.main, 0.05),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            {settingsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={3}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <EmailIcon sx={{ color: theme.palette.info.main }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {settings?.support_email || 'support@lifeplace.dev'}
                    </Typography>
                  </Box>
                </Stack>
                {settings?.support_phone && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PhoneIcon sx={{ color: theme.palette.info.main }} />
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Phone
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {settings.support_phone}
                      </Typography>
                    </Box>
                  </Stack>
                )}
                <Stack direction="row" spacing={1} alignItems="center">
                  <ScheduleIcon sx={{ color: theme.palette.info.main }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Support Hours
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {formatSupportHours(settings?.support_hours)}
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            )}
          </GlassCard>
        </AnimatedElement>

        {/* Inquiry List */}
        <AnimatedElement animation="slideUp" delay={300}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              p: 3,
              border: `1px solid ${alpha('#fff', 0.1)}`,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Your Inquiries
              </Typography>
              {inquiries && inquiries.length > 0 && (
                <Chip
                  label={`${inquiries.length} total`}
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                  }}
                />
              )}
            </Box>

            {inquiriesLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : inquiriesError ? (
              <Alert severity="error" sx={{ mb: 2 }}>
                Failed to load inquiries. Please try again.
              </Alert>
            ) : inquiries && inquiries.length > 0 ? (
              <InquiryList inquiries={inquiries} onSelect={handleInquirySelect} />
            ) : (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  You haven't submitted any support inquiries yet.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setDialogOpen(true)}
                >
                  Submit Your First Inquiry
                </Button>
              </Box>
            )}
          </GlassCard>
        </AnimatedElement>

        {/* New Inquiry Dialog */}
        <NewInquiryDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
      </Box>
    </>
  );
};

export default SupportPage;
