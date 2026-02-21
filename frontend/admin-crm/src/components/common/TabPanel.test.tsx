import { describe, it, expect } from "vitest"
import { screen } from "@testing-library/react"
import { renderWithProviders } from "../../test/utils/render"
import { TabPanel, a11yTabProps, a11yTabPanelProps } from "./TabPanel"

describe("TabPanel", () => {
  it("renders children when value equals index", () => {
    renderWithProviders(
      <TabPanel value={2} index={2}>
        <span>Active Panel Content</span>
      </TabPanel>
    )
    expect(screen.getByText("Active Panel Content")).toBeInTheDocument()
  })

  it("returns null and does not render content when value does not equal index and keepMounted is false", () => {
    renderWithProviders(
      <TabPanel value={0} index={1} keepMounted={false}>
        <span>Hidden Panel Content</span>
      </TabPanel>
    )
    // Component returns null, so there is no tabpanel role and no content
    expect(screen.queryByText("Hidden Panel Content")).not.toBeInTheDocument()
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument()
  })

  it("renders hidden content when keepMounted is true and panel is inactive", () => {
    renderWithProviders(
      <TabPanel value={0} index={1} keepMounted={true}>
        <span>Mounted But Hidden</span>
      </TabPanel>
    )
    const panel = screen.getByRole("tabpanel", { hidden: true })
    expect(panel).toBeInTheDocument()
    expect(panel).toHaveAttribute("hidden")
    expect(screen.getByText("Mounted But Hidden")).toBeInTheDocument()
  })

  it("has role tabpanel attribute", () => {
    renderWithProviders(
      <TabPanel value={0} index={0}>
        <span>Content</span>
      </TabPanel>
    )
    expect(screen.getByRole("tabpanel")).toBeInTheDocument()
  })

  it("uses default id and aria-labelledby based on index", () => {
    renderWithProviders(
      <TabPanel value={3} index={3}>
        Content
      </TabPanel>
    )
    const panel = screen.getByRole("tabpanel")
    expect(panel).toHaveAttribute("id", "tabpanel-3")
    expect(panel).toHaveAttribute("aria-labelledby", "tab-3")
  })

  it("uses custom id and aria-labelledby when provided", () => {
    renderWithProviders(
      <TabPanel value={0} index={0} id="my-panel" aria-labelledby="my-tab">
        Content
      </TabPanel>
    )
    const panel = screen.getByRole("tabpanel")
    expect(panel).toHaveAttribute("id", "my-panel")
    expect(panel).toHaveAttribute("aria-labelledby", "my-tab")
  })
})

describe("a11yTabProps", () => {
  it("returns correct id and aria-controls without prefix", () => {
    const props = a11yTabProps(2)
    expect(props.id).toBe("tab-2")
    expect(props["aria-controls"]).toBe("tabpanel-2")
  })

  it("returns correct id and aria-controls with prefix", () => {
    const props = a11yTabProps(1, "settings")
    expect(props.id).toBe("settings-tab-1")
    expect(props["aria-controls"]).toBe("settings-tabpanel-1")
  })
})

describe("a11yTabPanelProps", () => {
  it("returns correct id and aria-labelledby without prefix", () => {
    const props = a11yTabPanelProps(2)
    expect(props.id).toBe("tabpanel-2")
    expect(props["aria-labelledby"]).toBe("tab-2")
  })

  it("returns correct id and aria-labelledby with prefix", () => {
    const props = a11yTabPanelProps(1, "settings")
    expect(props.id).toBe("settings-tabpanel-1")
    expect(props["aria-labelledby"]).toBe("settings-tab-1")
  })
})
