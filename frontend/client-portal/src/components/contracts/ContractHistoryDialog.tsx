// frontend/client-portal/src/components/contracts/ContractHistoryDialog.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Tabs,
  Tab,
  Stack,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  useTheme,
  useMediaQuery,
  alpha,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  History as HistoryIcon,
  Edit as AmendmentIcon,
  Draw as SignatureIcon,
  AttachMoney as ValueIcon,
  Download as DownloadIcon,
  Timeline as TimelineIcon,
  TrendingUp as TrendingIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../design-system/components/GlassCard';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import ContractActivityTimeline from './ContractActivityTimeline';
import { useContractHistoryData } from '../../hooks/useContractHistory';
import type { Contract } from '../../types/contracts.types';

interface ContractHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  contract: Contract | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
  <div role="tabpanel" hidden={value !== index}>
    {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
  </div>
);

export const ContractHistoryDialog: React.FC<ContractHistoryDialogProps> = ({
  open,
  onClose,
  contract,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);

  // Fetch amendments and documents from API
  const { amendments, documents, isLoading } = useContractHistoryData(contract?.id);

  if (!contract) return null;

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: string | null, currency: string = 'PHP') => {
    if (!value) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(parseFloat(value));
  };

  const getStatusColor = (status: string): 'primary' | 'success' | 'warning' | 'error' | 'info' => {
    switch (status) {
      case 'SIGNED':
      case 'DELIVERED':
      case 'APPROVED':
        return 'success';
      case 'SENT':
      case 'PARTIALLY_SIGNED':
        return 'info';
      case 'DRAFT':
      case 'PENDING':
      case 'REQUESTED':
        return 'warning';
      case 'VOIDED':
      case 'EXPIRED':
      case 'REJECTED':
      case 'CANCELLED':
        return 'error';
      default:
        return 'primary';
    }
  };

  // Value changes data
  const valueChanges = contract.contract_value ? [
    {
      id: '1',
      date: contract.updated_at,
      old_value: null,
      new_value: contract.contract_value,
      reason: 'Initial contract value set',
      changed_by: undefined,
    },
  ] : [];

  // Contract statistics
  const contractStats = {
    created: contract.created_at,
    lastModified: contract.updated_at,
    signatures: contract.signatures?.length || 0,
    amendments: amendments.length,
    documents: documents.length,
    status: contract.status,
    value: contract.contract_value,
    currency: contract.currency,
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          backgroundColor: alpha('#fff', 0.95),
          backdropFilter: 'blur(20px)',
          border: `1px solid ${alpha('#fff', 0.2)}`,
          boxShadow: '0 24px 64px rgba(0,0,0,0.15)',
          borderRadius: isMobile ? 0 : 3,
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              backgroundColor: theme.palette.primary.main,
              color: 'white',
              width: 40,
              height: 40,
            }}
          >
            <HistoryIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Contract History
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {contract.event.title} - {contract.template.name}
            </Typography>
          </Box>
        </Box>
        
        <IconButton
          onClick={onClose}
          sx={{
            backgroundColor: alpha(theme.palette.grey[500], 0.1),
            '&:hover': {
              backgroundColor: alpha(theme.palette.grey[500], 0.2),
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Contract Overview */}
        <Box sx={{ p: 3, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
          <AnimatedElement animation="slideUp" delay={100}>
            <GlassCard
              variant="light"
              intensity="medium"
              sx={{
                p: 3,
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                spacing={3}
                divider={
                  <Divider 
                    orientation={isMobile ? 'horizontal' : 'vertical'} 
                    flexItem 
                    sx={{ opacity: 0.3 }}
                  />
                }
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Contract Overview
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Status:</Typography>
                      <Chip
                        label={contract.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(contract.status)}
                        variant="filled"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Created:</Typography>
                      <Typography variant="body2">{formatDate(contractStats.created)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Last Modified:</Typography>
                      <Typography variant="body2">{formatDate(contractStats.lastModified)}</Typography>
                    </Box>
                    {contract.fully_signed_at && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Fully Signed:</Typography>
                        <Typography variant="body2">{formatDate(contract.fully_signed_at)}</Typography>
                      </Box>
                    )}
                  </Stack>
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Contract Details
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Value:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(contractStats.value, contractStats.currency)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Signatures:</Typography>
                      <Typography variant="body2">
                        {contractStats.signatures} of {contract.template.signature_requirements?.length || 1}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Amendments:</Typography>
                      <Typography variant="body2">{contractStats.amendments}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">Template:</Typography>
                      <Typography variant="body2">{contract.template.name}</Typography>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </GlassCard>
          </AnimatedElement>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant={isMobile ? 'scrollable' : 'standard'}
            scrollButtons="auto"
            sx={{
              px: 3,
              '& .MuiTab-root': {
                minHeight: 60,
                fontWeight: 500,
              },
            }}
          >
            <Tab
              label="Timeline"
              icon={<TimelineIcon />}
              iconPosition="start"
            />
            <Tab
              label="Signatures"
              icon={<SignatureIcon />}
              iconPosition="start"
            />
            <Tab
              label={`Amendments${amendments.length > 0 ? ` (${amendments.length})` : ''}`}
              icon={<AmendmentIcon />}
              iconPosition="start"
            />
            <Tab
              label={`Documents${documents.length > 0 ? ` (${documents.length})` : ''}`}
              icon={<DocumentIcon />}
              iconPosition="start"
            />
            <Tab
              label="Value Changes"
              icon={<ValueIcon />}
              iconPosition="start"
              disabled={valueChanges.length === 0}
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 3, maxHeight: 600, overflow: 'auto' }}>
          {/* Timeline Tab */}
          <TabPanel value={activeTab} index={0}>
            <ContractActivityTimeline contract={contract} />
          </TabPanel>

          {/* Signatures Tab */}
          <TabPanel value={activeTab} index={1}>
            <AnimatedElement animation="fadeIn">
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                  Contract Signatures
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Detailed signature information and verification status
                </Typography>

                {contract.signatures && contract.signatures.length > 0 ? (
                  <Stack spacing={2}>
                    {contract.signatures.map((signature, index) => (
                      <GlassCard
                        key={signature.id}
                        variant="light"
                        intensity="medium"
                        sx={{
                          p: 3,
                          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                          backgroundColor: alpha(theme.palette.success.main, 0.05),
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Avatar
                            sx={{
                              backgroundColor: theme.palette.success.main,
                              color: 'white',
                              width: 40,
                              height: 40,
                            }}
                          >
                            {signature.signer_name?.[0] || signature.role[0]}
                          </Avatar>

                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                              {signature.signer_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {signature.signer_email}
                            </Typography>

                            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                              <Chip
                                label={signature.role_display}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                              {signature.is_verified && (
                                <Chip
                                  label="Verified"
                                  size="small"
                                  color="success"
                                  variant="filled"
                                />
                              )}
                            </Stack>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Signed At:
                                </Typography>
                                <Typography variant="body2">
                                  {formatDate(signature.signed_at)}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Method:
                                </Typography>
                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                  {signature.verification_method?.replace('_', ' ') || 'Electronic'}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>

                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">
                              Signature #{index + 1}
                            </Typography>
                          </Box>
                        </Box>
                      </GlassCard>
                    ))}
                  </Stack>
                ) : (
                  <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
                    <SignatureIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" gutterBottom>
                      No Signatures Yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      This contract hasn't been signed by anyone yet.
                    </Typography>
                  </GlassCard>
                )}
              </Box>
            </AnimatedElement>
          </TabPanel>

          {/* Amendments Tab */}
          <TabPanel value={activeTab} index={2}>
            <AnimatedElement animation="fadeIn">
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : amendments.length > 0 ? (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Contract Amendments
                  </Typography>
                  <Stack spacing={2}>
                    {amendments.map((amendment) => (
                      <GlassCard
                        key={amendment.id}
                        variant="light"
                        intensity="medium"
                        sx={{
                          p: 3,
                          border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                          backgroundColor: alpha(theme.palette.info.main, 0.05),
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {amendment.amendment_reason}
                          </Typography>
                          <Chip
                            label={amendment.status.replace('_', ' ')}
                            size="small"
                            color={getStatusColor(amendment.status)}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {amendment.changes_description}
                        </Typography>
                        <Stack direction="row" spacing={3} flexWrap="wrap">
                          <Box>
                            <Typography variant="caption" color="text.secondary">Requested:</Typography>
                            <Typography variant="body2">{formatDate(amendment.requested_at)}</Typography>
                          </Box>
                          {amendment.requested_by && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">Requested By:</Typography>
                              <Typography variant="body2">
                                {amendment.requested_by.first_name} {amendment.requested_by.last_name}
                              </Typography>
                            </Box>
                          )}
                          {amendment.reviewed_at && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">Reviewed:</Typography>
                              <Typography variant="body2">{formatDate(amendment.reviewed_at)}</Typography>
                            </Box>
                          )}
                          {amendment.value_change && (
                            <Box>
                              <Typography variant="caption" color="text.secondary">Value Change:</Typography>
                              <Typography
                                variant="body2"
                                sx={{
                                  color: parseFloat(amendment.value_change) >= 0
                                    ? theme.palette.success.main
                                    : theme.palette.error.main,
                                  fontWeight: 600,
                                }}
                              >
                                {parseFloat(amendment.value_change) >= 0 ? '+' : ''}
                                {formatCurrency(amendment.value_change, contract.currency)}
                              </Typography>
                            </Box>
                          )}
                        </Stack>
                        {amendment.review_notes && (
                          <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.grey[500], 0.1), borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">Review Notes:</Typography>
                            <Typography variant="body2">{amendment.review_notes}</Typography>
                          </Box>
                        )}
                      </GlassCard>
                    ))}
                  </Stack>
                </Box>
              ) : (
                <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
                  <AmendmentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Amendments
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    This contract has not been amended.
                  </Typography>
                </GlassCard>
              )}
            </AnimatedElement>
          </TabPanel>

          {/* Documents Tab */}
          <TabPanel value={activeTab} index={3}>
            <AnimatedElement animation="fadeIn">
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : documents.length > 0 ? (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Contract Documents
                  </Typography>
                  <Stack spacing={2}>
                    {documents.map((doc) => (
                      <GlassCard
                        key={doc.id}
                        variant="light"
                        intensity="medium"
                        sx={{ p: 2 }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                              <DocumentIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                {doc.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {doc.document_type_display} - v{doc.version}
                              </Typography>
                              {doc.description && (
                                <Typography variant="body2" color="text.secondary">
                                  {doc.description}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<DownloadIcon />}
                            href={doc.file}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Download
                          </Button>
                        </Stack>
                      </GlassCard>
                    ))}
                  </Stack>
                </Box>
              ) : (
                <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
                  <DocumentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Documents
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No additional documents attached to this contract.
                  </Typography>
                </GlassCard>
              )}
            </AnimatedElement>
          </TabPanel>

          {/* Value Changes Tab */}
          <TabPanel value={activeTab} index={4}>
            <AnimatedElement animation="fadeIn">
              {valueChanges.length > 0 ? (
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    Contract Value History
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Previous Value</TableCell>
                          <TableCell>New Value</TableCell>
                          <TableCell>Change</TableCell>
                          <TableCell>Reason</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {valueChanges.map((change, index) => (
                          <TableRow key={index}>
                            <TableCell>{formatDate(change.date)}</TableCell>
                            <TableCell>
                              {change.old_value ? formatCurrency(change.old_value, contract.currency) : '-'}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(change.new_value, contract.currency)}
                            </TableCell>
                            <TableCell>
                              <Chip
                                label="Initial"
                                size="small"
                                color="info"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>{change.reason}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              ) : (
                <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
                  <TrendingIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No Value Changes
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    The contract value has not been changed.
                  </Typography>
                </GlassCard>
              )}
            </AnimatedElement>
          </TabPanel>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          p: 3,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          justifyContent: 'space-between',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Contract ID: {contract.id}
        </Typography>
        
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {
              // Handle export functionality
              if (import.meta.env.DEV) console.log('Export contract history');
            }}
            sx={{ textTransform: 'none' }}
          >
            Export History
          </Button>
          <Button
            variant="contained"
            onClick={onClose}
            sx={{ textTransform: 'none' }}
          >
            Close
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default ContractHistoryDialog;