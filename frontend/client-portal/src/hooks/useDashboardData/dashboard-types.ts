// frontend/client-portal/src/hooks/useDashboardData/dashboard-types.ts

import type { Event, EventTask } from '../../types/events.types';
import type { EventQuote } from '../../types/quotes.types';
import type { Payment, Invoice } from '../../types/financial';

// Core dashboard data interface with priority-based aggregation
export interface DashboardData {
  // Critical Actions (highest priority - client must act)
  criticalActions: {
    quotesNeedingResponse: Array<EventQuote & { urgencyScore: number; daysUntilExpiry: number }>;
    overduePayments: Array<Payment & { daysPastDue: number }>;
    urgentTasks: Array<EventTask & { eventName: string; eventId: number }>;
    contractsNeedingSignature: Array<{
      id: string;
      eventId: number;
      eventName: string;
      templateName: string;
      expiresAt: string | null;
      daysUntilExpiry: number | null;
      signatureProgress: {
        total_required: number;
        signed_count: number;
        percentage: number;
      };
    }>;
  };

  // Event Status Overview (next priority - current state)
  eventStatus: {
    nextUpcomingEvent: Event | null;
    currentEventProgress: {
      event: Event;
      completedTasks: number;
      totalTasks: number;
      progressPercentage: number;
    } | null;
    recentUpdates: Array<{
      id: number;
      eventId: number;
      eventName: string;
      action_type: string;
      description: string;
      created_at: string;
    }>;
  };

  // Financial Summary (important - money matters)
  financialSummary: {
    outstandingInvoices: Array<Invoice & { daysPastDue: number }>;
    recentPayments: Payment[];
    totalOutstanding: string;
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  };

  // Communication Highlights (background info)
  communications: {
    unreadCount: number;
    recentMessages: Array<{
      id: string;
      channel: string;
      subject?: string;
      created_at: string;
      is_opened: boolean;
    }>;
    importantNotifications: Array<{
      id: string;
      type: string;
      message: string;
      created_at: string;
      severity: 'info' | 'warning' | 'error';
    }>;
  };

  // Meta information
  loading: boolean;
  error: string | null;
  lastUpdated: Date;
}

// Type guard for signature progress data structure
export interface SignatureProgressVariantA {
  total_required: number;
  signed_count: number;
  percentage: number;
}

export interface SignatureProgressVariantB {
  total: number;
  completed: number;
  percentage: number;
}

export type SignatureProgressData = SignatureProgressVariantA | SignatureProgressVariantB;
