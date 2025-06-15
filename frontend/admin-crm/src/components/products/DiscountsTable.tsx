// frontend/admin-crm/src/components/products/DiscountsTable.tsx

import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  CircularProgress,
  TableSortLabel,
  Skeleton,
  LinearProgress,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as ValidIcon,
  Cancel as InvalidIcon,
  Code as CodeIcon,
  AutoAwesome as AutoIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import type { Discount } from '../../types/products.types';

interface DiscountsTableProps {
  discounts: Discount[];
  isLoading: boolean;
  onEdit: (discount: Discount) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export const DiscountsTable: React.FC<DiscountsTableProps> = ({
  discounts,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, discount: Discount) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedDiscount(discount);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedDiscount(null);
  };

  const handleEdit = () => {
    if (selectedDiscount) {
      onEdit(selectedDiscount);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedDiscount) {
      onDelete(selectedDiscount.id);
    }
    handleMenuClose();
  };

  const getStatusChip = (isValid: boolean, isActive: boolean) => {
    if (!isActive) {
      return (
        <Chip
          label="Inactive"
          size="small"
          color="default"
          variant="outlined"
        />
      );
    }
    
    return (
      <Chip
        icon={isValid ? <ValidIcon /> : <InvalidIcon />}
        label={isValid ? 'Valid' : 'Invalid'}
        size="small"
        color={isValid ? 'success' : 'error'}
        variant="filled"
      />
    );
  };

  const getTypeChip = (discountType: string) => {
    const colors = {
      PERCENTAGE: 'primary',
      FIXED: 'secondary',
      FREE_HOURS: 'warning',
    } as const;

    return (
      <Chip
        label={discountType.replace('_', ' ')}
        size="small"
        color={colors[discountType as keyof typeof colors] || 'default'}
        variant="outlined"
      />
    );
  };

  const getApplicationIcon = (applicationType: string) => {
    switch (applicationType) {
      case 'CODE_REQUIRED':
        return <CodeIcon fontSize="small" />;
      case 'AUTOMATIC':
        return <AutoIcon fontSize="small" />;
      case 'ADMIN_ONLY':
        return <AdminIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const formatValue = (discount: Discount) => {
    const value = parseFloat(discount.value);
    
    switch (discount.discount_type) {
      case 'PERCENTAGE':
        return `${value}%`;
      case 'FIXED':
        return `${discount.currency || 'PHP'} ${value.toLocaleString()}`;
      case 'FREE_HOURS':
        return `${value} hours`;
      default:
        return discount.value;
    }
  };

  const getUsageProgress = (discount: Discount) => {
    if (!discount.max_uses) return null;
    
    const percentage = (discount.current_uses / discount.max_uses) * 100;
    
    return (
      <Box sx={{ minWidth: 100 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <LinearProgress
            variant="determinate"
            value={Math.min(percentage, 100)}
            sx={{ flex: 1, height: 6, borderRadius: 3 }}
            color={percentage >= 90 ? 'error' : percentage >= 70 ? 'warning' : 'primary'}
          />
          <Typography variant="caption" color="text.secondary">
            {discount.current_uses}/{discount.max_uses}
          </Typography>
        </Box>
      </Box>
    );
  };

  if (isLoading) {
    return (
      <Box p={3}>
        {[...Array(5)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="15%" />
          </Box>
        ))}
      </Box>
    );
  }

  if (discounts.length === 0) {
    return (
      <Box 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent="center" 
        py={8}
        textAlign="center"
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No discounts found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first discount to offer special pricing to clients
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <TableContainer component={Paper} elevation={0}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel>
                  Name & Code
                </TableSortLabel>
              </TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Application</TableCell>
              <TableCell>Valid Period</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {discounts.map((discount) => (
              <TableRow 
                key={discount.id} 
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onEdit(discount)}
              >
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {discount.name}
                    </Typography>
                    {discount.code && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <CodeIcon fontSize="small" color="action" />
                        <Typography variant="caption" color="text.secondary">
                          {discount.code}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  {getTypeChip(discount.discount_type)}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatValue(discount)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getApplicationIcon(discount.application_type)}
                    <Typography variant="body2">
                      {discount.application_type_display}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(discount.valid_from).toLocaleDateString()}
                  </Typography>
                  {discount.valid_until && (
                    <Typography variant="caption" color="text.secondary">
                      to {new Date(discount.valid_until).toLocaleDateString()}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {getUsageProgress(discount) || (
                    <Typography variant="body2" color="text.secondary">
                      {discount.current_uses} uses
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusChip(discount.is_valid_now, discount.is_active)}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, discount)}
                    disabled={isDeleting}
                  >
                    {isDeleting && selectedDiscount?.id === discount.id ? (
                      <CircularProgress size={20} />
                    ) : (
                      <MoreVertIcon />
                    )}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};