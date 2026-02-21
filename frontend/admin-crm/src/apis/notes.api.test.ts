import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { notesApi } from "./notes.api";

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

describe("notesApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getNotesForObject", () => {
    it("builds query params with content_type, object_id, and optional filters", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1 }] });

      const result = await notesApi.getNotesForObject("event", 10, {
        search: "important",
        created_by: 5,
        date_from: "2025-01-01",
        date_to: "2025-01-31",
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/notes/for_object/");
      expect(url).toContain("content_type=event");
      expect(url).toContain("object_id=10");
      expect(url).toContain("search=important");
      expect(url).toContain("created_by=5");
      expect(url).toContain("date_from=2025-01-01");
      expect(url).toContain("date_to=2025-01-31");
      expect(result).toEqual([{ id: 1 }]);
    });
  });

  describe("getNotes", () => {
    it("calls GET with filters and returns paginated response", async () => {
      mockApi.get.mockResolvedValue({
        data: { count: 1, results: [{ id: 1 }] },
      });

      const result = await notesApi.getNotes({
        content_type: "client",
        object_id: 5,
      });

      const url = mockApi.get.mock.calls[0][0] as string;
      expect(url).toContain("/notes/");
      expect(url).toContain("content_type=client");
      expect(url).toContain("object_id=5");
      expect(result).toEqual({ count: 1, results: [{ id: 1 }] });
    });
  });

  describe("createNote", () => {
    it("calls POST with note data", async () => {
      const data = {
        content_type: "event",
        object_id: 10,
        body: "Important note",
      };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await notesApi.createNote(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/notes/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("updateNote", () => {
    it("calls PUT with note id and data", async () => {
      const data = { body: "Updated note" };
      mockApi.put.mockResolvedValue({ data: { id: 1, body: "Updated note" } });

      const result = await notesApi.updateNote(1, data as never);

      expect(mockApi.put).toHaveBeenCalledWith("/notes/1/", data);
      expect(result).toEqual({ id: 1, body: "Updated note" });
    });
  });

  describe("deleteNote", () => {
    it("calls DELETE with note id", async () => {
      mockApi.delete.mockResolvedValue({});

      await notesApi.deleteNote(5);

      expect(mockApi.delete).toHaveBeenCalledWith("/notes/5/");
    });
  });
});
