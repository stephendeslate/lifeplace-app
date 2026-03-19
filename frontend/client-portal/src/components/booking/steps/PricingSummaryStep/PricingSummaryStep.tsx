// frontend/client-portal/src/components/booking/steps/PricingSummaryStep/PricingSummaryStep.tsx

import React from 'react';
import { Box, Typography, CircularProgress, Alert, Button, Fade } from '@mui/material';
import { Receipt } from '@mui/icons-material';
import type {
  PricingSummaryStepData,
  PricingSummaryStepConfiguration,
  StepData,
  BookingFlow,
  BookingSession,
} from '@/types/booking';
import { usePricingSummaryLogic } from './usePricingSummaryLogic';
import { PackageBreakdownTable } from './PackageBreakdownTable';
import { AddonBreakdownTable } from './AddonBreakdownTable';
import { DiscountCodeSection } from './DiscountCodeSection';
import { OrderSummaryCard } from './OrderSummaryCard';
import { BookingReviewSection } from './BookingReviewSection';
import { EmptyItemsView } from './EmptyItemsView';

interface PricingSummaryStepProps {
  stepData?: PricingSummaryStepData;
  allStepData?: StepData;
  config: PricingSummaryStepConfiguration | null;
  onDataChange: (data: PricingSummaryStepData) => void;
  validationErrors: Record<string, string[]>;
  isValidating: boolean;
  flow?: BookingFlow | null;
  session?: BookingSession | null;
  totalPrice?: string;
}

export const PricingSummaryStep: React.FC<PricingSummaryStepProps> = ({
  stepData = {
    applied_discount_code: undefined,
    terms_accepted: false,
    marketing_consent: false,
    special_requests: '',
  },
  allStepData = {},
  config,
  onDataChange,
  validationErrors,
  isValidating,
  flow,
}) => {
  const logic = usePricingSummaryLogic({
    stepData,
    config,
    onDataChange,
    flow,
  });

  // Show loading state on initial load
  if (logic.calculatingPricing && !logic.hasItems) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Calculating pricing...
        </Typography>
      </Box>
    );
  }

  // Show error if pricing calculation failed and no items
  if (logic.pricingError && !logic.hasItems) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6">Pricing Calculation Error</Typography>
        <Typography variant="body2">{logic.pricingError}</Typography>
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 1 }}
          onClick={() => window.location.reload()}
        >
          Refresh Page
        </Button>
      </Alert>
    );
  }

  // Show simplified view if no items selected
  if (!logic.hasItems && !logic.calculatingPricing) {
    return (
      <EmptyItemsView
        config={config}
        stepData={stepData}
        allStepData={allStepData}
        flow={flow}
        validationErrors={validationErrors}
        formatDate={logic.formatDate}
        onTermsChange={logic.handleTermsChange}
        onMarketingConsentChange={logic.handleMarketingConsentChange}
        onSpecialRequestsChange={logic.handleSpecialRequestsChange}
      />
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Receipt />
        {config?.header_text || 'Pricing Summary'}
        <Fade in={logic.isUpdatingPrices}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Updating prices...
            </Typography>
          </Box>
        </Fade>
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {logic.isQuoteMode
          ? 'Review your selected add-ons below. Since no package is selected, you will receive a custom quote from our team.'
          : 'Review your selected items and total cost. You can apply a discount code if you have one.'}
      </Typography>

      {/* Quote mode alert */}
      {logic.isQuoteMode && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Quote Request Mode
          </Typography>
          <Typography variant="body2">
            You've selected add-ons but no event package. The pricing below is an estimate for your
            selected add-ons only. On the next step, you'll be able to request a custom quote and
            our team will recommend the best package options for your event.
          </Typography>
        </Alert>
      )}

      {/* Show pricing error as warning if we have items */}
      {logic.pricingError && logic.hasItems && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {logic.pricingError}
        </Alert>
      )}

      {/* Selected Packages */}
      {config?.show_package_breakdown !== false && logic.selectedPackages.length > 0 && (
        <PackageBreakdownTable
          selectedPackages={logic.selectedPackages}
          pricing={logic.pricing}
          isUpdatingPrices={logic.isUpdatingPrices}
          formatAmount={logic.formatAmount}
        />
      )}

      {/* Selected Add-ons */}
      {config?.show_addon_breakdown !== false && logic.selectedAddons.length > 0 && (
        <AddonBreakdownTable
          selectedAddons={logic.selectedAddons}
          pricing={logic.pricing}
          isUpdatingPrices={logic.isUpdatingPrices}
          formatAmount={logic.formatAmount}
        />
      )}

      {/* Discount Code Section */}
      {config?.show_discount_field !== false && (
        <DiscountCodeSection
          config={config}
          appliedDiscountCode={stepData.applied_discount_code}
          discountCodeInput={logic.discountCodeInput}
          discountError={logic.discountError}
          validatingDiscount={logic.validatingDiscount}
          validationErrors={validationErrors}
          onApplyDiscount={logic.handleApplyDiscount}
          onRemoveDiscount={logic.handleRemoveDiscount}
          onDiscountInputChange={logic.handleDiscountInputChange}
        />
      )}

      {/* Pricing Summary */}
      <OrderSummaryCard
        config={config}
        pricing={logic.pricing}
        totalItemCount={logic.totalItemCount}
        isQuoteMode={logic.isQuoteMode}
        isUpdatingPrices={logic.isUpdatingPrices}
      />

      {/* Booking Review Section */}
      {config?.show_booking_review !== false && (
        <BookingReviewSection
          config={config}
          stepData={stepData}
          allStepData={allStepData}
          flow={flow}
          validationErrors={validationErrors}
          formatDate={logic.formatDate}
          onTermsChange={logic.handleTermsChange}
          onMarketingConsentChange={logic.handleMarketingConsentChange}
          onSpecialRequestsChange={logic.handleSpecialRequestsChange}
        />
      )}

      {/* Footer text */}
      {config?.footer_text && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {config.footer_text}
        </Typography>
      )}

      {/* Validation state indicator */}
      {isValidating && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Validating pricing...
          </Typography>
        </Box>
      )}
    </Box>
  );
};
