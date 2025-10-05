// frontend/admin-crm/src/components/events/EventQuotes.tsx

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
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Send as SendIcon,
  FileCopy as DuplicateIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Receipt as QuoteIcon,
  CheckCircle as AcceptedIcon,
  Cancel as RejectedIcon,
  Schedule as DraftIcon,
  Email as SentIcon,
  AccessTime as ExpiredIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useQuotesForEvent } from '../../hooks/useSales';
import type { Event } from '../../types/events.types';
import type { EventQuote } from '../../types/sales.types';
import { formatCurrency } from '../../utils/currency';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { QuoteDetailsDialog } from '../sales/QuoteDetailsDialog';
import { QuoteCreateDialog } from './QuoteCreateDialog';
import QuoteEditDialog from '../sales/QuoteEditDialog';
import QuoteSendConfirmDialog from '../sales/QuoteSendConfirmDialog';

interface EventQuotesProps {
  event: Event;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return <DraftIcon fontSize="small" />;
    case 'SENT':
      return <SentIcon fontSize="small" />;
    case 'ACCEPTED':
      return <AcceptedIcon fontSize="small" />;
    case 'REJECTED':
      return <RejectedIcon fontSize="small" />;
    case 'EXPIRED':
      return <ExpiredIcon fontSize="small" />;
    default:
      return <DraftIcon fontSize="small" />;
  }
};


const getStatusStyles = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return {
        backgroundColor: '#e3f2fd',
        color: '#1976d2',
        '& .MuiChip-icon': { color: '#1976d2' }
      };
    case 'SENT':
      return {
        backgroundColor: '#e1f5fe',
        color: '#0277bd',
        '& .MuiChip-icon': { color: '#0277bd' }
      };
    case 'ACCEPTED':
      return {
        backgroundColor: '#e8f5e8',
        color: '#2e7d32',
        '& .MuiChip-icon': { color: '#2e7d32' }
      };
    case 'REJECTED':
      return {
        backgroundColor: '#ffebee',
        color: '#c62828',
        '& .MuiChip-icon': { color: '#c62828' }
      };
    case 'EXPIRED':
      return {
        backgroundColor: '#fff3e0',
        color: '#f57c00',
        '& .MuiChip-icon': { color: '#f57c00' }
      };
    default:
      return {
        backgroundColor: '#f3e5f5',
        color: '#7b1fa2',
        '& .MuiChip-icon': { color: '#7b1fa2' }
      };
  }
};

export const EventQuotes: React.FC<EventQuotesProps> = ({ event }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedQuote, setSelectedQuote] = useState<EventQuote | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const { settings: currencySettings } = useCurrencySettings();

  const {
    data: quotes = [],
    isLoading,
    refetch,
  } = useQuotesForEvent(event.id);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, quote: EventQuote) => {
    setAnchorEl(event.currentTarget);
    setSelectedQuote(quote);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedQuote(null);
  };

  const handleCreateQuote = () => {
    setCreateDialogOpen(true);
  };

  const handleViewQuote = (quote: EventQuote) => {
    setSelectedQuote(quote);
    setDetailDialogOpen(true);
  };

  const handleEditQuote = (quote: EventQuote) => {
    setSelectedQuote(quote);
    setEditDialogOpen(true);
    setAnchorEl(null); // Only close the menu, keep selectedQuote for dialog
  };

  const handleSendQuote = () => {
    if (selectedQuote) {
      setSendDialogOpen(true);
      setAnchorEl(null); // Only close the menu, keep selectedQuote for dialog
    }
  };

  const handleDuplicateQuote = () => {
    if (selectedQuote) {
      // This would trigger the duplicate action through a mutation
      console.log('Duplicate quote:', selectedQuote.id);
      setAnchorEl(null);
      setSelectedQuote(null); // Clear quote since no dialog needs it
    }
  };

  const handleDeleteQuote = () => {
    if (selectedQuote) {
      // This would trigger the delete action through a mutation
      console.log('Delete quote:', selectedQuote.id);
      setAnchorEl(null);
      setSelectedQuote(null); // Clear quote since no dialog needs it
    }
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
          Create your first quote for this event to get started.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateQuote}
        >
          Create Quote
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">Event Quotes</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateQuote}
        >
          Create Quote
        </Button>
      </Box>

      {/* Quotes Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Version</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Total Amount</TableCell>
              <TableCell>Valid Until</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Sent</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quotes.map((quote: EventQuote) => (
              <TableRow key={quote.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    Version {quote.version}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(quote.status)}
                    label={quote.status_display || quote.status}
                    size="small"
                    sx={getStatusStyles(quote.status)}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {formatQuoteAmount(quote.total_amount)}
                  </Typography>
                  {Number(quote.discount_amount) > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Discount: {formatQuoteAmount(quote.discount_amount)}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(quote.valid_until), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  {format(new Date(quote.created_at), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>
                  {quote.sent_at ? (
                    format(new Date(quote.sent_at), 'MMM dd, yyyy')
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Not sent
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
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

      {/* Actions Menu */}
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
        <MenuItem onClick={handleDeleteQuote}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>

      {/* Summary Card */}
      {quotes.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Quote Summary
            </Typography>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Quotes
                </Typography>
                <Typography variant="h6">{quotes.length}</Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Latest Version
                </Typography>
                <Typography variant="h6">
                  {Math.max(...quotes.map((q: EventQuote) => q.version))}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Accepted Quote
                </Typography>
                <Typography variant="h6">
                  {quotes.find((q: EventQuote) => q.status === 'ACCEPTED')
                    ? formatQuoteAmount(
                        quotes.find((q: EventQuote) => q.status === 'ACCEPTED')!.total_amount
                      )
                    : 'None'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Quote Details Dialog */}
      <QuoteDetailsDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        quote={selectedQuote}
      />

      {/* Quote Create Dialog */}
      <QuoteCreateDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        event={event}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Quote Edit Dialog */}
      {selectedQuote && (
        <QuoteEditDialog
          open={editDialogOpen}
          onClose={() => {
            setEditDialogOpen(false);
            setSelectedQuote(null);
          }}
          quote={selectedQuote}
          onSuccess={async () => {
            const { data: updatedQuotes } = await refetch();
            // Update selectedQuote with fresh data if detail dialog is open
            if (detailDialogOpen && selectedQuote && updatedQuotes) {
              const freshQuote = updatedQuotes.find(q => q.id === selectedQuote.id);
              if (freshQuote) {
                setSelectedQuote(freshQuote);
              }
            }
            setEditDialogOpen(false);
            // Don't clear selectedQuote if detail dialog is open
            if (!detailDialogOpen) {
              setSelectedQuote(null);
            }
          }}
        />
      )}

      {/* Quote Send Confirmation Dialog */}
      {selectedQuote && (
        <QuoteSendConfirmDialog
          open={sendDialogOpen}
          onClose={() => {
            setSendDialogOpen(false);
            setSelectedQuote(null);
          }}
          quote={selectedQuote}
          onSuccess={async () => {
            const { data: updatedQuotes } = await refetch();
            // Update selectedQuote with fresh data if detail dialog is open
            if (detailDialogOpen && selectedQuote && updatedQuotes) {
              const freshQuote = updatedQuotes.find(q => q.id === selectedQuote.id);
              if (freshQuote) {
                setSelectedQuote(freshQuote);
              }
            }
            setSendDialogOpen(false);
            // Don't clear selectedQuote if detail dialog is open
            if (!detailDialogOpen) {
              setSelectedQuote(null);
            }
          }}
        />
      )}
    </Box>
  );
};