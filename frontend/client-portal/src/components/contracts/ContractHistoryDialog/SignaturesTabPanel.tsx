import React from 'react';
import { Box, Typography, Stack, Chip, Avatar, alpha, type Theme } from '@mui/material';
import { Draw as SignatureIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { ContractSignature } from '@/types/contracts.types';

interface SignaturesTabPanelProps {
  signatures: ContractSignature[];
  theme: Theme;
  formatDate: (dateString: string) => string;
}

export const SignaturesTabPanel: React.FC<SignaturesTabPanelProps> = ({
  signatures,
  theme,
  formatDate,
}) => (
  <AnimatedElement animation="fadeIn">
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
        Contract Signatures
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Detailed signature information and verification status
      </Typography>

      {signatures && signatures.length > 0 ? (
        <Stack spacing={2}>
          {signatures.map((signature, index) => (
            <GlassCard
              key={signature.id}
              variant="light"
              intensity="medium"
              sx={{
                p: 3,
                border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                backgroundColor: alpha(theme.palette.success.main, 0.05),
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Avatar
                  sx={{
                    backgroundColor: theme.palette.success.main,
                    color: 'white',
                    width: 40,
                    height: 40,
                  }}
                >
                  {signature.signer_name?.[0] || signature.role[0]}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {signature.signer_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {signature.signer_email}
                  </Typography>

                  <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                    <Chip
                      label={signature.role_display}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                    {signature.is_verified && (
                      <Chip label="Verified" size="small" color="success" variant="filled" />
                    )}
                  </Stack>

                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Signed At:
                      </Typography>
                      <Typography variant="body2">{formatDate(signature.signed_at)}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Method:
                      </Typography>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {signature.verification_method?.replace('_', ' ') || 'Electronic'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="caption" color="text.secondary">
                    Signature #{index + 1}
                  </Typography>
                </Box>
              </Box>
            </GlassCard>
          ))}
        </Stack>
      ) : (
        <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
          <SignatureIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            No Signatures Yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This contract hasn't been signed by anyone yet.
          </Typography>
        </GlassCard>
      )}
    </Box>
  </AnimatedElement>
);
