import React from 'react';
import { Box, Typography, Stack, Chip, CircularProgress, alpha, type Theme } from '@mui/material';
import { Edit as AmendmentIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ContractAmendment } from '@/types/contracts.types';

interface AmendmentsTabPanelProps {
  amendments: ContractAmendment[];
  isLoading: boolean;
  currency: string;
  theme: Theme;
  formatDate: (dateString: string) => string;
  formatCurrency: (value: string | null, currency?: string) => string;
  getStatusColor: (status: string) => 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const AmendmentsTabPanel: React.FC<AmendmentsTabPanelProps> = ({
  amendments,
  isLoading,
  currency,
  theme,
  formatDate,
  formatCurrency,
  getStatusColor,
}) => (
  <AnimatedElement animation="fadeIn">
    {isLoading ? (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    ) : amendments.length > 0 ? (
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Contract Amendments
        </Typography>
        <Stack spacing={2}>
          {amendments.map((amendment) => (
            <GlassCard
              key={amendment.id}
              variant="light"
              intensity="medium"
              sx={{
                p: 3,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                backgroundColor: alpha(theme.palette.info.main, 0.05),
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {amendment.amendment_reason}
                </Typography>
                <Chip
                  label={amendment.status.replace('_', ' ')}
                  size="small"
                  color={getStatusColor(amendment.status)}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {amendment.changes_description}
              </Typography>
              <Stack direction="row" spacing={3} flexWrap="wrap">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Requested:
                  </Typography>
                  <Typography variant="body2">{formatDate(amendment.requested_at)}</Typography>
                </Box>
                {amendment.requested_by && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Requested By:
                    </Typography>
                    <Typography variant="body2">
                      {amendment.requested_by.first_name} {amendment.requested_by.last_name}
                    </Typography>
                  </Box>
                )}
                {amendment.reviewed_at && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Reviewed:
                    </Typography>
                    <Typography variant="body2">{formatDate(amendment.reviewed_at)}</Typography>
                  </Box>
                )}
                {amendment.value_change && (
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Value Change:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color:
                          parseFloat(amendment.value_change) >= 0
                            ? theme.palette.success.main
                            : theme.palette.error.main,
                        fontWeight: 600,
                      }}
                    >
                      {parseFloat(amendment.value_change) >= 0 ? '+' : ''}
                      {formatCurrency(amendment.value_change, currency)}
                    </Typography>
                  </Box>
                )}
              </Stack>
              {amendment.review_notes && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: alpha(theme.palette.grey[500], 0.1),
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Review Notes:
                  </Typography>
                  <Typography variant="body2">{amendment.review_notes}</Typography>
                </Box>
              )}
            </GlassCard>
          ))}
        </Stack>
      </Box>
    ) : (
      <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
        <AmendmentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No Amendments
        </Typography>
        <Typography variant="body2" color="text.secondary">
          This contract has not been amended.
        </Typography>
      </GlassCard>
    )}
  </AnimatedElement>
);
