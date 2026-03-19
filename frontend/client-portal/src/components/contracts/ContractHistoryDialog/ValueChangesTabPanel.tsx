import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import { TrendingUp as TrendingIcon } from '@mui/icons-material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';

interface ValueChange {
  id: string;
  date: string;
  old_value: string | null;
  new_value: string;
  reason: string;
  changed_by: undefined;
}

interface ValueChangesTabPanelProps {
  valueChanges: ValueChange[];
  currency: string;
  formatDate: (dateString: string) => string;
  formatCurrency: (value: string | null, currency?: string) => string;
}

export const ValueChangesTabPanel: React.FC<ValueChangesTabPanelProps> = ({
  valueChanges,
  currency,
  formatDate,
  formatCurrency,
}) => (
  <AnimatedElement animation="fadeIn">
    {valueChanges.length > 0 ? (
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Contract Value History
        </Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Previous Value</TableCell>
                <TableCell>New Value</TableCell>
                <TableCell>Change</TableCell>
                <TableCell>Reason</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {valueChanges.map((change, index) => (
                <TableRow key={index}>
                  <TableCell>{formatDate(change.date)}</TableCell>
                  <TableCell>
                    {change.old_value ? formatCurrency(change.old_value, currency) : '-'}
                  </TableCell>
                  <TableCell>{formatCurrency(change.new_value, currency)}</TableCell>
                  <TableCell>
                    <Chip label="Initial" size="small" color="info" variant="outlined" />
                  </TableCell>
                  <TableCell>{change.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    ) : (
      <GlassCard variant="light" intensity="subtle" sx={{ p: 4, textAlign: 'center' }}>
        <TrendingIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No Value Changes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          The contract value has not been changed.
        </Typography>
      </GlassCard>
    )}
  </AnimatedElement>
);
