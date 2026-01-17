// frontend/admin-crm/src/pages/settings/commerce/ProductsPackages.tsx

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  Chip,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Category as CategoryIcon,
  Inventory as ProductIcon,
  LocalOffer as DiscountIcon,
  LocationOn as VenueIcon,
  Store as VendorIcon,
} from '@mui/icons-material';
import { useProductCategories, useProducts, useDiscounts } from '../../../hooks/useProducts';
import { useVenues } from '../../../hooks/useVenues';
import { useVendors } from '../../../hooks/useVendors';
import {
  ModernPageHeader,
  ModernDialog,
  createDeleteActions,
  ModernSettingsLayout
} from '../../../components/common';
import { type HeaderAction, createRefreshAction, createAddAction } from '../../../components/common/ModernPageHeader';
import { CategoriesTable } from '../../../components/products/CategoriesTable';
import { ProductsTable } from '../../../components/products/ProductsTable';
import { DiscountsTable } from '../../../components/products/DiscountsTable';
import { CategoryFormDialog } from '../../../components/products/CategoryFormDialog';
import { ProductFormDialog } from '../../../components/products/ProductFormDialog';
import { DiscountFormDialog } from '../../../components/products/DiscountFormDialog';
import { VenuesTable, VenueFormDialog } from '../../../components/venues';
import { VendorsTable, VendorFormDialog } from '../../../components/vendors';
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
import type {
  VenueListItem,
  VenueDetail,
  CreateVenueData,
  UpdateVenueData,
} from '../../../types/venues.types';
import type {
  VendorListItem,
  VendorDetail,
  CreateVendorData,
  UpdateVendorData,
} from '../../../types/vendors.types';

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
  const [categoryActiveFilter, _setCategoryActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [productSearch, setProductSearch] = useState('');
  const [productTypeFilter, _setProductTypeFilter] = useState<'all' | 'PRODUCT' | 'PACKAGE'>('all');
  const [productActiveFilter, _setProductActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [discountSearch, setDiscountSearch] = useState('');
  const [discountTypeFilter, _setDiscountTypeFilter] = useState<'all' | 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS'>('all');
  const [discountValidFilter, _setDiscountValidFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [venueSearch, setVenueSearch] = useState('');
  const [vendorSearch, setVendorSearch] = useState('');

  // Header search functionality
  const [showSearchField, setShowSearchField] = useState(false);
  const [headerSearchQuery, setHeaderSearchQuery] = useState('');
  
  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductOption | null>(null);
  const [editingDiscount, setEditingDiscount] = useState<Discount | null>(null);
  const [editingVenue, setEditingVenue] = useState<VenueListItem | VenueDetail | null>(null);
  const [editingVendor, setEditingVendor] = useState<VendorListItem | VendorDetail | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'category' | 'product' | 'discount' | 'venue' | 'vendor';
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

  const venueFilters = useMemo(() => ({
    search: venueSearch || undefined,
  }), [venueSearch]);

  const vendorFilters = useMemo(() => ({
    search: vendorSearch || undefined,
  }), [vendorSearch]);

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

  const {
    venues,
    isLoadingVenues,
    createVenue,
    updateVenue,
    deleteVenue,
    isCreatingVenue,
    isUpdatingVenue,
    isDeletingVenue,
  } = useVenues(venueFilters);

  const {
    vendors,
    isLoadingVendors,
    createVendor,
    updateVendor,
    deleteVendor,
    isCreatingVendor,
    isUpdatingVendor,
    isDeletingVendor,
  } = useVendors(vendorFilters);

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

  const handleProductSubmit = (data: CreateProductData | UpdateProductData, formData?: FormData) => {
    if (editingProduct) {
      updateProduct({ id: editingProduct.id, data: data as UpdateProductData, formData });
    } else {
      createProduct({ data: data as CreateProductData, formData });
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

  // Venue handlers
  const handleCreateVenue = () => {
    setEditingVenue(null);
    setVenueDialogOpen(true);
  };

  const handleEditVenue = (venue: VenueListItem) => {
    setEditingVenue(venue);
    setVenueDialogOpen(true);
  };

  const handleDeleteVenue = (id: number) => {
    const venue = venues.find(v => v.id === id);
    if (venue) {
      setItemToDelete({
        type: 'venue',
        id,
        name: venue.name
      });
      setDeleteDialogOpen(true);
    }
  };

  const handleVenueSubmit = (data: CreateVenueData | UpdateVenueData, formData?: FormData) => {
    if (editingVenue) {
      updateVenue({ id: editingVenue.id, data: data as UpdateVenueData, formData });
    } else {
      createVenue({ data: data as CreateVenueData, formData });
    }
    setVenueDialogOpen(false);
  };

  // Vendor handlers
  const handleCreateVendor = () => {
    setEditingVendor(null);
    setVendorDialogOpen(true);
  };

  const handleEditVendor = (vendor: VendorListItem) => {
    setEditingVendor(vendor);
    setVendorDialogOpen(true);
  };

  const handleDeleteVendor = (id: number) => {
    const vendor = vendors.find(v => v.id === id);
    if (vendor) {
      setItemToDelete({
        type: 'vendor',
        id,
        name: vendor.name
      });
      setDeleteDialogOpen(true);
    }
  };

  const handleVendorSubmit = (data: CreateVendorData | UpdateVendorData) => {
    if (editingVendor) {
      updateVendor({ id: editingVendor.id, data: data as UpdateVendorData });
    } else {
      createVendor(data as CreateVendorData);
    }
    setVendorDialogOpen(false);
  };

  // Delete handlers
  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;

    const { type, id } = itemToDelete;
    
    const deleteActions = {
      category: () => deleteCategory(id),
      product: () => deleteProduct(id),
      discount: () => deleteDiscount(id),
      venue: () => deleteVenue(id),
      vendor: () => deleteVendor(id),
    };

    deleteActions[type]();
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleHeaderSearch = (query: string) => {
    setHeaderSearchQuery(query);
    // Apply to current tab's search
    switch (activeTab) {
      case 0:
        setProductSearch(query);
        break;
      case 1:
        setCategorySearch(query);
        break;
      case 2:
        setDiscountSearch(query);
        break;
      case 3:
        setVenueSearch(query);
        break;
      case 4:
        setVendorSearch(query);
        break;
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleToggleSearch = () => {
    setShowSearchField(!showSearchField);
    if (!showSearchField) {
      setHeaderSearchQuery('');
      setCategorySearch('');
      setProductSearch('');
      setDiscountSearch('');
      setVenueSearch('');
      setVendorSearch('');
    }
  };

  const handleCreateNew = () => {
    switch (activeTab) {
      case 0:
        handleCreateProduct();
        break;
      case 1:
        handleCreateCategory();
        break;
      case 2:
        handleCreateDiscount();
        break;
      case 3:
        handleCreateVenue();
        break;
      case 4:
        handleCreateVendor();
        break;
    }
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
      venue: isDeletingVenue,
      vendor: isDeletingVendor,
    }[type];
  };


  return (
    <ModernSettingsLayout>
      {/* Modern Header */}
      {(() => {
        // Header actions
        const headerActions: HeaderAction[] = [
          {
            icon: <SearchIcon />,
            label: showSearchField ? 'Hide Search' : 'Search',
            onClick: handleToggleSearch,
            variant: 'icon',
            tooltip: showSearchField ? 'Hide search field' : 'Search products, categories, and discounts',
          },
          createRefreshAction(handleRefresh),
        ];

        const getTabLabel = () => {
          switch (activeTab) {
            case 0: return 'Product';
            case 1: return 'Category';
            case 2: return 'Discount';
            case 3: return 'Venue';
            case 4: return 'Vendor';
            default: return 'Item';
          }
        };

        const primaryAction = createAddAction(`Add ${getTabLabel()}`, handleCreateNew, 'primary');

        return (
          <ModernPageHeader
            title="Products & Packages"
            subtitle="Manage your service offerings, pricing, and promotional discounts"
            icon={<ProductIcon />}
            breadcrumbs={[
              { label: 'Settings' },
              { label: 'Commerce' },
              { label: 'Products & Packages' },
            ]}
            primaryAction={primaryAction}
            secondaryActions={headerActions}
            stats={[
              { label: 'Products', value: products.length },
              { label: 'Categories', value: categories.length },
              { label: 'Discounts', value: discounts.filter(d => d.is_active).length },
              { label: 'Venues', value: venues.length },
              { label: 'Vendors', value: vendors.length },
            ]}
            size="medium"
          />
        );
      })()}

      {/* Search Field - Conditionally Shown */}
      {showSearchField && (
        <Box sx={{ mb: 4, borderRadius: 1, bgcolor: 'background.paper', p: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={1}>
            <SearchIcon color="primary" />
            <Typography variant="h6" fontWeight="600">
              Search Products & Packages
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Find products, categories, and discounts by name or description
          </Typography>
          <TextField
            fullWidth
            placeholder="Search by name, description, or type..."
            value={headerSearchQuery}
            onChange={(e) => handleHeaderSearch(e.target.value)}
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      )}

      {/* Tabs */}
      <Box sx={{ mb: 3, borderRadius: 1, bgcolor: 'background.paper' }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
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
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <VenueIcon />
                Venues
                <Chip label={venues.length} size="small" />
              </Box>
            }
          />
          <Tab
            label={
              <Box display="flex" alignItems="center" gap={1}>
                <VendorIcon />
                Vendors
                <Chip label={vendors.length} size="small" />
              </Box>
            }
          />
        </Tabs>

        {/* Products Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box p={3}>

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

        {/* Venues Tab */}
        <TabPanel value={activeTab} index={3}>
          <Box p={3}>

            {/* Venues Alert */}
            <Alert severity="info" sx={{ mb: 3 }}>
              Venues define physical locations and their operating rules. Each venue has configurable
              check-in/checkout times, duration limits, and optional early/late fees. Assign venues to
              packages to determine booking rules.
            </Alert>

            {/* Venues Table */}
            <VenuesTable
              venues={venues}
              isLoading={isLoadingVenues}
              onEdit={handleEditVenue}
              onDelete={handleDeleteVenue}
              isDeleting={isDeletingVenue}
            />
          </Box>
        </TabPanel>

        {/* Vendors Tab */}
        <TabPanel value={activeTab} index={4}>
          <Box p={3}>

            {/* Vendors Alert */}
            <Alert severity="info" sx={{ mb: 3 }}>
              Vendors are service providers (catering, photography, florists, DJs, etc.) that can be
              included in packages. Configure vendor details, contact information, and optional operating
              rules for lead times and service duration.
            </Alert>

            {/* Vendors Table */}
            <VendorsTable
              vendors={vendors}
              isLoading={isLoadingVendors}
              onEdit={handleEditVendor}
              onDelete={handleDeleteVendor}
              isDeleting={isDeletingVendor}
            />
          </Box>
        </TabPanel>
      </Box>

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

      <VenueFormDialog
        open={venueDialogOpen}
        onClose={() => setVenueDialogOpen(false)}
        editingVenue={editingVenue}
        onSubmit={handleVenueSubmit}
        isLoading={isCreatingVenue || isUpdatingVenue}
      />

      <VendorFormDialog
        open={vendorDialogOpen}
        onClose={() => setVendorDialogOpen(false)}
        editingVendor={editingVendor}
        onSubmit={handleVendorSubmit}
        isLoading={isCreatingVendor || isUpdatingVendor}
      />

      {/* Delete Confirmation Dialog */}
      <ModernDialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        title={`Delete ${getDeleteItemType()}`}
        maxWidth="sm"
        fullWidth
        actions={createDeleteActions(handleDeleteCancel, handleDeleteConfirm, isDeleting())}
      >
        <Typography>
          Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
        </Typography>
      </ModernDialog>
    </ModernSettingsLayout>
  );
};