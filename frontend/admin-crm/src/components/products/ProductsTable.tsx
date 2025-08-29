// frontend/admin-crm/src/components/products/ProductsTable.tsx

import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Inventory as ProductIcon, Star as StarIcon, StarBorder as StarBorderIcon } from '@mui/icons-material';
import type { ProductOption } from '../../types/products.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState, createStandardActions } from '../common';
import type { ModernTableColumn } from '../common';

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
}) => {
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

  const columns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, product: ProductOption) => (
        <Box display="flex" alignItems="center" gap={1}>
          <ProductIcon color="primary" fontSize="small" />
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
        </Box>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (_, product: ProductOption) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {product.category_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {product.category_path}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (_, product: ProductOption) => 
        getTypeChip(product.type_display, product.type === 'PACKAGE'),
    },
    {
      key: 'pricing',
      label: 'Pricing',
      render: (_, product: ProductOption) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {formatPrice(product)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {product.pricing_model_display}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, product: ProductOption) => getStatusChip(product.is_active),
    },
    {
      key: 'is_featured',
      label: 'Featured',
      align: 'center',
      render: (_, product: ProductOption) => (
        product.is_featured ? (
          <Tooltip title="Featured product">
            <StarIcon color="warning" />
          </Tooltip>
        ) : (
          <StarBorderIcon color="disabled" />
        )
      ),
    },
  ];

  const actions = createStandardActions(
    (product: ProductOption) => onEdit(product),
    (product: ProductOption) => onDelete(product.id),
    {
      editLabel: 'Edit Product',
      deleteLabel: 'Delete Product',
    }
  );

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (products.length === 0) {
    return (
      <ModernEmptyState
        icon={ProductIcon}
        title="No products found"
        description="Create your first product or package to get started"
        tip={{ text: "Start with individual products, then create packages to bundle services together", type: "info" }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns}
      data={products}
      actions={actions}
      onRowClick={onEdit}
      sortBy="name"
      sortOrder="asc"
    />
  );
};