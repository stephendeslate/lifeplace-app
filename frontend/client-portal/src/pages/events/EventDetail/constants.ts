export const EVENT_TAB_INDICES = {
  TIMELINE: 0,
  QUESTIONNAIRES: 1,
  CONTRACTS: 2,
  DOCUMENTS: 3,
  TASKS: 4,
  FEEDBACK: 5,
  QUOTES: 6,
  INVOICES: 7,
  CHECKIN: 8,
  NOTES: 9,
} as const;

export type EventTabIndex = (typeof EVENT_TAB_INDICES)[keyof typeof EVENT_TAB_INDICES];
