import { describe, it, expect } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { server } from "../test/mocks/server";
import { createTestWrapper } from "../test/utils/render";
import {
  useTemplateVariables,
  useFilteredVariables,
  getVariableGroupTitle,
  getVariableGroupColor,
  getVariableGroupIcon,
  getVariableLabel,
  getVariablesForContext,
  getContextTypeOptions,
} from "./useTemplateVariables";
import type { VariableSchemas, ContextType } from "../types/templates.types";

const BASE_URL = "http://localhost:8000/api";

const mockSchemas = {
  context_types: {
    CLIENT: {
      label: "Client",
      required_objects: ["client"],
      description: "For client-focused communications",
    },
    EVENT: {
      label: "Event",
      required_objects: ["event", "client"],
      description: "For event-related communications",
    },
  },
  variable_groups: {
    client: {
      label: "Client",
      icon: "person",
      available_in: ["CLIENT", "EVENT"],
      variables: {
        client_first_name: {
          description: "First name of the client",
          required: true,
        },
        client_email: {
          description: "Email of the client",
          required: false,
        },
      },
    },
    event: {
      label: "Event",
      icon: "event",
      available_in: ["EVENT"],
      variables: {
        event_name: {
          description: "Name of the event",
          required: true,
        },
      },
    },
  },
} as unknown as VariableSchemas;

describe("getVariableGroupTitle", () => {
  it("returns correct titles for known group keys", () => {
    expect(getVariableGroupTitle("client")).toBe("Client");
    expect(getVariableGroupTitle("event")).toBe("Event");
    expect(getVariableGroupTitle("financial")).toBe("Financial");
    expect(getVariableGroupTitle("urls")).toBe("Links");
    expect(getVariableGroupTitle("client_variables")).toBe(
      "Client Information",
    );
    expect(getVariableGroupTitle("signature_variables")).toBe(
      "Signature Placeholders",
    );
  });

  it("converts unknown keys to title case with underscores as spaces", () => {
    expect(getVariableGroupTitle("custom_group_name")).toBe(
      "Custom Group Name",
    );
    expect(getVariableGroupTitle("unknown")).toBe("Unknown");
  });
});

describe("getVariableGroupColor", () => {
  it("returns correct colors for known group keys", () => {
    expect(getVariableGroupColor("client")).toBe("secondary");
    expect(getVariableGroupColor("event")).toBe("primary");
    expect(getVariableGroupColor("financial")).toBe("success");
    expect(getVariableGroupColor("booking")).toBe("info");
    expect(getVariableGroupColor("quote")).toBe("warning");
    expect(getVariableGroupColor("admin")).toBe("error");
  });

  it("returns primary as default for unknown keys", () => {
    expect(getVariableGroupColor("unknown_group")).toBe("primary");
    expect(getVariableGroupColor("custom")).toBe("primary");
  });
});

describe("getVariableGroupIcon", () => {
  it("returns correct icons for known group keys", () => {
    expect(getVariableGroupIcon("client")).toBe("person");
    expect(getVariableGroupIcon("event")).toBe("event");
    expect(getVariableGroupIcon("financial")).toBe("payments");
    expect(getVariableGroupIcon("admin")).toBe("admin_panel_settings");
    expect(getVariableGroupIcon("urls")).toBe("link");
    expect(getVariableGroupIcon("payment")).toBe("credit_card");
  });

  it("returns help as default icon for unknown keys", () => {
    expect(getVariableGroupIcon("unknown_group")).toBe("help");
    expect(getVariableGroupIcon("custom")).toBe("help");
  });
});

describe("getVariableLabel", () => {
  it("converts snake_case to Title Case", () => {
    expect(getVariableLabel("client_first_name")).toBe("Client First Name");
    expect(getVariableLabel("event_name")).toBe("Event Name");
    expect(getVariableLabel("total_amount")).toBe("Total Amount");
  });

  it("handles single word variables", () => {
    expect(getVariableLabel("email")).toBe("Email");
    expect(getVariableLabel("name")).toBe("Name");
  });
});

describe("getVariablesForContext", () => {
  it("returns empty array for undefined schemas", () => {
    expect(getVariablesForContext(undefined, "EVENT" as ContextType)).toEqual(
      [],
    );
  });

  it("returns empty array for schemas without variable_groups", () => {
    const emptySchemas = { context_types: {} } as unknown as VariableSchemas;
    expect(
      getVariablesForContext(emptySchemas, "EVENT" as ContextType),
    ).toEqual([]);
  });

  it("returns variables available in the given context type", () => {
    const result = getVariablesForContext(mockSchemas, "EVENT" as ContextType);

    // Both client and event groups are available_in event_confirmation
    expect(result).toHaveLength(3);
    expect(result.map((v) => v.name)).toContain("client_first_name");
    expect(result.map((v) => v.name)).toContain("client_email");
    expect(result.map((v) => v.name)).toContain("event_name");
  });

  it("filters out groups not available in context type", () => {
    const result = getVariablesForContext(mockSchemas, "CLIENT" as ContextType);

    // Only client group is available_in invoice_reminder
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.name)).toContain("client_first_name");
    expect(result.map((v) => v.name)).toContain("client_email");
    expect(result.map((v) => v.name)).not.toContain("event_name");
  });

  it("includes correct group metadata in returned variables", () => {
    const result = getVariablesForContext(mockSchemas, "EVENT" as ContextType);
    const clientVar = result.find((v) => v.name === "client_first_name");

    expect(clientVar).toBeDefined();
    expect(clientVar!.group).toBe("client");
    expect(clientVar!.groupLabel).toBe("Client");
    expect(clientVar!.description).toBe("First name of the client");
    expect(clientVar!.required).toBe(true);
  });
});

describe("getContextTypeOptions", () => {
  it("returns empty array for undefined schemas", () => {
    expect(getContextTypeOptions(undefined)).toEqual([]);
  });

  it("returns options from schemas context_types", () => {
    const result = getContextTypeOptions(mockSchemas);

    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      value: "CLIENT",
      label: "Client",
      description: "For client-focused communications",
    });
    expect(result).toContainEqual({
      value: "EVENT",
      label: "Event",
      description: "For event-related communications",
    });
  });
});

describe("useTemplateVariables", () => {
  it("calls the communications API for communications domain", async () => {
    server.use(
      http.get(`${BASE_URL}/communications/templates/variable_schemas/`, () => {
        return HttpResponse.json(mockSchemas);
      }),
    );

    const wrapper = createTestWrapper({ withAuth: false, withRouter: false });
    const { result } = renderHook(
      () => useTemplateVariables("communications"),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
    expect(result.current.data?.variable_groups).toBeDefined();
  });

  it("calls the contracts API for contracts domain", async () => {
    server.use(
      http.get(`${BASE_URL}/contracts/templates/variable_schemas/`, () => {
        return HttpResponse.json(mockSchemas);
      }),
    );

    const wrapper = createTestWrapper({ withAuth: false, withRouter: false });
    const { result } = renderHook(() => useTemplateVariables("contracts"), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toBeDefined();
  });
});

describe("useFilteredVariables", () => {
  it("returns filtered groups based on context type", async () => {
    server.use(
      http.get(`${BASE_URL}/communications/templates/variable_schemas/`, () => {
        return HttpResponse.json(mockSchemas);
      }),
    );

    const wrapper = createTestWrapper({ withAuth: false, withRouter: false });
    const { result } = renderHook(
      () => useFilteredVariables("communications", "CLIENT" as ContextType),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Only client group should be in filteredGroups for invoice_reminder
    expect(result.current.filteredGroups).toBeDefined();
    expect(result.current.filteredGroups.client).toBeDefined();
    expect(result.current.filteredGroups.event).toBeUndefined();
  });
});
