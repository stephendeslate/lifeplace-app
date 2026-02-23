// frontend/admin-crm/src/contexts/ThemeContext.test.tsx

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

// Test wrapper
const createWrapper = () => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );
  return Wrapper;
};

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('ThemeProvider', () => {
    it('provides theme context to children', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current).toBeDefined();
      expect(result.current.mode).toBeDefined();
      expect(result.current.effectiveMode).toBeDefined();
      expect(result.current.theme).toBeDefined();
    });

    it('throws error when useTheme is used outside provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useTheme());
      }).toThrow('useTheme must be used within a ThemeProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('Theme Mode', () => {
    it('defaults to light mode', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mode).toBe('light');
    });

    it('reads mode from localStorage', () => {
      localStorage.setItem('lifeplace-theme-mode', 'dark');

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mode).toBe('dark');
    });

    it('sets mode to light', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('light');
      });

      expect(result.current.mode).toBe('light');
      expect(result.current.effectiveMode).toBe('light');
    });

    it('sets mode to dark', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('dark');
      });

      expect(result.current.mode).toBe('dark');
      expect(result.current.effectiveMode).toBe('dark');
    });

    it('sets mode to system', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // First set to a specific mode
      act(() => {
        result.current.setMode('dark');
      });

      // Then set back to system
      act(() => {
        result.current.setMode('system');
      });

      expect(result.current.mode).toBe('system');
    });

    it('persists mode to localStorage', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('dark');
      });

      expect(localStorage.getItem('lifeplace-theme-mode')).toBe('dark');
    });
  });

  describe('Toggle Mode', () => {
    it('cycles through light -> dark -> system', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // Start at system, set to light first
      act(() => {
        result.current.setMode('light');
      });
      expect(result.current.mode).toBe('light');

      // Toggle: light -> dark
      act(() => {
        result.current.toggleMode();
      });
      expect(result.current.mode).toBe('dark');

      // Toggle: dark -> system
      act(() => {
        result.current.toggleMode();
      });
      expect(result.current.mode).toBe('system');

      // Toggle: system -> light
      act(() => {
        result.current.toggleMode();
      });
      expect(result.current.mode).toBe('light');
    });
  });

  describe('Effective Mode', () => {
    it('returns light or dark for effectiveMode', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      // effectiveMode should always be light or dark, never system
      expect(['light', 'dark']).toContain(result.current.effectiveMode);
    });

    it('returns set mode when not system', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('light');
      });
      expect(result.current.effectiveMode).toBe('light');

      act(() => {
        result.current.setMode('dark');
      });
      expect(result.current.effectiveMode).toBe('dark');
    });
  });

  describe('Theme Object', () => {
    it('provides a valid MUI theme object', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.theme).toBeDefined();
      expect(result.current.theme.palette).toBeDefined();
      expect(result.current.theme.palette.mode).toBeDefined();
    });

    it('updates theme when mode changes', () => {
      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.setMode('light');
      });
      expect(result.current.theme.palette.mode).toBe('light');

      act(() => {
        result.current.setMode('dark');
      });
      expect(result.current.theme.palette.mode).toBe('dark');
    });
  });

  describe('Invalid localStorage values', () => {
    it('falls back to light for invalid stored value', () => {
      localStorage.setItem('lifeplace-theme-mode', 'invalid-mode');

      const { result } = renderHook(() => useTheme(), {
        wrapper: createWrapper(),
      });

      expect(result.current.mode).toBe('light');
    });
  });
});
