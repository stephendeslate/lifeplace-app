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
  Button,
  CircularProgress,
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
  if (error || !contract) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load contract. Please try again.
        </Alert>
      </Box>
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
                  Contract #{contract.id}
                </Typography>
                <Chip
                  label={contract.status_display || contract.status}
                  color={getStatusColor()}
                  size="small"
                />
              </Box>
              <Typography variant="body1" color="text.secondary">
                Template: {contract.template_name}
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToEvent}
            >
              Back to Event
            </Button>
            <Button
              variant="outlined"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
            >
              Download PDF
            </Button>
            {contract.status === 'DRAFT' && (
              <>
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                >
                  Edit
                </Button>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={handleSend}
                >
                  Send to Client
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </Box>

      {/* Contract Details */}
      <Stack spacing={3}>
        {/* Contract Information */}
        <Box
          sx={{
            p: 3,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Section Header with Icon */}
          <Box display="flex" alignItems="center" gap={1.5} mb={3}>
            <InfoIcon color="primary" />
            <Typography variant="h6" fontWeight="600">
              Contract Information
            </Typography>
          </Box>

          <Stack spacing={2}>
            <Box display="flex" gap={4} flexWrap="wrap">
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Event
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {eventName}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Client
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {contract.event_details?.client_name ||
                   (typeof contract.event === 'object' ? contract.event.client_name : null) ||
                   'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {format(new Date(contract.created_at), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Box>

            <Divider />

            <Box display="flex" gap={4} flexWrap="wrap">
              {contract.contract_value && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Contract Value
                  </Typography>
                  <Typography variant="body1" fontWeight={600} color="success.main">
                    {formatCurrency(contract.contract_value, contract.currency || 'PHP')}
                  </Typography>
                </Box>
              )}
              {contract.valid_until && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Valid Until
                  </Typography>
                  <Typography variant="body1" fontWeight={500}>
                    {format(new Date(contract.valid_until), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              )}
              {contract.fully_signed_at && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Signed On
                  </Typography>
                  <Typography variant="body1" fontWeight={500} color="success.main">
                    {format(new Date(contract.fully_signed_at), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Stack>
        </Box>

        {/* Signatures Section */}
        {contract.signatures && contract.signatures.length > 0 && (
          <Box
            sx={{
              p: 3,
              borderRadius: 1,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            {/* Section Header with Icon */}
            <Box display="flex" alignItems="center" gap={1.5} mb={3}>
              <SignatureIcon color="success" />
              <Typography variant="h6" fontWeight="600">
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
                    borderRadius: 1,
                    bgcolor: 'success.50',
                    border: '1px solid',
                    borderColor: 'success.200',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <SignedIcon color="success" />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {signature.role === 'CLIENT' ? 'Client Signature' :
                         signature.role === 'COMPANY_REP' ? 'LifePlace Representative' :
                         signature.role === 'WITNESS' ? 'Witness Signature' :
                         signature.role_display || signature.role.replace('_', ' ')}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Signed by {signature.signer_name} on {format(new Date(signature.signed_at), 'MMM dd, yyyy \'at\' h:mm a')}
                      </Typography>
                      {signature.signer_title && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                          Title: {signature.signer_title}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Chip
                    label="Signed"
                    size="small"
                    color="success"
                  />
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        {/* Amendments Section */}
        <ContractAmendmentsSection contract={contract} />

        {/* Contract Content */}
        <Box
          sx={{
            p: 3,
            borderRadius: 1,
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Section Header with Icon */}
          <Box display="flex" alignItems="center" gap={1.5} mb={3}>
            <ContentIcon color="action" />
            <Typography variant="h6" fontWeight="600">
              Contract Content
            </Typography>
          </Box>

          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 3,
              bgcolor: 'grey.50',
              maxHeight: '600px',
              overflow: 'auto',
              // Signature styling
              '& .contract-signature': {
                maxWidth: '200px',
                height: '60px',
                borderBottom: '1px solid',
                borderColor: 'grey.900',
                display: 'inline-block',
                verticalAlign: 'bottom',
                margin: '0 4px',
              },
              '& .signature-pending': {
                fontStyle: 'italic',
                color: 'text.secondary',
                bgcolor: 'grey.100',
                padding: '2px 8px',
                borderRadius: 0.5,
                fontSize: '12px',
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
        </Box>
      </Stack>
    </Box>
  );
};
