// frontend/admin-crm/src/types/layout.types.ts

import type { SvgIconComponent } from '@mui/icons-material';

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon: SvgIconComponent;
  badge?: string | number;
  disabled?: boolean;
  roles?: ('ADMIN' | 'CLIENT')[];
  children?: NavigationItem[];
}

export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationItem[];
  roles?: ('ADMIN' | 'CLIENT')[];
  collapsed?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface LayoutContextType {
  // Sidebar state
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  setSidebarOpen: (open: boolean) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;

  // Navigation state
  navigationGroups: NavigationGroup[];
  activeItem: string | null;
  setActiveItem: (itemId: string) => void;

  // Breadcrumb state
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;

  // Layout preferences
  drawerWidth: number;
  collapsedDrawerWidth: number;
  headerHeight: number;
}

export interface LayoutPreferences {
  sidebarCollapsed: boolean;
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
}
