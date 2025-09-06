// frontend/client-portal/src/pages/contracts/ContractsPage.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Stack,
  Chip,
  Avatar,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Description as ContractIcon,
  Edit as SignIcon,
  CheckCircle as SignedIcon,
  Schedule as PendingIcon,
  Warning as ExpiredIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

import type { Contract } from '../../types/contracts.types';
import { contractsApi, contractUtils } from '../../apis/contracts.api';
import { useGlobalSignatureEvents } from '../../hooks/contracts/useContractStatusUpdates';
import ContractViewer from '../../components/contracts/ContractViewer';
import ContractSigningDialog from '../../components/contracts/ContractSigningDialog';
import MobileContractCard from '../../components/contracts/MobileContractCard';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
  </div>
);

export const ContractsPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [activeTab, setActiveTab] = useState(0);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [signingDialogOpen, setSigningDialogOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);

  // Initialize global signature event listener
  const { simulateSignatureEvent } = useGlobalSignatureEvents();

  // Fetch all contracts
  const {
    data: contracts = [],
    isLoading: contractsLoading,
    error: contractsError,
    refetch: refetchContracts,
  } = useQuery({
    queryKey: ['contracts'],
    queryFn: contractsApi.getContracts,
  });

  // Fetch pending signatures
  const {
    data: pendingSignatures,
  } = useQuery({
    queryKey: ['contracts', 'pending'],
    queryFn: contractsApi.getPendingSignatures,
  });

  // Filter contracts by status
  const allContracts = contracts || [];
  const pendingContracts = allContracts.filter(contract => 
    ['SENT', 'PARTIALLY_SIGNED'].includes(contract.status)
  );
  const signedContracts = allContracts.filter(contract => 
    contract.status === 'SIGNED'
  );

  const handleSignContract = (contract: Contract) => {
    setSelectedContract(contract);
    setSigningDialogOpen(true);
  };

  const handleViewContract = (contract: Contract) => {
    setViewingContract(contract);
  };

  const handleSignComplete = (signedContract: Contract) => {
    // Contract signing completed successfully
    refetchContracts();
    setSigningDialogOpen(false);
    setSelectedContract(null);
    
    // Simulate real-time event for demonstration
    simulateSignatureEvent(signedContract.id, 'signature_added');
  };

  const handleSignError = (error: string) => {
    console.error('Contract signing error:', error);
    // You could show a toast notification here
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const ContractCard: React.FC<{ contract: Contract; showActions?: boolean }> = ({ 
    contract, 
    showActions = true 
  }) => {
    const statusColor = contractUtils.getStatusColor(contract.status);
    const statusDisplay = contractUtils.getStatusDisplay(contract.status);
    const isExpired = contractUtils.isContractExpired(contract);
    const canSign = contract.can_client_sign || false;

    return (
      <Card 
        sx={{ 
          mb: 2,
          border: `1px solid ${theme.palette.divider}`,
          '&:hover': {
            borderColor: theme.palette.primary.main,
            boxShadow: theme.shadows[2],
          },
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2 }}>
            <Avatar
              sx={{
                backgroundColor: theme.palette.primary.main,
                color: 'white',
              }}
            >
              <ContractIcon />
            </Avatar>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                {contract.event.title}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Template: {contract.template.name}
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

              <Typography variant="caption" color="text.secondary">
                Created: {formatDate(contract.created_at)}
                {contract.fully_signed_at && (
                  <> • Signed: {formatDate(contract.fully_signed_at)}</>
                )}
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

          {/* Signature Progress */}
          {contract.signature_progress && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Signature Progress
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {contract.signature_progress.signed_count} of {contract.signature_progress.total_required}
                </Typography>
              </Box>
              
              <Box
                sx={{
                  width: '100%',
                  height: 6,
                  backgroundColor: theme.palette.grey[200],
                  borderRadius: 3,
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

          {/* Actions */}
          {showActions && (
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleViewContract(contract)}
              >
                View Details
              </Button>
              
              {canSign && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SignIcon />}
                  onClick={() => handleSignContract(contract)}
                  color="primary"
                >
                  Sign Contract
                </Button>
              )}
              
              {contract.status === 'SIGNED' && (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={() => contractsApi.downloadContractPdf(contract.id)}
                  disabled // Placeholder - implement when backend supports PDF generation
                >
                  Download
                </Button>
              )}
            </Stack>
          )}
        </CardContent>
      </Card>
    );
  };

  if (contractsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (contractsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load contracts. Please try again later.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main', mb: 1 }}>
          Contracts
        </Typography>
        <Typography variant="h6" color="text.secondary">
          View and sign your event contracts
        </Typography>
      </Box>

      {/* Pending Signatures Alert */}
      {pendingSignatures && pendingSignatures.count > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mb: 3 }}
          action={
            <Button 
              color="inherit" 
              size="small"
              onClick={() => setActiveTab(1)}
            >
              View Pending
            </Button>
          }
        >
          You have {pendingSignatures.count} contract{pendingSignatures.count === 1 ? '' : 's'} 
          waiting for your signature.
        </Alert>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab 
            label={`All Contracts (${allContracts.length})`}
            icon={<ContractIcon />}
            iconPosition="start"
          />
          <Tab 
            label={`Pending Signatures (${pendingContracts.length})`}
            icon={<PendingIcon />}
            iconPosition="start"
          />
          <Tab 
            label={`Signed (${signedContracts.length})`}
            icon={<SignedIcon />}
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        {allContracts.length === 0 ? (
          <Alert severity="info">
            No contracts found. Contracts will appear here once they are sent to you for signature.
          </Alert>
        ) : (
          <Box>
            {allContracts.map((contract) => (
              isMobile ? (
                <MobileContractCard
                  key={contract.id}
                  contract={contract}
                  onSign={() => handleSignContract(contract)}
                  onView={() => handleViewContract(contract)}
                  onDownload={() => contractsApi.downloadContractPdf(contract.id)}
                />
              ) : (
                <ContractCard key={contract.id} contract={contract} />
              )
            ))}
          </Box>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {pendingContracts.length === 0 ? (
          <Alert severity="success" icon={<SignedIcon />}>
            Great! No contracts are waiting for your signature.
          </Alert>
        ) : (
          <Box>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              The following contracts require your signature:
            </Typography>
            {pendingContracts.map((contract) => (
              isMobile ? (
                <MobileContractCard
                  key={contract.id}
                  contract={contract}
                  onSign={() => handleSignContract(contract)}
                  onView={() => handleViewContract(contract)}
                  onDownload={() => contractsApi.downloadContractPdf(contract.id)}
                />
              ) : (
                <ContractCard key={contract.id} contract={contract} />
              )
            ))}
          </Box>
        )}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {signedContracts.length === 0 ? (
          <Alert severity="info">
            No signed contracts yet. Completed contracts will appear here.
          </Alert>
        ) : (
          <Box>
            {signedContracts.map((contract) => (
              isMobile ? (
                <MobileContractCard
                  key={contract.id}
                  contract={contract}
                  onSign={() => handleSignContract(contract)}
                  onView={() => handleViewContract(contract)}
                  onDownload={() => contractsApi.downloadContractPdf(contract.id)}
                />
              ) : (
                <ContractCard key={contract.id} contract={contract} />
              )
            ))}
          </Box>
        )}
      </TabPanel>

      {/* Contract Signing Dialog */}
      <ContractSigningDialog
        open={signingDialogOpen}
        onClose={() => {
          setSigningDialogOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        onSignComplete={handleSignComplete}
        onError={handleSignError}
      />

      {/* Contract Viewer Dialog */}
      {viewingContract && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: theme.zIndex.modal,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            p: 2,
          }}
          onClick={() => setViewingContract(null)}
        >
          <Box
            sx={{
              backgroundColor: 'background.paper',
              borderRadius: 2,
              maxWidth: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
              p: 3,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                Contract Details
              </Typography>
              <Button onClick={() => setViewingContract(null)}>
                Close
              </Button>
            </Box>
            <ContractViewer contract={viewingContract} />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default ContractsPage;