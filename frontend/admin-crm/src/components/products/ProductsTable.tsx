// frontend/admin-crm/src/components/products/ProductsTable.tsx

import React from 'react';
import { Box, Typography, Chip, Tooltip } from '@mui/material';
import { Inventory as ProductIcon, Star as StarIcon, StarBorder as StarBorderIcon } from '@mui/icons-material';
import type { ProductOption } from '../../types/products.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState, createStandardActions } from '../common';
import type { ModernTableColumn, ModernTableAction } from '../common';

interface ProductsTableProps {
  products: ProductOption[];
  isLoading: boolean;
  onEdit: (product: ProductOption) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
  typeFilter?: 'PRODUCT' | 'PACKAGE';
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  isLoading,
  onEdit,
  onDelete,
  typeFilter,
}) => {
  // Filter products by type if typeFilter is provided
  const filteredProducts = typeFilter
    ? products.filter(p => p.type === typeFilter)
    : products;

  const isPackageView = typeFilter === 'PACKAGE';
  const itemLabel = isPackageView ? 'Package' : typeFilter === 'PRODUCT' ? 'Product' : 'Product';
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

  const baseColumns: ModernTableColumn[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_, row) => {
        const product = row as unknown as ProductOption;
        return (
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
        );
      },
    },
    {
      key: 'category',
      label: 'Category',
      render: (_, row) => {
        const product = row as unknown as ProductOption;
        return (
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {product.category_name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {product.category_path}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'pricing',
      label: 'Pricing',
      render: (_, row) => {
        const product = row as unknown as ProductOption;
        return (
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {formatPrice(product)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {product.pricing_model_display}
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, row) => {
        const product = row as unknown as ProductOption;
        return getStatusChip(product.is_active);
      },
    },
    {
      key: 'is_featured',
      label: 'Featured',
      align: 'center',
      render: (_, row) => {
        const product = row as unknown as ProductOption;
        return (
          product.is_featured ? (
            <Tooltip title={`Featured ${itemLabel.toLowerCase()}`}>
              <StarIcon color="warning" />
            </Tooltip>
          ) : (
            <StarBorderIcon color="disabled" />
          )
        );
      },
    },
  ];

  // Only add type column if not filtering by a specific type
  const typeColumn: ModernTableColumn = {
    key: 'type',
    label: 'Type',
    render: (_, row) => {
      const product = row as unknown as ProductOption;
      return getTypeChip(product.type_display, product.type === 'PACKAGE');
    },
  };

  const columns: ModernTableColumn[] = typeFilter
    ? baseColumns
    : [...baseColumns.slice(0, 2), typeColumn, ...baseColumns.slice(2)];

  const actions = createStandardActions(
    (product: ProductOption) => onEdit(product),
    (product: ProductOption) => onDelete(product.id),
    {
      editLabel: `Edit ${itemLabel}`,
      deleteLabel: `Delete ${itemLabel}`,
    }
  );

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (filteredProducts.length === 0) {
    const emptyTitle = isPackageView
      ? 'No packages found'
      : typeFilter === 'PRODUCT'
        ? 'No products found'
        : 'No products found';

    const emptyDescription = isPackageView
      ? 'Create your first package to bundle services together'
      : typeFilter === 'PRODUCT'
        ? 'Create your first product to get started'
        : 'Create your first product or package to get started';

    const emptyTip = isPackageView
      ? 'Packages bundle multiple products and services together for clients'
      : typeFilter === 'PRODUCT'
        ? 'Products are individual services you offer to clients'
        : 'Start with individual products, then create packages to bundle services together';

    return (
      <ModernEmptyState
        icon={ProductIcon}
        title={emptyTitle}
        description={emptyDescription}
        tip={{ text: emptyTip, type: "info" }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns as unknown as ModernTableColumn<Record<string, unknown>>[]}
      data={filteredProducts as unknown as Record<string, unknown>[]}
      actions={actions as unknown as ModernTableAction<Record<string, unknown>>[]}
      onRowClick={(row) => onEdit(row as unknown as ProductOption)}
      sortBy="name"
      sortOrder="asc"
    />
  );
};