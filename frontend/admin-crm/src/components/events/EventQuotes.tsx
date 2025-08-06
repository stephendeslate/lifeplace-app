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

const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  switch (status) {
    case 'DRAFT':
      return 'default';
    case 'SENT':
      return 'info';
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

export const EventQuotes: React.FC<EventQuotesProps> = ({ event }) => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedQuote, setSelectedQuote] = useState<EventQuote | null>(null);

  const {
    data: quotes = [],
    isLoading,
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
    navigate(`/sales/quotes/new?eventId=${event.id}`);
  };

  const handleViewQuote = (quote: EventQuote) => {
    navigate(`/sales/quotes/${quote.id}`);
  };

  const handleEditQuote = (quote: EventQuote) => {
    navigate(`/sales/quotes/${quote.id}/edit`);
  };

  const handleSendQuote = () => {
    if (selectedQuote) {
      // This would trigger the send action through a mutation
      console.log('Send quote:', selectedQuote.id);
      handleMenuClose();
    }
  };

  const handleDuplicateQuote = () => {
    if (selectedQuote) {
      // This would trigger the duplicate action through a mutation
      console.log('Duplicate quote:', selectedQuote.id);
      handleMenuClose();
    }
  };

  const handleDeleteQuote = () => {
    if (selectedQuote) {
      // This would trigger the delete action through a mutation
      console.log('Delete quote:', selectedQuote.id);
      handleMenuClose();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
                    color={getStatusColor(quote.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {formatCurrency(Number(quote.total_amount))}
                  </Typography>
                  {Number(quote.discount_amount) > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      Discount: {formatCurrency(Number(quote.discount_amount))}
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
                    ? formatCurrency(
                        Number(quotes.find((q: EventQuote) => q.status === 'ACCEPTED')!.total_amount)
                      )
                    : 'None'}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};