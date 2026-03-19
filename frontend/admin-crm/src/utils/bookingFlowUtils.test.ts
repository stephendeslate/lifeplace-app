import { describe, it, expect } from 'vitest';
import {
  getEventTypeDisplayName,
  hasSpecificEventType,
  getEventTypeChipColor,
  getEventTypeChipStyles,
} from './bookingFlowUtils';
import type { BookingFlow } from '../types/bookingflows';

const makeFlow = (event_type_name: string | null | undefined): BookingFlow =>
  ({ event_type_name }) as BookingFlow;

describe('getEventTypeDisplayName', () => {
  it('returns the name for a valid event type', () => {
    expect(getEventTypeDisplayName(makeFlow('Wedding'))).toBe('Wedding');
  });

  it('returns All Event Types for null', () => {
    expect(getEventTypeDisplayName(makeFlow(null))).toBe('All Event Types');
  });

  it('returns All Event Types for undefined', () => {
    expect(getEventTypeDisplayName(makeFlow(undefined))).toBe('All Event Types');
  });

  it('returns All Event Types for "Any Event Type"', () => {
    expect(getEventTypeDisplayName(makeFlow('Any Event Type'))).toBe('All Event Types');
  });

  it('returns All Event Types for "All Event Types"', () => {
    expect(getEventTypeDisplayName(makeFlow('All Event Types'))).toBe('All Event Types');
  });

  it('returns All Event Types for empty string', () => {
    expect(getEventTypeDisplayName(makeFlow(''))).toBe('All Event Types');
  });

  it('returns All Event Types for whitespace-only', () => {
    expect(getEventTypeDisplayName(makeFlow('   '))).toBe('All Event Types');
  });
});

describe('hasSpecificEventType', () => {
  it('returns true for a valid name', () => {
    expect(hasSpecificEventType(makeFlow('Wedding'))).toBe(true);
  });

  it('returns false for null/empty/generic names', () => {
    expect(hasSpecificEventType(makeFlow(null))).toBe(false);
    expect(hasSpecificEventType(makeFlow(''))).toBe(false);
    expect(hasSpecificEventType(makeFlow('Any Event Type'))).toBe(false);
    expect(hasSpecificEventType(makeFlow('All Event Types'))).toBe(false);
  });
});

describe('getEventTypeChipColor', () => {
  it('returns primary for specific type', () => {
    expect(getEventTypeChipColor(makeFlow('Wedding'))).toBe('primary');
  });

  it('returns default for generic type', () => {
    expect(getEventTypeChipColor(makeFlow(null))).toBe('default');
  });
});

describe('getEventTypeChipStyles', () => {
  it('returns bold style for specific type', () => {
    expect(getEventTypeChipStyles(makeFlow('Wedding'))).toEqual({
      fontWeight: 600,
    });
  });

  it('returns italic+opacity style for generic type', () => {
    expect(getEventTypeChipStyles(makeFlow(null))).toEqual({
      fontWeight: 600,
      fontStyle: 'italic',
      opacity: 0.8,
    });
  });
});
