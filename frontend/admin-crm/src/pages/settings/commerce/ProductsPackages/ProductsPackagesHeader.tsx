import React from 'react';
import { Box, Typography, TextField, InputAdornment } from '@mui/material';
import { Search as SearchIcon, Inventory as ProductIcon } from '@mui/icons-material';
import { ModernPageHeader } from '@/components/common';
import {
  type HeaderAction,
  createRefreshAction,
  createAddAction,
} from '@/components/common/ModernPageHeader';
import type { ProductCategory, ProductOption, Discount } from '@/types/products.types';
import type { VenueListItem } from '@/types/venues.types';
import type { VendorListItem } from '@/types/vendors.types';

interface ProductsPackagesHeaderProps {
  activeTab: number;
  showSearchField: boolean;
  headerSearchQuery: string;
  onHeaderSearch: (query: string) => void;
  onToggleSearch: () => void;
  onRefresh: () => void;
  onCreateNew: () => void;
  products: ProductOption[];
  categories: ProductCategory[];
  discounts: Discount[];
  venues: VenueListItem[];
  vendors: VendorListItem[];
}

export const ProductsPackagesHeader: React.FC<ProductsPackagesHeaderProps> = ({
  activeTab,
  showSearchField,
  headerSearchQuery,
  onHeaderSearch,
  onToggleSearch,
  onRefresh,
  onCreateNew,
  products,
  categories,
  discounts,
}) => {
  const headerActions: HeaderAction[] = [
    {
      icon: <SearchIcon />,
      label: showSearchField ? 'Hide Search' : 'Search',
      onClick: onToggleSearch,
      variant: 'icon',
      tooltip: showSearchField ? 'Hide search field' : 'Search products, categories, and discounts',
    },
    createRefreshAction(onRefresh),
  ];

  const getTabLabel = () => {
    switch (activeTab) {
      case 0:
        return 'Product';
      case 1:
        return 'Package';
      case 2:
        return 'Category';
      case 3:
        return 'Discount';
      case 4:
        return 'Venue';
      case 5:
        return 'Vendor';
      default:
        return 'Item';
    }
  };

  const primaryAction = createAddAction(`Add ${getTabLabel()}`, onCreateNew, 'primary');

  const productCount = products.filter((p) => p.type === 'PRODUCT').length;
  const packageCount = products.filter((p) => p.type === 'PACKAGE').length;

  return (
    <>
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
          { label: 'Products', value: productCount },
          { label: 'Packages', value: packageCount },
          { label: 'Categories', value: categories.length },
          { label: 'Discounts', value: discounts.filter((d) => d.is_active).length },
        ]}
        size="medium"
      />

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
            onChange={(e) => onHeaderSearch(e.target.value)}
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
    </>
  );
};
