// frontend/admin-crm/src/pages/contracts/ContractView.tsx

import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Stack,
  Alert,
  Chip,
  Divider,
  Fade,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Download as DownloadIcon,
  CheckCircle as SignedIcon,
  Description as ContractIcon,
  Info as InfoIcon,
  Create as SignatureIcon,
  Article as ContentIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useEventContract, useSendContract } from '../../hooks/useContracts';
import { contractsApi } from '../../apis/contracts.api';
import { formatCurrency } from '../../utils/currency';
import { ContractAmendmentsSection } from '../../components/contracts';
import { useLayout } from '../../contexts/LayoutContext';

// Modern Design System imports
import { ModernPageLayout } from '../../components/common/ModernPageLayout';
import { ModernCard } from '../../components/common/ModernCard';
import { ModernPageHeader, type HeaderAction } from '../../components/common/ModernPageHeader';
import ModernLoadingStates from '../../components/common/ModernLoadingStates';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';

export const ContractView: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();

  const { data: contract, isLoading, error } = useEventContract(contractId ? parseInt(contractId) : 0);
  const { mutate: sendContract } = useSendContract();

  // Set breadcrumbs via layout context
  useEffect(() => {
    if (contract) {
      const eventName = contract.event_details?.name ||
        (typeof contract.event === 'object' ? contract.event.name : null) ||
        `Event #${typeof contract.event === 'number' ? contract.event : contract.event?.id || 'Unknown'}`;

      setBreadcrumbs([
        { label: 'Events', path: '/events' },
        { label: eventName, path: contract.event_details?.id ? `/events/${contract.event_details.id}` : '/events' },
        { label: `Contract #${contract.id}` },
      ]);
    }
  }, [contract, setBreadcrumbs]);

  // Navigation handlers - use deterministic routes, not navigate(-1)
  const handleBackToEvent = () => {
    if (contract?.event_details?.id) {
      navigate(`/events/${contract.event_details.id}`);
    } else if (typeof contract?.event === 'number') {
      navigate(`/events/${contract.event}`);
    } else {
      navigate('/events');
    }
  };

  const handleEdit = () => {
    if (contractId) {
      navigate(`/contracts/${contractId}/edit`);
    }
  };

  const handleSend = () => {
    if (contract) {
      sendContract(contract.id);
    }
  };

  const handleDownload = async () => {
    if (!contract) return;

    try {
      const blob = await contractsApi.downloadContractPdf(contract.id);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Contract_${contract.id}_${contract.template_name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading contract PDF:', err);
    }
  };

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
  if (error || !contract) {
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
            Failed to load contract. Please try again.
          </Alert>
        </ModernCard>
      </ModernPageLayout>
    );
  }

  // Get event name for display
  const eventName = contract.event_details?.name ||
    (typeof contract.event === 'object' ? contract.event.name : null) ||
    `Event #${typeof contract.event === 'number' ? contract.event : contract.event?.id || 'Unknown'}`;

  // Get status color for chip
  const getStatusColor = (): 'secondary' | 'info' | 'success' | 'warning' => {
    switch (contract.status) {
      case 'DRAFT': return 'secondary';
      case 'SENT': return 'info';
      case 'SIGNED': return 'success';
      default: return 'warning';
    }
  };

  // Build header actions
  const secondaryActions: HeaderAction[] = [
    {
      icon: <ArrowBackIcon />,
      label: 'Back to Event',
      onClick: handleBackToEvent,
      variant: 'outlined',
      tooltip: 'Return to event details',
    },
    {
      icon: <DownloadIcon />,
      label: 'Download PDF',
      onClick: handleDownload,
      variant: 'outlined',
      color: 'success',
    },
  ];

  if (contract.status === 'DRAFT') {
    secondaryActions.push({
      icon: <EditIcon />,
      label: 'Edit',
      onClick: handleEdit,
      variant: 'outlined',
    });
  }

  const primaryAction: HeaderAction | undefined = contract.status === 'DRAFT' ? {
    icon: <SendIcon />,
    label: 'Send to Client',
    onClick: handleSend,
    variant: 'contained',
    color: 'primary',
  } : undefined;

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Header */}
      <ModernPageHeader
        title={`Contract #${contract.id}`}
        subtitle={`Template: ${contract.template_name}`}
        icon={<ContractIcon />}
        status={{
          label: contract.status_display || contract.status,
          color: getStatusColor(),
        }}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
        size="medium"
        gradient
        glass
      />

      {/* Contract Details */}
      <Stack spacing={3}>
        {/* Contract Information */}
        <Fade in timeout={300}>
          <div>
            <ModernCard
              variant="glass"
              size="large"
              color="primary"
              animation="none"
              sx={{
                '&::before': {
                  background: `linear-gradient(135deg, ${tokens.color.primary[500]}04 0%, ${tokens.color.primary[600]}03 100%)`,
                },
              }}
            >
              {/* Section Header with Icon */}
              <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: tokens.spacing.radius.lg,
                    background: `linear-gradient(135deg, ${tokens.color.primary[500]}15 0%, ${tokens.color.primary[600]}10 100%)`,
                    border: `1px solid ${tokens.color.primary[500]}20`,
                  }}
                >
                  <InfoIcon sx={{ color: tokens.color.primary[600], fontSize: '1.25rem' }} />
                </Box>
                <Typography variant="h6" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>
                  Contract Information
                </Typography>
              </Box>

              <Stack spacing={2}>
                <Box display="flex" gap={4} flexWrap="wrap">
                  <Box>
                    <Typography variant="body2" sx={{ color: tokens.color.neutral[500], fontWeight: 500 }}>
                      Event
                    </Typography>
                    <Typography variant="body1" sx={{ color: tokens.color.neutral[800], fontWeight: 500 }}>
                      {eventName}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: tokens.color.neutral[500], fontWeight: 500 }}>
                      Client
                    </Typography>
                    <Typography variant="body1" sx={{ color: tokens.color.neutral[800], fontWeight: 500 }}>
                      {contract.event_details?.client_name ||
                       (typeof contract.event === 'object' ? contract.event.client_name : null) ||
                       'Not specified'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ color: tokens.color.neutral[500], fontWeight: 500 }}>
                      Created
                    </Typography>
                    <Typography variant="body1" sx={{ color: tokens.color.neutral[800], fontWeight: 500 }}>
                      {format(new Date(contract.created_at), 'MMM dd, yyyy')}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ borderColor: tokens.color.borders.glass }} />

                <Box display="flex" gap={4} flexWrap="wrap">
                  {contract.contract_value && (
                    <Box>
                      <Typography variant="body2" sx={{ color: tokens.color.neutral[500], fontWeight: 500 }}>
                        Contract Value
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          color: tokens.color.success[600],
                          fontWeight: 600,
                        }}
                      >
                        {formatCurrency(contract.contract_value, contract.currency || 'PHP')}
                      </Typography>
                    </Box>
                  )}
                  {contract.valid_until && (
                    <Box>
                      <Typography variant="body2" sx={{ color: tokens.color.neutral[500], fontWeight: 500 }}>
                        Valid Until
                      </Typography>
                      <Typography variant="body1" sx={{ color: tokens.color.neutral[800], fontWeight: 500 }}>
                        {format(new Date(contract.valid_until), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                  )}
                  {contract.fully_signed_at && (
                    <Box>
                      <Typography variant="body2" sx={{ color: tokens.color.neutral[500], fontWeight: 500 }}>
                        Signed On
                      </Typography>
                      <Typography variant="body1" sx={{ color: tokens.color.success[600], fontWeight: 500 }}>
                        {format(new Date(contract.fully_signed_at), 'MMM dd, yyyy')}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Stack>
            </ModernCard>
          </div>
        </Fade>

        {/* Signatures Section */}
        {contract.signatures && contract.signatures.length > 0 && (
          <Fade in timeout={400}>
            <div>
              <ModernCard
                variant="glass"
                size="large"
                color="success"
                animation="none"
                sx={{
                  '&::before': {
                    background: `linear-gradient(135deg, ${tokens.color.success[500]}04 0%, ${tokens.color.success[600]}03 100%)`,
                  },
                }}
              >
                {/* Section Header with Icon */}
                <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: tokens.spacing.radius.lg,
                      background: `linear-gradient(135deg, ${tokens.color.success[500]}15 0%, ${tokens.color.success[600]}10 100%)`,
                      border: `1px solid ${tokens.color.success[500]}20`,
                    }}
                  >
                    <SignatureIcon sx={{ color: tokens.color.success[600], fontSize: '1.25rem' }} />
                  </Box>
                  <Typography variant="h6" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>
                    Signatures
                  </Typography>
                </Box>

                <Stack spacing={2}>
                  {contract.signatures.map((signature) => (
                    <Box
                      key={signature.id}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderRadius: tokens.spacing.radius.lg,
                        ...glassPresets.light,
                        background: `linear-gradient(135deg, ${tokens.color.success[500]}06 0%, ${tokens.color.success[600]}04 100%)`,
                        border: `1px solid ${tokens.color.success[300]}30`,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <SignedIcon sx={{ color: tokens.color.success[600] }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: tokens.color.neutral[800] }}>
                            {signature.role === 'CLIENT' ? 'Client Signature' :
                             signature.role === 'COMPANY_REP' ? 'LifePlace Representative' :
                             signature.role === 'WITNESS' ? 'Witness Signature' :
                             signature.role_display || signature.role.replace('_', ' ')}
                          </Typography>
                          <Typography variant="caption" sx={{ color: tokens.color.neutral[600] }}>
                            Signed by {signature.signer_name} on {format(new Date(signature.signed_at), 'MMM dd, yyyy \'at\' h:mm a')}
                          </Typography>
                          {signature.signer_title && (
                            <Typography variant="caption" sx={{ color: tokens.color.neutral[500], display: 'block' }}>
                              Title: {signature.signer_title}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Chip
                        label="Signed"
                        size="small"
                        sx={{
                          fontWeight: 600,
                          background: `linear-gradient(135deg, ${tokens.color.success[500]} 0%, ${tokens.color.success[600]} 100%)`,
                          color: 'white',
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </ModernCard>
            </div>
          </Fade>
        )}

        {/* Amendments Section */}
        <Fade in timeout={500}>
          <div>
            <ContractAmendmentsSection contract={contract} />
          </div>
        </Fade>

        {/* Contract Content */}
        <Fade in timeout={600}>
          <div>
            <ModernCard
              variant="glass"
              size="large"
              color="default"
              animation="none"
            >
              {/* Section Header with Icon */}
              <Box display="flex" alignItems="center" gap={1.5} mb={3}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: tokens.spacing.radius.lg,
                    background: `linear-gradient(135deg, ${tokens.color.neutral[500]}15 0%, ${tokens.color.neutral[600]}10 100%)`,
                    border: `1px solid ${tokens.color.neutral[400]}20`,
                  }}
                >
                  <ContentIcon sx={{ color: tokens.color.neutral[600], fontSize: '1.25rem' }} />
                </Box>
                <Typography variant="h6" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>
                  Contract Content
                </Typography>
              </Box>

              <Box
                sx={{
                  ...glassPresets.light,
                  border: `1px solid ${tokens.color.borders.glass}`,
                  borderRadius: tokens.spacing.radius.lg,
                  p: 3,
                  backgroundColor: tokens.color.neutral[50],
                  maxHeight: '600px',
                  overflow: 'auto',
                  // Signature styling
                  '& .contract-signature': {
                    maxWidth: '200px',
                    height: '60px',
                    borderBottom: `1px solid ${tokens.color.neutral[950]}`,
                    display: 'inline-block',
                    verticalAlign: 'bottom',
                    margin: '0 4px',
                  },
                  '& .signature-pending': {
                    fontStyle: 'italic',
                    color: tokens.color.neutral[600],
                    backgroundColor: tokens.color.neutral[100],
                    padding: '2px 8px',
                    borderRadius: tokens.spacing.radius.sm,
                    fontSize: '12px',
                  },
                  // Print styles for signatures
                  '@media print': {
                    '& .contract-signature': {
                      maxWidth: '180px',
                      height: '50px',
                      WebkitPrintColorAdjust: 'exact',
                      colorAdjust: 'exact',
                    },
                    '& .signature-pending': {
                      backgroundColor: `${tokens.color.neutral[100]} !important`,
                      WebkitPrintColorAdjust: 'exact',
                      colorAdjust: 'exact',
                    },
                  },
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: contract.content || 'No content available'
                  }}
                  style={{
                    lineHeight: 1.6,
                    fontSize: '14px',
                  }}
                />
              </Box>
            </ModernCard>
          </div>
        </Fade>
      </Stack>
    </ModernPageLayout>
  );
};
