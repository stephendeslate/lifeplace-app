import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { clientsApi } from "./clients.api";

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

describe("clientsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getClients", () => {
    it("calls /clients/ with no params when no filters provided", async () => {
      const mockData = { results: [], count: 0, next: null, previous: null };
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await clientsApi.getClients();

      expect(mockApi.get).toHaveBeenCalledWith("/clients/?");
      expect(result).toEqual(mockData);
    });

    it("constructs query params from filters", async () => {
      const mockData = { results: [], count: 0, next: null, previous: null };
      mockApi.get.mockResolvedValue({ data: mockData });

      await clientsApi.getClients({
        search: "john",
        is_active: true,
        has_account: false,
        page: 2,
        page_size: 25,
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("search=john");
      expect(calledUrl).toContain("is_active=true");
      expect(calledUrl).toContain("has_account=false");
      expect(calledUrl).toContain("page=2");
      expect(calledUrl).toContain("page_size=25");
    });

    it("returns paginated response data", async () => {
      const mockData = {
        results: [{ id: 1, first_name: "John" }],
        count: 1,
        next: null,
        previous: null,
      };
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await clientsApi.getClients();

      expect(result).toEqual(mockData);
    });
  });

  describe("getClient", () => {
    it("fetches a single client by ID", async () => {
      const mockClient = { id: 42, first_name: "Jane", last_name: "Doe" };
      mockApi.get.mockResolvedValue({ data: mockClient });

      const result = await clientsApi.getClient(42);

      expect(mockApi.get).toHaveBeenCalledWith("/clients/42/");
      expect(result).toEqual(mockClient);
    });
  });

  describe("createClient", () => {
    it("posts client data to /clients/", async () => {
      const newClient = {
        first_name: "Jane",
        last_name: "Doe",
        email: "jane@test.com",
      };
      const mockResponse = { id: 10, ...newClient };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await clientsApi.createClient(newClient as never);

      expect(mockApi.post).toHaveBeenCalledWith("/clients/", newClient);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("updateClient", () => {
    it("patches client data at /clients/:id/", async () => {
      const updateData = { first_name: "Janet" };
      const mockResponse = { id: 10, first_name: "Janet", last_name: "Doe" };
      mockApi.patch.mockResolvedValue({ data: mockResponse });

      const result = await clientsApi.updateClient(10, updateData as never);

      expect(mockApi.patch).toHaveBeenCalledWith("/clients/10/", updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("deleteClient", () => {
    it("deletes client at /clients/:id/", async () => {
      mockApi.delete.mockResolvedValue({});

      await clientsApi.deleteClient(10);

      expect(mockApi.delete).toHaveBeenCalledWith("/clients/10/");
    });
  });

  describe("getActiveClients", () => {
    it("handles paginated response by extracting results", async () => {
      const mockData = {
        results: [{ id: 1, first_name: "Active" }],
        count: 1,
      };
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await clientsApi.getActiveClients();

      expect(mockApi.get).toHaveBeenCalledWith("/clients/active/");
      expect(result).toEqual([{ id: 1, first_name: "Active" }]);
    });

    it("handles direct array response", async () => {
      const mockData = [{ id: 1, first_name: "Active" }];
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await clientsApi.getActiveClients();

      expect(result).toEqual(mockData);
    });

    it("returns empty array when data is falsy", async () => {
      mockApi.get.mockResolvedValue({ data: null });

      const result = await clientsApi.getActiveClients();

      expect(result).toEqual([]);
    });
  });

  describe("getClientEvents", () => {
    it("fetches events for a specific client", async () => {
      const mockEvents = [{ id: 1, name: "Wedding" }];
      mockApi.get.mockResolvedValue({ data: mockEvents });

      const result = await clientsApi.getClientEvents(5);

      expect(mockApi.get).toHaveBeenCalledWith("/clients/5/events/");
      expect(result).toEqual(mockEvents);
    });
  });

  describe("sendInvitation", () => {
    it("posts to send_invitation endpoint for a client", async () => {
      const mockInvitation = { id: "inv-1", status: "sent" };
      mockApi.post.mockResolvedValue({ data: mockInvitation });

      const result = await clientsApi.sendInvitation(5);

      expect(mockApi.post).toHaveBeenCalledWith("/clients/5/send_invitation/");
      expect(result).toEqual(mockInvitation);
    });
  });

  describe("importClients", () => {
    it("posts FormData with file to /clients/import/ with multipart header", async () => {
      const file = new File(["csv-content"], "clients.csv", {
        type: "text/csv",
      });
      const mockResponse = { success: 5, errors: [] };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await clientsApi.importClients(file);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/clients/import/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const formData = mockApi.post.mock.calls[0][1] as FormData;
      expect(formData.get("file")).toBe(file);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("exportClients", () => {
    it("fetches blob from /clients/export/ with responseType blob", async () => {
      const mockBlob = new Blob(["data"]);
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await clientsApi.exportClients();

      expect(mockApi.get).toHaveBeenCalledWith("/clients/export/?", {
        responseType: "blob",
      });
      expect(result).toBe(mockBlob);
    });

    it("constructs filter params for export", async () => {
      const mockBlob = new Blob(["data"]);
      mockApi.get.mockResolvedValue({ data: mockBlob });

      await clientsApi.exportClients({ search: "test", is_active: true });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("search=test");
      expect(calledUrl).toContain("is_active=true");
    });
  });

  describe("getInvitation", () => {
    it("fetches a client invitation by ID", async () => {
      const mockInvitation = { id: "inv-abc", status: "pending" };
      mockApi.get.mockResolvedValue({ data: mockInvitation });

      const result = await clientsApi.getInvitation("inv-abc");

      expect(mockApi.get).toHaveBeenCalledWith("/clients/invitations/inv-abc/");
      expect(result).toEqual(mockInvitation);
    });
  });

  describe("acceptInvitation", () => {
    it("posts acceptance data for a client invitation", async () => {
      const data = { password: "pass123", confirm_password: "pass123" };
      const mockResponse = { user: { id: 1 }, tokens: { access: "tok" } };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await clientsApi.acceptInvitation(
        "inv-abc",
        data as never,
      );

      expect(mockApi.post).toHaveBeenCalledWith(
        "/clients/invitations/inv-abc/accept/",
        data,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
