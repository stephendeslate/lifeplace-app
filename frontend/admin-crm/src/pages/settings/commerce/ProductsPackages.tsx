// frontend/admin-crm/src/pages/settings/commerce/ProductsPackages.tsx

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Alert,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Category as CategoryIcon,
  Inventory as ProductIcon,
  LocalOffer as DiscountIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useProductCategories, useProducts, useDiscounts } from '../../../hooks/useProducts';
import { CategoriesTable } from '../../../components/products/CategoriesTable';
import { ProductsTable } from '../../../components/products/ProductsTable';
import { DiscountsTable } from '../../../components/products/DiscountsTable';
import { CategoryFormDialog } from '../../../components/products/CategoryFormDialog';
import { ProductFormDialog } from '../../../components/products/ProductFormDialog';
import { DiscountFormDialog } from '../../../components/products/DiscountFormDialog';
import type { 
  ProductCategory, 
  ProductOption, 
  Discount,
  CreateCategoryData,
  UpdateCategoryData,
  CreateProductData,
  UpdateProductData,
  CreateDiscountData,
  UpdateDiscountData,
} from '../../../types/products.types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => {
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
  const [activeTab, setActiveTab] = useState(0);
  
  // Search and filter states
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryActiveFilter, setCategoryActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [productSearch, setProductSearch] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState<'all' | 'PRODUCT' | 'PACKAGE'>('all');
  const [productActiveFilter, setProductActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [discountSearch, setDiscountSearch] = useState('');
  const [discountTypeFilter, setDiscountTypeFilter] = useState<'all' | 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS'>('all');
  const [discountValidFilter, setDiscountValidFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  
  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductOption | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'category' | 'product' | 'discount';
    id: number;
    name: string;
  } | null>(null);

  // Get filters for API calls - Note: use_pagination: false to get all results
  const categoryFilters = useMemo(() => ({
    search: categorySearch || undefined,
    is_active: categoryActiveFilter === 'all' ? undefined : categoryActiveFilter === 'active',
    use_pagination: false, // This will ensure we get all categories
  }), [categorySearch, categoryActiveFilter]);

  const productFilters = useMemo(() => ({
    search: productSearch || undefined,
    type: productTypeFilter === 'all' ? undefined : productTypeFilter,
    is_active: productActiveFilter === 'all' ? undefined : productActiveFilter === 'active',
    use_pagination: false, // This will ensure we get all products
  }), [productSearch, productTypeFilter, productActiveFilter]);

  const discountFilters = useMemo(() => ({
    search: discountSearch || undefined,
    discount_type: discountTypeFilter === 'all' ? undefined : discountTypeFilter,
    is_valid: discountValidFilter === 'all' ? undefined : discountValidFilter === 'valid',
    use_pagination: false, // This will ensure we get all discounts
  }), [discountSearch, discountTypeFilter, discountValidFilter]);

  // Hooks
  const {
    categories,
    isLoadingCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    isCreatingCategory,
    isUpdatingCategory,
    isDeletingCategory,
  } = useProductCategories(categoryFilters);

  const {
    products,
    isLoadingProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    isCreatingProduct,
    isUpdatingProduct,
    isDeletingProduct,
  } = useProducts(productFilters);

  const {
    discounts,
    isLoadingDiscounts,
    createDiscount,
    updateDiscount,
    deleteDiscount,
    isCreatingDiscount,
    isUpdatingDiscount,
    isDeletingDiscount,
  } = useDiscounts(discountFilters);

  // Event handlers
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Category handlers
  const handleCreateCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleEditCategory = (category: ProductCategory) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleDeleteCategory = (id: number) => {
    const category = categories.find(c => c.id === id);
    if (category) {
      setItemToDelete({
        type: 'category',
        id,
        name: category.name
      });
      setDeleteDialogOpen(true);
    }
  };

  const handleCategorySubmit = (data: CreateCategoryData | UpdateCategoryData) => {
    if (editingCategory) {
      updateCategory({ id: editingCategory.id, data: data as UpdateCategoryData });
    } else {
      createCategory(data as CreateCategoryData);
    }
    setCategoryDialogOpen(false);
  };

  // Product handlers
  const handleCreateProduct = () => {
    setEditingProduct(null);
    setProductDialogOpen(true);
  };

  const handleEditProduct = (product: ProductOption) => {
    setEditingProduct(product);
    setProductDialogOpen(true);
  };

  const handleDeleteProduct = (id: number) => {
    const product = products.find(p => p.id === id);
    if (product) {
      setItemToDelete({
        type: 'product',
        id,
        name: product.name
      });
      setDeleteDialogOpen(true);
    }
  };

  const handleProductSubmit = (data: CreateProductData | UpdateProductData) => {
    if (editingProduct) {
      updateProduct({ id: editingProduct.id, data: data as UpdateProductData });
    } else {
      createProduct(data as CreateProductData);
    }
    setProductDialogOpen(false);
  };

  // Discount handlers
  const handleCreateDiscount = () => {
    setEditingDiscount(null);
    setDiscountDialogOpen(true);
  };

  const handleEditDiscount = (discount: Discount) => {
    setEditingDiscount(discount);
    setDiscountDialogOpen(true);
  };

  const handleDeleteDiscount = (id: number) => {
    const discount = discounts.find(d => d.id === id);
    if (discount) {
      setItemToDelete({
        type: 'discount',
        id,
        name: discount.name
      });
      setDeleteDialogOpen(true);
    }
  };

  const handleDiscountSubmit = (data: CreateDiscountData | UpdateDiscountData) => {
    if (editingDiscount) {
      updateDiscount({ id: editingDiscount.id, data: data as UpdateDiscountData });
    } else {
      createDiscount(data as CreateDiscountData);
    }
    setDiscountDialogOpen(false);
  };

  // Delete handlers
  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;

    const { type, id } = itemToDelete;
    
    const deleteActions = {
      category: () => deleteCategory(id),
      product: () => deleteProduct(id),
      discount: () => deleteDiscount(id),
    };

    deleteActions[type]();
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const getDeleteItemType = () => {
    if (!itemToDelete) return '';
    return itemToDelete.type.charAt(0).toUpperCase() + itemToDelete.type.slice(1);
  };

  const isDeleting = () => {
    if (!itemToDelete) return false;
    const { type } = itemToDelete;
    return {
      category: isDeletingCategory,
      product: isDeletingProduct,
      discount: isDeletingDiscount,
    }[type];
  };

  // Clear filters
  const clearCategoryFilters = () => {
    setCategorySearch('');
    setCategoryActiveFilter('all');
  };

  const clearProductFilters = () => {
    setProductSearch('');
    setProductTypeFilter('all');
    setProductActiveFilter('all');
  };

  const clearDiscountFilters = () => {
    setDiscountSearch('');
    setDiscountTypeFilter('all');
    setDiscountValidFilter('all');
  };

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h4" gutterBottom>
          Products & Packages
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your service offerings, pricing, and promotional discounts
        </Typography>
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <ProductIcon />
                Products & Packages
                <Chip label={products.length} size="small" />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <CategoryIcon />
                Categories
                <Chip label={categories.length} size="small" />
              </Box>
            } 
          />
          <Tab 
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <DiscountIcon />
                Discounts
                <Chip label={discounts.length} size="small" />
              </Box>
            } 
          />
        </Tabs>

        {/* Products Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box p={3}>
            {/* Products Filters */}
            <Box mb={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                <Box flex={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search products"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                
                <Box sx={{ minWidth: 120 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={productTypeFilter}
                      onChange={(e) => setProductTypeFilter(e.target.value as any)}
                      label="Type"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="PRODUCT">Products</MenuItem>
                      <MenuItem value="PACKAGE">Packages</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ minWidth: 120 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={productActiveFilter}
                      onChange={(e) => setProductActiveFilter(e.target.value as any)}
                      label="Status"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Button
                  variant="outlined"
                  onClick={clearProductFilters}
                  startIcon={<FilterIcon />}
                >
                  Clear
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleCreateProduct}
                  startIcon={<AddIcon />}
                >
                  Add Product
                </Button>
              </Stack>
            </Box>

            {/* Products Alert */}
            <Alert severity="info" sx={{ mb: 3 }}>
              Products are individual services, while packages are bundles of services. 
              Configure pricing, timing, and booking requirements for each offering.
            </Alert>

            {/* Products Table */}
            <ProductsTable
              products={products}
              isLoading={isLoadingProducts}
              onEdit={handleEditProduct}
              onDelete={handleDeleteProduct}
              isDeleting={isDeletingProduct}
            />
          </Box>
        </TabPanel>

        {/* Categories Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box p={3}>
            {/* Categories Filters */}
            <Box mb={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                <Box flex={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search categories"
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                
                <Box sx={{ minWidth: 120 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Status</InputLabel>
                    <Select
                      value={categoryActiveFilter}
                      onChange={(e) => setCategoryActiveFilter(e.target.value as any)}
                      label="Status"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="active">Active</MenuItem>
                      <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Button
                  variant="outlined"
                  onClick={clearCategoryFilters}
                  startIcon={<FilterIcon />}
                >
                  Clear
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleCreateCategory}
                  startIcon={<AddIcon />}
                >
                  Add Category
                </Button>
              </Stack>
            </Box>

            {/* Categories Alert */}
            <Alert severity="info" sx={{ mb: 3 }}>
              Categories help organize your products and packages. Create a hierarchical structure 
              that makes sense for your business offerings.
            </Alert>

            {/* Categories Table */}
            <CategoriesTable
              categories={categories}
              isLoading={isLoadingCategories}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              isDeleting={isDeletingCategory}
            />
          </Box>
        </TabPanel>

        {/* Discounts Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box p={3}>
            {/* Discounts Filters */}
            <Box mb={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="flex-end">
                <Box flex={1}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Search discounts"
                    value={discountSearch}
                    onChange={(e) => setDiscountSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Box>
                
                <Box sx={{ minWidth: 120 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={discountTypeFilter}
                      onChange={(e) => setDiscountTypeFilter(e.target.value as any)}
                      label="Type"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="PERCENTAGE">Percentage</MenuItem>
                      <MenuItem value="FIXED">Fixed Amount</MenuItem>
                      <MenuItem value="FREE_HOURS">Free Hours</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Box sx={{ minWidth: 120 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Validity</InputLabel>
                    <Select
                      value={discountValidFilter}
                      onChange={(e) => setDiscountValidFilter(e.target.value as any)}
                      label="Validity"
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="valid">Valid</MenuItem>
                      <MenuItem value="invalid">Invalid</MenuItem>
                    </Select>
                  </FormControl>
                </Box>
                
                <Button
                  variant="outlined"
                  onClick={clearDiscountFilters}
                  startIcon={<FilterIcon />}
                >
                  Clear
                </Button>
                
                <Button
                  variant="contained"
                  onClick={handleCreateDiscount}
                  startIcon={<AddIcon />}
                >
                  Add Discount
                </Button>
              </Stack>
            </Box>

            {/* Discounts Alert */}
            <Alert severity="info" sx={{ mb: 3 }}>
              Create promotional discounts to incentivize bookings. Set validity periods, 
              usage limits, and specific requirements for each discount.
            </Alert>

            {/* Discounts Table */}
            <DiscountsTable
              discounts={discounts}
              isLoading={isLoadingDiscounts}
              onEdit={handleEditDiscount}
              onDelete={handleDeleteDiscount}
              isDeleting={isDeletingDiscount}
            />
          </Box>
        </TabPanel>
      </Paper>

      {/* Dialogs */}
      <CategoryFormDialog
        open={categoryDialogOpen}
        onClose={() => setCategoryDialogOpen(false)}
        editingCategory={editingCategory}
        onSubmit={handleCategorySubmit}
        isLoading={isCreatingCategory || isUpdatingCategory}
      />

      <ProductFormDialog
        open={productDialogOpen}
        onClose={() => setProductDialogOpen(false)}
        editingProduct={editingProduct}
        onSubmit={handleProductSubmit}
        isLoading={isCreatingProduct || isUpdatingProduct}
      />

      <DiscountFormDialog
        open={discountDialogOpen}
        onClose={() => setDiscountDialogOpen(false)}
        editingDiscount={editingDiscount}
        onSubmit={handleDiscountSubmit}
        isLoading={isCreatingDiscount || isUpdatingDiscount}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Delete {getDeleteItemType()}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} disabled={isDeleting()}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            disabled={isDeleting()}
          >
            {isDeleting() ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};