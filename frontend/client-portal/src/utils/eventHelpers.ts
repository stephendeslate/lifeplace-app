// frontend/client-portal/src/utils/eventHelpers.ts

import type { EventStatus, PaymentStatus } from '../types/events.types';

export const getStatusColor = (status: EventStatus | PaymentStatus): string => {
  const colors: Record<string, string> = {
    // Event statuses
    DRAFT: 'default',
    CONFIRMED: 'info',
    IN_PROGRESS: 'warning', 
    COMPLETED: 'success',
    CANCELLED: 'error',
    
    // Payment statuses
    PENDING: 'warning',
    PARTIAL: 'info',
    PAID: 'success',
    OVERDUE: 'error',
  };
  return colors[status] || 'default';
};

export const getPaymentStatusColor = (status: PaymentStatus): string => {
  const colors: Record<PaymentStatus, string> = {
    PENDING: 'warning',
    PARTIAL: 'info',
    PAID: 'success',
    OVERDUE: 'error',
  };
  return colors[status] || 'default';
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getRelativeTime = (date: string): string => {
  const now = new Date();
  const eventDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - eventDate.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`;
  }
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks} week${diffInWeeks !== 1 ? 's' : ''} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} month${diffInMonths !== 1 ? 's' : ''} ago`;
};

export const getDaysUntilEvent = (eventDate: string): number => {
  const now = new Date();
  const event = new Date(eventDate);
  const diffInMs = event.getTime() - now.getTime();
  return Math.ceil(diffInMs / (1000 * 60 * 60 * 24));
};

export const isEventUpcoming = (eventDate: string): boolean => {
  return getDaysUntilEvent(eventDate) > 0;
};

export const isEventToday = (eventDate: string): boolean => {
  const today = new Date();
  const event = new Date(eventDate);
  return today.toDateString() === event.toDateString();
};

export const formatEventDateRange = (startDate: string, endDate?: string): string => {
  const start = new Date(startDate);
  
  if (!endDate) {
    return start.toLocaleDateString();
  }
  
  const end = new Date(endDate);
  
  // Same day
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString();
  }
  
  // Different days
  return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
};

// Validation helpers for forms
export const validatePreferences = (preferences: Record<string, unknown>): string[] => {
  const errors: string[] = [];
  
  // Add custom validation logic here as needed
  if (preferences.special_requests && typeof preferences.special_requests === 'string' && preferences.special_requests.length > 1000) {
    errors.push('Special requests must be less than 1000 characters');
  }
  
  return errors;
};