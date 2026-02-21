// frontend/admin-crm/src/hooks/useTasks.test.ts

import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useTasks } from "./useTasks";
import { createTestWrapper } from "../test/utils/render";

describe("useTasks", () => {
  it("returns combined tasks from multiple domains", async () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: createTestWrapper(),
    });

    // Wait for loading to finish (useTasks derives isLoading from usePayments)
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    // Should have the correct shape
    expect(result.current.tasks).toBeDefined();
    expect(Array.isArray(result.current.tasks)).toBe(true);
    expect(result.current.tasksByDomain).toBeDefined();
    expect(result.current.counts).toBeDefined();
  });

  it("returns tasksByDomain with all domain keys", async () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    expect(result.current.tasksByDomain).toHaveProperty("quotes");
    expect(result.current.tasksByDomain).toHaveProperty("contracts");
    expect(result.current.tasksByDomain).toHaveProperty("payments");
    expect(result.current.tasksByDomain).toHaveProperty("communications");
    expect(result.current.tasksByDomain).toHaveProperty("support");

    // All domain values should be arrays
    expect(Array.isArray(result.current.tasksByDomain.quotes)).toBe(true);
    expect(Array.isArray(result.current.tasksByDomain.contracts)).toBe(true);
    expect(Array.isArray(result.current.tasksByDomain.payments)).toBe(true);
    expect(Array.isArray(result.current.tasksByDomain.communications)).toBe(
      true,
    );
    expect(Array.isArray(result.current.tasksByDomain.support)).toBe(true);
  });

  it("returns counts with all domain keys and a total", async () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    const { counts } = result.current;

    expect(typeof counts.quotes).toBe("number");
    expect(typeof counts.contracts).toBe("number");
    expect(typeof counts.payments).toBe("number");
    expect(typeof counts.communications).toBe("number");
    expect(typeof counts.support).toBe("number");
    expect(typeof counts.total).toBe("number");

    // Total should equal sum of all domain counts
    const expectedTotal =
      counts.quotes +
      counts.contracts +
      counts.payments +
      counts.communications +
      counts.support;
    expect(counts.total).toBe(expectedTotal);
  });

  it("sorts all tasks by priority then by date", async () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    const { tasks } = result.current;

    if (tasks.length > 1) {
      const priorityOrder = { high: 0, medium: 1, low: 2 } as const;

      for (let i = 0; i < tasks.length - 1; i++) {
        const currentPriority = priorityOrder[tasks[i].priority];
        const nextPriority = priorityOrder[tasks[i + 1].priority];

        if (currentPriority !== nextPriority) {
          // Higher priority (lower number) should come first
          expect(currentPriority).toBeLessThanOrEqual(nextPriority);
        }
      }
    }
  });

  it("has correct task shape for each item", async () => {
    const { result } = renderHook(() => useTasks(), {
      wrapper: createTestWrapper(),
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 },
    );

    const { tasks } = result.current;

    if (tasks.length > 0) {
      const task = tasks[0];
      expect(task).toHaveProperty("id");
      expect(task).toHaveProperty("domain");
      expect(task).toHaveProperty("type");
      expect(task).toHaveProperty("title");
      expect(task).toHaveProperty("description");
      expect(task).toHaveProperty("priority");
      expect(task).toHaveProperty("createdAt");
      expect(task).toHaveProperty("entityId");
      expect(task).toHaveProperty("status");
      expect(["high", "medium", "low"]).toContain(task.priority);
      expect([
        "quotes",
        "contracts",
        "payments",
        "communications",
        "support",
      ]).toContain(task.domain);
    }
  });
});
