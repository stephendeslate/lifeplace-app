// Products & Packages Settings Page
// Orchestrator component — imports sub-components for header, tabs, and dialogs

import { ModernSettingsLayout } from '@/components/common';

import { useProductsPackagesLogic } from './useProductsPackagesLogic';
import { ProductsPackagesHeader } from './ProductsPackagesHeader';
import { ProductsPackagesTabs } from './ProductsPackagesTabs';
import { ProductsPackagesDialogs } from './ProductsPackagesDialogs';

export const ProductsPackages: React.FC = () => {
  const logic = useProductsPackagesLogic();

  return (
    <ModernSettingsLayout>
      <ProductsPackagesHeader
        activeTab={logic.activeTab}
        showSearchField={logic.showSearchField}
        headerSearchQuery={logic.headerSearchQuery}
        onHeaderSearch={logic.handleHeaderSearch}
        onToggleSearch={logic.handleToggleSearch}
        onRefresh={logic.handleRefresh}
        onCreateNew={logic.handleCreateNew}
        products={logic.products}
        categories={logic.categories}
        discounts={logic.discounts}
        venues={logic.venues}
        vendors={logic.vendors}
      />

      <ProductsPackagesTabs
        activeTab={logic.activeTab}
        onTabChange={logic.handleTabChange}
        products={logic.products}
        categories={logic.categories}
        discounts={logic.discounts}
        venues={logic.venues}
        vendors={logic.vendors}
        isLoadingProducts={logic.isLoadingProducts}
        isLoadingCategories={logic.isLoadingCategories}
        isLoadingDiscounts={logic.isLoadingDiscounts}
        isLoadingVenues={logic.isLoadingVenues}
        isLoadingVendors={logic.isLoadingVendors}
        isDeletingProduct={logic.isDeletingProduct}
        isDeletingCategory={logic.isDeletingCategory}
        isDeletingDiscount={logic.isDeletingDiscount}
        isDeletingVenue={logic.isDeletingVenue}
        isDeletingVendor={logic.isDeletingVendor}
        onEditProduct={logic.handleEditProduct}
        onDeleteProduct={logic.handleDeleteProduct}
        onEditCategory={logic.handleEditCategory}
        onDeleteCategory={logic.handleDeleteCategory}
        onEditDiscount={logic.handleEditDiscount}
        onDeleteDiscount={logic.handleDeleteDiscount}
        onEditVenue={logic.handleEditVenue}
        onDeleteVenue={logic.handleDeleteVenue}
        onEditVendor={logic.handleEditVendor}
        onDeleteVendor={logic.handleDeleteVendor}
      />

      <ProductsPackagesDialogs
        categoryDialogOpen={logic.categoryDialogOpen}
        onCategoryDialogClose={() => logic.setCategoryDialogOpen(false)}
        editingCategory={logic.editingCategory}
        onCategorySubmit={logic.handleCategorySubmit}
        isLoadingCategory={logic.isCreatingCategory || logic.isUpdatingCategory}
        productDialogOpen={logic.productDialogOpen}
        onProductDialogClose={() => logic.setProductDialogOpen(false)}
        editingProduct={logic.editingProduct}
        onProductSubmit={logic.handleProductSubmit}
        isLoadingProduct={logic.isCreatingProduct || logic.isUpdatingProduct}
        discountDialogOpen={logic.discountDialogOpen}
        onDiscountDialogClose={() => logic.setDiscountDialogOpen(false)}
        editingDiscount={logic.editingDiscount}
        onDiscountSubmit={logic.handleDiscountSubmit}
        isLoadingDiscount={logic.isCreatingDiscount || logic.isUpdatingDiscount}
        venueDialogOpen={logic.venueDialogOpen}
        onVenueDialogClose={() => logic.setVenueDialogOpen(false)}
        editingVenue={logic.editingVenue}
        onVenueSubmit={logic.handleVenueSubmit}
        isLoadingVenue={logic.isCreatingVenue || logic.isUpdatingVenue}
        vendorDialogOpen={logic.vendorDialogOpen}
        onVendorDialogClose={() => logic.setVendorDialogOpen(false)}
        editingVendor={logic.editingVendor}
        onVendorSubmit={logic.handleVendorSubmit}
        isLoadingVendor={logic.isCreatingVendor || logic.isUpdatingVendor}
        deleteDialogOpen={logic.deleteDialogOpen}
        onDeleteCancel={logic.handleDeleteCancel}
        onDeleteConfirm={logic.handleDeleteConfirm}
        deleteItemType={logic.getDeleteItemType()}
        itemToDeleteName={logic.itemToDelete?.name}
        isDeleting={logic.isDeletingItem()}
      />
    </ModernSettingsLayout>
  );
};
