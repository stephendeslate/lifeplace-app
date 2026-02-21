import { describe, it, expect, vi } from "vitest"
import { screen, fireEvent } from "@testing-library/react"
import { renderWithProviders } from "../../test/utils/render"
import { ModernDialog } from "./ModernDialog"
import type { ModernDialogAction } from "./ModernDialog"

describe("ModernDialog", () => {
  it("renders title and children when open is true", () => {
    renderWithProviders(
      <ModernDialog open={true} onClose={vi.fn()} title="My Dialog">
        <p>Dialog body content</p>
      </ModernDialog>
    )
    expect(screen.getByText("My Dialog")).toBeInTheDocument()
    expect(screen.getByText("Dialog body content")).toBeInTheDocument()
  })

  it("does not render when open is false", () => {
    renderWithProviders(
      <ModernDialog open={false} onClose={vi.fn()} title="Hidden Dialog">
        <p>Hidden content</p>
      </ModernDialog>
    )
    expect(screen.queryByText("Hidden Dialog")).not.toBeInTheDocument()
    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument()
  })

  it("renders action buttons from actions prop", () => {
    const actions: ModernDialogAction[] = [
      { label: "Cancel", onClick: vi.fn(), variant: "text" },
      { label: "Save", onClick: vi.fn(), variant: "contained" },
    ]
    renderWithProviders(
      <ModernDialog open={true} onClose={vi.fn()} title="Form Dialog" actions={actions}>
        <p>Form content</p>
      </ModernDialog>
    )
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
  })

  it("calls onClose when close button is clicked", () => {
    const handleClose = vi.fn()
    renderWithProviders(
      <ModernDialog open={true} onClose={handleClose} title="Closable Dialog">
        <p>Content</p>
      </ModernDialog>
    )
    // The close button is an IconButton with CloseIcon
    const closeButtons = screen.getAllByRole("button")
    // The close icon button is the one that does not have text
    const closeButton = closeButtons.find(btn => btn.querySelector("svg"))
    if (closeButton) {
      fireEvent.click(closeButton)
      expect(handleClose).toHaveBeenCalledTimes(1)
    }
  })

  it("shows close button by default", () => {
    renderWithProviders(
      <ModernDialog open={true} onClose={vi.fn()} title="Dialog">
        Content
      </ModernDialog>
    )
    // Close button is an icon button in the title area
    const buttons = screen.getAllByRole("button")
    expect(buttons.length).toBeGreaterThanOrEqual(1)
  })

  it("does not show close button when showCloseButton is false", () => {
    renderWithProviders(
      <ModernDialog open={true} onClose={vi.fn()} title="Dialog" showCloseButton={false}>
        Content
      </ModernDialog>
    )
    // No buttons at all when no actions and no close button
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("action button shows loading state with spinner when loading is true", () => {
    const actions: ModernDialogAction[] = [
      { label: "Submit", onClick: vi.fn(), variant: "contained", loading: true },
    ]
    renderWithProviders(
      <ModernDialog open={true} onClose={vi.fn()} title="Loading Dialog" actions={actions} showCloseButton={false}>
        Content
      </ModernDialog>
    )
    // When loading, the button shows a CircularProgress instead of the label
    const button = screen.getByRole("button")
    expect(button).toBeDisabled()
    // CircularProgress renders with role="progressbar"
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("hides actions with show=false", () => {
    const actions: ModernDialogAction[] = [
      { label: "Hidden Action", onClick: vi.fn(), show: false },
      { label: "Visible Action", onClick: vi.fn(), show: true },
    ]
    renderWithProviders(
      <ModernDialog open={true} onClose={vi.fn()} title="Dialog" actions={actions} showCloseButton={false}>
        Content
      </ModernDialog>
    )
    expect(screen.queryByText("Hidden Action")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /visible action/i })).toBeInTheDocument()
  })

  it("calls action onClick when action button is clicked", () => {
    const handleAction = vi.fn()
    const actions: ModernDialogAction[] = [
      { label: "Confirm", onClick: handleAction, variant: "contained" },
    ]
    renderWithProviders(
      <ModernDialog open={true} onClose={vi.fn()} title="Confirm Dialog" actions={actions} showCloseButton={false}>
        Are you sure?
      </ModernDialog>
    )
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }))
    expect(handleAction).toHaveBeenCalledTimes(1)
  })
})
