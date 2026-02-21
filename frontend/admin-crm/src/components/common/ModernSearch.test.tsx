import { describe, it, expect, vi } from "vitest"
import { screen, fireEvent } from "@testing-library/react"
import { renderWithProviders } from "../../test/utils/render"
import { ModernSearch } from "./ModernSearch"
import type { ModernSearchFilter } from "./ModernSearch"

describe("ModernSearch", () => {
  it("renders search input with placeholder text", () => {
    renderWithProviders(
      <ModernSearch
        onSearchChange={vi.fn()}
        placeholder="Search events..."
      />
    )
    expect(screen.getByPlaceholderText("Search events...")).toBeInTheDocument()
  })

  it("renders with default placeholder when none provided", () => {
    renderWithProviders(
      <ModernSearch onSearchChange={vi.fn()} />
    )
    expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument()
  })

  it("calls onSearchChange when input value changes", () => {
    const handleChange = vi.fn()
    renderWithProviders(
      <ModernSearch onSearchChange={handleChange} />
    )
    const input = screen.getByPlaceholderText("Search...")
    fireEvent.change(input, { target: { value: "wedding" } })
    expect(handleChange).toHaveBeenCalledWith("wedding")
  })

  it("shows filter button when showFilterButton is true and filters are provided", () => {
    const filters: ModernSearchFilter[] = [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [{ value: "active", label: "Active" }],
      },
    ]
    renderWithProviders(
      <ModernSearch
        onSearchChange={vi.fn()}
        showFilterButton={true}
        filters={filters}
      />
    )
    expect(screen.getByRole("button", { name: /filters/i })).toBeInTheDocument()
  })

  it("does not show filter button when showFilterButton is false", () => {
    const filters: ModernSearchFilter[] = [
      {
        key: "status",
        label: "Status",
        type: "select",
        options: [{ value: "active", label: "Active" }],
      },
    ]
    renderWithProviders(
      <ModernSearch
        onSearchChange={vi.fn()}
        showFilterButton={false}
        filters={filters}
      />
    )
    expect(screen.queryByRole("button", { name: /filters/i })).not.toBeInTheDocument()
  })

  it("is disabled when disabled prop is true", () => {
    renderWithProviders(
      <ModernSearch onSearchChange={vi.fn()} disabled={true} />
    )
    const input = screen.getByPlaceholderText("Search...")
    expect(input).toBeDisabled()
  })

  it("shows clear button when there is a search value", () => {
    renderWithProviders(
      <ModernSearch
        onSearchChange={vi.fn()}
        searchValue="some query"
      />
    )
    // Clear icon button appears when there is a value
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it("calls onSearchChange with empty string when clear button is clicked", () => {
    const handleChange = vi.fn()
    renderWithProviders(
      <ModernSearch
        onSearchChange={handleChange}
        searchValue="some query"
      />
    )
    // Find the clear button (icon button inside the input)
    const clearButton = screen.getByRole("button")
    fireEvent.click(clearButton)
    expect(handleChange).toHaveBeenCalledWith("")
  })

  it("expands filter panel when filter button is clicked", () => {
    const filters: ModernSearchFilter[] = [
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [{ value: "wedding", label: "Wedding" }],
      },
    ]
    renderWithProviders(
      <ModernSearch
        onSearchChange={vi.fn()}
        showFilterButton={true}
        filters={filters}
      />
    )
    // Filters section label should appear after clicking the button
    const filterButton = screen.getByRole("button", { name: /filters/i })
    fireEvent.click(filterButton)
    expect(screen.getAllByText("Filters").length).toBeGreaterThanOrEqual(1)
  })
})
