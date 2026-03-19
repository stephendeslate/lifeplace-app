import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Skeleton,
} from '@mui/material';

interface SelectedAddon {
  product_id: number;
  name: string;
  price: string;
  quantity: number;
}

interface PricingData {
  lineItems?: Array<{
    product_id: number;
    total_unit_price?: string;
  }>;
}

interface AddonBreakdownTableProps {
  selectedAddons: SelectedAddon[];
  pricing: PricingData;
  isUpdatingPrices: boolean;
  formatAmount: (amount: string) => string;
}

export const AddonBreakdownTable: React.FC<AddonBreakdownTableProps> = ({
  selectedAddons,
  pricing,
  isUpdatingPrices,
  formatAmount,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Selected Add-ons
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Add-on</TableCell>
              <TableCell align="center">Quantity</TableCell>
              <TableCell align="right">Unit Price</TableCell>
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {selectedAddons.map((addon) => {
              const lineItem = pricing.lineItems?.find(
                (item) => item.product_id === addon.product_id,
              );
              const unitPrice = lineItem?.total_unit_price
                ? parseFloat(lineItem.total_unit_price)
                : parseFloat(addon.price);

              return (
                <TableRow key={addon.product_id}>
                  <TableCell>{addon.name}</TableCell>
                  <TableCell align="center">{addon.quantity}</TableCell>
                  <TableCell align="right">
                    {isUpdatingPrices ? (
                      <Skeleton width={60} animation="wave" />
                    ) : (
                      formatAmount(unitPrice.toString())
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {isUpdatingPrices ? (
                      <Skeleton width={80} animation="wave" />
                    ) : (
                      formatAmount((unitPrice * addon.quantity).toString())
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
