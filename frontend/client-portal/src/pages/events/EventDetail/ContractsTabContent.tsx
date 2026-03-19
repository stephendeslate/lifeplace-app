import React from 'react';
import { Box, Typography, Stack, Paper, Button, Skeleton, Alert } from '@mui/material';
import { Assignment as ContractIcon } from '@mui/icons-material';
import { ContractStatusChip } from '@/components/events';
import type { Contract } from '@/types/contracts.types';

interface ContractsTabContentProps {
  eventContracts: Contract[];
  isLoadingContracts: boolean;
  needsSignature: boolean;
  onViewContract: (contractId: string | number) => void;
  onSignContract: (contract: Contract) => void;
}

export const ContractsTabContent: React.FC<ContractsTabContentProps> = ({
  eventContracts,
  isLoadingContracts,
  needsSignature,
  onViewContract,
  onSignContract,
}) => {
  if (isLoadingContracts) {
    return (
      <Box>
        {[1, 2].map((item) => (
          <Skeleton key={item} variant="rectangular" height={120} sx={{ mb: 2 }} />
        ))}
      </Box>
    );
  }

  if (eventContracts.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <ContractIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          No contracts yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Contracts for this event will appear here once they are created.
        </Typography>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {needsSignature && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 600 }}>
            Action Required: Contract Signature Needed
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            You have contracts that require your signature to proceed with your event.
          </Typography>
        </Alert>
      )}

      {eventContracts.map((contract) => (
        <Paper key={contract.id} sx={{ p: 3 }}>
          <Stack spacing={2}>
            <Box
              display="flex"
              flexWrap="wrap"
              justifyContent="space-between"
              alignItems="flex-start"
              gap={1}
            >
              <Box>
                <Typography variant="h6" gutterBottom>
                  {contract.template.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Event: {contract.event.title}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <ContractStatusChip
                  status={contract.status}
                  hasContracts={true}
                  contractsCount={1}
                  pendingSignatureRequired={contract.can_client_sign}
                  size="small"
                />
              </Stack>
            </Box>

            {contract.signature_progress && (
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Signature Progress: {contract.signature_progress.signed_count} of{' '}
                  {contract.signature_progress.total_required} signatures
                </Typography>
                <Box
                  sx={{
                    width: '100%',
                    bgcolor: 'grey.200',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${contract.signature_progress.percentage}%`,
                      bgcolor:
                        contract.signature_progress.percentage === 100
                          ? 'success.main'
                          : 'warning.main',
                      height: 8,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </Box>
              </Box>
            )}

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={{ xs: 1, sm: 2 }}
              sx={{ mt: 2 }}
            >
              <Button variant="outlined" size="small" onClick={() => onViewContract(contract.id)}>
                View Details
              </Button>
              {contract.can_client_sign && (
                <Button
                  variant="contained"
                  size="small"
                  color="warning"
                  onClick={() => onSignContract(contract)}
                >
                  Sign Now
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
};
