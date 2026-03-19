import React from 'react';
import {
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
  TextField,
  Button,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import type { ProductOption } from '@/types/products.types';
import type { LineItemFormData } from './types';
import { VenueHoursRow } from './VenueHoursRow';

interface LineItemsTableProps {
  lineItems: LineItemFormData[];
  products: ProductOption[];
  isLoadingProducts: boolean;
  isCalculating: number | null;
  overriddenItems: Set<number>;
  hasBookingSession: boolean | null;
  isImporting: boolean;
  subtotal: number;
  taxAmount: number;
  total: number;
  getSelectedProduct: (productId: number | null | undefined) => ProductOption | null;
  onAddLineItem: () => void;
  onRemoveLineItem: (index: number) => void;
  onProductSelect: (index: number, product: ProductOption | null) => void;
  onQuantityChange: (index: number, quantity: number) => void;
  onLineItemChange: (index: number, field: keyof LineItemFormData, value: string | number) => void;
  onPricingOverride: (
    index: number,
    field: 'unit_price' | 'base_unit_price' | 'excess_hours' | 'excess_hour_price' | 'excess_cost',
    value: string | number,
  ) => void;
  onResetToCalculated: (index: number) => void;
  onImportFromBookingSession: () => void;
  onVenueHoursChange: (index: number, venueId: number, hours: number) => void;
}

export const LineItemsTable: React.FC<LineItemsTableProps> = ({
  lineItems,
  products,
  isLoadingProducts,
  isCalculating,
  overriddenItems,
  hasBookingSession,
  isImporting,
  subtotal,
  taxAmount,
  total,
  getSelectedProduct,
  onAddLineItem,
  onRemoveLineItem,
  onProductSelect,
  onQuantityChange,
  onLineItemChange,
  onPricingOverride,
  onResetToCalculated,
  onImportFromBookingSession,
  onVenueHoursChange,
}) => {
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Line Items</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {hasBookingSession && (
            <Tooltip title="Import line items from the booking session that created this event">
              <Button
                startIcon={<DownloadIcon />}
                onClick={onImportFromBookingSession}
                variant="outlined"
                size="small"
                color="secondary"
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Import from Booking'}
              </Button>
            </Tooltip>
          )}
          <Button startIcon={<AddIcon />} onClick={onAddLineItem} variant="outlined" size="small">
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
                        onChange={(_, newValue) => onProductSelect(index, newValue)}
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
                        <Chip size="small" label="Overridden" color="warning" variant="filled" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <TextField
                      fullWidth
                      size="small"
                      value={item.description}
                      onChange={(e) => onLineItemChange(index, 'description', e.target.value)}
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
                      onChange={(e) => onQuantityChange(index, parseInt(e.target.value) || 1)}
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
                            onPricingOverride(index, 'unit_price', e.target.value);
                          } else {
                            onLineItemChange(index, 'unit_price', e.target.value);
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
                            onClick={() => onResetToCalculated(index)}
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
                        onChange={(e) => onLineItemChange(index, 'tax_rate', e.target.value)}
                        inputProps={{ step: '0.01', min: 0 }}
                        sx={{ width: '70px' }}
                        disabled={isCalculating === index}
                      />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color={item.total < 0 ? 'success.main' : 'inherit'}>
                      {isCalculating === index ? '...' : `₱${item.total.toFixed(2)}`}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      onClick={() => onRemoveLineItem(index)}
                      disabled={lineItems.length === 1}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
                {item.product_id &&
                  item.has_excess_hours &&
                  item.available_venues &&
                  item.available_venues.length > 0 && (
                    <VenueHoursRow
                      item={item}
                      index={index}
                      isCalculating={isCalculating}
                      onVenueHoursChange={onVenueHoursChange}
                    />
                  )}
              </React.Fragment>
            ))}
            {/* Totals */}
            <TableRow>
              <TableCell colSpan={5} align="right">
                <Typography variant="body2">Subtotal:</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2">₱{subtotal.toFixed(2)}</Typography>
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
                  ₱{taxAmount.toFixed(2)}
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
                  ₱{total.toFixed(2)}
                </Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
