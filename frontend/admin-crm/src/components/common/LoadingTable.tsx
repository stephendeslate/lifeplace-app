// frontend/admin-crm/src/components/common/LoadingTable.tsx

import React from 'react';
import {
  Box,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Stack,
} from '@mui/material';

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  variant?: 'table' | 'list' | 'cards';
}

const LoadingTableSkeleton: React.FC<{ rows: number; columns: number }> = ({ rows, columns }) => (
  <TableContainer>
    <Table>
      <TableHead>
        <TableRow>
          {Array.from({ length: columns }, (_, index) => (
            <TableCell key={index}>
              <Skeleton variant="text" width="80%" height={20} />
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {Array.from({ length: rows }, (_, rowIndex) => (
          <TableRow key={rowIndex}>
            {Array.from({ length: columns }, (_, colIndex) => (
              <TableCell key={colIndex}>
                <Skeleton 
                  variant="text" 
                  width={colIndex === 0 ? "60%" : "40%"} 
                  height={20} 
                />
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </TableContainer>
);

const LoadingListSkeleton: React.FC<{ rows: number }> = ({ rows }) => (
  <Stack spacing={2} sx={{ p: 2 }}>
    {Array.from({ length: rows }, (_, index) => (
      <Box 
        key={index}
        sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          '&:last-child': { borderBottom: 0 }
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Box flex={1}>
            <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="80%" height={16} sx={{ mb: 1 }} />
            <Box display="flex" gap={1}>
              <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={80} height={20} sx={{ borderRadius: 1 }} />
              <Skeleton variant="rectangular" width={70} height={20} sx={{ borderRadius: 1 }} />
            </Box>
          </Box>
          <Skeleton variant="circular" width={32} height={32} />
        </Box>
      </Box>
    ))}
  </Stack>
);

const LoadingCardsSkeleton: React.FC<{ rows: number }> = ({ rows }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', sm: 'row' }, 
      flexWrap: { sm: 'wrap' },
      gap: 3,
      p: 2
    }}
  >
    {Array.from({ length: rows }, (_, index) => (
      <Box 
        key={index}
        sx={{ 
          flex: { 
            xs: '1 1 100%', 
            sm: '1 1 calc(50% - 12px)', 
            md: '1 1 calc(33.333% - 16px)' 
          },
          minWidth: 300
        }}
      >
        <Box 
          sx={{ 
            p: 2, 
            border: 1, 
            borderColor: 'divider', 
            borderRadius: 1,
            height: 200
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box flex={1}>
              <Skeleton variant="text" width="60%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="90%" height={16} sx={{ mb: 2 }} />
            </Box>
            <Skeleton variant="circular" width={24} height={24} />
          </Box>
          
          <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2, borderRadius: 1 }} />
          
          <Box display="flex" gap={1} mb={2}>
            <Skeleton variant="rectangular" width={60} height={20} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={80} height={20} sx={{ borderRadius: 1 }} />
          </Box>
          
          <Box display="flex" gap={1}>
            <Skeleton variant="rectangular" width={70} height={32} sx={{ borderRadius: 1 }} />
            <Skeleton variant="rectangular" width={60} height={32} sx={{ borderRadius: 1 }} />
          </Box>
        </Box>
      </Box>
    ))}
  </Box>
);

export const LoadingTable: React.FC<LoadingTableProps> = ({
  rows = 5,
  columns = 4,
  variant = 'table',
}) => {
  if (variant === 'list') {
    return <LoadingListSkeleton rows={rows} />;
  }
  
  if (variant === 'cards') {
    return <LoadingCardsSkeleton rows={Math.min(rows, 6)} />;
  }
  
  return <LoadingTableSkeleton rows={rows} columns={columns} />;
};

// Specific loading components for different use cases
export const LoadingMetricsTable: React.FC = () => (
  <LoadingTable variant="list" rows={6} />
);

export const LoadingDashboardCards: React.FC = () => (
  <LoadingTable variant="cards" rows={6} />
);

export const LoadingReportsTable: React.FC = () => (
  <LoadingTable rows={8} columns={8} />
);

export const LoadingEventsTable: React.FC = () => (
  <LoadingTable rows={10} columns={7} />
);

export const LoadingAlertRulesTable: React.FC = () => (
  <LoadingTable rows={6} columns={9} />
);