// frontend/admin-crm/src/components/products/ProductsTable.tsx

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
  Tooltip,
  CircularProgress,
  TableSortLabel,
  Skeleton,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import type { ProductOption } from '../../types/products.types';

interface ProductsTableProps {
  products: ProductOption[];
  isLoading: boolean;
  onEdit: (product: ProductOption) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  isLoading,
  onEdit,
  onDelete,
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, product: ProductOption) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedProduct(product);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedProduct(null);
  };

  const handleEdit = () => {
    if (selectedProduct) {
      onEdit(selectedProduct);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedProduct) {
      onDelete(selectedProduct.id);
    }
    handleMenuClose();
  };

  const formatPrice = (product: ProductOption) => {
    if (product.pricing_model === 'CUSTOM') {
      return 'Custom Quote';
    }
    
    const price = parseFloat(product.base_price);
    const formattedPrice = `${product.currency} ${price.toLocaleString()}`;
    
    if (product.pricing_model === 'HOURLY') {
      return `${formattedPrice}/hour`;
    }
    
    return formattedPrice;
  };

  const getTypeChip = (type: string, isPackage: boolean) => (
    <Chip
      label={type}
      size="small"
      color={isPackage ? 'secondary' : 'primary'}
      variant="outlined"
    />
  );

  const getStatusChip = (isActive: boolean) => (
    <Chip
      label={isActive ? 'Active' : 'Inactive'}
      size="small"
      color={isActive ? 'success' : 'default'}
      variant={isActive ? 'filled' : 'outlined'}
    />
  );

  if (isLoading) {
    return (
      <Box p={3}>
        {[...Array(5)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
            <Skeleton variant="text" width="20%" />
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="20%" />
          </Box>
        ))}
      </Box>
    );
  }

  if (products.length === 0) {
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
          No products found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first product or package to get started
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
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Pricing</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Featured</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow 
                key={product.id} 
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onEdit(product)}
              >
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {product.name}
                    </Typography>
                    {product.sku && (
                      <Typography variant="caption" color="text.secondary">
                        SKU: {product.sku}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {product.category_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {product.category_path}
                  </Typography>
                </TableCell>
                <TableCell>
                  {getTypeChip(product.type_display, product.type === 'PACKAGE')}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="medium">
                    {formatPrice(product)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {product.pricing_model_display}
                  </Typography>
                </TableCell>
                <TableCell>
                  {getStatusChip(product.is_active)}
                </TableCell>
                <TableCell align="center">
                  {product.is_featured ? (
                    <Tooltip title="Featured product">
                      <StarIcon color="warning" />
                    </Tooltip>
                  ) : (
                    <StarBorderIcon color="disabled" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, product)}
                    disabled={isDeleting}
                  >
                    {isDeleting && selectedProduct?.id === product.id ? (
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