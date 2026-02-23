// frontend/client-portal/src/pages/actions/ActionCenterPage.tsx

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  InputAdornment,
  Badge,
  useTheme,
  useMediaQuery,
  alpha,
  Tooltip,
  Collapse,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  Assignment as TaskIcon,
  RequestQuote as QuoteIcon,
  Description as ContractIcon,
  Payment as PaymentIcon,
  Close as ClearIcon,
} from '@mui/icons-material';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { AnimatedElement } from '../../design-system/components/AnimatedElement';
import { useNavigate } from 'react-router-dom';
import { useActionCenter } from '../../hooks/useActionCenter';
import { ActionCardList } from '../../components/actions';
import { useContracts } from '../../contexts/ContractsContext';
import ContractSigningDialog from '../../components/contracts/ContractSigningDialog';
import ContractViewer from '../../components/contracts/ContractViewer';
import { contractsApi } from '../../apis/contracts.api';
import { InvoicePaymentDialog } from '../../components/payments/InvoicePaymentDialog';
import type { Contract } from '../../types/contracts.types';
import type { Invoice } from '../../types/financial.types';
import type {
  ActionType,
  ActionCenterFilters,
  ActionCenterSortOption,
  ContractActionItem,
  PaymentActionItem,
} from '../../types/action-center.types';
import { ACTION_TYPE_CONFIGS } from '../../types/action-center.types';

// Sort options
const SORT_OPTIONS: { value: ActionCenterSortOption; label: string }[] = [
  { value: 'urgency', label: 'Urgency (High to Low)' },
  { value: 'dueDate', label: 'Due Date (Soonest First)' },
  { value: 'type', label: 'Type' },
  { value: 'event', label: 'Event Name' },
];

export const ActionCenterPage: React.FC = () => {
  useDocumentTitle('Action Center | LifePlace Alfonso');
  const theme = useTheme();
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Filter and sort state
  const [filters, setFilters] = useState<ActionCenterFilters>({ types: [] });
  const [sortBy, setSortBy] = useState<ActionCenterSortOption>('urgency');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(!isMobile);

  // Contract dialog state
  const [signingDialogOpen, setSigningDialogOpen] = useState(false);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  // Invoice payment dialog state
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
  const [invoicePaymentDialogOpen, setInvoicePaymentDialogOpen] = useState(false);

  // Contracts context for signing
  const { refreshContracts } = useContracts();

  // Computed filters with search
  const computedFilters = useMemo(
    (): ActionCenterFilters => ({
      ...filters,
      search: searchQuery || undefined,
    }),
    [filters, searchQuery],
  );

  // Get action center data
  const { actions, counts, countsByType, eventOptions, isLoading, error, refetch } =
    useActionCenter({
      filters: computedFilters,
      sortBy,
    });

  // Handle type filter toggle
  const handleTypeToggle = (type: ActionType) => {
    setFilters((prev) => {
      const types = prev.types.includes(type)
        ? prev.types.filter((t) => t !== type)
        : [...prev.types, type];
      return { ...prev, types };
    });
  };

  // Handle event filter
  const handleEventFilter = (eventId: number | undefined) => {
    setFilters((prev) => ({ ...prev, eventId }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({ types: [] });
    setSearchQuery('');
  };

  // Handle contract sign
  const handleContractSign = async (action: ContractActionItem) => {
    try {
      const fullContract = await contractsApi.getContract(action.contractId);
      setSelectedContract(fullContract);
      setSigningDialogOpen(true);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching contract for signing:', error);
    }
  };

  // Handle contract view
  const handleContractView = async (action: ContractActionItem) => {
    try {
      const fullContract = await contractsApi.getContract(action.contractId);
      setViewingContract(fullContract);
    } catch (error) {
      if (import.meta.env.DEV) console.error('Error fetching contract:', error);
    }
  };

  // Handle sign complete
  const handleSignComplete = () => {
    setSigningDialogOpen(false);
    setSelectedContract(null);
    refreshContracts();
    refetch();
  };

  // Handle payment pay - open dialog directly instead of navigating
  const handlePaymentPay = (action: PaymentActionItem) => {
    if (action.originalInvoice) {
      setSelectedInvoiceForPayment(action.originalInvoice);
      setInvoicePaymentDialogOpen(true);
    }
  };

  // Handle invoice payment dialog close
  const handleCloseInvoicePaymentDialog = () => {
    setInvoicePaymentDialogOpen(false);
    setSelectedInvoiceForPayment(null);
  };

  // Handle invoice payment success
  const handleInvoicePaymentSuccess = () => {
    handleCloseInvoicePaymentDialog();
    refetch();
  };

  // Handle payment view
  const handlePaymentView = (action: PaymentActionItem) => {
    navigate(`/payments?view=${action.invoiceId}`);
  };

  // Check if any filters are active
  const hasActiveFilters = filters.types.length > 0 || filters.eventId !== undefined || searchQuery;

  // Type icons mapping
  const TYPE_ICONS: Record<ActionType, React.ElementType> = {
    TASK: TaskIcon,
    QUOTE: QuoteIcon,
    CONTRACT: ContractIcon,
    PAYMENT: PaymentIcon,
  };

  return (
    <>
      <AnimatedElement animation="slideUp" delay={400}>
        <Box sx={{ py: 3, px: { xs: 2, md: 3 } }}>
          {/* Header */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
                Action Center
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {counts.total === 0
                  ? 'No pending actions'
                  : `${counts.total} item${counts.total !== 1 ? 's' : ''} need${counts.total === 1 ? 's' : ''} your attention`}
              </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
              {isMobile && (
                <Tooltip title="Toggle filters">
                  <IconButton
                    onClick={() => setShowFilters(!showFilters)}
                    color={showFilters ? 'primary' : 'default'}
                  >
                    <FilterIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Refresh">
                <IconButton onClick={refetch} disabled={isLoading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Error State */}
          {error && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                backgroundColor: 'error.light',
                borderRadius: 2,
              }}
            >
              <Typography color="error.dark">{error}</Typography>
            </Box>
          )}

          {/* Filters Section */}
          <Collapse in={showFilters}>
            <Box
              sx={{
                mb: 3,
                p: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack spacing={2}>
                {/* Search */}
                <TextField
                  placeholder="Search actions..."
                  size="small"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon color="action" />
                      </InputAdornment>
                    ),
                    endAdornment: searchQuery ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchQuery('')}>
                          <ClearIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null,
                  }}
                  sx={{ maxWidth: 400 }}
                />

                {/* Type Filters */}
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mb: 1, display: 'block' }}
                  >
                    Filter by type
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {(Object.keys(ACTION_TYPE_CONFIGS) as ActionType[]).map((type) => {
                      const config = ACTION_TYPE_CONFIGS[type];
                      const Icon = TYPE_ICONS[type];
                      const count = countsByType[type];
                      const isActive = filters.types.includes(type);

                      return (
                        <Chip
                          key={type}
                          icon={<Icon sx={{ fontSize: '1rem !important' }} />}
                          label={
                            <Box
                              component="span"
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                              }}
                            >
                              {config.pluralLabel}
                              <Badge
                                badgeContent={count}
                                color="primary"
                                sx={{
                                  '& .MuiBadge-badge': {
                                    position: 'relative',
                                    transform: 'none',
                                    ml: 0.5,
                                    minWidth: 18,
                                    height: 18,
                                    fontSize: '0.7rem',
                                  },
                                }}
                              />
                            </Box>
                          }
                          onClick={() => handleTypeToggle(type)}
                          variant={isActive ? 'filled' : 'outlined'}
                          color={isActive ? 'primary' : 'default'}
                          sx={{
                            borderColor: isActive ? undefined : config.color,
                            '& .MuiChip-icon': {
                              color: isActive ? undefined : config.color,
                            },
                          }}
                        />
                      );
                    })}
                  </Stack>
                </Box>

                {/* Event Filter and Sort */}
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  {/* Event Filter */}
                  {eventOptions.length > 0 && (
                    <TextField
                      select
                      label="Filter by Event"
                      size="small"
                      value={filters.eventId || ''}
                      onChange={(e) =>
                        handleEventFilter(e.target.value ? Number(e.target.value) : undefined)
                      }
                      sx={{ minWidth: 200 }}
                    >
                      <MenuItem value="">All Events</MenuItem>
                      {eventOptions.map((event) => (
                        <MenuItem key={event.id} value={event.id}>
                          {event.name} ({event.actionCount})
                        </MenuItem>
                      ))}
                    </TextField>
                  )}

                  {/* Sort */}
                  <TextField
                    select
                    label="Sort by"
                    size="small"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as ActionCenterSortOption)}
                    sx={{ minWidth: 200 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SortIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {SORT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button
                      variant="text"
                      size="small"
                      onClick={clearFilters}
                      startIcon={<ClearIcon />}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Box>
          </Collapse>

          {/* Summary Badges (Critical/High count) */}
          {counts.total > 0 && (counts.critical > 0 || counts.high > 0) && (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              {counts.critical > 0 && (
                <Chip
                  label={`${counts.critical} Critical`}
                  size="small"
                  color="error"
                  variant="filled"
                />
              )}
              {counts.high > 0 && (
                <Chip
                  label={`${counts.high} High Priority`}
                  size="small"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Stack>
          )}

          {/* Action Cards List */}
          <ActionCardList
            actions={actions}
            isLoading={isLoading}
            showEmpty={true}
            onActionComplete={refetch}
            onContractSign={handleContractSign}
            onContractView={handleContractView}
            onPaymentPay={handlePaymentPay}
            onPaymentView={handlePaymentView}
          />

          {/* Contract Signing Dialog */}
          {selectedContract && (
            <ContractSigningDialog
              contract={selectedContract}
              open={signingDialogOpen}
              onClose={() => {
                setSigningDialogOpen(false);
                setSelectedContract(null);
              }}
              onSignComplete={handleSignComplete}
              onError={(error) => {
                if (import.meta.env.DEV) console.error('Signing error:', error);
              }}
            />
          )}

          {/* Contract Viewer Dialog */}
          <Dialog
            open={!!viewingContract}
            onClose={() => setViewingContract(null)}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {viewingContract?.template?.name || 'Contract'}
              <IconButton
                aria-label="close"
                onClick={() => setViewingContract(null)}
                sx={{ position: 'absolute', right: 8, top: 8 }}
              >
                <ClearIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent dividers>
              {viewingContract && (
                <ContractViewer
                  contract={viewingContract}
                  showContent
                  showSignatures
                  showMetadata
                />
              )}
            </DialogContent>
          </Dialog>

          {/* Invoice Payment Dialog */}
          {selectedInvoiceForPayment && (
            <InvoicePaymentDialog
              open={invoicePaymentDialogOpen}
              invoice={selectedInvoiceForPayment}
              onClose={handleCloseInvoicePaymentDialog}
              onPaymentSuccess={handleInvoicePaymentSuccess}
            />
          )}
        </Box>
      </AnimatedElement>
    </>
  );
};

export default ActionCenterPage;
