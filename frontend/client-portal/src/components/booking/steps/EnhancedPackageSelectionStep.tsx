// frontend/client-portal/src/components/booking/steps/EnhancedPackageSelectionStep.tsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Avatar,
  Chip,
  CardContent,
  Alert,
  Collapse,
  IconButton,
  useTheme,
  alpha,
  Divider,
} from '@mui/material';
import {
  ShoppingCart as ShoppingCartIcon,
  Star as StarIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  People as PeopleIcon,
  LocalOffer as OfferIcon,
  Verified as VerifiedIcon,
  TrendingUp as TrendingUpIcon,
  AutoAwesome as AutoAwesomeIcon,
  Inventory as InventoryIcon,
  Compare as CompareIcon,
} from '@mui/icons-material';
import { GlassCard } from '../../../design-system/components/GlassCard';
import { AnimatedElement } from '../../../design-system/components/AnimatedElement';
import { useAccessibility } from '../../accessibility';
import { ProductsApi } from '../../../apis/booking/products.api';
import type { 
  PackageSelectionStepData, 
  PackageSelectionStepConfiguration,
  ProductOption,
} from '../../../types/booking';

interface EnhancedPackageSelectionStepProps {
  stepData?: PackageSelectionStepData;
  config: PackageSelectionStepConfiguration | null;
  onDataChange: (data: PackageSelectionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
}

interface PackageCardProps {
  package: ProductOption;
  isSelected: boolean;
  selectedQuantity: number;
  onSelect: (pkg: ProductOption) => void;
  onQuantityChange: (pkg: ProductOption, quantity: number) => void;
  canSelectMore: boolean;
  selectionType: 'SINGLE' | 'MULTIPLE';
  animationDelay: number;
}

// Enhanced package card with animations and interactivity
const EnhancedPackageCard: React.FC<PackageCardProps> = ({
  package: pkg,
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

  const toggleExpanded = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  // Get package tier styling
  const getTierStyling = () => {
    const name = pkg.name.toLowerCase();
    if (name.includes('premium') || name.includes('luxury')) {
      return {
        color: theme.palette.warning.main,
        backgroundColor: alpha(theme.palette.warning.main, 0.15),
        borderColor: theme.palette.warning.main,
        tier: 'Premium',
        icon: <StarIcon fontSize="small" />
      };
    }
    if (name.includes('deluxe') || name.includes('pro')) {
      return {
        color: theme.palette.secondary.main,
        backgroundColor: alpha(theme.palette.secondary.main, 0.15),
        borderColor: theme.palette.secondary.main,
        tier: 'Deluxe',
        icon: <VerifiedIcon fontSize="small" />
      };
    }
    return {
      color: theme.palette.primary.main,
      backgroundColor: alpha(theme.palette.primary.main, 0.15),
      borderColor: theme.palette.primary.main,
      tier: 'Standard',
      icon: <CheckCircleIcon fontSize="small" />
    };
  };

  const tierStyling = getTierStyling();
  // Use package data for popularity if available
  const popularity = pkg.is_featured ? 85 : 75;

  return (
    <AnimatedElement animation="slideUp" delay={animationDelay}>
      <GlassCard
        variant="light"
        intensity="medium"
        sx={{
          position: 'relative',
          cursor: selectionType === 'SINGLE' || (!isSelected && canSelectMore) ? 'pointer' : 'default',
          backgroundColor: isSelected 
            ? alpha(tierStyling.color, 0.1)
            : alpha('#fff', 0.08),
          border: isSelected 
            ? `2px solid ${tierStyling.color}`
            : `1px solid ${alpha('#fff', 0.1)}`,
          transform: isSelected ? 'scale(1.02)' : 'scale(1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.02)',
            backgroundColor: alpha(tierStyling.color, 0.05),
            border: `2px solid ${alpha(tierStyling.color, 0.5)}`,
          },
          '&::before': isSelected ? {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: tierStyling.color,
            borderRadius: '8px 8px 0 0',
          } : {},
        }}
        onClick={handleSelect}
      >
        <CardContent sx={{ p: 3, pb: 1 }}>
          {/* Header with tier and popularity */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                icon={tierStyling.icon}
                label={tierStyling.tier}
                size="small"
                sx={{
                  backgroundColor: tierStyling.backgroundColor,
                  color: tierStyling.color,
                  fontWeight: 600,
                }}
              />
              {popularity > 80 && (
                <Chip
                  icon={<TrendingUpIcon />}
                  label="Popular"
                  size="small"
                  sx={{
                    backgroundColor: alpha(theme.palette.success.main, 0.15),
                    color: theme.palette.success.main,
                  }}
                />
              )}
            </Box>
            
            {/* Selection indicator */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isSelected ? (
                <CheckCircleIcon 
                  sx={{ 
                    color: tierStyling.color,
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
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
            {pkg.description}
          </Typography>

          {/* Key features */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
            <Chip
              icon={<PeopleIcon fontSize="small" />}
              label="Event package"
              size="small"
              variant="outlined"
              sx={{ backgroundColor: alpha('#fff', 0.1) }}
            />
            <Chip
              icon={<OfferIcon fontSize="small" />}
              label="Full service"
              size="small"
              variant="outlined"
              sx={{ backgroundColor: alpha('#fff', 0.1) }}
            />
          </Box>

          {/* Pricing */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: tierStyling.color }}>
                ₱{parseFloat(pkg.base_price || '25000').toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                per event
              </Typography>
            </Box>
            
            {/* Popularity indicator */}
            <Box sx={{ textAlign: 'right' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  {popularity}% satisfaction
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      sx={{
                        fontSize: 14,
                        color: i < Math.floor(popularity / 20) 
                          ? theme.palette.warning.main 
                          : alpha('#fff', 0.3)
                      }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Expand/Collapse for more details */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button
              startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded();
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
            
            {selectionType === 'MULTIPLE' && isSelected && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
                  <ExpandLessIcon />
                </IconButton>
                <Typography variant="body1" sx={{ minWidth: 24, textAlign: 'center', fontWeight: 600 }}>
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
                  <ExpandMoreIcon />
                </IconButton>
              </Box>
            )}
          </Box>

          {/* Expanded content */}
          <Collapse in={expanded}>
            <Box sx={{ mt: 3, pt: 2, borderTop: `1px solid ${alpha('#fff', 0.1)}` }}>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Included Items:
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                    <Typography variant="body2">Professional event service</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
                    <Typography variant="body2">Complete event coordination</Typography>
                  </Box>
                </Box>
              </Box>
              
              {/* Additional package details */}
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Package Highlights:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    Complete event package with professional coordination and setup.
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Perfect For:
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                    All types of events and celebrations
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </CardContent>
      </GlassCard>
    </AnimatedElement>
  );
};

export const EnhancedPackageSelectionStep: React.FC<EnhancedPackageSelectionStepProps> = ({
  stepData = { selected_packages: [] },
  config,
  onDataChange,
  validationErrors,
}) => {
  const theme = useTheme();
  
  const [availablePackages, setAvailablePackages] = useState<ProductOption[]>([]);
  const selectionType = (config?.selection_type || 'SINGLE') as 'SINGLE' | 'MULTIPLE';
  const minSelection = config?.min_selection || 1;
  const maxSelection = config?.max_selection || 1;
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    const loadPackages = async () => {
      try {
        const packages = await ProductsApi.getPackages();
        // Ensure packages is always an array
        setAvailablePackages(Array.isArray(packages) ? packages : []);
      } catch (err) {
        console.error('Failed to load packages:', err);
        // Set empty array on error to prevent crash
        setAvailablePackages([]);
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
      // Single selection - replace current selection
      const newSelection = isCurrentlySelected ? [] : [{
        product_id: pkg.id,
        name: pkg.name,
        price: pkg.base_price,
        quantity: 1,
      }];
      onDataChange({ selected_packages: newSelection });
    } else {
      // Multiple selection
      if (isCurrentlySelected) {
        // Remove from selection
        const newSelection = stepData.selected_packages?.filter(p => p.product_id !== pkg.id) || [];
        onDataChange({ selected_packages: newSelection });
      } else if (canSelectMore) {
        // Add to selection
        const newSelection = [
          ...(stepData.selected_packages || []),
          { product_id: pkg.id, name: pkg.name, price: pkg.base_price, quantity: 1 }
        ];
        onDataChange({ selected_packages: newSelection });
      }
    }
  }, [stepData.selected_packages, selectedPackageIds, selectionType, canSelectMore, onDataChange]);

  // Handle quantity changes
  const handleQuantityChange = useCallback((pkg: ProductOption, quantity: number) => {
    const updatedPackages = stepData.selected_packages?.map(p => 
      p.product_id === pkg.id ? { ...p, quantity } : p
    ) || [];
    
    // Remove packages with quantity 0
    const filteredPackages = updatedPackages.filter(p => p.quantity > 0);
    
    onDataChange({ selected_packages: filteredPackages });
  }, [stepData.selected_packages, onDataChange]);

  const getFieldError = (fieldName: string) => validationErrors[fieldName]?.[0];
  const hasFieldError = (fieldName: string) => !!(validationErrors[fieldName]?.length > 0);

  const isFormValid = totalSelected >= minSelection && totalSelected <= maxSelection;

  return (
    <Box>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              backgroundColor: alpha(theme.palette.primary.main, 0.15),
              color: theme.palette.primary.main,
              mx: 'auto',
              mb: 3,
            }}
          >
            <ShoppingCartIcon sx={{ fontSize: 40 }} />
          </Avatar>
          
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            Choose Your Package
          </Typography>
          
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: 'auto' }}>
            Select the perfect package for your event. Each package is carefully curated to provide exceptional value.
          </Typography>
        </Box>
      </AnimatedElement>

      {/* Selection Summary */}
      <AnimatedElement animation="slideUp" delay={200}>
        <GlassCard
          variant="light"
          intensity="medium"
          sx={{
            mb: 4,
            backgroundColor: isFormValid 
              ? alpha(theme.palette.success.main, 0.1)
              : alpha(theme.palette.warning.main, 0.05),
            border: `1px solid ${alpha(isFormValid ? theme.palette.success.main : theme.palette.warning.main, 0.2)}`,
          }}
        >
          <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(4, 1fr)' }, gap: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                  {totalSelected}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selected {selectionType === 'MULTIPLE' ? 'Packages' : 'Package'}
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                  ₱{totalPrice.toLocaleString()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Price
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.info.main }}>
                  {minSelection}-{maxSelection}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Selection Range
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  {isFormValid ? (
                    <CheckCircleIcon color="success" />
                  ) : (
                    <AutoAwesomeIcon color="warning" />
                  )}
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {isFormValid ? 'Ready!' : 'Select More'}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Selection Status
                </Typography>
              </Box>
            </Box>
          </Box>
        </GlassCard>
      </AnimatedElement>

      {/* Selection Type Info */}
      <AnimatedElement animation="slideRight" delay={250}>
        <Alert 
          severity={selectionType === 'SINGLE' ? 'info' : 'success'}
          icon={<InventoryIcon />}
          sx={{ 
            mb: 4,
            backgroundColor: alpha('#fff', 0.05),
            border: `1px solid ${alpha('#fff', 0.1)}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {selectionType === 'SINGLE' 
              ? 'Single Package Selection'
              : `Multiple Package Selection (${minSelection}-${maxSelection})`
            }
          </Typography>
          <Typography variant="body2">
            {selectionType === 'SINGLE'
              ? 'Choose one package that best fits your event needs.'
              : `You can select between ${minSelection} and ${maxSelection} packages to create your perfect event combination.`
            }
          </Typography>
        </Alert>
      </AnimatedElement>

      {/* Quick Actions */}
      <AnimatedElement animation="slideLeft" delay={300}>
        <Box sx={{ display: 'flex', gap: 2, mb: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            startIcon={<CompareIcon />}
            variant="outlined"
            onClick={() => setCompareMode(!compareMode)}
            sx={{
              backgroundColor: compareMode ? alpha(theme.palette.primary.main, 0.15) : alpha('#fff', 0.1),
              border: `1px solid ${alpha('#fff', 0.2)}`,
              backdropFilter: 'blur(10px)',
              '&:hover': {
                backgroundColor: alpha('#fff', 0.2),
              }
            }}
          >
            {compareMode ? 'Exit Compare' : 'Compare Packages'}
          </Button>
        </Box>
      </AnimatedElement>

      {/* Package Grid */}
      <Box 
        sx={{ 
          display: 'grid', 
          gridTemplateColumns: { 
            xs: '1fr', 
            md: Array.isArray(availablePackages) && availablePackages.length === 2 ? 'repeat(2, 1fr)' : 'repeat(auto-fit, minmax(350px, 1fr))'
          }, 
          gap: 4,
          mb: 4 
        }}
      >
        {Array.isArray(availablePackages) && availablePackages.length > 0 ? (
          availablePackages.map((pkg, index) => (
            <EnhancedPackageCard
              key={pkg.id}
              package={pkg}
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
              Package options will appear here once they are configured
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

      {/* Selection Summary Footer */}
      {totalSelected > 0 && (
        <AnimatedElement animation="slideUp" delay={600}>
          <GlassCard
            variant="light"
            intensity="subtle"
            sx={{
              mt: 4,
              backgroundColor: alpha(theme.palette.success.main, 0.05),
              border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            }}
          >
            <Box sx={{ p: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, textAlign: 'center' }}>
                🎉 Your Selected Package{totalSelected > 1 ? 's' : ''}
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {stepData.selected_packages?.map((selection) => {
                  return (
                    <Box
                      key={selection.product_id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2,
                        backgroundColor: alpha('#fff', 0.1),
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <CheckCircleIcon color="success" />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            {selection.name}
                          </Typography>
                          {selectionType === 'MULTIPLE' && (
                            <Typography variant="body2" color="text.secondary">
                              Quantity: {selection.quantity}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                        ₱{(parseFloat(selection.price || '0') * (selection.quantity || 1)).toLocaleString()}
                      </Typography>
                    </Box>
                  );
                })}
                
                <Divider sx={{ my: 1, backgroundColor: alpha('#fff', 0.2) }} />
                
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Total Package Cost:
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.success.main }}>
                    ₱{totalPrice.toLocaleString()}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </GlassCard>
        </AnimatedElement>
      )}
    </Box>
  );
};