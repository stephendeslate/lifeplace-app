// frontend/client-portal/src/components/booking/steps/PackageSelectionStep.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Stack,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  CircularProgress,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  useTheme,
  alpha,
  Collapse,
} from '@mui/material';
import {
  Add,
  Remove,
  Info,
  Star,
  CheckCircle,
  Compare,
  Visibility,
  Close,
} from '@mui/icons-material';
import { useStepProducts } from '../../../hooks/useBookingFlow';
import { useToastActions } from '../../../contexts/ToastContext';
import type {
  BookingFlowStep,
  BookingSession,
  SessionStepData,
  StepValidationResult,
  ProductOption,
  ProductSelectionItem,
} from '../../../types/bookingflow.types';


interface PackageSelectionStepProps {
  step: BookingFlowStep;
  session: BookingSession;
  data: SessionStepData;
  validationErrors?: Record<string, string[]>;
  onChange: (data: SessionStepData) => void;
  onValidate?: (data: SessionStepData) => StepValidationResult;
  isLoading?: boolean;
  isReadOnly?: boolean;
}

// Define the PackageSelectionStepConfig interface locally (adjust fields as needed)
interface PackageSelectionStepConfig {
  selection_type?: 'SINGLE' | 'MULTIPLE';
  min_selection?: number;
  max_selection?: number;
  enable_dynamic_pricing?: boolean;
  pricing_factors?: {
    guest_count_multiplier?: number;
    base_guest_count?: number;
    date_multiplier?: number;
  };
  available_categories?: string[];
  enable_comparison?: boolean;
}
interface SelectedPackage {
  id: number;
  quantity: number;
  price: number;
  options?: Record<string, any>;
}

const PackageSelectionStep: React.FC<PackageSelectionStepProps> = ({
  step,
  session,
  data,
  validationErrors,
  onChange,
  onValidate,
  isLoading = false,
  isReadOnly = false,
}) => {
  const theme = useTheme();
  const { showError } = useToastActions();

  // Get step configuration
  const config = step.configuration_data as PackageSelectionStepConfig | undefined;
  
  // Local state
  const [selectedPackages, setSelectedPackages] = useState<SelectedPackage[]>(
    (data.selected_packages || []).map(pkg => ({
      ...pkg,
      price: typeof pkg.price === 'string' ? parseFloat(pkg.price) : pkg.price,
    }))
  );
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<number[]>([]);
  const [detailsDialogPackage, setDetailsDialogPackage] = useState<ProductOption | null>(null);

  // Get guest count for dynamic pricing
  const guestCount = useMemo(() => {
    // Look for guest count in current session data or previous steps
    for (const stepKey in session.booking_data) {
      const stepData = session.booking_data[stepKey];
      if (stepData && typeof stepData === 'object' && 'guest_count' in stepData) {
        return stepData.guest_count as number;
      }
    }
    return data.guest_count || 50; // Default fallback
  }, [session.booking_data, data.guest_count]);

  // API call to get available packages
  const {
    data: packages = [],
    isLoading: isLoadingPackages,
    error: packagesError,
  } = useStepProducts(step.id, {
    type: 'PACKAGE',
    guest_count: guestCount,
    ...(config?.available_categories?.length && {
      category: Number(config.available_categories[0]), // Ensure category is a number
    }),
  });

  // Update parent component when selections change
  useEffect(() => {
    const newData = {
      ...data,
      selected_packages: selectedPackages.map(pkg => ({
        ...pkg,
        price: pkg.price.toString(),
      })),
      guest_count: guestCount,
    };
    onChange(newData);
  }, [selectedPackages, guestCount, data, onChange]);

  // Handle package selection for single selection mode
  const handleSingleSelection = (packageOption: ProductOption) => {
    if (isReadOnly) return;

    const newSelection: SelectedPackage = {
      id: packageOption.id,
      quantity: 1,
      price: calculateDynamicPrice(packageOption, guestCount),
    };

    setSelectedPackages([newSelection]);
  };

  // Handle package selection for multiple selection mode
  const handleMultipleSelection = (packageOption: ProductOption, selected: boolean) => {
    if (isReadOnly) return;

    if (selected) {
      const newSelection: SelectedPackage = {
        id: packageOption.id,
        quantity: 1,
        price: calculateDynamicPrice(packageOption, guestCount),
      };

      setSelectedPackages(prev => [...prev, newSelection]);
    } else {
      setSelectedPackages(prev => prev.filter(p => p.id !== packageOption.id));
    }
  };

  // Handle quantity change
  const handleQuantityChange = (packageId: number, change: number) => {
    if (isReadOnly) return;

    setSelectedPackages(prev =>
      prev.map(pkg => {
        if (pkg.id === packageId) {
          const newQuantity = Math.max(1, pkg.quantity + change);
          return { ...pkg, quantity: newQuantity };
        }
        return pkg;
      })
    );
  };

  // Calculate dynamic price based on guest count and other factors
  const calculateDynamicPrice = (packageOption: ProductOption, guests: number): number => {
    let basePrice = parseFloat(packageOption.base_price);

    if (config?.enable_dynamic_pricing && config.pricing_factors) {
      const factors = config.pricing_factors;
      
      // Apply guest count factor
      if (factors.guest_count_multiplier) {
        basePrice *= Math.max(1, guests / (factors.base_guest_count || 50));
      }

      // Apply date-based pricing (weekend, holiday, etc.)
      // This would need to be enhanced with actual date logic
      if (factors.date_multiplier) {
        basePrice *= factors.date_multiplier;
      }
    }

    return Math.round(basePrice * 100) / 100; // Round to 2 decimal places
  };

  // Check if package is selected
  const isPackageSelected = (packageId: number): boolean => {
    return selectedPackages.some(p => p.id === packageId);
  };

  // Get selected package data
  const getSelectedPackage = (packageId: number): SelectedPackage | undefined => {
    return selectedPackages.find(p => p.id === packageId);
  };

  // Calculate total price
  const totalPrice = useMemo(() => {
    return selectedPackages.reduce((sum, pkg) => sum + (pkg.price * pkg.quantity), 0);
  }, [selectedPackages]);

  // Validation
  const validateSelection = (): StepValidationResult => {
    const errors: Record<string, string[]> = {};

    if (config?.min_selection && selectedPackages.length < config.min_selection) {
      errors.packages = [`Please select at least ${config.min_selection} package(s)`];
    }

    if (config?.max_selection && selectedPackages.length > config.max_selection) {
      errors.packages = [`Please select no more than ${config.max_selection} package(s)`];
    }

    if (step.is_required && selectedPackages.length === 0) {
      errors.packages = ['Please select at least one package'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  // Handle comparison mode
  const toggleComparison = (packageId: number) => {
    setSelectedForComparison(prev => {
      if (prev.includes(packageId)) {
        return prev.filter(id => id !== packageId);
      } else if (prev.length < 3) { // Limit to 3 packages for comparison
        return [...prev, packageId];
      }
      return prev;
    });
  };

  if (packagesError) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Unable to Load Packages
        </Typography>
        <Typography variant="body2">
          There was an error loading available packages. Please refresh the page or try again later.
        </Typography>
      </Alert>
    );
  }

  if (isLoadingPackages) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="body1" color="text.secondary">
          Loading available packages...
        </Typography>
      </Box>
    );
  }

  if (packages.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          No Packages Available
        </Typography>
        <Typography variant="body2">
          There are currently no packages available for your event type and requirements.
          Please contact us directly to discuss custom options.
        </Typography>
      </Alert>
    );
  }

  const isSingleSelection = config?.selection_type === 'SINGLE';

  return (
    <Box>
      {/* Header with pricing and comparison controls */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="body1" color="text.secondary">
              For {guestCount} guests • {packages.length} packages available
            </Typography>
            {selectedPackages.length > 0 && (
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                Total: ₱{totalPrice.toFixed(2)}
              </Typography>
            )}
          </Box>

          {config?.enable_comparison && packages.length > 1 && (
            <Button
              variant={comparisonMode ? 'contained' : 'outlined'}
              startIcon={<Compare />}
              onClick={() => setComparisonMode(!comparisonMode)}
              size="small"
            >
              {comparisonMode ? 'Exit Compare' : 'Compare'}
            </Button>
          )}
        </Stack>

        {/* Selection guidance */}
        <Box sx={{ mt: 2 }}>
          {config?.min_selection && config?.max_selection ? (
            <Typography variant="body2" color="text.secondary">
              Select {config.min_selection === config.max_selection 
                ? config.min_selection 
                : `${config.min_selection}-${config.max_selection}`} package(s)
            </Typography>
          ) : config?.min_selection ? (
            <Typography variant="body2" color="text.secondary">
              Select at least {config.min_selection} package(s)
            </Typography>
          ) : config?.max_selection ? (
            <Typography variant="body2" color="text.secondary">
              Select up to {config.max_selection} package(s)
            </Typography>
          ) : null}
        </Box>
      </Box>

      {/* Package Selection */}
      {isSingleSelection ? (
        <RadioGroup
          value={selectedPackages[0]?.id || ''}
          onChange={(e) => {
            const packageId = parseInt(e.target.value);
            const packageOption = packages.find(p => p.id === packageId);
            if (packageOption) {
              handleSingleSelection(packageOption);
            }
          }}
        >
          <Stack spacing={3}>
            {packages.map((packageOption) => (
              <PackageCard
                key={packageOption.id}
                package={packageOption}
                guestCount={guestCount}
                isSelected={isPackageSelected(packageOption.id)}
                selectedData={getSelectedPackage(packageOption.id)}
                config={config}
                isSingleSelection={true}
                comparisonMode={comparisonMode}
                isComparisonSelected={selectedForComparison.includes(packageOption.id)}
                onToggleComparison={() => toggleComparison(packageOption.id)}
                onQuantityChange={(change) => handleQuantityChange(packageOption.id, change)}
                onViewDetails={() => setDetailsDialogPackage(packageOption)}
                isReadOnly={isReadOnly}
                calculatePrice={calculateDynamicPrice}
              />
            ))}
          </Stack>
        </RadioGroup>
      ) : (
        <Stack spacing={3}>
          {packages.map((packageOption) => (
            <PackageCard
              key={packageOption.id}
              package={packageOption}
              guestCount={guestCount}
              isSelected={isPackageSelected(packageOption.id)}
              selectedData={getSelectedPackage(packageOption.id)}
              config={config}
              isSingleSelection={false}
              comparisonMode={comparisonMode}
              isComparisonSelected={selectedForComparison.includes(packageOption.id)}
              onToggleSelection={(selected) => handleMultipleSelection(packageOption, selected)}
              onToggleComparison={() => toggleComparison(packageOption.id)}
              onQuantityChange={(change) => handleQuantityChange(packageOption.id, change)}
              onViewDetails={() => setDetailsDialogPackage(packageOption)}
              isReadOnly={isReadOnly}
              calculatePrice={calculateDynamicPrice}
            />
          ))}
        </Stack>
      )}

      {/* Validation errors */}
      {validationErrors?.packages && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {validationErrors.packages.map((error, index) => (
            <Typography key={index} variant="body2">
              {error}
            </Typography>
          ))}
        </Alert>
      )}

      {/* Comparison panel */}
      <Collapse in={comparisonMode && selectedForComparison.length > 0}>
        <Box sx={{ mt: 4, p: 3, backgroundColor: alpha(theme.palette.primary.main, 0.05), borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom>
            Package Comparison ({selectedForComparison.length}/3)
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
            {selectedForComparison.map(packageId => {
              const pkg = packages.find(p => p.id === packageId);
              if (!pkg) return null;
              
              return (
                <Card key={packageId} sx={{ minWidth: 250, flexShrink: 0 }}>
                  <CardContent sx={{ pb: 1 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      {pkg.name}
                    </Typography>
                    <Typography variant="h6" color="primary.main">
                      ₱{calculateDynamicPrice(pkg, guestCount).toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {pkg.description}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => toggleComparison(packageId)}
                      startIcon={<Close />}
                    >
                      Remove
                    </Button>
                  </CardActions>
                </Card>
              );
            })}
          </Box>
        </Box>
      </Collapse>

      {/* Package details dialog */}
      <Dialog
        open={!!detailsDialogPackage}
        onClose={() => setDetailsDialogPackage(null)}
        maxWidth="md"
        fullWidth
      >
        {detailsDialogPackage && (
          <>
            <DialogTitle>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">{detailsDialogPackage.name}</Typography>
                <IconButton onClick={() => setDetailsDialogPackage(null)}>
                  <Close />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="h5" color="primary.main" gutterBottom>
                    ₱{calculateDynamicPrice(detailsDialogPackage, guestCount).toFixed(2)}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {detailsDialogPackage.description}
                  </Typography>
                </Box>

                {detailsDialogPackage.has_excess_hours && (
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Duration & Pricing
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Includes {detailsDialogPackage.included_hours} hours • 
                      Additional hours: ₱{detailsDialogPackage.excess_hour_price}/hour
                    </Typography>
                  </Box>
                )}

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Package Details
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>Category:</strong> {detailsDialogPackage.category_name}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Pricing Model:</strong> {detailsDialogPackage.pricing_model === 'HOURLY' ? 'Hourly' : detailsDialogPackage.pricing_model === 'FIXED' ? 'Fixed' : detailsDialogPackage.pricing_model}
                    </Typography>
                    {detailsDialogPackage.advance_booking_days > 0 && (
                      <Typography variant="body2">
                        <strong>Advance Booking:</strong> {detailsDialogPackage.advance_booking_days} days required
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailsDialogPackage(null)}>
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

// Package Card Component
interface PackageCardProps {
  package: ProductOption;
  guestCount: number;
  isSelected: boolean;
  selectedData?: SelectedPackage;
  config?: PackageSelectionStepConfig;
  isSingleSelection: boolean;
  comparisonMode: boolean;
  isComparisonSelected: boolean;
  onToggleSelection?: (selected: boolean) => void;
  onToggleComparison: () => void;
  onQuantityChange: (change: number) => void;
  onViewDetails: () => void;
  isReadOnly: boolean;
  calculatePrice: (pkg: ProductOption, guests: number) => number;
}

const PackageCard: React.FC<PackageCardProps> = ({
  package: pkg,
  guestCount,
  isSelected,
  selectedData,
  config,
  isSingleSelection,
  comparisonMode,
  isComparisonSelected,
  onToggleSelection,
  onToggleComparison,
  onQuantityChange,
  onViewDetails,
  isReadOnly,
  calculatePrice,
}) => {
  const theme = useTheme();
  const dynamicPrice = calculatePrice(pkg, guestCount);

  return (
    <Card
      elevation={isSelected ? 8 : 2}
      sx={{
        border: isSelected ? `2px solid ${theme.palette.primary.main}` : '2px solid transparent',
        transition: 'all 0.3s ease',
        position: 'relative',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
      }}
    >
      {/* Selection indicator */}
      {isSelected && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
          }}
        >
          <CheckCircle color="primary" />
        </Box>
      )}

      {/* Featured badge */}
      {pkg.is_featured && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 1,
          }}
        >
          <Chip
            icon={<Star />}
            label="Popular"
            size="small"
            color="secondary"
            sx={{ fontWeight: 600 }}
          />
        </Box>
      )}

      <CardContent sx={{ pb: 1 }}>
        {/* Selection control */}
        <Box sx={{ mb: 2 }}>
          {isSingleSelection ? (
            <FormControlLabel
              value={pkg.id}
              control={<Radio disabled={isReadOnly} />}
              label=""
              sx={{ m: 0 }}
            />
          ) : (
            <FormControlLabel
              control={
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => onToggleSelection?.(e.target.checked)}
                  disabled={isReadOnly}
                />
              }
              label=""
              sx={{ m: 0 }}
            />
          )}
        </Box>

        {/* Package info */}
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          {pkg.name}
        </Typography>

        <Typography variant="h5" color="primary.main" gutterBottom sx={{ fontWeight: 700 }}>
          ₱{dynamicPrice.toFixed(2)}
          {pkg.pricing_model === 'HOURLY' && (
            <Typography component="span" variant="body2" color="text.secondary">
              /hour
            </Typography>
          )}
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 60 }}>
          {pkg.description}
        </Typography>

        {/* Package features */}
        <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Chip label={pkg.category_name} size="small" variant="outlined" />
          {pkg.has_excess_hours && (
            <Chip label={`${pkg.included_hours}h included`} size="small" variant="outlined" />
          )}
          {pkg.allow_multiple && (
            <Chip label="Multiple allowed" size="small" variant="outlined" />
          )}
        </Stack>

        {/* Quantity selector */}
        {isSelected && selectedData && pkg.allow_multiple && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ mr: 1 }}>
              Quantity:
            </Typography>
            <IconButton
              size="small"
              onClick={() => onQuantityChange(-1)}
              disabled={selectedData.quantity <= 1 || isReadOnly}
            >
              <Remove />
            </IconButton>
            <Badge badgeContent={selectedData.quantity} color="primary">
              <Box sx={{ width: 24, height: 24 }} />
            </Badge>
            <IconButton
              size="small"
              onClick={() => onQuantityChange(1)}
              disabled={isReadOnly}
            >
              <Add />
            </IconButton>
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Button
          size="small"
          startIcon={<Visibility />}
          onClick={onViewDetails}
        >
          Details
        </Button>

        {comparisonMode && (
          <Button
            size="small"
            variant={isComparisonSelected ? 'contained' : 'outlined'}
            startIcon={<Compare />}
            onClick={onToggleComparison}
          >
            {isComparisonSelected ? 'Remove' : 'Compare'}
          </Button>
        )}
      </CardActions>
    </Card>
  );
};

export default PackageSelectionStep;