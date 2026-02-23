// frontend/admin-crm/src/contexts/LayoutContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { storage } from '../utils/storage';
import { navigationConfig } from '../config/navigation';
import type { LayoutContextType, BreadcrumbItem } from '../types/layout.types';

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
  children: React.ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));

  // Layout constants
  const drawerWidth = 280;
  const collapsedDrawerWidth = 72;
  const headerHeight = 64;

  // State
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Don't collapse on mobile/tablet by default
    if (isMobile || isTablet) return false;
    return storage.getSidebarCollapsed();
  });
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  // Persist sidebar collapsed state
  useEffect(() => {
    if (!isMobile && !isTablet) {
      storage.setSidebarCollapsed(sidebarCollapsed);
    }
  }, [sidebarCollapsed, isMobile, isTablet]);

  // Handle responsive behavior
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
      setSidebarCollapsed(false);
    } else if (isTablet) {
      setSidebarOpen(true);
      setSidebarCollapsed(true);
    } else {
      setSidebarOpen(true);
      // Keep user's preference on desktop
    }
  }, [isMobile, isTablet]);

  // Toggle functions
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const toggleSidebarCollapse = useCallback(() => {
    if (!isMobile) {
      setSidebarCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  // Handle sidebar collapsed state changes
  const handleSetSidebarCollapsed = useCallback(
    (collapsed: boolean) => {
      if (!isMobile) {
        setSidebarCollapsed(collapsed);
      }
    },
    [isMobile],
  );

  const value: LayoutContextType = {
    // Sidebar state
    sidebarOpen,
    sidebarCollapsed,
    setSidebarOpen,
    setSidebarCollapsed: handleSetSidebarCollapsed,
    toggleSidebar,
    toggleSidebarCollapse,

    // Navigation state
    navigationGroups: navigationConfig,
    activeItem,
    setActiveItem,

    // Breadcrumb state
    breadcrumbs,
    setBreadcrumbs,

    // Layout preferences
    drawerWidth,
    collapsedDrawerWidth,
    headerHeight,
  };

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
};

export const useLayout = (): LayoutContextType => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
