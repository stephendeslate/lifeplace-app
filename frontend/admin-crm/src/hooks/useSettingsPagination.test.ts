import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSettingsPagination } from "./useSettingsPagination";

describe("useSettingsPagination", () => {
  it("has correct default initial state", () => {
    const { result } = renderHook(() => useSettingsPagination());

    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(25);
    expect(result.current.search).toBe("");
    expect(result.current.filters).toEqual({});
    expect(result.current.ordering).toBe("");
    expect(result.current.currentPage).toBe(0);
  });

  it("accepts custom defaultPageSize via options", () => {
    const { result } = renderHook(() =>
      useSettingsPagination({ defaultPageSize: 50 }),
    );

    expect(result.current.pageSize).toBe(50);
  });

  it("setSearch updates search and resets page to first", () => {
    const { result } = renderHook(() => useSettingsPagination());

    // Navigate to page 3 first
    act(() => {
      result.current.onPageChange(2);
    });
    expect(result.current.currentPage).toBe(2);
    expect(result.current.page).toBe(3);

    // Setting search should reset page
    act(() => {
      result.current.setSearch("test query");
    });

    expect(result.current.search).toBe("test query");
    expect(result.current.currentPage).toBe(0);
    expect(result.current.page).toBe(1);
  });

  it("setFilters updates filters and resets page to first", () => {
    const { result } = renderHook(() => useSettingsPagination());

    // Navigate to page 2 first
    act(() => {
      result.current.onPageChange(1);
    });
    expect(result.current.currentPage).toBe(1);

    // Setting filters should reset page
    act(() => {
      result.current.setFilters({ status: "active", category: "premium" });
    });

    expect(result.current.filters).toEqual({
      status: "active",
      category: "premium",
    });
    expect(result.current.currentPage).toBe(0);
    expect(result.current.page).toBe(1);
  });

  it("setOrdering updates ordering and resets page to first", () => {
    const { result } = renderHook(() => useSettingsPagination());

    // Navigate to page 4 first
    act(() => {
      result.current.onPageChange(3);
    });
    expect(result.current.currentPage).toBe(3);

    // Setting ordering should reset page
    act(() => {
      result.current.setOrdering("-created_at");
    });

    expect(result.current.ordering).toBe("-created_at");
    expect(result.current.currentPage).toBe(0);
    expect(result.current.page).toBe(1);
  });

  it("onPageChange updates currentPage and page correctly", () => {
    const { result } = renderHook(() => useSettingsPagination());

    act(() => {
      result.current.onPageChange(4);
    });

    expect(result.current.currentPage).toBe(4);
    expect(result.current.page).toBe(5); // 1-indexed for API
  });

  it("onPageSizeChange updates pageSize and resets page to first", () => {
    const { result } = renderHook(() => useSettingsPagination());

    // Navigate to page 3 first
    act(() => {
      result.current.onPageChange(2);
    });
    expect(result.current.currentPage).toBe(2);

    // Changing page size should reset page
    act(() => {
      result.current.onPageSizeChange(10);
    });

    expect(result.current.pageSize).toBe(10);
    expect(result.current.currentPage).toBe(0);
    expect(result.current.page).toBe(1);
  });

  it("chains multiple operations correctly", () => {
    const { result } = renderHook(() => useSettingsPagination());

    // Set search
    act(() => {
      result.current.setSearch("widgets");
    });
    expect(result.current.search).toBe("widgets");

    // Navigate to page 2
    act(() => {
      result.current.onPageChange(1);
    });
    expect(result.current.page).toBe(2);

    // Set filters (should reset page)
    act(() => {
      result.current.setFilters({ type: "widget" });
    });
    expect(result.current.page).toBe(1);
    expect(result.current.filters).toEqual({ type: "widget" });

    // Navigate again
    act(() => {
      result.current.onPageChange(3);
    });
    expect(result.current.page).toBe(4);

    // Change page size (should reset page)
    act(() => {
      result.current.onPageSizeChange(100);
    });
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(100);

    // Search is still preserved
    expect(result.current.search).toBe("widgets");
    expect(result.current.filters).toEqual({ type: "widget" });
  });
});
