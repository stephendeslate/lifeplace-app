// frontend/client-portal/src/components/contracts/ContractViewer.tsx
import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Chip,
  Stack,
  Avatar,
  useTheme,
  Alert,
} from '@mui/material';
import {
  Description as DocumentIcon,
  CheckCircle as SignedIcon,
  Schedule as PendingIcon,
  Warning as ExpiredIcon,
} from '@mui/icons-material';
import type { Contract } from '../../types/contracts.types';
import { contractUtils } from '../../apis/contracts.api';

interface ContractViewerProps {
  contract: Contract;
  showContent?: boolean;
  showSignatures?: boolean;
  showMetadata?: boolean;
  compact?: boolean;
  onSignatureClick?: (signatureId: string) => void;
}

export const ContractViewer: React.FC<ContractViewerProps> = ({
  contract,
  showContent = true,
  showSignatures = true,
  showMetadata = true,
  compact = false,
  onSignatureClick,
}) => {
  const theme = useTheme();

  const statusColor = contractUtils.getStatusColor(contract.status);
  const statusDisplay = contractUtils.getStatusDisplay(contract.status);
  const isExpired = contractUtils.isContractExpired(contract);
  const daysUntilExpiry = contractUtils.getDaysUntilExpiry(contract.valid_until);

  const getSignatureStatusIcon = (role: string) => {
    const signature = contract.signatures.find(s => s.role === role);
    if (signature) {
      return <SignedIcon color="success" fontSize="small" />;
    } else {
      return <PendingIcon color="warning" fontSize="small" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Box>
      {/* Header */}
      <Paper elevation={1} sx={{ p: compact ? 2 : 3, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
          <Avatar
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: 'white',
            }}
          >
            <DocumentIcon />
          </Avatar>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant={compact ? 'h6' : 'h5'} sx={{ fontWeight: 600, mb: 1 }}>
              Contract for {contract.event.title}
            </Typography>
            
            <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 1 }}>
              <Chip
                label={statusDisplay}
                color={statusColor}
                size="small"
                variant="filled"
              />
              
              {contract.is_amendment && (
                <Chip
                  label={`Amendment #${contract.amendment_number}`}
                  color="secondary"
                  size="small"
                  variant="outlined"
                />
              )}
              
              {isExpired && (
                <Chip
                  icon={<ExpiredIcon />}
                  label="Expired"
                  color="error"
                  size="small"
                  variant="filled"
                />
              )}
            </Stack>

            <Typography variant="body2" color="text.secondary">
              Template: {contract.template.name}
            </Typography>
          </Box>

          {contract.contract_value && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                {contractUtils.formatContractValue(contract.contract_value, contract.currency)}
              </Typography>
            </Box>
          )}
        </Box>

        {/* Expiry warning */}
        {daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This contract expires in {daysUntilExpiry} day{daysUntilExpiry === 1 ? '' : 's'}
          </Alert>
        )}
      </Paper>

      {/* Signature Progress */}
      {showSignatures && contract.signature_progress && (
        <Paper elevation={1} sx={{ p: compact ? 2 : 3, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Signature Status
          </Typography>

          {/* Progress overview */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {contract.signature_progress.signed_count} of {contract.signature_progress.total_required} signatures
              </Typography>
            </Box>
            
            <Box
              sx={{
                width: '100%',
                height: 8,
                backgroundColor: theme.palette.grey[200],
                borderRadius: 4,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${contract.signature_progress.percentage}%`,
                  height: '100%',
                  backgroundColor: contract.signature_progress.percentage === 100 
                    ? theme.palette.success.main 
                    : theme.palette.primary.main,
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </Box>

          {/* Individual signatures */}
          <Stack spacing={2}>
            {(contract.template.signature_requirements || []).map((role) => {
              const signature = contract.signatures.find(s => s.role === role);
              const isSigned = !!signature;

              return (
                <Box
                  key={role}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    p: 2,
                    borderRadius: 1,
                    backgroundColor: theme.palette.grey[50],
                    cursor: signature && onSignatureClick ? 'pointer' : 'default',
                  }}
                  onClick={signature && onSignatureClick ? () => onSignatureClick(signature.id) : undefined}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {getSignatureStatusIcon(role)}
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {role === 'CLIENT' ? 'Client Signature' : 
                         role === 'COMPANY_REP' ? 'LifePlace Representative' :
                         role === 'WITNESS' ? 'Witness Signature' :
                         role.replace('_', ' ')}
                      </Typography>
                      {signature && (
                        <Typography variant="caption" color="text.secondary">
                          Signed by {signature.signer_name} on {formatDate(signature.signed_at)}
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Chip
                    label={isSigned ? 'Signed' : 'Pending'}
                    color={isSigned ? 'success' : 'warning'}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      {/* Contract Content */}
      {showContent && (
        <Paper elevation={1} sx={{ p: compact ? 2 : 3, mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Contract Content
          </Typography>
          
          <Divider sx={{ mb: 2 }} />
          
          <Box
            sx={{
              '& p': { mb: 2 },
              '& h1, & h2, & h3, & h4, & h5, & h6': { 
                fontWeight: 600, 
                mb: 1, 
                mt: 2,
                '&:first-of-type': { mt: 0 }
              },
              '& ul, & ol': { pl: 3, mb: 2 },
              '& li': { mb: 0.5 },
              lineHeight: 1.6,
              fontSize: '0.95rem',
            }}
            dangerouslySetInnerHTML={{ __html: contract.content }}
          />
        </Paper>
      )}

      {/* Metadata */}
      {showMetadata && (
        <Paper elevation={1} sx={{ p: compact ? 2 : 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Contract Details
          </Typography>
          
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Event:
              </Typography>
              <Typography variant="body2">
                {contract.event.title}
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Template:
              </Typography>
              <Typography variant="body2">
                {contract.template.name}
              </Typography>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Created:
              </Typography>
              <Typography variant="body2">
                {formatDate(contract.created_at)}
              </Typography>
            </Box>

            {contract.sent_at && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Sent:
                </Typography>
                <Typography variant="body2">
                  {formatDate(contract.sent_at)}
                </Typography>
              </Box>
            )}

            {contract.fully_signed_at && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Fully Signed:
                </Typography>
                <Typography variant="body2">
                  {formatDate(contract.fully_signed_at)}
                </Typography>
              </Box>
            )}

            {contract.valid_until && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Valid Until:
                </Typography>
                <Typography variant="body2">
                  {formatDate(contract.valid_until)}
                </Typography>
              </Box>
            )}

            {contract.contract_value && (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Contract Value:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {contractUtils.formatContractValue(contract.contract_value, contract.currency)}
                </Typography>
              </Box>
            )}
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default ContractViewer;