// frontend/admin-crm/src/components/analytics/widgets/TableWidget.tsx
import React from 'react';
import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow} from '@mui/material';
import type { Widget } from '../../../types/analytics.types';

interface TableWidgetProps {
  widget: Widget;
  data: any;
  compact?: boolean;
}

export const TableWidget: React.FC<TableWidgetProps> = ({ widget: _, data, compact }) => {
  const tableData = data.categories || [];
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TableContainer sx={{ flex: 1 }}>
        <Table size={compact ? 'small' : 'medium'}>
          <TableHead>
            <TableRow>
              <TableCell>Category</TableCell>
              <TableCell align="right">Value</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.map((row: any, index: number) => (
              <TableRow key={index}>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.value.toLocaleString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};