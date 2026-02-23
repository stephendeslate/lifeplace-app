import { http, HttpResponse, delay } from 'msw';
import { mockEmailLayouts, createMockEmailLayout } from '../data/layouts.mock';
import type { EmailLayout } from '../../../types/layouts.types';

const BASE_URL = 'http://localhost:8000/api';

let layoutsStore: EmailLayout[] = [...mockEmailLayouts];

export const resetLayoutsStore = () => {
  layoutsStore = [...mockEmailLayouts];
};

export const layoutsHandlers = [
  // GET /api/communications/layouts/ - List layouts (paginated)
  http.get(`${BASE_URL}/communications/layouts/`, async ({ request }) => {
    await delay(30);
    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const isActive = url.searchParams.get('is_active');

    let filtered = [...layoutsStore];

    if (search) {
      filtered = filtered.filter(
        (l) =>
          l.name.toLowerCase().includes(search) || l.description.toLowerCase().includes(search),
      );
    }
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      filtered = filtered.filter((l) => l.is_active === (isActive === 'true'));
    }

    const ordering = url.searchParams.get('ordering');
    if (ordering === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (ordering === '-name') {
      filtered.sort((a, b) => b.name.localeCompare(a.name));
    } else if (ordering === '-created_at') {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    const page = Number(url.searchParams.get('page') || 1);
    const pageSize = Number(url.searchParams.get('page_size') || 25);
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

  // GET /api/communications/layouts/:id/ - Get single layout
  http.get(`${BASE_URL}/communications/layouts/:id/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const layout = layoutsStore.find((l) => l.id === id);
    if (!layout) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    return HttpResponse.json(layout);
  }),

  // POST /api/communications/layouts/ - Create layout
  http.post(`${BASE_URL}/communications/layouts/`, async ({ request }) => {
    await delay(50);
    const body = (await request.json()) as Record<string, unknown>;
    const newLayout = createMockEmailLayout({
      id: layoutsStore.length + 100,
      name: body.name as string,
      description: (body.description as string) || '',
      header_template: body.header_template as string,
      footer_template: body.footer_template as string,
      wrapper_template: body.wrapper_template as string,
      base_styles: (body.base_styles as string) || '',
      primary_color: (body.primary_color as string) || '#1976d2',
      secondary_color: (body.secondary_color as string) || '#dc004e',
      logo_url: (body.logo_url as string) || '',
      is_default: (body.is_default as boolean) || false,
      is_active: body.is_active !== false,
    });
    layoutsStore.push(newLayout);
    return HttpResponse.json(newLayout, { status: 201 });
  }),

  // PATCH /api/communications/layouts/:id/ - Update layout
  http.patch(`${BASE_URL}/communications/layouts/:id/`, async ({ params, request }) => {
    await delay(50);
    const id = Number(params.id);
    const body = (await request.json()) as Record<string, unknown>;
    const idx = layoutsStore.findIndex((l) => l.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    layoutsStore[idx] = {
      ...layoutsStore[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(layoutsStore[idx]);
  }),

  // DELETE /api/communications/layouts/:id/ - Delete layout
  http.delete(`${BASE_URL}/communications/layouts/:id/`, async ({ params }) => {
    await delay(50);
    const id = Number(params.id);
    const idx = layoutsStore.findIndex((l) => l.id === id);
    if (idx === -1) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    layoutsStore.splice(idx, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // POST /api/communications/layouts/:id/preview/ - Preview layout
  http.post(`${BASE_URL}/communications/layouts/:id/preview/`, async ({ params, request }) => {
    await delay(50);
    const id = Number(params.id);
    const layout = layoutsStore.find((l) => l.id === id);
    if (!layout) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const sampleContent = (body.sample_content as string) || '<p>Sample email content</p>';
    const html = layout.wrapper_template
      .replace('{{header}}', layout.header_template)
      .replace('{{content}}', sampleContent)
      .replace('{{footer}}', layout.footer_template);
    return HttpResponse.json({ html });
  }),

  // GET /api/communications/layouts/:id/history/ - Get layout history
  http.get(`${BASE_URL}/communications/layouts/:id/history/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const layout = layoutsStore.find((l) => l.id === id);
    if (!layout) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    return HttpResponse.json([
      {
        id: 1,
        version: 1,
        name: layout.name,
        description: layout.description,
        header_template: layout.header_template,
        footer_template: layout.footer_template,
        wrapper_template: layout.wrapper_template,
        base_styles: layout.base_styles,
        primary_color: layout.primary_color,
        secondary_color: layout.secondary_color,
        logo_url: layout.logo_url,
        reason: 'CREATE',
        notes: 'Initial creation',
        changed_by: 1,
        changed_by_name: 'Admin User',
        created_at: layout.created_at,
      },
    ]);
  }),

  // POST /api/communications/layouts/:id/rollback/ - Rollback layout
  http.post(`${BASE_URL}/communications/layouts/:id/rollback/`, async ({ params }) => {
    await delay(50);
    const id = Number(params.id);
    const layout = layoutsStore.find((l) => l.id === id);
    if (!layout) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    return HttpResponse.json({
      ...layout,
      updated_at: new Date().toISOString(),
    });
  }),

  // GET /api/communications/layouts/:id/templates/ - Get layout templates
  http.get(`${BASE_URL}/communications/layouts/:id/templates/`, async ({ params }) => {
    await delay(30);
    const id = Number(params.id);
    const layout = layoutsStore.find((l) => l.id === id);
    if (!layout) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    // Return empty array - templates are managed by communications handlers
    return HttpResponse.json([]);
  }),

  // POST /api/communications/layouts/:id/duplicate/ - Duplicate layout
  http.post(`${BASE_URL}/communications/layouts/:id/duplicate/`, async ({ params, request }) => {
    await delay(50);
    const id = Number(params.id);
    const layout = layoutsStore.find((l) => l.id === id);
    if (!layout) {
      return HttpResponse.json({ detail: 'Not found.' }, { status: 404 });
    }
    const body = (await request.json()) as Record<string, unknown>;
    const duplicated = createMockEmailLayout({
      ...layout,
      id: layoutsStore.length + 100,
      name: (body.new_name as string) || `${layout.name} (Copy)`,
      is_default: false,
      template_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    layoutsStore.push(duplicated);
    return HttpResponse.json(duplicated, { status: 201 });
  }),
];
