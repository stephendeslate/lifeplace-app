// frontend/client-portal/src/types/analytics.types.ts
// Client-facing analytics types

export interface ClientDashboard {
  events: {
    total: number;
    upcoming: number;
    completed: number;
    cancelled: number;
  };
  financials: {
    total_spent: number;
    pending_amount: number;
    overdue_count: number;
    overdue_amount: number;
    upcoming_count: number;
    upcoming_amount: number;
  };
  period: {
    start_date: string;
    end_date: string;
  };
}

export interface ClientEventHistory {
  id: number;
  name: string;
  event_type: string;
  venue: string;
  start_date: string;
  end_date: string | null;
  status: string;
  status_display: string;
  total_price: number;
  amount_paid: number;
  amount_pending: number;
}

export interface ClientSpendingTrend {
  month: string;
  month_name: string;
  amount: number;
  payment_count: number;
}

export interface ClientDeadline {
  type: 'payment' | 'event' | 'contract';
  title: string;
  description: string;
  due_date: string;
  amount?: number;
  event_id: number;
  contract_id?: number;
  urgency: 'high' | 'normal';
}
