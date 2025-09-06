// frontend/admin-crm/src/pages/contracts/ContractView.tsx

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip,
  Divider,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Send as SendIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useEventContract, useSendContract } from '../../hooks/useContracts';
import { contractsApi } from '../../apis/contracts.api';
import { formatCurrency } from '../../utils/currency';

export const ContractView: React.FC = () => {
  const { contractId } = useParams<{ contractId: string }>();
  const navigate = useNavigate();
  
  const { data: contract, isLoading, error } = useEventContract(contractId ? parseInt(contractId) : 0);
  const { mutate: sendContract } = useSendContract();

  const handleBack = () => {
    navigate(-1);
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
    } catch (error) {
      console.error('Error downloading contract PDF:', error);
    }
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
          <Typography color="text.primary">Contract #{contract.id}</Typography>
        </Breadcrumbs>
        
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h4" gutterBottom>
              Contract #{contract.id}
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
              variant="outlined"
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
          </Box>
        </Box>
      </Box>

      {/* Contract Details */}
      <Stack spacing={3}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Contract Information
          </Typography>
          <Stack spacing={2}>
            <Box display="flex" gap={4}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Event
                </Typography>
                <Typography variant="body1">
                  {contract.event_details?.name || 'Unknown Event'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Client
                </Typography>
                <Typography variant="body1">
                  {contract.event_details?.client_name || 'Unknown Client'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {format(new Date(contract.created_at), 'MMM dd, yyyy')}
                </Typography>
              </Box>
            </Box>
            
            <Divider />
            
            <Box display="flex" gap={4}>
              {contract.contract_value && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Contract Value
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(contract.contract_value, contract.currency || 'PHP')}
                  </Typography>
                </Box>
              )}
              {contract.valid_until && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Valid Until
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(contract.valid_until), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              )}
              {contract.fully_signed_at && (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Signed On
                  </Typography>
                  <Typography variant="body1">
                    {format(new Date(contract.fully_signed_at), 'MMM dd, yyyy')}
                  </Typography>
                </Box>
              )}
            </Box>
          </Stack>
        </Paper>

        {/* Contract Content */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Contract Content
          </Typography>
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 3,
              backgroundColor: 'background.paper',
              maxHeight: '600px',
              overflow: 'auto',
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
        </Paper>
      </Stack>
    </Box>
  );
};