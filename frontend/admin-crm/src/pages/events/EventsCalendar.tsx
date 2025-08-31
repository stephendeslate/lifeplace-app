// frontend/admin-crm/src/pages/events/EventsCalendar.tsx

import React from 'react';
import EnterpriseEventsCalendar from './EnterpriseEventsCalendar';

/**
 * Enhanced Events Calendar with Enterprise-level features
 * 
 * Features:
 * - Real-time availability checking
 * - Date conflict detection and validation
 * - Business rule enforcement (no bookings on confirmed dates)
 * - Lead creation allowed on confirmed dates
 * - Visual availability indicators
 * - Conflict resolution assistance
 * - Availability statistics and analytics
 * - Prefetching and caching for performance
 * - Mobile-responsive design
 * - Advanced filtering and search
 */
export const EventsCalendar: React.FC = () => {
  return <EnterpriseEventsCalendar />;
};

export default EventsCalendar;