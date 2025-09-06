// frontend/client-portal/src/components/contracts/MobileContractCard.tsx
import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Box,
  Stack,
  Avatar,
  useTheme,
  Collapse,
  Button,
} from '@mui/material';
import {
  Description as ContractIcon,
  Edit as SignIcon,
  CheckCircle as SignedIcon,
  Warning as ExpiredIcon,
  ExpandMore as ExpandIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { contractUtils } from '../../apis/contracts.api';
import type { Contract } from '../../types/contracts.types';

interface MobileContractCardProps {
  contract: Contract;
  showActions?: boolean;
  onSign?: (contract: Contract) => void;
  onView?: (contract: Contract) => void;
  onDownload?: (contract: Contract) => void;
}

export const MobileContractCard: React.FC<MobileContractCardProps> = ({
  contract,
  showActions = true,
  onSign,
  onView,
  onDownload,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = React.useState(false);

  const statusColor = contractUtils.getStatusColor(contract.status);
  const statusDisplay = contractUtils.getStatusDisplay(contract.status);
  const isExpired = contractUtils.isContractExpired(contract);
  const canSign = contract.can_client_sign || false;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <Card 
      sx={{ 
        mb: 1,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        overflow: 'visible',
        '&:hover': {
          borderColor: theme.palette.primary.main,
          boxShadow: theme.shadows[3],
        },
        transition: 'all 0.2s ease',
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
          <Avatar
            sx={{
              backgroundColor: theme.palette.primary.main + '1A', // 10% opacity
              color: theme.palette.primary.main,
              width: 40,
              height: 40,
            }}
          >
            <ContractIcon fontSize="small" />
          </Avatar>
          
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                fontWeight: 600, 
                mb: 0.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {contract.event?.title || `Event #${contract.event?.id || 'Unknown'}`}
            </Typography>
            
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {contract.template?.name || 'Unknown Template'}
            </Typography>
          </Box>

          <IconButton 
            size="small"
            onClick={handleToggleExpanded}
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <ExpandIcon />
          </IconButton>
        </Box>

        {/* Status and Value */}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Chip
            label={statusDisplay}
            color={statusColor}
            size="small"
            variant="filled"
            sx={{ fontSize: '0.75rem' }}
          />
          
          {contract.is_amendment && (
            <Chip
              label={`Amendment #${contract.amendment_number}`}
              color="secondary"
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem' }}
            />
          )}
          
          {isExpired && (
            <Chip
              icon={<ExpiredIcon sx={{ fontSize: '0.75rem !important' }} />}
              label="Expired"
              color="error"
              size="small"
              variant="filled"
              sx={{ fontSize: '0.7rem' }}
            />
          )}

          {contract.contract_value && (
            <Typography 
              variant="body2" 
              color="primary.main" 
              sx={{ fontWeight: 600, ml: 'auto !important' }}
            >
              {contractUtils.formatContractValue(contract.contract_value, contract.currency)}
            </Typography>
          )}
        </Stack>

        {/* Progress Bar */}
        {contract.signature_progress && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Signatures
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {contract.signature_progress.signed_count}/{contract.signature_progress.total_required}
              </Typography>
            </Box>
            
            <Box
              sx={{
                width: '100%',
                height: 4,
                backgroundColor: theme.palette.grey[200],
                borderRadius: 2,
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
        )}

        {/* Action Buttons */}
        {showActions && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ViewIcon />}
              onClick={() => onView?.(contract)}
              sx={{ fontSize: '0.75rem', minWidth: 0, px: 2 }}
            >
              View
            </Button>
            
            {canSign && (
              <Button
                variant="contained"
                size="small"
                startIcon={<SignIcon />}
                onClick={() => onSign?.(contract)}
                color="primary"
                sx={{ fontSize: '0.75rem', minWidth: 0, px: 2 }}
              >
                Sign
              </Button>
            )}
            
            {contract.status === 'SIGNED' && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={() => onDownload?.(contract)}
                disabled // Placeholder - implement when backend supports PDF generation
                sx={{ fontSize: '0.75rem', minWidth: 0, px: 1.5 }}
              >
                PDF
              </Button>
            )}
          </Stack>
        )}

        {/* Expandable Details */}
        <Collapse in={expanded} timeout="auto">
          <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
            <Stack spacing={1.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  Created
                </Typography>
                <Typography variant="body2">
                  {formatDate(contract.created_at)}
                </Typography>
              </Box>

              {contract.fully_signed_at && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Signed
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(contract.fully_signed_at)}
                  </Typography>
                </Box>
              )}

              {contract.valid_until && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Valid Until
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(contract.valid_until)}
                  </Typography>
                </Box>
              )}

              {/* Signature Details */}
              {contract.signatures && contract.signatures.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    Signatures
                  </Typography>
                  <Stack spacing={0.5}>
                    {contract.signatures.map((signature) => (
                      <Box 
                        key={signature.id} 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          p: 1,
                          backgroundColor: theme.palette.grey[50],
                          borderRadius: 1,
                        }}
                      >
                        <SignedIcon color="success" sx={{ fontSize: 16 }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 500 }}>
                            {signature.role === 'CLIENT' ? 'Client Signature' : 
                             signature.role === 'COMPANY_REP' ? 'LifePlace Representative' :
                             signature.role === 'WITNESS' ? 'Witness Signature' :
                             signature.role_display || signature.role.replace('_', ' ')}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                            {signature.signer_name} • {formatDate(signature.signed_at)}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}
            </Stack>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default MobileContractCard;