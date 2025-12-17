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
  Autocomplete,
  Chip,
  Tooltip,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Info as InfoIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useToast } from '../../contexts/ToastContext';
import { useUpdateEventQuote } from '../../hooks/useSales';
import { useProducts } from '../../hooks/useProducts';
import { salesApi } from '../../apis/sales.api';
import type { EventQuote } from '../../types/sales.types';
import type { ProductOption } from '../../types/products.types';

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
  product_id?: number | null;
  // Excess hours breakdown (display only)
  base_unit_price?: string;
  excess_hours?: number | null;
  excess_hour_price?: string | null;
  excess_cost?: string;
}

const QuoteEditDialog: React.FC<QuoteEditDialogProps> = ({
  open,
  onClose,
  quote,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const updateQuoteMutation = useUpdateEventQuote();
  const { products, isLoadingProducts } = useProducts({ is_active: true });

  const [validUntil, setValidUntil] = useState<Date | null>(
    quote.valid_until ? new Date(quote.valid_until) : null
  );
  const [notes, setNotes] = useState(quote.notes || '');
  const [termsAndConditions, setTermsAndConditions] = useState(quote.terms_and_conditions || '');
  const [clientMessage, setClientMessage] = useState(quote.client_message || '');
  const [lineItems, setLineItems] = useState<LineItemFormData[]>([]);
  const [isCalculating, setIsCalculating] = useState<number | null>(null);

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
          product_id: item.product || null,
          base_unit_price: item.base_unit_price,
          excess_hours: item.excess_hours,
          excess_hour_price: item.excess_hour_price,
          excess_cost: item.excess_cost,
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
          product_id: null,
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
        product_id: null,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleProductSelect = async (index: number, product: ProductOption | null) => {
    const updatedItems = [...lineItems];

    if (product && quote.event) {
      setIsCalculating(index);
      try {
        // Call pricing calculation endpoint
        const pricing = await salesApi.calculateLineItemPricing({
          product_id: product.id,
          quantity: updatedItems[index].quantity || 1,
          event_id: quote.event,
        });

        updatedItems[index] = {
          ...updatedItems[index],
          product_id: product.id,
          description: pricing.description,
          unit_price: pricing.unit_price,
          total: parseFloat(pricing.total),
          base_unit_price: pricing.base_unit_price,
          excess_hours: pricing.excess_hours,
          excess_hour_price: pricing.excess_hour_price,
          excess_cost: pricing.excess_cost,
        };
      } catch (error) {
        console.error('Failed to calculate pricing:', error);
        // Fallback to basic product info
        updatedItems[index] = {
          ...updatedItems[index],
          product_id: product.id,
          description: product.name,
          unit_price: product.base_price,
          total: parseFloat(product.base_price) * (updatedItems[index].quantity || 1),
        };
        showToast({ type: 'warning', title: 'Pricing Warning', message: 'Could not calculate excess hours pricing' });
      } finally {
        setIsCalculating(null);
      }
    } else {
      // Clear product selection
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: null,
        base_unit_price: undefined,
        excess_hours: undefined,
        excess_hour_price: undefined,
        excess_cost: undefined,
      };
    }

    setLineItems(updatedItems);
  };

  const handleQuantityChange = async (index: number, quantity: number) => {
    const updatedItems = [...lineItems];
    const item = updatedItems[index];
    updatedItems[index] = { ...item, quantity };

    // If there's a product, recalculate pricing
    if (item.product_id && quote.event) {
      setIsCalculating(index);
      try {
        const pricing = await salesApi.calculateLineItemPricing({
          product_id: item.product_id,
          quantity: quantity,
          event_id: quote.event,
        });

        updatedItems[index] = {
          ...updatedItems[index],
          description: pricing.description,
          unit_price: pricing.unit_price,
          total: parseFloat(pricing.total),
          base_unit_price: pricing.base_unit_price,
          excess_hours: pricing.excess_hours,
          excess_hour_price: pricing.excess_hour_price,
          excess_cost: pricing.excess_cost,
        };
      } catch (error) {
        console.error('Failed to recalculate pricing:', error);
        // Fallback to simple calculation
        updatedItems[index].total = quantity * (parseFloat(item.unit_price) || 0);
      } finally {
        setIsCalculating(null);
      }
    } else {
      // Simple calculation for free-form items
      updatedItems[index].total = quantity * (parseFloat(item.unit_price) || 0);
    }

    setLineItems(updatedItems);
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItemFormData,
    value: string | number
  ) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate total for free-form items (no product)
    if ((field === 'unit_price') && !updatedItems[index].product_id) {
      const unitPrice = parseFloat(value as string) || 0;
      updatedItems[index].total = updatedItems[index].quantity * unitPrice;
    }

    setLineItems(updatedItems);
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const getSelectedProduct = (productId: number | null | undefined): ProductOption | null => {
    if (!productId) return null;
    return products.find((p) => p.id === productId) || null;
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
          ...(item.product_id && { product_id: item.product_id }),
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
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
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
                    <TableCell sx={{ width: '200px' }}>Product</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right" sx={{ width: '80px' }}>
                      Qty
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
                    <React.Fragment key={index}>
                      <TableRow>
                        <TableCell>
                          <Autocomplete
                            size="small"
                            options={products}
                            getOptionLabel={(option) => option.name}
                            value={getSelectedProduct(item.product_id)}
                            onChange={(_, newValue) => handleProductSelect(index, newValue)}
                            loading={isLoadingProducts}
                            disabled={isCalculating === index}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                placeholder="Select product..."
                                variant="outlined"
                              />
                            )}
                            renderOption={(props, option) => (
                              <li {...props} key={option.id}>
                                <Box>
                                  <Typography variant="body2">{option.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {option.formatted_price}
                                    {option.has_excess_hours && option.included_hours && (
                                      <> | {option.included_hours}h included</>
                                    )}
                                  </Typography>
                                </Box>
                              </li>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            value={item.description}
                            onChange={(e) =>
                              handleLineItemChange(index, 'description', e.target.value)
                            }
                            placeholder="Item description"
                            disabled={isCalculating === index}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            fullWidth
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              handleQuantityChange(index, parseInt(e.target.value) || 1)
                            }
                            inputProps={{ min: 1 }}
                            disabled={isCalculating === index}
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
                            disabled={isCalculating === index || !!item.product_id}
                            helperText={item.product_id ? 'Auto-calculated' : undefined}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color={item.total < 0 ? 'success.main' : 'inherit'}>
                            {isCalculating === index ? '...' : `₱${item.total.toFixed(2)}`}
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
                      {/* Excess hours info row */}
                      {item.excess_hours && item.excess_hours > 0 && (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ py: 0.5, borderBottom: 'none' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 2 }}>
                              <Tooltip title="This line item includes excess hours pricing">
                                <InfoIcon fontSize="small" color="info" />
                              </Tooltip>
                              <Chip
                                size="small"
                                label={`Base: ₱${item.base_unit_price}`}
                                variant="outlined"
                              />
                              <Chip
                                size="small"
                                label={`+${item.excess_hours}h excess @ ₱${item.excess_hour_price}/h`}
                                color="warning"
                                variant="outlined"
                              />
                              <Chip
                                size="small"
                                label={`Excess cost: ₱${item.excess_cost}`}
                                color="warning"
                              />
                            </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}
                  <TableRow>
                    <TableCell colSpan={4} align="right">
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
          disabled={updateQuoteMutation.isPending || isCalculating !== null}
        >
          {updateQuoteMutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuoteEditDialog;
