import React from 'react';
import { Box, Tabs, Tab, Chip, Alert } from '@mui/material';
import {
  Category as CategoryIcon,
  Inventory as ProductIcon,
  ViewInAr as PackageIcon,
  LocalOffer as DiscountIcon,
  LocationOn as VenueIcon,
  Store as VendorIcon,
} from '@mui/icons-material';
import { CategoriesTable } from '@/components/products/CategoriesTable';
import { ProductsTable } from '@/components/products/ProductsTable';
import { DiscountsTable } from '@/components/products/DiscountsTable';
import { VenuesTable } from '@/components/venues';
import { VendorsTable } from '@/components/vendors';
import type { ProductCategory, ProductOption, Discount } from '@/types/products.types';
import type { VenueListItem } from '@/types/venues.types';
import type { VendorListItem } from '@/types/vendors.types';
import { TabPanel } from './TabPanel';

interface ProductsPackagesTabsProps {
  activeTab: number;
  onTabChange: (event: React.SyntheticEvent, newValue: number) => void;
  products: ProductOption[];
  categories: ProductCategory[];
  discounts: Discount[];
  venues: VenueListItem[];
  vendors: VendorListItem[];
  isLoadingProducts: boolean;
  isLoadingCategories: boolean;
  isLoadingDiscounts: boolean;
  isLoadingVenues: boolean;
  isLoadingVendors: boolean;
  isDeletingProduct: boolean;
  isDeletingCategory: boolean;
  isDeletingDiscount: boolean;
  isDeletingVenue: boolean;
  isDeletingVendor: boolean;
  onEditProduct: (product: ProductOption) => void;
  onDeleteProduct: (id: number) => void;
  onEditCategory: (category: ProductCategory) => void;
  onDeleteCategory: (id: number) => void;
  onEditDiscount: (discount: Discount) => void;
  onDeleteDiscount: (id: number) => void;
  onEditVenue: (venue: VenueListItem) => void;
  onDeleteVenue: (id: number) => void;
  onEditVendor: (vendor: VendorListItem) => void;
  onDeleteVendor: (id: number) => void;
}

export const ProductsPackagesTabs: React.FC<ProductsPackagesTabsProps> = ({
  activeTab,
  onTabChange,
  products,
  categories,
  discounts,
  venues,
  vendors,
  isLoadingProducts,
  isLoadingCategories,
  isLoadingDiscounts,
  isLoadingVenues,
  isLoadingVendors,
  isDeletingProduct,
  isDeletingCategory,
  isDeletingDiscount,
  isDeletingVenue,
  isDeletingVendor,
  onEditProduct,
  onDeleteProduct,
  onEditCategory,
  onDeleteCategory,
  onEditDiscount,
  onDeleteDiscount,
  onEditVenue,
  onDeleteVenue,
  onEditVendor,
  onDeleteVendor,
}) => {
  return (
    <Box sx={{ mb: 3, borderRadius: 1, bgcolor: 'background.paper' }}>
      <Tabs
        value={activeTab}
        onChange={onTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <ProductIcon />
              Products
              <Chip label={products.filter((p) => p.type === 'PRODUCT').length} size="small" />
            </Box>
          }
        />
        <Tab
          label={
            <Box display="flex" alignItems="center" gap={1}>
              <PackageIcon />
              Packages
              <Chip label={products.filter((p) => p.type === 'PACKAGE').length} size="small" />
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
          <Alert severity="info" sx={{ mb: 3 }}>
            Products are individual services you offer to clients. Configure pricing, timing, and
            booking requirements for each product.
          </Alert>
          <ProductsTable
            products={products}
            isLoading={isLoadingProducts}
            onEdit={onEditProduct}
            onDelete={onDeleteProduct}
            isDeleting={isDeletingProduct}
            typeFilter="PRODUCT"
          />
        </Box>
      </TabPanel>

      {/* Packages Tab */}
      <TabPanel value={activeTab} index={1}>
        <Box p={3}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Packages are bundles of products and services offered together. Create packages to
            provide clients with comprehensive service offerings.
          </Alert>
          <ProductsTable
            products={products}
            isLoading={isLoadingProducts}
            onEdit={onEditProduct}
            onDelete={onDeleteProduct}
            isDeleting={isDeletingProduct}
            typeFilter="PACKAGE"
          />
        </Box>
      </TabPanel>

      {/* Categories Tab */}
      <TabPanel value={activeTab} index={2}>
        <Box p={3}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Categories help organize your products and packages. Create a hierarchical structure
            that makes sense for your business offerings.
          </Alert>
          <CategoriesTable
            categories={categories}
            isLoading={isLoadingCategories}
            onEdit={onEditCategory}
            onDelete={onDeleteCategory}
            isDeleting={isDeletingCategory}
          />
        </Box>
      </TabPanel>

      {/* Discounts Tab */}
      <TabPanel value={activeTab} index={3}>
        <Box p={3}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Create promotional discounts to incentivize bookings. Set validity periods, usage
            limits, and specific requirements for each discount.
          </Alert>
          <DiscountsTable
            discounts={discounts}
            isLoading={isLoadingDiscounts}
            onEdit={onEditDiscount}
            onDelete={onDeleteDiscount}
            isDeleting={isDeletingDiscount}
          />
        </Box>
      </TabPanel>

      {/* Venues Tab */}
      <TabPanel value={activeTab} index={4}>
        <Box p={3}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Venues define physical locations and their operating rules. Each venue has configurable
            check-in/checkout times, duration limits, and optional early/late fees. Assign venues to
            packages to determine booking rules.
          </Alert>
          <VenuesTable
            venues={venues}
            isLoading={isLoadingVenues}
            onEdit={onEditVenue}
            onDelete={onDeleteVenue}
            isDeleting={isDeletingVenue}
          />
        </Box>
      </TabPanel>

      {/* Vendors Tab */}
      <TabPanel value={activeTab} index={5}>
        <Box p={3}>
          <Alert severity="info" sx={{ mb: 3 }}>
            Vendors are service providers (catering, photography, florists, DJs, etc.) that can be
            included in packages. Configure vendor details, contact information, and optional
            operating rules for lead times and service duration.
          </Alert>
          <VendorsTable
            vendors={vendors}
            isLoading={isLoadingVendors}
            onEdit={onEditVendor}
            onDelete={onDeleteVendor}
            isDeleting={isDeletingVendor}
          />
        </Box>
      </TabPanel>
    </Box>
  );
};
