// frontend/client-portal/src/components/payments/PaymentViewer.tsx

import React from "react";
import {
  Box,
  Typography,
  Divider,
  Chip,
  Stack,
  alpha,
  Button,
} from "@mui/material";
import {
  Payment as PaymentIcon,
  CheckCircle as PaidIcon,
  Schedule as PendingIcon,
  Error as FailedIcon,
  CreditCard as CardIcon,
  AccountBalance as BankIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import { GlassCard } from "../../design-system/components/GlassCard";
import type { Payment } from "../../types/financial.types";
import FinancialApi from "../../apis/financial.api";

interface PaymentViewerProps {
  payment: Payment;
  showDetails?: boolean;
  showMetadata?: boolean;
  compact?: boolean;
  onDownloadReceipt?: () => void;
  downloadingReceipt?: boolean;
}

export const PaymentViewer: React.FC<PaymentViewerProps> = ({
  payment,
  showDetails = true,
  showMetadata = true,
  compact = false,
  onDownloadReceipt,
  downloadingReceipt = false,
}) => {
  const getStatusIcon = () => {
    switch (payment.status?.toUpperCase()) {
      case "PAID":
      case "COMPLETED":
        return <PaidIcon color="success" />;
      case "PENDING":
        return <PendingIcon color="warning" />;
      case "FAILED":
        return <FailedIcon color="error" />;
      default:
        return <PaymentIcon />;
    }
  };

  const getPaymentMethodIcon = () => {
    const method =
      payment.payment_method_details?.type ||
      payment.inferred_payment_method?.type;
    switch (method) {
      case "CREDIT_CARD":
        return <CardIcon />;
      case "BANK_TRANSFER":
        return <BankIcon />;
      case "DIGITAL_WALLET":
        return <CardIcon />; // Use card icon for digital wallets like GCash/PayPal
      default:
        return <PaymentIcon />;
    }
  };

  const statusColor = FinancialApi.getStatusColor(payment.status);

  return (
    <GlassCard
      variant="light"
      intensity="subtle"
      sx={{
        border: `1px solid ${alpha("#fff", 0.1)}`,
        overflow: "hidden",
      }}
    >
      <Box sx={{ p: compact ? 2 : 3 }}>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          flexWrap="wrap"
          gap={1}
          mb={2}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant={compact ? "h6" : "h5"}
              sx={{ fontWeight: 600, mb: 1 }}
            >
              {payment.description || payment.payment_number}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Payment #{payment.payment_number}
            </Typography>
            {payment.event_details && (
              <Typography
                variant="body2"
                sx={{ color: "primary.main", mt: 0.5 }}
              >
                Event #{payment.event_details.id}
              </Typography>
            )}
          </Box>
          <Chip
            icon={getStatusIcon()}
            label={payment.status_display}
            color={statusColor}
            variant="outlined"
            sx={{
              backgroundColor: alpha("#fff", 0.1),
              backdropFilter: "blur(5px)",
              flexShrink: 0,
            }}
          />
        </Stack>

        {showDetails && (
          <>
            <Divider sx={{ my: 2, borderColor: alpha("#fff", 0.1) }} />

            {/* Payment Amount */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Amount
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 600, color: "primary.main" }}
                >
                  {FinancialApi.formatAmount(payment.amount, payment.currency)}
                </Typography>
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Payment Method
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  {getPaymentMethodIcon()}
                  <Typography variant="body1">
                    {payment.payment_method_details?.type_display ||
                      payment.inferred_payment_method?.type_display ||
                      (payment.is_manual ? "Manual Payment" : "Not specified")}
                  </Typography>
                </Stack>
              </Box>
            </Stack>

            {showMetadata && (
              <>
                <Divider sx={{ my: 2, borderColor: alpha("#fff", 0.1) }} />

                {/* Metadata */}
                <Stack spacing={3}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={3}>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Payment Date
                      </Typography>
                      <Typography variant="body1">
                        {payment.paid_on
                          ? new Date(payment.paid_on).toLocaleDateString()
                          : "Not paid"}
                      </Typography>
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Due Date
                      </Typography>
                      <Typography variant="body1">
                        {new Date(payment.due_date).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </Stack>

                  {(payment.payment_method_details ||
                    payment.inferred_payment_method) && (
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Payment Details
                      </Typography>
                      <Typography variant="body2">
                        Method:{" "}
                        {payment.payment_method_details?.type_display ||
                          payment.inferred_payment_method?.type_display}
                        {payment.payment_method_details?.last_four &&
                          ` ending in ${payment.payment_method_details.last_four}`}
                        {payment.inferred_payment_method &&
                          ` via ${payment.inferred_payment_method.gateway_name}`}
                      </Typography>
                    </Box>
                  )}

                  {payment.notes && (
                    <Box>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        Notes
                      </Typography>
                      <Typography variant="body2">{payment.notes}</Typography>
                    </Box>
                  )}
                </Stack>
              </>
            )}

            {/* Actions */}
            {payment.receipt_number && onDownloadReceipt && (
              <>
                <Divider sx={{ my: 2, borderColor: alpha("#fff", 0.1) }} />
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    startIcon={
                      downloadingReceipt ? undefined : <DownloadIcon />
                    }
                    onClick={onDownloadReceipt}
                    disabled={downloadingReceipt}
                    sx={{
                      backgroundColor: alpha("#fff", 0.1),
                      border: `1px solid ${alpha("#fff", 0.2)}`,
                      "&:hover": {
                        backgroundColor: alpha("#fff", 0.15),
                      },
                    }}
                  >
                    {downloadingReceipt ? "Downloading..." : "Download Receipt"}
                  </Button>
                </Stack>
              </>
            )}
          </>
        )}
      </Box>
    </GlassCard>
  );
};

export default PaymentViewer;
