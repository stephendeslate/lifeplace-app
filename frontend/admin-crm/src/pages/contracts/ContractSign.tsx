// frontend/admin-crm/src/pages/contracts/ContractSign.tsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  Fade,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Description as ContractIcon,
  Create as SignIcon,
} from '@mui/icons-material';
import { useEventContract } from '../../hooks/useContracts';
import { useLayout } from '../../contexts/LayoutContext';
import AdminContractSigningDialog from '../../components/contracts/AdminContractSigningDialog';

// Modern Design System imports
import { ModernPageLayout } from '../../components/common/ModernPageLayout';
import { ModernCard } from '../../components/common/ModernCard';
import { ModernPageHeader, type HeaderAction } from '../../components/common/ModernPageHeader';
import ModernLoadingStates from '../../components/common/ModernLoadingStates';
import { tokens } from '../../design-system';

export const ContractSign: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();

  const { data: contract, isLoading, error } = useEventContract(contractId ? parseInt(contractId) : 0);
  const [signingDialogOpen, setSigningDialogOpen] = React.useState(false);

  // Set breadcrumbs via layout context
  useEffect(() => {
    if (contract) {
      setBreadcrumbs([
        { label: 'Events', path: '/events' },
        { label: contract.event_details?.name || 'Event', path: contract.event_details?.id ? `/events/${contract.event_details.id}` : '/events' },
        { label: `Contract #${contract.id}`, path: `/contracts/${contract.id}` },
        { label: 'Sign' },
      ]);
    }
  }, [contract, setBreadcrumbs]);

  // Navigation handlers - use deterministic routes
  const handleBackToContract = () => {
    if (contractId) {
      navigate(`/contracts/${contractId}`);
    } else {
      navigate('/events');
    }
  };

  const handleSignComplete = () => {
    // Navigate back to the contract view page
    navigate(`/contracts/${contractId}`);
  };

  const handleSignError = (err: string) => {
    console.error('Contract signing error:', err);
  };

  // Automatically open signing dialog when component loads
  useEffect(() => {
    if (contract && !signingDialogOpen) {
      // Check if contract can be signed by admin
      if (contract.status === 'SENT' || contract.status === 'PARTIALLY_SIGNED') {
        setSigningDialogOpen(true);
      }
    }
  }, [contract, signingDialogOpen]);

  // Loading state with modern design
  if (isLoading) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernLoadingStates.ModernLoadingSpinner
          size={40}
          message="Loading contract..."
          variant="circular"
          glass
        />
      </ModernPageLayout>
    );
  }

  // Error state with modern design
  if (error) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernCard variant="glass" size="large" color="error" animation="fade">
          <Alert
            severity="error"
            sx={{
              background: 'transparent',
              border: 'none',
              '& .MuiAlert-message': {
                color: tokens.color.error[700],
              },
            }}
          >
            Failed to load contract. Please try again later.
          </Alert>
        </ModernCard>
      </ModernPageLayout>
    );
  }

  // Not found state
  if (!contract) {
    return (
      <ModernPageLayout backgroundPattern="default">
        <ModernCard variant="glass" size="large" color="warning" animation="fade">
          <Alert
            severity="warning"
            sx={{
              background: 'transparent',
              border: 'none',
              '& .MuiAlert-message': {
                color: tokens.color.warning[700],
              },
            }}
          >
            Contract not found.
          </Alert>
        </ModernCard>
      </ModernPageLayout>
    );
  }

  // Check if contract can be signed
  const canSign = contract.status === 'SENT' || contract.status === 'PARTIALLY_SIGNED';

  // Build header actions
  const secondaryActions: HeaderAction[] = [
    {
      icon: <ArrowBackIcon />,
      label: 'Back to Contract',
      onClick: handleBackToContract,
      variant: 'outlined',
      tooltip: 'Return to contract details',
    },
  ];

  const primaryAction: HeaderAction | undefined = canSign ? {
    icon: <SignIcon />,
    label: 'Sign Contract',
    onClick: () => setSigningDialogOpen(true),
    variant: 'contained',
    color: 'primary',
  } : undefined;

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Header */}
      <ModernPageHeader
        title={`Sign Contract #${contract.id}`}
        subtitle={contract.template_name}
        icon={<ContractIcon />}
        status={{
          label: contract.status_display || contract.status,
          color: canSign ? 'info' : 'secondary',
        }}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        size="medium"
        gradient
        glass
      />

      {/* Main Content */}
      <Fade in timeout={300}>
        <div>
          <ModernCard
            variant="glass"
            size="large"
            color={canSign ? 'primary' : 'default'}
            animation="none"
            sx={{
              '&::before': {
                background: canSign
                  ? `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.primary[600]}03 100%)`
                  : `linear-gradient(135deg, ${tokens.color.neutral[500]}04 0%, ${tokens.color.neutral[600]}03 100%)`,
              },
            }}
          >
            {canSign ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: tokens.spacing.radius.full,
                    background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
                    border: `1px solid ${tokens.color.primary[500]}30`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 3,
                  }}
                >
                  <ContractIcon sx={{ fontSize: 40, color: tokens.color.primary[600] }} />
                </Box>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    background: tokens.color.backgrounds.primaryGradient,
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    mb: 1,
                  }}
                >
                  Ready to Sign
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: tokens.color.neutral[600], mb: 4, maxWidth: 400, mx: 'auto' }}
                >
                  This contract is ready for your signature as a company representative.
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<SignIcon />}
                  onClick={() => setSigningDialogOpen(true)}
                  sx={{
                    background: `linear-gradient(135deg, ${tokens.color.primary[500]} 0%, ${tokens.color.primary[600]} 100%)`,
                    boxShadow: `0 8px 32px ${tokens.color.primary[500]}25`,
                    borderRadius: tokens.spacing.radius.full,
                    px: 4,
                    py: 1.5,
                    fontWeight: 600,
                    minWidth: 200,
                    '&:hover': {
                      background: `linear-gradient(135deg, ${tokens.color.primary[600]} 0%, ${tokens.color.primary[700]} 100%)`,
                      boxShadow: `0 12px 40px ${tokens.color.primary[500]}35`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  Open Signing Dialog
                </Button>
              </Box>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Alert
                  severity="info"
                  sx={{
                    mb: 3,
                    background: `linear-gradient(135deg, ${tokens.color.info[500]}08 0%, ${tokens.color.info[600]}05 100%)`,
                    border: `1px solid ${tokens.color.info[300]}30`,
                    borderRadius: tokens.spacing.radius.lg,
                    '& .MuiAlert-message': {
                      color: tokens.color.info[700],
                    },
                  }}
                >
                  This contract is not available for signing at this time.
                </Alert>
                <Typography
                  variant="body1"
                  sx={{ color: tokens.color.neutral[600], mb: 1 }}
                >
                  Current status: <strong style={{ color: tokens.color.neutral[800] }}>{contract.status}</strong>
                </Typography>
                <Typography variant="body2" sx={{ color: tokens.color.neutral[500] }}>
                  Contracts can only be signed when they have been sent to the client and are awaiting signatures.
                </Typography>
              </Box>
            )}
          </ModernCard>
        </div>
      </Fade>

      {/* Signing Dialog */}
      <AdminContractSigningDialog
        open={signingDialogOpen}
        onClose={() => setSigningDialogOpen(false)}
        contract={contract}
        onSignComplete={handleSignComplete}
        onError={handleSignError}
      />
    </ModernPageLayout>
  );
};

export default ContractSign;
