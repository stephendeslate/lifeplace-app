import type { EventQuote } from '@/types/sales.types';

export interface QuoteEditDialogProps {
  open: boolean;
  onClose: () => void;
  quote: EventQuote;
  onSuccess: () => void;
}

export interface VenueInfo {
  venue_id: number;
  venue_name: string;
  included_hours: number;
  excess_hour_price: number;
}

export interface VenueHoursBreakdown {
  venue_id: number;
  venue_name: string;
  included_hours: number;
  additional_hours: number;
  excess_hour_price: number;
  venue_cost: number;
}

export interface LineItemFormData {
  id?: number;
  description: string;
  quantity: number;
  unit_price: string;
  total: number;
  product_id?: number | null;
  tax_rate?: string;
  // Excess hours breakdown (editable for override)
  base_unit_price?: string;
  excess_hours?: number | null;
  excess_hour_price?: string | null;
  excess_cost?: string;
  has_excess_hours?: boolean;
  is_tax_inclusive?: boolean;
  // Venue-based hours
  venue_additional_hours?: Record<string, number>;
  venue_hours_breakdown?: VenueHoursBreakdown[] | null;
  available_venues?: VenueInfo[];
}
