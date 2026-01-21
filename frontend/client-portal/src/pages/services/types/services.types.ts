// pages/services/types/services.types.ts

import type { ReactNode } from 'react';

export interface ServiceInfo {
  id: string;
  name: string;
  description: string;
  features: string[];
  icon: ReactNode;
  ctaText?: string;
  ctaLink?: string;
}

export interface ServicesPageProps {
  onNavigateToBooking?: () => void;
}

// Component props types - empty interfaces converted to type aliases to satisfy ESLint
export type ServicesHeroProps = Record<string, never>;

export interface ServiceCardProps {
  service: ServiceInfo;
  index?: number;
}

export interface ServicesCTAProps {
  onNavigateToBooking?: () => void;
}
