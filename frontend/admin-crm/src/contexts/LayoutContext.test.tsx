// frontend/admin-crm/src/contexts/LayoutContext.test.tsx

import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { LayoutProvider, useLayout } from './LayoutContext'
import { storage } from '../utils/storage'

// Create a test theme
const testTheme = createTheme()

// Test wrapper that provides necessary context
const createWrapper = () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider theme={testTheme}>
      <LayoutProvider>{children}</LayoutProvider>
    </ThemeProvider>
  )
  return Wrapper
}

describe('LayoutContext', () => {
  beforeEach(() => {
    storage.clearAll()
    vi.clearAllMocks()
  })

  describe('LayoutProvider', () => {
    it('provides layout context to children', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      expect(result.current).toBeDefined()
      expect(result.current.drawerWidth).toBe(280)
      expect(result.current.collapsedDrawerWidth).toBe(72)
      expect(result.current.headerHeight).toBe(64)
    })

    it('throws error when useLayout is used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useLayout())
      }).toThrow('useLayout must be used within a LayoutProvider')

      consoleSpy.mockRestore()
    })
  })

  describe('Sidebar State', () => {
    it('provides sidebar open state', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      // Default state based on matchMedia mock (not mobile)
      expect(typeof result.current.sidebarOpen).toBe('boolean')
    })

    it('toggles sidebar open state', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      const initialState = result.current.sidebarOpen

      act(() => {
        result.current.toggleSidebar()
      })

      expect(result.current.sidebarOpen).toBe(!initialState)
    })

    it('sets sidebar open state directly', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setSidebarOpen(false)
      })
      expect(result.current.sidebarOpen).toBe(false)

      act(() => {
        result.current.setSidebarOpen(true)
      })
      expect(result.current.sidebarOpen).toBe(true)
    })
  })

  describe('Sidebar Collapsed State', () => {
    it('provides sidebar collapsed state', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      expect(typeof result.current.sidebarCollapsed).toBe('boolean')
    })

    it('toggles sidebar collapsed state', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      const initialCollapsed = result.current.sidebarCollapsed

      act(() => {
        result.current.toggleSidebarCollapse()
      })

      expect(result.current.sidebarCollapsed).toBe(!initialCollapsed)
    })

    it('sets sidebar collapsed state directly', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setSidebarCollapsed(true)
      })
      expect(result.current.sidebarCollapsed).toBe(true)

      act(() => {
        result.current.setSidebarCollapsed(false)
      })
      expect(result.current.sidebarCollapsed).toBe(false)
    })
  })

  describe('Navigation State', () => {
    it('provides navigation groups', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      expect(result.current.navigationGroups).toBeDefined()
      expect(Array.isArray(result.current.navigationGroups)).toBe(true)
    })

    it('provides active item state', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      expect(result.current.activeItem).toBeNull()
    })

    it('sets active item', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      act(() => {
        result.current.setActiveItem('dashboard')
      })

      expect(result.current.activeItem).toBe('dashboard')
    })
  })

  describe('Breadcrumb State', () => {
    it('provides breadcrumbs state', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      expect(result.current.breadcrumbs).toBeDefined()
      expect(Array.isArray(result.current.breadcrumbs)).toBe(true)
      expect(result.current.breadcrumbs.length).toBe(0)
    })

    it('sets breadcrumbs', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      const newBreadcrumbs = [
        { label: 'Home', path: '/' },
        { label: 'Clients', path: '/clients' },
        { label: 'John Doe' },
      ]

      act(() => {
        result.current.setBreadcrumbs(newBreadcrumbs)
      })

      expect(result.current.breadcrumbs).toEqual(newBreadcrumbs)
      expect(result.current.breadcrumbs.length).toBe(3)
    })
  })

  describe('Layout Constants', () => {
    it('provides correct drawer width', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      expect(result.current.drawerWidth).toBe(280)
    })

    it('provides correct collapsed drawer width', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      expect(result.current.collapsedDrawerWidth).toBe(72)
    })

    it('provides correct header height', () => {
      const { result } = renderHook(() => useLayout(), {
        wrapper: createWrapper(),
      })

      expect(result.current.headerHeight).toBe(64)
    })
  })
})
