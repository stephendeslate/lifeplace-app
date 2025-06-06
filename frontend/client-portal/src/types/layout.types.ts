// frontend/client-portal/src/types/layout.types.ts

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  external?: boolean;
}

export interface PublicLayoutContextType {
  // Navigation state
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;
  
  // Scroll state
  isScrolled: boolean;
  
  // Layout constants
  headerHeight: number;
}

export interface ClientDashboardItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType;
  badge?: string | number;
  disabled?: boolean;
}

export interface ClientLayoutContextType {
  // Navigation state
  activeItem: string | null;
  setActiveItem: (itemId: string) => void;
  
  // Layout constants
  headerHeight: number;
}