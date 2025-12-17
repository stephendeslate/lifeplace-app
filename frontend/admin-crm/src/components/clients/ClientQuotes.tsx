// frontend/admin-crm/src/components/clients/ClientQuotes.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  IconButton,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItemButton,
  ListItemAvatar,
  Avatar,
} from '@mui/material';
import {
  Add as AddIcon,
  Receipt as QuoteIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Send as SendIcon,
  FileCopy as DuplicateIcon,
  Event as EventIcon,
} from '@mui/icons-material';
import { useQuotesForClient, useDuplicateQuote } from '../../hooks/useSales';
import { useEvents } from '../../hooks/useEvents';
import type { EventQuote } from '../../types/sales.types';
import type { Client } from '../../types/clients.types';
import type { Event } from '../../types/events.types';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { QuoteDetailsDialog } from '../sales/QuoteDetailsDialog';
import QuoteEditDialog from '../sales/QuoteEditDialog';
import QuoteSendConfirmDialog from '../sales/QuoteSendConfirmDialog';
import { QuoteCreateDialog } from '../events/QuoteCreateDialog';
import { useToast } from '../../contexts/ToastContext';
import { format } from 'date-fns';

interface ClientQuotesProps {
  client: Client;
}

export const ClientQuotes: React.FC<ClientQuotesProps> = ({ client }) => {
  const { showToast } = useToast();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedQuote, setSelectedQuote] = useState<EventQuote | null>(null);

  // Dialog states
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [eventSelectDialogOpen, setEventSelectDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const { settings: currencySettings } = useCurrencySettings();

  // Data hooks
  const { data: quotes = [], isLoading, refetch: refetchQuotes } = useQuotesForClient(client.id);
  const { events: clientEvents = [], isLoadingEvents: eventsLoading } = useEvents({ client: client.id });

  // Mutation hooks
  const duplicateQuoteMutation = useDuplicateQuote();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, quote: EventQuote) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuote(quote);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleViewQuote = (quote: EventQuote) => {
    setSelectedQuote(quote);
    setDetailDialogOpen(true);
    handleMenuClose();
  };

  const handleEditQuote = (quote: EventQuote) => {
    setSelectedQuote(quote);
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleSendQuote = (quote: EventQuote) => {
    setSelectedQuote(quote);
    setSendDialogOpen(true);
    handleMenuClose();
  };

  const handleDuplicateQuote = async (quote: EventQuote) => {
    handleMenuClose();
    try {
      await duplicateQuoteMutation.mutateAsync(quote.id);
      showToast({ type: 'success', title: 'Quote Duplicated', message: 'Quote duplicated successfully' });
      refetchQuotes();
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to duplicate quote' });
    }
  };

  // Create quote flow: first select an event, then open create dialog
  const handleCreateQuoteClick = () => {
    setEventSelectDialogOpen(true);
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setEventSelectDialogOpen(false);
    setCreateDialogOpen(true);
  };

  const handleCreateDialogClose = () => {
    setCreateDialogOpen(false);
    setSelectedEvent(null);
  };

  const handleQuoteCreated = () => {
    refetchQuotes();
    handleCreateDialogClose();
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

  const formatQuoteAmount = (amount: string | number, quoteCurrency?: string) => {
    const currency = quoteCurrency || currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(amount, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };

  const getStatusColor = (status: string): "default" | "primary" | "success" | "warning" | "error" => {
    switch (status) {
      case 'DRAFT':
        return 'default';
      case 'SENT':
        return 'primary';
      case 'ACCEPTED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'EXPIRED':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  if (quotes.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <QuoteIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Quotes Yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create a quote to send pricing proposals to this client.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateQuoteClick}
          disabled={clientEvents.length === 0}
        >
          Create Quote
        </Button>
        {clientEvents.length === 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This client has no events. Create an event first to generate a quote.
          </Typography>
        )}
      </Paper>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Quotes</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateQuoteClick}
          size="small"
          disabled={clientEvents.length === 0}
        >
          Create Quote
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Event</TableCell>
              <TableCell>Version</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Valid Until</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell width="50"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow key={quote.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {quote.event_details?.name || `Event #${quote.event}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">v{quote.version}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatQuoteAmount(quote.total_amount)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(quote.valid_until).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={quote.status_display || quote.status}
                    size="small"
                    color={getStatusColor(quote.status)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(quote.created_at).toLocaleDateString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="View">
                      <IconButton
                        size="small"
                        onClick={() => handleViewQuote(quote)}
                      >
                        <ViewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, quote)}
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

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedQuote?.status === 'DRAFT' && (
          <MenuItem onClick={() => selectedQuote && handleEditQuote(selectedQuote)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {selectedQuote?.status === 'DRAFT' && (
          <MenuItem onClick={() => selectedQuote && handleSendQuote(selectedQuote)}>
            <ListItemIcon>
              <SendIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Send</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => selectedQuote && handleDuplicateQuote(selectedQuote)}>
          <ListItemIcon>
            <DuplicateIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
      </Menu>

      {/* Quote Details Dialog */}
      <QuoteDetailsDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
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

      {/* Event Selection Dialog for Creating Quote */}
      <Dialog
        open={eventSelectDialogOpen}
        onClose={() => setEventSelectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Event for Quote</DialogTitle>
        <DialogContent>
          {eventsLoading ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : clientEvents.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={3}>
              This client has no events. Create an event first to generate a quote.
            </Typography>
          ) : (
            <List>
              {clientEvents.map((event: Event) => (
                <ListItemButton
                  key={event.id}
                  onClick={() => handleEventSelect(event)}
                  sx={{ borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <EventIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={event.name || `Event #${event.id}`}
                    secondary={
                      <>
                        {event.start_date && format(new Date(event.start_date), 'PPP')}
                        {event.status && (
                          <Chip
                            label={event.status}
                            size="small"
                            sx={{ ml: 1 }}
                            color={event.status === 'CONFIRMED' ? 'success' : 'default'}
                          />
                        )}
                      </>
                    }
                  />
                </ListItemButton>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventSelectDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>

      {/* Quote Create Dialog */}
      {selectedEvent && (
        <QuoteCreateDialog
          open={createDialogOpen}
          onClose={handleCreateDialogClose}
          event={selectedEvent}
          onSuccess={handleQuoteCreated}
        />
      )}
    </Box>
  );
};