/**
 * Shared Utility Hooks
 *
 * React hooks for common functionality
 * across both admin-crm and client-portal applications
 */

// Intersection Observer hook for viewport detection
export * from './useIntersectionObserver';

// Memory management hook for performance optimization
export * from './useMemoryManagement';

// Messaging hooks
export * from './useMessagingQueries';
export * from './useMessagingMutations';
export * from './useMessagingWebSocket';