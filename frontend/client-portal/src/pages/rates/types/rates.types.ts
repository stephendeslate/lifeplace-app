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
}

export type RatesNoteProps = Record<string, never>;
