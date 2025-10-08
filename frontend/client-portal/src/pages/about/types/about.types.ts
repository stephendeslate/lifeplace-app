// pages/about/types/about.types.ts

export interface FacilityInfo {
  id: string;
  name: string;
  description: string;
  capacity: string;
  icon: React.ReactNode;
}

export interface ServiceHighlight {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

export interface ContactInfo {
  type: 'phone' | 'email' | 'location';
  label: string;
  value: string;
  icon: React.ReactNode;
}

export interface SocialLink {
  platform: string;
  url: string;
  icon: React.ReactNode;
}

export interface AboutPageProps {
  onNavigateToBooking?: () => void;
}
