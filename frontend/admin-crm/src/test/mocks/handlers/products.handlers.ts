// frontend/admin-crm/src/test/mocks/handlers/products.handlers.ts

import { http, HttpResponse, delay } from 'msw'

const BASE_URL = 'http://localhost:8000/api'

// Mock data
const mockCategories = [
  { id: 1, name: 'Venue Services', description: 'Venue rental services', parent: null, is_active: true },
  { id: 2, name: 'Catering', description: 'Food and beverage services', parent: null, is_active: true },
  { id: 3, name: 'Photography', description: 'Photo services', parent: null, is_active: true },
  { id: 4, name: 'Premium Catering', description: 'High-end catering', parent: 2, is_active: true },
]

const mockProducts = [
  {
    id: 1,
    name: 'Basic Venue Package',
    description: 'Standard venue rental',
    category: 1,
    category_name: 'Venue Services',
    base_price: 5000,
    currency: 'USD',
    sku: 'VEN-001',
    is_active: true,
    is_package: true,
    is_featured: false,
  },
  {
    id: 2,
    name: 'Premium Catering',
    description: 'Full catering service',
    category: 2,
    category_name: 'Catering',
    base_price: 3000,
    currency: 'USD',
    sku: 'CAT-001',
    is_active: true,
    is_package: false,
    is_featured: true,
  },
  {
    id: 3,
    name: 'Photography Package',
    description: '8 hour photography coverage',
    category: 3,
    category_name: 'Photography',
    base_price: 2500,
    currency: 'USD',
    sku: 'PHO-001',
    is_active: true,
    is_package: true,
    is_featured: true,
  },
  {
    id: 4,
    name: 'Inactive Product',
    description: 'No longer available',
    category: 1,
    category_name: 'Venue Services',
    base_price: 1000,
    currency: 'USD',
    sku: 'VEN-002',
    is_active: false,
    is_package: false,
    is_featured: false,
  },
]

const mockDiscounts = [
  {
    id: 1,
    name: 'Early Bird',
    code: 'EARLY20',
    discount_type: 'PERCENTAGE',
    value: 20,
    is_active: true,
    valid_from: '2024-01-01T00:00:00Z',
    valid_until: '2024-12-31T23:59:59Z',
    max_uses: 100,
    current_uses: 25,
  },
  {
    id: 2,
    name: 'Flat $500 Off',
    code: 'FLAT500',
    discount_type: 'FIXED',
    value: 500,
    is_active: true,
    valid_from: '2024-01-01T00:00:00Z',
    valid_until: '2024-06-30T23:59:59Z',
    max_uses: 50,
    current_uses: 10,
  },
]

let categoriesStore = [...mockCategories]
let productsStore = [...mockProducts]
let discountsStore = [...mockDiscounts]

export const resetProductsStore = () => {
  categoriesStore = [...mockCategories]
  productsStore = [...mockProducts]
  discountsStore = [...mockDiscounts]
}

export const productsHandlers = [
  // GET /api/products/categories/all/ (default endpoint for non-paginated)
  http.get(`${BASE_URL}/products/categories/all/`, async () => {
    await delay(30)
    return HttpResponse.json(categoriesStore)
  }),

  // GET /api/products/categories/ (paginated)
  http.get(`${BASE_URL}/products/categories/`, async () => {
    await delay(30)
    return HttpResponse.json({ results: categoriesStore, count: categoriesStore.length })
  }),

  // GET /api/products/categories/tree/
  http.get(`${BASE_URL}/products/categories/tree/`, async () => {
    await delay(30)
    // Return hierarchical structure
    const rootCategories = categoriesStore
      .filter((c) => c.parent === null)
      .map((c) => ({
        ...c,
        children: categoriesStore.filter((child) => child.parent === c.id),
      }))
    return HttpResponse.json(rootCategories)
  }),

  // GET /api/products/categories/root/
  http.get(`${BASE_URL}/products/categories/root/`, async () => {
    await delay(30)
    return HttpResponse.json(categoriesStore.filter((c) => c.parent === null))
  }),

  // GET /api/products/categories/:id/
  http.get(`${BASE_URL}/products/categories/:id/`, async ({ params }) => {
    await delay(30)
    const { id } = params
    const category = categoriesStore.find((c) => c.id === Number(id))
    if (!category) {
      return HttpResponse.json({ detail: 'Category not found' }, { status: 404 })
    }
    return HttpResponse.json(category)
  }),

  // POST /api/products/categories/
  http.post(`${BASE_URL}/products/categories/`, async ({ request }) => {
    await delay(50)
    const body = (await request.json()) as { name: string; description?: string; parent?: number }
    const newCategory = {
      id: Math.max(...categoriesStore.map((c) => c.id)) + 1,
      name: body.name,
      description: body.description || '',
      parent: body.parent || null,
      is_active: true,
    }
    categoriesStore.push(newCategory)
    return HttpResponse.json(newCategory, { status: 201 })
  }),

  // PATCH /api/products/categories/:id/
  http.patch(`${BASE_URL}/products/categories/:id/`, async ({ params, request }) => {
    await delay(50)
    const { id } = params
    const body = (await request.json()) as Partial<(typeof mockCategories)[0]>
    const index = categoriesStore.findIndex((c) => c.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Category not found' }, { status: 404 })
    }
    categoriesStore[index] = { ...categoriesStore[index], ...body }
    return HttpResponse.json(categoriesStore[index])
  }),

  // DELETE /api/products/categories/:id/
  http.delete(`${BASE_URL}/products/categories/:id/`, async ({ params }) => {
    await delay(50)
    const { id } = params
    const index = categoriesStore.findIndex((c) => c.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Category not found' }, { status: 404 })
    }
    categoriesStore.splice(index, 1)
    return HttpResponse.json({ success: true })
  }),

  // GET /api/products/products/all/ (default endpoint for non-paginated)
  http.get(`${BASE_URL}/products/products/all/`, async ({ request }) => {
    await delay(30)
    const url = new URL(request.url)
    const categoryId = url.searchParams.get('category_id')
    const isActive = url.searchParams.get('is_active')
    const isFeatured = url.searchParams.get('is_featured')
    const search = url.searchParams.get('search')

    let filtered = [...productsStore]

    if (categoryId) {
      filtered = filtered.filter((p) => p.category === Number(categoryId))
    }
    if (isActive === 'true') {
      filtered = filtered.filter((p) => p.is_active)
    } else if (isActive === 'false') {
      filtered = filtered.filter((p) => !p.is_active)
    }
    if (isFeatured === 'true') {
      filtered = filtered.filter((p) => p.is_featured)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      )
    }

    return HttpResponse.json(filtered)
  }),

  // GET /api/products/products/ (paginated)
  http.get(`${BASE_URL}/products/products/`, async ({ request }) => {
    await delay(30)
    const url = new URL(request.url)
    const categoryId = url.searchParams.get('category_id')
    const isActive = url.searchParams.get('is_active')
    const search = url.searchParams.get('search')

    let filtered = [...productsStore]

    if (categoryId) {
      filtered = filtered.filter((p) => p.category === Number(categoryId))
    }
    if (isActive === 'true') {
      filtered = filtered.filter((p) => p.is_active)
    } else if (isActive === 'false') {
      filtered = filtered.filter((p) => !p.is_active)
    }
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      )
    }

    return HttpResponse.json({ results: filtered, count: filtered.length })
  }),

  // GET /api/products/products/products/ (products only, not packages)
  http.get(`${BASE_URL}/products/products/products/`, async () => {
    await delay(30)
    return HttpResponse.json(productsStore.filter((p) => !p.is_package && p.is_active))
  }),

  // GET /api/products/products/packages/ (packages only)
  http.get(`${BASE_URL}/products/products/packages/`, async () => {
    await delay(30)
    return HttpResponse.json(productsStore.filter((p) => p.is_package && p.is_active))
  }),

  // GET /api/products/products/active/
  http.get(`${BASE_URL}/products/products/active/`, async () => {
    await delay(30)
    return HttpResponse.json(productsStore.filter((p) => p.is_active))
  }),

  // GET /api/products/products/featured/
  http.get(`${BASE_URL}/products/products/featured/`, async () => {
    await delay(30)
    return HttpResponse.json(productsStore.filter((p) => p.is_featured && p.is_active))
  }),

  // GET /api/products/products/by_category/
  http.get(`${BASE_URL}/products/products/by_category/`, async ({ request }) => {
    await delay(30)
    const url = new URL(request.url)
    const categoryId = url.searchParams.get('category_id')
    return HttpResponse.json(
      productsStore.filter((p) => p.category === Number(categoryId) && p.is_active)
    )
  }),

  // GET /api/products/products/:id/
  http.get(`${BASE_URL}/products/products/:id/`, async ({ params }) => {
    await delay(30)
    const { id } = params
    const product = productsStore.find((p) => p.id === Number(id))
    if (!product) {
      return HttpResponse.json({ detail: 'Product not found' }, { status: 404 })
    }
    return HttpResponse.json(product)
  }),

  // POST /api/products/products/
  http.post(`${BASE_URL}/products/products/`, async ({ request }) => {
    await delay(50)
    const body = (await request.json()) as {
      name: string
      description?: string
      category: number
      base_price: number
      currency: string
    }

    const category = categoriesStore.find((c) => c.id === body.category)

    const newProduct = {
      id: Math.max(...productsStore.map((p) => p.id)) + 1,
      name: body.name,
      description: body.description || '',
      category: body.category,
      category_name: category?.name || 'Unknown',
      base_price: body.base_price,
      currency: body.currency,
      sku: `PRD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      is_active: true,
      is_package: false,
      is_featured: false,
    }

    productsStore.push(newProduct)
    return HttpResponse.json(newProduct, { status: 201 })
  }),

  // PATCH /api/products/products/:id/
  http.patch(`${BASE_URL}/products/products/:id/`, async ({ params, request }) => {
    await delay(50)
    const { id } = params
    const body = (await request.json()) as Partial<(typeof mockProducts)[0]>
    const index = productsStore.findIndex((p) => p.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Product not found' }, { status: 404 })
    }
    productsStore[index] = { ...productsStore[index], ...body }
    return HttpResponse.json(productsStore[index])
  }),

  // DELETE /api/products/products/:id/
  http.delete(`${BASE_URL}/products/products/:id/`, async ({ params }) => {
    await delay(50)
    const { id } = params
    const index = productsStore.findIndex((p) => p.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Product not found' }, { status: 404 })
    }
    productsStore.splice(index, 1)
    return HttpResponse.json({ success: true })
  }),

  // GET /api/products/discounts/all/ (default endpoint for non-paginated)
  http.get(`${BASE_URL}/products/discounts/all/`, async () => {
    await delay(30)
    return HttpResponse.json(discountsStore)
  }),

  // GET /api/products/discounts/ (paginated)
  http.get(`${BASE_URL}/products/discounts/`, async () => {
    await delay(30)
    return HttpResponse.json({ results: discountsStore, count: discountsStore.length })
  }),

  // GET /api/products/discounts/valid/
  http.get(`${BASE_URL}/products/discounts/valid/`, async () => {
    await delay(30)
    const now = new Date()
    return HttpResponse.json(
      discountsStore.filter((d) => {
        return (
          d.is_active &&
          new Date(d.valid_from) <= now &&
          new Date(d.valid_until) >= now &&
          d.current_uses < d.max_uses
        )
      })
    )
  }),

  // GET /api/products/discounts/:id/
  http.get(`${BASE_URL}/products/discounts/:id/`, async ({ params }) => {
    await delay(30)
    const { id } = params
    const discount = discountsStore.find((d) => d.id === Number(id))
    if (!discount) {
      return HttpResponse.json({ detail: 'Discount not found' }, { status: 404 })
    }
    return HttpResponse.json(discount)
  }),

  // POST /api/products/discounts/
  http.post(`${BASE_URL}/products/discounts/`, async ({ request }) => {
    await delay(50)
    const body = (await request.json()) as {
      name: string
      code: string
      discount_type: string
      value: number
    }

    const newDiscount = {
      id: Math.max(...discountsStore.map((d) => d.id)) + 1,
      name: body.name,
      code: body.code,
      discount_type: body.discount_type,
      value: body.value,
      is_active: true,
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      max_uses: 100,
      current_uses: 0,
    }

    discountsStore.push(newDiscount)
    return HttpResponse.json(newDiscount, { status: 201 })
  }),

  // DELETE /api/products/discounts/:id/
  http.delete(`${BASE_URL}/products/discounts/:id/`, async ({ params }) => {
    await delay(50)
    const { id } = params
    const index = discountsStore.findIndex((d) => d.id === Number(id))
    if (index === -1) {
      return HttpResponse.json({ detail: 'Discount not found' }, { status: 404 })
    }
    discountsStore.splice(index, 1)
    return HttpResponse.json({ success: true })
  }),
]
