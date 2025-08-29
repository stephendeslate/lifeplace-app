// frontend/admin-crm/src/components/products/CategoriesTable.tsx

import React, { useMemo } from 'react';
import { Box, Typography, Chip, IconButton } from '@mui/material';
import {
  Category as CategoryIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import type { ProductCategory } from '../../types/products.types';
import { ModernTable, ModernLoadingStates, ModernEmptyState, createStandardActions } from '../common';
import type { ModernTableColumn } from '../common';
import { tokens } from '../../design-system/tokens';

interface CategoriesTableProps {
  categories: ProductCategory[];
  isLoading: boolean;
  onEdit: (category: ProductCategory) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
}

interface HierarchicalCategory extends ProductCategory {
  children: HierarchicalCategory[];
  level: number;
}

export const CategoriesTable: React.FC<CategoriesTableProps> = ({
  categories,
  isLoading,
  onEdit,
  onDelete,
}) => {
  const [expandedCategories, setExpandedCategories] = React.useState<Set<number>>(new Set());

  // Build hierarchical structure
  const hierarchicalCategories = useMemo(() => {
    const categoryMap = new Map<number, HierarchicalCategory>();
    const rootCategories: HierarchicalCategory[] = [];

    // Initialize all categories with empty children
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, children: [], level: 0 });
    });

    // Build hierarchy
    categories.forEach(category => {
      const cat = categoryMap.get(category.id)!;
      if (category.parent) {
        const parent = categoryMap.get(category.parent);
        if (parent) {
          parent.children.push(cat);
          cat.level = parent.level + 1;
        } else {
          rootCategories.push(cat);
        }
      } else {
        rootCategories.push(cat);
      }
    });

    // Flatten for table display, respecting expansion state
    const flattenCategories = (cats: HierarchicalCategory[]): HierarchicalCategory[] => {
      const result: HierarchicalCategory[] = [];
      cats.forEach(cat => {
        result.push(cat);
        if (expandedCategories.has(cat.id) && cat.children.length > 0) {
          result.push(...flattenCategories(cat.children));
        }
      });
      return result;
    };

    return flattenCategories(rootCategories);
  }, [categories, expandedCategories]);

  const toggleExpansion = (categoryId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

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
      label: 'Category Name',
      sortable: true,
      render: (_, category: HierarchicalCategory) => (
        <Box display="flex" alignItems="center" sx={{ ml: category.level * 2 }}>
          {category.children && category.children.length > 0 ? (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpansion(category.id);
              }}
              sx={{ mr: 1 }}
            >
              {expandedCategories.has(category.id) ? <ExpandMoreIcon /> : <ChevronRightIcon />}
            </IconButton>
          ) : (
            <Box sx={{ width: 32 }} />
          )}
          <CategoryIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {category.name}
            </Typography>
            {category.description && (
              <Typography variant="caption" color="text.secondary">
                {category.description}
              </Typography>
            )}
          </Box>
        </Box>
      ),
    },
    {
      key: 'full_path',
      label: 'Path',
      render: (_, category: ProductCategory) => (
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            fontFamily: 'monospace',
            background: tokens.color.neutral[100],
            px: 1,
            py: 0.5,
            borderRadius: tokens.spacing.radius.sm,
            fontSize: '0.75rem',
            display: 'inline-block',
          }}
        >
          {category.full_path}
        </Typography>
      ),
    },
    {
      key: 'requires_venue',
      label: 'Venue Required',
      render: (_, category: ProductCategory) => (
        <Chip
          label={category.requires_venue ? 'Yes' : 'No'}
          size="small"
          color={category.requires_venue ? 'warning' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      key: 'typical_duration_hours',
      label: 'Duration',
      render: (_, category: ProductCategory) => (
        category.typical_duration_hours ? (
          <Typography variant="body2">
            {category.typical_duration_hours}h
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )
      ),
    },
    {
      key: 'sort_order',
      label: 'Order',
      align: 'center',
      render: (_, category: ProductCategory) => (
        <Typography variant="body2" color="text.secondary">
          {category.sort_order}
        </Typography>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (_, category: ProductCategory) => getStatusChip(category.is_active),
    },
  ];

  const actions = createStandardActions(
    (category: ProductCategory) => onEdit(category),
    (category: ProductCategory) => onDelete(category.id),
    {
      editLabel: 'Edit Category',
      deleteLabel: 'Delete Category',
    }
  );

  if (isLoading) {
    return <ModernLoadingStates.ModernTableSkeleton />;
  }

  if (categories.length === 0) {
    return (
      <ModernEmptyState
        icon={FolderIcon}
        title="No categories found"
        description="Create product categories to organize your inventory"
        tip={{ text: "Start with broad categories like 'Services' and 'Products', then add subcategories", type: "info" }}
      />
    );
  }

  return (
    <ModernTable
      columns={columns}
      data={hierarchicalCategories}
      actions={actions}
      onRowClick={onEdit}
      sortBy="sort_order"
      sortOrder="asc"
    />
  );
};