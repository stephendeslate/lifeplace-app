// frontend/admin-crm/src/hooks/useBookingFlows.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useBookingFlows,
  useBookingFlowSteps,
  useBookingFlowStepConfiguration,
  useBookingSessions,
  useBookingFlowAnalytics,
  useBookingFlowPaymentGateways,
} from "./useBookingFlows";
import { createTestWrapper } from "../test/utils/render";
import { server } from "../test/mocks/server";
import { http, HttpResponse } from "msw";

const BASE_URL = "http://localhost:8000/api";

describe("useBookingFlows", () => {
  describe("Query Operations", () => {
    it("fetches booking flows successfully", async () => {
      const { result } = renderHook(() => useBookingFlows(), {
        wrapper: createTestWrapper(),
      });

      expect(result.current.isLoadingFlows).toBe(true);

      await waitFor(
        () => {
          expect(result.current.isLoadingFlows).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.bookingFlows.length).toBeGreaterThan(0);
      expect(result.current.totalCount).toBeGreaterThan(0);
      expect(result.current.bookingFlows[0]).toHaveProperty("name");
      expect(result.current.bookingFlows[0]).toHaveProperty("is_active");
    });

    it("handles API error gracefully", async () => {
      server.use(
        http.get(`${BASE_URL}/bookingflow/flows/`, () => {
          return HttpResponse.json({ detail: "Server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useBookingFlows(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.flowsError).toBeTruthy();
        },
        { timeout: 5000 },
      );

      expect(result.current.isLoadingFlows).toBe(false);
    });

    it("returns pagination metadata", async () => {
      const { result } = renderHook(() => useBookingFlows(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingFlows).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(typeof result.current.totalCount).toBe("number");
      expect(typeof result.current.pageCount).toBe("number");
      expect(result.current.pageCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Mutation Operations", () => {
    it("creates a booking flow", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useBookingFlows(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingFlows).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.createFlow({
          name: "New Test Flow",
          description: "Test description",
          event_type: 1,
          is_active: true,
        });
      });

      await waitFor(
        () => {
          expect(result.current.isCreatingFlow).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.createError).toBeFalsy();
    });

    it("handles create flow error", async () => {
      server.use(
        http.post(`${BASE_URL}/bookingflow/flows/`, () => {
          return HttpResponse.json(
            { detail: "Validation error" },
            { status: 400 },
          );
        }),
      );

      const { result } = renderHook(() => useBookingFlows(), {
        wrapper: createTestWrapper(),
      });

      await waitFor(
        () => {
          expect(result.current.isLoadingFlows).toBe(false);
        },
        { timeout: 5000 },
      );

      act(() => {
        result.current.createFlow({
          name: "",
          event_type: 1,
        });
      });

      await waitFor(
        () => {
          expect(result.current.createError).toBeTruthy();
        },
        { timeout: 5000 },
      );
    });

    it("updates a booking flow", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useBookingFlows(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingFlows).toBe(false);
          expect(result.current.bookingFlows.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const flow = result.current.bookingFlows[0];

      act(() => {
        result.current.updateFlow({
          id: flow.id,
          data: { name: "Updated Flow" },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isUpdatingFlow).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.updateError).toBeFalsy();
    });

    it("deletes a booking flow", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useBookingFlows(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingFlows).toBe(false);
          expect(result.current.bookingFlows.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const flow = result.current.bookingFlows[0];

      act(() => {
        result.current.deleteFlow(flow.id);
      });

      await waitFor(
        () => {
          expect(result.current.isDeletingFlow).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.deleteError).toBeFalsy();
    });

    it("duplicates a booking flow", async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useBookingFlows(), { wrapper });

      await waitFor(
        () => {
          expect(result.current.isLoadingFlows).toBe(false);
          expect(result.current.bookingFlows.length).toBeGreaterThan(0);
        },
        { timeout: 5000 },
      );

      const flow = result.current.bookingFlows[0];

      act(() => {
        result.current.duplicateFlow({
          id: flow.id,
          data: { name: "Duplicated Flow" },
        });
      });

      await waitFor(
        () => {
          expect(result.current.isDuplicatingFlow).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.duplicateError).toBeFalsy();
    });
  });
});

describe("useBookingFlowSteps", () => {
  it("fetches booking flow steps successfully", async () => {
    const { result } = renderHook(() => useBookingFlowSteps(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoadingSteps).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoadingSteps).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.steps.length).toBeGreaterThan(0);
    expect(result.current.steps[0]).toHaveProperty("step_type");
    expect(result.current.steps[0]).toHaveProperty("order");
  });

  it("handles steps API error", async () => {
    server.use(
      http.get(`${BASE_URL}/bookingflow/steps/`, () => {
        return HttpResponse.json({ detail: "Server error" }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useBookingFlowSteps(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.stepsError).toBeTruthy();
      },
      { timeout: 5000 },
    );
  });

  it("creates a step", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useBookingFlowSteps(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingSteps).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.createStep({
        booking_flow: 1,
        step_type: "introduction",
        order: 1,
        is_enabled: true,
        is_required: true,
      });
    });

    await waitFor(
      () => {
        expect(result.current.isCreatingStep).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.createStepError).toBeFalsy();
  });

  it("updates a step", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useBookingFlowSteps(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingSteps).toBe(false);
        expect(result.current.steps.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const step = result.current.steps[0];

    act(() => {
      result.current.updateStep({ id: step.id, data: { is_enabled: false } });
    });

    await waitFor(
      () => {
        expect(result.current.isUpdatingStep).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.updateStepError).toBeFalsy();
  });

  it("deletes a step", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useBookingFlowSteps(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingSteps).toBe(false);
        expect(result.current.steps.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.deleteStep(result.current.steps[0].id);
    });

    await waitFor(
      () => {
        expect(result.current.isDeletingStep).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.deleteStepError).toBeFalsy();
  });

  it("reorders steps", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useBookingFlowSteps(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingSteps).toBe(false);
        expect(result.current.steps.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const stepIds = result.current.steps.map((s) => s.id).reverse();

    act(() => {
      result.current.reorderSteps({ step_ids: stepIds });
    });

    await waitFor(
      () => {
        expect(result.current.isReorderingSteps).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.reorderStepsError).toBeFalsy();
  });
});

describe("useBookingFlowStepConfiguration", () => {
  it("returns configuration hooks and mutation actions", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useBookingFlowStepConfiguration(), {
      wrapper,
    });

    // The hook returns sub-hooks and mutation functions
    expect(result.current.useStepConfiguration).toBeDefined();
    expect(result.current.useStepValidationRules).toBeDefined();
    expect(result.current.useAvailabilitySettings).toBeDefined();
    expect(result.current.usePaymentOptions).toBeDefined();
    expect(result.current.updateConfiguration).toBeDefined();
    expect(result.current.assignQuestionnaires).toBeDefined();
    expect(result.current.updatePaymentTerms).toBeDefined();
    expect(result.current.isUpdatingConfiguration).toBe(false);
    expect(result.current.isAssigningQuestionnaires).toBe(false);
  });

  it("updates step configuration", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useBookingFlowStepConfiguration(), {
      wrapper,
    });

    act(() => {
      result.current.updateConfiguration({
        stepId: 1,
        data: { some_config: "value" },
      });
    });

    await waitFor(
      () => {
        expect(result.current.isUpdatingConfiguration).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.updateConfigurationError).toBeFalsy();
  });
});

describe("useBookingSessions", () => {
  it("fetches booking sessions", async () => {
    const { result } = renderHook(() => useBookingSessions(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoadingSessions).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoadingSessions).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(Array.isArray(result.current.sessions)).toBe(true);
  });

  it("creates a session", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useBookingSessions(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingSessions).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.createSession({ booking_flow: 1 });
    });

    await waitFor(
      () => {
        expect(result.current.isCreatingSession).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.createSessionError).toBeFalsy();
  });

  it("completes a booking", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useBookingSessions(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingSessions).toBe(false);
      },
      { timeout: 5000 },
    );

    // Need a session first
    if (result.current.sessions.length > 0) {
      act(() => {
        result.current.completeBooking(result.current.sessions[0].id);
      });

      await waitFor(
        () => {
          expect(result.current.isCompletingBooking).toBe(false);
        },
        { timeout: 5000 },
      );

      expect(result.current.completeBookingError).toBeFalsy();
    }
  });
});

describe("useBookingFlowAnalytics", () => {
  it("fetches analytics data", async () => {
    const { result } = renderHook(() => useBookingFlowAnalytics(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.isLoadingAnalytics).toBe(true);

    await waitFor(
      () => {
        expect(result.current.isLoadingAnalytics).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(Array.isArray(result.current.analytics)).toBe(true);
    expect(result.current.analyticsError).toBeFalsy();
  });

  it("updates daily analytics", async () => {
    const wrapper = createTestWrapper();
    const { result } = renderHook(() => useBookingFlowAnalytics(), { wrapper });

    await waitFor(
      () => {
        expect(result.current.isLoadingAnalytics).toBe(false);
      },
      { timeout: 5000 },
    );

    act(() => {
      result.current.updateDailyAnalytics({ flowId: 1 });
    });

    await waitFor(
      () => {
        expect(result.current.isUpdatingAnalytics).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.updateAnalyticsError).toBeFalsy();
  });
});

describe("useBookingFlowPaymentGateways", () => {
  it("returns sub-hooks for payment gateways", () => {
    const { result } = renderHook(() => useBookingFlowPaymentGateways(), {
      wrapper: createTestWrapper(),
    });

    expect(result.current.useFlowPaymentGateways).toBeDefined();
    expect(result.current.usePublicPaymentGateways).toBeDefined();
  });

  it("fetches flow payment gateways via sub-hook", async () => {
    const wrapper = createTestWrapper();
    const { result: parentResult } = renderHook(
      () => useBookingFlowPaymentGateways(),
      { wrapper },
    );

    const { result } = renderHook(
      () => parentResult.current.useFlowPaymentGateways(1),
      { wrapper },
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.data).toBeDefined();
    expect(result.current.data).toHaveProperty("available_gateways");
  });
});
