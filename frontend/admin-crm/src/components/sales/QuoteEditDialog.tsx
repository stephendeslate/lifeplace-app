import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useToast } from '../../contexts/ToastContext';
import { useUpdateEventQuote } from '../../hooks/useSales';
import type { EventQuote } from '../../types/sales.types';

interface QuoteEditDialogProps {
  open: boolean;
  onClose: () => void;
  quote: EventQuote;
  onSuccess: () => void;
}

interface LineItemFormData {
  id?: number;
  description: string;
  quantity: number;
  unit_price: string;
  total: number;
}

const QuoteEditDialog: React.FC<QuoteEditDialogProps> = ({
  open,
  onClose,
  quote,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const updateQuoteMutation = useUpdateEventQuote();

  const [validUntil, setValidUntil] = useState<Date | null>(
    quote.valid_until ? new Date(quote.valid_until) : null
  );
  const [notes, setNotes] = useState(quote.notes || '');
  const [termsAndConditions, setTermsAndConditions] = useState(quote.terms_and_conditions || '');
  const [clientMessage, setClientMessage] = useState(quote.client_message || '');
  const [lineItems, setLineItems] = useState<LineItemFormData[]>([]);

  // Initialize line items from quote
  useEffect(() => {
    if (quote.line_items && quote.line_items.length > 0) {
      setLineItems(
        quote.line_items.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: parseFloat(item.unit_price) * item.quantity,
        }))
      );
    } else {
      // Initialize with at least one empty line item
      setLineItems([
        {
          description: '',
          quantity: 1,
          unit_price: '0.00',
          total: 0,
        },
      ]);
    }
  }, [quote]);

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: 1,
        unit_price: '0.00',
        total: 0,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItemFormData,
    value: string | number
  ) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate total for this line item
    if (field === 'quantity' || field === 'unit_price') {
      const quantity = field === 'quantity' ? (value as number) : updatedItems[index].quantity;
      const unitPrice =
        field === 'unit_price'
          ? parseFloat(value as string) || 0
          : parseFloat(updatedItems[index].unit_price) || 0;
      updatedItems[index].total = quantity * unitPrice;
    }

    setLineItems(updatedItems);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSubmit = async () => {
    // Validation
    const hasInvalidLineItem = lineItems.some(
      (item) => !item.description.trim() || item.quantity <= 0
    );

    if (hasInvalidLineItem) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Please fill in all line item fields correctly' });
      return;
    }

    const subtotal = calculateSubtotal();
    if (subtotal < 0) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Quote total cannot be negative' });
      return;
    }

    try {
      const updateData = {
        ...(validUntil && { valid_until: validUntil.toISOString().split('T')[0] }),
        notes,
        terms_and_conditions: termsAndConditions,
        client_message: clientMessage,
        line_items: lineItems.map((item) => ({
          ...(item.id && { id: item.id }),
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
      };

      await updateQuoteMutation.mutateAsync({
        id: quote.id,
        data: updateData,
      });

      showToast({ type: 'success', title: 'Quote Updated', message: 'Quote updated successfully' });
      onSuccess();
    } catch (error) {
      showToast({ type: 'error', title: 'Update Failed', message: 'Failed to update quote' });
      console.error('Error updating quote:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Quote #{quote.id}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
          {/* Valid Until Date */}
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Valid Until"
              value={validUntil}
              onChange={(newValue) => setValidUntil(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: 'Date until which this quote is valid',
                },
              }}
            />
          </LocalizationProvider>

          {/* Line Items */}
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Line Items</Typography>
              <Button
                startIcon={<AddIcon />}
                onClick={handleAddLineItem}
                variant="outlined"
                size="small"
              >
                Add Item
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Description</TableCell>
                    <TableCell align="right" sx={{ width: '100px' }}>
                      Quantity
                    </TableCell>
                    <TableCell align="right" sx={{ width: '120px' }}>
                      Unit Price
                    </TableCell>
                    <TableCell align="right" sx={{ width: '120px' }}>
                      Total
                    </TableCell>
                    <TableCell align="center" sx={{ width: '60px' }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          value={item.description}
                          onChange={(e) =>
                            handleLineItemChange(index, 'description', e.target.value)
                          }
                          placeholder="Item description"
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 1)
                          }
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          value={item.unit_price}
                          onChange={(e) =>
                            handleLineItemChange(index, 'unit_price', e.target.value)
                          }
                          inputProps={{ step: '0.01' }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={item.total < 0 ? 'success.main' : 'inherit'}>
                          ₱{item.total.toFixed(2)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveLineItem(index)}
                          disabled={lineItems.length === 1}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={3} align="right">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Subtotal:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle1" fontWeight="bold">
                        ₱{calculateSubtotal().toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Notes */}
          <TextField
            label="Internal Notes"
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            helperText="Internal notes (not visible to client)"
          />

          {/* Client Message */}
          <TextField
            label="Message to Client"
            multiline
            rows={3}
            value={clientMessage}
            onChange={(e) => setClientMessage(e.target.value)}
            fullWidth
            helperText="Optional message to include with the quote"
          />

          {/* Terms and Conditions */}
          <TextField
            label="Terms & Conditions"
            multiline
            rows={4}
            value={termsAndConditions}
            onChange={(e) => setTermsAndConditions(e.target.value)}
            fullWidth
            helperText="Quote terms and conditions"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={updateQuoteMutation.isPending}
        >
          {updateQuoteMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuoteEditDialog;
