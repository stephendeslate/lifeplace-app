// frontend/client-portal/src/components/events/ContractStatusChip.tsx

import React from 'react';
import { Chip, Tooltip, useTheme, alpha } from '@mui/material';
import {
  Assignment as ContractIcon,
  Edit as SignatureIcon,
  CheckCircle as SignedIcon,
  Warning as UrgentIcon,
  Schedule as PendingIcon,
  Error as ExpiredIcon,
} from '@mui/icons-material';

interface ContractStatusChipProps {
  status?: 'DRAFT' | 'SENT' | 'PARTIALLY_SIGNED' | 'SIGNED' | 'EXPIRED' | 'VOID' | 'AMENDED';
  hasContracts?: boolean;
  contractsCount?: number;
  pendingSignatureRequired?: boolean;
  contractExpiryDays?: number | null;
  size?: 'small' | 'medium';
  showCount?: boolean;
}

const ContractStatusChip: React.FC<ContractStatusChipProps> = ({
  status,
  hasContracts = false,
  contractsCount = 0,
  pendingSignatureRequired = false,
  contractExpiryDays = null,
  size = 'small',
  showCount = false,
}) => {
  const theme = useTheme();

  // Don't render if no contracts
  if (!hasContracts || contractsCount === 0) {
    return null;
  }

  // Determine priority display based on contract state
  const getContractDisplayInfo = () => {
    // Expired contracts (highest priority)
    if (status === 'EXPIRED') {
      return {
        label: 'Contract Expired',
        color: 'error' as const,
        icon: <ExpiredIcon fontSize="small" />,
        tooltip: 'Contract has expired and requires attention',
        variant: 'filled' as const,
      };
    }

    // Urgent expiry (within 3 days) - but only for unsigned contracts
    if (
      status !== 'SIGNED' &&
      contractExpiryDays !== null &&
      contractExpiryDays <= 3 &&
      contractExpiryDays >= 0
    ) {
      return {
        label: `Expires in ${contractExpiryDays}d`,
        color: 'error' as const,
        icon: <UrgentIcon fontSize="small" />,
        tooltip: `Contract expires in ${contractExpiryDays} day${contractExpiryDays === 1 ? '' : 's'}. Sign soon to secure your booking.`,
        variant: 'filled' as const,
      };
    }

    // Pending signature required
    if (pendingSignatureRequired) {
      return {
        label: 'Signature Needed',
        color: 'warning' as const,
        icon: <SignatureIcon fontSize="small" />,
        tooltip: 'Your signature is required to proceed',
        variant: 'filled' as const,
      };
    }

    // Partially signed
    if (status === 'PARTIALLY_SIGNED') {
      return {
        label: 'Partially Signed',
        color: 'info' as const,
        icon: <PendingIcon fontSize="small" />,
        tooltip: 'Contract is partially signed, waiting for other signatures',
        variant: 'outlined' as const,
      };
    }

    // Fully signed
    if (status === 'SIGNED') {
      return {
        label: showCount
          ? `${contractsCount} Contract${contractsCount === 1 ? '' : 's'}`
          : 'Signed',
        color: 'success' as const,
        icon: <SignedIcon fontSize="small" />,
        tooltip: `${contractsCount} contract${contractsCount === 1 ? ' is' : 's are'} fully signed`,
        variant: 'outlined' as const,
      };
    }

    // Sent for signature
    if (status === 'SENT') {
      return {
        label: 'Contract Sent',
        color: 'info' as const,
        icon: <ContractIcon fontSize="small" />,
        tooltip: 'Contract has been sent for signatures',
        variant: 'outlined' as const,
      };
    }

    // Draft or other states
    return {
      label: showCount
        ? `${contractsCount} Contract${contractsCount === 1 ? '' : 's'}`
        : 'Contract',
      color: 'default' as const,
      icon: <ContractIcon fontSize="small" />,
      tooltip: `${contractsCount} contract${contractsCount === 1 ? '' : 's'} associated with this event`,
      variant: 'outlined' as const,
    };
  };

  const displayInfo = getContractDisplayInfo();

  return (
    <Tooltip title={displayInfo.tooltip} arrow>
      <Chip
        icon={displayInfo.icon}
        label={displayInfo.label}
        size={size}
        color={displayInfo.color}
        variant={displayInfo.variant}
        sx={{
          backgroundColor: displayInfo.variant === 'filled' ? undefined : alpha('#fff', 0.1),
          backdropFilter: 'blur(5px)',
          border:
            displayInfo.variant === 'outlined' ? `1px solid ${alpha('#fff', 0.2)}` : undefined,
          // Add pulsing animation for urgent items
          animation:
            status === 'EXPIRED' || (contractExpiryDays !== null && contractExpiryDays <= 1)
              ? 'pulse 2s infinite'
              : undefined,
          '@keyframes pulse': {
            '0%': {
              opacity: 1,
            },
            '50%': {
              opacity: 0.7,
            },
            '100%': {
              opacity: 1,
            },
          },
          // Highlight urgent signatures needed
          ...(pendingSignatureRequired && {
            '&::before': {
              content: '""',
              position: 'absolute',
              top: -2,
              left: -2,
              right: -2,
              bottom: -2,
              borderRadius: 'inherit',
              background: `linear-gradient(45deg, ${theme.palette.warning.main}30, ${theme.palette.error.main}30)`,
              zIndex: -1,
              animation: 'glow 2s ease-in-out infinite alternate',
            },
            '@keyframes glow': {
              from: { opacity: 0.5 },
              to: { opacity: 0.8 },
            },
          }),
        }}
      />
    </Tooltip>
  );
};

export default ContractStatusChip;
