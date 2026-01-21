// frontend/admin-crm/src/components/common/TableSkeleton.tsx

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Skeleton,
  Box,
} from '@mui/material';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showActions?: boolean;
  height?: number;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  showActions = true,
  height = 40,
}) => {
  return (
    <TableContainer component={Paper}>
      <Table size="small">
        <TableHead>
          <TableRow>
            {Array.from({ length: columns }).map((_, index) => (
              <TableCell key={`header-${index}`}>
                <Skeleton variant="text" width="80%" />
              </TableCell>
            ))}
            {showActions && (
              <TableCell>
                <Skeleton variant="text" width="60%" />
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <TableRow key={`row-${rowIndex}`}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <TableCell key={`cell-${rowIndex}-${colIndex}`}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {colIndex === 0 && (
                      <Skeleton variant="circular" width={32} height={32} />
                    )}
                    <Skeleton
                      variant="text"
                      width={colIndex === 0 ? '60%' : '80%'}
                      height={height}
                    />
                  </Box>
                </TableCell>
              ))}
              {showActions && (
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Skeleton variant="circular" width={32} height={32} />
                    <Skeleton variant="circular" width={32} height={32} />
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

// Card skeleton for grid layouts
interface CardSkeletonProps {
  count?: number;
  height?: number;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  count = 4,
  height = 200,
}) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 2,
      }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Paper key={`card-${index}`} sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="40%" />
            </Box>
          </Box>
          <Skeleton variant="rectangular" height={height} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="20%" />
          </Box>
        </Paper>
      ))}
    </Box>
  );
};

// List skeleton for sidebar or list views
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  showAvatar = true,
}) => {
  return (
    <Box>
      {Array.from({ length: items }).map((_, index) => (
        <Box
          key={`list-item-${index}`}
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          {showAvatar && (
            <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
          )}
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="50%" height={16} />
          </Box>
          <Skeleton variant="text" width={60} />
        </Box>
      ))}
    </Box>
  );
};

// Form skeleton for loading forms
interface FormSkeletonProps {
  fields?: number;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({ fields = 6 }) => {
  return (
    <Box sx={{ p: 3 }}>
      {Array.from({ length: fields }).map((_, index) => (
        <Box key={`field-${index}`} sx={{ mb: 3 }}>
          <Skeleton variant="text" width="30%" height={20} sx={{ mb: 1 }} />
          <Skeleton variant="rectangular" height={56} />
        </Box>
      ))}
      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Skeleton variant="rectangular" width={100} height={40} />
        <Skeleton variant="rectangular" width={100} height={40} />
      </Box>
    </Box>
  );
};