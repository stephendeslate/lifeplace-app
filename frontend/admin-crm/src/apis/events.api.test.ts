import { describe, it, expect, vi, beforeEach } from "vitest";
import api from "../utils/api";
import { eventsApi } from "./events.api";

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

describe("eventsApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Event Types ---

  describe("getEventTypes", () => {
    it("calls /events/event-types/ with no params", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1, name: "Wedding" }] });

      const result = await eventsApi.getEventTypes();

      expect(mockApi.get).toHaveBeenCalledWith("/events/event-types/?");
      expect(result).toEqual([{ id: 1, name: "Wedding" }]);
    });

    it("handles paginated response by extracting results", async () => {
      mockApi.get.mockResolvedValue({
        data: { results: [{ id: 1, name: "Wedding" }], count: 1 },
      });

      const result = await eventsApi.getEventTypes();

      expect(result).toEqual([{ id: 1, name: "Wedding" }]);
    });

    it("constructs search and is_active filter params", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await eventsApi.getEventTypes({ search: "birthday", is_active: true });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("search=birthday");
      expect(calledUrl).toContain("is_active=true");
    });

    it("returns empty array for non-array, non-paginated response", async () => {
      mockApi.get.mockResolvedValue({ data: "unexpected" });

      const result = await eventsApi.getEventTypes();

      expect(result).toEqual([]);
    });
  });

  describe("getEventType", () => {
    it("fetches a single event type by ID", async () => {
      const mockType = { id: 3, name: "Corporate" };
      mockApi.get.mockResolvedValue({ data: mockType });

      const result = await eventsApi.getEventType(3);

      expect(mockApi.get).toHaveBeenCalledWith("/events/event-types/3/");
      expect(result).toEqual(mockType);
    });
  });

  describe("createEventType", () => {
    it("posts JSON data when no formData provided", async () => {
      const data = { name: "Party" };
      mockApi.post.mockResolvedValue({ data: { id: 1, name: "Party" } });

      const result = await eventsApi.createEventType(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/events/event-types/", data);
      expect(result).toEqual({ id: 1, name: "Party" });
    });

    it("posts FormData with multipart header when formData provided", async () => {
      const data = { name: "Party" };
      const formData = new FormData();
      formData.append("name", "Party");
      mockApi.post.mockResolvedValue({ data: { id: 1, name: "Party" } });

      await eventsApi.createEventType(data as never, formData);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/events/event-types/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });
  });

  describe("updateEventType", () => {
    it("patches JSON data when no formData provided", async () => {
      const data = { name: "Updated Party" };
      mockApi.patch.mockResolvedValue({
        data: { id: 1, name: "Updated Party" },
      });

      const result = await eventsApi.updateEventType(1, data as never);

      expect(mockApi.patch).toHaveBeenCalledWith(
        "/events/event-types/1/",
        data,
      );
      expect(result).toEqual({ id: 1, name: "Updated Party" });
    });

    it("patches FormData with multipart header when formData provided", async () => {
      const data = { name: "Updated Party" };
      const formData = new FormData();
      formData.append("name", "Updated Party");
      mockApi.patch.mockResolvedValue({
        data: { id: 1, name: "Updated Party" },
      });

      await eventsApi.updateEventType(1, data as never, formData);

      expect(mockApi.patch).toHaveBeenCalledWith(
        "/events/event-types/1/",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });
  });

  describe("deleteEventType", () => {
    it("returns success true on 204 response", async () => {
      mockApi.delete.mockResolvedValue({ status: 204, data: undefined });

      const result = await eventsApi.deleteEventType(5);

      expect(mockApi.delete).toHaveBeenCalledWith("/events/event-types/5/");
      expect(result).toEqual({ success: true });
    });

    it("returns success false with message on non-204 response", async () => {
      mockApi.delete.mockResolvedValue({
        status: 200,
        data: {
          detail: "Event type was marked as inactive because it is in use.",
        },
      });

      const result = await eventsApi.deleteEventType(5);

      expect(result).toEqual({
        success: false,
        message: "Event type was marked as inactive because it is in use.",
      });
    });
  });

  // --- Events ---

  describe("getEvents", () => {
    it("calls /events/events/ with no params", async () => {
      const mockData = { results: [], count: 0, next: null, previous: null };
      mockApi.get.mockResolvedValue({ data: mockData });

      const result = await eventsApi.getEvents();

      expect(mockApi.get).toHaveBeenCalledWith("/events/events/?");
      expect(result).toEqual(mockData);
    });

    it("constructs all filter and pagination params", async () => {
      mockApi.get.mockResolvedValue({ data: { results: [], count: 0 } });

      await eventsApi.getEvents({
        search: "wedding",
        event_type: 2,
        workflow_template: 3,
        status: "confirmed",
        client: 10,
        start_date_from: "2025-01-01",
        start_date_to: "2025-12-31",
        page: 2,
        page_size: 20,
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("search=wedding");
      expect(calledUrl).toContain("event_type=2");
      expect(calledUrl).toContain("workflow_template=3");
      expect(calledUrl).toContain("status=confirmed");
      expect(calledUrl).toContain("client=10");
      expect(calledUrl).toContain("start_date_from=2025-01-01");
      expect(calledUrl).toContain("start_date_to=2025-12-31");
      expect(calledUrl).toContain("page=2");
      expect(calledUrl).toContain("page_size=20");
    });
  });

  describe("getEvent", () => {
    it("fetches a single event by ID", async () => {
      const mockEvent = { id: 7, name: "Company Retreat" };
      mockApi.get.mockResolvedValue({ data: mockEvent });

      const result = await eventsApi.getEvent(7);

      expect(mockApi.get).toHaveBeenCalledWith("/events/events/7/");
      expect(result).toEqual(mockEvent);
    });
  });

  describe("createEvent", () => {
    it("posts event data to /events/events/", async () => {
      const data = { name: "New Event", event_type: 1 };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      const result = await eventsApi.createEvent(data as never);

      expect(mockApi.post).toHaveBeenCalledWith("/events/events/", data);
      expect(result).toEqual({ id: 1, ...data });
    });
  });

  describe("updateEvent", () => {
    it("patches event data at /events/events/:id/", async () => {
      const data = { name: "Updated Event" };
      mockApi.patch.mockResolvedValue({
        data: { id: 1, name: "Updated Event" },
      });

      const result = await eventsApi.updateEvent(1, data as never);

      expect(mockApi.patch).toHaveBeenCalledWith("/events/events/1/", data);
      expect(result).toEqual({ id: 1, name: "Updated Event" });
    });
  });

  describe("deleteEvent", () => {
    it("deletes event at /events/events/:id/", async () => {
      mockApi.delete.mockResolvedValue({});

      await eventsApi.deleteEvent(7);

      expect(mockApi.delete).toHaveBeenCalledWith("/events/events/7/");
    });
  });

  describe("exportEvents", () => {
    it("fetches blob from /events/events/export/ with responseType blob", async () => {
      const mockBlob = new Blob(["csv"]);
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await eventsApi.exportEvents();

      expect(mockApi.get).toHaveBeenCalledWith("/events/events/export/?", {
        responseType: "blob",
      });
      expect(result).toBe(mockBlob);
    });

    it("constructs filter params for export", async () => {
      mockApi.get.mockResolvedValue({ data: new Blob() });

      await eventsApi.exportEvents({
        search: "test",
        event_type: 1,
        status: "confirmed",
        client: 5,
        start_date_from: "2025-01-01",
        start_date_to: "2025-06-30",
      });

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("search=test");
      expect(calledUrl).toContain("event_type=1");
      expect(calledUrl).toContain("status=confirmed");
      expect(calledUrl).toContain("client=5");
      expect(calledUrl).toContain("start_date_from=2025-01-01");
      expect(calledUrl).toContain("start_date_to=2025-06-30");
    });
  });

  // --- Event Files ---

  describe("getEventFiles", () => {
    it("fetches event files with event ID param", async () => {
      mockApi.get.mockResolvedValue({ data: [{ id: 1, name: "photo.jpg" }] });

      const result = await eventsApi.getEventFiles(10);

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("event=10");
      expect(result).toEqual([{ id: 1, name: "photo.jpg" }]);
    });

    it("includes category filter param", async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      await eventsApi.getEventFiles(10, "photos");

      const calledUrl = mockApi.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain("category=photos");
      expect(calledUrl).toContain("event=10");
    });

    it("handles paginated response by extracting results", async () => {
      mockApi.get.mockResolvedValue({
        data: { results: [{ id: 1, name: "doc.pdf" }], count: 1 },
      });

      const result = await eventsApi.getEventFiles(10);

      expect(result).toEqual([{ id: 1, name: "doc.pdf" }]);
    });
  });

  describe("createEventFile", () => {
    it("posts FormData with file and metadata", async () => {
      const file = new File(["content"], "photo.jpg", { type: "image/jpeg" });
      const data = {
        event: 10,
        category: "photos",
        name: "Event Photo",
        description: "Main photo",
        is_public: true,
      };
      mockApi.post.mockResolvedValue({ data: { id: 1, ...data } });

      await eventsApi.createEventFile(data as never, file);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/events/event-files/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );

      const formData = mockApi.post.mock.calls[0][1] as FormData;
      expect(formData.get("event")).toBe("10");
      expect(formData.get("category")).toBe("photos");
      expect(formData.get("name")).toBe("Event Photo");
      expect(formData.get("file")).toBe(file);
      expect(formData.get("description")).toBe("Main photo");
      expect(formData.get("is_public")).toBe("true");
    });
  });

  describe("updateEventFile", () => {
    it("patches event file with FormData", async () => {
      const data = { name: "Updated Name", category: "documents" };
      mockApi.patch.mockResolvedValue({ data: { id: 1, ...data } });

      await eventsApi.updateEventFile(1, data as never);

      expect(mockApi.patch).toHaveBeenCalledWith(
        "/events/event-files/1/",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } },
      );
    });

    it("includes new file in FormData when provided", async () => {
      const file = new File(["new-content"], "new-photo.jpg");
      const data = { name: "Updated" };
      mockApi.patch.mockResolvedValue({ data: { id: 1 } });

      await eventsApi.updateEventFile(1, data as never, file);

      const formData = mockApi.patch.mock.calls[0][1] as FormData;
      expect(formData.get("file")).toBe(file);
      expect(formData.get("name")).toBe("Updated");
    });
  });

  describe("deleteEventFile", () => {
    it("deletes event file by ID", async () => {
      mockApi.delete.mockResolvedValue({});

      await eventsApi.deleteEventFile(15);

      expect(mockApi.delete).toHaveBeenCalledWith("/events/event-files/15/");
    });
  });

  describe("downloadEventFile", () => {
    it("fetches file blob with responseType blob", async () => {
      const mockBlob = new Blob(["file-content"]);
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await eventsApi.downloadEventFile(15);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/events/event-files/15/download/",
        {
          responseType: "blob",
        },
      );
      expect(result).toBe(mockBlob);
    });
  });

  // --- Check-in/Check-out ---

  describe("checkIn", () => {
    it("posts check-in with optional notes", async () => {
      const mockEvent = { id: 1, status: "checked_in" };
      mockApi.post.mockResolvedValue({ data: mockEvent });

      const result = await eventsApi.checkIn(1, "Arrived on time");

      expect(mockApi.post).toHaveBeenCalledWith("/events/events/1/check_in/", {
        notes: "Arrived on time",
      });
      expect(result).toEqual(mockEvent);
    });
  });

  describe("checkout", () => {
    it("posts checkout with notes and late fee flag", async () => {
      const mockResponse = {
        id: 1,
        status: "checked_out",
        late_checkout_fee: { fee_amount: "500.00", reason: "1 hour late" },
      };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await eventsApi.checkout(1, "Left late", true);

      expect(mockApi.post).toHaveBeenCalledWith("/events/events/1/checkout/", {
        notes: "Left late",
        calculate_late_fee: true,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe("markNoShow", () => {
    it("posts no-show with optional notes", async () => {
      const mockEvent = { id: 1, status: "no_show" };
      mockApi.post.mockResolvedValue({ data: mockEvent });

      const result = await eventsApi.markNoShow(1, "Client did not arrive");

      expect(mockApi.post).toHaveBeenCalledWith("/events/events/1/no_show/", {
        notes: "Client did not arrive",
      });
      expect(result).toEqual(mockEvent);
    });
  });

  describe("getCheckInStatus", () => {
    it("fetches check-in status for an event", async () => {
      const mockStatus = {
        check_in_status: "checked_in",
        can_check_in: false,
        can_checkout: true,
        can_mark_no_show: false,
      };
      mockApi.get.mockResolvedValue({ data: mockStatus });

      const result = await eventsApi.getCheckInStatus(1);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/events/events/1/check_in_status/",
      );
      expect(result).toEqual(mockStatus);
    });
  });

  describe("updateHeadcount", () => {
    it("posts headcount update data to event endpoint", async () => {
      const data = {
        num_participants: 150,
        notes: "Updated count",
        create_quote_revision: true,
        create_supplementary_invoice: false,
      };
      const mockResponse = {
        success: true,
        old_count: 100,
        new_count: 150,
        old_total: "10000.00",
        new_total: "15000.00",
        delta: "5000.00",
        quote_revision: { id: 2, version: 2, total_amount: "15000.00" },
        supplementary_invoice: null,
        refund_needed: false,
        refund_amount: "0.00",
      };
      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await eventsApi.updateHeadcount(7, data);

      expect(mockApi.post).toHaveBeenCalledWith(
        "/events/events/7/update_headcount/",
        data,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("previewLateCheckoutFee", () => {
    it("fetches late checkout fee preview for an event", async () => {
      const mockPreview = {
        fee_applicable: true,
        fee_amount: "1000.00",
        fee_type: "hourly",
        hours_late: 2,
        grace_minutes: 15,
        reason: "Late by 2 hours",
      };
      mockApi.get.mockResolvedValue({ data: mockPreview });

      const result = await eventsApi.previewLateCheckoutFee(1);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/events/events/1/late_checkout_preview/",
      );
      expect(result).toEqual(mockPreview);
    });
  });

  describe("getEventFileBlob", () => {
    it("fetches file blob via download endpoint", async () => {
      const mockBlob = new Blob(["blob"]);
      mockApi.get.mockResolvedValue({ data: mockBlob });

      const result = await eventsApi.getEventFileBlob(5);

      expect(mockApi.get).toHaveBeenCalledWith(
        "/events/event-files/5/download/",
        {
          responseType: "blob",
        },
      );
      expect(result).toBe(mockBlob);
    });
  });
});
