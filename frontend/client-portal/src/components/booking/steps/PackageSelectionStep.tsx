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

  // Check if package is selected - Fixed to use package_id
  const isPackageSelected = useCallback((packageId: number) => {
    return selectedPackages.some(p => p.package_id === packageId);
  }, [selectedPackages]);

  // Get selected package details - Fixed to use package_id
  const getSelectedPackage = useCallback((packageId: number) => {
    return selectedPackages.find(p => p.package_id === packageId);
  }, [selectedPackages]);

  // Handle package toggle - Fixed to use package_id
  const handlePackageToggle = useCallback((packageOption: ProductOption) => {
    let newSelectedPackages: SelectedPackage[];
    
    if (isPackageSelected(packageOption.id)) {
      // Remove package
      newSelectedPackages = selectedPackages.filter(p => p.package_id !== packageOption.id);
    } else {
      // Create new package selection with tax information - Fixed to use package_id
      const newPackage: SelectedPackage = {
        package_id: packageOption.id, // Fixed: Changed from 'id' to 'package_id'
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

  // Handle quantity change - Fixed to use package_id
  const handleQuantityChange = useCallback((packageId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    const newSelectedPackages = selectedPackages.map(pkg => 
      pkg.package_id === packageId 
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
        Select Your Package
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {selectionType === 'SINGLE' 
          ? 'Choose one package for your event'
          : `Choose up to ${maxSelection || 'multiple'} packages`}
      </Typography>

      {/* Validation Errors */}
      {!validationStatus.isValid && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {validationStatus.errors.map((error, index) => (
            <Typography key={index} variant="body2">
              {error}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Package Cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        {availablePackages.map((packageOption) => {
          const isSelected = isPackageSelected(packageOption.id);
          const selectedPackage = getSelectedPackage(packageOption.id);
          
          return (
            <Card 
              key={packageOption.id}
              variant={isSelected ? "elevation" : "outlined"}
              sx={{ 
                border: isSelected ? 2 : 1,
                borderColor: isSelected ? 'primary.main' : 'divider',
                position: 'relative',
                transition: 'all 0.2s ease-in-out',
              }}
            >
              {isSelected && (
                <Chip
                  icon={<Check />}
                  label="Selected"
                  color="primary"
                  size="small"
                  sx={{ position: 'absolute', top: 16, right: 16 }}
                />
              )}
              
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {packageOption.name}
                    </Typography>
                    
                    {packageOption.description && (
                      <Typography variant="body2" color="text.secondary" paragraph>
                        {packageOption.description}
                      </Typography>
                    )}
                    
                    {/* Package Features */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                      {packageOption.included_hours && (
                        <Chip
                          icon={<AccessTime />}
                          label={`${packageOption.included_hours} hours included`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      {packageOption.has_excess_hours && (
                        <Chip
                          label={`+₱${packageOption.excess_hour_price}/hr extra`}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      )}
                    </Box>
                    
                    {/* Price */}
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                      <Typography variant="h5" color="primary">
                        {formatPrice(packageOption.base_price)}
                      </Typography>
                      {packageOption.pricing_model === 'HOURLY' && (
                        <Typography variant="body2" color="text.secondary">
                          per hour
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
              
              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Button
                  variant={isSelected ? "contained" : "outlined"}
                  onClick={() => handlePackageToggle(packageOption)}
                  fullWidth={!isSelected}
                >
                  {isSelected ? 'Selected' : 'Select Package'}
                </Button>
                
                {isSelected && selectionType === 'MULTIPLE' && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">Quantity:</Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleQuantityChange(packageOption.id, (selectedPackage?.quantity || 1) - 1)}
                      disabled={selectedPackage?.quantity === 1}
                    >
                      <Remove />
                    </IconButton>
                    <Typography sx={{ minWidth: 24, textAlign: 'center' }}>
                      {selectedPackage?.quantity || 1}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleQuantityChange(packageOption.id, (selectedPackage?.quantity || 1) + 1)}
                    >
                      <Add />
                    </IconButton>
                  </Box>
                )}
              </CardActions>
            </Card>
          );
        })}
      </Box>

      {/* Summary */}
      {selectedPackages.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Selected Packages
          </Typography>
          <Divider sx={{ my: 1 }} />
          {selectedPackages.map((pkg) => (
            <Box key={pkg.package_id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                {pkg.name} {pkg.quantity > 1 && `x${pkg.quantity}`}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {formatPrice((parseFloat(pkg.price) * pkg.quantity).toString())}
              </Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="subtitle2">Subtotal</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
              {totals.formatted}
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Validation indicator */}
      {isValidating && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Validating selection...
          </Typography>
        </Box>
      )}
    </Box>
  );
};