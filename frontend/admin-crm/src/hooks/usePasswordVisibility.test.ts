import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePasswordVisibility, useSinglePasswordVisibility } from './usePasswordVisibility';

describe('usePasswordVisibility', () => {
  it('initializes with both fields hidden', () => {
    const { result } = renderHook(() => usePasswordVisibility());

    expect(result.current.showPassword).toBe(false);
    expect(result.current.showConfirmPassword).toBe(false);
  });

  it('toggles password visibility', () => {
    const { result } = renderHook(() => usePasswordVisibility());

    act(() => {
      result.current.togglePassword();
    });

    expect(result.current.showPassword).toBe(true);
    expect(result.current.showConfirmPassword).toBe(false);

    act(() => {
      result.current.togglePassword();
    });

    expect(result.current.showPassword).toBe(false);
  });

  it('toggles confirm password visibility independently', () => {
    const { result } = renderHook(() => usePasswordVisibility());

    act(() => {
      result.current.toggleConfirmPassword();
    });

    expect(result.current.showConfirmPassword).toBe(true);
    expect(result.current.showPassword).toBe(false);

    act(() => {
      result.current.toggleConfirmPassword();
    });

    expect(result.current.showConfirmPassword).toBe(false);
  });

  it('resets both fields to hidden after toggling', () => {
    const { result } = renderHook(() => usePasswordVisibility());

    act(() => {
      result.current.togglePassword();
      result.current.toggleConfirmPassword();
    });

    expect(result.current.showPassword).toBe(true);
    expect(result.current.showConfirmPassword).toBe(true);

    act(() => {
      result.current.resetVisibility();
    });

    expect(result.current.showPassword).toBe(false);
    expect(result.current.showConfirmPassword).toBe(false);
  });
});

describe('useSinglePasswordVisibility', () => {
  it('initializes with password hidden', () => {
    const { result } = renderHook(() => useSinglePasswordVisibility());

    expect(result.current.showPassword).toBe(false);
  });

  it('toggles password visibility and resets', () => {
    const { result } = renderHook(() => useSinglePasswordVisibility());

    act(() => {
      result.current.togglePassword();
    });

    expect(result.current.showPassword).toBe(true);

    act(() => {
      result.current.togglePassword();
    });

    expect(result.current.showPassword).toBe(false);

    // Toggle on then reset
    act(() => {
      result.current.togglePassword();
    });

    expect(result.current.showPassword).toBe(true);

    act(() => {
      result.current.resetVisibility();
    });

    expect(result.current.showPassword).toBe(false);
  });
});
