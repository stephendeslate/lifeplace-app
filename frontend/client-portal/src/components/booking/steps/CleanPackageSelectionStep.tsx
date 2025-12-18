// frontend/client-portal/src/components/booking/steps/CleanPackageSelectionStep.tsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  CardContent,
  Alert,
  Collapse,
  IconButton,
  LinearProgress,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Star as StarIcon,
  AccessTime as AccessTimeIcon,
  Remove as RemoveIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { useAccessibility } from '../../accessibility';
import type {
  ProductOption,
  PackageSelectionStepData,
  PackageSelectionStepConfiguration,
} from '../../../types/booking';
import type { VenueSelectionStepData } from '../../../types/booking/stepData.types';
import { ProductsApi } from '../../../apis/booking/products.api';

interface PackageCardProps {
  pkg: ProductOption;
  isSelected: boolean;
  selectedQuantity: number;
  onSelect: (pkg: ProductOption) => void;
  onQuantityChange: (pkg: ProductOption, quantity: number) => void;
  canSelectMore: boolean;
  selectionType: 'SINGLE' | 'MULTIPLE';
  animationDelay: number;
}

const PackageCard: React.FC<PackageCardProps> = ({
  pkg,
  isSelected,
  selectedQuantity,
  onSelect,
  onQuantityChange,
  canSelectMore,
  selectionType,
  animationDelay,
}) => {
  const theme = useTheme();
  const { announceToScreenReader } = useAccessibility();
  const [expanded, setExpanded] = useState(false);

  const handleSelect = useCallback(() => {
    if (selectionType === 'SINGLE' || (!isSelected && canSelectMore)) {
      onSelect(pkg);
      announceToScreenReader(`Selected ${pkg.name}`);
    }
  }, [pkg, onSelect, isSelected, canSelectMore, selectionType, announceToScreenReader]);

  const handleQuantityChange = useCallback((change: number) => {
    const newQuantity = Math.max(0, selectedQuantity + change);
    onQuantityChange(pkg, newQuantity);
    announceToScreenReader(`Updated ${pkg.name} quantity to ${newQuantity}`);
  }, [pkg, selectedQuantity, onQuantityChange, announceToScreenReader]);

  // Simple styling based on whether package is featured
  const packageColor = pkg.is_featured ? theme.palette.warning.main : theme.palette.primary.main;

  return (
    <AnimatedElement animation="slideUp" delay={animationDelay}>
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          position: 'relative',
          cursor: selectionType === 'SINGLE' || (!isSelected && canSelectMore) ? 'pointer' : 'default',
          backgroundColor: isSelected 
            ? alpha(packageColor, 0.1)
            : alpha('#fff', 0.08),
          border: isSelected 
            ? `2px solid ${packageColor}`
            : `1px solid ${alpha('#fff', 0.1)}`,
          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.02)',
            backgroundColor: alpha(packageColor, 0.05),
            border: `2px solid ${alpha(packageColor, 0.5)}`,
          },
          '&::before': isSelected ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: packageColor,
            borderRadius: '8px 8px 0 0',
          } : {},
        }}
        onClick={handleSelect}
      >
        <CardContent sx={{ p: 3, pb: 1 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {pkg.is_featured && (
                <Chip
                  icon={<StarIcon fontSize="small" />}
                  label="Featured"
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.warning.main, 0.15),
                    color: theme.palette.warning.main,
                    fontWeight: 600,
                  }}
                />
              )}
              {pkg.type_display && (
                <Chip
                  label={pkg.type_display}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    backgroundColor: alpha('#fff', 0.05),
                    borderColor: alpha('#fff', 0.2),
                  }}
                />
              )}
            </Box>
            
            {/* Selection indicator */}
            <Box>
              {isSelected ? (
                <CheckCircleIcon 
                  sx={{ 
                    color: packageColor,
                    fontSize: 28,
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
                  }} 
                />
              ) : (
                <RadioButtonUncheckedIcon 
                  sx={{ 
                    color: alpha('#fff', 0.4),
                    fontSize: 28
                  }} 
                />
              )}
            </Box>
          </Box>

          {/* Package name and description */}
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            {pkg.name}
          </Typography>
          
          {pkg.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
              {pkg.description}
            </Typography>
          )}

          {/* Show actual data from API */}
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
            {pkg.included_hours && (
              <Chip
                icon={<AccessTimeIcon fontSize="small" />}
                label={`${pkg.included_hours} hours included`}
                size="small"
                variant="outlined"
                sx={{ backgroundColor: alpha('#fff', 0.1) }}
              />
            )}
            {pkg.category_name && (
              <Chip
                label={pkg.category_name}
                size="small"
                variant="outlined"
                sx={{ backgroundColor: alpha('#fff', 0.1) }}
              />
            )}
            {pkg.pricing_model_display && (
              <Chip
                label={pkg.pricing_model_display}
                size="small"
                variant="outlined"
                sx={{ backgroundColor: alpha('#fff', 0.1) }}
              />
            )}
          </Stack>

          {/* Pricing */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: packageColor }}>
                {pkg.formatted_price || `₱${parseFloat(pkg.base_price || '0').toLocaleString()}`}
              </Typography>
              {pkg.pricing_model === 'HOURLY' && (
                <Typography variant="body2" color="text.secondary">
                  per hour
                </Typography>
              )}
              {pkg.pricing_model === 'FIXED' && (
                <Typography variant="body2" color="text.secondary">
                  per event
                </Typography>
              )}
            </Box>
            
            {/* Show excess hour pricing if available */}
            {pkg.has_excess_hours && pkg.excess_hour_price && (
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary">
                  Additional hours:
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  ₱{parseFloat(pkg.excess_hour_price).toLocaleString()}/hr
                </Typography>
              </Box>
            )}
          </Box>

          {/* Quantity selector for multiple selection */}
          {selectionType === 'MULTIPLE' && isSelected && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mb: 2 }}>
              <IconButton 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(-1);
                }}
                disabled={selectedQuantity <= 1}
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': { backgroundColor: alpha('#fff', 0.2) }
                }}
              >
                <RemoveIcon />
              </IconButton>
              <Typography variant="h6" sx={{ minWidth: 40, textAlign: 'center', fontWeight: 600 }}>
                {selectedQuantity}
              </Typography>
              <IconButton 
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(1);
                }}
                sx={{
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': { backgroundColor: alpha('#fff', 0.2) }
                }}
              >
                <AddIcon />
              </IconButton>
            </Box>
          )}

          {/* Show additional details if they exist in the API response */}
          {(pkg.minimum_hours || pkg.maximum_hours || pkg.advance_booking_days) && (
            <Box>
              <Button
                startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                size="small"
                sx={{
                  color: 'text.secondary',
                  backgroundColor: alpha('#fff', 0.1),
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.2),
                  }
                }}
              >
                {expanded ? 'Less Details' : 'More Details'}
              </Button>

              <Collapse in={expanded}>
                <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${alpha('#fff', 0.1)}` }}>
                  <Stack spacing={1}>
                    {pkg.minimum_hours && (
                      <Typography variant="body2" color="text.secondary">
                        • Minimum booking: {pkg.minimum_hours} hours
                      </Typography>
                    )}
                    {pkg.maximum_hours && (
                      <Typography variant="body2" color="text.secondary">
                        • Maximum booking: {pkg.maximum_hours} hours
                      </Typography>
                    )}
                    {pkg.advance_booking_days && (
                      <Typography variant="body2" color="text.secondary">
                        • Advance booking required: {pkg.advance_booking_days} days
                      </Typography>
                    )}
                    {pkg.sku && (
                      <Typography variant="caption" color="text.secondary">
                        SKU: {pkg.sku}
                      </Typography>
                    )}
                  </Stack>
                </Box>
              </Collapse>
            </Box>
          )}
        </CardContent>
      </GlassCard>
    </AnimatedElement>
  );
};

interface CleanPackageSelectionStepProps {
  stepData?: PackageSelectionStepData;
  config: PackageSelectionStepConfiguration | null;
  onDataChange: (data: PackageSelectionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating?: boolean;
  venueSelectionData?: VenueSelectionStepData;
}

const CleanPackageSelectionStep: React.FC<CleanPackageSelectionStepProps> = ({
  stepData = { selected_packages: [] },
  config,
  onDataChange,
  validationErrors,
  venueSelectionData,
}) => {
  const theme = useTheme();

  const [availablePackages, setAvailablePackages] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAllPackages, setShowAllPackages] = useState(false);
  const selectionType = (config?.selection_type || 'SINGLE') as 'SINGLE' | 'MULTIPLE';
  const minSelection = config?.min_selection || 1;
  const maxSelection = config?.max_selection || 1;

  // Detect if a package was pre-selected from venue selection step
  const hasPreSelectedFromVenues = useMemo(() => {
    const hasCustomPackage = !!venueSelectionData?.custom_package_id;
    const hasMatchedPackage = !!venueSelectionData?.matched_package_id;
    const hasSelectedPackages = (stepData.selected_packages?.length ?? 0) > 0;
    return (hasCustomPackage || hasMatchedPackage) && hasSelectedPackages;
  }, [venueSelectionData, stepData.selected_packages]);

  // Check if the pre-selected package is a custom package (not in available list)
  const isCustomPackageSelected = useMemo(() => {
    if (!hasPreSelectedFromVenues || availablePackages.length === 0) return false;
    const selectedIds = stepData.selected_packages?.map(p => p.product_id) || [];
    return selectedIds.some(id => !availablePackages.some(p => p.id === id));
  }, [hasPreSelectedFromVenues, stepData.selected_packages, availablePackages]);

  // Handler to clear pre-selected package and show all options
  const handleChooseDifferent = useCallback(() => {
    setShowAllPackages(true);
    onDataChange({ selected_packages: [] });
  }, [onDataChange]);

  useEffect(() => {
    const loadPackages = async () => {
      setIsLoading(true);
      try {
        const packages = await ProductsApi.getPackages();
        // Ensure packages is always an array
        setAvailablePackages(Array.isArray(packages) ? packages : []);
      } catch (err) {
        console.error('Failed to load packages:', err);
        // Set empty array on error to prevent crash
        setAvailablePackages([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadPackages();
  }, []);

  // Calculate totals and selection state - memoize to stabilize reference
  const selectedPackageIds = useMemo(() =>
    stepData.selected_packages?.map(p => p.product_id) || [],
    [stepData.selected_packages]
  );
  const totalSelected = stepData.selected_packages?.length || 0;
  const canSelectMore = selectionType === 'MULTIPLE' && totalSelected < maxSelection;
  const totalPrice = stepData.selected_packages?.reduce((sum, pkg) => {
    const price = parseFloat(pkg.price || '0');
    return sum + (price * (pkg.quantity || 1));
  }, 0) || 0;

  // Handle package selection
  const handlePackageSelect = useCallback((pkg: ProductOption) => {
    const isCurrentlySelected = selectedPackageIds.includes(pkg.id);

    if (selectionType === 'SINGLE') {
      if (isCurrentlySelected) {
        onDataChange({ selected_packages: [] });
      } else {
        onDataChange({
          selected_packages: [{
            product_id: pkg.id,
            name: pkg.name,
            price: pkg.base_price,
            quantity: 1,
          }]
        });
      }
    } else {
      // MULTIPLE selection
      if (isCurrentlySelected) {
        const updatedPackages = stepData.selected_packages?.filter(p => p.product_id !== pkg.id) || [];
        onDataChange({ selected_packages: updatedPackages });
      } else if (canSelectMore) {
        const updatedPackages = [
          ...(stepData.selected_packages || []),
          {
            product_id: pkg.id,
            name: pkg.name,
            price: pkg.base_price,
            quantity: 1,
          }
        ];
        onDataChange({ selected_packages: updatedPackages });
      }
    }
  }, [stepData.selected_packages, selectedPackageIds, selectionType, canSelectMore, onDataChange]);

  // Handle quantity change
  const handleQuantityChange = useCallback((pkg: ProductOption, quantity: number) => {
    if (quantity === 0) {
      const updatedPackages = stepData.selected_packages?.filter(p => p.product_id !== pkg.id) || [];
      onDataChange({ selected_packages: updatedPackages });
    } else {
      const updatedPackages = stepData.selected_packages?.map(p => 
        p.product_id === pkg.id 
          ? { ...p, quantity }
          : p
      ) || [];
      onDataChange({ selected_packages: updatedPackages });
    }
  }, [stepData.selected_packages, onDataChange]);

  const hasFieldError = useCallback((fieldName: string) => {
    return !!(validationErrors[fieldName]?.length > 0);
  }, [validationErrors]);

  const getFieldError = useCallback((fieldName: string) => {
    return validationErrors[fieldName]?.[0];
  }, [validationErrors]);

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Loading available packages...
        </Typography>
      </Box>
    );
  }

  // Show confirmation UI for custom packages from venue selection
  if (isCustomPackageSelected && !showAllPackages && stepData.selected_packages && stepData.selected_packages.length > 0) {
    const customPkg = stepData.selected_packages[0];
    return (
      <Box>
        <AnimatedElement animation="slideDown" delay={100}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
              Your Package Selection
            </Typography>
          </Box>
        </AnimatedElement>

        <AnimatedElement animation="fadeIn" delay={200}>
          <Alert
            severity="success"
            sx={{
              mb: 3,
              backgroundColor: alpha(theme.palette.success.main, 0.1),
              border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
            }}
          >
            You've created a custom package from your venue selection.
          </Alert>
        </AnimatedElement>

        <AnimatedElement animation="slideUp" delay={300}>
          <GlassCard
            variant="light"
            intensity="medium"
            sx={{
              position: 'relative',
              backgroundColor: alpha(theme.palette.primary.main, 0.1),
              border: `2px solid ${theme.palette.primary.main}`,
              mb: 3,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                backgroundColor: theme.palette.primary.main,
                borderRadius: '8px 8px 0 0',
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CheckCircleIcon sx={{ color: theme.palette.primary.main }} />
                <Typography variant="h5" sx={{ fontWeight: 700 }}>
                  {customPkg.name}
                </Typography>
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mb: 3 }}>
                {customPkg.included_hours && (
                  <Chip
                    icon={<AccessTimeIcon fontSize="small" />}
                    label={`${customPkg.included_hours} hours included`}
                    size="small"
                    variant="outlined"
                    sx={{ backgroundColor: alpha('#fff', 0.1) }}
                  />
                )}
                {customPkg.excess_hour_price && (
                  <Chip
                    label={`+₱${parseFloat(customPkg.excess_hour_price).toLocaleString()}/hr extra`}
                    size="small"
                    variant="outlined"
                    sx={{ backgroundColor: alpha('#fff', 0.1) }}
                  />
                )}
              </Stack>

              <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main, mb: 2 }}>
                ₱{parseFloat(customPkg.price || '0').toLocaleString()}
              </Typography>

              <Button
                variant="outlined"
                onClick={handleChooseDifferent}
                sx={{
                  color: 'text.secondary',
                  borderColor: alpha('#fff', 0.3),
                  '&:hover': {
                    backgroundColor: alpha('#fff', 0.1),
                    borderColor: alpha('#fff', 0.5),
                  },
                }}
              >
                Choose a Different Package
              </Button>
            </CardContent>
          </GlassCard>
        </AnimatedElement>

        <AnimatedElement animation="fadeIn" delay={400}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
            Click Continue to proceed with this package.
          </Typography>
        </AnimatedElement>

        {/* Show preview of available packages */}
        {availablePackages.length > 0 && (
          <AnimatedElement animation="slideUp" delay={500}>
            <Box sx={{ mt: 4 }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                Or choose from our pre-made packages:
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {availablePackages.slice(0, 3).map((pkg) => (
                  <GlassCard
                    key={pkg.id}
                    variant="light"
                    intensity="weak"
                    sx={{
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
                      },
                    }}
                    onClick={() => handlePackageSelect(pkg)}
                  >
                    <CardContent sx={{ py: 2, px: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {pkg.name}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                          ₱{parseFloat(pkg.base_price || '0').toLocaleString()}
                        </Typography>
                      </Box>
                    </CardContent>
                  </GlassCard>
                ))}
              </Box>
            </Box>
          </AnimatedElement>
        )}
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Select Your Package
          </Typography>
        </Box>
      </AnimatedElement>

      {/* Selection info */}
      {selectionType === 'MULTIPLE' && (
        <AnimatedElement animation="fadeIn" delay={200}>
          <Alert 
            severity="info" 
            sx={{ 
              mb: 3,
              backgroundColor: alpha(theme.palette.info.main, 0.1),
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
            }}
          >
            You can select {minSelection} to {maxSelection} packages. 
            Currently selected: {totalSelected}
          </Alert>
        </AnimatedElement>
      )}

      {/* Package Grid */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            md: Array.isArray(availablePackages) && availablePackages.length === 2 
              ? 'repeat(2, 1fr)' 
              : 'repeat(auto-fit, minmax(350px, 1fr))'
          }, 
          gap: 4,
          mb: 4 
        }}
      >
        {Array.isArray(availablePackages) && availablePackages.length > 0 ? (
          availablePackages.map((pkg, index) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              isSelected={selectedPackageIds.includes(pkg.id)}
              selectedQuantity={
                stepData.selected_packages?.find(p => p.product_id === pkg.id)?.quantity || 0
              }
              onSelect={handlePackageSelect}
              onQuantityChange={handleQuantityChange}
              canSelectMore={canSelectMore}
              selectionType={selectionType}
              animationDelay={400 + index * 150}
            />
          ))
        ) : (
          <Box sx={{ 
            gridColumn: '1 / -1',
            textAlign: 'center', 
            py: 8,
            color: 'text.secondary' 
          }}>
            <Typography variant="h6" gutterBottom>
              No packages available
            </Typography>
            <Typography variant="body2">
              Please check back later or contact support
            </Typography>
          </Box>
        )}
      </Box>

      {/* Validation Errors */}
      {hasFieldError('selected_packages') && (
        <AnimatedElement animation="slideUp" delay={0}>
          <Alert severity="error" sx={{ mt: 2 }}>
            {getFieldError('selected_packages')}
          </Alert>
        </AnimatedElement>
      )}

      {/* Total Price Display */}
      {totalSelected > 0 && (
        <AnimatedElement animation="slideUp" delay={600}>
          <GlassCard
            variant="light"
            intensity="strong"
            sx={{
              p: 3,
              backgroundColor: alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Total Selected: {totalSelected} {totalSelected === 1 ? 'package' : 'packages'}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                ₱{totalPrice.toLocaleString()}
              </Typography>
            </Box>
          </GlassCard>
        </AnimatedElement>
      )}
    </Box>
  );
};

export { CleanPackageSelectionStep };
export type { CleanPackageSelectionStepProps };