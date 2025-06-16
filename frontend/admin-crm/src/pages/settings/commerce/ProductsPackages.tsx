// frontend/admin-crm/src/pages/settings/commerce/ProductsPackages.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Category as CategoryIcon,
  Inventory as ProductIcon,
  LocalOffer as DiscountIcon,
} from '@mui/icons-material';
import { useLayout } from '../../../contexts/LayoutContext';
import { useProducts, useProductCategories, useDiscounts } from '../../../hooks/useProducts';
import { 
  ProductsTable,
  CategoriesTable,
  DiscountsTable,
  ProductFormDialog,
  CategoryFormDialog,
  DiscountFormDialog
} from '../../../components/products';
import type { ProductFilters, CategoryFilters, DiscountFilters, ProductType, DiscountType, CreateProductData, UpdateProductData, CreateCategoryData, UpdateCategoryData, CreateDiscountData, UpdateDiscountData } from '../../../types/products.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`products-tabpanel-${index}`}
      aria-labelledby={`products-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

export const ProductsPackages: React.FC = () => {
  const { setBreadcrumbs } = useLayout();
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  
  // Filter states
  const [productFilters, setProductFilters] = useState<ProductFilters>({});
  const [categoryFilters, setCategoryFilters] = useState<CategoryFilters>({});
  const [discountFilters, setDiscountFilters] = useState<DiscountFilters>({});
  
  // Filter menu state
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);

  // Hooks
  const { 
    products, 
    isLoadingProducts, 
    createProduct, 
    updateProduct, 
    deleteProduct,
    isCreatingProduct,
    isUpdatingProduct,
    isDeletingProduct
  } = useProducts(productFilters);
  
  const { 
    categories, 
    isLoadingCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory,
    isCreatingCategory,
    isUpdatingCategory,
    isDeletingCategory
  } = useProductCategories(categoryFilters);
  
  const { 
    discounts, 
    isLoadingDiscounts, 
    createDiscount, 
    updateDiscount, 
    deleteDiscount,
    isCreatingDiscount,
    isUpdatingDiscount,
    isDeletingDiscount
  } = useDiscounts(discountFilters);

  useEffect(() => {
    setBreadcrumbs([
      { label: 'Settings', path: '/settings' },
      { label: 'Commerce' },
      { label: 'Products & Packages' },
    ]);
  }, [setBreadcrumbs]);

  // @ts-ignore
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setFilterMenuAnchor(null);
  };

  const handleFilterMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterMenuAnchor(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };

  const handleAddClick = () => {
    switch (tabValue) {
      case 0: // Products
        setEditingProduct(null);
        setProductDialogOpen(true);
        break;
      case 1: // Categories
        setEditingCategory(null);
        setCategoryDialogOpen(true);
        break;
      case 2: // Discounts
        setEditingDiscount(null);
        setDiscountDialogOpen(true);
        break;
    }
  };

  const handleEditProduct = (item: any) => {
    setEditingProduct(item);
    setProductDialogOpen(true);
  };

  const handleEditCategory = (item: any) => {
    setEditingCategory(item);
    setCategoryDialogOpen(true);
  };

  const handleEditDiscount = (item: any) => {
    setEditingDiscount(item);
    setDiscountDialogOpen(true);
  };

  const handleDeleteProduct = (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
    }
  };

  const handleDeleteCategory = (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      deleteCategory(id);
    }
  };

  const handleDeleteDiscount = (id: number) => {
    if (window.confirm('Are you sure you want to delete this discount?')) {
      deleteDiscount(id);
    }
  };

  const handleDialogClose = () => {
    setProductDialogOpen(false);
    setCategoryDialogOpen(false);
    setDiscountDialogOpen(false);
    setEditingProduct(null);
    setEditingCategory(null);
    setEditingDiscount(null);
  };

  const handleSearchChange = (value: string) => {
    switch (tabValue) {
      case 0: // Products
        setProductFilters(prev => ({ ...prev, search: value || undefined }));
        break;
      case 1: // Categories
        setCategoryFilters(prev => ({ ...prev, search: value || undefined }));
        break;
      case 2: // Discounts
        setDiscountFilters(prev => ({ ...prev, search: value || undefined }));
        break;
    }
  };

  const handleTypeFilter = (type: ProductType | null) => {
    setProductFilters(prev => ({ ...prev, type: type || undefined }));
    handleFilterMenuClose();
  };

  const handleDiscountTypeFilter = (type: DiscountType | null) => {
    setDiscountFilters(prev => ({ ...prev, discount_type: type || undefined }));
    handleFilterMenuClose();
  };

  const handleActiveFilter = (isActive: boolean | null) => {
    switch (tabValue) {
      case 0: // Products
        setProductFilters(prev => ({ ...prev, is_active: isActive || undefined }));
        break;
      case 1: // Categories
        setCategoryFilters(prev => ({ ...prev, is_active: isActive || undefined }));
        break;
      case 2: // Discounts
        setDiscountFilters(prev => ({ ...prev, is_active: isActive || undefined }));
        break;
    }
    handleFilterMenuClose();
  };

  const getCurrentSearchValue = () => {
    switch (tabValue) {
      case 0: return productFilters.search || '';
      case 1: return categoryFilters.search || '';
      case 2: return discountFilters.search || '';
      default: return '';
    }
  };

  const getTabLabel = (label: string, count: number) => (
    <Box display="flex" alignItems="center" gap={1}>
      {label}
      <Chip size="small" label={count} />
    </Box>
  );

  const renderFilterMenu = () => (
    <Menu
      anchorEl={filterMenuAnchor}
      open={Boolean(filterMenuAnchor)}
      onClose={handleFilterMenuClose}
    >
      {tabValue === 0 && [
        <MenuItem key="all-types" onClick={() => handleTypeFilter(null)}>
          <ListItemText>All Types</ListItemText>
        </MenuItem>,
        <MenuItem key="product" onClick={() => handleTypeFilter('PRODUCT')}>
          <ListItemText>Products Only</ListItemText>
        </MenuItem>,
        <MenuItem key="package" onClick={() => handleTypeFilter('PACKAGE')}>
          <ListItemText>Packages Only</ListItemText>
        </MenuItem>
      ]}
      
      {tabValue === 2 && [
        <MenuItem key="all-discount-types" onClick={() => handleDiscountTypeFilter(null)}>
          <ListItemText>All Types</ListItemText>
        </MenuItem>,
        <MenuItem key="percentage" onClick={() => handleDiscountTypeFilter('PERCENTAGE')}>
          <ListItemText>Percentage</ListItemText>
        </MenuItem>,
        <MenuItem key="fixed" onClick={() => handleDiscountTypeFilter('FIXED')}>
          <ListItemText>Fixed Amount</ListItemText>
        </MenuItem>,
        <MenuItem key="free-hours" onClick={() => handleDiscountTypeFilter('FREE_HOURS')}>
          <ListItemText>Free Hours</ListItemText>
        </MenuItem>
      ]}
      
      <MenuItem key="all-status" onClick={() => handleActiveFilter(null)}>
        <ListItemText>All Status</ListItemText>
      </MenuItem>
      <MenuItem key="active" onClick={() => handleActiveFilter(true)}>
        <ListItemText>Active Only</ListItemText>
      </MenuItem>
      <MenuItem key="inactive" onClick={() => handleActiveFilter(false)}>
        <ListItemText>Inactive Only</ListItemText>
      </MenuItem>
    </Menu>
  );

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Products & Packages
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your products, packages, categories, and discounts
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
          sx={{ minWidth: 120 }}
        >
          Add {tabValue === 0 ? 'Product' : tabValue === 1 ? 'Category' : 'Discount'}
        </Button>
      </Box>

      {/* Tabs */}
      <Card elevation={2}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              icon={<ProductIcon />} 
              label={getTabLabel('Products & Packages', products.length)} 
              iconPosition="start"
            />
            <Tab 
              icon={<CategoryIcon />} 
              label={getTabLabel('Categories', categories.length)} 
              iconPosition="start"
            />
            <Tab 
              icon={<DiscountIcon />} 
              label={getTabLabel('Discounts', discounts.length)} 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <CardContent sx={{ p: 0 }}>
          {/* Search and Filter Bar */}
          <Box 
            display="flex" 
            justifyContent="space-between" 
            alignItems="center" 
            p={3} 
            borderBottom={1} 
            borderColor="divider"
          >
            <TextField
              placeholder={`Search ${tabValue === 0 ? 'products and packages' : tabValue === 1 ? 'categories' : 'discounts'}...`}
              value={getCurrentSearchValue()}
              onChange={(e) => handleSearchChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 300 }}
            />
            
            <Tooltip title="Filter options">
              <IconButton onClick={handleFilterMenuOpen}>
                <FilterIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Tab Panels */}
          <TabPanel value={tabValue} index={0}>
            <ProductsTable
              products={products}
              isLoading={isLoadingProducts}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              isDeleting={isDeletingProduct}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <CategoriesTable
              categories={categories}
              isLoading={isLoadingCategories}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              isDeleting={isDeletingCategory}
            />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <DiscountsTable
              discounts={discounts}
              isLoading={isLoadingDiscounts}
              onEdit={handleEditDiscount}
              onDelete={handleDeleteDiscount}
              isDeleting={isDeletingDiscount}
            />
          </TabPanel>
        </CardContent>
      </Card>

      {/* Filter Menu */}
      {renderFilterMenu()}

      {/* Dialogs */}
      <ProductFormDialog
        open={productDialogOpen}
        onClose={handleDialogClose}
        editingProduct={editingProduct}
        onSubmit={(data: CreateProductData | UpdateProductData) => {
          if (editingProduct) {
            // For update, we know we have UpdateProductData
            updateProduct({ id: editingProduct.id, data: data as UpdateProductData });
          } else {
            // For create, we know we have CreateProductData
            createProduct(data as CreateProductData);
          }
        }}
        isLoading={editingProduct ? isUpdatingProduct : isCreatingProduct}
      />

      <CategoryFormDialog
        open={categoryDialogOpen}
        onClose={handleDialogClose}
        editingCategory={editingCategory}
        onSubmit={(data: CreateCategoryData | UpdateCategoryData) => {
          if (editingCategory) {
            updateCategory({ id: editingCategory.id, data: data as UpdateCategoryData });
          } else {
            createCategory(data as CreateCategoryData);
          }
        }}
        isLoading={editingCategory ? isUpdatingCategory : isCreatingCategory}
      />

      <DiscountFormDialog
        open={discountDialogOpen}
        onClose={handleDialogClose}
        editingDiscount={editingDiscount}
        onSubmit={(data: CreateDiscountData | UpdateDiscountData) => {
          if (editingDiscount) {
            updateDiscount({ id: editingDiscount.id, data: data as UpdateDiscountData });
          } else {
            createDiscount(data as CreateDiscountData);
          }
        }}
        isLoading={editingDiscount ? isUpdatingDiscount : isCreatingDiscount}
      />
    </Box>
  );
};