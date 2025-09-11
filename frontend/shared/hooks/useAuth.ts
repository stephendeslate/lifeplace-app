/**
 * Shared useAuth Hook
 * 
 * This is a lightweight interface that allows the shared MessagingProvider
 * to work with both admin-crm and client-portal auth systems.
 * 
 * Each application should implement their own useAuth hook and this will
 * provide a fallback interface for shared components.
 */

interface SharedUser {
  id: string | number;
  email: string;
  first_name?: string;
  last_name?: string;
  role?: string;
}

interface SharedAuthReturn {
  user: SharedUser | null;
  isAuthenticated: boolean;
  isLoading?: boolean;
}

/**
 * Generic useAuth hook for shared components
 * 
 * This hook provides a minimal auth interface that can be used by shared components.
 * In practice, each app will override this with their own auth implementation.
 */
export const useAuth = (): SharedAuthReturn => {
  // This is a fallback implementation
  // In practice, each app should provide their own useAuth hook
  
  // Try to get basic auth info from localStorage as a fallback
  try {
    const tokens = localStorage.getItem('tokens');
    const userData = localStorage.getItem('user');
    
    if (tokens && userData) {
      const user = JSON.parse(userData);
      return {
        user: {
          id: user.id || user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role || user.user_type
        },
        isAuthenticated: true,
        isLoading: false
      };
    }
  } catch (error) {
    console.warn('Failed to get auth info from localStorage:', error);
  }
  
  return {
    user: null,
    isAuthenticated: false,
    isLoading: false
  };
};

export type { SharedUser, SharedAuthReturn };