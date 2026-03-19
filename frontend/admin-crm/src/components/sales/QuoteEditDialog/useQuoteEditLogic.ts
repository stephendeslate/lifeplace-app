import { useState, useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { useUpdateEventQuote } from '@/hooks/useSales';
import { useProducts } from '@/hooks/useProducts';
import { salesApi } from '@/apis/sales.api';
import type { EventQuote } from '@/types/sales.types';
import type { ProductOption } from '@/types/products.types';
import type { LineItemFormData } from './types';

export function useQuoteEditLogic(quote: EventQuote, onSuccess: () => void) {
  const { showToast } = useToast();
  const updateQuoteMutation = useUpdateEventQuote();
  const { products, isLoadingProducts } = useProducts({ is_active: true });

  const [validUntil, setValidUntil] = useState<Date | null>(
    quote.valid_until ? new Date(quote.valid_until) : null,
  );
  const [notes, setNotes] = useState(quote.notes || '');
  const [termsAndConditions, setTermsAndConditions] = useState(quote.terms_and_conditions || '');
  const [clientMessage, setClientMessage] = useState(quote.client_message || '');
  const [lineItems, setLineItems] = useState<LineItemFormData[]>([]);
  const [isCalculating, setIsCalculating] = useState<number | null>(null);
  const [overriddenItems, setOverriddenItems] = useState<Set<number>>(new Set());
  const [hasBookingSession, setHasBookingSession] = useState<boolean | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // Get event_type_id from quote for event-type-specific pricing
  const eventTypeId = quote.event_type || undefined;

  // Initialize line items from quote
  useEffect(() => {
    setOverriddenItems(new Set());

    if (quote.line_items && quote.line_items.length > 0) {
      setLineItems(
        quote.line_items.map((item) => {
          const hasExcessHours = item.excess_hours !== null && item.excess_hours !== undefined;
          return {
            id: item.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: parseFloat(item.unit_price) * item.quantity,
            product_id: item.product || null,
            tax_rate: item.tax_rate,
            base_unit_price: item.base_unit_price,
            excess_hours: item.excess_hours,
            excess_hour_price: item.excess_hour_price,
            excess_cost: item.excess_cost,
            has_excess_hours: hasExcessHours,
          };
        }),
      );
    } else {
      setLineItems([
        {
          description: '',
          quantity: 1,
          unit_price: '0.00',
          total: 0,
          product_id: null,
        },
      ]);
    }
  }, [quote, products]);

  // Check if the event has a booking session
  useEffect(() => {
    const checkBookingSession = async () => {
      if (quote.event) {
        try {
          const result = await salesApi.getBookingSessionLineItems(quote.event);
          setHasBookingSession(result.has_booking_session);
        } catch {
          setHasBookingSession(false);
        }
      }
    };
    checkBookingSession();
  }, [quote.event]);

  const handleImportFromBookingSession = async () => {
    if (!quote.event) return;

    setIsImporting(true);
    try {
      const result = await salesApi.getBookingSessionLineItems(quote.event);
      if (result.has_booking_session && result.line_items && result.line_items.length > 0) {
        const importedItems: LineItemFormData[] = result.line_items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: parseFloat(item.total),
          product_id: item.product_id,
          base_unit_price: item.base_unit_price,
          excess_hours: item.excess_hours,
          excess_hour_price: item.excess_hour_price,
          excess_cost: item.excess_cost,
          has_excess_hours: item.excess_hours !== null && item.excess_hours > 0,
        }));
        setLineItems(importedItems);
        setOverriddenItems(new Set());
        showToast({
          type: 'success',
          title: 'Import Successful',
          message: `Imported ${importedItems.length} line item(s) from booking session`,
        });
      } else {
        showToast({
          type: 'warning',
          title: 'No Items',
          message: 'No line items found in booking session',
        });
      }
    } catch (error) {
      console.error('Failed to import from booking session:', error);
      showToast({
        type: 'error',
        title: 'Import Failed',
        message: 'Failed to import line items from booking session',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: 1,
        unit_price: '0.00',
        total: 0,
        product_id: null,
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleProductSelect = async (index: number, product: ProductOption | null) => {
    const updatedItems = [...lineItems];

    setOverriddenItems((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });

    if (product) {
      setIsCalculating(index);
      try {
        const venues = await salesApi.getProductVenues(product.id, eventTypeId);
        const hasVenues = venues && venues.length > 0;

        const pricing = await salesApi.calculateLineItemPricing({
          product_id: product.id,
          quantity: updatedItems[index].quantity || 1,
          event_type_id: eventTypeId,
        });

        updatedItems[index] = {
          ...updatedItems[index],
          product_id: product.id,
          description: pricing.description,
          unit_price: pricing.unit_price,
          total: parseFloat(pricing.total),
          tax_rate: pricing.tax_rate,
          base_unit_price: pricing.base_unit_price,
          excess_hours: pricing.excess_hours,
          excess_hour_price: pricing.excess_hour_price,
          excess_cost: pricing.excess_cost,
          has_excess_hours: hasVenues,
          is_tax_inclusive: pricing.is_tax_inclusive,
          venue_additional_hours: {},
          venue_hours_breakdown: pricing.venue_hours_breakdown,
          available_venues: venues,
        };
      } catch (error) {
        console.error('Failed to calculate pricing:', error);
        updatedItems[index] = {
          ...updatedItems[index],
          product_id: product.id,
          description: product.name,
          unit_price: product.base_price,
          total: parseFloat(product.base_price) * (updatedItems[index].quantity || 1),
          has_excess_hours: false,
          is_tax_inclusive: product.is_tax_inclusive,
          venue_additional_hours: {},
          available_venues: [],
        };
        showToast({
          type: 'warning',
          title: 'Pricing Warning',
          message: 'Could not calculate excess hours pricing',
        });
      } finally {
        setIsCalculating(null);
      }
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        product_id: null,
        tax_rate: undefined,
        base_unit_price: undefined,
        excess_hours: undefined,
        excess_hour_price: undefined,
        excess_cost: undefined,
        has_excess_hours: undefined,
        venue_additional_hours: undefined,
        venue_hours_breakdown: undefined,
        available_venues: undefined,
      };
    }

    setLineItems(updatedItems);
  };

  const handleQuantityChange = async (index: number, quantity: number) => {
    const updatedItems = [...lineItems];
    const item = updatedItems[index];
    updatedItems[index] = { ...item, quantity };

    setOverriddenItems((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });

    if (item.product_id) {
      setIsCalculating(index);
      try {
        const pricing = await salesApi.calculateLineItemPricing({
          product_id: item.product_id,
          quantity: quantity,
          venue_additional_hours: item.venue_additional_hours,
          event_type_id: eventTypeId,
        });

        updatedItems[index] = {
          ...updatedItems[index],
          description: pricing.description,
          unit_price: pricing.unit_price,
          total: parseFloat(pricing.total),
          tax_rate: pricing.tax_rate,
          base_unit_price: pricing.base_unit_price,
          excess_hours: pricing.excess_hours,
          excess_hour_price: pricing.excess_hour_price,
          excess_cost: pricing.excess_cost,
          is_tax_inclusive: pricing.is_tax_inclusive,
          venue_hours_breakdown: pricing.venue_hours_breakdown,
        };
      } catch (error) {
        console.error('Failed to recalculate pricing:', error);
        updatedItems[index].total = quantity * (parseFloat(item.unit_price) || 0);
      } finally {
        setIsCalculating(null);
      }
    } else {
      updatedItems[index].total = quantity * (parseFloat(item.unit_price) || 0);
    }

    setLineItems(updatedItems);
  };

  const handleVenueHoursChange = async (index: number, venueId: number, hours: number) => {
    const updatedItems = [...lineItems];
    const item = updatedItems[index];

    const newVenueHours = { ...(item.venue_additional_hours || {}) };
    if (hours > 0) {
      newVenueHours[String(venueId)] = hours;
    } else {
      delete newVenueHours[String(venueId)];
    }

    updatedItems[index] = { ...item, venue_additional_hours: newVenueHours };
    setLineItems(updatedItems);

    if (item.product_id) {
      setIsCalculating(index);
      try {
        const pricing = await salesApi.calculateLineItemPricing({
          product_id: item.product_id,
          quantity: item.quantity,
          venue_additional_hours: newVenueHours,
          event_type_id: eventTypeId,
        });

        const finalItems = [...lineItems];
        finalItems[index] = {
          ...finalItems[index],
          venue_additional_hours: newVenueHours,
          description: pricing.description,
          unit_price: pricing.unit_price,
          total: parseFloat(pricing.total),
          base_unit_price: pricing.base_unit_price,
          excess_hours: pricing.excess_hours,
          excess_hour_price: pricing.excess_hour_price,
          excess_cost: pricing.excess_cost,
          venue_hours_breakdown: pricing.venue_hours_breakdown,
        };
        setLineItems(finalItems);
      } catch (error) {
        console.error('Failed to recalculate pricing:', error);
      } finally {
        setIsCalculating(null);
      }
    }
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItemFormData,
    value: string | number,
  ) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'unit_price' && !updatedItems[index].product_id) {
      const unitPrice = parseFloat(value as string) || 0;
      updatedItems[index].total = updatedItems[index].quantity * unitPrice;
    }

    setLineItems(updatedItems);
  };

  const handlePricingOverride = (
    index: number,
    field: 'unit_price' | 'base_unit_price' | 'excess_hours' | 'excess_hour_price' | 'excess_cost',
    value: string | number,
  ) => {
    const updatedItems = [...lineItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };

    if (field === 'unit_price') {
      updatedItems[index].total = updatedItems[index].quantity * (parseFloat(value as string) || 0);
    } else if (field === 'base_unit_price' || field === 'excess_cost') {
      const base = parseFloat(updatedItems[index].base_unit_price || '0');
      const excess = parseFloat(updatedItems[index].excess_cost || '0');
      updatedItems[index].unit_price = (base + excess).toFixed(2);
      updatedItems[index].total = updatedItems[index].quantity * (base + excess);
    } else if (field === 'excess_hours' || field === 'excess_hour_price') {
      const hours = parseFloat(String(updatedItems[index].excess_hours || 0));
      const rate = parseFloat(updatedItems[index].excess_hour_price || '0');
      updatedItems[index].excess_cost = (hours * rate).toFixed(2);
      const base = parseFloat(updatedItems[index].base_unit_price || '0');
      updatedItems[index].unit_price = (base + hours * rate).toFixed(2);
      updatedItems[index].total = updatedItems[index].quantity * (base + hours * rate);
    }

    setOverriddenItems((prev) => new Set(prev).add(index));
    setLineItems(updatedItems);
  };

  const handleResetToCalculated = async (index: number) => {
    const item = lineItems[index];
    if (!item.product_id) return;

    setIsCalculating(index);
    try {
      const pricing = await salesApi.calculateLineItemPricing({
        product_id: item.product_id,
        quantity: item.quantity,
        venue_additional_hours: item.venue_additional_hours,
        event_type_id: eventTypeId,
      });

      const updatedItems = [...lineItems];
      updatedItems[index] = {
        ...updatedItems[index],
        description: pricing.description,
        unit_price: pricing.unit_price,
        total: parseFloat(pricing.total),
        tax_rate: pricing.tax_rate,
        base_unit_price: pricing.base_unit_price,
        excess_hours: pricing.excess_hours,
        excess_hour_price: pricing.excess_hour_price,
        excess_cost: pricing.excess_cost,
        is_tax_inclusive: pricing.is_tax_inclusive,
        venue_hours_breakdown: pricing.venue_hours_breakdown,
      };
      setLineItems(updatedItems);

      setOverriddenItems((prev) => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
    } catch (error) {
      console.error('Failed to reset pricing:', error);
      showToast({
        type: 'error',
        title: 'Reset Failed',
        message: 'Could not reset to calculated values',
      });
    } finally {
      setIsCalculating(null);
    }
  };

  const calculateSubtotal = () => {
    return lineItems.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTaxAmount = () => {
    return lineItems.reduce((sum, item) => {
      if (item.is_tax_inclusive) return sum;
      const taxRate = parseFloat(item.tax_rate || '0') / 100;
      return sum + item.total * taxRate;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTaxAmount();
  };

  const getSelectedProduct = (productId: number | null | undefined): ProductOption | null => {
    if (!productId) return null;
    return products.find((p) => p.id === productId) || null;
  };

  const handleSubmit = async () => {
    const hasInvalidLineItem = lineItems.some(
      (item) => !item.description.trim() || item.quantity <= 0,
    );

    if (hasInvalidLineItem) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all line item fields correctly',
      });
      return;
    }

    const subtotal = calculateSubtotal();
    if (subtotal < 0) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Quote total cannot be negative',
      });
      return;
    }

    try {
      const updateData = {
        ...(validUntil && { valid_until: validUntil.toISOString().split('T')[0] }),
        notes,
        terms_and_conditions: termsAndConditions,
        client_message: clientMessage,
        line_items: lineItems.map((item, index) => ({
          ...(item.id && { id: item.id }),
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          ...(item.product_id && { product_id: item.product_id }),
          ...(item.venue_additional_hours &&
            Object.keys(item.venue_additional_hours).length > 0 && {
              venue_additional_hours: item.venue_additional_hours,
            }),
          ...(overriddenItems.has(index) && {
            skip_recalculation: true,
            base_unit_price: item.base_unit_price,
            excess_hours: item.excess_hours,
            excess_hour_price: item.excess_hour_price,
            excess_cost: item.excess_cost,
          }),
        })),
      };

      await updateQuoteMutation.mutateAsync({
        id: quote.id,
        data: updateData,
      });

      showToast({ type: 'success', title: 'Quote Updated', message: 'Quote updated successfully' });
      onSuccess();
    } catch (error) {
      showToast({ type: 'error', title: 'Update Failed', message: 'Failed to update quote' });
      console.error('Error updating quote:', error);
    }
  };

  return {
    // State
    validUntil,
    setValidUntil,
    notes,
    setNotes,
    termsAndConditions,
    setTermsAndConditions,
    clientMessage,
    setClientMessage,
    lineItems,
    isCalculating,
    overriddenItems,
    hasBookingSession,
    isImporting,
    products,
    isLoadingProducts,
    updateQuoteMutation,
    // Handlers
    handleImportFromBookingSession,
    handleAddLineItem,
    handleRemoveLineItem,
    handleProductSelect,
    handleQuantityChange,
    handleVenueHoursChange,
    handleLineItemChange,
    handlePricingOverride,
    handleResetToCalculated,
    handleSubmit,
    // Computed
    calculateSubtotal,
    calculateTaxAmount,
    calculateTotal,
    getSelectedProduct,
  };
}
