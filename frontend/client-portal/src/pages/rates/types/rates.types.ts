// pages/rates/types/rates.types.ts

export interface PriceTier {
  duration: string;
  price: number;
  isPopular?: boolean;
}

export interface PackageInfo {
  id: string;
  name: string;
  description: string;
  tiers: PriceTier[];
  includes: string[];
  notes?: string[];
  minimumParticipants?: number;
  badge?: string;
}

export interface WeddingVenue {
  id: string;
  name: string;
  price: number;
  duration: string;
  capacity: string;
  includes: string[];
  excessHourRate?: number;
}

export interface WeddingCombo {
  id: string;
  name: string;
  price: number;
  duration: string;
  includes: string[];
}

export interface AllInWeddingPackage {
  id: string;
  name: string;
  startingPrice: number;
  guestCount: number;
  venues: string;
  includes: string[];
}

export interface RatesPageProps {
  onNavigateToBooking?: () => void;
}

// Component props types - empty interfaces converted to type aliases to satisfy ESLint
export type RatesHeroProps = Record<string, never>;

export interface PackageCardProps {
  package: PackageInfo;
  index?: number;
}

export interface PackageTierProps {
  tier: PriceTier;
}

export interface WeddingPackagesProps {
  onNavigateToBooking?: () => void;
  weddingVenues?: RatesWeddingVenue[];
  weddingCombos?: RatesWeddingComboApi[];
  allInWeddings?: RatesAllInWeddingApi[];
}

export type RatesNoteProps = Record<string, never>;

// API response types from /api/products/products/rates-page/
export interface RatesPageData {
  event_packages: RatesEventPackage[];
  wedding_venues: RatesWeddingVenue[];
  wedding_combos: RatesWeddingComboApi[];
  all_in_weddings: RatesAllInWeddingApi[];
}

export interface RatesEventPackage {
  id: number;
  name: string;
  description: string;
  slug: string;
  includes: string[];
  notes: string[];
  badge: string;
  minimum_participants: number | null;
  tiers: RatesTier[];
  sort_order: number;
}

export interface RatesTier {
  id: number;
  label: string;
  price: string;
  pricing_unit: string;
  is_highlighted: boolean;
  event_days: number | null;
  sort_order: number;
}

export interface RatesWeddingVenue {
  id: number;
  name: string;
  price: string;
  duration: string | null;
  capacity: string;
  includes: string[];
  excess_hour_rate: string | null;
}

export interface RatesWeddingComboApi {
  id: number;
  name: string;
  price: string;
  duration: string | null;
  includes: string[];
}

export interface RatesAllInWeddingApi {
  id: number;
  name: string;
  starting_price: string;
  guest_count: number | null;
  venues: string;
  includes: string[];
}
