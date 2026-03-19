import React from 'react';
import { People as PeopleIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import type { EventType } from '@/types/booking';

export interface EventTypeFeature {
  icon: React.ReactNode;
  label: string;
  description: string;
}

export const DEFAULT_COLOR = '#5a7c47'; // Forest Green fallback

export const getEventTypeFeatures = (eventType: EventType): EventTypeFeature[] => {
  const features: EventTypeFeature[] = [];

  if (eventType.description) {
    features.push({
      icon: React.createElement(PeopleIcon, { fontSize: 'small' }),
      label: 'Event Type',
      description: eventType.description,
    });
  }

  features.push({
    icon: React.createElement(LocationIcon, { fontSize: 'small' }),
    label: 'Venue',
    description: 'Professional event space',
  });

  return features;
};

export const getEventTypeColor = (eventType: EventType) => {
  return eventType.color || DEFAULT_COLOR;
};
