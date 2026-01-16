/**
 * Auth Store Tests
 *
 * Tests for the Zustand auth store that manages authentication state
 * with secure token storage via expo-secure-store.
 */

import {
  useAuthStore,
  selectUser,
  selectIsAuthenticated,
  selectIsLoading,
  selectIsHydrated,
  selectAccessToken,
} from '../authStore';
import type { User } from '@/types/auth.types';

// =============================================================================
// TEST SETUP
// =============================================================================

// Store initial state for reset between tests
const initialState = useAuthStore.getState();

// Mock user data
const mockUser: User = {
  id: 1,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  role: 'CLIENT',
  is_active: true,
  date_joined: '2024-01-01T00:00:00Z',
  profile: {
    phone: '+639123456789',
    company: 'Test Company',
    display_timezone: 'Asia/Manila',
    timezone_display_mode: 'business_only',
  },
};

const mockTokens = {
  access: 'mock-access-token-12345',
  refresh: 'mock-refresh-token-67890',
};

// Reset store state before each test
beforeEach(() => {
  useAuthStore.setState({
    ...initialState,
    isHydrated: true, // Set to true to avoid hydration-related issues in tests
    isLoading: false,
  });
});

// =============================================================================
// TESTS
// =============================================================================

describe('authStore', () => {
  // ===========================================================================
  // INITIAL STATE
  // ===========================================================================

  describe('initial state', () => {
    it('has null user by default', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
    });

    it('has null tokens by default', () => {
      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('is not authenticated by default', () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ===========================================================================
  // setUser ACTION
  // ===========================================================================

  describe('setUser', () => {
    it('sets user and marks as authenticated', () => {
      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('sets isAuthenticated to false when user is null', () => {
      // First set a user
      useAuthStore.getState().setUser(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);

      // Then set user to null
      useAuthStore.getState().setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('updates user data correctly', () => {
      const updatedUser: User = {
        ...mockUser,
        first_name: 'Updated',
        email: 'updated@example.com',
      };

      useAuthStore.getState().setUser(updatedUser);

      const state = useAuthStore.getState();
      expect(state.user?.first_name).toBe('Updated');
      expect(state.user?.email).toBe('updated@example.com');
    });
  });

  // ===========================================================================
  // setTokens ACTION
  // ===========================================================================

  describe('setTokens', () => {
    it('stores both access and refresh tokens', () => {
      useAuthStore.getState().setTokens(mockTokens.access, mockTokens.refresh);

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe(mockTokens.access);
      expect(state.refreshToken).toBe(mockTokens.refresh);
    });

    it('marks as authenticated when tokens are set', () => {
      useAuthStore.getState().setTokens(mockTokens.access, mockTokens.refresh);

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('updates tokens correctly when called again', () => {
      useAuthStore.getState().setTokens('old-access', 'old-refresh');
      useAuthStore.getState().setTokens('new-access', 'new-refresh');

      const state = useAuthStore.getState();
      expect(state.accessToken).toBe('new-access');
      expect(state.refreshToken).toBe('new-refresh');
    });
  });

  // ===========================================================================
  // clearAuth ACTION
  // ===========================================================================

  describe('clearAuth', () => {
    beforeEach(() => {
      // Set up authenticated state
      useAuthStore.setState({
        user: mockUser,
        accessToken: mockTokens.access,
        refreshToken: mockTokens.refresh,
        isAuthenticated: true,
      });
    });

    it('clears user', () => {
      useAuthStore.getState().clearAuth();
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('clears tokens', () => {
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('sets isAuthenticated to false', () => {
      useAuthStore.getState().clearAuth();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('clears all auth-related state at once', () => {
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ===========================================================================
  // setLoading ACTION
  // ===========================================================================

  describe('setLoading', () => {
    it('sets isLoading to true', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);
    });

    it('sets isLoading to false', () => {
      useAuthStore.setState({ isLoading: true });
      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  // ===========================================================================
  // setHydrated ACTION
  // ===========================================================================

  describe('setHydrated', () => {
    it('sets isHydrated to true', () => {
      useAuthStore.setState({ isHydrated: false, isLoading: true });
      useAuthStore.getState().setHydrated(true);

      expect(useAuthStore.getState().isHydrated).toBe(true);
    });

    it('sets isLoading to false when hydrated', () => {
      useAuthStore.setState({ isHydrated: false, isLoading: true });
      useAuthStore.getState().setHydrated(true);

      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets isLoading to true when not hydrated', () => {
      useAuthStore.setState({ isHydrated: true, isLoading: false });
      useAuthStore.getState().setHydrated(false);

      const state = useAuthStore.getState();
      expect(state.isHydrated).toBe(false);
      expect(state.isLoading).toBe(true);
    });
  });

  // ===========================================================================
  // SELECTORS
  // ===========================================================================

  describe('selectors', () => {
    beforeEach(() => {
      useAuthStore.setState({
        user: mockUser,
        accessToken: mockTokens.access,
        refreshToken: mockTokens.refresh,
        isAuthenticated: true,
        isLoading: false,
        isHydrated: true,
      });
    });

    it('selectUser returns only user', () => {
      const state = useAuthStore.getState();
      const user = selectUser(state);
      expect(user).toEqual(mockUser);
    });

    it('selectIsAuthenticated returns auth state', () => {
      const state = useAuthStore.getState();
      expect(selectIsAuthenticated(state)).toBe(true);
    });

    it('selectIsLoading returns loading state', () => {
      const state = useAuthStore.getState();
      expect(selectIsLoading(state)).toBe(false);
    });

    it('selectIsHydrated returns hydration state', () => {
      const state = useAuthStore.getState();
      expect(selectIsHydrated(state)).toBe(true);
    });

    it('selectAccessToken returns access token', () => {
      const state = useAuthStore.getState();
      expect(selectAccessToken(state)).toBe(mockTokens.access);
    });

    it('selectors work correctly when user is null', () => {
      useAuthStore.setState({
        user: null,
        accessToken: null,
        isAuthenticated: false,
      });

      const state = useAuthStore.getState();
      expect(selectUser(state)).toBeNull();
      expect(selectIsAuthenticated(state)).toBe(false);
      expect(selectAccessToken(state)).toBeNull();
    });
  });

  // ===========================================================================
  // INTEGRATION SCENARIOS
  // ===========================================================================

  describe('integration scenarios', () => {
    it('full login flow works correctly', () => {
      // Simulate login flow
      useAuthStore.getState().setLoading(true);
      useAuthStore.getState().setTokens(mockTokens.access, mockTokens.refresh);
      useAuthStore.getState().setUser(mockUser);
      useAuthStore.getState().setLoading(false);

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe(mockTokens.access);
      expect(state.isLoading).toBe(false);
    });

    it('full logout flow works correctly', () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: mockUser,
        accessToken: mockTokens.access,
        refreshToken: mockTokens.refresh,
        isAuthenticated: true,
      });

      // Simulate logout
      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
    });

    it('token refresh flow preserves user', () => {
      // Set up initial state
      useAuthStore.setState({
        user: mockUser,
        accessToken: 'old-access-token',
        refreshToken: mockTokens.refresh,
        isAuthenticated: true,
      });

      // Simulate token refresh (only update access token)
      useAuthStore.getState().setTokens('new-access-token', mockTokens.refresh);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.accessToken).toBe('new-access-token');
      expect(state.isAuthenticated).toBe(true);
    });
  });
});
