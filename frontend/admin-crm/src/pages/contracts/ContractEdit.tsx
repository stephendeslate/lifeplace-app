// frontend/admin-crm/src/pages/contracts/ContractEdit.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Stack,
  Alert,
  Fade,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Settings as DetailsIcon,
  Article as ContentIcon,
} from '@mui/icons-material';
import { useEventContract, useUpdateEventContract } from '../../hooks/useContracts';
import { useToast } from '../../contexts/ToastContext';
import { useLayout } from '../../contexts/LayoutContext';
import type { UpdateEventContractData } from '../../types/contracts.types';

// Modern Design System imports
import { ModernPageLayout } from '../../components/common/ModernPageLayout';
import { ModernCard } from '../../components/common/ModernCard';
import { ModernPageHeader, type HeaderAction } from '../../components/common/ModernPageHeader';
import ModernLoadingStates from '../../components/common/ModernLoadingStates';
import { tokens } from '../../design-system';
import { glassPresets } from '../../design-system/utils/glassmorphism';

export const ContractEdit: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setBreadcrumbs } = useLayout();

  const [content, setContent] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const { data: contract, isLoading, error } = useEventContract(contractId ? parseInt(contractId) : 0);
  const { mutate: updateContract, isPending: isUpdating } = useUpdateEventContract();

  // Set breadcrumbs via layout context
  useEffect(() => {
    if (contract) {
      const eventName = contract.event_details?.name || 'Event';

      setBreadcrumbs([
        { label: 'Events', path: '/events' },
        { label: eventName, path: contract.event_details?.id ? `/events/${contract.event_details.id}` : '/events' },
        { label: `Contract #${contract.id}`, path: `/contracts/${contract.id}` },
        { label: 'Edit' },
      ]);
    }
  }, [contract, setBreadcrumbs]);

  useEffect(() => {
    if (contract) {
      setContent(contract.content || '');
      setContractValue(contract.contract_value || '');
      setValidUntil(contract.valid_until ? contract.valid_until.split('T')[0] : '');
    }
  }, [contract]);

  // Navigation handlers - use deterministic routes
  const handleBackToContract = () => {
    if (contractId) {
      navigate(`/contracts/${contractId}`);
    } else {
      navigate('/events');
    }
  };

  const handleSave = () => {
    if (!contractId || !contract) return;

    const updateData: UpdateEventContractData = {
      content,
      contract_value: contractValue || undefined,
      valid_until: validUntil || undefined,
    };

    updateContract(
      { id: parseInt(contractId), data: updateData },
      {
        onSuccess: () => {
          showToast({
            type: 'success',
            title: 'Contract Updated',
            message: 'The contract has been updated successfully.',
          });
          navigate(`/contracts/${contractId}`);
        },
        onError: () => {
          showToast({
            type: 'error',
            title: 'Update Failed',
            message: 'Failed to update the contract. Please try again.',
          });
        },
      }
    );
  };

  // Glass text field styling
  const glassTextFieldSx = {
    '& .MuiOutlinedInput-root': {
      ...glassPresets.light,
      borderRadius: tokens.spacing.radius.lg,
      border: `1px solid ${tokens.color.borders.glass}`,
      '&:hover': {
        border: `1px solid ${tokens.color.primary[300]}`,
      },
      '&.Mui-focused': {
        border: `1px solid ${tokens.color.primary[500]}`,
        boxShadow: `0 0 0 3px ${tokens.color.primary[500]}15`,
      },
    },
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

  // Get status color
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
      label: 'Cancel',
      onClick: handleBackToContract,
      variant: 'outlined',
      tooltip: 'Return to contract without saving',
    },
  ];

  const primaryAction: HeaderAction = {
    icon: <SaveIcon />,
    label: isUpdating ? 'Saving...' : 'Save Changes',
    onClick: handleSave,
    variant: 'contained',
    color: 'primary',
    disabled: isUpdating,
  };

  return (
    <ModernPageLayout backgroundPattern="default">
      {/* Modern Header */}
      <ModernPageHeader
        title={`Edit Contract #${contract.id}`}
        subtitle={`Template: ${contract.template_name}`}
        icon={<EditIcon />}
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

      {/* Edit Form */}
      <Stack spacing={3}>
        {/* Contract Details */}
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
                  <DetailsIcon sx={{ color: tokens.color.primary[600], fontSize: '1.25rem' }} />
                </Box>
                <Typography variant="h6" fontWeight="600" sx={{ color: tokens.color.neutral[800] }}>
                  Contract Details
                </Typography>
              </Box>

              <Stack spacing={3}>
                <Box display="flex" gap={3} flexWrap="wrap">
                  <TextField
                    label="Contract Value"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    placeholder="e.g., 50000.00"
                    helperText="Optional contract value"
                    sx={{ minWidth: 200, flex: 1, ...glassTextFieldSx }}
                  />
                  <TextField
                    label="Valid Until"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    helperText="Leave empty for no expiration"
                    sx={{ minWidth: 200, flex: 1, ...glassTextFieldSx }}
                  />
                </Box>
              </Stack>
            </ModernCard>
          </div>
        </Fade>

        {/* Contract Content */}
        <Fade in timeout={400}>
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

              <TextField
                fullWidth
                multiline
                minRows={20}
                maxRows={30}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Enter contract content..."
                helperText="Edit the contract content. You can use HTML formatting."
                sx={{
                  ...glassTextFieldSx,
                  '& .MuiInputBase-input': {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    lineHeight: 1.5,
                  },
                }}
              />
            </ModernCard>
          </div>
        </Fade>
      </Stack>
    </ModernPageLayout>
  );
};
