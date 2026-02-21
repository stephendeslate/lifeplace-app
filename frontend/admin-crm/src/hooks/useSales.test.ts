// frontend/admin-crm/src/hooks/useSales.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useQuoteTemplates,
  useQuoteTemplate,
  useActiveQuoteTemplates,
  useCreateQuoteTemplate,
  useUpdateQuoteTemplate,
  useDeleteQuoteTemplate,
  useQuoteTemplateProducts,
  useEventQuotes,
  useEventQuote,
  useCreateEventQuote,
  useSendQuote,
  useAcceptQuote,
  useRejectQuote,
  useDuplicateQuote,
  useQuoteLineItems,
  useCreateQuoteLineItem,
  useDeleteQuoteLineItem,
  useQuoteActivities,
  useQuoteReminders,
  useCreateQuoteReminder,
  useSignQuote,
} from "./useSales";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useQuoteTemplates", () => {
  it("fetches quote templates successfully", async () => {
    const { result } = renderHook(() => useQuoteTemplates(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
  });

  it("handles API error gracefully", async () => {
    server.use(
      http.get(`${BASE_URL}/sales/templates/`, () => {
        return HttpResponse.json({ detail: "Server error" }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useQuoteTemplates(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.error).toBeTruthy();
  });
});

describe("useQuoteTemplate", () => {
  it("fetches a single template by ID", async () => {
    const { result } = renderHook(() => useQuoteTemplate(1), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.id).toBe(1);
  });

  it("does not fetch when ID is 0", async () => {
    const { result } = renderHook(() => useQuoteTemplate(0), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.fetchStatus).toBe("idle");
    expect(result.current.data).toBeUndefined();
  });
});

describe("useActiveQuoteTemplates", () => {
  it("fetches active templates", async () => {
    const { result } = renderHook(() => useActiveQuoteTemplates(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe("useCreateQuoteTemplate", () => {
  it("creates a quote template successfully", async () => {
    const { result } = renderHook(() => useCreateQuoteTemplate(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate({
        name: "New Template",
        description: "Template description",
        event_type: 1,
        is_active: true,
        default_terms: "Standard terms",
        default_validity_days: 30,
      });
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe("useUpdateQuoteTemplate", () => {
  it("updates a quote template", async () => {
    const { result } = renderHook(() => useUpdateQuoteTemplate(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate({
        id: 1,
        data: { name: "Updated Template" },
      });
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe("useDeleteQuoteTemplate", () => {
  it("deletes a quote template", async () => {
    const { result } = renderHook(() => useDeleteQuoteTemplate(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe("useQuoteTemplateProducts", () => {
  it("fetches template products", async () => {
    const { result } = renderHook(() => useQuoteTemplateProducts(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
  });
});

describe("useEventQuotes", () => {
  it("fetches event quotes successfully", async () => {
    const { result } = renderHook(() => useEventQuotes(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
  });

  it("handles event quotes API error", async () => {
    server.use(
      http.get(`${BASE_URL}/sales/quotes/`, () => {
        return HttpResponse.json({ detail: "Server error" }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useEventQuotes(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.error).toBeTruthy();
  });
});

describe("useEventQuote", () => {
  it("fetches a single event quote by ID", async () => {
    const { result } = renderHook(() => useEventQuote(1), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateEventQuote", () => {
  it("creates an event quote", async () => {
    const { result } = renderHook(() => useCreateEventQuote(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate({
        event: 1,
        template: 1,
      });
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe("Quote actions", () => {
  it("sends a quote", async () => {
    const { result } = renderHook(() => useSendQuote(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it("accepts a quote", async () => {
    const { result } = renderHook(() => useAcceptQuote(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 1, notes: "Accepted" });
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it("rejects a quote", async () => {
    const { result } = renderHook(() => useRejectQuote(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate({ id: 1, notes: "Too expensive" });
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it("duplicates a quote", async () => {
    const { result } = renderHook(() => useDuplicateQuote(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });

  it("signs a quote", async () => {
    const { result } = renderHook(() => useSignQuote(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate({
        id: 1,
        data: { signature_data: "base64signaturedata" },
      });
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe("useQuoteLineItems", () => {
  it("fetches line items", async () => {
    const { result } = renderHook(() => useQuoteLineItems(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateQuoteLineItem", () => {
  it("creates a line item", async () => {
    const { result } = renderHook(() => useCreateQuoteLineItem(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate({
        quote: 1,
        description: "Photography Package",
        quantity: 1,
        unit_price: "25000.00",
      });
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe("useDeleteQuoteLineItem", () => {
  it("deletes a line item", async () => {
    const { result } = renderHook(() => useDeleteQuoteLineItem(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate(1);
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});

describe("useQuoteActivities", () => {
  it("fetches quote activities", async () => {
    const { result } = renderHook(() => useQuoteActivities(1), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
    expect(Array.isArray(result.current.data)).toBe(true);
  });
});

describe("useQuoteReminders", () => {
  it("fetches quote reminders", async () => {
    const { result } = renderHook(() => useQuoteReminders(1), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
  });
});

describe("useCreateQuoteReminder", () => {
  it("creates a quote reminder", async () => {
    const { result } = renderHook(() => useCreateQuoteReminder(), {
      wrapper: createTestWrapper(),
    });

    act(() => {
      result.current.mutate({
        quoteId: 1,
        data: {
          scheduled_date: "2024-12-15",
          message: "Follow up on quote",
        },
      });
    });

    await waitFor(
      () => {
        expect(result.current.isSuccess).toBe(true);
      },
      { timeout: 5000 },
    );
  });
});
