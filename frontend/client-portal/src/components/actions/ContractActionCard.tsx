// frontend/client-portal/src/components/actions/ContractActionCard.tsx

import React from 'react';
import {
  Stack,
  Button,
  Typography,
  Chip,
  Box,
  LinearProgress,
  useTheme,
} from '@mui/material';
import {
  Edit as SignIcon,
  Visibility as ViewIcon,
  Warning as ExpiringIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ActionCard } from './ActionCard';
import type { ContractActionItem } from '../../types/action-center.types';

interface ContractActionCardProps {
  action: ContractActionItem;
  onSign?: () => void;
  onView?: () => void;
}

export const ContractActionCard: React.FC<ContractActionCardProps> = ({
  action,
  onSign,
  onView,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleSign = () => {
    if (onSign) {
      onSign();
    } else {
      // Navigate to contracts page with the contract selected
      navigate(`/contracts?sign=${action.contractId}`);
    }
  };

  const handleView = () => {
    if (onView) {
      onView();
    } else {
      navigate(`/contracts?view=${action.contractId}`);
    }
  };

  const { signatureProgress } = action;
  const progressPercentage = signatureProgress.percentage;
  const isExpiringSoon = action.daysUntilExpiry !== null && action.daysUntilExpiry <= 3 && action.daysUntilExpiry > 0;
  const isExpired = action.daysUntilExpiry !== null && action.daysUntilExpiry <= 0;

  return (
    <ActionCard action={action}>
      <Stack spacing={1.5}>
        {/* Signature Progress */}
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Signature Progress
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {signatureProgress.signed_count}/{signatureProgress.total_required} signatures
            </Typography>
          </Box>

          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: theme.palette.grey[200],
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                backgroundColor: progressPercentage === 100
                  ? theme.palette.success.main
                  : theme.palette.primary.main,
              },
            }}
          />
        </Box>

        {/* Status and Expiry Info */}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
          <Chip
            label={action.contractStatus === 'PARTIALLY_SIGNED' ? 'Partially Signed' : 'Awaiting Signature'}
            size="small"
            color={action.contractStatus === 'PARTIALLY_SIGNED' ? 'warning' : 'info'}
            variant="outlined"
            sx={{ fontSize: '0.7rem' }}
          />

          {isExpired && (
            <Chip
              icon={<ExpiringIcon sx={{ fontSize: '0.875rem !important' }} />}
              label="Expired"
              color="error"
              size="small"
              variant="filled"
              sx={{ fontSize: '0.7rem' }}
            />
          )}

          {!isExpired && isExpiringSoon && (
            <Chip
              icon={<ExpiringIcon sx={{ fontSize: '0.875rem !important' }} />}
              label={`Expires in ${action.daysUntilExpiry} day${action.daysUntilExpiry !== 1 ? 's' : ''}`}
              color="warning"
              size="small"
              variant="filled"
              sx={{ fontSize: '0.7rem' }}
            />
          )}

          {!isExpired && !isExpiringSoon && action.daysUntilExpiry !== null && action.daysUntilExpiry > 0 && (
            <Typography variant="caption" color="text.secondary">
              Valid for {action.daysUntilExpiry} more days
            </Typography>
          )}
        </Stack>

        {/* Action Buttons */}
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ViewIcon />}
            onClick={(e) => {
              e.stopPropagation();
              handleView();
            }}
            sx={{ fontSize: '0.75rem' }}
          >
            View Contract
          </Button>

          {action.canClientSign && !isExpired && (
            <Button
              variant="contained"
              size="small"
              startIcon={<SignIcon />}
              onClick={(e) => {
                e.stopPropagation();
                handleSign();
              }}
              color="primary"
              sx={{ fontSize: '0.75rem' }}
            >
              Sign Now
            </Button>
          )}
        </Stack>
      </Stack>
    </ActionCard>
  );
};

export default ContractActionCard;
