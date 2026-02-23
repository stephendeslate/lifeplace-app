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
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
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

interface VenueInfo {
  venue_id: number;
  venue_name: string;
  included_hours: number;
  excess_hour_price: number;
}

interface VenueHoursBreakdown {
  venue_id: number;
  venue_name: string;
  included_hours: number;
  additional_hours: number;
  excess_hour_price: number;
  venue_cost: number;
}

interface LineItemFormData {
  id?: number;
  description: string;
  quantity: number;
  unit_price: string;
  total: number;
  product_id?: number | null;
  tax_rate?: string;
  // Excess hours breakdown (editable for override)
  base_unit_price?: string;
  excess_hours?: number | null;
  excess_hour_price?: string | null;
  excess_cost?: string;
  has_excess_hours?: boolean;
  is_tax_inclusive?: boolean;
  // Venue-based hours
  venue_additional_hours?: Record<string, number>;
  venue_hours_breakdown?: VenueHoursBreakdown[] | null;
  available_venues?: VenueInfo[];
}

const QuoteEditDialog: React.FC<QuoteEditDialogProps> = ({ open, onClose, quote, onSuccess }) => {
  const { showToast } = useToast();
  const updateQuoteMutation = useUpdateEventQuote();
  const { products, isLoadingProducts } = useProducts({ is_active: true });

  const [validUntil, setValidUntil] = useState<Date | null>(
    quote.valid_until ? new Date(quote.valid_until) : null,
  );
  const [notes, setNotes] = useState(quote.notes || '');
  const [termsAndConditions, setTermsAndConditions] = useState(quote.terms_and_conditions || '');
  const [clientMessage, setClientMessage] = useState(quote.client_message || '');
  const [lineItems, setLineItems] = useState<LineItemFormData[]>([]);
  const [isCalculating, setIsCalculating] = useState<number | null>(null);
  const [overriddenItems, setOverriddenItems] = useState<Set<number>>(new Set());
  const [hasBookingSession, setHasBookingSession] = useState<boolean | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Initialize line items from quote
  useEffect(() => {
    // Clear override state when quote changes
    setOverriddenItems(new Set());

    if (quote.line_items && quote.line_items.length > 0) {
      setLineItems(
        quote.line_items.map((item) => {
          // has_excess_hours is determined by the backend based on venue configuration
          // If excess_hours exists in the response, the item has excess hours
          const hasExcessHours = item.excess_hours !== null && item.excess_hours !== undefined;
          return {
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: parseFloat(item.unit_price) * item.quantity,
            product_id: item.product || null,
            tax_rate: item.tax_rate,
            base_unit_price: item.base_unit_price,
            excess_hours: item.excess_hours,
            excess_hour_price: item.excess_hour_price,
            excess_cost: item.excess_cost,
            has_excess_hours: hasExcessHours,
          };
        }),
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
  }, [quote, products]);

  // Check if the event has a booking session
  useEffect(() => {
    const checkBookingSession = async () => {
      if (quote.event) {
        try {
          const result = await salesApi.getBookingSessionLineItems(quote.event);
          setHasBookingSession(result.has_booking_session);
        } catch {
          setHasBookingSession(false);
        }
      }
    };
    checkBookingSession();
  }, [quote.event]);

  // Handler to import line items from booking session
  const handleImportFromBookingSession = async () => {
    if (!quote.event) return;

    setIsImporting(true);
    try {
      const result = await salesApi.getBookingSessionLineItems(quote.event);
      if (result.has_booking_session && result.line_items && result.line_items.length > 0) {
        // Convert booking session line items to form data format
        const importedItems: LineItemFormData[] = result.line_items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: parseFloat(item.total),
          product_id: item.product_id,
          base_unit_price: item.base_unit_price,
          excess_hours: item.excess_hours,
          excess_hour_price: item.excess_hour_price,
          excess_cost: item.excess_cost,
          has_excess_hours: item.excess_hours !== null && item.excess_hours > 0,
        }));
        setLineItems(importedItems);
        setOverriddenItems(new Set());
        showToast({
          type: 'success',
          title: 'Import Successful',
          message: `Imported ${importedItems.length} line item(s) from booking session`,
        });
      } else {
        showToast({
          type: 'warning',
          title: 'No Items',
          message: 'No line items found in booking session',
        });
      }
    } catch (error) {
      console.error('Failed to import from booking session:', error);
      showToast({
        type: 'error',
        title: 'Import Failed',
        message: 'Failed to import line items from booking session',
      });
    } finally {
      setIsImporting(false);
    }
  };

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

  // Get event_type_id from quote for event-type-specific pricing
  const eventTypeId = quote.event_type || undefined;

  const handleProductSelect = async (index: number, product: ProductOption | null) => {
    const updatedItems = [...lineItems];

    // Clear override status when product changes
    setOverriddenItems((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });

    if (product) {
      setIsCalculating(index);
      try {
        // Fetch venues for this product (with event_type_id for event-type-specific pricing)
        const venues = await salesApi.getProductVenues(product.id, eventTypeId);
        const hasVenues = venues && venues.length > 0;

        // Call pricing calculation endpoint (no venue hours initially, with event_type_id)
        const pricing = await salesApi.calculateLineItemPricing({
          product_id: product.id,
          quantity: updatedItems[index].quantity || 1,
          event_type_id: eventTypeId,
        });

        updatedItems[index] = {
          ...updatedItems[index],
          product_id: product.id,
          description: pricing.description,
          unit_price: pricing.unit_price,
          total: parseFloat(pricing.total),
          tax_rate: pricing.tax_rate,
          base_unit_price: pricing.base_unit_price,
          excess_hours: pricing.excess_hours,
          excess_hour_price: pricing.excess_hour_price,
          excess_cost: pricing.excess_cost,
          has_excess_hours: hasVenues, // Has venues = can add excess hours
          is_tax_inclusive: pricing.is_tax_inclusive,
          venue_additional_hours: {},
          venue_hours_breakdown: pricing.venue_hours_breakdown,
          available_venues: venues,
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
          has_excess_hours: false,
          is_tax_inclusive: product.is_tax_inclusive,
          venue_additional_hours: {},
          available_venues: [],
        };
        showToast({
          type: 'warning',
          title: 'Pricing Warning',
          message: 'Could not calculate excess hours pricing',
        });
      } finally {
        setIsCalculating(null);
      }
    } else {
      // Clear product selection
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: null,
        tax_rate: undefined,
        base_unit_price: undefined,
        excess_hours: undefined,
        excess_hour_price: undefined,
        excess_cost: undefined,
        has_excess_hours: undefined,
        venue_additional_hours: undefined,
        venue_hours_breakdown: undefined,
        available_venues: undefined,
      };
    }

    setLineItems(updatedItems);
  };

  const handleQuantityChange = async (index: number, quantity: number) => {
    const updatedItems = [...lineItems];
    const item = updatedItems[index];
    updatedItems[index] = { ...item, quantity };

    // Clear override status when quantity changes (recalculates from API)
    setOverriddenItems((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });

    // If there's a product, recalculate pricing
    if (item.product_id) {
      setIsCalculating(index);
      try {
        const pricing = await salesApi.calculateLineItemPricing({
          product_id: item.product_id,
          quantity: quantity,
          venue_additional_hours: item.venue_additional_hours,
          event_type_id: eventTypeId,
        });

        updatedItems[index] = {
          ...updatedItems[index],
          description: pricing.description,
          unit_price: pricing.unit_price,
          total: parseFloat(pricing.total),
          tax_rate: pricing.tax_rate,
          base_unit_price: pricing.base_unit_price,
          excess_hours: pricing.excess_hours,
          excess_hour_price: pricing.excess_hour_price,
          excess_cost: pricing.excess_cost,
          is_tax_inclusive: pricing.is_tax_inclusive,
          venue_hours_breakdown: pricing.venue_hours_breakdown,
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

  // Handler for venue hours changes
  const handleVenueHoursChange = async (index: number, venueId: number, hours: number) => {
    const updatedItems = [...lineItems];
    const item = updatedItems[index];

    // Update venue_additional_hours
    const newVenueHours = { ...(item.venue_additional_hours || {}) };
    if (hours > 0) {
      newVenueHours[String(venueId)] = hours;
    } else {
      delete newVenueHours[String(venueId)];
    }

    updatedItems[index] = { ...item, venue_additional_hours: newVenueHours };
    setLineItems(updatedItems);

    // Recalculate pricing with new venue hours
    if (item.product_id) {
      setIsCalculating(index);
      try {
        const pricing = await salesApi.calculateLineItemPricing({
          product_id: item.product_id,
          quantity: item.quantity,
          venue_additional_hours: newVenueHours,
          event_type_id: eventTypeId,
        });

        const finalItems = [...lineItems];
        finalItems[index] = {
          ...finalItems[index],
          venue_additional_hours: newVenueHours,
          description: pricing.description,
          unit_price: pricing.unit_price,
          total: parseFloat(pricing.total),
          base_unit_price: pricing.base_unit_price,
          excess_hours: pricing.excess_hours,
          excess_hour_price: pricing.excess_hour_price,
          excess_cost: pricing.excess_cost,
          venue_hours_breakdown: pricing.venue_hours_breakdown,
        };
        setLineItems(finalItems);
      } catch (error) {
        console.error('Failed to recalculate pricing:', error);
      } finally {
        setIsCalculating(null);
      }
    }
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItemFormData,
    value: string | number,
  ) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate total for free-form items (no product)
    if (field === 'unit_price' && !updatedItems[index].product_id) {
      const unitPrice = parseFloat(value as string) || 0;
      updatedItems[index].total = updatedItems[index].quantity * unitPrice;
    }

    setLineItems(updatedItems);
  };

  // Handler for manual override of pricing fields
  const handlePricingOverride = (
    index: number,
    field: 'unit_price' | 'base_unit_price' | 'excess_hours' | 'excess_hour_price' | 'excess_cost',
    value: string | number,
  ) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    // Recalculate dependent fields based on which field changed
    if (field === 'unit_price') {
      updatedItems[index].total = updatedItems[index].quantity * (parseFloat(value as string) || 0);
    } else if (field === 'base_unit_price' || field === 'excess_cost') {
      // Recalculate unit_price from base + excess
      const base = parseFloat(updatedItems[index].base_unit_price || '0');
      const excess = parseFloat(updatedItems[index].excess_cost || '0');
      updatedItems[index].unit_price = (base + excess).toFixed(2);
      updatedItems[index].total = updatedItems[index].quantity * (base + excess);
    } else if (field === 'excess_hours' || field === 'excess_hour_price') {
      // Recalculate excess_cost from hours * rate
      const hours = parseFloat(String(updatedItems[index].excess_hours || 0));
      const rate = parseFloat(updatedItems[index].excess_hour_price || '0');
      updatedItems[index].excess_cost = (hours * rate).toFixed(2);
      // Then recalculate unit_price and total
      const base = parseFloat(updatedItems[index].base_unit_price || '0');
      updatedItems[index].unit_price = (base + hours * rate).toFixed(2);
      updatedItems[index].total = updatedItems[index].quantity * (base + hours * rate);
    }

    // Mark this item as overridden
    setOverriddenItems((prev) => new Set(prev).add(index));
    setLineItems(updatedItems);
  };

  // Handler to reset a line item to calculated values
  const handleResetToCalculated = async (index: number) => {
    const item = lineItems[index];
    if (!item.product_id) return;

    setIsCalculating(index);
    try {
      const pricing = await salesApi.calculateLineItemPricing({
        product_id: item.product_id,
        quantity: item.quantity,
        venue_additional_hours: item.venue_additional_hours,
        event_type_id: eventTypeId,
      });

      const updatedItems = [...lineItems];
      updatedItems[index] = {
        ...updatedItems[index],
        description: pricing.description,
        unit_price: pricing.unit_price,
        total: parseFloat(pricing.total),
        tax_rate: pricing.tax_rate,
        base_unit_price: pricing.base_unit_price,
        excess_hours: pricing.excess_hours,
        excess_hour_price: pricing.excess_hour_price,
        excess_cost: pricing.excess_cost,
        is_tax_inclusive: pricing.is_tax_inclusive,
        venue_hours_breakdown: pricing.venue_hours_breakdown,
      };
      setLineItems(updatedItems);

      // Clear override status
      setOverriddenItems((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    } catch (error) {
      console.error('Failed to reset pricing:', error);
      showToast({
        type: 'error',
        title: 'Reset Failed',
        message: 'Could not reset to calculated values',
      });
    } finally {
      setIsCalculating(null);
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTaxAmount = () => {
    return lineItems.reduce((sum, item) => {
      // Skip tax-inclusive items (tax already in price)
      if (item.is_tax_inclusive) return sum;
      const taxRate = parseFloat(item.tax_rate || '0') / 100;
      return sum + item.total * taxRate;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxAmount();
  };

  const getSelectedProduct = (productId: number | null | undefined): ProductOption | null => {
    if (!productId) return null;
    return products.find((p) => p.id === productId) || null;
  };

  const handleSubmit = async () => {
    // Validation
    const hasInvalidLineItem = lineItems.some(
      (item) => !item.description.trim() || item.quantity <= 0,
    );

    if (hasInvalidLineItem) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all line item fields correctly',
      });
      return;
    }

    const subtotal = calculateSubtotal();
    if (subtotal < 0) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Quote total cannot be negative',
      });
      return;
    }

    try {
      const updateData = {
        ...(validUntil && { valid_until: validUntil.toISOString().split('T')[0] }),
        notes,
        terms_and_conditions: termsAndConditions,
        client_message: clientMessage,
        line_items: lineItems.map((item, index) => ({
          ...(item.id && { id: item.id }),
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          ...(item.product_id && { product_id: item.product_id }),
          // Include venue_additional_hours for recalculation
          ...(item.venue_additional_hours &&
            Object.keys(item.venue_additional_hours).length > 0 && {
              venue_additional_hours: item.venue_additional_hours,
            }),
          // Include excess hours fields if item was overridden (to preserve overridden values)
          ...(overriddenItems.has(index) && {
            skip_recalculation: true,
            base_unit_price: item.base_unit_price,
            excess_hours: item.excess_hours,
            excess_hour_price: item.excess_hour_price,
            excess_cost: item.excess_cost,
          }),
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
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}
            >
              <Typography variant="h6">Line Items</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {hasBookingSession && (
                  <Tooltip title="Import line items from the booking session that created this event">
                    <Button
                      startIcon={<DownloadIcon />}
                      onClick={handleImportFromBookingSession}
                      variant="outlined"
                      size="small"
                      color="secondary"
                      disabled={isImporting}
                    >
                      {isImporting ? 'Importing...' : 'Import from Booking'}
                    </Button>
                  </Tooltip>
                )}
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddLineItem}
                  variant="outlined"
                  size="small"
                >
                  Add Item
                </Button>
              </Box>
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
                    <TableCell align="right" sx={{ width: '80px' }}>
                      Tax %
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Autocomplete
                              size="small"
                              options={products}
                              getOptionLabel={(option) => option.name}
                              value={getSelectedProduct(item.product_id)}
                              onChange={(_, newValue) => handleProductSelect(index, newValue)}
                              loading={isLoadingProducts}
                              disabled={isCalculating === index}
                              sx={{ flex: 1 }}
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
                                    </Typography>
                                  </Box>
                                </li>
                              )}
                            />
                            {overriddenItems.has(index) && (
                              <Chip
                                size="small"
                                label="Overridden"
                                color="warning"
                                variant="filled"
                              />
                            )}
                          </Box>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TextField
                              fullWidth
                              size="small"
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => {
                                if (item.product_id) {
                                  handlePricingOverride(index, 'unit_price', e.target.value);
                                } else {
                                  handleLineItemChange(index, 'unit_price', e.target.value);
                                }
                              }}
                              inputProps={{ step: '0.01' }}
                              disabled={isCalculating === index}
                              sx={
                                overriddenItems.has(index)
                                  ? {
                                      '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'warning.main' },
                                      },
                                    }
                                  : undefined
                              }
                            />
                            {item.product_id && overriddenItems.has(index) && (
                              <Tooltip title="Reset to calculated value">
                                <IconButton
                                  size="small"
                                  onClick={() => handleResetToCalculated(index)}
                                  color="warning"
                                >
                                  <RefreshIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {item.is_tax_inclusive ? (
                            <Tooltip title="Tax already included in price">
                              <Chip size="small" label="Incl." color="info" variant="outlined" />
                            </Tooltip>
                          ) : (
                            <TextField
                              size="small"
                              type="number"
                              value={item.tax_rate || ''}
                              onChange={(e) =>
                                handleLineItemChange(index, 'tax_rate', e.target.value)
                              }
                              inputProps={{ step: '0.01', min: 0 }}
                              sx={{ width: '70px' }}
                              disabled={isCalculating === index}
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={item.total < 0 ? 'success.main' : 'inherit'}
                          >
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
                      {/* Venue hours selection row - only shown for products with venues */}
                      {item.product_id &&
                        item.has_excess_hours &&
                        item.available_venues &&
                        item.available_venues.length > 0 && (
                          <TableRow>
                            <TableCell
                              colSpan={7}
                              sx={{ py: 1.5, borderBottom: 'none', bgcolor: 'action.hover' }}
                            >
                              <Box sx={{ pl: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                  <Tooltip title="Set additional hours per venue to calculate excess charges">
                                    <InfoIcon fontSize="small" color="info" />
                                  </Tooltip>
                                  <Typography variant="caption" color="text.secondary">
                                    Additional Hours by Venue
                                  </Typography>
                                  {item.excess_hours != null && item.excess_hours > 0 && (
                                    <Chip
                                      size="small"
                                      label={`Total: ${item.excess_hours}h = ₱${item.excess_cost || '0.00'}`}
                                      color="primary"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                  {item.available_venues.map((venue) => {
                                    const currentHours =
                                      item.venue_additional_hours?.[String(venue.venue_id)] || 0;
                                    return (
                                      <Box
                                        key={venue.venue_id}
                                        sx={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 1,
                                          p: 1,
                                          border: 1,
                                          borderColor:
                                            currentHours > 0 ? 'primary.main' : 'divider',
                                          borderRadius: 1,
                                          bgcolor: 'background.paper',
                                        }}
                                      >
                                        <Box sx={{ minWidth: 120 }}>
                                          <Typography variant="body2" fontWeight="medium">
                                            {venue.venue_name}
                                          </Typography>
                                          <Typography variant="caption" color="text.secondary">
                                            {venue.included_hours}h incl. | ₱
                                            {venue.excess_hour_price}/h extra
                                          </Typography>
                                        </Box>
                                        <Box
                                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                                        >
                                          <IconButton
                                            size="small"
                                            onClick={() =>
                                              handleVenueHoursChange(
                                                index,
                                                venue.venue_id,
                                                Math.max(0, currentHours - 1),
                                              )
                                            }
                                            disabled={isCalculating === index || currentHours === 0}
                                          >
                                            <Typography variant="body1" fontWeight="bold">
                                              −
                                            </Typography>
                                          </IconButton>
                                          <TextField
                                            size="small"
                                            type="number"
                                            value={currentHours}
                                            onChange={(e) =>
                                              handleVenueHoursChange(
                                                index,
                                                venue.venue_id,
                                                Math.max(0, parseInt(e.target.value) || 0),
                                              )
                                            }
                                            disabled={isCalculating === index}
                                            inputProps={{
                                              min: 0,
                                              style: { textAlign: 'center', width: '40px' },
                                            }}
                                            sx={{ '& input': { p: 0.5 } }}
                                          />
                                          <IconButton
                                            size="small"
                                            onClick={() =>
                                              handleVenueHoursChange(
                                                index,
                                                venue.venue_id,
                                                currentHours + 1,
                                              )
                                            }
                                            disabled={isCalculating === index}
                                          >
                                            <Typography variant="body1" fontWeight="bold">
                                              +
                                            </Typography>
                                          </IconButton>
                                        </Box>
                                        {currentHours > 0 && (
                                          <Chip
                                            size="small"
                                            label={`₱${(currentHours * venue.excess_hour_price).toFixed(2)}`}
                                            color="primary"
                                            variant="filled"
                                          />
                                        )}
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </Box>
                            </TableCell>
                          </TableRow>
                        )}
                    </React.Fragment>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} align="right">
                      <Typography variant="body2">Subtotal:</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">₱{calculateSubtotal().toFixed(2)}</Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} align="right">
                      <Typography variant="body2" color="text.secondary">
                        Tax:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color="text.secondary">
                        ₱{calculateTaxAmount().toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell />
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={5} align="right">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Total:
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="subtitle1" fontWeight="bold">
                        ₱{calculateTotal().toFixed(2)}
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
