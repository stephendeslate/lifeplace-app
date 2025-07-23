// frontend/client-portal/src/components/booking/steps/PackageSelectionStep.tsx

import React, { useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  IconButton,
} from '@mui/material';
import { 
  Add, 
  Remove, 
  Check, 
  LocalOffer,
  AccessTime,
} from '@mui/icons-material';
import { ProductsApi } from '../../../apis/booking/products.api';
import type { 
  PackageSelectionStepData, 
  PackageSelectionStepConfiguration,
  ProductOption,
  SelectedPackage,
} from '../../../types/booking';

interface PackageSelectionStepProps {
  stepData?: PackageSelectionStepData;
  config: PackageSelectionStepConfiguration | null;
  onDataChange: (data: PackageSelectionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
}

export const PackageSelectionStep: React.FC<PackageSelectionStepProps> = ({
  stepData = { selected_packages: [] },
  config,
  onDataChange,
  validationErrors,
  isValidating,
}) => {
  const availablePackages = config?.available_packages_details || [];
  const selectionType = config?.selection_type || 'SINGLE';
  const minSelection = config?.min_selection || 1;
  const maxSelection = config?.max_selection || 1;

  // Use props stepData as single source of truth
  const selectedPackages = stepData.selected_packages || [];

  // Check if package is selected
  const isPackageSelected = useCallback((packageId: number) => {
    return selectedPackages.some(p => p.id === packageId);
  }, [selectedPackages]);

  // Get selected package details
  const getSelectedPackage = useCallback((packageId: number) => {
    return selectedPackages.find(p => p.id === packageId);
  }, [selectedPackages]);

  // Handle package toggle
  const handlePackageToggle = useCallback((packageOption: ProductOption) => {
    let newSelectedPackages: SelectedPackage[];
    
    if (isPackageSelected(packageOption.id)) {
      // Remove package
      newSelectedPackages = selectedPackages.filter(p => p.id !== packageOption.id);
    } else {
      // Create new package selection with tax information
      const newPackage: SelectedPackage = {
        id: packageOption.id,
        name: packageOption.name,
        price: packageOption.base_price,
        quantity: 1,
        included_hours: packageOption.included_hours ?? undefined,
        excess_hour_price: packageOption.excess_hour_price ?? undefined,
        // CRITICAL: Include tax information for proper pricing calculation
        tax_rate: packageOption.tax_rate, // This should be "0.00" based on your data
        price_with_tax: packageOption.price_with_tax, // This should be "26400.00"
      };

      if (selectionType === 'SINGLE') {
        // Single selection: replace all
        newSelectedPackages = [newPackage];
      } else {
        // Multiple selection: check limits
        if (maxSelection > 0 && selectedPackages.length >= maxSelection) {
          return; // Don't add if at limit
        }
        newSelectedPackages = [...selectedPackages, newPackage];
      }
    }

    onDataChange({ selected_packages: newSelectedPackages });
  }, [selectedPackages, selectionType, maxSelection, onDataChange, isPackageSelected]);

  // Handle quantity change
  const handleQuantityChange = useCallback((packageId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    const newSelectedPackages = selectedPackages.map(pkg => 
      pkg.id === packageId 
        ? { ...pkg, quantity: newQuantity }
        : pkg
    );

    onDataChange({ selected_packages: newSelectedPackages });
  }, [selectedPackages, onDataChange]);

  // Validation status
  const validationStatus = useMemo(() => {
    const errors: string[] = [];
    
    if (minSelection > 0 && selectedPackages.length < minSelection) {
      errors.push(`Must select at least ${minSelection} package${minSelection > 1 ? 's' : ''}`);
    }
    
    if (maxSelection > 0 && selectedPackages.length > maxSelection) {
      errors.push(`Cannot select more than ${maxSelection} package${maxSelection > 1 ? 's' : ''}`);
    }
    
    // Merge with external validation errors
    const allErrors = [
      ...errors,
      ...Object.values(validationErrors).flat()
    ];
    
    return {
      isValid: allErrors.length === 0,
      errors: allErrors
    };
  }, [selectedPackages, minSelection, maxSelection, validationErrors]);

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = selectedPackages.reduce((total, pkg) => {
      const price = parseFloat(pkg.price);
      return total + (price * pkg.quantity);
    }, 0);
    
    return {
      subtotal,
      formatted: ProductsApi.formatPrice(subtotal.toString()),
    };
  }, [selectedPackages]);

  const formatPrice = (price: string) => {
    return ProductsApi.formatPrice(price);
  };

  if (!config) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!availablePackages.length) {
    return (
      <Alert severity="info">
        No packages are currently available for selection.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Select a Package
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Choose {selectionType === 'SINGLE' ? 'one package' : `${minSelection}-${maxSelection === 0 ? 'unlimited' : maxSelection} packages`} for your event.
      </Typography>

      {/* Display validation errors */}
      {!validationStatus.isValid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationStatus.errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </Alert>
      )}

      <Box display="flex" flexWrap="wrap" gap={2}>
        {availablePackages.map((pkg: ProductOption) => {
          const isSelected = isPackageSelected(pkg.id);
          const selectedPackage = getSelectedPackage(pkg.id);

          return (
            <Box key={pkg.id} sx={{ flex: { xs: '1 1 100%', md: '1 1 calc(50% - 8px)' }, minWidth: 0 }}>
              <Card 
                sx={{ 
                  height: '100%',
                  border: isSelected ? 2 : 1,
                  borderColor: isSelected ? 'primary.main' : 'divider',
                  position: 'relative',
                }}
              >
                {isSelected && (
                  <Chip
                    icon={<Check />}
                    label="Selected"
                    color="primary"
                    size="small"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 1,
                    }}
                  />
                )}

                <CardContent>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {pkg.name}
                  </Typography>

                  {config.show_descriptions && pkg.description && (
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {pkg.description}
                    </Typography>
                  )}

                  {config.show_pricing && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h6" color="primary">
                        {formatPrice(pkg.base_price)}
                      </Typography>
                      
                      {pkg.has_excess_hours && pkg.included_hours && (
                        <Typography variant="body2" color="text.secondary">
                          <AccessTime sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                          Includes {pkg.included_hours} hours
                          {pkg.excess_hour_price && (
                            <span> • Additional hours: {formatPrice(pkg.excess_hour_price)}</span>
                          )}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {pkg.is_featured && (
                    <Chip 
                      icon={<LocalOffer />}
                      label="Featured" 
                      color="secondary" 
                      size="small" 
                      sx={{ mb: 1 }}
                    />
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                  <Button
                    variant={isSelected ? "contained" : "outlined"}
                    onClick={() => handlePackageToggle(pkg)}
                    disabled={isValidating}
                  >
                    {isSelected ? "Selected" : "Select Package"}
                  </Button>

                  {isSelected && pkg.allow_multiple && selectedPackage && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <IconButton 
                        size="small" 
                        onClick={() => handleQuantityChange(pkg.id, -1)}
                        disabled={selectedPackage.quantity <= 1}
                      >
                        <Remove />
                      </IconButton>
                      
                      <Typography variant="body2" sx={{ minWidth: 20, textAlign: 'center' }}>
                        {selectedPackage.quantity}
                      </Typography>
                      
                      <IconButton 
                        size="small" 
                        onClick={() => handleQuantityChange(pkg.id, 1)}
                      >
                        <Add />
                      </IconButton>
                    </Box>
                  )}
                </CardActions>
              </Card>
            </Box>
          );
        })}
      </Box>

      {selectedPackages.length > 0 && (
        <Paper sx={{ mt: 3, p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Packages
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {selectedPackages.map((pkg) => (
            <Box key={pkg.id} display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="body2">
                {pkg.name} {pkg.quantity > 1 && `× ${pkg.quantity}`}
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {formatPrice((parseFloat(pkg.price) * pkg.quantity).toString())}
              </Typography>
            </Box>
          ))}
          
          <Divider sx={{ my: 1 }} />
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle2">Subtotal</Typography>
            <Typography variant="subtitle2" fontWeight="bold">
              {totals.formatted}
            </Typography>
          </Box>
        </Paper>
      )}
    </Box>
  );
};