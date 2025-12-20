// frontend/admin-crm/src/types/tasks.types.ts

export type TaskDomain = 'quotes' | 'contracts' | 'payments' | 'communications';
export type TaskPriority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  domain: TaskDomain;
  type: string;
  title: string;
  description: string;
  priority: TaskPriority;
  createdAt: string;
  entityId: number | string;
  eventId?: number;
  eventName?: string;
  clientName?: string;
  status: string;
  amount?: string;
}

export interface TaskCounts {
  quotes: number;
  contracts: number;
  payments: number;
  communications: number;
  total: number;
}

export interface TaskFilters {
  domain?: TaskDomain;
  assignee?: number;
}

export interface TasksByDomain {
  quotes: Task[];
  contracts: Task[];
  payments: Task[];
  communications: Task[];
}
