// frontend/admin-crm/src/pages/contracts/ContractEdit.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  TextField,
  Stack,
  Alert,
  Button,
  Chip,
  CircularProgress,
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

export const ContractEdit: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { setBreadcrumbs } = useLayout();

  const [content, setContent] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const {
    data: contract,
    isLoading,
    error,
  } = useEventContract(contractId ? parseInt(contractId) : 0);
  const { mutate: updateContract, isPending: isUpdating } = useUpdateEventContract();

  // Set breadcrumbs via layout context
  useEffect(() => {
    if (contract) {
      const eventName = contract.event_details?.name || 'Event';

      setBreadcrumbs([
        { label: 'Events', path: '/events' },
        {
          label: eventName,
          path: contract.event_details?.id ? `/events/${contract.event_details.id}` : '/events',
        },
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
      },
    );
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
        <Alert severity="error">Failed to load contract. Please try again.</Alert>
      </Box>
    );
  }

  // Get status color
  const getStatusColor = (): 'secondary' | 'info' | 'success' | 'warning' => {
    switch (contract.status) {
      case 'DRAFT':
        return 'secondary';
      case 'SENT':
        return 'info';
      case 'SIGNED':
        return 'success';
      default:
        return 'warning';
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
            <EditIcon color="primary" sx={{ fontSize: 32 }} />
            <Box>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                  Edit Contract #{contract.id}
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
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={handleBackToContract}>
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={isUpdating ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Edit Form */}
      <Stack spacing={3}>
        {/* Contract Details */}
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
            <DetailsIcon color="primary" />
            <Typography variant="h6" fontWeight="600">
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
                sx={{ minWidth: 200, flex: 1 }}
              />
              <TextField
                label="Valid Until"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
                helperText="Leave empty for no expiration"
                sx={{ minWidth: 200, flex: 1 }}
              />
            </Box>
          </Stack>
        </Box>

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
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '14px',
                lineHeight: 1.5,
              },
            }}
          />
        </Box>
      </Stack>
    </Box>
  );
};
