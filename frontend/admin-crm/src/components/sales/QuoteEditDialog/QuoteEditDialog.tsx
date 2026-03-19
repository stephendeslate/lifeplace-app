import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import type { QuoteEditDialogProps } from './types';
import { useQuoteEditLogic } from './useQuoteEditLogic';
import { LineItemsTable } from './LineItemsTable';

const QuoteEditDialog: React.FC<QuoteEditDialogProps> = ({ open, onClose, quote, onSuccess }) => {
  const logic = useQuoteEditLogic(quote, onSuccess);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Edit Quote #{quote.id}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          {/* Valid Until Date */}
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Valid Until"
              value={logic.validUntil}
              onChange={(newValue) => logic.setValidUntil(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'Date until which this quote is valid',
                },
              }}
            />
          </LocalizationProvider>

          {/* Line Items */}
          <LineItemsTable
            lineItems={logic.lineItems}
            products={logic.products}
            isLoadingProducts={logic.isLoadingProducts}
            isCalculating={logic.isCalculating}
            overriddenItems={logic.overriddenItems}
            hasBookingSession={logic.hasBookingSession}
            isImporting={logic.isImporting}
            subtotal={logic.calculateSubtotal()}
            taxAmount={logic.calculateTaxAmount()}
            total={logic.calculateTotal()}
            getSelectedProduct={logic.getSelectedProduct}
            onAddLineItem={logic.handleAddLineItem}
            onRemoveLineItem={logic.handleRemoveLineItem}
            onProductSelect={logic.handleProductSelect}
            onQuantityChange={logic.handleQuantityChange}
            onLineItemChange={logic.handleLineItemChange}
            onPricingOverride={logic.handlePricingOverride}
            onResetToCalculated={logic.handleResetToCalculated}
            onImportFromBookingSession={logic.handleImportFromBookingSession}
            onVenueHoursChange={logic.handleVenueHoursChange}
          />

          {/* Notes */}
          <TextField
            label="Internal Notes"
            multiline
            rows={3}
            value={logic.notes}
            onChange={(e) => logic.setNotes(e.target.value)}
            fullWidth
            helperText="Internal notes (not visible to client)"
          />

          {/* Client Message */}
          <TextField
            label="Message to Client"
            multiline
            rows={3}
            value={logic.clientMessage}
            onChange={(e) => logic.setClientMessage(e.target.value)}
            fullWidth
            helperText="Optional message to include with the quote"
          />

          {/* Terms and Conditions */}
          <TextField
            label="Terms & Conditions"
            multiline
            rows={4}
            value={logic.termsAndConditions}
            onChange={(e) => logic.setTermsAndConditions(e.target.value)}
            fullWidth
            helperText="Quote terms and conditions"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={logic.handleSubmit}
          variant="contained"
          disabled={logic.updateQuoteMutation.isPending || logic.isCalculating !== null}
        >
          {logic.updateQuoteMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuoteEditDialog;
