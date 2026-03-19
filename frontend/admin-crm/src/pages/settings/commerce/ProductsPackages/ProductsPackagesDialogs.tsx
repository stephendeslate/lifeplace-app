import React from 'react';
import { Typography } from '@mui/material';
import { ModernDialog, createDeleteActions } from '@/components/common';
import { CategoryFormDialog } from '@/components/products/CategoryFormDialog';
import { ProductFormDialog } from '@/components/products/ProductFormDialog';
import { DiscountFormDialog } from '@/components/products/DiscountFormDialog';
import { VenueFormDialog } from '@/components/venues';
import { VendorFormDialog } from '@/components/vendors';
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

interface ProductsPackagesDialogsProps {
  // Category dialog
  categoryDialogOpen: boolean;
  onCategoryDialogClose: () => void;
  editingCategory: ProductCategory | null;
  onCategorySubmit: (data: CreateCategoryData | UpdateCategoryData) => void;
  isLoadingCategory: boolean;

  // Product dialog
  productDialogOpen: boolean;
  onProductDialogClose: () => void;
  editingProduct: ProductOption | null;
  onProductSubmit: (data: CreateProductData | UpdateProductData, formData?: FormData) => void;
  isLoadingProduct: boolean;

  // Discount dialog
  discountDialogOpen: boolean;
  onDiscountDialogClose: () => void;
  editingDiscount: Discount | null;
  onDiscountSubmit: (data: CreateDiscountData | UpdateDiscountData) => void;
  isLoadingDiscount: boolean;

  // Venue dialog
  venueDialogOpen: boolean;
  onVenueDialogClose: () => void;
  editingVenue: VenueListItem | VenueDetail | null;
  onVenueSubmit: (data: CreateVenueData | UpdateVenueData, formData?: FormData) => void;
  isLoadingVenue: boolean;

  // Vendor dialog
  vendorDialogOpen: boolean;
  onVendorDialogClose: () => void;
  editingVendor: VendorListItem | VendorDetail | null;
  onVendorSubmit: (data: CreateVendorData | UpdateVendorData) => void;
  isLoadingVendor: boolean;

  // Delete dialog
  deleteDialogOpen: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  deleteItemType: string;
  itemToDeleteName: string | undefined;
  isDeleting: boolean | undefined;
}

export const ProductsPackagesDialogs: React.FC<ProductsPackagesDialogsProps> = ({
  categoryDialogOpen,
  onCategoryDialogClose,
  editingCategory,
  onCategorySubmit,
  isLoadingCategory,
  productDialogOpen,
  onProductDialogClose,
  editingProduct,
  onProductSubmit,
  isLoadingProduct,
  discountDialogOpen,
  onDiscountDialogClose,
  editingDiscount,
  onDiscountSubmit,
  isLoadingDiscount,
  venueDialogOpen,
  onVenueDialogClose,
  editingVenue,
  onVenueSubmit,
  isLoadingVenue,
  vendorDialogOpen,
  onVendorDialogClose,
  editingVendor,
  onVendorSubmit,
  isLoadingVendor,
  deleteDialogOpen,
  onDeleteCancel,
  onDeleteConfirm,
  deleteItemType,
  itemToDeleteName,
  isDeleting,
}) => {
  return (
    <>
      <CategoryFormDialog
        open={categoryDialogOpen}
        onClose={onCategoryDialogClose}
        editingCategory={editingCategory}
        onSubmit={onCategorySubmit}
        isLoading={isLoadingCategory}
      />

      <ProductFormDialog
        open={productDialogOpen}
        onClose={onProductDialogClose}
        editingProduct={editingProduct}
        onSubmit={onProductSubmit}
        isLoading={isLoadingProduct}
      />

      <DiscountFormDialog
        open={discountDialogOpen}
        onClose={onDiscountDialogClose}
        editingDiscount={editingDiscount}
        onSubmit={onDiscountSubmit}
        isLoading={isLoadingDiscount}
      />

      <VenueFormDialog
        open={venueDialogOpen}
        onClose={onVenueDialogClose}
        editingVenue={editingVenue}
        onSubmit={onVenueSubmit}
        isLoading={isLoadingVenue}
      />

      <VendorFormDialog
        open={vendorDialogOpen}
        onClose={onVendorDialogClose}
        editingVendor={editingVendor}
        onSubmit={onVendorSubmit}
        isLoading={isLoadingVendor}
      />

      <ModernDialog
        open={deleteDialogOpen}
        onClose={onDeleteCancel}
        title={`Delete ${deleteItemType}`}
        maxWidth="sm"
        fullWidth
        actions={createDeleteActions(onDeleteCancel, onDeleteConfirm, isDeleting)}
      >
        <Typography>
          Are you sure you want to delete "{itemToDeleteName}"? This action cannot be undone.
        </Typography>
      </ModernDialog>
    </>
  );
};
