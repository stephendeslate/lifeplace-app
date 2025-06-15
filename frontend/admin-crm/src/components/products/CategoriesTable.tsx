// frontend/admin-crm/src/components/products/CategoriesTable.tsx

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
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import type { ProductCategory } from '../../types/products.types';

interface CategoriesTableProps {
  categories: ProductCategory[];
  isLoading: boolean;
  onEdit: (category: ProductCategory) => void;
  onDelete: (id: number) => void;
  isDeleting: boolean;
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

  const getStatusChip = (isActive: boolean) => (
    <Chip
      label={isActive ? 'Active' : 'Inactive'}
      size="small"
      color={isActive ? 'success' : 'default'}
      variant={isActive ? 'filled' : 'outlined'}
    />
  );

  const getCategoryIcon = (category: ProductCategory) => {
    if (category.children_count > 0) {
      return <FolderOpenIcon color="primary" />;
    } else if (category.parent) {
      return <CategoryIcon color="action" />;
    } else {
      return <FolderIcon color="primary" />;
    }
  };

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
            {categories.map((category) => (
              <TableRow 
                key={category.id} 
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => onEdit(category)}
              >
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getCategoryIcon(category)}
                    <Box>
                      <Typography variant="subtitle2" fontWeight="medium">
                        {category.name}
                      </Typography>
                      {category.parent && (
                        <Typography variant="caption" color="text.secondary">
                          {category.full_path}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 300 }}>
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
                    label={category.children_count}
                    size="small"
                    color={category.children_count > 0 ? 'secondary' : 'default'}
                    variant="outlined"
                  />
                </TableCell>
                <TableCell>
                  {getStatusChip(category.is_active)}
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2">
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