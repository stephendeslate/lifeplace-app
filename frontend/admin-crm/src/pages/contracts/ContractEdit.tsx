// frontend/admin-crm/src/pages/contracts/ContractEdit.tsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Stack,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useEventContract, useUpdateEventContract } from '../../hooks/useContracts';
import { useToast } from '../../contexts/ToastContext';
import type { UpdateEventContractData } from '../../types/contracts.types';

export const ContractEdit: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [content, setContent] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [validUntil, setValidUntil] = useState('');

  const { data: contract, isLoading, error } = useEventContract(contractId ? parseInt(contractId) : 0);
  const { mutate: updateContract, isPending: isUpdating } = useUpdateEventContract();

  useEffect(() => {
    if (contract) {
      setContent(contract.content || '');
      setContractValue(contract.contract_value || '');
      setValidUntil(contract.valid_until ? contract.valid_until.split('T')[0] : '');
    }
  }, [contract]);

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
          navigate(-1); // Go back to previous page
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

  const handleBack = () => {
    navigate(-1);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !contract) {
    return (
      <Box>
        <Alert severity="error">
          Failed to load contract. Please try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link color="inherit" onClick={handleBack} sx={{ cursor: 'pointer' }}>
            Events
          </Link>
          <Link color="inherit" onClick={handleBack} sx={{ cursor: 'pointer' }}>
            {contract.event_details?.name || 'Event'}
          </Link>
          <Typography color="text.primary">Edit Contract #{contract.id}</Typography>
        </Breadcrumbs>
        
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" gutterBottom>
              Edit Contract #{contract.id}
            </Typography>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="body1" color="text.secondary">
                Template: {contract.template_name}
              </Typography>
              <Chip
                label={contract.status_display || contract.status}
                color={
                  contract.status === 'DRAFT' ? 'default' :
                  contract.status === 'SENT' ? 'info' :
                  contract.status === 'SIGNED' ? 'success' : 'warning'
                }
                size="small"
              />
            </Box>
          </Box>
          
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={handleBack}
            >
              Back
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Edit Form */}
      <Paper sx={{ p: 4 }}>
        <Stack spacing={4}>
          {/* Contract Details */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Contract Details
            </Typography>
            <Stack spacing={3}>
              <Box display="flex" gap={3}>
                <TextField
                  label="Contract Value"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  placeholder="e.g., 50000.00"
                  helperText="Optional contract value"
                  sx={{ minWidth: 200 }}
                />
                <TextField
                  label="Valid Until"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  helperText="Leave empty for no expiration"
                  sx={{ minWidth: 200 }}
                />
              </Box>
            </Stack>
          </Box>

          {/* Contract Content */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Contract Content
            </Typography>
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

          {/* Action Buttons */}
          <Box display="flex" justifyContent="flex-end" gap={2} pt={2}>
            <Button
              variant="outlined"
              onClick={handleBack}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
};