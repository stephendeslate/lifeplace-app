// frontend/admin-crm/src/components/contracts/ContractAmendmentsSection.tsx

import React, { useState } from 'react';
import { Typography, Button, Stack, Paper } from '@mui/material';
import { Add as AddIcon, Edit as AmendmentIcon } from '@mui/icons-material';
import {
  useContractAmendmentsForContract,
  useRequestAmendment,
  useApproveAmendment,
  useRejectAmendment,
} from '../../hooks/useContracts';
import { ContractAmendmentsTable } from './ContractAmendmentsTable';
import { ContractAmendmentRequestDialog } from './ContractAmendmentRequestDialog';
import { AmendmentApprovalDialog } from './AmendmentApprovalDialog';
import type { EventContract, ContractAmendment, CreateContractAmendmentData } from '../../types/contracts.types';
import { tokens } from '../../design-system/tokens';

interface ContractAmendmentsSectionProps {
  contract: EventContract;
}

export const ContractAmendmentsSection: React.FC<ContractAmendmentsSectionProps> = ({
  contract,
}) => {
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [selectedAmendment, setSelectedAmendment] = useState<ContractAmendment | null>(null);
  const [approvalMode, setApprovalMode] = useState<'approve' | 'reject'>('approve');

  const { data: amendments = [], isLoading } = useContractAmendmentsForContract(contract.id);
  const requestAmendmentMutation = useRequestAmendment();
  const approveAmendmentMutation = useApproveAmendment();
  const rejectAmendmentMutation = useRejectAmendment();

  // Only allow amendment requests for signed, non-amendment contracts
  const canRequestAmendment = contract.status === 'SIGNED' && !contract.is_amendment;

  const handleRequestAmendment = (data: CreateContractAmendmentData) => {
    requestAmendmentMutation.mutate(
      { id: contract.id, data },
      {
        onSuccess: () => {
          setRequestDialogOpen(false);
        },
      }
    );
  };

  const handleApprove = (amendment: ContractAmendment) => {
    setSelectedAmendment(amendment);
    setApprovalMode('approve');
    setApprovalDialogOpen(true);
  };

  const handleReject = (amendment: ContractAmendment) => {
    setSelectedAmendment(amendment);
    setApprovalMode('reject');
    setApprovalDialogOpen(true);
  };

  const handleView = (amendment: ContractAmendment) => {
    // For now, open in approve mode for viewing (read-only)
    setSelectedAmendment(amendment);
    setApprovalMode('approve');
    setApprovalDialogOpen(true);
  };

  const handleApproveSubmit = (id: number, reviewNotes?: string) => {
    approveAmendmentMutation.mutate(
      { id, reviewNotes },
      {
        onSuccess: () => {
          setApprovalDialogOpen(false);
          setSelectedAmendment(null);
        },
      }
    );
  };

  const handleRejectSubmit = (id: number, reviewNotes?: string) => {
    rejectAmendmentMutation.mutate(
      { id, reviewNotes },
      {
        onSuccess: () => {
          setApprovalDialogOpen(false);
          setSelectedAmendment(null);
        },
      }
    );
  };

  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: tokens.spacing.radius.xl,
        background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
        border: `1px solid ${tokens.color.neutral[200]}`,
      }}
    >
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <AmendmentIcon sx={{ color: tokens.color.primary[600] }} />
          <Typography variant="h6">Amendments</Typography>
          {amendments.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              ({amendments.length})
            </Typography>
          )}
        </Stack>
        {canRequestAmendment && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setRequestDialogOpen(true)}
            size="small"
          >
            Request Amendment
          </Button>
        )}
      </Stack>

      {/* Table */}
      <ContractAmendmentsTable
        amendments={amendments}
        isLoading={isLoading}
        onApprove={handleApprove}
        onReject={handleReject}
        onView={handleView}
      />

      {/* Request Dialog */}
      <ContractAmendmentRequestDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        contract={contract}
        onSubmit={handleRequestAmendment}
        isLoading={requestAmendmentMutation.isPending}
      />

      {/* Approval/Rejection Dialog */}
      <AmendmentApprovalDialog
        open={approvalDialogOpen}
        onClose={() => {
          setApprovalDialogOpen(false);
          setSelectedAmendment(null);
        }}
        amendment={selectedAmendment}
        mode={approvalMode}
        onApprove={handleApproveSubmit}
        onReject={handleRejectSubmit}
        isLoading={approveAmendmentMutation.isPending || rejectAmendmentMutation.isPending}
      />
    </Paper>
  );
};

export default ContractAmendmentsSection;
