import { http, HttpResponse, delay } from "msw";
import {
  mockVIPTiers,
  mockVIPMembers,
  createMockVIPTier,
} from "../data/vip.mock";
import type {
  VIPTier,
  ClientVIPStatus,
  VIPSettings,
} from "../../../types/vip.types";

const BASE_URL = "http://localhost:8000/api";

let tiersStore: VIPTier[] = [...mockVIPTiers];
let membersStore: ClientVIPStatus[] = [...mockVIPMembers];
let settingsStore: VIPSettings = {
  id: 1,
  is_program_enabled: true,
  program_name: "LifePlace VIP",
  earning_automatic_enabled: true,
  earning_points_enabled: true,
  earning_manual_enabled: true,
  automatic_earning_type: "BOTH",
  points_per_currency_spent: "1.00",
  points_currency_unit: "PHP",
  points_expiry_months: 12,
  expiration_type: "NEVER",
  expiration_months: 0,
  show_vip_status_to_client: true,
  show_tier_progress_to_client: true,
  show_available_rewards_to_client: true,
  show_points_balance_to_client: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-06-15T10:00:00Z",
};

export const resetVIPStore = () => {
  tiersStore = [...mockVIPTiers];
  membersStore = [...mockVIPMembers];
  settingsStore = {
    id: 1,
    is_program_enabled: true,
    program_name: "LifePlace VIP",
    earning_automatic_enabled: true,
    earning_points_enabled: true,
    earning_manual_enabled: true,
    automatic_earning_type: "BOTH",
    points_per_currency_spent: "1.00",
    points_currency_unit: "PHP",
    points_expiry_months: 12,
    expiration_type: "NEVER",
    expiration_months: 0,
    show_vip_status_to_client: true,
    show_tier_progress_to_client: true,
    show_available_rewards_to_client: true,
    show_points_balance_to_client: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-06-15T10:00:00Z",
  };
};

export const vipHandlers = [
  // ============================================
  // VIP Settings
  // ============================================

  // GET /api/vip/settings/ - Get VIP settings
  http.get(`${BASE_URL}/vip/settings/`, async () => {
    await delay(30);
    return HttpResponse.json(settingsStore);
  }),

  // PATCH /api/vip/settings/ - Update VIP settings
  http.patch(`${BASE_URL}/vip/settings/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    settingsStore = {
      ...settingsStore,
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(settingsStore);
  }),

  // ============================================
  // VIP Tiers
  // ============================================

  // GET /api/vip/tiers/ - List tiers (paginated)
  http.get(`${BASE_URL}/vip/tiers/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    const isActive = url.searchParams.get("is_active");

    let filtered = [...tiersStore];

    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search),
      );
    }
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      filtered = filtered.filter((t) => t.is_active === (isActive === "true"));
    }

    const ordering = url.searchParams.get("ordering");
    if (ordering === "level") {
      filtered.sort((a, b) => a.level - b.level);
    } else if (ordering === "-level") {
      filtered.sort((a, b) => b.level - a.level);
    }

    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("page_size") || 25);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginated = filtered.slice(start, end);

    return HttpResponse.json({
      count: filtered.length,
      results: paginated,
      next: end < filtered.length ? `page=${page + 1}` : null,
      previous: page > 1 ? `page=${page - 1}` : null,
      page_count: Math.ceil(filtered.length / pageSize),
      current_page: page,
      page_size: pageSize,
    });
  }),

  // GET /api/vip/tiers/active/ - List active tiers
  http.get(`${BASE_URL}/vip/tiers/active/`, async () => {
    await delay(30);
    const activeTiers = tiersStore
      .filter((t) => t.is_active)
      .map((t) => ({
        id: t.id,
        name: t.name,
        level: t.level,
        color: t.color,
        is_default: t.is_default,
      }));
    return HttpResponse.json(activeTiers);
  }),

  // GET /api/vip/tiers/:id/ - Get single tier
  http.get(`${BASE_URL}/vip/tiers/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const tier = tiersStore.find((t) => t.id === id);
    if (!tier) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(tier);
  }),

  // POST /api/vip/tiers/ - Create tier
  http.post(`${BASE_URL}/vip/tiers/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newTier = createMockVIPTier({
      id: tiersStore.length + 100,
      name: body.name as string,
      description: (body.description as string) || "",
      level: body.level as number,
      is_default: (body.is_default as boolean) || false,
      color: (body.color as string) || "#FFD700",
      icon: (body.icon as string) || "star",
      is_active: body.is_active !== false,
    });
    tiersStore.push(newTier);
    return HttpResponse.json(newTier, { status: 201 });
  }),

  // PATCH /api/vip/tiers/:id/ - Update tier
  http.patch(`${BASE_URL}/vip/tiers/:id/`, async ({ params, request }) => {
    await delay(50);
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const idx = tiersStore.findIndex((t) => t.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    tiersStore[idx] = {
      ...tiersStore[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(tiersStore[idx]);
  }),

  // DELETE /api/vip/tiers/:id/ - Delete tier
  http.delete(`${BASE_URL}/vip/tiers/:id/`, async ({ params }) => {
    await delay(50);
    const id = Number(params.id);
    const idx = tiersStore.findIndex((t) => t.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    tiersStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // VIP Benefits
  // ============================================

  // GET /api/vip/benefits/ - List benefits
  http.get(`${BASE_URL}/vip/benefits/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const tier = url.searchParams.get("tier");
    const benefitType = url.searchParams.get("benefit_type");
    const isActive = url.searchParams.get("is_active");

    // Return a simple mock list
    const benefits = [
      {
        id: 1,
        tier: 2,
        tier_name: "Silver",
        benefit_type: "PERCENTAGE_DISCOUNT" as const,
        benefit_type_display: "Percentage Discount",
        application_mode: "AUTOMATIC" as const,
        application_mode_display: "Automatic",
        value: "10.00",
        applicable_products: [],
        max_uses_per_booking: null,
        max_uses_per_month: null,
        points_cost: 0,
        is_active: true,
        description: "10% discount on all bookings",
        display_name: "Silver Discount",
        created_at: "2024-06-15T10:00:00Z",
        updated_at: "2024-06-15T10:00:00Z",
      },
      {
        id: 2,
        tier: 3,
        tier_name: "Gold",
        benefit_type: "FREE_HOURS" as const,
        benefit_type_display: "Free Hours",
        application_mode: "REDEEMABLE" as const,
        application_mode_display: "Redeemable",
        value: "2",
        applicable_products: [],
        max_uses_per_booking: 1,
        max_uses_per_month: 2,
        points_cost: 500,
        is_active: true,
        description: "2 free hours per booking",
        display_name: "Gold Free Hours",
        created_at: "2024-06-15T10:00:00Z",
        updated_at: "2024-06-15T10:00:00Z",
      },
    ];

    let filtered = [...benefits];
    if (tier) {
      filtered = filtered.filter((b) => b.tier === Number(tier));
    }
    if (benefitType) {
      filtered = filtered.filter((b) => b.benefit_type === benefitType);
    }
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      filtered = filtered.filter((b) => b.is_active === (isActive === "true"));
    }

    return HttpResponse.json(filtered);
  }),

  // GET /api/vip/benefits/benefit_types/ - List benefit types
  http.get(`${BASE_URL}/vip/benefits/benefit_types/`, async () => {
    await delay(30);
    return HttpResponse.json([
      { value: "PERCENTAGE_DISCOUNT", label: "Percentage Discount" },
      { value: "FIXED_DISCOUNT", label: "Fixed Discount" },
      { value: "FREE_HOURS", label: "Free Hours" },
      { value: "WAIVE_SERVICE_CHARGE", label: "Waive Service Charge" },
      { value: "WAIVE_LATE_FEE", label: "Waive Late Fee" },
      { value: "WAIVE_RESCHEDULING_FEE", label: "Waive Rescheduling Fee" },
      { value: "PRIORITY_BOOKING", label: "Priority Booking" },
      { value: "EARLY_ACCESS", label: "Early Access" },
      { value: "EXCLUSIVE_PACKAGE", label: "Exclusive Package" },
      { value: "COMPLIMENTARY_ADDON", label: "Complimentary Add-on" },
    ]);
  }),

  // GET /api/vip/benefits/:id/ - Get single benefit
  http.get(`${BASE_URL}/vip/benefits/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    if (id === 1) {
      return HttpResponse.json({
        id: 1,
        tier: 2,
        tier_name: "Silver",
        benefit_type: "PERCENTAGE_DISCOUNT",
        benefit_type_display: "Percentage Discount",
        application_mode: "AUTOMATIC",
        application_mode_display: "Automatic",
        value: "10.00",
        applicable_products: [],
        max_uses_per_booking: null,
        max_uses_per_month: null,
        points_cost: 0,
        is_active: true,
        description: "10% discount on all bookings",
        display_name: "Silver Discount",
        created_at: "2024-06-15T10:00:00Z",
        updated_at: "2024-06-15T10:00:00Z",
      });
    }
    return HttpResponse.json({ detail: "Not found." }, { status: 404 });
  }),

  // POST /api/vip/benefits/ - Create benefit
  http.post(`${BASE_URL}/vip/benefits/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newBenefit = {
      id: 100 + Math.floor(Math.random() * 1000),
      tier: body.tier as number,
      tier_name: "Silver",
      benefit_type: body.benefit_type as string,
      benefit_type_display: body.benefit_type as string,
      application_mode: (body.application_mode as string) || "AUTOMATIC",
      application_mode_display:
        (body.application_mode as string) || "Automatic",
      value: (body.value as string) || null,
      applicable_products: (body.applicable_products as number[]) || [],
      max_uses_per_booking: (body.max_uses_per_booking as number) || null,
      max_uses_per_month: (body.max_uses_per_month as number) || null,
      points_cost: (body.points_cost as number) || 0,
      is_active: body.is_active !== false,
      description: (body.description as string) || "",
      display_name: (body.display_name as string) || "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(newBenefit, { status: 201 });
  }),

  // PATCH /api/vip/benefits/:id/ - Update benefit
  http.patch(`${BASE_URL}/vip/benefits/:id/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: 1,
      tier: 2,
      tier_name: "Silver",
      benefit_type: "PERCENTAGE_DISCOUNT",
      benefit_type_display: "Percentage Discount",
      application_mode: "AUTOMATIC",
      application_mode_display: "Automatic",
      value: "10.00",
      applicable_products: [],
      max_uses_per_booking: null,
      max_uses_per_month: null,
      points_cost: 0,
      is_active: true,
      description: "10% discount on all bookings",
      display_name: "Silver Discount",
      created_at: "2024-06-15T10:00:00Z",
      updated_at: new Date().toISOString(),
      ...body,
    });
  }),

  // DELETE /api/vip/benefits/:id/ - Delete benefit
  http.delete(`${BASE_URL}/vip/benefits/:id/`, async () => {
    await delay(50);
    return new HttpResponse(null, { status: 204 });
  }),

  // ============================================
  // Client VIP Status
  // ============================================

  // GET /api/vip/client-status/ - List client statuses
  http.get(`${BASE_URL}/vip/client-status/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const tier = url.searchParams.get("tier");
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.toLowerCase();
    const client = url.searchParams.get("client");

    let filtered = membersStore.map((m) => ({
      id: m.id,
      client: m.client,
      client_email: m.client_email,
      client_name: m.client_name,
      current_tier: m.current_tier,
      current_tier_name: m.current_tier_name,
      tier_color: m.current_tier_data?.color || null,
      points_balance: m.points_balance,
      total_spent: m.total_spent,
      completed_bookings_count: m.completed_bookings_count,
      status: m.status,
    }));

    if (tier) {
      filtered = filtered.filter((m) => m.current_tier === Number(tier));
    }
    if (status) {
      filtered = filtered.filter((m) => m.status === status);
    }
    if (search) {
      filtered = filtered.filter(
        (m) =>
          m.client_name.toLowerCase().includes(search) ||
          m.client_email.toLowerCase().includes(search),
      );
    }
    if (client) {
      filtered = filtered.filter((m) => m.client === Number(client));
    }

    return HttpResponse.json(filtered);
  }),

  // GET /api/vip/client-status/:id/ - Get single client status
  http.get(`${BASE_URL}/vip/client-status/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const member = membersStore.find((m) => m.id === id);
    if (!member) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(member);
  }),

  // POST /api/vip/client-status/:id/assign_tier/ - Assign tier
  http.post(
    `${BASE_URL}/vip/client-status/:id/assign_tier/`,
    async ({ params, request }) => {
      await delay(50);
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      const idx = membersStore.findIndex((m) => m.id === id);
      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found." }, { status: 404 });
      }
      membersStore[idx] = {
        ...membersStore[idx],
        current_tier: body.tier_id as number,
        current_tier_name: `Tier ${body.tier_id}`,
        updated_at: new Date().toISOString(),
      };
      return HttpResponse.json(membersStore[idx]);
    },
  ),

  // POST /api/vip/client-status/:id/award_points/ - Award points
  http.post(
    `${BASE_URL}/vip/client-status/:id/award_points/`,
    async ({ params, request }) => {
      await delay(50);
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      const idx = membersStore.findIndex((m) => m.id === id);
      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found." }, { status: 404 });
      }
      const points = body.points as number;
      membersStore[idx] = {
        ...membersStore[idx],
        points_balance: membersStore[idx].points_balance + points,
        lifetime_points_earned:
          membersStore[idx].lifetime_points_earned + points,
        updated_at: new Date().toISOString(),
      };
      return HttpResponse.json({
        transaction: {
          id: 100 + Math.floor(Math.random() * 1000),
          client_vip_status: id,
          client_email: membersStore[idx].client_email,
          transaction_type: "EARNED_MANUAL",
          transaction_type_display: "Manual Award",
          points,
          event: null,
          payment: null,
          description: (body.description as string) || "Points awarded",
          balance_after: membersStore[idx].points_balance,
          performed_by: 1,
          performed_by_email: "admin@lifeplace.com",
          created_at: new Date().toISOString(),
        },
        new_balance: membersStore[idx].points_balance,
      });
    },
  ),

  // POST /api/vip/client-status/:id/adjust_points/ - Adjust points
  http.post(
    `${BASE_URL}/vip/client-status/:id/adjust_points/`,
    async ({ params, request }) => {
      await delay(50);
      const id = Number(params.id);
      const body = (await request.json()) as Record<string, unknown>;
      const idx = membersStore.findIndex((m) => m.id === id);
      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found." }, { status: 404 });
      }
      const points = body.points as number;
      membersStore[idx] = {
        ...membersStore[idx],
        points_balance: membersStore[idx].points_balance + points,
        updated_at: new Date().toISOString(),
      };
      return HttpResponse.json({
        transaction: {
          id: 100 + Math.floor(Math.random() * 1000),
          client_vip_status: id,
          client_email: membersStore[idx].client_email,
          transaction_type: "ADJUSTED",
          transaction_type_display: "Adjustment",
          points,
          event: null,
          payment: null,
          description: (body.description as string) || "Points adjusted",
          balance_after: membersStore[idx].points_balance,
          performed_by: 1,
          performed_by_email: "admin@lifeplace.com",
          created_at: new Date().toISOString(),
        },
        new_balance: membersStore[idx].points_balance,
      });
    },
  ),

  // GET /api/vip/client-status/:id/tier_history/ - Get tier history
  http.get(
    `${BASE_URL}/vip/client-status/:id/tier_history/`,
    async ({ params }) => {
      await delay(30);
      const id = Number(params.id);
      const member = membersStore.find((m) => m.id === id);
      if (!member) {
        return HttpResponse.json({ detail: "Not found." }, { status: 404 });
      }
      return HttpResponse.json([
        {
          id: 1,
          client_vip_status: id,
          from_tier: null,
          from_tier_name: null,
          to_tier: 1,
          to_tier_name: "Bronze",
          reason: "INITIAL",
          reason_display: "Initial Assignment",
          notes: "Auto-assigned on registration",
          changed_by: null,
          changed_by_email: null,
          created_at: "2024-01-15T10:00:00Z",
        },
        {
          id: 2,
          client_vip_status: id,
          from_tier: 1,
          from_tier_name: "Bronze",
          to_tier: member.current_tier,
          to_tier_name: member.current_tier_name,
          reason: "AUTOMATIC_UPGRADE",
          reason_display: "Automatic Upgrade",
          notes: "Met spending threshold",
          changed_by: null,
          changed_by_email: null,
          created_at: "2024-03-01T10:00:00Z",
        },
      ]);
    },
  ),

  // GET /api/vip/client-status/:id/point_transactions/ - Get point transactions
  http.get(
    `${BASE_URL}/vip/client-status/:id/point_transactions/`,
    async ({ params }) => {
      await delay(30);
      const id = Number(params.id);
      const member = membersStore.find((m) => m.id === id);
      if (!member) {
        return HttpResponse.json({ detail: "Not found." }, { status: 404 });
      }
      return HttpResponse.json([
        {
          id: 1,
          client_vip_status: id,
          client_email: member.client_email,
          transaction_type: "EARNED_BOOKING",
          transaction_type_display: "Earned from Booking",
          points: 500,
          event: 1,
          payment: null,
          description: "Points earned from booking completion",
          balance_after: 500,
          performed_by: null,
          performed_by_email: null,
          created_at: "2024-03-15T10:00:00Z",
        },
        {
          id: 2,
          client_vip_status: id,
          client_email: member.client_email,
          transaction_type: "EARNED_PAYMENT",
          transaction_type_display: "Earned from Payment",
          points: 200,
          event: null,
          payment: 1,
          description: "Points earned from payment",
          balance_after: 700,
          performed_by: null,
          performed_by_email: null,
          created_at: "2024-04-01T10:00:00Z",
        },
      ]);
    },
  ),

  // ============================================
  // Point Transactions (Admin view)
  // ============================================

  // GET /api/vip/point-transactions/ - List all point transactions
  http.get(`${BASE_URL}/vip/point-transactions/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const client = url.searchParams.get("client");
    const transactionType = url.searchParams.get("transaction_type");

    let transactions = [
      {
        id: 1,
        client_vip_status: 1,
        client_email: "john@example.com",
        transaction_type: "EARNED_BOOKING",
        transaction_type_display: "Earned from Booking",
        points: 500,
        event: 1,
        payment: null,
        description: "Points earned from booking completion",
        balance_after: 500,
        performed_by: null,
        performed_by_email: null,
        created_at: "2024-03-15T10:00:00Z",
      },
      {
        id: 2,
        client_vip_status: 2,
        client_email: "jane@example.com",
        transaction_type: "EARNED_PAYMENT",
        transaction_type_display: "Earned from Payment",
        points: 200,
        event: null,
        payment: 1,
        description: "Points earned from payment",
        balance_after: 200,
        performed_by: null,
        performed_by_email: null,
        created_at: "2024-04-01T10:00:00Z",
      },
    ];

    if (client) {
      transactions = transactions.filter(
        (t) => t.client_vip_status === Number(client),
      );
    }
    if (transactionType) {
      transactions = transactions.filter(
        (t) => t.transaction_type === transactionType,
      );
    }

    return HttpResponse.json(transactions);
  }),
];
