// frontend/admin-crm/src/components/analytics/widgets/TableWidget.tsx
import React from 'react';
import { Box } from '@mui/material';
import { ModernTable, type ModernTableColumn } from '../../common';
import type { Widget } from '../../../types/analytics.types';

interface TableRowData {
  name: string;
  value: number;
}

interface TableWidgetData {
  categories?: TableRowData[];
}

interface TableWidgetProps {
  widget: Widget;
  data: TableWidgetData;
  compact?: boolean;
}

export const TableWidget: React.FC<TableWidgetProps> = ({ data }) => {
  const tableData = data.categories || [];
  
  const columns: ModernTableColumn<TableRowData>[] = [
    {
      key: 'name',
      label: 'Category',
      align: 'left',
    },
    {
      key: 'value',
      label: 'Value',
      align: 'right',
      render: (value) => (value as number).toLocaleString(),
    },
  ];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <ModernTable
        columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
        data={tableData as unknown as Record<string, unknown>[]}
      />
    </Box>
  );
};