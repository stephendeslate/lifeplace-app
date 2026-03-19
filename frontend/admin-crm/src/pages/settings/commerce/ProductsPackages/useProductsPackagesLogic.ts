import { useState, useMemo } from 'react';
import { useProductCategories, useProducts, useDiscounts } from '@/hooks/useProducts';
import { useVenues } from '@/hooks/useVenues';
import { useVendors } from '@/hooks/useVendors';
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
} from '@/types/products.types';
import type {
  VenueListItem,
  VenueDetail,
  CreateVenueData,
  UpdateVenueData,
} from '@/types/venues.types';
import type {
  VendorListItem,
  VendorDetail,
  CreateVendorData,
  UpdateVendorData,
} from '@/types/vendors.types';

export function useProductsPackagesLogic() {
  const [activeTab, setActiveTab] = useState(0);

  // Search and filter states
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryActiveFilter, _setCategoryActiveFilter] = useState<'all' | 'active' | 'inactive'>(
    'all',
  );
  const [productSearch, setProductSearch] = useState('');
  const [productTypeFilter, _setProductTypeFilter] = useState<'all' | 'PRODUCT' | 'PACKAGE'>('all');
  const [productActiveFilter, _setProductActiveFilter] = useState<'all' | 'active' | 'inactive'>(
    'all',
  );
  const [discountSearch, setDiscountSearch] = useState('');
  const [discountTypeFilter, _setDiscountTypeFilter] = useState<
    'all' | 'PERCENTAGE' | 'FIXED' | 'FREE_HOURS'
  >('all');
  const [discountValidFilter, _setDiscountValidFilter] = useState<'all' | 'valid' | 'invalid'>(
    'all',
  );
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

  // Get filters for API calls
  const categoryFilters = useMemo(
    () => ({
      search: categorySearch || undefined,
      is_active: categoryActiveFilter === 'all' ? undefined : categoryActiveFilter === 'active',
      use_pagination: false,
    }),
    [categorySearch, categoryActiveFilter],
  );

  const productFilters = useMemo(
    () => ({
      search: productSearch || undefined,
      type: productTypeFilter === 'all' ? undefined : productTypeFilter,
      is_active: productActiveFilter === 'all' ? undefined : productActiveFilter === 'active',
      use_pagination: false,
    }),
    [productSearch, productTypeFilter, productActiveFilter],
  );

  const discountFilters = useMemo(
    () => ({
      search: discountSearch || undefined,
      discount_type: discountTypeFilter === 'all' ? undefined : discountTypeFilter,
      is_valid: discountValidFilter === 'all' ? undefined : discountValidFilter === 'valid',
      use_pagination: false,
    }),
    [discountSearch, discountTypeFilter, discountValidFilter],
  );

  const venueFilters = useMemo(
    () => ({
      search: venueSearch || undefined,
    }),
    [venueSearch],
  );

  const vendorFilters = useMemo(
    () => ({
      search: vendorSearch || undefined,
    }),
    [vendorSearch],
  );

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
    const category = categories.find((c) => c.id === id);
    if (category) {
      setItemToDelete({ type: 'category', id, name: category.name });
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
    const product = products.find((p) => p.id === id);
    if (product) {
      setItemToDelete({ type: 'product', id, name: product.name });
      setDeleteDialogOpen(true);
    }
  };

  const handleProductSubmit = (
    data: CreateProductData | UpdateProductData,
    formData?: FormData,
  ) => {
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
    const discount = discounts.find((d) => d.id === id);
    if (discount) {
      setItemToDelete({ type: 'discount', id, name: discount.name });
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
    const venue = venues.find((v) => v.id === id);
    if (venue) {
      setItemToDelete({ type: 'venue', id, name: venue.name });
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
    const vendor = vendors.find((v) => v.id === id);
    if (vendor) {
      setItemToDelete({ type: 'vendor', id, name: vendor.name });
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
    switch (activeTab) {
      case 0:
      case 1:
        setProductSearch(query);
        break;
      case 2:
        setCategorySearch(query);
        break;
      case 3:
        setDiscountSearch(query);
        break;
      case 4:
        setVenueSearch(query);
        break;
      case 5:
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
      case 1:
        handleCreateProduct();
        break;
      case 2:
        handleCreateCategory();
        break;
      case 3:
        handleCreateDiscount();
        break;
      case 4:
        handleCreateVenue();
        break;
      case 5:
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

  const isDeletingItem = () => {
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

  return {
    // Tab state
    activeTab,
    handleTabChange,

    // Search state
    showSearchField,
    headerSearchQuery,
    handleHeaderSearch,
    handleToggleSearch,

    // Data
    categories,
    products,
    discounts,
    venues,
    vendors,

    // Loading states
    isLoadingCategories,
    isLoadingProducts,
    isLoadingDiscounts,
    isLoadingVenues,
    isLoadingVendors,

    // Mutation loading states
    isCreatingCategory,
    isUpdatingCategory,
    isDeletingCategory,
    isCreatingProduct,
    isUpdatingProduct,
    isDeletingProduct,
    isCreatingDiscount,
    isUpdatingDiscount,
    isDeletingDiscount,
    isCreatingVenue,
    isUpdatingVenue,
    isDeletingVenue,
    isCreatingVendor,
    isUpdatingVendor,
    isDeletingVendor,

    // Dialog states
    categoryDialogOpen,
    setCategoryDialogOpen,
    productDialogOpen,
    setProductDialogOpen,
    discountDialogOpen,
    setDiscountDialogOpen,
    venueDialogOpen,
    setVenueDialogOpen,
    vendorDialogOpen,
    setVendorDialogOpen,
    deleteDialogOpen,

    // Editing states
    editingCategory,
    editingProduct,
    editingDiscount,
    editingVenue,
    editingVendor,
    itemToDelete,

    // Handlers
    handleCreateNew,
    handleRefresh,
    handleEditCategory,
    handleDeleteCategory,
    handleCategorySubmit,
    handleEditProduct,
    handleDeleteProduct,
    handleProductSubmit,
    handleEditDiscount,
    handleDeleteDiscount,
    handleDiscountSubmit,
    handleEditVenue,
    handleDeleteVenue,
    handleVenueSubmit,
    handleEditVendor,
    handleDeleteVendor,
    handleVendorSubmit,
    handleDeleteConfirm,
    handleDeleteCancel,
    getDeleteItemType,
    isDeletingItem,
  };
}
