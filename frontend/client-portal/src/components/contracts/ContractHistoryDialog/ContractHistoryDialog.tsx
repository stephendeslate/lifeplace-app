import React from 'react';
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
  IconButton,
  alpha,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  History as HistoryIcon,
  Edit as AmendmentIcon,
  Draw as SignatureIcon,
  AttachMoney as ValueIcon,
  Download as DownloadIcon,
  Timeline as TimelineIcon,
  Description as DocumentIcon,
} from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import ContractActivityTimeline from '@/components/contracts/ContractActivityTimeline';
import type { Contract } from '@/types/contracts.types';
import { useContractHistoryDialogLogic } from './useContractHistoryDialogLogic';
import { SignaturesTabPanel } from './SignaturesTabPanel';
import { AmendmentsTabPanel } from './AmendmentsTabPanel';
import { DocumentsTabPanel } from './DocumentsTabPanel';
import { ValueChangesTabPanel } from './ValueChangesTabPanel';

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
  const {
    theme,
    isMobile,
    activeTab,
    handleTabChange,
    amendments,
    documents,
    isLoading,
    formatDate,
    formatCurrency,
    getStatusColor,
    valueChanges,
    contractStats,
  } = useContractHistoryDialogLogic(contract);

  if (!contract || !contractStats) return null;

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
                      <Typography variant="body2" color="text.secondary">
                        Status:
                      </Typography>
                      <Chip
                        label={contract.status.replace('_', ' ')}
                        size="small"
                        color={getStatusColor(contract.status)}
                        variant="filled"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Created:
                      </Typography>
                      <Typography variant="body2">{formatDate(contractStats.created)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Last Modified:
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(contractStats.lastModified)}
                      </Typography>
                    </Box>
                    {contract.fully_signed_at && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Fully Signed:
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(contract.fully_signed_at)}
                        </Typography>
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
                      <Typography variant="body2" color="text.secondary">
                        Value:
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatCurrency(contractStats.value, contractStats.currency)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Signatures:
                      </Typography>
                      <Typography variant="body2">
                        {contractStats.signatures} of{' '}
                        {contract.template.signature_requirements?.length || 1}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Amendments:
                      </Typography>
                      <Typography variant="body2">{contractStats.amendments}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Template:
                      </Typography>
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
            <Tab label="Timeline" icon={<TimelineIcon />} iconPosition="start" />
            <Tab label="Signatures" icon={<SignatureIcon />} iconPosition="start" />
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
          <TabPanel value={activeTab} index={0}>
            <ContractActivityTimeline contract={contract} />
          </TabPanel>

          <TabPanel value={activeTab} index={1}>
            <SignaturesTabPanel
              signatures={contract.signatures}
              theme={theme}
              formatDate={formatDate}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={2}>
            <AmendmentsTabPanel
              amendments={amendments}
              isLoading={isLoading}
              currency={contract.currency}
              theme={theme}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
              getStatusColor={getStatusColor}
            />
          </TabPanel>

          <TabPanel value={activeTab} index={3}>
            <DocumentsTabPanel documents={documents} isLoading={isLoading} theme={theme} />
          </TabPanel>

          <TabPanel value={activeTab} index={4}>
            <ValueChangesTabPanel
              valueChanges={valueChanges}
              currency={contract.currency}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
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
          <Button variant="contained" onClick={onClose} sx={{ textTransform: 'none' }}>
            Close
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
};

export default ContractHistoryDialog;
