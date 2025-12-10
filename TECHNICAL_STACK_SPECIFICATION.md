# Technical Stack Specification
# LifePlace Event Management Platform

**Version:** 1.0
**Date:** 2025-11-24
**Project:** LifePlace Event Management System
**Classification:** Production Technology Stack Documentation

---

## Table of Contents

1. [Overview](#1-overview)
2. [Backend Stack](#2-backend-stack)
3. [Frontend Stack](#3-frontend-stack)
4. [Database & Storage](#4-database--storage)
5. [Infrastructure & Deployment](#5-infrastructure--deployment)
6. [External Services & APIs](#6-external-services--apis)
7. [Development Tools](#7-development-tools)
8. [Security Stack](#8-security-stack)
9. [Monitoring & Logging](#9-monitoring--logging)
10. [Testing Stack](#10-testing-stack)
11. [Build & CI/CD Pipeline](#11-build--cicd-pipeline)
12. [Performance Optimization](#12-performance-optimization)

---

## 1. Overview

### 1.1 Architecture Summary

**Pattern**: Three-tier architecture with Domain-Driven Design
- **Presentation Tier**: React-based SPAs (Admin CRM + Client Portal)
- **Application Tier**: Django REST Framework API with Celery workers
- **Data Tier**: PostgreSQL + Redis

**Communication**:
- REST APIs (primary)
- WebSocket (real-time features)
- Message Queue (background tasks)

### 1.2 Technology Philosophy

**Backend**:
- Python ecosystem for rapid development and extensive libraries
- Django for mature ORM and admin capabilities
- DRF for API standardization
- Celery for distributed task processing

**Frontend**:
- React for component reusability and ecosystem
- TypeScript for type safety and IDE support
- Material-UI for consistent design system
- Vite for fast development and optimized builds

**Data**:
- PostgreSQL for relational data integrity
- Redis for caching and real-time features
- JSON fields for flexible schema evolution

---

## 2. Backend Stack

### 2.1 Core Runtime & Framework

#### Python Runtime
```yaml
Technology: Python
Version: 3.12.x
Purpose: Server-side runtime environment
Installation: via pyenv or system package manager

Key Features Used:
  - Type hints (PEP 484, 585)
  - Dataclasses (PEP 557)
  - f-strings for string formatting
  - Context managers (with statements)
  - Async/await (limited use in Channels)

Performance Considerations:
  - GIL limitations handled via multiprocessing (Gunicorn workers)
  - Memory management via worker recycling
  - Garbage collection tuning for long-running processes
```

#### Django Framework
```yaml
Technology: Django
Version: 5.2.1
Purpose: Web framework and ORM
Documentation: https://docs.djangoproject.com/en/5.2/

Configuration:
  Settings Module: core.settings
  WSGI Application: core.wsgi:application
  ASGI Application: core.asgi:application

Key Components Used:
  - ORM (Object-Relational Mapping)
  - Middleware stack
  - Authentication system
  - Admin interface
  - Migrations framework
  - Template engine (limited use)
  - Signals framework
  - Content types framework
  - Management commands

Database:
  Engine: django.db.backends.postgresql
  Connection Pooling: Via psycopg2

Security Features:
  - CSRF protection
  - XSS protection
  - SQL injection prevention
  - Clickjacking protection
  - Password validators

Settings Structure:
  - Base settings in settings.py
  - Environment-specific overrides via env vars
  - Security settings separated
  - Database configuration via DATABASE_URL
```

#### Django REST Framework
```yaml
Technology: Django REST Framework (DRF)
Version: 3.16.0
Purpose: RESTful API framework
Documentation: https://www.django-rest-framework.org/

Key Features:
  - Serializers for data validation
  - ViewSets and Generic Views
  - Routers for URL generation
  - Authentication classes
  - Permission classes
  - Throttling/Rate limiting
  - Pagination
  - Filtering and search
  - Content negotiation

Authentication:
  Primary: JWT via djangorestframework-simplejwt
  Classes:
    - JWTAuthentication
    - SessionAuthentication (admin)

Permissions:
  - IsAuthenticated
  - IsAdminUser
  - Custom: IsEventOwner, IsClientUser

Pagination:
  Default: PageNumberPagination
  Page Size: 25 (configurable)
  Max Page Size: 100

Throttling:
  Anonymous: 100/hour
  User: 1000/hour
  Admin: 2000/hour

Renderers:
  - JSONRenderer (primary)
  - BrowsableAPIRenderer (dev only)
```

### 2.2 Database & ORM Layer

#### PostgreSQL Adapter
```yaml
Technology: psycopg2-binary
Version: 2.9.9
Purpose: PostgreSQL database adapter
Documentation: https://www.psycopg.org/

Configuration:
  Connection String: Via DATABASE_URL env var
  Connection Pooling: Enabled
  SSL Mode: Require (production)

Features Used:
  - Prepared statements
  - Transaction management
  - LISTEN/NOTIFY (limited)
  - JSON/JSONB field support
  - Full-text search

Performance:
  - Connection persistence
  - Query result caching via Django
  - Cursor iteration for large datasets
```

#### Django Model Fields
```yaml
Standard Fields:
  - CharField, TextField
  - IntegerField, BigIntegerField
  - DecimalField (for currency)
  - BooleanField
  - DateField, DateTimeField, TimeField
  - EmailField, URLField
  - FileField, ImageField
  - UUIDField
  - ForeignKey, OneToOneField, ManyToManyField

JSON Fields:
  - JSONField (native PostgreSQL)
  - Used for: metadata, configurations, analytics data

Custom Fields:
  - EncryptedJSONField (payments domain)

Validators:
  - MinValueValidator, MaxValueValidator
  - FileExtensionValidator
  - EmailValidator
  - Custom validators for business logic
```

### 2.3 API & Web Servers

#### Gunicorn (WSGI Server)
```yaml
Technology: Gunicorn
Version: 23.0.0
Purpose: HTTP request handler (production)
Documentation: https://docs.gunicorn.org/

Configuration:
  Workers: (CPU_COUNT × 2) + 1
  Worker Class: sync
  Timeout: 120 seconds
  Max Requests: 1000 (worker recycling)
  Max Requests Jitter: 100
  Keepalive: 5 seconds

Bind:
  Production: 0.0.0.0:$PORT

Environment:
  WEB_CONCURRENCY: Auto-detected from CPU count

Command:
  gunicorn core.wsgi:application \
    --workers=$WORKERS \
    --timeout=120 \
    --max-requests=1000 \
    --max-requests-jitter=100
```

#### Daphne (ASGI Server)
```yaml
Technology: Daphne
Version: 4.1.2
Purpose: WebSocket and ASGI request handler
Documentation: https://github.com/django/daphne

Configuration:
  Port: 8001 (production)
  Application: core.asgi:application

Features:
  - WebSocket support
  - HTTP/2 support
  - Long-polling fallback

Command:
  daphne -p 8001 -b 0.0.0.0 core.asgi:application

Use Cases:
  - Real-time messaging
  - Notification streaming
  - Event updates
```

#### WhiteNoise (Static Files)
```yaml
Technology: WhiteNoise
Version: 6.8.2
Purpose: Static file serving
Documentation: http://whitenoise.evans.io/

Configuration:
  Middleware: whitenoise.middleware.WhiteNoiseMiddleware
  Storage: whitenoise.storage.CompressedManifestStaticFilesStorage

Features:
  - Brotli compression
  - Gzip compression
  - Cache headers
  - Manifest for cache-busting

Settings:
  STATIC_ROOT: /app/staticfiles
  STATIC_URL: /static/
  WHITENOISE_MAX_AGE: 31536000 (1 year)
  WHITENOISE_MANIFEST_STRICT: False
```

### 2.4 Background Task Processing

#### Celery
```yaml
Technology: Celery
Version: 5.5.3
Purpose: Distributed task queue
Documentation: https://docs.celeryproject.org/

Configuration:
  Broker: Redis (DB 1)
  Backend: Redis (DB 2)
  Timezone: Asia/Manila

Task Routing:
  Default Queue: celery
  Priority Queues:
    - high_priority
    - default
    - low_priority

Task Types:
  - Email sending
  - SMS sending
  - PDF generation
  - Invoice creation
  - Payment processing
  - Webhook processing
  - Analytics aggregation
  - Session cleanup

Beat Schedule (Periodic Tasks):
  - Session cleanup: Daily at 3 AM
  - Analytics aggregation: Daily at 4 AM
  - Overdue payment checks: Daily at 8 AM
  - Quote reminder checks: Hourly

Configuration:
  task_serializer: json
  result_serializer: json
  accept_content: ['json']
  task_track_started: True
  task_time_limit: 600 (10 minutes)
  task_soft_time_limit: 540 (9 minutes)
  worker_prefetch_multiplier: 4
  worker_max_tasks_per_child: 1000

Command:
  celery -A core worker -l info
  celery -A core beat -l info
```

#### Django Celery Beat
```yaml
Technology: django-celery-beat
Version: 2.7.0
Purpose: Database-backed periodic task scheduler
Documentation: https://django-celery-beat.readthedocs.io/

Features:
  - Dynamic schedule management via Django admin
  - Timezone-aware scheduling
  - Crontab and interval scheduling

Storage:
  - PeriodicTask model
  - IntervalSchedule model
  - CrontabSchedule model
```

### 2.5 Real-Time Communication

#### Django Channels
```yaml
Technology: channels
Version: 4.1.0
Purpose: WebSocket support for Django
Documentation: https://channels.readthedocs.io/

Configuration:
  Channel Layer: Redis (DB 3)

Routing:
  - ws/events/{event_id}/ - Event-specific channels
  - ws/users/{user_id}/ - User notification channels
  - ws/messages/ - Real-time messaging

Consumer Types:
  - WebsocketConsumer (sync)
  - AsyncWebsocketConsumer (async)

Features Used:
  - Channel layers
  - Group messaging
  - Room management
  - Authentication middleware

Performance:
  - Connection pooling
  - Message expiry
  - Group cleanup
```

#### Channels Redis
```yaml
Technology: channels-redis
Version: 4.2.0
Purpose: Redis backend for Django Channels
Documentation: https://github.com/django/channels_redis

Configuration:
  hosts: [('redis-host', 6379)]
  db: 3
  capacity: 1000
  expiry: 60

Features:
  - Pub/Sub for group messaging
  - Message persistence
  - Automatic cleanup
```

### 2.6 Authentication & Authorization

#### Simple JWT
```yaml
Technology: djangorestframework-simplejwt
Version: 5.4.0
Purpose: JWT authentication for DRF
Documentation: https://django-rest-framework-simplejwt.readthedocs.io/

Configuration:
  ACCESS_TOKEN_LIFETIME: 1 hour
  REFRESH_TOKEN_LIFETIME: 7 days
  ROTATE_REFRESH_TOKENS: True
  BLACKLIST_AFTER_ROTATION: True
  ALGORITHM: HS256
  SIGNING_KEY: settings.JWT_SIGNING_KEY

Token Claims:
  - user_id
  - email
  - role
  - exp (expiration)
  - iat (issued at)
  - jti (JWT ID)

Endpoints:
  - /api/auth/login/ - Obtain token pair
  - /api/auth/refresh/ - Refresh access token
  - /api/auth/verify/ - Verify token
```

### 2.7 External Integration Libraries

#### Stripe SDK
```yaml
Technology: stripe
Version: 12.2.0
Purpose: Payment processing
Documentation: https://stripe.com/docs/api

Configuration:
  API Key: Via STRIPE_SECRET_KEY env var
  API Version: Latest stable

Features Used:
  - Payment Intents API
  - Customers API
  - Payment Methods API
  - Webhooks API
  - Refunds API

Webhook Events:
  - payment_intent.succeeded
  - payment_intent.payment_failed
  - charge.succeeded
  - charge.refunded

Security:
  - Webhook signature verification
  - Idempotency keys
  - Request retries
```

#### Brevo (Sendinblue) SDK
```yaml
Technology: sib-api-v3-sdk
Version: 7.6.0
Purpose: Email and SMS delivery
Documentation: https://developers.brevo.com/

Configuration:
  API Key: Via BREVO_API_KEY env var

Features Used:
  - Transactional email API
  - Transactional SMS API
  - Template management
  - Webhook events

Email Configuration:
  Default Sender: noreply@lifeplace.com
  Reply-To: support@lifeplace.com

Webhook Events:
  - delivered
  - opened
  - clicked
  - soft_bounce
  - hard_bounce
  - spam
```

### 2.8 PDF Generation

#### ReportLab
```yaml
Technology: reportlab
Version: 4.2.5
Purpose: PDF document generation
Documentation: https://www.reportlab.com/docs/

Use Cases:
  - Invoice PDFs
  - Quote PDFs
  - Contract PDFs
  - Receipt PDFs

Features Used:
  - Canvas API
  - Platypus (document layout)
  - Fonts and styling
  - Tables
  - Images

Configuration:
  Page Size: A4
  Margins: 1 inch
  Font: Helvetica, Times-Roman
```

### 2.9 Data Validation & Serialization

#### Pydantic (Limited Use)
```yaml
Technology: pydantic
Version: 2.x
Purpose: Data validation (limited use)
Documentation: https://docs.pydantic.dev/

Use Cases:
  - Payment orchestrator validation
  - External API request validation
  - Configuration validation

Features:
  - Type validation
  - Custom validators
  - JSON schema generation
```

### 2.10 Utilities & Helper Libraries

#### Python-Decouple
```yaml
Technology: python-decouple
Version: 3.8
Purpose: Environment variable management
Documentation: https://github.com/HBNetwork/python-decouple

Usage:
  from decouple import config

  SECRET_KEY = config('SECRET_KEY')
  DEBUG = config('DEBUG', default=False, cast=bool)
  DATABASE_URL = config('DATABASE_URL')
```

#### Python-DateUtil
```yaml
Technology: python-dateutil
Version: 2.9.0
Purpose: Date/time manipulation
Documentation: https://dateutil.readthedocs.io/

Features Used:
  - Relative delta calculations
  - Timezone handling
  - Date parsing
```

#### Cryptography
```yaml
Technology: cryptography
Version: 44.0.0
Purpose: Encryption utilities
Documentation: https://cryptography.io/

Use Cases:
  - Field-level encryption (payment gateway configs)
  - Fernet encryption
  - Token generation

Features:
  - Symmetric encryption (Fernet)
  - Key derivation
  - Secure random generation
```

### 2.11 Testing Libraries (Backend)

```yaml
Testing Framework: Django TestCase
Version: Built-in with Django 5.2.1

Additional Tools:
  - pytest-django: 4.9.0
  - factory-boy: 3.3.1 (test data generation)
  - faker: 33.1.0 (fake data)
  - coverage: 7.6.10 (code coverage)

Test Types:
  - Unit tests
  - Integration tests
  - API tests
  - Model tests
```

### 2.12 Process Management

#### Honcho (Development & Demo)
```yaml
Technology: honcho
Version: 1.1.0
Purpose: Process manager (Foreman clone)
Documentation: https://honcho.readthedocs.io/

Usage:
  honcho start -f Procfile

Procfile Processes:
  - web: Gunicorn HTTP server
  - websocket: Daphne WebSocket server
  - worker: Celery worker
  - beat: Celery beat scheduler
```

---

## 3. Frontend Stack

### 3.1 Core Framework & Runtime

#### Node.js
```yaml
Technology: Node.js
Version: 24.2.0
Purpose: Frontend build environment
Installation: via nvm or system package manager

Features:
  - ES modules support
  - Native fetch API
  - Built-in test runner
  - Performance hooks
```

#### React
```yaml
Technology: React
Version: 19.1.0
Purpose: UI library
Documentation: https://react.dev/

Key Features:
  - Functional components
  - Hooks (useState, useEffect, useContext, useMemo, useCallback)
  - Suspense for data fetching
  - Concurrent rendering
  - Server Components (not used)

Rendering:
  - Client-side rendering (CSR)
  - Virtual DOM
  - Reconciliation algorithm

Bundle Split:
  - Code splitting via React.lazy()
  - Route-based splitting
  - Component-based splitting
```

#### React DOM
```yaml
Technology: react-dom
Version: 19.1.0
Purpose: React rendering for web
Documentation: https://react.dev/reference/react-dom

Features:
  - createRoot API
  - Hydration
  - Event delegation
  - Portals
```

#### TypeScript
```yaml
Technology: TypeScript
Version: ~5.8.3
Purpose: Type safety
Documentation: https://www.typescriptlang.org/

Configuration (tsconfig.json):
  target: ES2020
  lib: [ES2020, DOM, DOM.Iterable]
  module: ESNext
  moduleResolution: bundler
  strict: true
  jsx: react-jsx

Features Used:
  - Interface definitions
  - Type aliases
  - Generics
  - Union types
  - Type guards
  - Utility types (Partial, Pick, Omit, etc.)

Strictness:
  - strictNullChecks: true
  - noImplicitAny: true
  - noUnusedLocals: true
  - noUnusedParameters: true
```

### 3.2 UI Component Library

#### Material-UI (MUI)
```yaml
Technology: @mui/material
Version: 7.1.1
Purpose: React component library
Documentation: https://mui.com/

Core Packages:
  - @mui/material: 7.1.1 (components)
  - @mui/icons-material: 7.1.1 (icons)
  - @mui/lab: 7.0.0-beta.17 (experimental)
  - @mui/x-date-pickers: 8.5.0 (date pickers)
  - @mui/styles: 6.4.12 (legacy styles)

Theming:
  - Custom theme configuration
  - Color palette customization
  - Typography customization
  - Spacing system
  - Breakpoints

Components Used:
  Layout:
    - Box, Container, Grid2 (Grid deprecated)
    - Stack, Paper, Card

  Navigation:
    - AppBar, Toolbar, Drawer
    - Tabs, Breadcrumbs
    - Menu, MenuItem

  Inputs:
    - TextField, Select, Checkbox, Radio
    - Button, IconButton, ToggleButton
    - Switch, Slider
    - Autocomplete, DatePicker, TimePicker

  Data Display:
    - Table, TablePagination
    - Chip, Badge, Avatar
    - List, ListItem, Divider
    - Typography, Tooltip

  Feedback:
    - Alert, Snackbar, Dialog
    - CircularProgress, LinearProgress
    - Skeleton

  Surfaces:
    - Accordion, Card, Paper

Styling Approach:
  - sx prop (primary)
  - styled() API
  - makeStyles (legacy, being phased out)

Theme Mode:
  - Light mode (primary)
  - Dark mode (planned)
```

#### Emotion (Styling Engine)
```yaml
Technology: @emotion/react, @emotion/styled
Version: 11.14.0
Purpose: CSS-in-JS for MUI
Documentation: https://emotion.sh/

Features:
  - CSS prop
  - styled components
  - Theme access
  - Server-side rendering
  - Source maps

Usage:
  - Via MUI sx prop (recommended)
  - Via styled() for custom components
  - Via css prop for one-offs
```

### 3.3 State Management

#### TanStack Query (React Query)
```yaml
Technology: @tanstack/react-query
Version: 5.80.5
Purpose: Server state management
Documentation: https://tanstack.com/query/

Configuration:
  staleTime: 5 minutes (300000ms)
  cacheTime: 10 minutes (600000ms)
  retry: 3
  retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)

Features Used:
  - useQuery for data fetching
  - useMutation for data modification
  - Query invalidation
  - Optimistic updates
  - Prefetching
  - Infinite queries
  - Request deduplication

Query Keys Structure:
  - ['users'] - All users
  - ['users', userId] - Specific user
  - ['events', { status: 'CONFIRMED' }] - Filtered events
  - ['payments', eventId] - Event payments

DevTools:
  Package: @tanstack/react-query-devtools
  Version: 5.80.5
  Enabled: Development only
```

#### React Context API
```yaml
Purpose: Global state (non-server data)
Built-in: React 19.1.0

Contexts Used:
  - AuthContext: User authentication state
  - ToastContext: Toast notification queue
  - ThemeContext: UI theme preferences
  - LayoutContext: Layout state (sidebar, etc.)

Pattern:
  - Provider components
  - Custom hooks (useAuth, useToast, etc.)
  - Context composition
```

#### React Hook Form
```yaml
Technology: react-hook-form
Version: 7.62.0
Purpose: Form state management
Documentation: https://react-hook-form.com/

Features:
  - Uncontrolled components
  - Minimal re-renders
  - Built-in validation
  - Zod integration
  - Field arrays
  - Watch for field changes

Integration:
  - With Material-UI via Controller
  - With Zod via @hookform/resolvers

Performance:
  - Isolated re-renders
  - Subscription-based updates
  - Lazy validation
```

### 3.4 Routing

#### React Router
```yaml
Technology: react-router-dom
Version: 7.6.2
Purpose: Client-side routing
Documentation: https://reactrouter.com/

Features Used:
  - BrowserRouter
  - Routes, Route
  - Navigate, Link
  - useNavigate, useParams, useLocation hooks
  - Nested routes
  - Route protection (auth guards)
  - 404 handling

Route Structure:
  Admin CRM:
    - / - Dashboard
    - /events - Events list
    - /events/:id - Event detail
    - /clients - Clients list
    - /clients/:id - Client profile
    - /sales/quotes - Quotes
    - /payments - Payments
    - /contracts - Contracts
    - /settings/* - Settings pages

  Client Portal:
    - / - Home
    - /booking/:flowId - Booking flow
    - /events - My events
    - /payments - Financial portal
    - /contracts/:id - Contract signing
    - /messages - Messaging
```

### 3.5 HTTP Client

#### Axios
```yaml
Technology: axios
Version: 1.9.0
Purpose: HTTP client
Documentation: https://axios-http.com/

Configuration:
  baseURL: process.env.VITE_API_URL
  timeout: 30000 (30 seconds)
  headers:
    'Content-Type': 'application/json'
    'Authorization': `Bearer ${token}`

Interceptors:
  Request:
    - Add JWT token
    - Add request timestamp
    - Log requests (dev)

  Response:
    - Handle 401 (refresh token)
    - Handle errors
    - Log responses (dev)

Features:
  - Request/response interceptors
  - Automatic JSON parsing
  - Request cancellation
  - Progress tracking (file uploads)
  - CSRF token handling
```

### 3.6 Form Validation

#### Zod
```yaml
Technology: zod
Version: 4.1.3
Purpose: Schema validation
Documentation: https://zod.dev/

Features:
  - Type inference
  - Composable schemas
  - Custom error messages
  - Async validation
  - Schema transformation

Integration:
  - With React Hook Form via @hookform/resolvers

Common Schemas:
  - Email validation
  - Password requirements
  - Phone number formatting
  - Date validation
  - File upload validation

Example:
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
```

### 3.7 Date & Time Handling

#### date-fns
```yaml
Technology: date-fns
Version: 4.1.0
Purpose: Date manipulation
Documentation: https://date-fns.org/

Features Used:
  - Date formatting
  - Date parsing
  - Date arithmetic
  - Relative time (formatDistance)
  - Locale support

Common Functions:
  - format()
  - parseISO()
  - addDays(), subDays()
  - isBefore(), isAfter()
  - differenceInDays()
  - startOfDay(), endOfDay()
```

#### date-fns-tz
```yaml
Technology: date-fns-tz
Version: 3.2.0
Purpose: Timezone support
Documentation: https://github.com/marnusw/date-fns-tz

Features:
  - Timezone conversion
  - UTC to local time
  - Format with timezone

Functions:
  - formatInTimeZone()
  - utcToZonedTime()
  - zonedTimeToUtc()
```

#### @date-io/date-fns
```yaml
Technology: @date-io/date-fns
Version: 3.2.1
Purpose: MUI date picker adapter
Documentation: https://mui.com/x/react-date-pickers/

Integration:
  - With MUI X Date Pickers
  - Provides date-fns adapter
```

### 3.8 Charts & Visualization

#### Recharts
```yaml
Technology: recharts
Version: 3.1.2 (Admin), 3.0.0 (Client Portal)
Purpose: Data visualization
Documentation: https://recharts.org/

Chart Types Used:
  - LineChart (revenue trends)
  - BarChart (booking conversions)
  - PieChart (event status distribution)
  - AreaChart (cumulative metrics)

Components:
  - ResponsiveContainer
  - CartesianGrid
  - XAxis, YAxis
  - Tooltip, Legend
  - Line, Bar, Pie, Area

Customization:
  - Color schemes
  - Custom tooltips
  - Responsive sizing
  - Animation curves
```

### 3.9 Rich Text Editing (Admin CRM)

#### TipTap
```yaml
Technology: @tiptap/react
Version: 2.22.3
Purpose: Rich text editor (Admin CRM only)
Documentation: https://tiptap.dev/

Extensions Used:
  - @tiptap/starter-kit
  - @tiptap/extension-link
  - @tiptap/extension-image
  - @tiptap/extension-table
  - @tiptap/extension-text-align
  - @tiptap/extension-underline
  - @tiptap/extension-placeholder
  - @tiptap/extension-heading

Use Cases:
  - Contract template editing
  - Email template editing
  - Rich content creation

Integration:
  - mui-tiptap: 1.18.1 (MUI wrapper)

Output Format:
  - HTML
  - Stored as text in database
  - Sanitized before rendering
```

### 3.10 Payment Integration (Client Portal)

#### Stripe.js
```yaml
Technology: @stripe/stripe-js
Version: 7.4.0
Purpose: Stripe client library
Documentation: https://stripe.com/docs/js

Features:
  - Payment Element
  - Card Element
  - Payment Intents
  - Tokenization

Configuration:
  publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY

Security:
  - No card data touches server
  - PCI DSS compliance via Stripe
  - 3D Secure support
```

#### Stripe React
```yaml
Technology: @stripe/react-stripe-js
Version: 3.7.0
Purpose: React components for Stripe
Documentation: https://stripe.com/docs/stripe-js/react

Components:
  - Elements (provider)
  - PaymentElement
  - CardElement
  - useStripe hook
  - useElements hook

Integration:
  - With booking flow payment step
  - With financial portal
```

### 3.11 Security & Sanitization

#### DOMPurify
```yaml
Technology: dompurify
Version: 3.0.8
Purpose: HTML sanitization
Documentation: https://github.com/cure53/DOMPurify

Use Cases:
  - Sanitize rich text content
  - Sanitize user-generated HTML
  - Prevent XSS attacks

Configuration:
  ALLOWED_TAGS: ['p', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3']
  ALLOWED_ATTR: ['href', 'title', 'target', 'class']
```

### 3.12 Utility Libraries

#### Lodash
```yaml
Technology: lodash
Version: 4.17.21
Purpose: Utility functions (Client Portal)
Documentation: https://lodash.com/

Functions Used:
  - debounce (search inputs)
  - throttle (scroll events)
  - get (safe property access)
  - groupBy (data organization)
  - sortBy (sorting)
  - uniqBy (deduplication)

Tree Shaking:
  - Import specific functions
  - Example: import debounce from 'lodash/debounce'
```

#### Signature Pad
```yaml
Technology: signature_pad
Version: 5.1.0 (Admin), 4.1.7 (Client Portal)
Purpose: Digital signature capture
Documentation: https://github.com/szimek/signature_pad

Features:
  - Canvas-based drawing
  - Touch and mouse support
  - Data URL export (base64)
  - Clear functionality
  - Responsive sizing

Use Cases:
  - Contract signing
  - Quote acceptance
  - Document approval
```

#### React Hot Toast
```yaml
Technology: react-hot-toast
Version: 2.5.2
Purpose: Toast notifications (Admin CRM)
Documentation: https://react-hot-toast.com/

Features:
  - Promise-based API
  - Custom styling
  - Position control
  - Auto-dismiss
  - Loading states

Configuration:
  position: 'top-right'
  duration: 4000

Usage:
  - Success notifications
  - Error messages
  - Loading indicators
```

### 3.13 Build Tools

#### Vite
```yaml
Technology: vite
Version: ^6.3.5
Purpose: Build tool and dev server
Documentation: https://vitejs.dev/

Features:
  - ES modules in development
  - Hot Module Replacement (HMR)
  - Fast cold start
  - Optimized production builds
  - Code splitting
  - Asset optimization

Configuration:
  Build Target: ES2020
  Output: dist/
  Asset Inlining: < 4kb
  Chunk Size Warning: 1000kb

Plugins:
  - @vitejs/plugin-react: 4.5.1

Dev Server:
  - Port: 5173 (Admin), 5174 (Client Portal)
  - HMR enabled
  - CORS: Development only
```

### 3.14 Testing (Frontend)

#### Vitest
```yaml
Technology: vitest
Version: 3.2.1
Purpose: Unit testing framework
Documentation: https://vitest.dev/

Features:
  - Vite-native
  - Jest-compatible API
  - Fast execution
  - Watch mode
  - Coverage reporting

Configuration:
  Environment: jsdom
  Coverage Provider: v8

Coverage:
  Package: @vitest/coverage-v8
  Version: 3.2.4
  Reporters: ['text', 'html', 'json']
```

#### Testing Library
```yaml
Technology: @testing-library/react
Version: 16.3.0
Purpose: Component testing utilities
Documentation: https://testing-library.com/react

Additional Packages:
  - @testing-library/dom: 10.4.1
  - @testing-library/jest-dom: 6.6.3
  - @testing-library/user-event: 14.6.1

Philosophy:
  - Test user behavior, not implementation
  - Query by accessibility roles
  - User-centric assertions

Common Queries:
  - getByRole()
  - getByText()
  - getByLabelText()
  - findByRole() (async)

Events:
  - userEvent.click()
  - userEvent.type()
  - userEvent.selectOptions()
```

#### JSDOM
```yaml
Technology: jsdom
Version: 26.1.0
Purpose: DOM implementation for Node.js
Documentation: https://github.com/jsdom/jsdom

Usage:
  - Test environment for Vitest
  - Browser API emulation
  - Document manipulation
```

### 3.15 Code Quality Tools

#### ESLint
```yaml
Technology: eslint
Version: 9.28.0
Purpose: Code linting
Documentation: https://eslint.org/

Plugins:
  - @typescript-eslint/eslint-plugin: 8.33.1
  - @typescript-eslint/parser: 8.33.1
  - eslint-plugin-react-hooks: 5.2.0
  - eslint-plugin-react-refresh: 0.4.19

Configuration:
  Parser: @typescript-eslint/parser
  Extends:
    - eslint:recommended
    - plugin:@typescript-eslint/recommended
    - plugin:react-hooks/recommended

Rules:
  - react-hooks/rules-of-hooks: error
  - react-hooks/exhaustive-deps: warn
  - @typescript-eslint/no-unused-vars: warn
  - no-console: warn (production)
```

#### TypeScript Compiler
```yaml
Purpose: Type checking
Version: ~5.8.3

Scripts:
  type-check: tsc --noEmit

CI/CD:
  - Run on every PR
  - Block merge on type errors
```

---

## 4. Database & Storage

### 4.1 Primary Database

#### PostgreSQL
```yaml
Technology: PostgreSQL
Version: 16+
Purpose: Primary relational database
Documentation: https://www.postgresql.org/docs/16/

Configuration:
  Connection: Via DATABASE_URL environment variable
  SSL Mode: require (production)
  Max Connections: 100 (Railway managed)

Database Name: lifeplace_db (configurable)
Encoding: UTF8
Locale: en_US.UTF-8
Timezone: UTC

Extensions:
  - pg_trgm (trigram similarity for search)
  - uuid-ossp (UUID generation)

Performance Settings:
  shared_buffers: Auto-configured by Railway
  effective_cache_size: Auto-configured
  work_mem: 4MB
  maintenance_work_mem: 64MB

Connection Pooling:
  Via psycopg2
  Min Connections: 2
  Max Connections: 10 per worker

Backup:
  Automated by Railway
  Frequency: Daily
  Retention: 7 days (demo), 30 days (production)
  Point-in-time recovery: Supported
```

#### Database Schema Management

```yaml
Migrations: Django Migrations
Version Control: Git-tracked migration files
Migration Files: backend/core/domains/*/migrations/

Commands:
  - makemigrations: Create new migration files
  - migrate: Apply migrations
  - showmigrations: Show migration status
  - sqlmigrate: Show SQL for migration

Best Practices:
  - Squash migrations periodically
  - Never edit applied migrations
  - Test migrations on staging
  - Rollback plan for each migration

Initial Migration:
  python manage.py migrate --fake-initial
```

#### Database Indexes

```yaml
Indexed Fields:
  Events:
    - (client, status, -start_date)
    - (event_type, status)
    - (payment_status, -start_date)
    - (status, -created_at)

  Payments:
    - event_id
    - payment_number (unique)
    - (status, due_date)

  Users:
    - email (unique)

  Notifications:
    - (recipient, -created_at)
    - (recipient, is_read)
    - (notification_type, -created_at)

  EventTimeline:
    - (event, action_type, -created_at)

  EventTask:
    - (event, status, due_date)

Index Types:
  - B-tree (default)
  - GIN (for JSONB fields)
  - Text search (for full-text search)
```

### 4.2 Cache Layer

#### Redis
```yaml
Technology: Redis
Version: Latest (Railway managed)
Purpose: Cache, session store, message broker
Documentation: https://redis.io/docs/

Configuration:
  Host: Via REDIS_URL environment variable
  Port: 6379
  Max Memory: 256MB (Railway demo tier)
  Eviction Policy: allkeys-lru

Database Separation:
  DB 0: Django cache (default)
  DB 1: Celery broker (task queue)
  DB 2: Celery results (task results)
  DB 3: Django Channels (WebSocket)
  DB 4: Session cache
  DB 5: Analytics cache

Persistence:
  AOF: Enabled (production)
  RDB: Enabled (snapshots)

Data Types Used:
  - Strings (simple cache)
  - Hashes (structured data)
  - Lists (queues)
  - Sets (unique collections)
  - Sorted Sets (leaderboards, timeseries)
  - Pub/Sub (channels)

Key Patterns:
  cache:event:{id}:progress - Workflow progress cache
  cache:user:{id}:profile - User profile cache
  session:{session_id} - Django sessions
  celery:task:{task_id} - Celery task results

TTL Strategy:
  Default: 300 seconds (5 minutes)
  Session: 1209600 seconds (14 days)
  Workflow progress: 300 seconds
  Analytics: 3600 seconds (1 hour)
```

#### Django Cache Configuration

```yaml
Backend: django.core.cache.backends.redis.RedisCache
Location: REDIS_URL/0

Cache Key Prefix: lifeplace_

Cache Usage:
  - Query result caching
  - Template fragment caching
  - Session storage
  - Rate limiting counters

Decorators:
  - @cache_page(timeout)
  - @method_decorator(cache_page(timeout))

Manual Caching:
  from django.core.cache import cache
  cache.set(key, value, timeout)
  cache.get(key, default)
  cache.delete(key)
```

### 4.3 File Storage

#### Local Filesystem (Current)

```yaml
Technology: Django FileField + WhiteNoise
Purpose: File storage (temporary solution)

Media Files:
  Root: /app/media/
  URL: /media/

  Subdirectories:
    - event_files/ - Event attachments
    - contracts/ - Contract documents
    - quotes/ - Quote PDFs
    - invoices/ - Invoice PDFs
    - receipts/ - Payment receipts
    - booking_flow/intro/ - Booking flow images

Static Files:
  Root: /app/staticfiles/
  URL: /static/
  Collection: python manage.py collectstatic

Limitations:
  - Not scalable for production
  - No CDN integration
  - Ephemeral on Railway

Migration Plan:
  - Move to AWS S3 or Cloudflare R2
  - Update FileField storage backend
  - Implement CDN for media delivery
```

#### Planned: AWS S3 / Cloudflare R2

```yaml
Technology: django-storages + boto3 (future)
Purpose: Scalable file storage

Configuration (Future):
  Storage Backend: storages.backends.s3boto3.S3Boto3Storage
  Bucket: lifeplace-media
  Region: ap-southeast-1
  ACL: private (default)
  Signed URLs: For private files

Features:
  - Unlimited storage
  - CDN integration
  - Lifecycle policies
  - Cross-region replication
  - Versioning

Cost Optimization:
  - S3 Glacier for old files
  - CloudFront CDN
  - Request optimization
```

---

## 5. Infrastructure & Deployment

### 5.1 Demo Environment (Current)

#### Railway.app

```yaml
Platform: Railway.app
Purpose: All-in-one backend hosting
Documentation: https://docs.railway.app/

Service Configuration:
  Name: lifeplace-backend-all-in-one
  Region: us-west1 (Oregon)
  Plan: Hobby ($5/month + usage)

Estimated Cost: $10-13/month
  - Compute: ~$5-8/month
  - PostgreSQL: Free tier (512MB)
  - Redis: $5/month (256MB)

Resources:
  vCPU: Shared (0.5-1.0 vCPU average)
  Memory: 512MB (burstable to 1GB)
  Disk: 1GB

Process Manager: Honcho
  Processes:
    - web: Gunicorn (HTTP API)
    - websocket: Daphne (WebSocket server)
    - worker: Celery worker
    - beat: Celery beat scheduler

Procfile:
  web: gunicorn core.wsgi --workers=4 --timeout=120
  websocket: daphne -p 8001 core.asgi:application
  worker: celery -A core worker -l info
  beat: celery -A core beat -l info

Start Command:
  python manage.py migrate --no-input && \
  python manage.py seed_default_settings && \
  honcho start -f Procfile

Environment Variables:
  - Via Railway dashboard
  - Linked from plugins (PostgreSQL, Redis)
  - Custom secrets management

Networking:
  HTTPS: Automatic SSL via Railway
  Domain: *.railway.app (free subdomain)
  Custom Domain: Supported

Auto-scaling: Not configured (demo)
Health Checks: /health/ endpoint
Restart Policy: Always
```

#### Railway PostgreSQL Plugin

```yaml
Type: Managed PostgreSQL
Version: 16
Tier: Free (512MB storage)

Features:
  - Automatic backups
  - Connection pooling
  - Metrics dashboard
  - Query performance insights

Connection:
  Provided via DATABASE_URL
  Format: postgresql://user:pass@host:port/db

Limitations:
  - 512MB storage
  - Shared resources
  - 7-day backup retention
```

#### Railway Redis Plugin

```yaml
Type: Managed Redis
Version: Latest
Tier: Paid ($5/month)
Storage: 256MB

Features:
  - Persistence (AOF + RDB)
  - Multiple databases (0-15)
  - Metrics dashboard
  - Automatic failover

Connection:
  Provided via REDIS_URL
  Format: redis://host:port

Configuration:
  Eviction: allkeys-lru
  Max Memory: 256MB
  Persistence: Both AOF and RDB
```

### 5.2 Frontend Hosting

#### Netlify

```yaml
Platform: Netlify
Purpose: Frontend static hosting
Documentation: https://docs.netlify.com/

Sites:
  1. Admin CRM
    - Repository: GitHub
    - Branch: main
    - Build Command: npm run build
    - Publish Directory: dist/
    - Node Version: 20.x

  2. Client Portal
    - Repository: GitHub
    - Branch: main
    - Build Command: npm run build
    - Publish Directory: dist/
    - Node Version: 20.x

Features:
  - Automatic deployments
  - Deploy previews for PRs
  - Custom domains
  - SSL certificates (automatic)
  - CDN (global)
  - Asset optimization
  - Header configuration
  - Redirect rules

Build Configuration:
  [build]
    command = "npm run build"
    publish = "dist"

  [build.environment]
    NODE_VERSION = "20"

  [[headers]]
    for = "/*"
    [headers.values]
      X-Frame-Options = "DENY"
      X-Content-Type-Options = "nosniff"
      Referrer-Policy = "strict-origin-when-cross-origin"

Performance:
  - Gzip/Brotli compression
  - Asset fingerprinting
  - HTTP/2
  - Preload headers

Environment Variables:
  Admin CRM:
    - VITE_API_URL
    - VITE_APP_ENV

  Client Portal:
    - VITE_API_URL
    - VITE_STRIPE_PUBLIC_KEY
    - VITE_APP_ENV

Cost: Free tier (both sites)
```

### 5.3 Production Environment (Planned)

#### Railway Production Setup

```yaml
Purpose: Production-ready with independent services
Estimated Cost: $31-48/month

Services:
  1. Backend API (HTTP)
    - Server: Gunicorn
    - Workers: 4-6
    - Memory: 1GB
    - Cost: ~$8-12/month

  2. WebSocket Server
    - Server: Daphne
    - Instances: 2
    - Memory: 512MB
    - Cost: ~$5-8/month

  3. Celery Worker
    - Workers: 2-4
    - Memory: 512MB
    - Cost: ~$5-8/month

  4. Celery Beat
    - Instances: 1
    - Memory: 256MB
    - Cost: ~$3-5/month

  5. PostgreSQL
    - Plan: Paid tier
    - Storage: 10GB+
    - Cost: ~$5-10/month

  6. Redis
    - Plan: Paid tier
    - Memory: 256MB-1GB
    - Cost: ~$5/month

Benefits:
  - Independent scaling
  - Fault isolation
  - Independent deployments
  - Better monitoring
  - Health checks per service
  - Resource optimization

Auto-scaling:
  - Horizontal scaling for API workers
  - Vertical scaling for database
  - Worker scaling based on queue depth
```

### 5.4 Domain & SSL

```yaml
Domain Management: TBD
SSL Certificates:
  - Railway: Automatic SSL
  - Netlify: Automatic SSL via Let's Encrypt

DNS Configuration:
  - Railway: CNAME to Railway domain
  - Netlify: CNAME to Netlify domain

HTTPS Enforcement:
  - All traffic over HTTPS
  - HSTS headers
  - Secure cookies
```

---

## 6. External Services & APIs

### 6.1 Payment Processing

#### Stripe

```yaml
Service: Stripe
Purpose: Payment processing
Documentation: https://stripe.com/docs

API Version: Latest stable
Integration:
  Backend: stripe Python SDK 12.2.0
  Frontend: @stripe/stripe-js 7.4.0, @stripe/react-stripe-js 3.7.0

Features Used:
  - Payment Intents API
  - Customers API
  - Payment Methods API
  - Webhooks
  - Refunds API

Credentials:
  - Secret Key (backend, encrypted)
  - Publishable Key (frontend, public)
  - Webhook Secret (backend)

Webhook Events:
  - payment_intent.succeeded
  - payment_intent.payment_failed
  - payment_intent.canceled
  - charge.succeeded
  - charge.refunded
  - customer.created
  - customer.updated

Webhook Endpoint:
  URL: https://api.lifeplace.com/api/payments/webhooks/stripe/
  Authentication: Signature verification

Payment Flow:
  1. Create Payment Intent (backend)
  2. Confirm with Payment Element (frontend)
  3. Handle webhook events (backend)
  4. Update payment status

Security:
  - PCI DSS compliance via Stripe
  - No card data touches server
  - Webhook signature verification
  - Idempotency keys
  - 3D Secure (SCA) support

Test Mode:
  - Test cards available
  - Separate test API keys
  - Test webhook events

Costs:
  - 3.4% + ₱15 per transaction (Philippines)
  - No monthly fees
  - Refund fees: None (Stripe absorbs)
```

### 6.2 Email & SMS

#### Brevo (formerly Sendinblue)

```yaml
Service: Brevo
Purpose: Transactional email and SMS
Documentation: https://developers.brevo.com/

API Version: v3
Integration: sib-api-v3-sdk 7.6.0

Features Used:
  - Transactional Email API
  - Transactional SMS API
  - Template Management
  - Contact Management (limited)
  - Webhook Events

Credentials:
  - API Key (backend, encrypted)
  - Webhook Secret (optional)

Email Configuration:
  Sender: noreply@lifeplace.com
  Reply-To: support@lifeplace.com
  Default From Name: LifePlace Events

Templates:
  - Booking confirmation
  - Quote sent
  - Contract ready
  - Payment received
  - Payment reminder
  - Password reset
  - Admin invitation

Webhook Events:
  - delivered
  - opened (track opens)
  - clicked (track clicks)
  - soft_bounce
  - hard_bounce
  - blocked
  - spam
  - unsubscribed

Webhook Endpoint:
  URL: https://api.lifeplace.com/api/communications/webhooks/brevo/
  Authentication: Optional secret verification

Limitations:
  Free Tier:
    - 300 emails/day
    - Brevo logo in emails

  Paid Tier:
    - 20,000 emails/month: $25/month
    - 40,000 emails/month: $45/month
    - No Brevo logo
    - SMS credits separate

SMS Pricing:
  - Pay-as-you-go
  - Philippines: ~$0.05/SMS
  - Credits purchased in advance

Deliverability:
  - SPF/DKIM/DMARC setup required
  - Sender reputation monitoring
  - Bounce management
  - Unsubscribe handling
```

### 6.3 Error Tracking

#### Sentry

```yaml
Service: Sentry
Purpose: Error monitoring and performance tracking
Documentation: https://docs.sentry.io/

Integration:
  Backend: sentry-sdk (Python)
  Frontend: @sentry/react (planned)

Configuration:
  DSN: Via SENTRY_DSN environment variable
  Environment: production/staging/development
  Release: Git commit SHA

Features:
  - Exception tracking
  - Performance monitoring
  - Release tracking
  - User feedback
  - Breadcrumbs
  - Source maps (frontend)
  - Stack traces

Backend Integration:
  import sentry_sdk
  from sentry_sdk.integrations.django import DjangoIntegration

  sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[DjangoIntegration()],
    environment=settings.ENV,
    traces_sample_rate=0.1
  )

Frontend Integration (Planned):
  import * as Sentry from "@sentry/react"

  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_APP_ENV,
    tracesSampleRate: 0.1
  })

Alerting:
  - Email notifications
  - Slack integration (planned)
  - Error threshold alerts
  - Performance degradation alerts

Privacy:
  - Scrub sensitive data
  - IP address anonymization
  - PII filtering

Cost:
  - Free tier: 5,000 errors/month
  - Paid: $26/month (50k events)
```

### 6.4 Uptime Monitoring

#### UptimeRobot

```yaml
Service: UptimeRobot
Purpose: Uptime monitoring
Documentation: https://uptimerobot.com/

Monitors:
  1. Backend API
    - URL: https://api.lifeplace.com/health/
    - Type: HTTP(S)
    - Interval: 5 minutes
    - Expected: 200 OK

  2. Admin CRM
    - URL: https://admin.lifeplace.com/
    - Type: HTTP(S)
    - Interval: 5 minutes
    - Expected: 200 OK

  3. Client Portal
    - URL: https://portal.lifeplace.com/
    - Type: HTTP(S)
    - Interval: 5 minutes
    - Expected: 200 OK

Alerting:
  - Email notifications
  - SMS notifications (optional)
  - Slack integration (planned)

Alert Conditions:
  - Site down
  - Response time > 3000ms
  - SSL certificate expiring

Cost: Free tier (sufficient for MVP)
```

---

## 7. Development Tools

### 7.1 Version Control

#### Git

```yaml
Technology: Git
Version: 2.x
Platform: GitHub

Repository Structure:
  - Main branch: main
  - Development branch: develop (optional)
  - Feature branches: feature/*
  - Hotfix branches: hotfix/*

Branching Strategy:
  - GitHub Flow (simplified)
  - Feature branches from main
  - Pull requests for review
  - Squash merges (optional)

Commit Conventions:
  - Semantic commits (preferred)
  - Clear, descriptive messages
  - Reference issue numbers

Example:
  feat: Add payment plan support to booking flow (#123)
  fix: Resolve currency formatting issue in invoices
  refactor: Extract pricing calculation to service
  docs: Update API endpoint documentation

Ignored Files (.gitignore):
  - .env, .env.local
  - __pycache__/, *.pyc
  - node_modules/
  - dist/, build/
  - *.log
  - .DS_Store
  - staticfiles/
  - media/
```

### 7.2 Code Editors

#### VS Code (Recommended)

```yaml
Editor: Visual Studio Code
Extensions:
  Python:
    - Python (Microsoft)
    - Pylance
    - Django
    - Python Docstring Generator

  JavaScript/TypeScript:
    - ESLint
    - Prettier
    - TypeScript Vue Plugin
    - Auto Import

  General:
    - GitLens
    - Error Lens
    - Thunder Client (API testing)
    - Database Client (PostgreSQL)
    - Docker

Settings:
  - Format on save: true
  - Auto save: afterDelay
  - Tab size: 2 (frontend), 4 (backend)
  - Trim trailing whitespace: true

Launch Configuration (.vscode/launch.json):
  Django Debug:
    type: python
    request: launch
    program: manage.py
    args: ["runserver"]

  React Debug:
    type: chrome
    request: launch
    url: http://localhost:5173
```

### 7.3 API Development & Testing

#### Thunder Client (VS Code)

```yaml
Tool: Thunder Client
Purpose: API testing (lightweight Postman alternative)

Collections:
  - Authentication
  - Events
  - Payments
  - Quotes
  - Contracts
  - Booking Flow

Environment Variables:
  - baseUrl: http://localhost:8000
  - token: <JWT token>
```

#### Postman (Alternative)

```yaml
Tool: Postman
Purpose: API testing and documentation

Features:
  - Collection runner
  - Environment management
  - Pre-request scripts
  - Tests/Assertions
  - Mock servers

Collections:
  - Workspace: LifePlace API
  - Collections per domain
  - Automated tests
```

### 7.4 Database Tools

#### pgAdmin / DBeaver

```yaml
Tools:
  - pgAdmin 4 (PostgreSQL-specific)
  - DBeaver (multi-database)

Usage:
  - Database exploration
  - Query execution
  - Schema visualization
  - Data export/import
  - Performance analysis

Connection:
  Host: From DATABASE_URL
  Database: lifeplace_db
  SSL: Require
```

#### Django Admin

```yaml
Built-in: Django Admin Interface
URL: /admin/

Features:
  - Model CRUD operations
  - User management
  - Permissions management
  - Inline editing
  - Custom actions

Customizations:
  - Custom list displays
  - Filters and search
  - Custom forms
  - Inline models
  - Admin actions
```

### 7.5 Python Virtual Environment

#### venv

```yaml
Tool: venv (built-in)
Purpose: Python dependency isolation

Setup:
  python3.12 -m venv venv
  source venv/bin/activate (Unix)
  venv\Scripts\activate (Windows)

Dependencies:
  Managed in: requirements.txt
  Install: pip install -r requirements.txt

Best Practices:
  - Never commit venv/
  - Regenerate on deployment
  - Pin versions in requirements.txt
```

### 7.6 Package Managers

#### pip (Python)

```yaml
Tool: pip
Version: Latest
Purpose: Python package management

Commands:
  - pip install <package>
  - pip install -r requirements.txt
  - pip freeze > requirements.txt
  - pip list --outdated

Configuration:
  - requirements.txt (production dependencies)
  - requirements-dev.txt (development dependencies)
```

#### npm (JavaScript)

```yaml
Tool: npm
Version: 10.x (comes with Node.js 24.2.0)
Purpose: JavaScript package management

Commands:
  - npm install
  - npm install <package>
  - npm update
  - npm outdated
  - npm audit

Lock File: package-lock.json
  - Committed to version control
  - Ensures reproducible builds

Scripts (package.json):
  - dev: vite
  - build: tsc -b && vite build
  - preview: vite preview
  - test: vitest run
  - lint: eslint .
  - type-check: tsc --noEmit
```

---

## 8. Security Stack

### 8.1 Authentication & Authorization

```yaml
Backend:
  Framework: Django Auth + SimpleJWT
  Token Type: JWT
  Storage: HTTP-only cookies (planned) / localStorage (current)
  Expiry: 1 hour (access), 7 days (refresh)

Frontend:
  Storage: localStorage (migration to httpOnly cookies planned)
  Token Refresh: Automatic via interceptor

Password Requirements:
  - Minimum 8 characters
  - Django validators:
    - UserAttributeSimilarityValidator
    - MinimumLengthValidator
    - CommonPasswordValidator
    - NumericPasswordValidator

Session Security:
  - CSRF tokens
  - Secure cookies (production)
  - SameSite: Lax
  - HttpOnly: True (cookies)
```

### 8.2 Data Encryption

```yaml
In Transit:
  - HTTPS/TLS 1.2+ (all environments)
  - Secure WebSocket (WSS)
  - Railway SSL certificates
  - Netlify SSL certificates

At Rest:
  - Database: PostgreSQL encryption (Railway)
  - Sensitive Fields: Fernet encryption (EncryptedJSONField)
  - Payment Gateway Configs: Encrypted JSON
  - File Storage: Encrypted at provider level

Encryption Library:
  Package: cryptography 44.0.0
  Algorithm: Fernet (symmetric encryption)
  Key Management: Environment variable (FIELD_ENCRYPTION_KEY)
```

### 8.3 Security Headers

```yaml
Backend (Django Middleware):
  SECURE_BROWSER_XSS_FILTER: True
  SECURE_CONTENT_TYPE_NOSNIFF: True
  X_FRAME_OPTIONS: 'DENY'
  SECURE_SSL_REDIRECT: True (production)
  SECURE_HSTS_SECONDS: 31536000 (1 year, production)
  SECURE_HSTS_INCLUDE_SUBDOMAINS: True
  SECURE_HSTS_PRELOAD: True

Frontend (Netlify _headers):
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
  Content-Security-Policy: default-src 'self'; ...
```

### 8.4 Input Validation & Sanitization

```yaml
Backend:
  - DRF Serializers for API validation
  - Django Form validators
  - Model field validators
  - Custom business logic validators
  - SQL injection prevention via ORM

Frontend:
  - Zod schema validation
  - React Hook Form validation
  - DOMPurify for HTML sanitization
  - Input type restrictions
  - Pattern matching
```

### 8.5 Rate Limiting

```yaml
Backend:
  Framework: DRF Throttling

  Rates:
    Anonymous: 100/hour
    Authenticated: 1000/hour
    Admin: 2000/hour

  Endpoints:
    - /api/auth/login/: 5/minute (brute force protection)
    - /api/auth/password-reset/: 3/hour
    - /api/payments/: 100/hour

  Storage: Redis cache

  Custom Throttles:
    - LoginRateThrottle
    - PaymentRateThrottle
    - BookingRateThrottle
```

### 8.6 CORS Configuration

```yaml
Backend:
  Package: django-cors-headers

  Development:
    CORS_ALLOWED_ORIGINS:
      - http://localhost:5173
      - http://localhost:5174
    CORS_ALLOW_CREDENTIALS: True

  Production:
    CORS_ALLOWED_ORIGINS:
      - https://admin.lifeplace.com
      - https://portal.lifeplace.com
    CORS_ALLOW_CREDENTIALS: True
    CORS_ALLOWED_METHODS: [GET, POST, PUT, PATCH, DELETE, OPTIONS]
```

### 8.7 Webhook Security

```yaml
Stripe Webhooks:
  - Signature verification (stripe.webhook.construct_event)
  - Timestamp validation
  - Event type verification
  - Idempotency handling

Brevo Webhooks:
  - Optional secret verification
  - IP whitelist (optional)
  - Event type validation
```

---

## 9. Monitoring & Logging

### 9.1 Application Logging

```yaml
Backend Logging:
  Framework: Python logging module
  Format: '[%(asctime)s] %(levelname)s [%(name)s] %(message)s'

  Log Levels:
    Production: INFO
    Development: DEBUG

  Loggers:
    - django: Framework logs
    - django.request: Request/response logs
    - django.security: Security events
    - core.domains.*: Domain-specific logs (with emoji prefixes)

  Emoji Prefixes:
    - 📧 communications
    - 💳 payments
    - 📝 contracts
    - 🛍️ products
    - 🔄 workflows
    - 📊 analytics

  Handlers:
    - Console: StreamHandler
    - File: FileHandler (optional, production)
    - Sentry: SentryHandler (errors only)

  Configuration:
    LOGGING = {
      'version': 1,
      'disable_existing_loggers': False,
      'formatters': {...},
      'handlers': {...},
      'loggers': {...}
    }
```

### 9.2 Performance Monitoring

```yaml
Backend:
  - Django Debug Toolbar (development)
  - Sentry Performance Monitoring (production)
  - Custom middleware for request timing
  - Database query logging (development)

Frontend:
  - React Query DevTools (development)
  - Browser DevTools Performance tab
  - Lighthouse CI (planned)
  - Web Vitals tracking (planned)

Metrics Tracked:
  - API response times
  - Database query times
  - Cache hit rates
  - Celery task durations
  - WebSocket connection counts
  - Frontend bundle sizes
  - Time to First Byte (TTFB)
  - First Contentful Paint (FCP)
  - Largest Contentful Paint (LCP)
```

### 9.3 Health Checks

```yaml
Backend Endpoints:
  /health/:
    Purpose: Basic health check
    Response: {"status": "healthy", "service": "lifeplace-backend"}
    Status: 200 OK

  /ready/:
    Purpose: Readiness check with dependencies
    Checks:
      - Database connection
      - Redis connection
      - Celery worker status
    Response: {"status": "ready", "checks": {...}}
    Status: 200 OK (all healthy) / 503 Service Unavailable

Railway Configuration:
  Health Check Path: /health/
  Interval: 30 seconds
  Timeout: 10 seconds
  Threshold: 3 failures
```

### 9.4 Analytics & Metrics

```yaml
Application Analytics:
  - Booking flow conversion tracking
  - Step completion/drop-off rates
  - Revenue metrics
  - Event count by status
  - Payment success rates

Database:
  Model: BookingFlowAnalytics
  Aggregation: Daily via Celery Beat

Business Metrics:
  - Events created per day
  - Revenue per day
  - Conversion rate by booking flow
  - Average booking value
  - Payment plan usage
```

---

## 10. Testing Stack

### 10.1 Backend Testing

```yaml
Framework: Django TestCase + pytest

Test Types:
  - Unit tests (models, services, utilities)
  - Integration tests (API endpoints)
  - Functional tests (workflows)

Test Database:
  - In-memory SQLite (fast)
  - PostgreSQL (for production parity)

Coverage:
  Tool: coverage.py
  Target: 80%+ (aspirational)

Commands:
  python manage.py test
  python manage.py test core.domains.payments
  pytest
  coverage run manage.py test
  coverage report

Test Structure:
  backend/core/domains/*/tests.py
  backend/core/domains/*/tests/
    - test_models.py
    - test_serializers.py
    - test_views.py
    - test_services.py
```

### 10.2 Frontend Testing

```yaml
Framework: Vitest + Testing Library

Test Types:
  - Unit tests (components, hooks, utilities)
  - Integration tests (user flows)
  - Snapshot tests (component rendering)

Coverage:
  Tool: @vitest/coverage-v8
  Target: 70%+ (aspirational)
  Reporters: text, html, json

Commands:
  npm run test - Run all tests
  npm run test:watch - Watch mode
  npm run test:coverage - With coverage
  npm run test:ui - UI mode

Test Structure:
  src/components/**/__tests__/
  src/hooks/**/__tests__/
  src/utils/**/__tests__/

Test Files:
  - *.test.tsx
  - *.test.ts

Mock Data:
  - MSW (Mock Service Worker) for API mocking
  - Test fixtures
  - Factory functions
```

### 10.3 API Testing

```yaml
Tools:
  - Postman/Thunder Client (manual)
  - DRF test client (automated)
  - pytest-django (automated)

Test Coverage:
  - Authentication endpoints
  - CRUD operations
  - Business logic endpoints
  - Error handling
  - Permissions

Assertions:
  - Status codes
  - Response structure
  - Data validation
  - Side effects (database, emails, etc.)
```

### 10.4 End-to-End Testing (Planned)

```yaml
Framework: Playwright (planned)
Purpose: Full user journey testing

Test Scenarios:
  - Complete booking flow
  - Quote acceptance to contract signing
  - Payment processing
  - Admin workflow

Browsers:
  - Chromium
  - Firefox
  - WebKit (Safari)

Environments:
  - Staging only
  - Not on every commit (too slow)
```

---

## 11. Build & CI/CD Pipeline

### 11.1 CI/CD Platform

```yaml
Platform: GitHub Actions
Configuration: .github/workflows/ci-cd.yml

Triggers:
  - Push to main
  - Pull requests
  - Manual trigger (workflow_dispatch)

Stages:
  1. Backend Tests
     - Checkout code
     - Setup Python 3.12
     - Install dependencies
     - Run Django tests
     - Run system checks

  2. Frontend Tests (Admin CRM)
     - Checkout code
     - Setup Node.js 24.2.0
     - Install dependencies
     - Run TypeScript type check
     - Run ESLint
     - Run Vitest tests
     - Build production bundle

  3. Frontend Tests (Client Portal)
     - Same as Admin CRM

  4. Deploy Backend (main branch only)
     - Railway auto-deploy via GitHub integration

  5. Deploy Admin CRM (main branch only)
     - Netlify auto-deploy via GitHub integration

  6. Deploy Client Portal (main branch only)
     - Netlify auto-deploy via GitHub integration

Caching:
  - Python dependencies (pip cache)
  - Node modules (npm cache)
  - Build artifacts

Secrets:
  - Stored in GitHub Secrets
  - Railway API token (if manual deploy)
  - Netlify auth token (if manual deploy)
```

### 11.2 Build Process

#### Backend Build

```yaml
Build Steps:
  1. Install dependencies:
     pip install -r requirements.txt

  2. Collect static files:
     python manage.py collectstatic --no-input

  3. Run migrations:
     python manage.py migrate --no-input

  4. Seed default data (optional):
     python manage.py seed_default_settings

Build Time: ~3-5 minutes (Railway)

Artifacts:
  - Compiled Python bytecode (.pyc files)
  - Static files (collected)
  - Database migrations applied
```

#### Frontend Build

```yaml
Build Steps:
  1. Install dependencies:
     npm ci (or npm install)

  2. Type check:
     npm run type-check

  3. Lint:
     npm run lint

  4. Build:
     npm run build

  5. Generate source maps (optional)

Build Output:
  Directory: dist/
  Contents:
    - index.html (entry point)
    - assets/*.js (bundled JavaScript)
    - assets/*.css (bundled CSS)
    - assets/*.woff2 (fonts)
    - Manifest files

Build Time: ~2-4 minutes (Netlify)

Optimizations:
  - Tree shaking
  - Code splitting
  - Minification
  - Gzip/Brotli compression
  - Asset hashing for cache busting
```

### 11.3 Deployment Workflow

```yaml
Backend Deployment (Railway):
  1. Push to main branch
  2. Railway detects changes
  3. Builds Docker container (or uses buildpack)
  4. Runs migrations
  5. Restarts services with zero downtime
  6. Health check validation

  Rollback:
    - Via Railway dashboard
    - Redeploy previous build
    - Database migrations may need manual rollback

Frontend Deployment (Netlify):
  1. Push to main branch
  2. Netlify detects changes
  3. Runs build command
  4. Publishes to CDN
  5. Invalidates cache
  6. Atomic deploy (no downtime)

  Rollback:
    - Via Netlify dashboard
    - Rollback to previous deploy
    - Instant (just changes published version)

Deploy Previews:
  - Automatic for all PRs
  - Unique URL per PR
  - Backend: Railway PR environments (optional)
  - Frontend: Netlify deploy previews (automatic)
```

---

## 12. Performance Optimization

### 12.1 Backend Optimizations

```yaml
Database Query Optimization:
  - select_related() for foreign keys
  - prefetch_related() for many-to-many
  - only() and defer() for field limiting
  - Database indexes on frequently queried fields
  - Pagination for large datasets

Caching Strategy:
  - Redis for query results (5-minute TTL)
  - Cache workflow progress per event
  - Cache user sessions
  - Cache API responses (selective)
  - Cache invalidation on updates

API Response Optimization:
  - Serializer optimization (read_only fields)
  - Minimal data in list views
  - Detail data only in detail views
  - Compressed responses (gzip)

Background Processing:
  - Celery for slow operations
  - Email sending (async)
  - PDF generation (async)
  - Analytics aggregation (scheduled)

Connection Pooling:
  - Database connection pooling (psycopg2)
  - Redis connection pooling

Static File Optimization:
  - WhiteNoise for compression
  - Far-future expiry headers
  - Manifest for cache-busting
```

### 12.2 Frontend Optimizations

```yaml
Code Splitting:
  - Route-based splitting
  - Component lazy loading (React.lazy)
  - Dynamic imports

Bundle Optimization:
  - Tree shaking (Vite)
  - Minification (Terser)
  - Gzip/Brotli compression
  - Asset optimization (images, fonts)

Rendering Optimization:
  - React.memo for expensive components
  - useMemo for expensive calculations
  - useCallback for event handlers
  - Virtual scrolling (large lists)
  - Pagination

Data Fetching:
  - React Query caching (5-minute stale time)
  - Prefetching on hover
  - Optimistic updates
  - Request deduplication
  - Debounced search

Asset Optimization:
  - Image lazy loading
  - WebP images (where supported)
  - SVG icons (icon libraries)
  - Font subsetting
  - Preload critical assets

Runtime Performance:
  - Avoid inline function definitions in render
  - Avoid anonymous functions in props
  - Key props for list rendering
  - Avoid unnecessary re-renders
```

### 12.3 Network Optimizations

```yaml
HTTP/2:
  - Enabled (Netlify, Railway)
  - Multiplexing
  - Header compression

CDN:
  - Netlify global CDN for frontend
  - Asset delivery from edge locations

Compression:
  - Gzip for text-based assets
  - Brotli for compatible clients
  - Image compression

Caching Headers:
  Static Assets:
    Cache-Control: public, max-age=31536000, immutable

  API Responses:
    Cache-Control: private, max-age=300 (selective)

  HTML:
    Cache-Control: no-cache

Connection Optimization:
  - Keep-Alive enabled
  - Connection pooling
  - DNS prefetch
  - Preconnect to API domain
```

### 12.4 Monitoring & Profiling

```yaml
Backend Profiling:
  - Django Debug Toolbar (development)
  - cProfile for performance profiling
  - Query logging (development)
  - Slow query detection

Frontend Profiling:
  - React DevTools Profiler
  - Chrome DevTools Performance
  - Lighthouse audits
  - Bundle analyzer

Metrics to Monitor:
  - API response times (target: <200ms)
  - Database query times
  - Cache hit rates
  - Celery task durations
  - Frontend bundle size
  - Time to Interactive (TTI)
  - First Contentful Paint (FCP)
  - Largest Contentful Paint (LCP)
```

---

## Appendix A: Version Matrix

### Complete Technology Versions

```yaml
Backend:
  Python: 3.12.x
  Django: 5.2.1
  Django REST Framework: 3.16.0
  PostgreSQL: 16+
  Redis: Latest
  Celery: 5.5.3
  Gunicorn: 23.0.0
  Daphne: 4.1.2
  Channels: 4.1.0
  Stripe SDK: 12.2.0
  ReportLab: 4.2.5

Frontend (Admin CRM):
  Node.js: 24.2.0
  React: 19.1.0
  TypeScript: ~5.8.3
  Material-UI: 7.1.1
  React Query: 5.80.5
  React Router: 7.6.2
  Axios: 1.9.0
  Vite: ^6.3.5
  TipTap: 2.22.3
  Recharts: 3.1.2

Frontend (Client Portal):
  Node.js: 24.2.0
  React: 19.1.0
  TypeScript: ~5.8.3
  Material-UI: 7.1.1
  React Query: 5.80.5
  React Router: 7.6.2
  Axios: 1.9.0
  Vite: ^6.3.5
  Stripe.js: 7.4.0
  Stripe React: 3.7.0
  Recharts: 3.0.0
```

---

## Appendix B: Environment Variables Reference

See [ENV_VARS.md](./ENV_VARS.md) for complete environment variable documentation.

---

## Appendix C: Port Allocation

```yaml
Development Ports:
  Backend:
    - 8000: Django HTTP (Gunicorn/runserver)
    - 8001: Django WebSocket (Daphne)

  Frontend:
    - 5173: Admin CRM (Vite dev server)
    - 5174: Client Portal (Vite dev server)

  Services:
    - 5432: PostgreSQL
    - 6379: Redis

Production:
  Backend:
    - $PORT: HTTP (Railway assigns dynamically)
    - 8001: WebSocket (Daphne)

  Frontend:
    - 443: HTTPS (Netlify CDN)
```

---

## Appendix D: Browser Compatibility Matrix

```yaml
Supported Browsers:
  Chrome: Latest 2 versions
  Firefox: Latest 2 versions
  Safari: Latest 2 versions
  Edge: Latest 2 versions

Mobile Browsers:
  Chrome Mobile: Latest
  Safari iOS: Latest 2 versions

Not Supported:
  Internet Explorer: All versions
  Opera Mini: All versions

Required Features:
  - ES2020 JavaScript
  - CSS Grid
  - Flexbox
  - CSS Custom Properties
  - Fetch API
  - WebSocket API
  - LocalStorage
```

---

**END OF TECHNICAL STACK SPECIFICATION**

**Document Status**: Complete
**Last Updated**: 2025-11-24
**Maintained By**: Development Team
**Review Cycle**: Quarterly or on major version changes
