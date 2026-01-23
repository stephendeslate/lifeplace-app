// frontend/client-portal/src/components/booking/steps/PricingSummaryStep.tsx

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  CircularProgress,
  Chip,
  Skeleton,
  Fade,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Receipt,
  LocalOffer,
  CheckCircle,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useBooking } from '../../../contexts/BookingContext';
import { useSimplePricing } from '../../../hooks/booking/useSimplePricing';
import { useCurrencySettings } from '../../../hooks/useCurrency';
import { formatPhilippinesTime } from '../../../utils/timezone';
import type {
  PricingSummaryStepData,
  PricingSummaryStepConfiguration,
  StepData,
  BookingFlow,
  BookingSession,
  SelectedPackage,
} from '../../../types/booking';

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
  const { state, actions } = useBooking();
  const { formatAmount } = useCurrencySettings();
  const [discountCodeInput, setDiscountCodeInput] = useState<string>('');
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [validatingDiscount, setValidatingDiscount] = useState(false);

  // Get selected packages and addons from step data - memoized to prevent infinite loops
  // Check package_selection first, then venue_selection (for custom packages), then booking_data
  const selectedPackages: SelectedPackage[] = useMemo(() =>
    state.stepData.package_selection?.selected_packages ||
    (state.stepData.venue_selection as { selected_packages?: SelectedPackage[] })?.selected_packages ||
    (state.currentSession?.booking_data?.selected_packages as SelectedPackage[] | undefined) ||
    [],
    [state.stepData.package_selection?.selected_packages, state.stepData.venue_selection, state.currentSession?.booking_data?.selected_packages]
  );
  const selectedAddons = useMemo(() =>
    state.stepData.addon_selection?.selected_addons || [],
    [state.stepData.addon_selection?.selected_addons]
  );

  // Get venue_additional_hours from addon_selection or package_selection step data
  const venueAdditionalHours = useMemo(() =>
    state.stepData.addon_selection?.venue_additional_hours ||
    state.stepData.package_selection?.venue_additional_hours ||
    (state.currentSession?.booking_data?.venue_additional_hours as Record<string, number> | undefined) ||
    undefined,
    [state.stepData.addon_selection?.venue_additional_hours, state.stepData.package_selection?.venue_additional_hours, state.currentSession?.booking_data?.venue_additional_hours]
  );

  // Use simplified unified pricing hook
  const {
    pricing,
    loading: calculatingPricing,
    error: pricingError,
    hasItems,
    totalItemCount,
    recalculate
  } = useSimplePricing(
    selectedPackages,
    selectedAddons,
    stepData.applied_discount_code,
    venueAdditionalHours
  );


  // Update parent component with calculated pricing data
  const updatePricingData = useCallback(async () => {
    const newStepData: PricingSummaryStepData = {
      applied_discount_code: stepData.applied_discount_code || undefined,
      special_requests: stepData.special_requests || '',
      terms_accepted: stepData.terms_accepted || false,
      marketing_consent: stepData.marketing_consent || false,
    };

    // Only update if data has actually changed
    if (JSON.stringify(newStepData) === JSON.stringify(stepData)) {
      return;
    }
    
    try {
      // Update step data locally first
      onDataChange(newStepData);
      
      // Only update backend with the discount code
      await actions.updateStepData('pricing_summary', newStepData as Record<string, unknown>);
      
      // Update global total price if different
      const totalString = pricing.total.toFixed(2);
      if (state.totalPrice !== totalString) {
        await actions.updateTotalPrice(totalString);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('Failed to update pricing data:', error);
    }
  // Note: actions methods omitted from deps - actions object is not memoized and would cause loops
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepData, onDataChange, pricing.total, state.totalPrice]);

  // Update pricing data when total changes
  useEffect(() => {
    if (hasItems && !calculatingPricing) {
      const timeoutId = setTimeout(() => {
        updatePricingData();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [pricing.total, hasItems, calculatingPricing, updatePricingData]);

  // Sync pricing breakdown to context for footer display
  useEffect(() => {
    if (hasItems && !calculatingPricing) {
      actions.setPricingBreakdown({
        subtotal: pricing.subtotal.toFixed(2),
        tax: pricing.tax.toFixed(2),
        discount: pricing.discount.toFixed(2),
        formattedSubtotal: pricing.formattedSubtotal,
        formattedTax: pricing.formattedTax,
        formattedDiscount: pricing.formattedDiscount,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pricing, hasItems, calculatingPricing]);

  // Handle discount code application
  const handleApplyDiscount = async () => {
    if (!discountCodeInput.trim()) return;
    
    setValidatingDiscount(true);
    setDiscountError(null);
    
    try {
      // Here you would validate the discount code via API
      // For now, just simulate a successful application
      const newStepData = {
        ...stepData,
        applied_discount_code: discountCodeInput.trim()
      };
      onDataChange(newStepData);
      setDiscountCodeInput('');
      recalculate();
    } catch (_error) {
      setDiscountError('Invalid discount code');
    } finally {
      setValidatingDiscount(false);
    }
  };

  // Handle discount removal
  const handleRemoveDiscount = () => {
    const newStepData = {
      ...stepData,
      applied_discount_code: undefined
    };
    onDataChange(newStepData);
    setDiscountError(null);
    setDiscountCodeInput('');
    recalculate();
  };

  // Handle discount code input changes
  const handleDiscountInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDiscountCodeInput(event.target.value);
    setDiscountError(null);
  };

  // Handle terms acceptance change
  const handleTermsChange = (accepted: boolean) => {
    onDataChange({
      ...stepData,
      terms_accepted: accepted,
    });
  };

  // Handle marketing consent change
  const handleMarketingConsentChange = (consent: boolean) => {
    onDataChange({
      ...stepData,
      marketing_consent: consent,
    });
  };

  // Handle special requests change
  const handleSpecialRequestsChange = (requests: string) => {
    onDataChange({
      ...stepData,
      special_requests: requests,
    });
  };

  // Format date helper - uses Philippines timezone for consistency
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not specified';
    return formatPhilippinesTime(dateString, false, 'MMMM d, yyyy');
  };

  // Show loading state on initial load
  if (calculatingPricing && !hasItems) {
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
  if (pricingError && !hasItems) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6">Pricing Calculation Error</Typography>
        <Typography variant="body2">{pricingError}</Typography>
        <Button variant="outlined" size="small" sx={{ mt: 1 }} onClick={() => window.location.reload()}>
          Refresh Page
        </Button>
      </Alert>
    );
  }

  // Show message if no items selected
  if (!hasItems && !calculatingPricing) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6">No Items Selected</Typography>
        <Typography variant="body2">
          Please go back and select packages or add-ons to see the pricing summary.
        </Typography>
      </Alert>
    );
  }

  // Determine if we're updating prices
  const isUpdatingPrices = calculatingPricing && hasItems;

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Receipt />
        {config?.header_text || 'Pricing Summary'}
        <Fade in={isUpdatingPrices}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">
              Updating prices...
            </Typography>
          </Box>
        </Fade>
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your selected items and total cost. You can apply a discount code if you have one.
      </Typography>

      {/* Show pricing error as warning if we have items */}
      {pricingError && hasItems && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {pricingError}
        </Alert>
      )}

      {/* Selected Packages */}
      {config?.show_package_breakdown !== false && selectedPackages.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selected Packages
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Package</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedPackages.map((pkg) => {
                  // Find matching line item for excess hour details
                  const lineItem = pricing.lineItems?.find(item => item.product_id === pkg.product_id);
                  const basePrice = lineItem?.base_unit_price ? parseFloat(lineItem.base_unit_price) : parseFloat(pkg.price);
                  const unitPrice = basePrice; // Use base price, not total_unit_price
                  const totalPrice = lineItem?.total_unit_price ? parseFloat(lineItem.total_unit_price) : parseFloat(pkg.price);

                  // Check for new venue_details format (preferred) or legacy excess_hours
                  const venueDetails = lineItem?.venue_details;
                  const hasVenueExcess = venueDetails && venueDetails.length > 0 && venueDetails.some(v => v.additional_hours > 0);
                  const hasLegacyExcess = !hasVenueExcess && lineItem?.excess_hours && lineItem.excess_hours > 0;

                  return (
                    <TableRow key={pkg.product_id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {pkg.name}
                          </Typography>
                          {hasVenueExcess && (
                            <Box sx={{ mt: 0.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                Base: {formatAmount(basePrice.toString())}
                              </Typography>
                              {venueDetails?.map(venue => (
                                venue.additional_hours > 0 && (
                                  <Typography key={venue.venue_id} variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    {venue.venue_name}: +{venue.additional_hours}h @ {formatAmount(venue.excess_hour_price)}/h
                                  </Typography>
                                )
                              ))}
                            </Box>
                          )}
                          {hasLegacyExcess && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                              Base: {formatAmount(basePrice.toString())}
                              {lineItem.excess_hours && lineItem.excess_hour_price && (
                                <> + {lineItem.excess_hours}h excess @ {formatAmount(lineItem.excess_hour_price)}/h</>
                              )}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">{pkg.quantity}</TableCell>
                      <TableCell align="right">
                        <Box>
                          <Typography variant="body2">
                            {isUpdatingPrices ? (
                              <Skeleton width={60} animation="wave" />
                            ) : (
                              formatAmount(unitPrice.toString())
                            )}
                          </Typography>
                          {(hasVenueExcess || hasLegacyExcess) && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              (+{formatAmount((totalPrice - basePrice).toString())} excess)
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        {isUpdatingPrices ? (
                          <Skeleton width={80} animation="wave" />
                        ) : (
                          formatAmount((totalPrice * pkg.quantity).toString())
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Selected Add-ons */}
      {config?.show_addon_breakdown !== false && selectedAddons.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Selected Add-ons
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Add-on</TableCell>
                  <TableCell align="center">Quantity</TableCell>
                  <TableCell align="right">Unit Price</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedAddons.map((addon) => {
                  // Find matching line item (for future-proofing if addons support excess hours)
                  const lineItem = pricing.lineItems?.find(item => item.product_id === addon.product_id);
                  const unitPrice = lineItem?.total_unit_price ? parseFloat(lineItem.total_unit_price) : parseFloat(addon.price);

                  return (
                    <TableRow key={addon.product_id}>
                      <TableCell>{addon.name}</TableCell>
                      <TableCell align="center">{addon.quantity}</TableCell>
                      <TableCell align="right">
                        {isUpdatingPrices ? (
                          <Skeleton width={60} animation="wave" />
                        ) : (
                          formatAmount(unitPrice.toString())
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {isUpdatingPrices ? (
                          <Skeleton width={80} animation="wave" />
                        ) : (
                          formatAmount((unitPrice * addon.quantity).toString())
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Discount Code Section */}
      {config?.show_discount_field !== false && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocalOffer />
            Discount Code
          </Typography>
          
          {stepData.applied_discount_code ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={stepData.applied_discount_code}
                icon={<CheckCircle />}
                color="success"
                onDelete={handleRemoveDiscount}
                deleteIcon={<CloseIcon />}
              />
              <Typography variant="body2" color="success.main">
                Discount Applied
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
              <TextField
                size="small"
                placeholder={config?.discount_help_text || "Enter discount code"}
                value={discountCodeInput}
                onChange={handleDiscountInputChange}
                error={!!discountError || !!validationErrors.applied_discount_code}
                helperText={
                  discountError || 
                  validationErrors.applied_discount_code?.join(', ') ||
                  ''
                }
                sx={{ flexGrow: 1 }}
                disabled={validatingDiscount}
              />
              <Button
                variant="outlined"
                onClick={handleApplyDiscount}
                disabled={!discountCodeInput.trim() || validatingDiscount}
                startIcon={validatingDiscount ? <CircularProgress size={16} /> : null}
              >
                Apply
              </Button>
            </Box>
          )}
        </Paper>
      )}

      {/* Pricing Summary */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Order Summary
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {config?.show_subtotal !== false && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Subtotal ({totalItemCount} items)</Typography>
              <Typography>
                {isUpdatingPrices ? (
                  <Skeleton width={80} animation="wave" />
                ) : (
                  pricing.formattedSubtotal
                )}
              </Typography>
            </Box>
          )}
          
          {config?.show_tax_breakdown !== false && pricing.tax > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography>Tax</Typography>
              <Typography>
                {isUpdatingPrices ? (
                  <Skeleton width={80} animation="wave" />
                ) : (
                  pricing.formattedTax
                )}
              </Typography>
            </Box>
          )}
          
          {pricing.discount > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
              <Typography>Discount</Typography>
              <Typography>
                {isUpdatingPrices ? (
                  <Skeleton width={80} animation="wave" />
                ) : (
                  `-${pricing.formattedDiscount}`
                )}
              </Typography>
            </Box>
          )}
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Total</Typography>
            <Typography variant="h6" color="primary">
              {isUpdatingPrices ? (
                <Skeleton width={100} animation="wave" />
              ) : (
                pricing.formattedTotal
              )}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Booking Review Section (consolidated from review step) */}
      {config?.show_booking_review !== false && (
        <>
          {/* Event Details */}
          {config?.show_event_details !== false && (
            <Box sx={{ mt: 3 }}>
              <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Event Details
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Event Type</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {flow?.event_type_name || 'Not specified'}
                  </Typography>
                </Box>

                {allStepData?.date_time?.start_date && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Event Date</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDate(allStepData.date_time.start_date)}
                    </Typography>
                  </Box>
                )}

                {allStepData?.date_time?.end_date && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Event End Date</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDate(allStepData.date_time.end_date)}
                    </Typography>
                  </Box>
                )}
              </Paper>
            </Box>
          )}

          {/* Contact Information */}
          {config?.show_contact_details !== false && (
            <Box sx={{ mt: 3 }}>
              <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Contact Information
                </Typography>

                {allStepData?.contact_info?.full_name && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Name</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {allStepData.contact_info.full_name}
                    </Typography>
                  </Box>
                )}

                {allStepData?.contact_info?.email && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {allStepData.contact_info.email}
                    </Typography>
                  </Box>
                )}

                {allStepData?.contact_info?.phone && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Phone</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {allStepData.contact_info.phone}
                    </Typography>
                  </Box>
                )}

                {allStepData?.contact_info?.company && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">Company</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {allStepData.contact_info.company}
                    </Typography>
                  </Box>
                )}

                {allStepData?.contact_info?.create_account && (
                  <Chip label="Account will be created" color="primary" size="small" />
                )}
              </Paper>
            </Box>
          )}

          {/* Special Requests */}
          {config?.show_special_requests !== false && (
            <Box sx={{ mt: 3 }}>
              <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Special Requests
                </Typography>

                <textarea
                  placeholder="Any additional requests or special requirements for your event..."
                  value={stepData.special_requests || ''}
                  onChange={(e) => handleSpecialRequestsChange(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </Paper>
            </Box>
          )}

          {/* Terms and Conditions */}
          {config?.show_terms_checkbox !== false && (
            <Box sx={{ mt: 3 }}>
              <Paper elevation={0} sx={{ p: 3, border: 1, borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Terms and Conditions
                </Typography>

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={stepData.terms_accepted || false}
                      onChange={(e) => handleTermsChange(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2">
                      {config?.terms_text || (
                        <>
                          I agree to the{' '}
                          <a
                            href={config?.effective_terms_url || config?.terms_url || '/terms'}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'inherit', textDecoration: 'underline' }}
                          >
                            Terms of Service
                          </a>{' '}
                          and{' '}
                          <a
                            href={config?.effective_privacy_url || config?.privacy_url || '/privacy'}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: 'inherit', textDecoration: 'underline' }}
                          >
                            Privacy Policy
                          </a>
                        </>
                      )}
                    </Typography>
                  }
                  sx={{ mb: 2 }}
                />

                {config?.show_marketing_consent !== false && (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={stepData.marketing_consent || false}
                        onChange={(e) => handleMarketingConsentChange(e.target.checked)}
                        color="primary"
                      />
                    }
                    label="I would like to receive marketing updates and special offers (optional)"
                  />
                )}

                {config?.require_terms_acceptance !== false && validationErrors.terms_accepted && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {validationErrors.terms_accepted[0]}
                  </Alert>
                )}
              </Paper>
            </Box>
          )}
        </>
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