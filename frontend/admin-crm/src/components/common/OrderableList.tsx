// frontend/admin-crm/src/components/common/OrderableList.tsx

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Typography,
  Button,
  Alert,
  Stack,
  Chip,
  CircularProgress,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Save as SaveIcon,
  Undo as UndoIcon,
  Warning as WarningIcon,
  Numbers as NumbersIcon,
} from '@mui/icons-material';

interface OrderableItem {
  id: string | number;
  order?: number;
  [key: string]: unknown;
}

interface OrderableListProps<T extends OrderableItem> {
  items: T[];
  onReorder: (items: T[]) => Promise<void> | void;
  renderItem: (item: T, index: number) => React.ReactNode;
  maxOrder?: number;
  minOrder?: number;
  showAutoFix?: boolean;
  containerProps?: Record<string, unknown>;
}

export function OrderableList<T extends OrderableItem>({
  items,
  onReorder,
  renderItem,
  maxOrder = 999,
  minOrder = 1,
  showAutoFix = true,
  containerProps = {},
}: OrderableListProps<T>) {
  const [orderedItems, setOrderedItems] = useState<T[]>([]);
  const [orderInputs, setOrderInputs] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setOrderedItems(sorted);

    // Initialize order inputs
    const inputs: Record<string, string> = {};
    sorted.forEach((item, index) => {
      inputs[String(item.id)] = String(item.order ?? index + 1);
    });
    setOrderInputs(inputs);
    setHasChanges(false);
    setErrors({});
  }, [items]);

  const handleOrderChange = (itemId: string | number, value: string) => {
    const id = String(itemId);

    // Allow empty input while typing
    if (value === '') {
      setOrderInputs((prev) => ({ ...prev, [id]: value }));
      setErrors((prev) => ({ ...prev, [id]: 'Order is required' }));
      setHasChanges(true);
      return;
    }

    const numValue = parseInt(value);

    // Validate input
    if (isNaN(numValue)) {
      setErrors((prev) => ({ ...prev, [id]: 'Must be a number' }));
      setOrderInputs((prev) => ({ ...prev, [id]: value }));
      setHasChanges(true);
      return;
    }

    if (numValue < minOrder || numValue > maxOrder) {
      setErrors((prev) => ({
        ...prev,
        [id]: `Must be between ${minOrder} and ${maxOrder}`,
      }));
      setOrderInputs((prev) => ({ ...prev, [id]: value }));
      setHasChanges(true);
      return;
    }

    // Check for duplicates
    const duplicate = Object.entries(orderInputs).find(
      ([key, val]) => key !== id && val === String(numValue),
    );

    if (duplicate) {
      setErrors((prev) => ({
        ...prev,
        [id]: `Order ${numValue} is already used`,
      }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[id];
        return newErrors;
      });
    }

    setOrderInputs((prev) => ({ ...prev, [id]: value }));
    setHasChanges(true);
  };

  const handleAutoFix = () => {
    const sorted = [...orderedItems].sort((a, b) => {
      const orderA = parseInt(orderInputs[String(a.id)] || '999');
      const orderB = parseInt(orderInputs[String(b.id)] || '999');
      return orderA - orderB;
    });

    const fixedInputs: Record<string, string> = {};
    sorted.forEach((item, index) => {
      fixedInputs[String(item.id)] = String(index + 1);
    });

    setOrderInputs(fixedInputs);
    setErrors({});
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (Object.keys(errors).length > 0) {
      return;
    }

    // Apply new orders to items
    const reorderedItems = orderedItems.map((item) => ({
      ...item,
      order: parseInt(orderInputs[String(item.id)] || '1'),
    }));

    // Sort by new order
    reorderedItems.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    setIsSaving(true);
    try {
      await onReorder(reorderedItems);
      setHasChanges(false);
      setOrderedItems(reorderedItems);
    } catch (error) {
      console.error('Failed to save order:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const inputs: Record<string, string> = {};
    sorted.forEach((item, index) => {
      inputs[String(item.id)] = String(item.order ?? index + 1);
    });
    setOrderInputs(inputs);
    setOrderedItems(sorted);
    setHasChanges(false);
    setErrors({});
  };

  const hasDuplicates = () => {
    const values = Object.values(orderInputs);
    const uniqueValues = new Set(values);
    return values.length !== uniqueValues.size;
  };

  const hasGaps = () => {
    const orders = Object.values(orderInputs)
      .map((v) => parseInt(v))
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);

    for (let i = 1; i < orders.length; i++) {
      if (orders[i] - orders[i - 1] > 1) {
        return true;
      }
    }
    return false;
  };

  const canSave = hasChanges && Object.keys(errors).length === 0 && !hasDuplicates();

  // Sort items by their input order for display
  const displayItems = [...orderedItems].sort((a, b) => {
    const orderA = parseInt(orderInputs[String(a.id)] || '999');
    const orderB = parseInt(orderInputs[String(b.id)] || '999');
    return orderA - orderB;
  });

  return (
    <Box {...containerProps}>
      {/* Instructions */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Enter order numbers directly to reorder items. Duplicate numbers are not allowed.
        </Typography>
      </Alert>

      {/* Warnings */}
      {hasDuplicates() && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            showAutoFix && (
              <Button
                size="small"
                color="inherit"
                onClick={handleAutoFix}
                startIcon={<NumbersIcon />}
              >
                Auto-fix
              </Button>
            )
          }
        >
          <Typography variant="body2">
            Duplicate order numbers detected. Please fix before saving.
          </Typography>
        </Alert>
      )}

      {hasGaps() && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<WarningIcon />}>
          <Typography variant="body2">
            There are gaps in the order sequence. Consider using auto-fix for sequential numbering.
          </Typography>
        </Alert>
      )}

      {/* Action buttons */}
      <Box display="flex" justifyContent="flex-end" gap={1} mb={2}>
        {showAutoFix && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<NumbersIcon />}
            onClick={handleAutoFix}
            disabled={isSaving}
          >
            Auto-fix Order
          </Button>
        )}
        <Button
          variant="outlined"
          size="small"
          startIcon={<UndoIcon />}
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          Reset
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={isSaving ? <CircularProgress size={16} /> : <SaveIcon />}
          onClick={handleSave}
          disabled={!canSave || isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Order'}
        </Button>
      </Box>

      {/* Items list */}
      <Stack spacing={1}>
        {displayItems.map((item, index) => {
          const id = String(item.id);
          const originalOrder = item.order ?? index + 1;
          const currentOrder = parseInt(orderInputs[id] || '1');
          const hasOrderChanged = originalOrder !== currentOrder;
          const hasError = !!errors[id];

          return (
            <Paper
              key={item.id}
              sx={{
                p: 2,
                border: 1,
                borderColor: hasError ? 'error.main' : hasOrderChanged ? 'warning.main' : 'divider',
                backgroundColor: hasError
                  ? 'error.50'
                  : hasOrderChanged
                    ? 'warning.50'
                    : 'background.paper',
              }}
            >
              <Box display="flex" alignItems="center" gap={2}>
                {/* Order input */}
                <TextField
                  size="small"
                  type="number"
                  value={orderInputs[id] || ''}
                  onChange={(e) => handleOrderChange(item.id, e.target.value)}
                  error={hasError}
                  helperText={errors[id]}
                  sx={{ width: 100 }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">#</InputAdornment>,
                    inputProps: {
                      min: minOrder,
                      max: maxOrder,
                      step: 1,
                    },
                  }}
                />

                {/* Change indicator */}
                {hasOrderChanged && !hasError && (
                  <Tooltip title={`Changed from ${originalOrder}`}>
                    <Chip
                      label={`was ${originalOrder}`}
                      size="small"
                      color="warning"
                      variant="outlined"
                    />
                  </Tooltip>
                )}

                {/* Item content */}
                <Box flex={1}>{renderItem(item, index)}</Box>
              </Box>
            </Paper>
          );
        })}
      </Stack>

      {/* Preview of final order */}
      {hasChanges && !hasDuplicates() && displayItems.length > 1 && (
        <Box mt={2} p={2} bgcolor="grey.50" borderRadius={1}>
          <Typography variant="caption" color="text.secondary" component="div">
            <strong>Preview:</strong>{' '}
            {displayItems
              .map((item, idx) => `${idx + 1}. ${item.name || item.title || 'Item'}`)
              .join(' → ')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
