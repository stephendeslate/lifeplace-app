// frontend/client-portal/src/pages/contracts/ContractDetail.tsx

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Typography,
  Stack,
  Paper,
  Breadcrumbs,
  Link,
  Button,
  Skeleton,
  Alert,
  AlertTitle,
  Chip,
  useTheme,
  alpha,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Warning as ExpiredIcon,
  Download as DownloadIcon,
  Edit as SignIcon,
  Event as EventIcon,
  AccessTime as ClockIcon,
} from '@mui/icons-material';
import { contractsApi, contractUtils } from '../../apis/contracts.api';
import { ContractViewer } from '../../components/contracts/ContractViewer';
import ContractSigningDialog from '../../components/contracts/ContractSigningDialog';
import type { Contract } from '../../types/contracts.types';

const ContractDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();

  const [signingDialogOpen, setSigningDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch contract details
  const {
    data: contract,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsApi.getContract(id!),
    enabled: !!id,
    retry: (failureCount, error) => {
      // Don't retry on 404 or 403
      if (error && typeof error === 'object' && 'response' in error) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 404 || status === 403) return false;
      }
      return failureCount < 2;
    },
  });

  // Determine contract state
  const isExpired = contract ? contractUtils.isContractExpired(contract) || contract.status === 'EXPIRED' : false;
  const isVoid = contract?.status === 'VOID';
  const isSigned = contract?.status === 'SIGNED';
  const canSign = contract?.can_client_sign && !isExpired && !isVoid;
  const daysUntilExpiry = contract ? contractUtils.getDaysUntilExpiry(contract.valid_until) : null;

  const handleBack = () => {
    navigate(-1);
  };

  const handleGoToEvent = () => {
    if (contract?.event?.id) {
      navigate(`/events/${contract.event.id}`, { state: { activeTab: 8 } });
    }
  };

  const handleSignContract = () => {
    setSigningDialogOpen(true);
  };

  const handleSignComplete = () => {
    setSigningDialogOpen(false);
    refetch();
  };

  const handleSignError = (error: string) => {
    if (import.meta.env.DEV) console.error('Contract signing error:', error);
  };

  const handleDownloadPdf = async () => {
    if (!contract) return;

    setIsDownloading(true);
    try {
      const blob = await contractsApi.downloadContractPdf(contract.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `contract-${contract.event.title.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Download failed:', error);
    } finally {
      setIsDownloading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Stack spacing={3}>
          <Skeleton variant="text" width={200} height={24} />
          <Skeleton variant="rectangular" height={150} />
          <Skeleton variant="rectangular" height={300} />
          <Skeleton variant="rectangular" height={200} />
        </Stack>
      </Box>
    );
  }

  // Error/Not found state
  if (error || !contract) {
    const errorStatus = error && typeof error === 'object' && 'response' in error
      ? (error as { response?: { status?: number } }).response?.status
      : null;

    const is403 = errorStatus === 403;
    const is404 = errorStatus === 404;

    return (
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>
            {is403 ? 'Access Denied' : is404 ? 'Contract Not Found' : 'Unable to Load Contract'}
          </AlertTitle>
          {is403
            ? 'You do not have permission to view this contract.'
            : is404
            ? 'The contract you are looking for does not exist or has been removed.'
            : 'There was an error loading the contract details. Please try again.'}
        </Alert>
        <Stack direction="row" spacing={2}>
          <Button startIcon={<BackIcon />} onClick={handleBack} variant="outlined">
            Go Back
          </Button>
          <Button onClick={() => navigate('/documents')} variant="contained">
            View All Documents
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/documents')}
          sx={{ textDecoration: 'none' }}
        >
          Documents
        </Link>
        <Typography variant="body2" color="text.primary">
          {contract.template.name}
        </Typography>
      </Breadcrumbs>

      {/* Expired Contract Banner */}
      {isExpired && (
        <Alert
          severity="error"
          icon={<ExpiredIcon />}
          sx={{
            mb: 3,
            '& .MuiAlert-icon': {
              alignItems: 'center',
            },
          }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => navigate('/contact')}
            >
              Contact Us
            </Button>
          }
        >
          <AlertTitle>Contract Expired</AlertTitle>
          <Typography variant="body2">
            This contract expired on{' '}
            {contract.valid_until
              ? new Date(contract.valid_until).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : 'a previous date'}{' '}
            and can no longer be signed. Please contact us if you need a new contract issued.
          </Typography>
        </Alert>
      )}

      {/* Void Contract Banner */}
      {isVoid && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <AlertTitle>Contract Voided</AlertTitle>
          <Typography variant="body2">
            This contract has been voided and is no longer valid. Please contact us if you have questions.
          </Typography>
        </Alert>
      )}

      {/* Expiring Soon Warning */}
      {!isExpired && !isVoid && daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
        <Alert
          severity="warning"
          icon={<ClockIcon />}
          sx={{ mb: 3 }}
        >
          <AlertTitle>Contract Expiring Soon</AlertTitle>
          <Typography variant="body2">
            This contract will expire in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'}.
            {canSign && ' Please sign before the expiration date to avoid delays.'}
          </Typography>
        </Alert>
      )}

      {/* Sign Disabled Reason */}
      {contract.sign_disabled_reason && !isExpired && !isVoid && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Signing Not Available</AlertTitle>
          <Typography variant="body2">{contract.sign_disabled_reason}</Typography>
        </Alert>
      )}

      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          background: isExpired || isVoid
            ? `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)} 0%, ${alpha(theme.palette.grey[500], 0.05)} 100%)`
            : `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(isExpired || isVoid ? theme.palette.error.main : theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
        >
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Button
                onClick={handleBack}
                size="small"
                startIcon={<BackIcon />}
                sx={{ mr: 1 }}
              >
                Back
              </Button>
            </Stack>

            <Typography variant="h4" component="h1" sx={{ mb: 1 }}>
              {contract.template.name}
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
              <Chip
                label={contractUtils.getStatusDisplay(contract.status)}
                color={contractUtils.getStatusColor(contract.status)}
                size="small"
              />
              {contract.is_amendment && (
                <Chip
                  label={`Amendment #${contract.amendment_number}`}
                  color="secondary"
                  size="small"
                  variant="outlined"
                />
              )}
              {isExpired && contract.status !== 'EXPIRED' && (
                <Chip
                  icon={<ExpiredIcon />}
                  label="Expired"
                  color="error"
                  size="small"
                />
              )}
            </Stack>

            <Button
              variant="text"
              size="small"
              startIcon={<EventIcon />}
              onClick={handleGoToEvent}
              sx={{ textTransform: 'none' }}
            >
              View Event: {contract.event.title}
            </Button>
          </Box>

          <Stack direction="row" spacing={2}>
            {isSigned && (
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadPdf}
                disabled={isDownloading}
              >
                {isDownloading ? 'Downloading...' : 'Download PDF'}
              </Button>
            )}
            {canSign && (
              <Button
                variant="contained"
                color="warning"
                startIcon={<SignIcon />}
                onClick={handleSignContract}
              >
                Sign Contract
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Contract Content */}
      <ContractViewer
        contract={contract}
        showContent={true}
        showSignatures={true}
        showMetadata={true}
        compact={false}
      />

      {/* Contract Signing Dialog */}
      <ContractSigningDialog
        open={signingDialogOpen}
        onClose={() => setSigningDialogOpen(false)}
        contract={contract}
        onSignComplete={handleSignComplete}
        onError={handleSignError}
      />
    </Box>
  );
};

export default ContractDetail;
