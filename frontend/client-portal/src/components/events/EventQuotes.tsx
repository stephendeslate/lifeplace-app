// frontend/client-portal/src/components/events/EventQuotes.tsx

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Stack,
  Skeleton,
  Alert,
  Chip,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Collapse,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  RequestQuote as QuoteIcon,
  Download as DownloadIcon,
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  DateRange as DateIcon,
  Receipt as ReceiptIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { format, isBefore } from 'date-fns';
import { useEventQuotes, useQuoteActions } from '../../hooks/useEventQuotes';
import { useCurrencySettings } from '../../hooks/useCurrency';
import type { EventQuote, QuoteRejectionData } from '../../types/quotes.types';

interface EventQuotesProps {
  eventId: number;
}

interface QuoteCardProps {
  quote: EventQuote;
  onAccept: (quoteId: number) => void;
  onReject: (quoteId: number, data: QuoteRejectionData) => void;
  onDownload: (quoteId: number) => void;
  isAccepting: boolean;
  isRejecting: boolean;
  isDownloading: boolean;
  formatAmount: (amount: string | number) => string;
}

const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  onAccept,
  onReject,
  onDownload,
  isAccepting,
  isRejecting,
  isDownloading,
  formatAmount,
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const getStatusColor = (status: EventQuote['status']): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    switch (status) {
      case 'SENT':
        return 'info';
      case 'ACCEPTED':
        return 'success';
      case 'REJECTED':
        return 'error';
      case 'EXPIRED':
        return 'warning';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: EventQuote['status']) => {
    switch (status) {
      case 'SENT':
        return <InfoIcon fontSize="small" />;
      case 'ACCEPTED':
        return <AcceptIcon fontSize="small" />;
      case 'REJECTED':
        return <RejectIcon fontSize="small" />;
      case 'EXPIRED':
        return <WarningIcon fontSize="small" />;
      case 'CANCELLED':
        return <RejectIcon fontSize="small" />;
      default:
        return <QuoteIcon fontSize="small" />;
    }
  };

  const isExpired = () => {
    if (!quote.valid_until) return false;
    return isBefore(new Date(quote.valid_until), new Date());
  };

  const isActionable = () => {
    return quote.status === 'SENT' && !isExpired();
  };

  const handleAccept = () => {
    onAccept(quote.id);
  };

  const handleRejectDialogOpen = () => {
    setRejectDialogOpen(true);
  };

  const handleRejectDialogClose = () => {
    setRejectDialogOpen(false);
    setRejectionReason('');
  };

  const handleRejectSubmit = () => {
    if (rejectionReason.trim()) {
      onReject(quote.id, { reason: rejectionReason.trim() });
      handleRejectDialogClose();
    }
  };

  const handleDownload = () => {
    onDownload(quote.id);
  };

  return (
    <>
      <Card
        sx={{
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: quote.status === 'ACCEPTED' ? alpha(theme.palette.success.main, 0.05) :
                          quote.status === 'REJECTED' ? alpha(theme.palette.error.main, 0.05) :
                          quote.status === 'EXPIRED' ? alpha(theme.palette.warning.main, 0.05) :
                          'background.paper',
        }}
      >
        <CardContent>
          <Stack spacing={2}>
            {/* Header */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2}>
              <Box>
                <Typography variant="h6" component="h3" gutterBottom>
                  Quote #{quote.id}
                  {quote.version > 1 && (
                    <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                      (v{quote.version})
                    </Typography>
                  )}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Created: {format(new Date(quote.created_at), 'MMM dd, yyyy')}
                  {quote.sent_at && (
                    <>
                      {' • '}Sent: {format(new Date(quote.sent_at), 'MMM dd, yyyy')}
                    </>
                  )}
                </Typography>
              </Box>

              <Chip
                icon={getStatusIcon(quote.status)}
                label={quote.status_display}
                color={getStatusColor(quote.status)}
                variant="filled"
              />
            </Stack>

            {/* Validity and Expiry */}
            {quote.valid_until && (
              <Stack direction="row" alignItems="center" spacing={1}>
                <DateIcon fontSize="small" color="action" />
                <Typography variant="body2" color={isExpired() ? 'error' : 'text.secondary'}>
                  Valid until: {format(new Date(quote.valid_until), 'MMM dd, yyyy')}
                  {isExpired() && (
                    <Chip
                      label="EXPIRED"
                      size="small"
                      color="error"
                      variant="outlined"
                      sx={{ ml: 1, height: 20, fontSize: '0.6875rem' }}
                    />
                  )}
                </Typography>
              </Stack>
            )}

            {/* Pricing Summary */}
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
              }}
            >
              <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Subtotal:
                  </Typography>
                  <Typography variant="body2">
                    {formatAmount(quote.subtotal)}
                  </Typography>
                </Stack>

                {parseFloat(quote.tax_amount) > 0 && (
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Tax:
                    </Typography>
                    <Typography variant="body2">
                      {formatAmount(quote.tax_amount)}
                    </Typography>
                  </Stack>
                )}

                {parseFloat(quote.discount_amount) > 0 && (
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Discount:
                    </Typography>
                    <Typography variant="body2" color="success.main">
                      -{formatAmount(quote.discount_amount)}
                    </Typography>
                  </Stack>
                )}

                <Divider />

                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Total:
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {formatAmount(quote.total_amount)}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>

            {/* Client Message */}
            {quote.client_message && (
              <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'grey.50' }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Message:
                </Typography>
                <Typography variant="body2">
                  {quote.client_message}
                </Typography>
              </Paper>
            )}

            {/* Rejection Reason */}
            {quote.status === 'REJECTED' && quote.rejection_reason && (
              <Alert severity="error" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Rejection Reason:</strong> {quote.rejection_reason}
                </Typography>
              </Alert>
            )}

            {/* Line Items Toggle */}
            {quote.line_items.length > 0 && (
              <Button
                variant="text"
                startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={() => setExpanded(!expanded)}
                sx={{ alignSelf: 'flex-start' }}
              >
                {expanded ? 'Hide' : 'Show'} Line Items ({quote.line_items.length})
              </Button>
            )}
          </Stack>
        </CardContent>

        {/* Expandable Line Items */}
        <Collapse in={expanded}>
          <CardContent sx={{ pt: 0 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
              Line Items
            </Typography>
            <List dense>
              {quote.line_items.map((item) => (
                <ListItem key={item.id} divider sx={{ px: 0 }}>
                  <ListItemText
                    primary={
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {item.description}
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {formatAmount(item.total)}
                        </Typography>
                      </Stack>
                    }
                    secondary={
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Qty: {item.quantity} × {formatAmount(item.unit_price)}
                          {parseFloat(item.tax_rate) > 0 && ` (Tax: ${(parseFloat(item.tax_rate) * 100).toFixed(1)}%)`}
                        </Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>

            {/* Quote Options */}
            {quote.options.length > 0 && (
              <>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, mt: 2 }}>
                  Options
                </Typography>
                <List dense>
                  {quote.options.map((option) => (
                    <ListItem key={option.id} divider sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {option.name}
                              {option.is_selected && (
                                <Chip
                                  label="Selected"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ ml: 1, height: 20 }}
                                />
                              )}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {formatAmount(option.total_price)}
                            </Typography>
                          </Stack>
                        }
                        secondary={option.description && (
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        )}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </CardContent>
        </Collapse>

        {/* Actions */}
        <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
          <Stack direction="row" spacing={1}>
            {isActionable() && (
              <>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<AcceptIcon />}
                  onClick={handleAccept}
                  disabled={isAccepting}
                  size="small"
                >
                  {isAccepting ? 'Accepting...' : 'Accept'}
                </Button>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<RejectIcon />}
                  onClick={handleRejectDialogOpen}
                  disabled={isRejecting}
                  size="small"
                >
                  Reject
                </Button>
              </>
            )}
          </Stack>

          <Tooltip title="Download PDF">
            <IconButton
              onClick={handleDownload}
              disabled={isDownloading}
              size="small"
              color="primary"
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </CardActions>
      </Card>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={handleRejectDialogClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Reject Quote #{quote.id}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Please provide a reason for rejecting this quote. This feedback helps us improve our services.
          </Typography>
          <TextField
            label="Rejection Reason"
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please explain why you're rejecting this quote..."
            required
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRejectDialogClose}>
            Cancel
          </Button>
          <Button
            onClick={handleRejectSubmit}
            variant="contained"
            color="error"
            disabled={!rejectionReason.trim() || isRejecting}
          >
            {isRejecting ? 'Rejecting...' : 'Reject Quote'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const EventQuotes: React.FC<EventQuotesProps> = ({ eventId }) => {
  const { data: quotes, isLoading, error } = useEventQuotes(eventId);
  const { formatAmount } = useCurrencySettings();

  const {
    acceptQuote,
    rejectQuote,
    downloadPdf,
    isAccepting,
    isRejecting,
    isDownloading,
  } = useQuoteActions();

  const handleAcceptQuote = async (quoteId: number) => {
    try {
      await acceptQuote({ quoteId });
    } catch {
      // Error handling is done by the mutation hook
    }
  };

  const handleRejectQuote = async (quoteId: number, data: QuoteRejectionData) => {
    try {
      await rejectQuote({ quoteId, data });
    } catch {
      // Error handling is done by the mutation hook
    }
  };

  const handleDownloadQuote = async (quoteId: number) => {
    try {
      await downloadPdf(quoteId);
    } catch {
      // Error handling is done by the mutation hook
    }
  };

  if (isLoading) {
    return (
      <Box>
        <Stack spacing={3}>
          {[1, 2].map((item) => (
            <Card key={item}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Skeleton variant="text" width={200} height={32} />
                    <Skeleton variant="rectangular" width={80} height={24} />
                  </Stack>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="rectangular" height={120} />
                  <Stack direction="row" spacing={1}>
                    <Skeleton variant="rectangular" width={100} height={32} />
                    <Skeleton variant="rectangular" width={80} height={32} />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Unable to load quotes. Please try again later.
      </Alert>
    );
  }

  if (!quotes || quotes.results.length === 0) {
    return (
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          backgroundColor: 'grey.50',
        }}
      >
        <ReceiptIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No quotes available
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Quotes for this event will appear here when they become available.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box role="region" aria-label="Event quotes">
      <Stack spacing={3}>
        {quotes.results.map((quote: EventQuote) => (
          <QuoteCard
            key={quote.id}
            quote={quote}
            onAccept={handleAcceptQuote}
            onReject={handleRejectQuote}
            onDownload={handleDownloadQuote}
            isAccepting={isAccepting}
            isRejecting={isRejecting}
            isDownloading={isDownloading}
            formatAmount={formatAmount}
          />
        ))}

        {quotes.results.length > 0 && (
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {quotes.results.length} quote{quotes.results.length !== 1 ? 's' : ''} available
            </Typography>
          </Box>
        )}
      </Stack>
    </Box>
  );
};

export default EventQuotes;