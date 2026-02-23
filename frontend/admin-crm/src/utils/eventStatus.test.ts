import { describe, it, expect } from 'vitest';
import {
  getEventStatusSummary,
  getEventPriorityColor,
  getWorkflowStatusColor,
} from './eventStatus';
import type { EventStatus } from '../types/events.types';

describe('getEventStatusSummary', () => {
  it('returns info for LEAD', () => {
    const result = getEventStatusSummary('LEAD');
    expect(result.label).toBe('Lead');
    expect(result.color).toBe('info');
    expect(result.description).toBe('Potential event opportunity');
    expect(result.icon).toBeDefined();
  });

  it('returns success for CONFIRMED', () => {
    const result = getEventStatusSummary('CONFIRMED');
    expect(result.label).toBe('Confirmed');
    expect(result.color).toBe('success');
  });

  it('returns default for COMPLETED', () => {
    const result = getEventStatusSummary('COMPLETED');
    expect(result.label).toBe('Completed');
    expect(result.color).toBe('default');
  });

  it('returns error for CANCELLED', () => {
    const result = getEventStatusSummary('CANCELLED');
    expect(result.label).toBe('Cancelled');
    expect(result.color).toBe('error');
  });

  it('returns default with raw status label for unknown status', () => {
    const result = getEventStatusSummary('UNKNOWN' as EventStatus);
    expect(result.label).toBe('UNKNOWN');
    expect(result.color).toBe('default');
    expect(result.description).toBe('Unknown status');
  });
});

describe('getEventPriorityColor', () => {
  it('returns error for CANCELLED regardless of days', () => {
    expect(getEventPriorityColor('CANCELLED', 30)).toBe('error');
  });

  it('returns default for COMPLETED regardless of days', () => {
    expect(getEventPriorityColor('COMPLETED', 5)).toBe('default');
  });

  it('returns error for past due events (negative days)', () => {
    expect(getEventPriorityColor('CONFIRMED', -1)).toBe('error');
  });

  it('returns warning for events within a week', () => {
    expect(getEventPriorityColor('CONFIRMED', 7)).toBe('warning');
    expect(getEventPriorityColor('LEAD', 3)).toBe('warning');
  });

  it('returns info for events within a month', () => {
    expect(getEventPriorityColor('CONFIRMED', 30)).toBe('info');
    expect(getEventPriorityColor('LEAD', 15)).toBe('info');
  });

  it('returns primary for events more than a month away', () => {
    expect(getEventPriorityColor('CONFIRMED', 31)).toBe('primary');
  });

  it('returns primary when daysUntilEvent is undefined', () => {
    expect(getEventPriorityColor('CONFIRMED')).toBe('primary');
    expect(getEventPriorityColor('LEAD')).toBe('primary');
  });
});

describe('getWorkflowStatusColor', () => {
  it('returns success for 100%', () => {
    expect(getWorkflowStatusColor(100)).toBe('success');
  });

  it('returns info for 75% and above', () => {
    expect(getWorkflowStatusColor(75)).toBe('info');
    expect(getWorkflowStatusColor(99)).toBe('info');
  });

  it('returns warning for 50% and above', () => {
    expect(getWorkflowStatusColor(50)).toBe('warning');
    expect(getWorkflowStatusColor(74)).toBe('warning');
  });

  it('returns primary for 25% and above', () => {
    expect(getWorkflowStatusColor(25)).toBe('primary');
    expect(getWorkflowStatusColor(49)).toBe('primary');
  });

  it('returns error for below 25%', () => {
    expect(getWorkflowStatusColor(24)).toBe('error');
    expect(getWorkflowStatusColor(0)).toBe('error');
  });
});
