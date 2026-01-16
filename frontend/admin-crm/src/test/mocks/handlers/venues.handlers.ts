// frontend/admin-crm/src/test/mocks/handlers/venues.handlers.ts

import { http, HttpResponse, delay } from 'msw'

const BASE_URL = 'http://localhost:8000/api'

// Mock data
const mockVenues = [
  {
    id: 1,
    name: 'Grand Ballroom',
    description: 'Elegant ballroom for large events',
    capacity: 300,
    base_price: 5000,
    is_active: true,
    is_bookable: true,
    is_overnight: false,
  },
  {
    id: 2,
    name: 'Garden Terrace',
    description: 'Beautiful outdoor venue',
    capacity: 150,
    base_price: 3500,
    is_active: true,
    is_bookable: true,
    is_overnight: false,
  },
  {
    id: 3,
    name: 'Conference Suite',
    description: 'Professional meeting space',
    capacity: 50,
    base_price: 1500,
    is_active: true,
    is_bookable: true,
    is_overnight: false,
  },
  {
    id: 4,
    name: 'Inactive Venue',
    description: 'Not available',
    capacity: 100,
    base_price: 2000,
    is_active: false,
    is_bookable: false,
    is_overnight: false,
  },
]

const mockBlockedDates = [
  {
    id: 1,
    venue: 1,
    venue_name: 'Grand Ballroom',
    start_date: '2024-12-25',
    end_date: '2024-12-26',
    reason: 'Holiday closure',
  },
]

const mockPackageVenues = [
  {
    id: 1,
    package: 1,
    package_name: 'Basic Package',
    venue: 1,
    venue_name: 'Grand Ballroom',
    is_primary: true,
    is_default: true,
  },
]

let venuesStore = [...mockVenues]
let blockedDatesStore = [...mockBlockedDates]
let packageVenuesStore = [...mockPackageVenues]

export const resetVenuesStore = () => {
  venuesStore = [...mockVenues]
  blockedDatesStore = [...mockBlockedDates]
  packageVenuesStore = [...mockPackageVenues]
}

export const venuesHandlers = [
  // GET /api/venues/venues/
  http.get(`${BASE_URL}/venues/venues/`, async ({ request }) => {
    await delay(30)

    const url = new URL(request.url)
    const isActive = url.searchParams.get('is_active')
    const isBookable = url.searchParams.get('is_bookable')
    const search = url.searchParams.get('search')

    let filtered = [...venuesStore]

    if (isActive === 'true') {
      filtered = filtered.filter((v) => v.is_active)
    } else if (isActive === 'false') {
      filtered = filtered.filter((v) => !v.is_active)
    }
    if (isBookable === 'true') {
      filtered = filtered.filter((v) => v.is_bookable)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (v) =>
          v.name.toLowerCase().includes(searchLower) ||
          v.description.toLowerCase().includes(searchLower)
      )
    }

    return HttpResponse.json(filtered)
  }),

  // GET /api/venues/venues/all/
  http.get(`${BASE_URL}/venues/venues/all/`, async () => {
    await delay(30)
    return HttpResponse.json(venuesStore)
  }),

  // GET /api/venues/venues/active/
  http.get(`${BASE_URL}/venues/venues/active/`, async () => {
    await delay(30)
    return HttpResponse.json(venuesStore.filter((v) => v.is_active))
  }),

  // GET /api/venues/venues/:id/
  http.get(`${BASE_URL}/venues/venues/:id/`, async ({ params }) => {
    await delay(30)
    const { id } = params
    const venue = venuesStore.find((v) => v.id === Number(id))
    if (!venue) {
      return HttpResponse.json({ detail: 'Venue not found' }, { status: 404 })
    }
    return HttpResponse.json(venue)
  }),

  // POST /api/venues/venues/
  http.post(`${BASE_URL}/venues/venues/`, async ({ request }) => {
    await delay(50)
    const body = (await request.json()) as {
      name: string
      description?: string
      capacity: number
      base_price: number
    }

    const newVenue = {
      id: Math.max(...venuesStore.map((v) => v.id)) + 1,
      name: body.name,
      description: body.description || '',
      capacity: body.capacity,
      base_price: body.base_price,
      is_active: true,
      is_bookable: true,
      is_overnight: false,
    }

    venuesStore.push(newVenue)
    return HttpResponse.json(newVenue, { status: 201 })
  }),

  // PATCH /api/venues/venues/:id/
  http.patch(`${BASE_URL}/venues/venues/:id/`, async ({ params, request }) => {
    await delay(50)
    const { id } = params
    const body = (await request.json()) as Partial<(typeof mockVenues)[0]>
    const index = venuesStore.findIndex((v) => v.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Venue not found' }, { status: 404 })
    }
    venuesStore[index] = { ...venuesStore[index], ...body }
    return HttpResponse.json(venuesStore[index])
  }),

  // DELETE /api/venues/venues/:id/
  http.delete(`${BASE_URL}/venues/venues/:id/`, async ({ params }) => {
    await delay(50)
    const { id } = params
    const index = venuesStore.findIndex((v) => v.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Venue not found' }, { status: 404 })
    }
    venuesStore.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // GET /api/venues/venues/:id/operating_rules/
  http.get(`${BASE_URL}/venues/venues/:id/operating_rules/`, async ({ params }) => {
    await delay(30)
    const { id } = params
    return HttpResponse.json({
      id: Number(id),
      venue: Number(id),
      default_start_time: '10:00:00',
      default_end_time: '22:00:00',
      min_booking_duration_hours: 4,
      max_booking_duration_hours: 12,
      advance_booking_days: 90,
      min_advance_notice_hours: 48,
    })
  }),

  // GET /api/venues/blocked-dates/
  http.get(`${BASE_URL}/venues/blocked-dates/`, async ({ request }) => {
    await delay(30)
    const url = new URL(request.url)
    const venueId = url.searchParams.get('venue_id')

    let filtered = [...blockedDatesStore]
    if (venueId) {
      filtered = filtered.filter((b) => b.venue === Number(venueId))
    }

    return HttpResponse.json(filtered)
  }),

  // POST /api/venues/blocked-dates/
  http.post(`${BASE_URL}/venues/blocked-dates/`, async ({ request }) => {
    await delay(50)
    const body = (await request.json()) as {
      venue: number
      start_date: string
      end_date: string
      reason?: string
    }

    const venue = venuesStore.find((v) => v.id === body.venue)

    const newBlockedDate = {
      id: Math.max(...blockedDatesStore.map((b) => b.id)) + 1,
      venue: body.venue,
      venue_name: venue?.name || 'Unknown',
      start_date: body.start_date,
      end_date: body.end_date,
      reason: body.reason || '',
    }

    blockedDatesStore.push(newBlockedDate)
    return HttpResponse.json(newBlockedDate, { status: 201 })
  }),

  // DELETE /api/venues/blocked-dates/:id/
  http.delete(`${BASE_URL}/venues/blocked-dates/:id/`, async ({ params }) => {
    await delay(50)
    const { id } = params
    const index = blockedDatesStore.findIndex((b) => b.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Blocked date not found' }, { status: 404 })
    }
    blockedDatesStore.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  // GET /api/venues/package-venues/
  http.get(`${BASE_URL}/venues/package-venues/`, async ({ request }) => {
    await delay(30)
    const url = new URL(request.url)
    const packageId = url.searchParams.get('package_id')
    const venueId = url.searchParams.get('venue_id')

    let filtered = [...packageVenuesStore]
    if (packageId) {
      filtered = filtered.filter((pv) => pv.package === Number(packageId))
    }
    if (venueId) {
      filtered = filtered.filter((pv) => pv.venue === Number(venueId))
    }

    return HttpResponse.json(filtered)
  }),

  // POST /api/venues/package-venues/
  http.post(`${BASE_URL}/venues/package-venues/`, async ({ request }) => {
    await delay(50)
    const body = (await request.json()) as {
      package: number
      venue: number
      is_primary?: boolean
      is_default?: boolean
    }

    const venue = venuesStore.find((v) => v.id === body.venue)

    const newPackageVenue = {
      id: Math.max(...packageVenuesStore.map((pv) => pv.id)) + 1,
      package: body.package,
      package_name: 'Package',
      venue: body.venue,
      venue_name: venue?.name || 'Unknown',
      is_primary: body.is_primary || false,
      is_default: body.is_default || false,
    }

    packageVenuesStore.push(newPackageVenue)
    return HttpResponse.json(newPackageVenue, { status: 201 })
  }),

  // DELETE /api/venues/package-venues/:id/
  http.delete(`${BASE_URL}/venues/package-venues/:id/`, async ({ params }) => {
    await delay(50)
    const { id } = params
    const index = packageVenuesStore.findIndex((pv) => pv.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Package venue not found' }, { status: 404 })
    }
    packageVenuesStore.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
