import type { Task, TaskCounts, TaskDomain, TaskPriority } from '../../../types/tasks.types';

export function createMockTask(overrides: Partial<Task> = {}): Task {
  const id = overrides.id || `task-${Math.floor(Math.random() * 10000)}`;
  const domain: TaskDomain = overrides.domain || 'quotes';
  return {
    id,
    domain,
    type: 'pending_action',
    title: `Task ${id}`,
    description: `Description for task ${id}`,
    priority: 'medium',
    createdAt: '2024-06-15T10:00:00Z',
    entityId: 1,
    eventId: 1,
    eventName: 'Wedding Reception',
    clientName: 'John Doe',
    status: 'pending',
    amount: '25000.00',
    ...overrides,
  };
}

export function createMockTasks(count: number): Task[] {
  const taskConfigs: Array<{
    domain: TaskDomain;
    type: string;
    title: string;
    priority: TaskPriority;
    status: string;
  }> = [
    {
      domain: 'quotes',
      type: 'quote_expiring',
      title: 'Quote expiring soon - Wedding Reception',
      priority: 'high',
      status: 'pending',
    },
    {
      domain: 'contracts',
      type: 'contract_unsigned',
      title: 'Contract awaiting signature - Corporate Event',
      priority: 'medium',
      status: 'pending',
    },
    {
      domain: 'payments',
      type: 'payment_overdue',
      title: 'Payment overdue - Birthday Party',
      priority: 'high',
      status: 'overdue',
    },
    {
      domain: 'communications',
      type: 'email_bounced',
      title: 'Email delivery failed - Team Building',
      priority: 'low',
      status: 'failed',
    },
    {
      domain: 'support',
      type: 'inquiry_unassigned',
      title: 'Unassigned support inquiry from client',
      priority: 'medium',
      status: 'pending',
    },
  ];
  return Array.from({ length: count }, (_, i) => {
    const config = taskConfigs[i % taskConfigs.length];
    return createMockTask({
      id: `task-${i + 1}`,
      domain: config.domain,
      type: config.type,
      title: config.title,
      priority: config.priority,
      status: config.status,
      entityId: i + 1,
      eventId: i + 1,
      eventName: `Event ${i + 1}`,
      clientName: `Client ${i + 1}`,
    });
  });
}

export const mockTasks = createMockTasks(5);

export function createMockTaskCounts(overrides: Partial<TaskCounts> = {}): TaskCounts {
  return {
    quotes: 5,
    contracts: 3,
    payments: 4,
    communications: 2,
    support: 6,
    total: 20,
    ...overrides,
  };
}

export const mockTaskCounts = createMockTaskCounts();
