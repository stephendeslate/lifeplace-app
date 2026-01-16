// frontend/admin-crm/src/test/mocks/handlers/auth.handlers.ts

import { http, HttpResponse, delay } from 'msw'
import { mockAdminUser, mockClientUser, mockTokens } from '../data/users.mock'
import type { LoginCredentials } from '../../../types/auth.types'

const BASE_URL = 'http://localhost:8000/api'

export const authHandlers = [
  // POST /api/users/login/
  http.post(`${BASE_URL}/users/login/`, async ({ request }) => {
    await delay(50)

    const body = (await request.json()) as LoginCredentials

    // Simulate invalid credentials
    if (body.email === 'invalid@example.com') {
      return HttpResponse.json(
        { detail: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Simulate client trying to access admin (non-admin role)
    if (body.email === 'client@example.com') {
      return HttpResponse.json({
        tokens: mockTokens,
        user: mockClientUser,
      })
    }

    // Successful admin login
    return HttpResponse.json({
      tokens: mockTokens,
      user: mockAdminUser,
    })
  }),

  // GET /api/users/me/
  http.get(`${BASE_URL}/users/me/`, async ({ request }) => {
    await delay(30)

    const authHeader = request.headers.get('Authorization')

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { detail: 'Authentication credentials were not provided.' },
        { status: 401 }
      )
    }

    // Simulate invalid token
    if (authHeader === 'Bearer invalid-token') {
      return HttpResponse.json(
        { detail: 'Token is invalid or expired' },
        { status: 401 }
      )
    }

    return HttpResponse.json(mockAdminUser)
  }),

  // POST /api/users/token/refresh/
  http.post(`${BASE_URL}/users/token/refresh/`, async ({ request }) => {
    await delay(30)

    const body = (await request.json()) as { refresh: string }

    if (!body.refresh || body.refresh === 'invalid-refresh-token') {
      return HttpResponse.json(
        { detail: 'Token is invalid or expired' },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      access: 'new-access-token-12345',
      refresh: 'new-refresh-token-67890',
    })
  }),

  // POST /api/users/me/change-password/
  http.post(`${BASE_URL}/users/me/change-password/`, async ({ request }) => {
    await delay(50)

    const body = (await request.json()) as {
      current_password: string
      new_password: string
      confirm_password: string
    }

    // Simulate wrong current password
    if (body.current_password === 'wrongpassword') {
      return HttpResponse.json(
        { detail: 'Current password is incorrect' },
        { status: 400 }
      )
    }

    // Simulate password mismatch
    if (body.new_password !== body.confirm_password) {
      return HttpResponse.json(
        { detail: 'Passwords do not match' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      detail: 'Password changed successfully',
    })
  }),

  // GET /api/users/invitations/:id/
  http.get(`${BASE_URL}/users/invitations/:id/`, async ({ params }) => {
    await delay(30)

    const { id } = params

    if (id === 'expired-invitation') {
      return HttpResponse.json({
        id,
        email: 'expired@example.com',
        first_name: 'Expired',
        last_name: 'User',
        invited_by: 'admin@lifeplace.com',
        expires_at: new Date(Date.now() - 1000).toISOString(), // Already expired
        is_accepted: false,
      })
    }

    if (id === 'not-found') {
      return HttpResponse.json(
        { detail: 'Invitation not found' },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      id,
      email: 'new@example.com',
      first_name: 'New',
      last_name: 'User',
      invited_by: 'admin@lifeplace.com',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      is_accepted: false,
    })
  }),

  // POST /api/users/invitations/:id/accept/
  http.post(`${BASE_URL}/users/invitations/:id/accept/`, async ({ params, request }) => {
    await delay(50)

    const { id } = params

    if (id === 'expired-invitation') {
      return HttpResponse.json(
        { detail: 'Invitation has expired' },
        { status: 400 }
      )
    }

    const body = (await request.json()) as {
      password: string
      confirm_password: string
    }

    if (body.password !== body.confirm_password) {
      return HttpResponse.json(
        { detail: 'Passwords do not match' },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      user: {
        ...mockAdminUser,
        id: 100,
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
      },
      tokens: mockTokens,
      detail: 'Account activated successfully',
    })
  }),
]
