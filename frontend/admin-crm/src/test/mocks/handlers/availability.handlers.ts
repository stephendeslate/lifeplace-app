import { http, HttpResponse, delay } from "msw";
import type {
  DateAvailabilityInfo,
  DateRangeAvailabilityResponse,
  BookingValidationResponse,
  NextAvailableDateResponse,
} from "../../../types/availability.types";

const BASE_URL = "http://localhost:8000/api";

// No mutable store needed - availability is read-only / stateless

export const resetAvailabilityStore = () => {
  // No-op: availability handlers are stateless
};

/**
 * Generate a mock availability info for a given date string.
 */
function createDateAvailability(date: string): DateAvailabilityInfo {
  // Deterministic pseudo-random based on date to keep tests stable
  const dayNum = new Date(date).getDate();
  const isFullyBooked = dayNum % 15 === 0;
  const isPartiallyBooked = dayNum % 5 === 0 && !isFullyBooked;

  return {
    date,
    status: isFullyBooked
      ? "fully_booked"
      : isPartiallyBooked
        ? "partially_booked"
        : "available",
    conflict_level: isFullyBooked
      ? "confirmed"
      : isPartiallyBooked
        ? "lead_only"
        : "none",
    confirmed_events_count: isFullyBooked ? 2 : isPartiallyBooked ? 1 : 0,
    lead_events_count: isPartiallyBooked ? 1 : 0,
    total_events_count: isFullyBooked ? 2 : isPartiallyBooked ? 1 : 0,
    can_book_event: !isFullyBooked,
    can_create_lead: true,
    conflicts: isFullyBooked
      ? [
          {
            event_id: 1,
            event_name: "Wedding Reception",
            client_name: "John Doe",
            status: "CONFIRMED",
            start_date: date,
            severity: "high",
          },
        ]
      : [],
    reasons: isFullyBooked ? ["Date is fully booked"] : [],
    buffer_conflicts: [],
  };
}

export const availabilityHandlers = [
  // GET /api/events/availability/check/ - Check single date availability
  http.get(`${BASE_URL}/events/availability/check/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start_date");

    if (!startDate) {
      return HttpResponse.json(
        { detail: "start_date is required." },
        { status: 400 },
      );
    }

    return HttpResponse.json(createDateAvailability(startDate));
  }),

  // GET /api/events/availability/range/ - Check date range availability
  http.get(`${BASE_URL}/events/availability/range/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const startDate = url.searchParams.get("start_date");
    const endDate = url.searchParams.get("end_date");

    if (!startDate || !endDate) {
      return HttpResponse.json(
        { detail: "start_date and end_date are required." },
        { status: 400 },
      );
    }

    // Generate availability for each day in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const availability: DateAvailabilityInfo[] = [];

    const current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().split("T")[0];
      availability.push(createDateAvailability(dateStr));
      current.setDate(current.getDate() + 1);
    }

    const totalDays = availability.length;
    const availableDays = availability.filter(
      (a) => a.status === "available",
    ).length;
    const partiallyBookedDays = availability.filter(
      (a) => a.status === "partially_booked",
    ).length;
    const fullyBookedDays = availability.filter(
      (a) => a.status === "fully_booked",
    ).length;
    const blockedDays = availability.filter(
      (a) => a.status === "blocked",
    ).length;

    const response: DateRangeAvailabilityResponse = {
      start_date: startDate,
      end_date: endDate,
      total_days: totalDays,
      availability,
      summary: {
        total_days: totalDays,
        available_days: availableDays,
        partially_booked_days: partiallyBookedDays,
        fully_booked_days: fullyBookedDays,
        blocked_days: blockedDays,
        availability_percentage:
          totalDays > 0 ? (availableDays / totalDays) * 100 : 0,
      },
    };

    return HttpResponse.json(response);
  }),

  // POST /api/events/availability/validate/ - Validate booking request
  http.post(
    `${BASE_URL}/events/availability/validate/`,
    async ({ request }) => {
      await delay(50);
      const body = (await request.json()) as Record<string, unknown>;
      const startDate = body.start_date as string;

      if (!startDate) {
        return HttpResponse.json(
          { detail: "start_date is required." },
          { status: 400 },
        );
      }

      const dateInfo = createDateAvailability(startDate);
      const isLead = (body.is_lead as boolean) || false;

      const response: BookingValidationResponse = {
        is_valid: isLead ? dateInfo.can_create_lead : dateInfo.can_book_event,
        errors: dateInfo.can_book_event
          ? []
          : ["The selected date is not available for booking."],
        start_date: startDate,
        end_date: body.end_date as string | undefined,
        is_lead: isLead,
      };

      return HttpResponse.json(response);
    },
  ),

  // GET /api/events/availability/next/ - Find next available date
  http.get(`${BASE_URL}/events/availability/next/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const startDate =
      url.searchParams.get("start_date") ||
      new Date().toISOString().split("T")[0];
    const maxDaysAhead = Number(url.searchParams.get("max_days_ahead") || 90);

    // Find the next date that isn't fully booked
    const start = new Date(startDate);
    let nextDate: string | undefined;
    let daysAhead: number | undefined;

    for (let i = 0; i < maxDaysAhead; i++) {
      const check = new Date(start);
      check.setDate(check.getDate() + i);
      const dateStr = check.toISOString().split("T")[0];
      const info = createDateAvailability(dateStr);
      if (info.can_book_event) {
        nextDate = dateStr;
        daysAhead = i;
        break;
      }
    }

    const response: NextAvailableDateResponse = {
      search_start_date: startDate,
      max_days_ahead: maxDaysAhead,
      next_available_date: nextDate,
      days_ahead: daysAhead,
    };

    return HttpResponse.json(response);
  }),

  // POST /api/events/availability/cache/invalidate/ - Invalidate availability cache
  http.post(`${BASE_URL}/events/availability/cache/invalidate/`, async () => {
    await delay(50);
    return HttpResponse.json({ detail: "Cache invalidated." });
  }),
];
