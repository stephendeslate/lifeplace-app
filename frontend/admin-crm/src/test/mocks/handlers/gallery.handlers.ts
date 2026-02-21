import { http, HttpResponse, delay } from "msw";
import {
  mockGalleryPhotos,
  mockGalleryCategories,
  createMockGalleryPhoto,
} from "../data/gallery.mock";
import type { GalleryPhoto } from "../../../types/gallery.types";

const BASE_URL = "http://localhost:8000/api";

let photosStore: GalleryPhoto[] = [...mockGalleryPhotos];

export const resetGalleryStore = () => {
  photosStore = [...mockGalleryPhotos];
};

export const galleryHandlers = [
  // GET /api/venues/gallery-photos/ - List photos (paginated)
  http.get(`${BASE_URL}/venues/gallery-photos/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.toLowerCase();
    const category = url.searchParams.get("category");

    let filtered = [...photosStore];

    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          p.description.toLowerCase().includes(search),
      );
    }
    if (category) {
      filtered = filtered.filter((p) => p.category === category);
    }

    const ordering = url.searchParams.get("ordering");
    if (ordering === "sort_order") {
      filtered.sort((a, b) => a.sort_order - b.sort_order);
    } else if (ordering === "-sort_order") {
      filtered.sort((a, b) => b.sort_order - a.sort_order);
    } else if (ordering === "-created_at") {
      filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    const page = Number(url.searchParams.get("page") || 1);
    const pageSize = Number(url.searchParams.get("page_size") || 25);
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const paginated = filtered.slice(start, end);

    return HttpResponse.json({
      count: filtered.length,
      results: paginated,
      next: end < filtered.length ? `page=${page + 1}` : null,
      previous: page > 1 ? `page=${page - 1}` : null,
      page_count: Math.ceil(filtered.length / pageSize),
      current_page: page,
      page_size: pageSize,
    });
  }),

  // GET /api/venues/gallery-photos/:id/ - Get single photo
  http.get(`${BASE_URL}/venues/gallery-photos/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const photo = photosStore.find((p) => p.id === id);
    if (!photo) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    return HttpResponse.json(photo);
  }),

  // POST /api/venues/gallery-photos/ - Create photo (multipart/form-data)
  http.post(`${BASE_URL}/venues/gallery-photos/`, async ({ request }) => {
    await delay(50);
    const formData = await request.formData();
    const newPhoto = createMockGalleryPhoto({
      id: photosStore.length + 100,
      title: (formData.get("title") as string) || "",
      description: (formData.get("description") as string) || "",
      category: (formData.get("category") as string) || "GENERAL",
      venue: formData.get("venue") ? Number(formData.get("venue")) : null,
      event_type: formData.get("event_type")
        ? Number(formData.get("event_type"))
        : null,
      is_featured: formData.get("is_featured") === "true",
      is_active: formData.get("is_active") !== "false",
      sort_order: formData.get("sort_order")
        ? Number(formData.get("sort_order"))
        : photosStore.length + 1,
      image: `/media/gallery/photo-${photosStore.length + 100}.jpg`,
    });
    photosStore.push(newPhoto);
    return HttpResponse.json(newPhoto, { status: 201 });
  }),

  // PATCH /api/venues/gallery-photos/:id/ - Update photo (multipart/form-data)
  http.patch(
    `${BASE_URL}/venues/gallery-photos/:id/`,
    async ({ params, request }) => {
      await delay(50);
      const id = Number(params.id);
      const idx = photosStore.findIndex((p) => p.id === id);
      if (idx === -1) {
        return HttpResponse.json({ detail: "Not found." }, { status: 404 });
      }
      const formData = await request.formData();
      const updates: Partial<GalleryPhoto> = {};

      if (formData.has("title"))
        updates.title = formData.get("title") as string;
      if (formData.has("description"))
        updates.description = formData.get("description") as string;
      if (formData.has("category"))
        updates.category = formData.get("category") as string;
      if (formData.has("is_featured"))
        updates.is_featured = formData.get("is_featured") === "true";
      if (formData.has("is_active"))
        updates.is_active = formData.get("is_active") === "true";
      if (formData.has("sort_order"))
        updates.sort_order = Number(formData.get("sort_order"));

      photosStore[idx] = {
        ...photosStore[idx],
        ...updates,
        updated_at: new Date().toISOString(),
      };
      return HttpResponse.json(photosStore[idx]);
    },
  ),

  // DELETE /api/venues/gallery-photos/:id/ - Delete photo
  http.delete(`${BASE_URL}/venues/gallery-photos/:id/`, async ({ params }) => {
    await delay(50);
    const id = Number(params.id);
    const idx = photosStore.findIndex((p) => p.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: "Not found." }, { status: 404 });
    }
    photosStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/venues/gallery-photos/bulk-create/ - Bulk create photos
  http.post(
    `${BASE_URL}/venues/gallery-photos/bulk-create/`,
    async ({ request }) => {
      await delay(50);
      const formData = await request.formData();
      const category = (formData.get("category") as string) || "GENERAL";
      const files = formData.getAll("images");

      const newPhotos = files.map((_, i) => {
        const newId = photosStore.length + 100 + i;
        const photo = createMockGalleryPhoto({
          id: newId,
          title: `Bulk Photo ${newId}`,
          category,
          image: `/media/gallery/photo-${newId}.jpg`,
        });
        photosStore.push(photo);
        return photo;
      });

      return HttpResponse.json(newPhotos, { status: 201 });
    },
  ),
];
