// frontend/admin-crm/src/components/products/CategoriesTable.tsx

import React, { useState, useMemo } from 'react';
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
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Category as CategoryIcon,
  ExpandMore as ExpandMoreIcon,
  ChevronRight as ChevronRightIcon,
} from '@mui/icons-material';
import type { ProductCategory } from '../../types/products.types';

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
  isDeleting,
}) => {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());

  // Organize categories into hierarchical structure
  const hierarchicalCategories = useMemo(() => {
    const categoryMap = new Map<number, HierarchicalCategory>();
    const rootCategories: HierarchicalCategory[] = [];

    // First pass: create all category objects
    categories.forEach(category => {
      categoryMap.set(category.id, {
        ...category,
        children: [],
        level: 0,
      });
    });

    // Second pass: organize hierarchy and calculate levels
    categories.forEach(category => {
      const categoryObj = categoryMap.get(category.id)!;
      
      if (category.parent) {
        const parent = categoryMap.get(category.parent);
        if (parent) {
          parent.children.push(categoryObj);
          categoryObj.level = parent.level + 1;
        } else {
          // Parent not found, treat as root
          rootCategories.push(categoryObj);
        }
      } else {
        rootCategories.push(categoryObj);
      }
    });

    // Sort root categories and their children
    const sortCategories = (cats: HierarchicalCategory[]) => {
      cats.sort((a, b) => {
        if (a.sort_order !== b.sort_order) {
          return a.sort_order - b.sort_order;
        }
        return a.name.localeCompare(b.name);
      });
      cats.forEach(cat => sortCategories(cat.children));
    };

    sortCategories(rootCategories);
    return rootCategories;
  }, [categories]);

  // Flatten hierarchy for rendering
  const flattenedCategories = useMemo(() => {
    const flattened: HierarchicalCategory[] = [];
    
    const addCategory = (category: HierarchicalCategory) => {
      flattened.push(category);
      
      // Only add children if parent is expanded
      if (expandedCategories.has(category.id) && category.children.length > 0) {
        category.children.forEach(child => addCategory(child));
      }
    };

    hierarchicalCategories.forEach(category => addCategory(category));
    return flattened;
  }, [hierarchicalCategories, expandedCategories]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, category: ProductCategory) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedCategory(category);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedCategory(null);
  };

  const handleEdit = () => {
    if (selectedCategory) {
      onEdit(selectedCategory);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedCategory) {
      onDelete(selectedCategory.id);
    }
    handleMenuClose();
  };

  const toggleExpanded = (categoryId: number, event: React.MouseEvent) => {
    event.stopPropagation();
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

  const getCategoryIcon = (category: HierarchicalCategory) => {
    if (category.children.length > 0) {
      return expandedCategories.has(category.id) ? 
        <FolderOpenIcon color="primary" /> : 
        <FolderIcon color="primary" />;
    } else if (category.parent) {
      return <CategoryIcon color="action" />;
    } else {
      return <FolderIcon color="primary" />;
    }
  };

  const getIndentationStyle = (level: number) => ({
    paddingLeft: `${level * 24 + 16}px`,
  });

  if (isLoading) {
    return (
      <Box p={3}>
        {[...Array(5)].map((_, index) => (
          <Box key={index} display="flex" gap={2} mb={2}>
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="15%" />
            <Skeleton variant="text" width="15%" />
          </Box>
        ))}
      </Box>
    );
  }

  if (categories.length === 0) {
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
          No categories found
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first category to organize your products
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
              <TableCell>Description</TableCell>
              <TableCell align="center">Products</TableCell>
              <TableCell align="center">Subcategories</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Duration (hrs)</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {flattenedCategories.map((category) => (
              <TableRow 
                key={category.id} 
                hover
                sx={{ 
                  cursor: 'pointer',
                  backgroundColor: category.level > 0 ? 'rgba(0, 0, 0, 0.02)' : 'inherit',
                  '&:hover': {
                    backgroundColor: category.level > 0 ? 'rgba(0, 0, 0, 0.06)' : 'rgba(0, 0, 0, 0.04)',
                  }
                }}
                onClick={() => onEdit(category)}
              >
                <TableCell sx={getIndentationStyle(category.level)}>
                  <Box display="flex" alignItems="center" gap={1}>
                    {/* Expand/Collapse button for categories with children */}
                    {category.children.length > 0 && (
                      <IconButton
                        size="small"
                        onClick={(e) => toggleExpanded(category.id, e)}
                        sx={{ 
                          width: 20, 
                          height: 20,
                          mr: 0.5,
                        }}
                      >
                        {expandedCategories.has(category.id) ? (
                          <ExpandMoreIcon fontSize="small" />
                        ) : (
                          <ChevronRightIcon fontSize="small" />
                        )}
                      </IconButton>
                    )}
                    
                    {/* Category icon */}
                    <Box sx={{ minWidth: 24, display: 'flex', justifyContent: 'center' }}>
                      {getCategoryIcon(category)}
                    </Box>
                    
                    {/* Category name and path */}
                    <Box>
                      <Typography 
                        variant="subtitle2" 
                        fontWeight={category.level === 0 ? "bold" : "medium"}
                        sx={{ 
                          fontSize: category.level === 0 ? '0.875rem' : '0.8125rem',
                          color: category.level > 0 ? 'text.secondary' : 'text.primary'
                        }}
                      >
                        {category.name}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      maxWidth: 300,
                      fontSize: category.level > 0 ? '0.8125rem' : '0.875rem',
                      color: category.level > 0 ? 'text.secondary' : 'text.primary'
                    }}
                  >
                    {category.description || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={category.products_count}
                    size="small"
                    color={category.products_count > 0 ? 'primary' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={category.children.length}
                    size="small"
                    color={category.children.length > 0 ? 'secondary' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {getStatusChip(category.is_active)}
                </TableCell>
                <TableCell align="center">
                  <Typography 
                    variant="body2"
                    sx={{ 
                      fontSize: category.level > 0 ? '0.8125rem' : '0.875rem',
                      color: category.level > 0 ? 'text.secondary' : 'text.primary'
                    }}
                  >
                    {category.typical_duration_hours || '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, category)}
                    disabled={isDeleting}
                  >
                    {isDeleting && selectedCategory?.id === category.id ? (
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