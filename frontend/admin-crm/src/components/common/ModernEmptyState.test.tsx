import { describe, it, expect, vi } from "vitest"
import { screen, fireEvent } from "@testing-library/react"
import { renderWithProviders } from "../../test/utils/render"
import { ModernEmptyState } from "./ModernEmptyState"

describe("ModernEmptyState", () => {
  it("renders title and description text", () => {
    renderWithProviders(
      <ModernEmptyState
        title="No Events Found"
        description="You have not created any events yet."
      />
    )
    expect(screen.getByText("No Events Found")).toBeInTheDocument()
    expect(screen.getByText("You have not created any events yet.")).toBeInTheDocument()
  })

  it("renders primary action button and calls onClick when clicked", () => {
    const handleClick = vi.fn()
    renderWithProviders(
      <ModernEmptyState
        title="No Events"
        description="Get started"
        primaryAction={{
          label: "Create Event",
          onClick: handleClick,
        }}
      />
    )
    const button = screen.getByRole("button", { name: /create event/i })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("renders secondary action button when provided", () => {
    const handleSecondary = vi.fn()
    renderWithProviders(
      <ModernEmptyState
        title="No Events"
        description="Get started"
        primaryAction={{ label: "Create", onClick: vi.fn() }}
        secondaryAction={{ label: "Import Data", onClick: handleSecondary }}
      />
    )
    const button = screen.getByRole("button", { name: /import data/i })
    expect(button).toBeInTheDocument()
    fireEvent.click(button)
    expect(handleSecondary).toHaveBeenCalledTimes(1)
  })

  it("shows tip text when provided", () => {
    renderWithProviders(
      <ModernEmptyState
        title="No Results"
        description="Nothing here"
        tip={{ text: "Try broadening your search criteria" }}
      />
    )
    expect(screen.getByText("Try broadening your search criteria")).toBeInTheDocument()
  })

  it("does not render primary action button when not provided", () => {
    renderWithProviders(
      <ModernEmptyState
        title="Empty State"
        description="Nothing to display"
      />
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders only secondary action when no primary action provided", () => {
    renderWithProviders(
      <ModernEmptyState
        title="Empty State"
        description="Nothing to display"
        secondaryAction={{ label: "Learn More", onClick: vi.fn() }}
      />
    )
    const buttons = screen.getAllByRole("button")
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAccessibleName(/learn more/i)
  })

  it("shows tip label type text based on tip type", () => {
    renderWithProviders(
      <ModernEmptyState
        title="No Results"
        description="Nothing here"
        tip={{ text: "A helpful tip", type: "info" }}
      />
    )
    expect(screen.getByText("Tip")).toBeInTheDocument()
    expect(screen.getByText("A helpful tip")).toBeInTheDocument()
  })
})
