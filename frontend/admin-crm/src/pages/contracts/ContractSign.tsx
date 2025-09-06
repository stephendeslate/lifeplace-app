// frontend/admin-crm/src/pages/contracts/ContractSign.tsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  Stack,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Description as ContractIcon,
} from '@mui/icons-material';
import { useEventContract } from '../../hooks/useContracts';
import AdminContractSigningDialog from '../../components/contracts/AdminContractSigningDialog';

export const ContractSign: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  
  const { data: contract, isLoading, error } = useEventContract(contractId ? parseInt(contractId) : 0);
  const [signingDialogOpen, setSigningDialogOpen] = React.useState(false);

  const handleBack = () => {
    navigate(-1);
  };

  const handleSignComplete = () => {
    // Navigate back to the contract view page
    navigate(`/contracts/${contractId}`);
  };

  const handleSignError = (error: string) => {
    console.error('Contract signing error:', error);
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

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load contract. Please try again later.
        </Alert>
      </Box>
    );
  }

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
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/events')}
          sx={{ textDecoration: 'underline' }}
        >
          Events
        </Link>
        <Link
          component="button"
          variant="body2"
          onClick={handleBack}
          sx={{ textDecoration: 'underline' }}
        >
          Contract #{contract.id}
        </Link>
        <Typography variant="body2" color="text.primary">
          Sign Contract
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          variant="outlined"
          size="small"
        >
          Back
        </Button>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
            Sign Contract #{contract.id}
          </Typography>
          <Typography variant="h6" color="text.secondary">
            {contract.template_name}
          </Typography>
        </Box>
      </Stack>

      {/* Main Content */}
      <Paper elevation={0} sx={{ p: 4, border: (theme) => `1px solid ${theme.palette.divider}` }}>
        {canSign ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <ContractIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Ready to Sign
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
              This contract is ready for your signature as a company representative.
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={() => setSigningDialogOpen(true)}
              sx={{ minWidth: 200 }}
            >
              Open Signing Dialog
            </Button>
          </Box>
        ) : (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              This contract is not available for signing at this time.
            </Alert>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Current status: <strong>{contract.status}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Contracts can only be signed when they have been sent to the client and are awaiting signatures.
            </Typography>
          </Box>
        )}
      </Paper>

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