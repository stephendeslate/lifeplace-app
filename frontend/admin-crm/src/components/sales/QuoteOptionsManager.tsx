// frontend/admin-crm/src/components/sales/QuoteOptionsManager.tsx

import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  TextField,
  Stack,
  Chip,
  CircularProgress,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useQuoteOptions, useCreateQuoteOption } from '../../hooks/useSales';
import { useCurrencySettings } from '../../hooks/useCurrency';
import { formatCurrency } from '../../utils/currency';
import type { QuoteOption, CreateQuoteOptionData } from '../../types/sales.types';
import { useToast } from '../../contexts/ToastContext';

interface QuoteOptionsManagerProps {
  quoteId: number;
  onOptionSelect?: (option: QuoteOption) => void;
  readOnly?: boolean;
}

export const QuoteOptionsManager: React.FC<QuoteOptionsManagerProps> = ({
  quoteId,
  onOptionSelect,
  readOnly = false,
}) => {
  const { showToast } = useToast();
  const { settings: currencySettings } = useCurrencySettings();
  const { data: options, isLoading, refetch } = useQuoteOptions(quoteId);
  const createOptionMutation = useCreateQuoteOption();

  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(new Set());
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newOption, setNewOption] = useState({
    name: '',
    description: '',
    items: [{ description: '', quantity: '1', unit_price: '0', total: '0' }] as Array<{
      description: string;
      quantity: string;
      unit_price: string;
      total: string;
    }>,
  });

  const formatAmount = (amount: string | number) => {
    const currency = currencySettings?.defaultCurrency || 'PHP';
    return formatCurrency(amount, currency, {
      showSymbol: currencySettings?.displayFormat !== 'code',
      showCode: currencySettings?.displayFormat === 'code' || currencySettings?.displayFormat === 'both',
      minimumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
      maximumFractionDigits: currencySettings?.decimalPlaces ?? (currency === 'PHP' ? 0 : 2),
    });
  };

  const toggleOptionExpanded = (optionId: number) => {
    setExpandedOptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(optionId)) {
        newSet.delete(optionId);
      } else {
        newSet.add(optionId);
      }
      return newSet;
    });
  };

  const handleAddItem = () => {
    setNewOption(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: '1', unit_price: '0', total: '0' }],
    }));
  };

  const handleRemoveItem = (index: number) => {
    setNewOption(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    setNewOption(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [field]: value };

      // Auto-calculate total
      if (field === 'quantity' || field === 'unit_price') {
        const qty = parseFloat(items[index].quantity) || 0;
        const price = parseFloat(items[index].unit_price) || 0;
        items[index].total = (qty * price).toFixed(2);
      }

      return { ...prev, items };
    });
  };

  const handleCreateOption = async () => {
    if (!newOption.name.trim()) {
      showToast({ type: 'error', title: 'Error', message: 'Option name is required' });
      return;
    }

    if (newOption.items.length === 0 || newOption.items.every(item => !item.description.trim())) {
      showToast({ type: 'error', title: 'Error', message: 'At least one item is required' });
      return;
    }

    try {
      const data: CreateQuoteOptionData = {
        quote: quoteId,
        name: newOption.name,
        description: newOption.description,
        items: newOption.items
          .filter(item => item.description.trim())
          .map(item => ({
            description: item.description,
            quantity: parseInt(item.quantity) || 1,
            unit_price: item.unit_price,
            total: item.total,
          })),
      };

      await createOptionMutation.mutateAsync(data);
      setCreateDialogOpen(false);
      setNewOption({
        name: '',
        description: '',
        items: [{ description: '', quantity: '1', unit_price: '0', total: '0' }],
      });
      refetch();
    } catch {
      showToast({ type: 'error', title: 'Error', message: 'Failed to create option' });
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Pricing Options</Typography>
        {!readOnly && (
          <Button
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
            variant="outlined"
            size="small"
          >
            Add Option
          </Button>
        )}
      </Box>

      {(!options || options.length === 0) ? (
        <Typography color="text.secondary" variant="body2">
          No pricing options defined. {!readOnly && 'Add options to offer different pricing packages.'}
        </Typography>
      ) : (
        <Stack spacing={2}>
          {options.map((option: QuoteOption) => (
            <Card key={option.id} variant="outlined">
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {option.name}
                      </Typography>
                      {option.is_selected && (
                        <Chip
                          label="Selected"
                          size="small"
                          color="success"
                          icon={<CheckIcon />}
                        />
                      )}
                    </Box>
                    {option.description && (
                      <Typography variant="body2" color="text.secondary">
                        {option.description}
                      </Typography>
                    )}
                  </Box>
                  <Typography variant="h6" color="primary.main">
                    {formatAmount(option.total_price)}
                  </Typography>
                </Box>

                {/* Expandable items section */}
                {option.items && option.items.length > 0 && (
                  <>
                    <Button
                      size="small"
                      onClick={() => toggleOptionExpanded(option.id)}
                      endIcon={expandedOptions.has(option.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ mt: 1 }}
                    >
                      {option.items.length} items
                    </Button>
                    <Collapse in={expandedOptions.has(option.id)}>
                      <TableContainer component={Paper} variant="outlined" sx={{ mt: 1 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Description</TableCell>
                              <TableCell align="right">Qty</TableCell>
                              <TableCell align="right">Price</TableCell>
                              <TableCell align="right">Total</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {option.items.map((item, index) => (
                              <TableRow key={index}>
                                <TableCell>{item.description}</TableCell>
                                <TableCell align="right">{item.quantity}</TableCell>
                                <TableCell align="right">{formatAmount(item.unit_price)}</TableCell>
                                <TableCell align="right">{formatAmount(item.total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Collapse>
                  </>
                )}
              </CardContent>
              {onOptionSelect && !readOnly && (
                <CardActions>
                  <Button
                    size="small"
                    variant={option.is_selected ? 'contained' : 'outlined'}
                    onClick={() => onOptionSelect(option)}
                    startIcon={option.is_selected ? <CheckIcon /> : undefined}
                  >
                    {option.is_selected ? 'Selected' : 'Select Option'}
                  </Button>
                </CardActions>
              )}
            </Card>
          ))}
        </Stack>
      )}

      {/* Create Option Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Pricing Option</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Option Name"
              value={newOption.name}
              onChange={(e) => setNewOption(prev => ({ ...prev, name: e.target.value }))}
              fullWidth
              required
              placeholder="e.g., Premium Package, Basic Package"
            />
            <TextField
              label="Description"
              value={newOption.description}
              onChange={(e) => setNewOption(prev => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={2}
              placeholder="Describe what's included in this option"
            />

            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Items</Typography>
                <Button startIcon={<AddIcon />} size="small" onClick={handleAddItem}>
                  Add Item
                </Button>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Description</TableCell>
                      <TableCell sx={{ width: 100 }}>Qty</TableCell>
                      <TableCell sx={{ width: 120 }}>Unit Price</TableCell>
                      <TableCell sx={{ width: 120 }}>Total</TableCell>
                      <TableCell sx={{ width: 50 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {newOption.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            value={item.description}
                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                            size="small"
                            fullWidth
                            placeholder="Item description"
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            size="small"
                            type="number"
                            inputProps={{ min: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            value={item.unit_price}
                            onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                            size="small"
                            type="number"
                            inputProps={{ min: 0, step: 0.01 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {formatAmount(item.total)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {newOption.items.length > 1 && (
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveItem(index)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateOption}
            variant="contained"
            disabled={createOptionMutation.isPending}
          >
            {createOptionMutation.isPending ? 'Creating...' : 'Create Option'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default QuoteOptionsManager;
