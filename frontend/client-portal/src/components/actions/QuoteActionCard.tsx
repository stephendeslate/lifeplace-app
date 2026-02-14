// frontend/client-portal/src/components/actions/QuoteActionCard.tsx

import React, { useState } from "react";
import {
  Stack,
  Button,
  Typography,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Alert,
} from "@mui/material";
import {
  CheckCircle as AcceptIcon,
  Cancel as RejectIcon,
  Warning as ExpiringIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { ActionCard } from "./ActionCard";
import { useAcceptQuote, useRejectQuote } from "../../hooks/useEventQuotes";
import type { QuoteActionItem } from "../../types/action-center.types";

interface QuoteActionCardProps {
  action: QuoteActionItem;
  onActionComplete?: () => void;
}

export const QuoteActionCard: React.FC<QuoteActionCardProps> = ({
  action,
  onActionComplete,
}) => {
  const navigate = useNavigate();
  const acceptQuoteMutation = useAcceptQuote();
  const rejectQuoteMutation = useRejectQuote();

  // Dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleAccept = async () => {
    try {
      await acceptQuoteMutation.mutateAsync({
        quoteId: action.quoteId,
        data: {},
      });
      setConfirmDialogOpen(false);
      onActionComplete?.();
    } catch {
      // Error handled by mutation
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) return;

    try {
      await rejectQuoteMutation.mutateAsync({
        quoteId: action.quoteId,
        data: { reason: rejectionReason },
      });
      setRejectDialogOpen(false);
      setRejectionReason("");
      onActionComplete?.();
    } catch {
      // Error handled by mutation
    }
  };

  const handleViewDetails = () => {
    navigate(`/events/${action.eventId}?tab=quotes`);
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: action.currency || "USD",
    }).format(parseFloat(amount));
  };

  const isExpired = action.isExpired;
  const isExpiringSoon = action.isExpiringSoon;
  const isPending =
    acceptQuoteMutation.isPending || rejectQuoteMutation.isPending;

  return (
    <>
      <ActionCard action={action}>
        <Stack spacing={1.5}>
          {/* Amount and Expiry Info */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography
              variant="h6"
              color="primary.main"
              sx={{ fontWeight: 600 }}
            >
              {formatCurrency(action.totalAmount)}
            </Typography>

            {isExpired && (
              <Chip
                icon={<ExpiringIcon sx={{ fontSize: "0.875rem !important" }} />}
                label="Expired"
                color="error"
                size="small"
                variant="filled"
                sx={{ fontSize: "0.7rem" }}
              />
            )}

            {!isExpired && isExpiringSoon && (
              <Chip
                icon={<ExpiringIcon sx={{ fontSize: "0.875rem !important" }} />}
                label={`Expires in ${action.daysUntilExpiry} day${action.daysUntilExpiry !== 1 ? "s" : ""}`}
                color="warning"
                size="small"
                variant="filled"
                sx={{ fontSize: "0.7rem" }}
              />
            )}

            {!isExpired && !isExpiringSoon && action.daysUntilExpiry > 0 && (
              <Typography variant="caption" color="text.secondary">
                Valid for {action.daysUntilExpiry} more days
              </Typography>
            )}
          </Stack>

          {/* Action Buttons */}
          {!isExpired && (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ViewIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewDetails();
                }}
                sx={{ fontSize: "0.75rem" }}
              >
                View Details
              </Button>

              <Button
                variant="contained"
                size="small"
                color="success"
                startIcon={<AcceptIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDialogOpen(true);
                }}
                disabled={isPending}
                sx={{ fontSize: "0.75rem" }}
              >
                Accept
              </Button>

              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<RejectIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  setRejectDialogOpen(true);
                }}
                disabled={isPending}
                sx={{ fontSize: "0.75rem" }}
              >
                Reject
              </Button>
            </Stack>
          )}

          {isExpired && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              This quote has expired. Please contact us for an updated quote.
            </Alert>
          )}
        </Stack>
      </ActionCard>

      {/* Accept Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Accept Quote</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Are you sure you want to accept this quote for{" "}
            <strong>{formatCurrency(action.totalAmount)}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            By accepting, you agree to the terms and conditions outlined in the
            quote. We will proceed with your event preparation.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAccept}
            variant="contained"
            color="success"
            disabled={acceptQuoteMutation.isPending}
          >
            {acceptQuoteMutation.isPending ? "Accepting..." : "Accept Quote"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        onClick={(e) => e.stopPropagation()}
      >
        <DialogTitle>Reject Quote</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Please let us know why you're declining this quote so we can
              better serve you.
            </Typography>
          </Box>
          <TextField
            label="Reason for rejection"
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            fullWidth
            placeholder="e.g., Budget constraints, different requirements, found alternative..."
            required
            error={!rejectionReason.trim() && rejectQuoteMutation.isPending}
            helperText={
              !rejectionReason.trim() ? "Please provide a reason" : ""
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleReject}
            variant="contained"
            color="error"
            disabled={rejectQuoteMutation.isPending || !rejectionReason.trim()}
          >
            {rejectQuoteMutation.isPending ? "Rejecting..." : "Reject Quote"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuoteActionCard;
