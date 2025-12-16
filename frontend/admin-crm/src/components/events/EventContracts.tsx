// frontend/admin-crm/src/components/events/EventContracts.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Send as SendIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Description as ContractIcon,
  Draw as SignIcon,
  Cancel as VoidIcon,
  Download as DownloadIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useContractsForEvent, useContractTemplates, useCreateEventContract, useSendContract } from '../../hooks/useContracts';
import { contractsApi } from '../../apis/contracts.api';
import type { Event } from '../../types/events.types';
import type { EventContract } from '../../types/contracts.types';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';
import AdminContractSigningDialog from '../contracts/AdminContractSigningDialog';

interface EventContractsProps {
  event: Event;
}


const getStatusColor = (status: string, isExpiringSoon?: boolean) => {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'SENT':
      return isExpiringSoon ? 'warning' : 'info';
    case 'PARTIALLY_SIGNED':
      return 'warning';
    case 'SIGNED':
      return 'success';
    case 'EXPIRED':
      return 'error';
    case 'VOID':
      return 'error';
    case 'AMENDED':
      return 'info';
    default:
      return 'default';
  }
};

// Helper to get expiry warning text
const getExpiryWarning = (contract: EventContract): { text: string; severity: 'warning' | 'error' } | null => {
  if (contract.status === 'SIGNED') return null;
  if (contract.is_expired || contract.status === 'EXPIRED') {
    return { text: 'Expired', severity: 'error' };
  }
  if (contract.is_expiring_soon && contract.days_until_expiry !== null) {
    if (contract.days_until_expiry <= 1) {
      return { text: `Expires today`, severity: 'error' };
    }
    return { text: `Expires in ${contract.days_until_expiry} day(s)`, severity: 'warning' };
  }
  return null;
};

export const EventContracts: React.FC<EventContractsProps> = ({ event }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedContract, setSelectedContract] = useState<EventContract | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [signingDialogOpen, setSigningDialogOpen] = useState(false);
  const [templateId, setTemplateId] = useState<string>('');
  const [validUntil, setValidUntil] = useState<string>('');
  const { settings: currencySettings } = useCurrencySettings();

  const { data: contracts = [], isLoading } = useContractsForEvent(event.id);
  const { data: templates = [], isLoading: isLoadingTemplates, error: templatesError } = useContractTemplates();
  const { mutate: createContract, isPending: isCreating } = useCreateEventContract();
  const { mutate: sendContract } = useSendContract();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, contract: EventContract) => {
    setAnchorEl(event.currentTarget);
    setSelectedContract(contract);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedContract(null);
  };

  const handleSignContract = (contract: EventContract) => {
    setSelectedContract(contract);
    setSigningDialogOpen(true);
    // Only close the menu (anchorEl), keep selectedContract for the dialog
    setAnchorEl(null);
  };

  const handleSignComplete = () => {
    setSigningDialogOpen(false);
    setSelectedContract(null);
    // Contract list will automatically refresh via React Query
  };

  const handleSignError = (error: string) => {
    console.error('Contract signing error:', error);
    // Toast notification already handled by the hook
  };

  const handleCreateContract = () => {
    setCreateDialogOpen(true);
    // Set default valid until to 30 days from now
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setValidUntil(defaultDate.toISOString().split('T')[0]);
  };

  const handleSubmitCreate = async () => {
    if (templateId) {
      try {
        // Use the backend's standardized context generation by passing the event ID
        const renderedTemplate = await contractsApi.previewTemplate(parseInt(templateId), {}, event.id);
        
        // Get the selected template to access its signature requirements
        const selectedTemplate = templates.find(t => t.id === parseInt(templateId));
        
        const contractData = {
          event: event.id,
          template: parseInt(templateId),
          content: renderedTemplate.rendered_content,
          // No need to pass context_data - backend generates it from event
          // Ensure signature requirements are set if the template requires signatures
          ...(selectedTemplate?.requires_signature && {
            requires_signature: true,
            signature_requirements: selectedTemplate.signature_requirements || ['CLIENT']
          }),
          ...(validUntil && { valid_until: validUntil }),
        };
        
        createContract(
          contractData,
          {
            onSuccess: () => {
              setCreateDialogOpen(false);
              setTemplateId('');
              setValidUntil('');
            },
            onError: (error) => {
              console.error('Error creating contract:', error);
            },
          }
        );
      } catch (error) {
        console.error('Error rendering template:', error);
      }
    }
  };

  const handleViewContract = (contract: EventContract) => {
    navigate(`/contracts/${contract.id}`);
  };

  const handleEditContract = (contract: EventContract) => {
    navigate(`/contracts/${contract.id}/edit`);
  };

  const handleSendContract = (contract: EventContract) => {
    sendContract(contract.id);
    handleMenuClose();
  };

  const handleVoidContract = (contract: EventContract) => {
    // Implementation for voiding contract
    console.log('Void contract:', contract.id);
    handleMenuClose();
  };

  const handleDownloadContract = async (contract: EventContract) => {
    try {
      const blob = await contractsApi.downloadContractPdf(contract.id);
      
      // Create download link
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
      // You could show a toast notification here
    }
    handleMenuClose();
  };

  const formatContractAmount = (amount: string | number, contractCurrency?: string) => {
    const currency = contractCurrency || currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(amount, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  // Render the Create Contract Dialog component
  const renderCreateDialog = () => (
    <Dialog 
      open={createDialogOpen} 
      onClose={() => setCreateDialogOpen(false)} 
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>Create New Contract</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {isLoadingTemplates ? (
            <Box display="flex" justifyContent="center" p={2}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ ml: 2 }}>Loading templates...</Typography>
            </Box>
          ) : templatesError ? (
            <Alert severity="error">
              Error loading contract templates. Please try again.
            </Alert>
          ) : templates.length === 0 ? (
            <Alert severity="warning">
              No contract templates are available for this event type. 
              Please create contract templates in Settings → Templates → Contract Templates first.
            </Alert>
          ) : (
            <>
              <FormControl fullWidth>
                <InputLabel>Contract Template</InputLabel>
                <Select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  label="Contract Template"
                >
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name}
                      {template.description && (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {template.description}
                        </Typography>
                      )}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                label="Valid Until (Optional)"
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                InputLabelProps={{ shrink: true }}
                helperText="Leave empty for no expiration"
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
        <Button
          onClick={handleSubmitCreate}
          variant="contained"
          disabled={!templateId || isCreating || templates.length === 0}
        >
          {isCreating ? 'Creating...' : 'Create Contract'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (contracts.length === 0) {
    return (
      <>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ContractIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Contracts Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create a contract from a template to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateContract}
          >
            Create Contract
          </Button>
        </Paper>
        {renderCreateDialog()}
      </>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Event Contracts</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateContract}
        >
          Create Contract
        </Button>
      </Box>

      {/* Contracts Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Contract #</TableCell>
              <TableCell>Template</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Valid Until</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Signed</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    #{contract.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  {contract.template_name}
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Chip
                      label={contract.status_display || contract.status}
                      color={getStatusColor(contract.status, contract.is_expiring_soon) as 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'}
                      size="small"
                    />
                    {getExpiryWarning(contract) && (
                      <Tooltip title={contract.sign_disabled_reason || getExpiryWarning(contract)?.text || ''}>
                        <Chip
                          icon={<AccessTimeIcon sx={{ fontSize: 14 }} />}
                          label={getExpiryWarning(contract)?.text}
                          color={getExpiryWarning(contract)?.severity}
                          size="small"
                          variant="outlined"
                        />
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
                <TableCell>
                  {contract.contract_value
                    ? formatContractAmount(contract.contract_value, contract.currency)
                    : '-'}
                </TableCell>
                <TableCell>
                  {contract.valid_until
                    ? format(new Date(contract.valid_until), 'MMM dd, yyyy')
                    : '-'}
                </TableCell>
                <TableCell>
                  {format(new Date(contract.created_at), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  {contract.fully_signed_at ? (
                    format(new Date(contract.fully_signed_at), 'MMM dd, yyyy')
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Not signed
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="View">
                      <IconButton
                        size="small"
                        onClick={() => handleViewContract(contract)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, contract)}
                    >
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedContract?.status === 'DRAFT' && (
          <MenuItem onClick={() => selectedContract && handleEditContract(selectedContract)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {selectedContract?.status === 'DRAFT' && (
          <MenuItem onClick={() => selectedContract && handleSendContract(selectedContract)}>
            <ListItemIcon>
              <SendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Send to Client</ListItemText>
          </MenuItem>
        )}
        {selectedContract && ['SENT', 'PARTIALLY_SIGNED'].includes(selectedContract.status) && (
          <MenuItem onClick={() => handleSignContract(selectedContract)}>
            <ListItemIcon>
              <SignIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Sign Contract</ListItemText>
          </MenuItem>
        )}
        {selectedContract && ['DRAFT', 'SENT', 'PARTIALLY_SIGNED'].includes(selectedContract.status) && (
          <MenuItem onClick={() => selectedContract && handleVoidContract(selectedContract)}>
            <ListItemIcon>
              <VoidIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Void Contract</ListItemText>
          </MenuItem>
        )}
        {selectedContract && (
          <MenuItem onClick={() => selectedContract && handleDownloadContract(selectedContract)}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download PDF</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Create Contract Dialog */}
      {renderCreateDialog()}

      {/* Summary Card */}
      {contracts.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Contract Summary
            </Typography>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Contracts
                </Typography>
                <Typography variant="h6">{contracts.length}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Signed
                </Typography>
                <Typography variant="h6">
                  {contracts.filter((c) => c.status === 'SIGNED').length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Pending Signature
                </Typography>
                <Typography variant="h6">
                  {contracts.filter((c) => ['SENT', 'PARTIALLY_SIGNED'].includes(c.status)).length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Value
                </Typography>
                <Typography variant="h6">
                  {formatContractAmount(
                    contracts
                      .filter((c) => c.contract_value)
                      .reduce((sum, c) => sum + parseFloat(c.contract_value || '0'), 0),
                    contracts.find(c => c.contract_value)?.currency
                  )}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Admin Contract Signing Dialog */}
      <AdminContractSigningDialog
        open={signingDialogOpen}
        onClose={() => {
          setSigningDialogOpen(false);
          setSelectedContract(null);
        }}
        contract={selectedContract}
        onSignComplete={handleSignComplete}
        onError={handleSignError}
      />
    </Box>
  );
};