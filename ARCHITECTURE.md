# LifePlace System Architecture

**Last Updated:** 2025-10-15
**Version:** MVP (Production Ready)
**Environment:** Railway (Backend) + Netlify (Frontend)

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Backend Architecture](#backend-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Database Schema](#database-schema)
6. [Deployment Architecture](#deployment-architecture)
7. [External Integrations](#external-integrations)
8. [Development Workflow](#development-workflow)

---

## System Overview

LifePlace is a full-stack event management platform for managing the complete event lifecycle from booking to completion. The system consists of:

- **Backend API:** Django REST Framework serving JSON APIs
- **Admin CRM:** React admin dashboard for internal staff
- **Client Portal:** React booking and event management interface for customers
- **Real-time Messaging:** WebSocket-based notifications and chat

### Key Capabilities
- Multi-step booking flow with payment processing
- Contract generation and e-signature
- Quote and invoice management
- Event workflow automation
- Client communication via email/SMS
- Real-time notifications
- Analytics and reporting

---

## Technology Stack

### Backend
| Component | Version | Purpose |
|-----------|---------|---------|
| Python | 3.12 | Runtime |
| Django | 5.2.1 | Web framework |
| Django REST Framework | 3.16.0 | API framework |
| PostgreSQL | 16+ | Primary database |
| Redis | Latest | Cache & message broker |
| Celery | 5.5.3 | Async task processing |
| Daphne | 4.1.2 | ASGI server for WebSockets |
| Gunicorn | 23.0.0 | WSGI server for HTTP |
| Channels | 4.1.0 | WebSocket support |

### Frontend
| Component | Version | Purpose |
|-----------|---------|---------|
| Node.js | 24.2.0 | Runtime |
| React | 19.1.0 | UI framework |
| TypeScript | 5.x | Type safety |
| Material-UI | 7.1.1 | Component library |
| React Query | 5.80.5 | Server state management |
| React Router | 7.6.2 | Navigation |
| Vite | Latest | Build tool |
| Vitest | Latest | Testing framework |
| Axios | 1.9.0 | HTTP client |

### Key Libraries
- **Stripe:** Payment processing (12.2.0)
- **ReportLab:** PDF generation (4.2.5)
- **TipTap:** Rich text editor (admin-crm)
- **Recharts:** Data visualization (3.1.2)
- **date-fns:** Date manipulation (4.1.0)

---

## Backend Architecture

### Domain-Driven Design Structure

The backend follows Domain-Driven Design with 16 core domains:

```
backend/core/domains/
├── analytics/        # Event tracking and reporting
├── bookingflow/      # Multi-step booking engine
├── clients/          # Client management
├── communications/   # Email/SMS templates and sending
├── contracts/        # Contract generation and e-signature
├── events/           # Event lifecycle management
├── messaging/        # Real-time WebSocket messaging
├── notes/            # Internal notes system
├── notifications/    # In-app notifications
├── payments/         # Payment processing and invoicing
├── products/         # Product catalog and pricing
├── questionnaires/   # Dynamic form builder
├── sales/            # Quote generation and management
├── settings/         # Application configuration
├── users/            # Authentication and user management
└── workflows/        # Workflow automation engine
```

### Domain Structure (Typical)
```
domain/
├── models.py           # Database models
├── serializers.py      # DRF serializers
├── views.py            # API endpoints
├── urls.py             # URL routing
├── services.py         # Business logic
├── signals.py          # Event handlers
├── tasks.py            # Celery background tasks
├── tests.py            # Unit tests
└── management/
    └── commands/       # Django management commands
```

### API Architecture

**Base URL:** `/api/`

**Authentication:** JWT tokens via SimpleJWT
- Access token lifetime: 1 hour
- Refresh token lifetime: 7 days
- Token rotation enabled

**Key API Patterns:**
- RESTful endpoints for CRUD operations
- Pagination: 25 items per page (configurable)
- Rate limiting: Varies by endpoint (100-2000 req/hour)
- Error format: DRF standard JSON responses

**Example Endpoints:**
```
/api/users/               # User management
/api/events/              # Event CRUD
/api/payments/invoices/   # Invoice management
/api/bookingflow/session/ # Booking flow state
/api/messaging/channels/  # WebSocket channels
```

### Middleware Stack (Request Flow)
1. CORS middleware
2. Security middleware (custom)
3. WhiteNoise (static files)
4. Session middleware
5. CSRF middleware
6. Authentication middleware
7. Rate limiting (DRF throttling)

### Background Tasks (Celery)

**Broker:** Redis
**Result Backend:** Redis
**Beat Scheduler:** Django Celery Beat

**Common Tasks:**
- Send email notifications
- Process Stripe webhooks
- Generate PDF contracts/invoices
- Cleanup old sessions
- Analytics aggregation

---

## Frontend Architecture

### Monorepo Structure
```
frontend/
├── admin-crm/          # Internal admin dashboard
├── client-portal/      # Customer booking interface
└── shared/             # Shared components/utilities
```

### Admin CRM Features
- Event management dashboard
- Client and contact management
- Quote and invoice creation
- Contract generation with TipTap editor
- Workflow automation
- Analytics and reporting
- Real-time messaging

### Client Portal Features
- Multi-step booking flow
- Payment processing with Stripe
- Contract signing
- Event details and timeline
- Invoice viewing
- Real-time chat with staff

### State Management

**Server State:** React Query (TanStack Query)
- 5-minute stale time
- Automatic refetching
- Optimistic updates
- Request deduplication

**Local State:** React hooks (useState, useContext)
- Auth context
- Toast notifications
- Layout state

**Form State:** React Hook Form
- Zod validation
- Type-safe forms

### Component Architecture

```
src/
├── apis/              # API client functions
├── components/        # Reusable components
│   ├── common/       # Shared UI components
│   ├── events/       # Event-specific components
│   ├── payments/     # Payment components
│   └── ...
├── contexts/         # React contexts (Auth, Toast, etc.)
├── hooks/            # Custom React hooks
├── pages/            # Page components (routes)
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

### Routing Structure

**Admin CRM:**
```
/                      # Dashboard
/events               # Events list
/events/:id           # Event details
/clients              # Client management
/sales/quotes         # Quote management
/workflows            # Workflow automation
```

**Client Portal:**
```
/                     # Home/Welcome
/booking/:flow_id    # Multi-step booking
/events              # My events
/invoices            # My invoices
/contracts/:id       # Contract signing
```

---

## Database Schema

**Database:** PostgreSQL 16+
**ORM:** Django ORM
**Migrations:** Django migrations system

### Core Tables (Simplified)

```
users_user                  # User accounts (staff + clients)
├── email, name, role
└── is_staff, is_client

events_event                # Events
├── client, title, date
├── status, venue
└── assigned_staff

payments_invoice           # Invoices
├── event, client
├── total_amount, paid_amount
└── due_date, status

payments_paymentgateway    # Payment gateways
├── name, gateway_type
└── is_active, config

bookingflow_bookingflow    # Booking flows
├── name, is_active
└── steps (JSON)

contracts_contract         # Contracts
├── event, client
├── content (HTML)
└── signature, signed_at

products_product          # Products/Packages
├── name, category
├── base_price
└── is_addon

workflows_workflowstage   # Workflow stages
├── workflow, name
├── stage_type
└── order
```

### Database Indexes
- Foreign keys (automatic)
- Email uniqueness
- Event date lookups
- Payment status queries
- Workflow ordering

---

## Deployment Architecture

### Production Environment

```
┌─────────────────┐
│   Cloudflare    │  CDN & DNS
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼────┐ ┌─▼─────────┐
│ Netlify│ │  Railway  │
│Frontend│ │  Backend  │
└────────┘ └─────┬─────┘
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼────┐    ┌─────▼──────┐
    │PostgreSQL│   │   Redis    │
    │(Railway) │   │  (Upstash) │
    └──────────┘   └────────────┘
```

### Backend Deployment (Railway)

**Platform:** Railway.app
**Region:** US West (Oregon)
**Server:** Gunicorn with Daphne for WebSockets

**Environment:**
- Database: Railway-managed PostgreSQL
- Cache: Upstash Redis (rediss:// SSL)
- Static files: WhiteNoise (compressed)

**Start Command:**
```bash
python manage.py prepare_template_seeding --force && \
python manage.py migrate --no-input && \
python manage.py seed_default_settings && \
gunicorn -c gunicorn.conf.py core.wsgi:application
```

**Workers:** CPU × 2 + 1 (dynamic)
**Timeout:** 120 seconds (for Stripe API calls)
**Max Requests:** 1000 per worker (memory management)

### Frontend Deployment (Netlify)

**Admin CRM:** Separate Netlify site
**Client Portal:** Separate Netlify site

**Build Command:** `npm run build`
**Publish Directory:** `dist/`
**Node Version:** 20.x

**Environment Variables:**
- `VITE_API_URL`: Backend API URL
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key

### CI/CD Pipeline

**Platform:** GitHub Actions
**File:** `.github/workflows/ci-cd.yml`

**Pipeline Stages:**
1. **Test Backend:** Django tests + system checks
2. **Test Frontend:** TypeScript + ESLint + Vitest
3. **Deploy Admin CRM:** Netlify (on main branch)
4. **Deploy Client Portal:** Netlify (on main branch)
5. **Deploy Backend:** Railway auto-deploy (on main branch)

**Tests Run On:**
- Every pull request
- Every push to main
- Manual trigger

---

## External Integrations

### Payment Processing
**Provider:** Stripe
**Integration:** Stripe Python SDK + Stripe.js
**Features:**
- Payment intents
- Customer management
- Payment methods (cards, wallets)
- Webhooks for async updates

### Email/SMS
**Provider:** Brevo (formerly Sendinblue)
**Integration:** REST API
**Features:**
- Transactional emails
- Template management
- Webhook event tracking

### File Storage
**Current:** Local filesystem (WhiteNoise)
**Future:** AWS S3 or Cloudflare R2

---

## Development Workflow

### Local Development Setup

**1. Backend Setup:**
```bash
cd backend
source ../venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
daphne -p 8000 core.asgi:application  # For WebSockets
# OR
python manage.py runserver            # For HTTP only
```

**2. Frontend Setup (Admin CRM):**
```bash
cd frontend/admin-crm
npm install
npm run dev  # Runs on :5173
```

**3. Frontend Setup (Client Portal):**
```bash
cd frontend/client-portal
npm install
npm run dev  # Runs on :5174
```

### Environment Variables

See `ENV_VARS.md` for complete list.

**Required for Development:**
- `DATABASE_URL`: PostgreSQL connection
- `SECRET_KEY`: Django secret
- `DEBUG=True`: Development mode
- `REDIS_URL`: Redis connection (default: localhost)

### Testing

**Backend:**
```bash
python manage.py test                    # All tests
python manage.py test core.domains.payments  # Specific domain
```

**Frontend:**
```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage
npm run type-check     # TypeScript check
npm run lint           # ESLint
```

### Database Migrations

```bash
python manage.py makemigrations          # Create migrations
python manage.py migrate                 # Apply migrations
python manage.py migrate --fake-initial  # Skip initial
```

---

## Monitoring & Health Checks

### Health Endpoints

**Basic Health Check:**
```
GET /health/
Response: {"status": "healthy", "service": "lifeplace-backend"}
```

**Readiness Check (with dependencies):**
```
GET /ready/
Response: {
  "status": "ready",
  "checks": {
    "database": true,
    "cache": true
  }
}
```

### Logging

**Format:** Console + file-based
**Levels:**
- INFO: General operation
- WARNING: Potential issues
- ERROR: Failures requiring attention
- CRITICAL: System-level failures

**Specialized Loggers:**
- `security.log`: Authentication, authorization events
- Domain-specific loggers with emoji prefixes (📧 communications, 🛍️ products, etc.)

---

## Security Considerations

### Backend Security
- ✅ JWT authentication with token rotation
- ✅ CSRF protection enabled
- ✅ CORS configured per environment
- ✅ Rate limiting on sensitive endpoints
- ✅ Input sanitization via DRF serializers
- ✅ Password validators (Django defaults)
- ✅ HTTPS enforced in production (Railway SSL)
- ✅ Security headers (X-Frame-Options, XSS Protection)
- ✅ Field-level encryption for sensitive data

### Frontend Security
- ✅ XSS protection via React DOM escaping
- ✅ DOMPurify for rich text content
- ✅ Zod schema validation
- ✅ Secure token storage (httpOnly cookies preferred)
- ✅ HTTPS-only in production

---

## Performance Characteristics

### Backend Performance
- **API Response Time:** < 200ms (typical CRUD)
- **Health Check:** < 100ms
- **Database Queries:** Optimized with select_related/prefetch_related
- **Caching:** Redis-backed with 5-minute default TTL
- **Static Files:** Compressed via WhiteNoise (Brotli + gzip)

### Frontend Performance
- **Bundle Size:** ~800KB (admin-crm), ~600KB (client-portal)
- **First Load:** < 2s on 3G
- **React Query Caching:** 5-minute stale time
- **Code Splitting:** Implemented for large components

---

## Scalability Notes

### Current Limitations (MVP)
- Single Gunicorn worker pool
- No horizontal scaling configured
- File uploads stored locally
- No CDN for user uploads

### Scaling Path (Future)
1. Move file storage to S3/R2
2. Add CDN for media files
3. Implement Redis Cluster
4. Horizontal backend scaling with Railway
5. Database read replicas
6. Celery worker scaling

---

## Development Team Notes

### Quick Reference

**Backend URL (local):** http://localhost:8000
**Admin CRM (local):** http://localhost:5173
**Client Portal (local):** http://localhost:5174
**Django Admin:** http://localhost:8000/admin/

**Production URLs:**
- Backend: [Railway URL]
- Admin CRM: [Netlify URL]
- Client Portal: [Netlify URL]

### Common Commands

```bash
# Backend
python manage.py shell              # Django shell
python manage.py dbshell            # Database shell
python manage.py check              # System checks
python manage.py migrate            # Run migrations

# Frontend
npm run dev                         # Development server
npm run build                       # Production build
npm run preview                     # Preview production build
npm run test:coverage               # Run tests with coverage

# Celery (if running locally)
celery -A core worker -l info       # Start worker
celery -A core beat -l info         # Start scheduler
```

---

## Documentation References

- `CLAUDE.md`: Project instructions for AI assistance
- `DEPLOYMENT.md`: Detailed deployment procedures
- `RAILWAY_SETUP.md`: Railway-specific setup
- `PAYMENT_GATEWAY_DOCUMENTATION.md`: Payment integration guide
- `ENV_VARS.md`: Environment variables reference

---

**For questions or clarifications, refer to codebase comments or existing documentation.**
