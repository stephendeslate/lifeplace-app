import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { contractsApi } from "./contracts.api";

vi.mock("../utils/api", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockApi = vi.mocked(api);

describe("contractsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Contract Templates ---

  describe("getContractTemplates", () => {
    it("calls /contracts/templates/ with no params", async () => {
      const mockData = { results: [], count: 0, next: null, previous: null };
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await contractsApi.getContractTemplates();

      expect(mockApi.get).toHaveBeenCalledWith("/contracts/templates/?");
      expect(result).toEqual(mockData);
    });

    it("constructs all query params", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [], count: 0 } });

      await contractsApi.getContractTemplates({
        search: "wedding",
        event_type: 2,
        is_active: true,
        page: 3,
        page_size: 10,
        ordering: "-created_at",
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("search=wedding");
      expect(calledUrl).toContain("event_type=2");
      expect(calledUrl).toContain("is_active=true");
      expect(calledUrl).toContain("page=3");
      expect(calledUrl).toContain("page_size=10");
      expect(calledUrl).toContain("ordering=-created_at");
    });
  });

  describe("getContractTemplate", () => {
    it("fetches a single template by ID", async () => {
      const mockTemplate = { id: 1, name: "Wedding Contract" };
      mockApi.get.mockResolvedValue({ data: mockTemplate });

      const result = await contractsApi.getContractTemplate(1);

      expect(mockApi.get).toHaveBeenCalledWith("/contracts/templates/1/");
      expect(result).toEqual(mockTemplate);
    });
  });

  describe("createContractTemplate", () => {
    it("posts template data to /contracts/templates/", async () => {
      const data = { name: "New Template", content: "Template body" };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await contractsApi.createContractTemplate(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/contracts/templates/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("updateContractTemplate", () => {
    it("patches template data at /contracts/templates/:id/", async () => {
      const data = { name: "Updated Template" };
      mockApi.patch.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await contractsApi.updateContractTemplate(
        1,
        data as never,
      );

      expect(mockApi.patch).toHaveBeenCalledWith(
        "/contracts/templates/1/",
        data,
      );
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("deleteContractTemplate", () => {
    it("deletes template at /contracts/templates/:id/", async () => {
      mockApi.delete.mockResolvedValue({});

      await contractsApi.deleteContractTemplate(1);

      expect(mockApi.delete).toHaveBeenCalledWith("/contracts/templates/1/");
    });
  });

  describe("getTemplatesForEventType", () => {
    it("fetches templates filtered by event type", async () => {
      const mockTemplates = [{ id: 1, name: "Wedding Template" }];
      mockApi.get.mockResolvedValue({ data: mockTemplates });

      const result = await contractsApi.getTemplatesForEventType(3);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/contracts/templates/for_event_type/?event_type=3",
      );
      expect(result).toEqual(mockTemplates);
    });

    it("handles paginated response by extracting results", async () => {
      mockApi.get.mockResolvedValue({
        data: { results: [{ id: 1, name: "Template" }], count: 1 },
      });

      const result = await contractsApi.getTemplatesForEventType(3);

      expect(result).toEqual([{ id: 1, name: "Template" }]);
    });
  });

  describe("previewTemplate", () => {
    it("posts context data to preview endpoint", async () => {
      const mockPreview = {
        template_id: 1,
        template_name: "Wedding",
        rendered_content: "<p>Preview</p>",
        variables: ["client_name"],
        sections: ["header"],
        event_type: "wedding",
        context_used: { client_name: "John" },
      };
      mockApi.post.mockResolvedValue({ data: mockPreview });

      const result = await contractsApi.previewTemplate(1, {
        client_name: "John",
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/templates/1/preview/",
        {
          context_data: { client_name: "John" },
        },
      );
      expect(result).toEqual(mockPreview);
    });

    it("includes event_id in request when provided", async () => {
      mockApi.post.mockResolvedValue({ data: { rendered_content: "" } });

      await contractsApi.previewTemplate(1, {}, 42);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/templates/1/preview/",
        {
          context_data: {},
          event_id: 42,
        },
      );
    });

    it("uses empty context_data by default", async () => {
      mockApi.post.mockResolvedValue({ data: { rendered_content: "" } });

      await contractsApi.previewTemplate(1);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/templates/1/preview/",
        {
          context_data: {},
        },
      );
    });
  });

  describe("getVariableSchemas", () => {
    it("fetches variable schemas from /contracts/templates/variable_schemas/", async () => {
      const mockSchemas = { client: { name: "string" } };
      mockApi.get.mockResolvedValue({ data: mockSchemas });

      const result = await contractsApi.getVariableSchemas();

      expect(mockApi.get).toHaveBeenCalledWith(
        "/contracts/templates/variable_schemas/",
      );
      expect(result).toEqual(mockSchemas);
    });
  });

  // --- Event Contracts ---

  describe("getEventContracts", () => {
    it("calls /contracts/contracts/ with no params", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      const result = await contractsApi.getEventContracts();

      expect(mockApi.get).toHaveBeenCalledWith("/contracts/contracts/?");
      expect(result).toEqual([]);
    });

    it("constructs filter params", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [] } });

      await contractsApi.getEventContracts({
        search: "wedding",
        event_id: 5,
        status: "active",
        template: 2,
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("search=wedding");
      expect(calledUrl).toContain("event_id=5");
      expect(calledUrl).toContain("status=active");
      expect(calledUrl).toContain("template=2");
    });

    it("handles paginated response by extracting results", async () => {
      mockApi.get.mockResolvedValue({
        data: { results: [{ id: 1, status: "active" }], count: 1 },
      });

      const result = await contractsApi.getEventContracts();

      expect(result).toEqual([{ id: 1, status: "active" }]);
    });
  });

  describe("getEventContract", () => {
    it("fetches a single contract by ID", async () => {
      const mockContract = { id: 5, status: "active" };
      mockApi.get.mockResolvedValue({ data: mockContract });

      const result = await contractsApi.getEventContract(5);

      expect(mockApi.get).toHaveBeenCalledWith("/contracts/contracts/5/");
      expect(result).toEqual(mockContract);
    });
  });

  describe("createEventContract", () => {
    it("posts contract data to /contracts/contracts/", async () => {
      const data = { event: 5, template: 1 };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await contractsApi.createEventContract(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/contracts/contracts/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("updateEventContract", () => {
    it("patches contract data at /contracts/contracts/:id/", async () => {
      const data = { status: "signed" };
      mockApi.patch.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await contractsApi.updateEventContract(1, data as never);

      expect(mockApi.patch).toHaveBeenCalledWith(
        "/contracts/contracts/1/",
        data,
      );
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("deleteEventContract", () => {
    it("deletes contract at /contracts/contracts/:id/", async () => {
      mockApi.delete.mockResolvedValue({});

      await contractsApi.deleteEventContract(1);

      expect(mockApi.delete).toHaveBeenCalledWith("/contracts/contracts/1/");
    });
  });

  describe("getContractsForEvent", () => {
    it("fetches contracts for a specific event", async () => {
      const mockContracts = [{ id: 1, event: 5 }];
      mockApi.get.mockResolvedValue({ data: mockContracts });

      const result = await contractsApi.getContractsForEvent(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/contracts/contracts/for_event/?event_id=5",
      );
      expect(result).toEqual(mockContracts);
    });
  });

  describe("addSignature", () => {
    it("posts signature data to contract", async () => {
      const data = { signer_name: "John Doe", role: "client" };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await contractsApi.addSignature(5, data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/contracts/5/add_signature/",
        data,
      );
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("voidContract", () => {
    it("posts void request with optional reason", async () => {
      const mockContract = { id: 5, status: "voided" };
      mockApi.post.mockResolvedValue({ data: mockContract });

      const result = await contractsApi.voidContract(5, "Client cancelled");

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/contracts/5/void/",
        {
          reason: "Client cancelled",
        },
      );
      expect(result).toEqual(mockContract);
    });
  });

  describe("requestAmendment", () => {
    it("posts amendment data to contract", async () => {
      const data = { changes: "Updated terms", reason: "Client request" };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await contractsApi.requestAmendment(5, data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/contracts/5/request_amendment/",
        data,
      );
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("getContractAmendments", () => {
    it("fetches amendments for a specific contract", async () => {
      const mockAmendments = [{ id: 1, changes: "Updated clause" }];
      mockApi.get.mockResolvedValue({ data: mockAmendments });

      const result = await contractsApi.getContractAmendments(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/contracts/contracts/5/amendments/",
      );
      expect(result).toEqual(mockAmendments);
    });
  });

  describe("addContractDocument", () => {
    it("posts FormData with file to contract document endpoint", async () => {
      const file = new File(["doc-content"], "contract.pdf", {
        type: "application/pdf",
      });
      const data = {
        name: "Signed Copy",
        document_type: "signed",
        file,
        description: "Client signed version",
      };
      mockApi.post.mockResolvedValue({ data: { id: 1, name: "Signed Copy" } });

      await contractsApi.addContractDocument(5, data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/contracts/5/add_document/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const formData = mockApi.post.mock.calls[0][1] as FormData;
      expect(formData.get("contract")).toBe("5");
      expect(formData.get("name")).toBe("Signed Copy");
      expect(formData.get("document_type")).toBe("signed");
      expect(formData.get("file")).toBe(file);
      expect(formData.get("description")).toBe("Client signed version");
    });
  });

  describe("getContractDocuments", () => {
    it("fetches documents for a specific contract", async () => {
      const mockDocs = [{ id: 1, name: "doc.pdf" }];
      mockApi.get.mockResolvedValue({ data: mockDocs });

      const result = await contractsApi.getContractDocuments(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/contracts/contracts/5/documents/",
      );
      expect(result).toEqual(mockDocs);
    });
  });

  describe("addContractNote", () => {
    it("posts note data to contract", async () => {
      const data = { content: "Important note" };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await contractsApi.addContractNote(5, data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/contracts/5/add_note/",
        data,
      );
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("getContractNotes", () => {
    it("fetches notes for a specific contract", async () => {
      const mockNotes = [{ id: 1, content: "Note text" }];
      mockApi.get.mockResolvedValue({ data: mockNotes });

      const result = await contractsApi.getContractNotes(5);

      expect(mockApi.get).toHaveBeenCalledWith("/contracts/contracts/5/notes/");
      expect(result).toEqual(mockNotes);
    });
  });

  // --- Contract Signatures (Global) ---

  describe("getContractSignatures", () => {
    it("constructs filter params for signatures", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [] } });

      await contractsApi.getContractSignatures({ contract: 5, role: "client" });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("contract=5");
      expect(calledUrl).toContain("role=client");
    });

    it("handles direct array response", async () => {
      const mockSigs = [{ id: 1, signer_name: "John" }];
      mockApi.get.mockResolvedValue({ data: mockSigs });

      const result = await contractsApi.getContractSignatures();

      expect(result).toEqual(mockSigs);
    });
  });

  describe("createContractSignature", () => {
    it("posts signature data to /contracts/signatures/", async () => {
      const data = { contract: 5, signer_name: "Jane" };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await contractsApi.createContractSignature(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/contracts/signatures/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("verifySignature", () => {
    it("posts verification request with optional method", async () => {
      const mockSig = { id: 1, is_verified: true };
      mockApi.post.mockResolvedValue({ data: mockSig });

      const result = await contractsApi.verifySignature(1, "email");

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/signatures/1/verify/",
        {
          verification_method: "email",
        },
      );
      expect(result).toEqual(mockSig);
    });
  });

  // --- Contract Amendments (Global) ---

  describe("getAllContractAmendments", () => {
    it("constructs filter params for amendments", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [] } });

      await contractsApi.getAllContractAmendments({
        contract: 5,
        status: "pending",
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("contract=5");
      expect(calledUrl).toContain("status=pending");
    });
  });

  describe("approveAmendment", () => {
    it("posts approval with optional review notes", async () => {
      const mockAmendment = { id: 1, status: "approved" };
      mockApi.post.mockResolvedValue({ data: mockAmendment });

      const result = await contractsApi.approveAmendment(1, "Looks good");

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/amendments/1/approve/",
        {
          review_notes: "Looks good",
        },
      );
      expect(result).toEqual(mockAmendment);
    });
  });

  describe("rejectAmendment", () => {
    it("posts rejection with optional review notes", async () => {
      const mockAmendment = { id: 1, status: "rejected" };
      mockApi.post.mockResolvedValue({ data: mockAmendment });

      const result = await contractsApi.rejectAmendment(1, "Not acceptable");

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/amendments/1/reject/",
        {
          review_notes: "Not acceptable",
        },
      );
      expect(result).toEqual(mockAmendment);
    });
  });

  describe("createAmendmentContract", () => {
    it("posts context data to create contract from amendment", async () => {
      const mockContract = { id: 10, status: "draft" };
      mockApi.post.mockResolvedValue({ data: mockContract });

      const result = await contractsApi.createAmendmentContract(1, {
        key: "value",
      });

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/amendments/1/create_contract/",
        { context_data: { key: "value" } },
      );
      expect(result).toEqual(mockContract);
    });
  });

  // --- Global Documents ---

  describe("getAllContractDocuments", () => {
    it("fetches all contract documents", async () => {
      const mockDocs = [{ id: 1, name: "doc.pdf" }];
      mockApi.get.mockResolvedValue({ data: mockDocs });

      const result = await contractsApi.getAllContractDocuments();

      expect(mockApi.get).toHaveBeenCalledWith("/contracts/documents/");
      expect(result).toEqual(mockDocs);
    });

    it("handles paginated response by extracting results", async () => {
      mockApi.get.mockResolvedValue({
        data: { results: [{ id: 1 }], count: 1 },
      });

      const result = await contractsApi.getAllContractDocuments();

      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("createContractDocument", () => {
    it("posts FormData with file to /contracts/documents/", async () => {
      const file = new File(["content"], "doc.pdf");
      const data = {
        contract: 5,
        name: "Final Doc",
        document_type: "final",
        file,
        description: "Finalized contract",
      };
      mockApi.post.mockResolvedValue({ data: { id: 1, name: "Final Doc" } });

      await contractsApi.createContractDocument(data as never);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/documents/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const formData = mockApi.post.mock.calls[0][1] as FormData;
      expect(formData.get("contract")).toBe("5");
      expect(formData.get("name")).toBe("Final Doc");
      expect(formData.get("document_type")).toBe("final");
      expect(formData.get("file")).toBe(file);
      expect(formData.get("description")).toBe("Finalized contract");
    });
  });

  // --- Client Contracts ---

  describe("getContractsForClient", () => {
    it("fetches contracts for a specific client", async () => {
      const mockContracts = [{ id: 1, event: 5 }];
      mockApi.get.mockResolvedValue({ data: mockContracts });

      const result = await contractsApi.getContractsForClient(10);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/contracts/contracts/?client_id=10",
      );
      expect(result).toEqual(mockContracts);
    });
  });

  // --- PDF Download ---

  describe("downloadContractPdf", () => {
    it("fetches contract PDF as blob", async () => {
      const mockBlob = new Blob(["pdf-content"]);
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await contractsApi.downloadContractPdf(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/contracts/contracts/5/download_pdf/",
        {
          responseType: "blob",
        },
      );
      expect(result).toBe(mockBlob);
    });
  });

  // --- Send Contract ---

  describe("sendContract", () => {
    it("posts to send_contract endpoint", async () => {
      const mockContract = { id: 5, status: "sent" };
      mockApi.post.mockResolvedValue({ data: mockContract });

      const result = await contractsApi.sendContract(5);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/contracts/contracts/5/send_contract/",
      );
      expect(result).toEqual(mockContract);
    });
  });

  // --- Global Notes ---

  describe("getAllContractNotes", () => {
    it("fetches all contract notes", async () => {
      const mockNotes = [{ id: 1, content: "Note" }];
      mockApi.get.mockResolvedValue({ data: mockNotes });

      const result = await contractsApi.getAllContractNotes();

      expect(mockApi.get).toHaveBeenCalledWith("/contracts/notes/");
      expect(result).toEqual(mockNotes);
    });
  });

  describe("createContractNote", () => {
    it("posts note data to /contracts/notes/", async () => {
      const data = { contract: 5, content: "New note" };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await contractsApi.createContractNote(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/contracts/notes/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });
});
