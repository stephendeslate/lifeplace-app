// frontend/client-portal/src/components/booking/steps/CleanPackageSelectionStep/CleanPackageSelectionStep.tsx
// Orchestrator: venue-aware package selection with custom bundle option

import React from 'react';
import { Box, Typography, Alert, Divider, LinearProgress, useTheme, alpha } from '@mui/material';
import { GlassCard } from '@/design-system/components/GlassCard';
import { AnimatedElement } from '@/design-system/components/AnimatedElement';
import type { PackageSelectionStepData, PackageSelectionStepConfiguration } from '@/types/booking';
import type { VenueSelectionStepData, DateTimeStepData } from '@/types/booking/stepData.types';
import { PackageCard } from './PackageCard';
import { VenueHoursSelector } from './VenueHoursSelector';
import { usePackageSelectionLogic } from './usePackageSelectionLogic';

export interface CleanPackageSelectionStepProps {
  stepData?: PackageSelectionStepData;
  config: PackageSelectionStepConfiguration | null;
  onDataChange: (data: PackageSelectionStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating?: boolean;
  venueSelectionData?: VenueSelectionStepData;
  dateTimeStepData?: DateTimeStepData;
  eventTypeId?: number;
}

const CleanPackageSelectionStep: React.FC<CleanPackageSelectionStepProps> = ({
  stepData = { selected_packages: [] },
  config,
  onDataChange,
  validationErrors,
  venueSelectionData,
  dateTimeStepData,
  eventTypeId,
}) => {
  const theme = useTheme();

  const {
    isLoading,
    filteredPackages,
    selectedVenues,
    customBundlePackage,
    isMultiVenue,
    isCustomBundleSelected,
    selectionType,
    minSelection,
    maxSelection,
    totalSelected,
    canSelectMore,
    selectedPackageIds,
    venueAdditionalHours,
    totalPrice,
    childPricingConfig,
    hasVenueSelection,
    handlePackageSelect,
    handleQuantityChange,
    handleAttendeeBreakdownChange,
    handleResetBreakdown,
    handleVenueHoursChange,
    hasFieldError,
    getFieldError,
  } = usePackageSelectionLogic({
    stepData,
    config,
    onDataChange,
    validationErrors,
    venueSelectionData,
    dateTimeStepData,
    eventTypeId,
  });

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

  return (
    <Box>
      {/* Header */}
      <AnimatedElement animation="slideDown" delay={100}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
            Choose Your Package
          </Typography>

          {hasVenueSelection && selectedVenues.length > 0 && (
            <Typography variant="body1" color="text.secondary">
              Based on your selection:{' '}
              <strong>{selectedVenues.map((v) => v.name).join(', ')}</strong>
            </Typography>
          )}
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
            You can select {minSelection} to {maxSelection} packages. Currently selected:{' '}
            {totalSelected}
          </Alert>
        </AnimatedElement>
      )}

      {/* Custom Bundle Option */}
      {customBundlePackage && (
        <>
          <AnimatedElement animation="fadeIn" delay={250}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              {isMultiVenue ? 'Create Custom Bundle' : 'Book Your Venue'}
            </Typography>
          </AnimatedElement>

          <Box sx={{ mb: 4 }}>
            <PackageCard
              pkg={customBundlePackage}
              isSelected={isCustomBundleSelected}
              selectedQuantity={
                stepData.selected_packages?.find((p) => p.product_id === -1)?.quantity || 0
              }
              onSelect={handlePackageSelect}
              onQuantityChange={handleQuantityChange}
              canSelectMore={canSelectMore}
              selectionType={selectionType}
              animationDelay={300}
              isCustomBundle={true}
              isMultiVenue={isMultiVenue}
              childPricingEnabled={childPricingConfig.enabled}
              attendeeBreakdown={
                stepData.selected_packages?.find((p) => p.product_id === -1)?.attendee_breakdown
              }
              onAttendeeBreakdownChange={(tierIndex, newCount) =>
                handleAttendeeBreakdownChange(-1, tierIndex, newCount)
              }
              onResetBreakdown={() => handleResetBreakdown(-1)}
            />

            {isCustomBundleSelected && selectedVenues.length > 0 && (
              <AnimatedElement animation="slideUp" delay={350}>
                <VenueHoursSelector
                  venues={selectedVenues}
                  venueHours={venueAdditionalHours}
                  onHoursChange={handleVenueHoursChange}
                  maxHours={10}
                />
              </AnimatedElement>
            )}
          </Box>

          <AnimatedElement animation="fadeIn" delay={400}>
            <Divider sx={{ mb: 4 }}>
              <Typography variant="body2" color="text.secondary">
                OR CHOOSE A PRE-MADE PACKAGE
              </Typography>
            </Divider>
          </AnimatedElement>
        </>
      )}

      {/* Pre-made Package Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md:
              Array.isArray(filteredPackages) && filteredPackages.length === 2
                ? 'repeat(2, 1fr)'
                : 'repeat(auto-fit, minmax(350px, 1fr))',
          },
          gap: 4,
          mb: 4,
        }}
      >
        {Array.isArray(filteredPackages) && filteredPackages.length > 0 ? (
          filteredPackages.map((pkg, index) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              isSelected={selectedPackageIds.includes(pkg.id)}
              selectedQuantity={
                stepData.selected_packages?.find((p) => p.product_id === pkg.id)?.quantity || 0
              }
              onSelect={handlePackageSelect}
              onQuantityChange={handleQuantityChange}
              canSelectMore={canSelectMore}
              selectionType={selectionType}
              animationDelay={400 + index * 150}
              childPricingEnabled={childPricingConfig.enabled}
              attendeeBreakdown={
                stepData.selected_packages?.find((p) => p.product_id === pkg.id)?.attendee_breakdown
              }
              onAttendeeBreakdownChange={(tierIndex, newCount) =>
                handleAttendeeBreakdownChange(pkg.id, tierIndex, newCount)
              }
              onResetBreakdown={() => handleResetBreakdown(pkg.id)}
            />
          ))
        ) : (
          <Box
            sx={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              py: 8,
              color: 'text.secondary',
            }}
          >
            <Typography variant="h6" gutterBottom>
              No packages available
            </Typography>
            {customBundlePackage && (
              <Typography variant="body2">
                You can create a custom package from your venue selection.
              </Typography>
            )}
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
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Box>
                <Typography variant="h6">
                  Total Selected: {totalSelected} {totalSelected === 1 ? 'package' : 'packages'}
                </Typography>
                {stepData.selected_packages?.map((pkg) =>
                  pkg.pricing_unit === 'PER_PERSON' ? (
                    <Typography key={pkg.product_id} variant="body2" color="text.secondary">
                      {pkg.quantity} {pkg.quantity === 1 ? 'person' : 'persons'} × ₱
                      {parseFloat(pkg.price || '0').toLocaleString()}/person
                    </Typography>
                  ) : null,
                )}
              </Box>
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
