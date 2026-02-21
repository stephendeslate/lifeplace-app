// frontend/admin-crm/src/components/sales/EventQuotesTable.tsx

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Typography,
  Box,
  CircularProgress,
  Menu,
  MenuItem,
  Stack,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Visibility as ViewIcon,
  Send as SendIcon,
  Check as AcceptIcon,
  Close as RejectIcon,
  ContentCopy as DuplicateIcon,
  Receipt as QuoteIcon,
} from "@mui/icons-material";
import { formatDistanceToNow, format } from "date-fns";
import type { EventQuote, QuoteStatus } from "../../types/sales.types";

interface EventQuotesTableProps {
  quotes: EventQuote[];
  isLoading: boolean;
  onEdit: (quote: EventQuote) => void;
  onView: (quote: EventQuote) => void;
  onDelete: (id: number) => void;
  onSend?: (quote: EventQuote) => void;
  onAccept?: (quote: EventQuote) => void;
  onReject?: (quote: EventQuote) => void;
  onDuplicate?: (quote: EventQuote) => void;
  isDeleting: boolean;
  isSending?: boolean;
  isAccepting?: boolean;
  isRejecting?: boolean;
  isDuplicating?: boolean;
}

export const EventQuotesTable: React.FC<EventQuotesTableProps> = ({
  quotes,
  isLoading,
  onEdit,
  onView,
  onDelete,
  onSend,
  onAccept,
  onReject,
  onDuplicate,
  isDeleting,
  isSending,
  isAccepting,
  isRejecting,
  isDuplicating,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [selectedQuote, setSelectedQuote] = React.useState<EventQuote | null>(
    null,
  );

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    quote: EventQuote,
  ) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedQuote(quote);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedQuote(null);
  };

  const handleView = () => {
    if (selectedQuote) {
      onView(selectedQuote);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedQuote) {
      onEdit(selectedQuote);
    }
    handleMenuClose();
  };

  const handleSend = () => {
    if (selectedQuote && onSend) {
      onSend(selectedQuote);
    }
    handleMenuClose();
  };

  const handleAccept = () => {
    if (selectedQuote && onAccept) {
      onAccept(selectedQuote);
    }
    handleMenuClose();
  };

  const handleReject = () => {
    if (selectedQuote && onReject) {
      onReject(selectedQuote);
    }
    handleMenuClose();
  };

  const handleDuplicate = () => {
    if (selectedQuote && onDuplicate) {
      onDuplicate(selectedQuote);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedQuote) {
      onDelete(selectedQuote.id);
    }
    handleMenuClose();
  };

  const getStatusChip = (status: QuoteStatus) => {
    const statusConfig = {
      DRAFT: { color: "default" as const, label: "Draft" },
      SENT: { color: "info" as const, label: "Sent" },
      ACCEPTED: { color: "success" as const, label: "Accepted" },
      REJECTED: { color: "error" as const, label: "Rejected" },
      EXPIRED: { color: "warning" as const, label: "Expired" },
    };

    const config = statusConfig[status];
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        variant="filled"
        sx={{
          fontWeight: 600,
          fontSize: "0.75rem",
          height: "24px",
        }}
      />
    );
  };

  const formatCurrency = (amount: string) => {
    const value = parseFloat(amount);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const getAvailableActions = (quote: EventQuote) => {
    const actions: string[] = ["view", "edit"];

    if (quote.status === "DRAFT" && onSend) {
      actions.push("send");
    }

    if (quote.status === "SENT") {
      if (onAccept) actions.push("accept");
      if (onReject) actions.push("reject");
    }

    if (onDuplicate) {
      actions.push("duplicate");
    }

    actions.push("delete");

    return actions;
  };

  if (isLoading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (quotes.length === 0) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        minHeight="300px"
        textAlign="center"
        p={3}
      >
        <QuoteIcon
          sx={{
            fontSize: 48,
            mb: 2,
          }}
          color="disabled"
        />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Event Quotes Found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first event quote to send proposals to clients.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer
        component={Paper}
        sx={{
          boxShadow: "none",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflowX: "auto",
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                "& .MuiTableCell-head": {
                  bgcolor: "grey.50",
                  borderBottom: 1,
                  borderColor: "divider",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "text.secondary",
                },
              }}
            >
              <TableCell>Quote Details</TableCell>
              <TableCell>Event</TableCell>
              <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                Client
              </TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                Valid Until
              </TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                Created
              </TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quotes.map((quote) => (
              <TableRow
                key={quote.id}
                hover
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "grey.50",
                  },
                  "& .MuiTableCell-root": {
                    borderBottom: 1,
                    borderColor: "divider",
                  },
                }}
              >
                <TableCell>
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight="600"
                      color="text.primary"
                    >
                      Quote v{quote.version}
                    </Typography>
                    {quote.template_details?.name && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        from {quote.template_details.name}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color="text.primary"
                    fontWeight="500"
                  >
                    {quote.event_details?.name || `Event #${quote.event}`}
                  </Typography>
                  {quote.event_details?.start_date && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      display="block"
                    >
                      {format(
                        new Date(quote.event_details.start_date),
                        "MMM d, yyyy",
                      )}
                    </Typography>
                  )}
                </TableCell>
                <TableCell sx={{ display: { xs: "none", lg: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {quote.event_details?.client_name || "Unknown Client"}
                  </Typography>
                </TableCell>
                <TableCell>{getStatusChip(quote.status)}</TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography
                      variant="body2"
                      color="text.primary"
                      fontWeight="600"
                    >
                      {formatCurrency(quote.total_amount)}
                    </Typography>
                    {parseFloat(quote.discount_amount) > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        Discount: -{formatCurrency(quote.discount_amount)}
                      </Typography>
                    )}
                    {parseFloat(quote.vip_discount_amount) > 0 && (
                      <Typography variant="caption" color="secondary.main">
                        VIP: -{formatCurrency(quote.vip_discount_amount)}
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography
                    variant="body2"
                    color={
                      new Date(quote.valid_until) < new Date()
                        ? "error.main"
                        : "text.secondary"
                    }
                  >
                    {format(new Date(quote.valid_until), "MMM d, yyyy")}
                  </Typography>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                  <Typography variant="body2" color="text.secondary">
                    {formatDistanceToNow(new Date(quote.created_at), {
                      addSuffix: true,
                    })}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(event) => handleMenuOpen(event, quote)}
                    disabled={
                      isDeleting ||
                      isSending ||
                      isAccepting ||
                      isRejecting ||
                      isDuplicating
                    }
                  >
                    <MoreIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        PaperProps={{
          sx: {
            mt: 1,
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
          },
        }}
      >
        {selectedQuote &&
          getAvailableActions(selectedQuote).map((action) => {
            const actions: Record<
              string,
              {
                icon: React.ReactElement;
                label: string;
                onClick: () => void;
                color?: string;
              }
            > = {
              view: {
                icon: <ViewIcon sx={{ mr: 1.5, fontSize: 16 }} />,
                label: "View Quote",
                onClick: handleView,
              },
              edit: {
                icon: <EditIcon sx={{ mr: 1.5, fontSize: 16 }} />,
                label: "Edit Quote",
                onClick: handleEdit,
              },
              send: {
                icon: <SendIcon sx={{ mr: 1.5, fontSize: 16 }} />,
                label: "Send to Client",
                onClick: handleSend,
              },
              accept: {
                icon: <AcceptIcon sx={{ mr: 1.5, fontSize: 16 }} />,
                label: "Accept Quote",
                onClick: handleAccept,
                color: "success.main",
              },
              reject: {
                icon: <RejectIcon sx={{ mr: 1.5, fontSize: 16 }} />,
                label: "Reject Quote",
                onClick: handleReject,
                color: "error.main",
              },
              duplicate: {
                icon: <DuplicateIcon sx={{ mr: 1.5, fontSize: 16 }} />,
                label: "Duplicate Quote",
                onClick: handleDuplicate,
              },
              delete: {
                icon: <DeleteIcon sx={{ mr: 1.5, fontSize: 16 }} />,
                label: "Delete Quote",
                onClick: handleDelete,
                color: "error.main",
              },
            };

            const actionConfig = actions[action];
            if (!actionConfig) return null;

            return (
              <MenuItem
                key={action}
                onClick={actionConfig.onClick}
                sx={{
                  fontSize: "0.875rem",
                  color: actionConfig.color || "text.primary",
                  "&:hover": actionConfig.color
                    ? {
                        backgroundColor: `${actionConfig.color}15`,
                      }
                    : undefined,
                }}
              >
                {actionConfig.icon}
                {actionConfig.label}
              </MenuItem>
            );
          })}
      </Menu>
    </>
  );
};
