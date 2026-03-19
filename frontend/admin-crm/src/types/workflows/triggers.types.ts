// frontend/admin-crm/src/types/workflows/triggers.types.ts
// Trigger types, event workflow overrides, and timing utilities

import type { StageType } from './core.types';

// Workflow Trigger types
export type TriggerType =
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_PLAN_CREATED'
  | 'PAYMENT_OVERDUE'
  | 'QUOTE_ACCEPTED'
  | 'CONTRACT_SIGNED'
  | 'EVENT_CREATED'
  | 'EVENT_COMPLETED'
  | 'TASK_COMPLETED'
  | 'DATE_TRIGGER'
  | 'MANUAL_TRIGGER';

export const TRIGGER_TYPES = [
  { value: 'PAYMENT_RECEIVED', label: 'Payment Received' },
  { value: 'PAYMENT_PLAN_CREATED', label: 'Payment Plan Created' },
  { value: 'PAYMENT_OVERDUE', label: 'Payment Overdue' },
  { value: 'QUOTE_ACCEPTED', label: 'Quote Accepted' },
  { value: 'CONTRACT_SIGNED', label: 'Contract Signed' },
  { value: 'EVENT_CREATED', label: 'Event Created' },
  { value: 'EVENT_COMPLETED', label: 'Event Completed' },
  { value: 'TASK_COMPLETED', label: 'Task Completed' },
  { value: 'DATE_TRIGGER', label: 'Date/Time Trigger' },
  { value: 'MANUAL_TRIGGER', label: 'Manual Trigger' },
] as const;

export interface WorkflowTrigger {
  id: number;
  event: number;
  event_name: string;
  stage: number | null;
  stage_name: string | null;
  trigger_type: TriggerType;
  trigger_type_display: string;
  details: string;
  result_data: Record<string, unknown>;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
}

export interface WorkflowTriggerFilters {
  event_id?: number;
  template_id?: number;
  trigger_type?: TriggerType;
  processed?: boolean;
}

export interface ManualTriggerResponse {
  message: string;
  trigger_id: number;
}

// Event Workflow Override types (per-event workflow customization)
export type OverrideType = 'SKIP' | 'DISABLE_AUTOMATION' | 'CUSTOM_TIMING' | 'ADD_STAGE';

export const OVERRIDE_TYPES = [
  { value: 'SKIP', label: 'Skip Stage', description: 'Completely skip this stage for this event' },
  {
    value: 'DISABLE_AUTOMATION',
    label: 'Disable Automation',
    description: 'Run stage but skip automation',
  },
  { value: 'CUSTOM_TIMING', label: 'Custom Timing', description: 'Use different trigger timing' },
  {
    value: 'ADD_STAGE',
    label: 'Add Custom Stage',
    description: 'Add a one-off stage for this event',
  },
] as const;

export interface EventWorkflowOverride {
  id: number;
  event: number;
  event_name?: string;
  stage: number | null;
  stage_name?: string;
  override_type: OverrideType;
  override_type_display?: string;
  custom_trigger_time: string;
  custom_stage_name: string;
  custom_stage_category: StageType | '';
  custom_order: number | null;
  custom_is_automated: boolean;
  custom_automation_type: string;
  custom_email_template: number | null;
  custom_task_description: string;
  reason: string;
  created_by: number | null;
  created_by_name?: string;
  executed: boolean;
  executed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEventWorkflowOverrideData {
  event: number;
  stage?: number | null;
  override_type: OverrideType;
  custom_trigger_time?: string;
  custom_stage_name?: string;
  custom_stage_category?: StageType;
  custom_order?: number;
  custom_is_automated?: boolean;
  custom_automation_type?: string;
  custom_email_template?: number | null;
  custom_task_description?: string;
  reason?: string;
}

export type UpdateEventWorkflowOverrideData = Partial<CreateEventWorkflowOverrideData>;

export interface EventWorkflowOverrideFilters {
  event_id?: number;
  stage_id?: number;
  override_type?: OverrideType;
  executed?: boolean;
}

// Custom Timing Types for flexible timing input
export type TimingUnit = 'HOURS' | 'DAYS' | 'WEEKS';
export type TimingType = 'immediate' | 'after' | 'before_event';

export interface CustomTiming {
  type: TimingType;
  value?: number;
  unit?: TimingUnit;
}

/**
 * Convert CustomTiming object to trigger_time string format
 * @example { type: 'after', value: 3, unit: 'DAYS' } => 'AFTER_3_DAYS'
 */
export function customTimingToString(timing: CustomTiming): string {
  if (timing.type === 'immediate') {
    return 'ON_CREATION';
  }

  if (timing.type === 'after' && timing.value && timing.unit) {
    return `AFTER_${timing.value}_${timing.unit}`;
  }

  if (timing.type === 'before_event' && timing.value) {
    return `${timing.value}_DAYS_BEFORE_EVENT`;
  }

  return 'ON_CREATION';
}

/**
 * Parse trigger_time string to CustomTiming object
 * @example 'AFTER_3_DAYS' => { type: 'after', value: 3, unit: 'DAYS' }
 */
export function stringToCustomTiming(str: string): CustomTiming {
  if (!str || str === 'ON_CREATION') {
    return { type: 'immediate' };
  }

  // Match AFTER_X_UNIT pattern
  const afterMatch = str.match(/^AFTER_(\d+)_(HOURS?|DAYS?|WEEKS?)$/i);
  if (afterMatch) {
    const value = parseInt(afterMatch[1], 10);
    const rawUnit = afterMatch[2].toUpperCase();
    // Normalize unit (HOUR -> HOURS, DAY -> DAYS, WEEK -> WEEKS)
    const unit = rawUnit.endsWith('S') ? rawUnit : `${rawUnit}S`;
    return {
      type: 'after',
      value,
      unit: unit as TimingUnit,
    };
  }

  // Match X_DAYS_BEFORE_EVENT pattern
  const beforeMatch = str.match(/^(\d+)_DAYS?_BEFORE_EVENT$/i);
  if (beforeMatch) {
    return {
      type: 'before_event',
      value: parseInt(beforeMatch[1], 10),
      unit: 'DAYS',
    };
  }

  // Fallback to immediate for unrecognized formats
  return { type: 'immediate' };
}

/**
 * Get human-readable label for trigger time string
 */
export function getTriggerTimeLabel(triggerTime: string): string {
  const timing = stringToCustomTiming(triggerTime);

  if (timing.type === 'immediate') {
    return 'Immediately';
  }

  if (timing.type === 'after' && timing.value && timing.unit) {
    const unitLabel = timing.unit.toLowerCase().slice(0, -1); // Remove 's'
    const plural = timing.value === 1 ? '' : 's';
    return `After ${timing.value} ${unitLabel}${plural}`;
  }

  if (timing.type === 'before_event' && timing.value) {
    const plural = timing.value === 1 ? '' : 's';
    return `${timing.value} day${plural} before event`;
  }

  return triggerTime;
}

// Progression condition timing types (for TIME_ELAPSED patterns)
export interface ProgressionTiming {
  type: 'manual' | 'event' | 'time';
  condition?: string;
  value?: number;
  unit?: TimingUnit;
}

/**
 * Parse progression_condition string to ProgressionTiming object
 */
export function stringToProgressionTiming(str: string): ProgressionTiming {
  if (!str) {
    return { type: 'manual' };
  }

  // Event-based conditions
  const eventConditions = [
    'QUOTE_ACCEPTED',
    'CONTRACT_SIGNED',
    'PAYMENT_RECEIVED',
    'TASKS_COMPLETED',
  ];
  if (eventConditions.includes(str)) {
    return { type: 'event', condition: str };
  }

  // Time-elapsed pattern
  const timeMatch = str.match(/^TIME_ELAPSED_(\d+)_(HOURS?|DAYS?|WEEKS?)$/i);
  if (timeMatch) {
    const value = parseInt(timeMatch[1], 10);
    const rawUnit = timeMatch[2].toUpperCase();
    const unit = rawUnit.endsWith('S') ? rawUnit : `${rawUnit}S`;
    return {
      type: 'time',
      value,
      unit: unit as TimingUnit,
    };
  }

  return { type: 'manual' };
}

/**
 * Convert ProgressionTiming to progression_condition string
 */
export function progressionTimingToString(timing: ProgressionTiming): string {
  if (timing.type === 'manual') {
    return '';
  }

  if (timing.type === 'event' && timing.condition) {
    return timing.condition;
  }

  if (timing.type === 'time' && timing.value && timing.unit) {
    return `TIME_ELAPSED_${timing.value}_${timing.unit}`;
  }

  return '';
}
