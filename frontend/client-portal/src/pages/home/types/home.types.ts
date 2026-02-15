// pages/home/types/home.types.ts

export interface HomeProps {
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToBooking?: () => void;
}

export interface HeroSectionProps {
  onNavigateToLogin?: () => void;
  onNavigateToRegister?: () => void;
  onNavigateToBooking?: () => void;
}

export interface ContactSectionProps {
  onNavigateToBooking?: () => void;
  onNavigateToRegister?: () => void;
}

export interface AvailabilitySectionProps {
  onNavigateToBooking?: () => void;
}

export interface ServiceInfo {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}
