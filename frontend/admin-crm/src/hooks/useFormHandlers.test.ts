import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useState } from "react";
import { useFormHandlers, useSimpleFormHandlers } from "./useFormHandlers";

interface TestForm {
  name: string;
  email: string;
  age: number;
  active: boolean;
  category: string;
}

const defaultForm: TestForm = {
  name: "",
  email: "",
  age: 0,
  active: false,
  category: "",
};

// Helper to render useFormHandlers with local state
function renderFormHandlers(
  initialData: TestForm = defaultForm,
  initialErrors: Record<string, string> = {},
) {
  return renderHook(() => {
    const [formData, setFormData] = useState<TestForm>(initialData);
    const [errors, setErrors] = useState<Record<string, string>>(initialErrors);
    const handlers = useFormHandlers(setFormData, errors, setErrors);
    return { formData, errors, ...handlers };
  });
}

// Helper to create a synthetic ChangeEvent
function inputEvent(value: string) {
  return { target: { value } } as React.ChangeEvent<HTMLInputElement>;
}

function checkboxEvent(checked: boolean) {
  return { target: { checked } } as React.ChangeEvent<HTMLInputElement>;
}

function selectEvent(value: unknown) {
  return {
    target: { value },
  } as unknown as import("@mui/material").SelectChangeEvent<unknown>;
}

describe("useFormHandlers", () => {
  describe("handleInputChange", () => {
    it("updates the specified field", () => {
      const { result } = renderFormHandlers();
      act(() => {
        result.current.handleInputChange("name")(inputEvent("Alice"));
      });
      expect(result.current.formData.name).toBe("Alice");
    });

    it("clears existing error for the field", () => {
      const { result } = renderFormHandlers(defaultForm, {
        name: "Name is required",
      });
      expect(result.current.errors.name).toBe("Name is required");

      act(() => {
        result.current.handleInputChange("name")(inputEvent("Alice"));
      });
      expect(result.current.errors.name).toBe("");
    });

    it("does not touch errors when field has no error", () => {
      const { result } = renderFormHandlers(defaultForm, {
        email: "Invalid email",
      });
      act(() => {
        result.current.handleInputChange("name")(inputEvent("Alice"));
      });
      // email error should remain
      expect(result.current.errors.email).toBe("Invalid email");
    });
  });

  describe("handleSwitchChange", () => {
    it("toggles to true", () => {
      const { result } = renderFormHandlers();
      act(() => {
        result.current.handleSwitchChange("active")(checkboxEvent(true));
      });
      expect(result.current.formData.active).toBe(true);
    });

    it("toggles to false", () => {
      const { result } = renderFormHandlers({ ...defaultForm, active: true });
      act(() => {
        result.current.handleSwitchChange("active")(checkboxEvent(false));
      });
      expect(result.current.formData.active).toBe(false);
    });
  });

  describe("handleSelectChange", () => {
    it("sets the selected value", () => {
      const { result } = renderFormHandlers();
      act(() => {
        result.current.handleSelectChange("category")(selectEvent("premium"));
      });
      expect(result.current.formData.category).toBe("premium");
    });

    it("clears error for the field", () => {
      const { result } = renderFormHandlers(defaultForm, {
        category: "Required",
      });
      act(() => {
        result.current.handleSelectChange("category")(selectEvent("basic"));
      });
      expect(result.current.errors.category).toBe("");
    });
  });

  describe("handleNumberChange", () => {
    it("parses a numeric value", () => {
      const { result } = renderFormHandlers();
      act(() => {
        result.current.handleNumberChange("age")(inputEvent("25"));
      });
      expect(result.current.formData.age).toBe(25);
    });

    it("sets 0 for empty string", () => {
      const { result } = renderFormHandlers({ ...defaultForm, age: 10 });
      act(() => {
        result.current.handleNumberChange("age")(inputEvent(""));
      });
      expect(result.current.formData.age).toBe(0);
    });

    it("sets 0 for NaN input", () => {
      const { result } = renderFormHandlers();
      act(() => {
        result.current.handleNumberChange("age")(inputEvent("abc"));
      });
      expect(result.current.formData.age).toBe(0);
    });

    it("clears error for the field", () => {
      const { result } = renderFormHandlers(defaultForm, {
        age: "Must be positive",
      });
      act(() => {
        result.current.handleNumberChange("age")(inputEvent("5"));
      });
      expect(result.current.errors.age).toBe("");
    });
  });

  describe("handleValueChange", () => {
    it("sets an arbitrary value", () => {
      const { result } = renderFormHandlers();
      act(() => {
        result.current.handleValueChange("name")("Custom Value");
      });
      expect(result.current.formData.name).toBe("Custom Value");
    });

    it("clears error for the field", () => {
      const { result } = renderFormHandlers(defaultForm, {
        name: "Invalid",
      });
      act(() => {
        result.current.handleValueChange("name")("Fixed");
      });
      expect(result.current.errors.name).toBe("");
    });
  });

  describe("setFieldValue", () => {
    it("sets a field directly", () => {
      const { result } = renderFormHandlers();
      act(() => {
        result.current.setFieldValue("email", "test@test.com" as never);
      });
      expect(result.current.formData.email).toBe("test@test.com");
    });
  });

  describe("setFieldError", () => {
    it("sets an error for a field", () => {
      const { result } = renderFormHandlers();
      act(() => {
        result.current.setFieldError("email", "Invalid email format");
      });
      expect(result.current.errors.email).toBe("Invalid email format");
    });
  });

  describe("clearErrors", () => {
    it("resets all errors", () => {
      const { result } = renderFormHandlers(defaultForm, {
        name: "Required",
        email: "Invalid",
      });
      act(() => {
        result.current.clearErrors();
      });
      expect(result.current.errors).toEqual({});
    });
  });

  describe("clearFieldError", () => {
    it("clears a specific field error", () => {
      const { result } = renderFormHandlers(defaultForm, {
        name: "Required",
        email: "Invalid",
      });
      act(() => {
        result.current.clearFieldError("name");
      });
      expect(result.current.errors.name).toBe("");
      expect(result.current.errors.email).toBe("Invalid");
    });
  });
});

describe("useSimpleFormHandlers", () => {
  function renderSimpleFormHandlers(initialData: TestForm = defaultForm) {
    return renderHook(() => {
      const [formData, setFormData] = useState<TestForm>(initialData);
      const handlers = useSimpleFormHandlers(setFormData);
      return { formData, ...handlers };
    });
  }

  it("handleInputChange updates field", () => {
    const { result } = renderSimpleFormHandlers();
    act(() => {
      result.current.handleInputChange("name")(inputEvent("Bob"));
    });
    expect(result.current.formData.name).toBe("Bob");
  });

  it("handleSwitchChange toggles field", () => {
    const { result } = renderSimpleFormHandlers();
    act(() => {
      result.current.handleSwitchChange("active")(checkboxEvent(true));
    });
    expect(result.current.formData.active).toBe(true);
  });

  it("handleSelectChange sets value", () => {
    const { result } = renderSimpleFormHandlers();
    act(() => {
      result.current.handleSelectChange("category")(selectEvent("vip"));
    });
    expect(result.current.formData.category).toBe("vip");
  });

  it("handleValueChange sets arbitrary value", () => {
    const { result } = renderSimpleFormHandlers();
    act(() => {
      result.current.handleValueChange("email")("bob@example.com");
    });
    expect(result.current.formData.email).toBe("bob@example.com");
  });
});
