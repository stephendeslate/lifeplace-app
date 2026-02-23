import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ThemeProvider as AppThemeProvider } from '../contexts/ThemeContext';
import { LayoutProvider } from '../contexts/LayoutContext';
import { ToastProvider } from '../contexts/ToastContext';
import { modernTheme } from '../design-system/theme/modernTheme';
import { useThemeColors } from './useThemeColors';

// useThemeColors needs both MUI ThemeProvider and the custom AppThemeProvider
function createThemeTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        AppThemeProvider,
        null,
        React.createElement(
          MuiThemeProvider,
          { theme: modernTheme },
          React.createElement(
            LayoutProvider,
            null,
            React.createElement(ToastProvider, null, children),
          ),
        ),
      ),
    );
  };
}

describe('useThemeColors', () => {
  it('returns text color values', () => {
    const { result } = renderHook(() => useThemeColors(), {
      wrapper: createThemeTestWrapper(),
    });

    expect(result.current.text).toBeDefined();
    expect(result.current.text.primary).toBeDefined();
    expect(result.current.text.secondary).toBeDefined();
    expect(result.current.text.disabled).toBeDefined();
    expect(typeof result.current.text.primary).toBe('string');
  });

  it('returns background color values', () => {
    const { result } = renderHook(() => useThemeColors(), {
      wrapper: createThemeTestWrapper(),
    });

    expect(result.current.background).toBeDefined();
    expect(result.current.background.default).toBeDefined();
    expect(result.current.background.paper).toBeDefined();
    expect(typeof result.current.background.default).toBe('string');
  });

  it('returns isDark as a boolean', () => {
    const { result } = renderHook(() => useThemeColors(), {
      wrapper: createThemeTestWrapper(),
    });

    expect(typeof result.current.isDark).toBe('boolean');
  });

  it('returns neutral palette with expected keys', () => {
    const { result } = renderHook(() => useThemeColors(), {
      wrapper: createThemeTestWrapper(),
    });

    const neutral = result.current.neutral;
    expect(neutral).toBeDefined();
    expect(neutral[50]).toBeDefined();
    expect(neutral[100]).toBeDefined();
    expect(neutral[200]).toBeDefined();
    expect(neutral[300]).toBeDefined();
    expect(neutral[400]).toBeDefined();
    expect(neutral[500]).toBeDefined();
    expect(neutral[600]).toBeDefined();
    expect(neutral[700]).toBeDefined();
    expect(neutral[800]).toBeDefined();
    expect(neutral[900]).toBeDefined();
  });

  it('returns semantic colors with expected structure', () => {
    const { result } = renderHook(() => useThemeColors(), {
      wrapper: createThemeTestWrapper(),
    });

    const { semantic } = result.current;
    expect(semantic).toBeDefined();

    for (const key of ['primary', 'success', 'warning', 'error', 'info'] as const) {
      expect(semantic[key]).toBeDefined();
      expect(semantic[key].bg).toBeDefined();
      expect(semantic[key].border).toBeDefined();
      expect(semantic[key].text).toBeDefined();
    }
  });

  it('returns surface and border objects', () => {
    const { result } = renderHook(() => useThemeColors(), {
      wrapper: createThemeTestWrapper(),
    });

    expect(result.current.surface).toBeDefined();
    expect(result.current.surface.base).toBeDefined();
    expect(result.current.surface.level1).toBeDefined();

    expect(result.current.border).toBeDefined();
    expect(result.current.border.subtle).toBeDefined();
    expect(result.current.border.default).toBeDefined();
    expect(result.current.border.prominent).toBeDefined();
  });

  it('returns standard MUI palette colors', () => {
    const { result } = renderHook(() => useThemeColors(), {
      wrapper: createThemeTestWrapper(),
    });

    expect(result.current.primary).toBeDefined();
    expect(result.current.secondary).toBeDefined();
    expect(result.current.success).toBeDefined();
    expect(result.current.warning).toBeDefined();
    expect(result.current.error).toBeDefined();
    expect(result.current.info).toBeDefined();
  });
});
