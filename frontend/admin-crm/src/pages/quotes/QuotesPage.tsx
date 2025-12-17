// frontend/admin-crm/src/pages/quotes/QuotesPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  InputAdornment,
  Stack,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import {
  Search as SearchIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Send as SendIcon,
  FileCopy as DuplicateIcon,
  Receipt as QuoteIcon,
  Event as EventIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext';
import { useToast } from '../../contexts/ToastContext';
import { useEventQuotes, useDuplicateQuote } from '../../hooks/useSales';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import { QuoteDetailsDialog } from '../../components/sales/QuoteDetailsDialog';
import QuoteEditDialog from '../../components/sales/QuoteEditDialog';
import QuoteSendConfirmDialog from '../../components/sales/QuoteSendConfirmDialog';
import type { EventQuote, QuoteStatus, EventQuoteFilters } from '../../types/sales.types';
import {
  ModernOverviewLayout,
  ModernOverviewHeader,
  ModernGlassCard,
  ModernEmptyState,
  ModernTableSkeleton,
} from '../../components/common';

interface QuoteFilters {
  search?: string;
  status?: QuoteStatus | '';
}

export const QuotesPage: React.FC = () => {
  const navigate = useNavigate();
  const { setBreadcrumbs } = useLayout();
  const { showToast } = useToast();
  const { settings: currencySettings } = useCurrencySettings();

  // Pagination state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Filter state
  const [filters, setFilters] = useState<QuoteFilters>({});
  const [searchValue, setSearchValue] = useState('');

  // Menu state
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedQuote, setSelectedQuote] = useState<EventQuote | null>(null);

  // Dialog states
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);

  // Data hooks - convert empty string status to undefined for API compatibility
  const apiFilters: EventQuoteFilters = {
    search: searchValue || undefined,
    status: filters.status === '' ? undefined : filters.status,
  };
  const { data: quotes = [], isLoading, refetch: refetchQuotes } = useEventQuotes(apiFilters);

  // Mutation hooks
  const duplicateQuoteMutation = useDuplicateQuote();

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([{ label: 'Quotes' }]);
  }, [setBreadcrumbs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchValue || undefined
      }));
      setPage(0);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const handleStatusFilterChange = (event: SelectChangeEvent<string>) => {
    setFilters(prev => ({
      ...prev,
      status: event.target.value as QuoteStatus | ''
    }));
    setPage(0);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, quote: EventQuote) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedQuote(quote);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleViewQuote = () => {
    if (selectedQuote) {
      setDetailsDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleEditQuote = () => {
    if (selectedQuote) {
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleSendQuote = () => {
    if (selectedQuote) {
      setSendDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDuplicateQuote = async () => {
    if (selectedQuote) {
      try {
        await duplicateQuoteMutation.mutateAsync(selectedQuote.id);
        showToast({ type: 'success', title: 'Quote Duplicated', message: 'Quote duplicated successfully' });
        refetchQuotes();
      } catch {
        showToast({ type: 'error', title: 'Error', message: 'Failed to duplicate quote' });
      }
    }
    handleMenuClose();
  };

  const handleNavigateToEvent = (eventId: number) => {
    navigate(`/events/${eventId}`);
  };

  const formatQuoteAmount = (amount: string | number, quoteCurrency?: string) => {
    const currency = quoteCurrency || currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(amount, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'DRAFT': return 'default';
      case 'SENT': return 'primary';
      case 'ACCEPTED': return 'success';
      case 'REJECTED': return 'error';
      case 'EXPIRED': return 'warning';
      default: return 'default';
    }
  };

  const handleEditSuccess = () => {
    setEditDialogOpen(false);
    setSelectedQuote(null);
    refetchQuotes();
  };

  const handleSendSuccess = () => {
    setSendDialogOpen(false);
    setSelectedQuote(null);
    refetchQuotes();
  };

  // Paginate quotes
  const paginatedQuotes = quotes.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <ModernOverviewLayout>
      <ModernOverviewHeader
        title="Quote Management"
        subtitle="View and manage all quotes across events"
        icon={<QuoteIcon />}
      />

      {/* Filters */}
      <ModernGlassCard sx={{ mb: 3, p: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            placeholder="Search quotes..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            size="small"
            sx={{ minWidth: 250 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={filters.status || ''}
              onChange={handleStatusFilterChange}
              label="Status"
            >
              <MenuItem value="">All Statuses</MenuItem>
              <MenuItem value="DRAFT">Draft</MenuItem>
              <MenuItem value="SENT">Sent</MenuItem>
              <MenuItem value="ACCEPTED">Accepted</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
              <MenuItem value="EXPIRED">Expired</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </ModernGlassCard>

      {/* Quotes Table */}
      <ModernGlassCard>
        {isLoading ? (
          <ModernTableSkeleton rows={5} />
        ) : quotes.length === 0 ? (
          <ModernEmptyState
            icon={<QuoteIcon sx={{ fontSize: 64 }} />}
            title="No Quotes Found"
            description={filters.status || searchValue
              ? "No quotes match your current filters. Try adjusting your search criteria."
              : "Quotes will appear here once created from event pages."
            }
          />
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Quote</TableCell>
                    <TableCell>Event</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Valid Until</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="center" width={60}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedQuotes.map((quote) => (
                    <TableRow
                      key={quote.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        setSelectedQuote(quote);
                        setDetailsDialogOpen(true);
                      }}
                    >
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <QuoteIcon color="action" fontSize="small" />
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              Quote #{quote.id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              v{quote.version}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Go to event">
                          <Box
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToEvent(quote.event);
                            }}
                            sx={{
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              '&:hover': { color: 'primary.main' }
                            }}
                          >
                            <EventIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {quote.event_details?.name || `Event #${quote.event}`}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                          }}
                        >
                          <PersonIcon fontSize="small" color="action" />
                          <Typography variant="body2">
                            {quote.event_details?.client_name || 'N/A'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium">
                          {formatQuoteAmount(quote.total_amount)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {quote.valid_until
                            ? new Date(quote.valid_until).toLocaleDateString()
                            : '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={quote.status}
                          size="small"
                          color={getStatusColor(quote.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(quote.created_at).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, quote)}
                        >
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={quotes.length}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
            />
          </>
        )}
      </ModernGlassCard>

      {/* Actions Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewQuote}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>View Details</ListItemText>
        </MenuItem>
        {selectedQuote?.status === 'DRAFT' && (
          <MenuItem onClick={handleEditQuote}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {selectedQuote?.status === 'DRAFT' && (
          <MenuItem onClick={handleSendQuote}>
            <ListItemIcon>
              <SendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Send to Client</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={handleDuplicateQuote}>
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
      </Menu>

      {/* Quote Details Dialog */}
      <QuoteDetailsDialog
        open={detailsDialogOpen}
        onClose={() => {
          setDetailsDialogOpen(false);
          setSelectedQuote(null);
        }}
        quote={selectedQuote}
      />

      {/* Quote Edit Dialog */}
      {selectedQuote && (
        <QuoteEditDialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          quote={selectedQuote}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Quote Send Confirmation Dialog */}
      {selectedQuote && (
        <QuoteSendConfirmDialog
          open={sendDialogOpen}
          onClose={() => setSendDialogOpen(false)}
          quote={selectedQuote}
          onSuccess={handleSendSuccess}
        />
      )}
    </ModernOverviewLayout>
  );
};

export default QuotesPage;
