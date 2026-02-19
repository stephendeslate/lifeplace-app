import { http, HttpResponse, delay } from "msw";
import {
  mockNotes,
  createMockNote,
  createMockNotesPaginatedResponse,
} from "../data/notes.mock";
import type { Note } from "../../../types/notes.types";

const BASE_URL = "http://localhost:8000/api";

let notesStore: Note[] = [...mockNotes];

export const resetNotesStore = () => {
  notesStore = [...mockNotes];
};

export const notesHandlers = [
  // GET /api/notes/ - List notes (paginated)
  http.get(`${BASE_URL}/notes/`, async ({ request }) => {
    await delay(50);
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    const contentType = url.searchParams.get("content_type");
    const objectId = url.searchParams.get("object_id");

    let filtered = [...notesStore];

    if (search) {
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(search) ||
          n.content.toLowerCase().includes(search),
      );
    }
    if (contentType) {
      filtered = filtered.filter((n) => n.content_type_name === contentType);
    }
    if (objectId) {
      filtered = filtered.filter((n) => n.object_id === Number(objectId));
    }

    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("page_size") || 25);

    return HttpResponse.json(
      createMockNotesPaginatedResponse(filtered, page, pageSize),
    );
  }),

  // GET /api/notes/for_object/ - Notes for a specific object
  // IMPORTANT: Must be before :id handler to prevent "for_object" matching as :id
  http.get(`${BASE_URL}/notes/for_object/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const contentType = url.searchParams.get("content_type");
    const objectId = Number(url.searchParams.get("object_id"));

    const filtered = notesStore.filter(
      (n) => n.content_type_name === contentType && n.object_id === objectId,
    );
    return HttpResponse.json(filtered);
  }),

  // GET /api/notes/:id/ - Get single note
  http.get(`${BASE_URL}/notes/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const note = notesStore.find((n) => n.id === id);
    if (!note) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(note);
  }),

  // POST /api/notes/ - Create note
  http.post(`${BASE_URL}/notes/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newNote = createMockNote({
      id: notesStore.length + 100,
      title: (body.title as string) || "",
      content: body.content as string,
      object_id: body.object_id as number,
      content_type_name: body.content_type_model as string,
    });
    notesStore.push(newNote);
    return HttpResponse.json(newNote, { status: 201 });
  }),

  // PUT /api/notes/:id/ - Update note
  http.put(`${BASE_URL}/notes/:id/`, async ({ params, request }) => {
    await delay(50);
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const idx = notesStore.findIndex((n) => n.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    notesStore[idx] = {
      ...notesStore[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(notesStore[idx]);
  }),

  // DELETE /api/notes/:id/ - Delete note
  http.delete(`${BASE_URL}/notes/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const idx = notesStore.findIndex((n) => n.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    notesStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];
