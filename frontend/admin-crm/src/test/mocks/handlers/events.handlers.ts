// frontend/admin-crm/src/test/mocks/handlers/events.handlers.ts

import { http, HttpResponse, delay } from 'msw'

const BASE_URL = 'http://localhost:8000/api'

// Mock data
const mockEventTypes = [
  { id: 1, name: 'Wedding', description: 'Wedding ceremonies', is_active: true, color: '#FFB6C1' },
  { id: 2, name: 'Corporate', description: 'Corporate events', is_active: true, color: '#4169E1' },
  { id: 3, name: 'Birthday', description: 'Birthday parties', is_active: true, color: '#FFD700' },
  { id: 4, name: 'Inactive Type', description: 'Not used', is_active: false, color: '#808080' },
]

const mockEvents = [
  {
    id: 1,
    name: 'Smith Wedding',
    event_type: 1,
    event_type_name: 'Wedding',
    status: 'CONFIRMED',
    start_date: '2024-06-15T14:00:00Z',
    end_date: '2024-06-15T22:00:00Z',
    client: 1,
    client_name: 'John Smith',
    total_price: 15000,
    lead_source: 'Referral',
  },
  {
    id: 2,
    name: 'Tech Corp Annual Meeting',
    event_type: 2,
    event_type_name: 'Corporate',
    status: 'LEAD',
    start_date: '2024-07-20T09:00:00Z',
    end_date: '2024-07-20T17:00:00Z',
    client: 2,
    client_name: 'Jane Doe',
    total_price: 8000,
    lead_source: 'Website',
  },
  {
    id: 3,
    name: 'Birthday Celebration',
    event_type: 3,
    event_type_name: 'Birthday',
    status: 'COMPLETED',
    start_date: '2024-05-10T18:00:00Z',
    end_date: '2024-05-10T23:00:00Z',
    client: 3,
    client_name: 'Bob Johnson',
    total_price: 3000,
    lead_source: 'Social Media',
  },
]

let eventTypesStore = [...mockEventTypes]
let eventsStore = [...mockEvents]

export const resetEventsStore = () => {
  eventTypesStore = [...mockEventTypes]
  eventsStore = [...mockEvents]
}

export const eventsHandlers = [
  // GET /api/events/event-types/
  http.get(`${BASE_URL}/events/event-types/`, async ({ request }) => {
    await delay(30)

    const url = new URL(request.url)
    const isActive = url.searchParams.get('is_active')
    const search = url.searchParams.get('search')

    let filtered = [...eventTypesStore]
    if (isActive === 'true') {
      filtered = filtered.filter((et) => et.is_active)
    } else if (isActive === 'false') {
      filtered = filtered.filter((et) => !et.is_active)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (et) =>
          et.name.toLowerCase().includes(searchLower) ||
          et.description.toLowerCase().includes(searchLower)
      )
    }

    // Return paginated response format
    return HttpResponse.json({ results: filtered, count: filtered.length })
  }),

  // GET /api/events/event-types/:id/
  http.get(`${BASE_URL}/events/event-types/:id/`, async ({ params }) => {
    await delay(30)

    const { id } = params
    const eventType = eventTypesStore.find((et) => et.id === Number(id))

    if (!eventType) {
      return HttpResponse.json({ detail: 'Event type not found' }, { status: 404 })
    }

    return HttpResponse.json(eventType)
  }),

  // POST /api/events/event-types/
  http.post(`${BASE_URL}/events/event-types/`, async ({ request }) => {
    await delay(50)

    const body = (await request.json()) as { name: string; description?: string; color?: string }

    const newEventType = {
      id: Math.max(...eventTypesStore.map((et) => et.id)) + 1,
      name: body.name,
      description: body.description || '',
      is_active: true,
      color: body.color || '#808080',
    }

    eventTypesStore.push(newEventType)
    return HttpResponse.json(newEventType, { status: 201 })
  }),

  // PATCH /api/events/event-types/:id/
  http.patch(`${BASE_URL}/events/event-types/:id/`, async ({ params, request }) => {
    await delay(50)

    const { id } = params
    const body = (await request.json()) as Partial<(typeof mockEventTypes)[0]>

    const index = eventTypesStore.findIndex((et) => et.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Event type not found' }, { status: 404 })
    }

    eventTypesStore[index] = { ...eventTypesStore[index], ...body }
    return HttpResponse.json(eventTypesStore[index])
  }),

  // DELETE /api/events/event-types/:id/
  http.delete(`${BASE_URL}/events/event-types/:id/`, async ({ params }) => {
    await delay(50)

    const { id } = params
    const index = eventTypesStore.findIndex((et) => et.id === Number(id))

    if (index === -1) {
      return HttpResponse.json({ detail: 'Event type not found' }, { status: 404 })
    }

    // Check if any events use this type
    const hasEvents = eventsStore.some((e) => e.event_type === Number(id))
    if (hasEvents) {
      // Deactivate instead of delete - return 200 status
      eventTypesStore[index].is_active = false
      return HttpResponse.json(
        { detail: 'Event type has associated events and has been marked as inactive.' },
        { status: 200 }
      )
    }

    eventTypesStore.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // GET /api/events/events/
  http.get(`${BASE_URL}/events/events/`, async ({ request }) => {
    await delay(30)

    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const pageSize = Number(url.searchParams.get('page_size')) || 25
    const status = url.searchParams.get('status')
    const eventType = url.searchParams.get('event_type')
    const search = url.searchParams.get('search')

    let filtered = [...eventsStore]

    if (status) {
      filtered = filtered.filter((e) => e.status === status)
    }
    if (eventType) {
      filtered = filtered.filter((e) => e.event_type === Number(eventType))
    }
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.client_name.toLowerCase().includes(searchLower)
      )
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize
    const paginatedResults = filtered.slice(start, end)

    return HttpResponse.json({
      count: filtered.length,
      next: end < filtered.length ? `${BASE_URL}/events/events/?page=${page + 1}` : null,
      previous: page > 1 ? `${BASE_URL}/events/events/?page=${page - 1}` : null,
      page_count: Math.ceil(filtered.length / pageSize),
      current_page: page,
      page_size: pageSize,
      results: paginatedResults,
    })
  }),

  // GET /api/events/events/:id/
  http.get(`${BASE_URL}/events/events/:id/`, async ({ params }) => {
    await delay(30)

    const { id } = params
    const event = eventsStore.find((e) => e.id === Number(id))

    if (!event) {
      return HttpResponse.json({ detail: 'Event not found' }, { status: 404 })
    }

    return HttpResponse.json(event)
  }),

  // POST /api/events/events/
  http.post(`${BASE_URL}/events/events/`, async ({ request }) => {
    await delay(50)

    const body = (await request.json()) as {
      name: string
      event_type: number
      status: string
      start_date: string
      client: number
    }

    const eventType = eventTypesStore.find((et) => et.id === body.event_type)

    const newEvent = {
      id: Math.max(...eventsStore.map((e) => e.id)) + 1,
      name: body.name,
      event_type: body.event_type,
      event_type_name: eventType?.name || 'Unknown',
      status: body.status,
      start_date: body.start_date,
      end_date: null,
      client: body.client,
      client_name: 'New Client',
      total_price: 0,
      lead_source: '',
    }

    eventsStore.push(newEvent)
    return HttpResponse.json(newEvent, { status: 201 })
  }),

  // PATCH /api/events/events/:id/
  http.patch(`${BASE_URL}/events/events/:id/`, async ({ params, request }) => {
    await delay(50)

    const { id } = params
    const body = (await request.json()) as Partial<(typeof mockEvents)[0]>

    const index = eventsStore.findIndex((e) => e.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Event not found' }, { status: 404 })
    }

    eventsStore[index] = { ...eventsStore[index], ...body }
    return HttpResponse.json(eventsStore[index])
  }),

  // DELETE /api/events/events/:id/
  http.delete(`${BASE_URL}/events/events/:id/`, async ({ params }) => {
    await delay(50)

    const { id } = params
    const index = eventsStore.findIndex((e) => e.id === Number(id))

    if (index === -1) {
      return HttpResponse.json({ detail: 'Event not found' }, { status: 404 })
    }

    eventsStore.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
