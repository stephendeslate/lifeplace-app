// frontend/admin-crm/src/components/common/ModernTable.tsx

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { tokens } from '../../design-system/tokens';
import { glassPresets } from '../../design-system/utils/glassmorphism';

export interface ModernTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  render?: (value: any, row: any, index: number) => React.ReactNode;
}

export interface ModernTableAction {
  label: string;
  icon: React.ReactNode;
  onClick: (row: any) => void;
  color?: 'default' | 'primary' | 'secondary' | 'error';
  show?: (row: any) => boolean;
}

export interface ModernTableProps<T = any> {
  columns: ModernTableColumn[];
  data: T[];
  actions?: ModernTableAction[];
  onRowClick?: (row: T, index: number) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  loading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export const ModernTable = <T extends Record<string, any>>({
  columns,
  data,
  actions = [],
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  loading,
  emptyState,
  className,
}: ModernTableProps<T>) => {
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [selectedRow, setSelectedRow] = React.useState<T | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, row: T) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedRow(row);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedRow(null);
  };

  const handleActionClick = (action: ModernTableAction) => {
    if (selectedRow) {
      action.onClick(selectedRow);
    }
    handleMenuClose();
  };

  const handleSort = (columnKey: string) => {
    if (onSort) {
      onSort(columnKey);
    }
  };

  if (loading) {
    return emptyState || null;
  }

  if (data.length === 0) {
    return emptyState || null;
  }

  return (
    <>
      <TableContainer 
        className={className}
        sx={{ 
          background: 'transparent',
          borderRadius: tokens.spacing.radius.xxl,
          overflow: 'hidden',
          '&::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: tokens.color.neutral[300],
            borderRadius: 4,
            '&:hover': {
              background: tokens.color.neutral[400],
            },
          },
        }}
      >
        <Table sx={{ background: 'transparent' }}>
          <TableHead>
            <TableRow
              sx={{
                '& .MuiTableCell-head': {
                  background: `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`,
                  fontWeight: 600,
                  color: tokens.color.neutral[700],
                  borderBottom: `1px solid ${tokens.color.borders.glass}`,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  py: 2.5,
                },
              }}
            >
              {columns.map((column) => (
                <TableCell 
                  key={column.key} 
                  align={column.align || 'left'}
                  sx={{ width: column.width }}
                >
                  {column.sortable ? (
                    <TableSortLabel
                      active={sortBy === column.key}
                      direction={sortBy === column.key ? sortOrder : 'asc'}
                      onClick={() => handleSort(column.key)}
                      sx={{
                        '& .MuiTableSortLabel-icon': {
                          color: `${tokens.color.primary[500]} !important`,
                        },
                        '&:hover': {
                          color: tokens.color.primary[600],
                        },
                        '&.Mui-active': {
                          color: tokens.color.primary[600],
                        },
                      }}
                    >
                      {column.label}
                    </TableSortLabel>
                  ) : (
                    column.label
                  )}
                </TableCell>
              ))}
              {actions.length > 0 && (
                <TableCell align="right">Actions</TableCell>
              )}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, index) => (
              <TableRow 
                key={row.id || index}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  background: index % 2 === 0 
                    ? `linear-gradient(135deg, ${tokens.color.neutral[50]} 0%, ${tokens.color.neutral[100]} 100%)`
                    : 'transparent',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.primary[100]} 100%)`,
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 20px ${tokens.color.primary[500]}08`,
                  },
                  '& .MuiTableCell-root': {
                    borderBottom: `1px solid ${tokens.color.borders.glass}`,
                    py: 2.5,
                  },
                }}
                onClick={() => onRowClick?.(row, index)}
              >
                {columns.map((column) => (
                  <TableCell 
                    key={column.key} 
                    align={column.align || 'left'}
                  >
                    {column.render 
                      ? column.render(row[column.key], row, index)
                      : row[column.key]
                    }
                  </TableCell>
                ))}
                {actions.length > 0 && (
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, row)}
                      sx={{
                        '&:hover': {
                          background: `linear-gradient(135deg, ${tokens.color.primary[100]} 0%, ${tokens.color.secondary[100]} 100%)`,
                          transform: 'scale(1.1)',
                        },
                        transition: 'all 0.2s ease-in-out',
                      }}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Actions Menu */}
      {actions.length > 0 && (
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              ...glassPresets.medium,
              borderRadius: tokens.spacing.radius.lg,
              border: `1px solid ${tokens.color.borders.glass}`,
              minWidth: 160,
            },
          }}
        >
          {actions.map((action, index) => {
            const shouldShow = action.show && selectedRow ? action.show(selectedRow) : !action.show;
            if (!shouldShow) return null;

            return (
              <MenuItem 
                key={index}
                onClick={() => handleActionClick(action)}
                sx={{
                  color: action.color === 'error' ? 'error.main' : 'inherit',
                  '&:hover': {
                    background: action.color === 'error' 
                      ? `linear-gradient(135deg, ${tokens.color.error[50]} 0%, ${tokens.color.error[100]} 100%)`
                      : `linear-gradient(135deg, ${tokens.color.primary[50]} 0%, ${tokens.color.secondary[50]} 100%)`,
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: action.color === 'error' ? 'error.main' : 'inherit',
                  }}
                >
                  {action.icon}
                </ListItemIcon>
                <ListItemText>{action.label}</ListItemText>
              </MenuItem>
            );
          })}
        </Menu>
      )}
    </>
  );
};

// Convenience component for common Edit/Delete actions
export const createStandardActions = (
  onEdit: (row: any) => void,
  onDelete: (row: any) => void,
  options?: {
    editLabel?: string;
    deleteLabel?: string;
    showEdit?: (row: any) => boolean;
    showDelete?: (row: any) => boolean;
  }
): ModernTableAction[] => [
  {
    label: options?.editLabel || 'Edit',
    icon: <EditIcon fontSize="small" />,
    onClick: onEdit,
    show: options?.showEdit,
  },
  {
    label: options?.deleteLabel || 'Delete',
    icon: <DeleteIcon fontSize="small" />,
    onClick: onDelete,
    color: 'error' as const,
    show: options?.showDelete,
  },
];

export default ModernTable;