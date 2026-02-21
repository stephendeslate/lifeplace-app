import { describe, it, expect, vi } from "vitest"
import { screen, fireEvent, render } from "@testing-library/react"
import React from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles"
import { ThemeProvider as AppThemeProvider } from "../../contexts/ThemeContext"
import { LayoutProvider } from "../../contexts/LayoutContext"
import { ToastProvider } from "../../contexts/ToastContext"
import { AuthProvider } from "../../contexts/AuthContext"
import { MemoryRouter } from "react-router-dom"
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider"
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns"
import { modernTheme } from "../../design-system/theme/modernTheme"
import { ModernPageHeader } from "./ModernPageHeader"

// ModernPageHeader uses useThemeColors which requires the custom AppThemeProvider
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <MuiThemeProvider theme={modernTheme}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <MemoryRouter>
                <AuthProvider>
                  <LayoutProvider>
                    <ToastProvider>{children}</ToastProvider>
                  </LayoutProvider>
                </AuthProvider>
              </MemoryRouter>
            </LocalizationProvider>
          </MuiThemeProvider>
        </AppThemeProvider>
      </QueryClientProvider>
    )
  }
}

function renderHeader(ui: React.ReactElement) {
  return render(ui, { wrapper: createWrapper() })
}

describe("ModernPageHeader", () => {
  it("renders title text", () => {
    renderHeader(<ModernPageHeader title="Events Management" />)
    expect(screen.getByText("Events Management")).toBeInTheDocument()
  })

  it("renders subtitle when provided", () => {
    renderHeader(
      <ModernPageHeader
        title="Events"
        subtitle="Manage all your events in one place"
      />
    )
    expect(screen.getByText("Manage all your events in one place")).toBeInTheDocument()
  })

  it("does not render subtitle when not provided", () => {
    renderHeader(<ModernPageHeader title="Events" />)
    expect(screen.queryByText(/manage all your events/i)).not.toBeInTheDocument()
  })

  it("renders primary action button with correct label", () => {
    renderHeader(
      <ModernPageHeader
        title="Events"
        primaryAction={{
          label: "Add Event",
          onClick: vi.fn(),
          variant: "contained",
        }}
      />
    )
    expect(screen.getByRole("button", { name: /add event/i })).toBeInTheDocument()
  })

  it("calls onClick when primary action button is clicked", () => {
    const handleClick = vi.fn()
    renderHeader(
      <ModernPageHeader
        title="Events"
        primaryAction={{
          label: "Add Event",
          onClick: handleClick,
          variant: "contained",
        }}
      />
    )
    fireEvent.click(screen.getByRole("button", { name: /add event/i }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it("renders status chip when status is provided", () => {
    renderHeader(
      <ModernPageHeader
        title="Events"
        status={{ label: "Active", color: "success" }}
      />
    )
    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("does not render status chip when status is not provided", () => {
    renderHeader(<ModernPageHeader title="Events" />)
    expect(screen.queryByText("Active")).not.toBeInTheDocument()
  })

  it("renders secondary action buttons when provided", () => {
    renderHeader(
      <ModernPageHeader
        title="Events"
        secondaryActions={[
          { label: "Export", onClick: vi.fn(), variant: "outlined" },
          { label: "Filter", onClick: vi.fn(), variant: "outlined" },
        ]}
      />
    )
    expect(screen.getByRole("button", { name: /export/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /filter/i })).toBeInTheDocument()
  })

  it("renders stats when provided", () => {
    renderHeader(
      <ModernPageHeader
        title="Events"
        stats={[
          { label: "Total Events", value: 42 },
          { label: "This Month", value: 15 },
        ]}
      />
    )
    expect(screen.getByText("42")).toBeInTheDocument()
    expect(screen.getByText("Total Events")).toBeInTheDocument()
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("This Month")).toBeInTheDocument()
  })
})
