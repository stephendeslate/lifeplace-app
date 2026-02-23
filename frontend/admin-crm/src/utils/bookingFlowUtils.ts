// Utility functions for BookingFlow display and formatting
import type { BookingFlow } from '../types/bookingflows.types';

/**
 * Standardized function to get the display name for an event type
 * Handles all possible null/empty/default values consistently
 */
export function getEventTypeDisplayName(flow: BookingFlow): string {
  const eventTypeName = flow.event_type_name?.trim();
  const hasValidName =
    eventTypeName &&
    eventTypeName !== '' &&
    eventTypeName !== 'Any Event Type' &&
    eventTypeName !== 'All Event Types';

  // With the fixed backend serializer, we should always get a proper name or null
  // If the name is missing/invalid, we treat it as "All Event Types"
  return hasValidName ? eventTypeName : 'All Event Types';
}

/**
 * Check if a booking flow has a specific event type set
 */
export function hasSpecificEventType(flow: BookingFlow): boolean {
  const eventTypeName = flow.event_type_name?.trim();
  const hasValidName = !!(
    eventTypeName &&
    eventTypeName !== '' &&
    eventTypeName !== 'Any Event Type' &&
    eventTypeName !== 'All Event Types'
  );

  // With the fixed backend, we rely on the event_type_name field
  // If it has a valid name, it's specific; otherwise it's for all event types
  return hasValidName;
}

/**
 * Get event type chip color based on whether it has a specific event type
 */
export function getEventTypeChipColor(flow: BookingFlow): 'primary' | 'default' {
  return hasSpecificEventType(flow) ? 'primary' : 'default';
}

/**
 * Get event type chip styles for flows without specific event types
 */
export function getEventTypeChipStyles(flow: BookingFlow): object {
  if (hasSpecificEventType(flow)) {
    return { fontWeight: 600 };
  }

  return {
    fontWeight: 600,
    fontStyle: 'italic',
    opacity: 0.8,
  };
}
