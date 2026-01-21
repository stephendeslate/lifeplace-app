// frontend/admin-crm/src/pages/contracts/ContractSign.tsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  Chip,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Description as ContractIcon,
  Create as SignIcon,
} from '@mui/icons-material';
import { useEventContract } from '../../hooks/useContracts';
import { useLayout } from '../../contexts/LayoutContext';
import AdminContractSigningDialog from '../../components/contracts/AdminContractSigningDialog';

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

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary" sx={{ ml: 2 }}>
            Loading contract...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load contract. Please try again later.
        </Alert>
      </Box>
    );
  }

  // Not found state
  if (!contract) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          Contract not found.
        </Alert>
      </Box>
    );
  }

  // Check if contract can be signed
  const canSign = contract.status === 'SENT' || contract.status === 'PARTIALLY_SIGNED';

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          p: 3,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          display="flex"
          flexDirection={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          gap={2}
        >
          <Box display="flex" alignItems="center" gap={2}>
            <ContractIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                  Sign Contract #{contract.id}
                </Typography>
                <Chip
                  label={contract.status_display || contract.status}
                  color={canSign ? 'info' : 'secondary'}
                  size="small"
                />
              </Box>
              <Typography variant="body1" color="text.secondary">
                {contract.template_name}
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToContract}
            >
              Back to Contract
            </Button>
            {canSign && (
              <Button
                variant="contained"
                startIcon={<SignIcon />}
                onClick={() => setSigningDialogOpen(true)}
              >
                Sign Contract
              </Button>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Main Content */}
      <Box
        sx={{
          p: 3,
          borderRadius: 1,
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {canSign ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: 'primary.50',
                border: '1px solid',
                borderColor: 'primary.200',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <ContractIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
            <Typography
              variant="h5"
              fontWeight={700}
              color="primary.main"
              gutterBottom
            >
              Ready to Sign
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ mb: 4, maxWidth: 400, mx: 'auto' }}
            >
              This contract is ready for your signature as a company representative.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<SignIcon />}
              onClick={() => setSigningDialogOpen(true)}
              sx={{ minWidth: 200 }}
            >
              Open Signing Dialog
            </Button>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert
              severity="info"
              sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}
            >
              This contract is not available for signing at this time.
            </Alert>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              Current status: <strong>{contract.status}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Contracts can only be signed when they have been sent to the client and are awaiting signatures.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Signing Dialog */}
      <AdminContractSigningDialog
        open={signingDialogOpen}
        onClose={() => setSigningDialogOpen(false)}
        contract={contract}
        onSignComplete={handleSignComplete}
        onError={handleSignError}
      />
    </Box>
  );
};

export default ContractSign;
