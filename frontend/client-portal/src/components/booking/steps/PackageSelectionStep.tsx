// frontend/client-portal/src/components/booking/steps/PackageSelectionStep.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  CircularProgress,
  Stack,
  IconButton,
  Divider,
  Skeleton,
} from '@mui/material';
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useBookingSessionContext } from '../../../contexts/BookingSessionContext';
import { bookingFlowAPI } from '../../../apis/bookingflow.api';
import { formatCurrency } from '../../../utils/payment-helpers';
import type { 
  BookingFlowStep,
  PackageSelectionStepConfiguration,
  ProductOption 
} from '../../../types/booking.types';
import type { 
  BaseStepProps,
  ProductSelection 
} from '../../../types/booking-steps.types';
import type { PackageSelectionStepData } from '../../../types/booking-session.types';

interface PackageSelectionStepProps extends BaseStepProps<PackageSelectionStepData> {
  step: BookingFlowStep;
}

const PackageSelectionStep: React.FC<PackageSelectionStepProps> = ({
  step,
  data,
  onUpdate,
  onNext,
  onPrevious,
  onSave,
  isLoading = false,
  validationErrors = {},
  canGoNext = true,
  canGoPrevious = true,
  showSaveButton = false,
}) => {
  const { validateStepData } = useBookingSessionContext();
  
  const [selectedPackages, setSelectedPackages] = useState<ProductSelection[]>(
    data?.selected_packages || []
  );
  const [localValidationErrors, setLocalValidationErrors] = useState<Record<string, string[]>>({});

  // Get step configuration
  const config = step.configuration_data as PackageSelectionStepConfiguration | null;

  // Query: Get available packages for this step
  const {
    data: availablePackages,
    isLoading: isLoadingPackages,
    error: packagesError
  } = useQuery({
    queryKey: ['available-packages', step.id],
    queryFn: () => bookingFlowAPI.getAvailablePackages(step.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Filter packages based on configuration
  const filteredPackages = useMemo(() => {
    if (!availablePackages) return [];
    
    // If specific packages are configured, use those
    if (config?.available_packages_details && config.available_packages_details.length > 0) {
      return config.available_packages_details;
    }
    
    // Otherwise use all available packages
    return availablePackages;
  }, [availablePackages, config]);

  // Group packages by category if configured
  const groupedPackages = useMemo(() => {
    if (!config?.available_categories_details || config.available_categories_details.length === 0) {
      return { 'All Packages': filteredPackages };
    }

    const grouped: Record<string, ProductOption[]> = {};
    
    config.available_categories_details.forEach(category => {
      grouped[category.name] = filteredPackages.filter(
        pkg => pkg.category === category.id
      );
    });

    // Add uncategorized packages
    const categorizedPackageIds = Object.values(grouped).flat().map(pkg => pkg.id);
    const uncategorized = filteredPackages.filter(
      pkg => !categorizedPackageIds.includes(pkg.id)
    );
    
    if (uncategorized.length > 0) {
      grouped['Other'] = uncategorized;
    }

    return grouped;
  }, [filteredPackages, config]);

  // Update parent component when selections change
  useEffect(() => {
    onUpdate({ selected_packages: selectedPackages });
  }, [selectedPackages, onUpdate]);

  // Sync with external data changes
  useEffect(() => {
    if (data?.selected_packages && JSON.stringify(data.selected_packages) !== JSON.stringify(selectedPackages)) {
      setSelectedPackages(data.selected_packages);
    }
  }, [data?.selected_packages]);

  // Validate selections
  const validateSelections = async () => {
    const stepData = { selected_packages: selectedPackages };
    
    try {
      const result = await validateStepData(step.id, stepData);
      setLocalValidationErrors(result.errors);
      return result.isValid;
    } catch (error) {
      console.error('Validation error:', error);
      return false;
    }
  };

  // Handle package selection
  const handlePackageSelect = (packageOption: ProductOption) => {
    const existingIndex = selectedPackages.findIndex(p => p.id === packageOption.id);
    
    if (existingIndex >= 0) {
      // Package already selected, increase quantity or remove if single selection
      if (config?.selection_type === 'SINGLE') {
        // Remove if single selection type
        setSelectedPackages(prev => prev.filter(p => p.id !== packageOption.id));
      } else {
        // Increase quantity for multiple selection
        setSelectedPackages(prev =>
          prev.map((p, index) =>
            index === existingIndex
              ? { ...p, quantity: p.quantity + 1 }
              : p
          )
        );
      }
    } else {
      // New package selection
      const newSelection: ProductSelection = {
        id: packageOption.id,
        name: packageOption.name,
        quantity: 1,
        price: packageOption.base_price,
      };

      if (config?.selection_type === 'SINGLE') {
        // Replace existing selection for single selection type
        setSelectedPackages([newSelection]);
      } else {
        // Add to existing selections for multiple selection type
        setSelectedPackages(prev => [...prev, newSelection]);
      }
    }
  };

  // Handle quantity change
  const handleQuantityChange = (packageId: number, change: number) => {
    setSelectedPackages(prev =>
      prev.map(p => {
        if (p.id === packageId) {
          const newQuantity = Math.max(0, p.quantity + change);
          return newQuantity === 0 ? null : { ...p, quantity: newQuantity };
        }
        return p;
      }).filter(Boolean) as ProductSelection[]
    );
  };

  // Check if package is selected
  const isPackageSelected = (packageId: number) => {
    return selectedPackages.some(p => p.id === packageId);
  };

  // Get selected quantity for package
  const getSelectedQuantity = (packageId: number) => {
    const selected = selectedPackages.find(p => p.id === packageId);
    return selected?.quantity || 0;
  };

  // Check if selection limits are met
  const canSelectMore = useMemo(() => {
    if (!config) return true;
    
    if (config.max_selection === 0) return true; // Unlimited
    return selectedPackages.length < config.max_selection;
  }, [selectedPackages.length, config]);

  const hasMinimumSelection = useMemo(() => {
    if (!config) return true;
    return selectedPackages.length >= config.min_selection;
  }, [selectedPackages.length, config]);

  // Handle next step
  const handleNext = async () => {
    const isValid = await validateSelections();
    if (isValid) {
      onNext();
    }
  };

  // Handle save
  const handleSave = async () => {
    await validateSelections();
    onSave();
  };

  // Render package card
  const renderPackageCard = (packageOption: ProductOption) => {
    const isSelected = isPackageSelected(packageOption.id);
    const quantity = getSelectedQuantity(packageOption.id);
    const canSelect = canSelectMore || isSelected;

    return (
      <Card
        key={packageOption.id}
        sx={{
          position: 'relative',
          transition: 'all 0.2s ease-in-out',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          '&:hover': {
            boxShadow: 3,
            transform: 'translateY(-2px)',
          },
        }}
      >
        {isSelected && (
          <CheckCircleIcon
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              color: 'primary.main',
              zIndex: 1,
            }}
          />
        )}

        <CardContent sx={{ pb: 1 }}>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              mb: 1,
              pr: isSelected ? 4 : 0,
            }}
          >
            {packageOption.name}
          </Typography>

          {packageOption.description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {packageOption.description}
            </Typography>
          )}

          {config?.show_pricing && (
            <Typography
              variant="h6"
              color="primary.main"
              sx={{ fontWeight: 600 }}
            >
              {formatCurrency(packageOption.base_price)}
            </Typography>
          )}
        </CardContent>

        <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
          <Button
            variant={isSelected ? 'contained' : 'outlined'}
            onClick={() => handlePackageSelect(packageOption)}
            disabled={!canSelect && !isSelected}
            sx={{ flex: 1 }}
          >
            {isSelected ? 'Selected' : 'Select Package'}
          </Button>

          {isSelected && config?.selection_type !== 'SINGLE' && (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <IconButton
                size="small"
                onClick={() => handleQuantityChange(packageOption.id, -1)}
                disabled={quantity <= 1}
              >
                <RemoveIcon />
              </IconButton>
              
              <Typography
                variant="body2"
                sx={{ mx: 1, minWidth: 20, textAlign: 'center' }}
              >
                {quantity}
              </Typography>
              
              <IconButton
                size="small"
                onClick={() => handleQuantityChange(packageOption.id, 1)}
              >
                <AddIcon />
              </IconButton>
            </Box>
          )}
        </CardActions>
      </Card>
    );
  };

  // Show loading state
  if (isLoadingPackages) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          <Skeleton width="40%" />
        </Typography>
        
        <Stack spacing={3}>
          {[1, 2, 3].map((index) => (
            <Card key={index}>
              <CardContent>
                <Skeleton variant="text" width="60%" height={32} />
                <Skeleton variant="text" width="100%" height={24} sx={{ mt: 1 }} />
                <Skeleton variant="text" width="40%" height={28} sx={{ mt: 2 }} />
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }

  // Show error state
  if (packagesError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Unable to load package options. Please try again or contact support.
        </Alert>
      </Box>
    );
  }

  // Show no packages available
  if (!filteredPackages || filteredPackages.length === 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          No packages are currently available for selection.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h5"
        sx={{
          mb: 2,
          fontWeight: 600,
          color: 'primary.main',
        }}
      >
        {step.name}
      </Typography>

      {step.description && (
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 3 }}
        >
          {step.description}
        </Typography>
      )}

      {/* Selection requirements info */}
      {config && (
        <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
          <Typography variant="body2">
            {config.selection_type === 'SINGLE' ? (
              'Please select one package.'
            ) : (
              `Select ${config.min_selection === config.max_selection 
                ? `exactly ${config.min_selection}` 
                : `${config.min_selection} to ${config.max_selection === 0 ? 'unlimited' : config.max_selection}`
              } package${config.max_selection === 1 ? '' : 's'}.`
            )}
          </Typography>
        </Alert>
      )}

      {/* Selection summary */}
      {selectedPackages.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Selected Packages ({selectedPackages.length})
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {selectedPackages.map((pkg) => (
              <Chip
                key={pkg.id}
                label={`${pkg.name} ${pkg.quantity > 1 ? `(${pkg.quantity})` : ''}`}
                color="primary"
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Validation errors */}
      {(Object.keys(validationErrors).length > 0 || Object.keys(localValidationErrors).length > 0) && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {Object.values({ ...validationErrors, ...localValidationErrors })
            .flat()
            .map((error, index) => (
              <Typography key={index} variant="body2">
                {error}
              </Typography>
            ))}
        </Alert>
      )}

      {/* Package groups */}
      {Object.entries(groupedPackages).map(([categoryName, packages]) => (
        <Box key={categoryName} sx={{ mb: 4 }}>
          {Object.keys(groupedPackages).length > 1 && (
            <>
              <Typography
                variant="h6"
                sx={{
                  mb: 2,
                  fontWeight: 600,
                  color: 'text.primary',
                }}
              >
                {categoryName}
              </Typography>
              <Divider sx={{ mb: 3 }} />
            </>
          )}

          <Stack spacing={3}>
            {packages.map(renderPackageCard)}
          </Stack>
        </Box>
      ))}

      {/* Navigation buttons */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mt: 4,
          pt: 3,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button
          variant="outlined"
          onClick={onPrevious}
          disabled={!canGoPrevious || isLoading}
        >
          Previous
        </Button>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {showSaveButton && (
            <Button
              variant="outlined"
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <CircularProgress size={16} sx={{ mr: 1 }} />
                  Saving...
                </>
              ) : (
                'Save Progress'
              )}
            </Button>
          )}

          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canGoNext || !hasMinimumSelection || isLoading}
          >
            {isLoading ? (
              <>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                Loading...
              </>
            ) : (
              'Continue'
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default PackageSelectionStep;