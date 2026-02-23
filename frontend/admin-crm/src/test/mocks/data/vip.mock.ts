import type { VIPTier, ClientVIPStatus } from '../../../types/vip.types';

export function createMockVIPTier(overrides: Partial<VIPTier> = {}): VIPTier {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    name: `VIP Tier ${id}`,
    slug: `vip-tier-${id}`,
    description: `VIP Tier ${id} description`,
    level: 1,
    is_default: false,
    min_total_spent: '50000.00',
    min_completed_bookings: 3,
    min_points_required: null,
    color: '#FFD700',
    icon: 'star',
    is_active: true,
    benefits_count: 3,
    members_count: 10,
    created_at: '2024-06-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockVIPTiers(count?: number): VIPTier[] {
  const tierConfigs = [
    {
      name: 'Bronze',
      slug: 'bronze',
      level: 1,
      color: '#CD7F32',
      min_total_spent: '0.00',
      min_completed_bookings: 0,
      is_default: true,
    },
    {
      name: 'Silver',
      slug: 'silver',
      level: 2,
      color: '#C0C0C0',
      min_total_spent: '50000.00',
      min_completed_bookings: 3,
      is_default: false,
    },
    {
      name: 'Gold',
      slug: 'gold',
      level: 3,
      color: '#FFD700',
      min_total_spent: '150000.00',
      min_completed_bookings: 8,
      is_default: false,
    },
    {
      name: 'Platinum',
      slug: 'platinum',
      level: 4,
      color: '#E5E4E2',
      min_total_spent: '500000.00',
      min_completed_bookings: 20,
      is_default: false,
    },
  ];
  const total = count || tierConfigs.length;
  return Array.from({ length: total }, (_, i) => {
    const config = tierConfigs[i % tierConfigs.length];
    return createMockVIPTier({
      id: i + 1,
      name: config.name,
      slug: config.slug,
      level: config.level,
      color: config.color,
      min_total_spent: config.min_total_spent,
      min_completed_bookings: config.min_completed_bookings,
      is_default: config.is_default,
      benefits_count: (i + 1) * 2,
      members_count: 20 - i * 5,
    });
  });
}

export const mockVIPTiers = createMockVIPTiers(4);

export function createMockVIPMember(overrides: Partial<ClientVIPStatus> = {}): ClientVIPStatus {
  const id = overrides.id || Math.floor(Math.random() * 10000);
  return {
    id,
    client: 1,
    client_email: 'john@example.com',
    client_name: 'John Doe',
    current_tier: 2,
    current_tier_name: 'Silver',
    current_tier_data: {
      id: 2,
      name: 'Silver',
      level: 2,
      color: '#C0C0C0',
      is_default: false,
    },
    points_balance: 500,
    lifetime_points_earned: 1200,
    lifetime_points_spent: 700,
    total_spent: '85000.00',
    completed_bookings_count: 5,
    status: 'ACTIVE',
    status_display: 'Active',
    is_vip: true,
    assigned_by: 1,
    assigned_by_email: 'admin@lifeplace.com',
    assigned_at: '2024-03-01T10:00:00Z',
    assignment_reason: 'Loyal customer upgrade',
    expires_at: null,
    last_activity_at: '2024-06-15T10:00:00Z',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-06-15T10:00:00Z',
    ...overrides,
  };
}

export function createMockVIPMembers(count: number): ClientVIPStatus[] {
  const memberConfigs = [
    {
      name: 'John Doe',
      email: 'john@example.com',
      tier: 3,
      tier_name: 'Gold',
      total_spent: '200000.00',
      bookings: 12,
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      tier: 2,
      tier_name: 'Silver',
      total_spent: '85000.00',
      bookings: 5,
    },
    {
      name: 'Bob Johnson',
      email: 'bob@example.com',
      tier: 4,
      tier_name: 'Platinum',
      total_spent: '750000.00',
      bookings: 25,
    },
    {
      name: 'Alice Williams',
      email: 'alice@example.com',
      tier: 1,
      tier_name: 'Bronze',
      total_spent: '25000.00',
      bookings: 1,
    },
    {
      name: 'Charlie Brown',
      email: 'charlie@example.com',
      tier: 2,
      tier_name: 'Silver',
      total_spent: '60000.00',
      bookings: 4,
    },
  ];
  return Array.from({ length: count }, (_, i) => {
    const config = memberConfigs[i % memberConfigs.length];
    return createMockVIPMember({
      id: i + 1,
      client: i + 1,
      client_name: config.name,
      client_email: config.email,
      current_tier: config.tier,
      current_tier_name: config.tier_name,
      total_spent: config.total_spent,
      completed_bookings_count: config.bookings,
      points_balance: (i + 1) * 100,
    });
  });
}

export const mockVIPMembers = createMockVIPMembers(5);
