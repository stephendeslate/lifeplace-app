// pages/contact/types/contact.types.ts

export type InquiryType =
  | 'GENERAL_INQUIRY'
  | 'EVENT_QUESTION'
  | 'PARTNERSHIP_INTEREST'
  | 'PRICING_QUESTION'
  | 'OTHER';

export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  inquiryType: InquiryType;
  message: string;
}

export interface ContactInfo {
  phone: string[];
  email: string;
  address: string;
}

export interface SocialLink {
  id: string;
  name: string;
  url: string;
  icon: string;
}

export interface ContactPageProps {
  onNavigateToBooking?: () => void;
}

// Component props types - empty interfaces converted to type aliases to satisfy ESLint
export type ContactHeroProps = Record<string, never>;
export type ContactInfoProps = Record<string, never>;
export type ContactSocialProps = Record<string, never>;
export type ContactFormProps = Record<string, never>;
export type ContactMapProps = Record<string, never>;
