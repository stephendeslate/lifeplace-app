// pages/partner/types/partner.types.ts

import type { ReactNode } from 'react';

export interface PartnerBenefit {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
}

export interface PartnerCategory {
  id: string;
  name: string;
  description: string;
  benefits: string[];
  icon: ReactNode;
}

export interface PartnerPageProps {
  onNavigateToBooking?: () => void;
}

// Component props types - empty interfaces converted to type aliases to satisfy ESLint
export type PartnerHeroProps = Record<string, never>;
export type PartnerBenefitsProps = Record<string, never>;
export type PartnerCategoriesProps = Record<string, never>;
export type PartnerContactProps = Record<string, never>;
