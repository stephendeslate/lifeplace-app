# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack event management platform (LifePlace) with:
- **Backend**: Django REST API (Python 3.12)
- **Frontend**: Two React TypeScript applications
  - `admin-crm`: Admin dashboard for internal management
  - `client-portal`: Client-facing booking and portal interface

## Development Commands

Before running any python commands, run the virtual environment found in the root directory /lifeplace-app.

### Backend (Django)
```bash
source venv/bin/activate
cd backend

# Setup
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser

# Development (for WebSocket support, use Daphne instead of runserver)
daphne -p 8000 core.asgi:application

# Alternative: Standard development (no WebSocket support)
python manage.py runserver

# Database operations
python manage.py makemigrations
python manage.py migrate

# Shell access
python manage.py shell

# Static files
python manage.py collectstatic
```

### Frontend (React/TypeScript)

#### Admin CRM
```bash
cd frontend/admin-crm

# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing & Quality
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

#### Client Portal
```bash
cd frontend/client-portal

# Development
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build

# Testing & Quality
npm run test         # Run tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## Architecture

### Backend Domain Structure
The backend follows Domain-Driven Design with these core domains:

- **analytics**: Event tracking and reporting
- **bookingflow**: Multi-step booking flow engine
- **clients**: Client management
- **communications**: Email/SMS templates and messaging
- **contracts**: Contract generation and management
- **events**: Event lifecycle management
- **notes**: Internal notes system
- **notifications**: In-app notification system
- **payments**: Payment processing with Stripe integration
- **products**: Product catalog and pricing
- **questionnaires**: Dynamic form builder
- **sales**: Quote generation and management
- **users**: Authentication and user management
- **workflows**: Workflow automation engine

Each domain typically contains:
- `models.py`: Django models
- `serializers.py`: DRF serializers
- `views.py`: API endpoints
- `services.py`: Business logic
- `urls.py`: URL routing
- `signals.py`: Django signals (when applicable)

### Frontend Architecture

Both frontend apps use:
- **React 19** with TypeScript
- **Material-UI (MUI)** for components
- **React Query (TanStack Query)** for server state
- **React Router** for navigation
- **Axios** for API calls
- **React Hook Form** patterns for forms
- **Vite** as build tool

#### Key Frontend Patterns

1. **API Layer** (`src/apis/`): Centralized API calls
2. **Custom Hooks** (`src/hooks/`): Business logic hooks using React Query
3. **Type Definitions** (`src/types/`): TypeScript interfaces
4. **Context Providers**: Auth, Toast notifications, Layout state
5. **Component Organization**:
   - Domain-specific components in `components/[domain]/`
   - Shared components in `components/common/`
   - Page components in `pages/`
6. **No Grid Components** Do not use Grid component

### Booking Flow System

The booking flow is a core feature that allows dynamic multi-step forms:
- Steps (10 types): Introduction, Venue Selection, DateTime, Package Selection, Add-ons, Questionnaire, Pricing Summary, Contact Info, Payment, Confirmation
- Each step has configurable behavior via `BookingFlowStep` configurations
- Session management tracks user progress
- Analytics integration for conversion tracking
- Note: "Review" step was deprecated and migrated to "Pricing Summary"

### Payment Integration

- Stripe integration for payment processing
- Support for multiple payment gateways per booking flow
- Invoice and quote generation
- Payment plan management

## Environment Configuration

Backend requires `.env` file with:
- `DATABASE_URL`: PostgreSQL connection string
- `SECRET_KEY`: Django secret key
- `DEBUG`: True/False
- `ALLOWED_HOSTS`: Comma-separated list
- `CSRF_TRUSTED_ORIGINS`: Comma-separated list
- Stripe keys and other service credentials

Frontend apps use environment variables for:
- `VITE_API_URL`: Backend API URL
- `VITE_STRIPE_PUBLIC_KEY`: Stripe publishable key

## Key Dependencies

### Backend
- Django 5.2.1 with Django REST Framework
- PostgreSQL (via psycopg2)
- Celery for async tasks
- Stripe SDK for payments
- JWT authentication (djangorestframework-simplejwt)

### Frontend
- Material-UI v7 for UI components
- TanStack Query v5 for data fetching
- Recharts for analytics visualizations
- TipTap for rich text editing (admin-crm)
- Stripe.js for payment forms (client-portal)

## Testing Approach

- Backend: Django's built-in test framework
- Frontend: Vitest with React Testing Library
- Run all frontend tests before commits
- Test files co-located with components

## Timezone Handling

**IMPORTANT:** This application uses a single-timezone architecture.

### Overview
- All datetimes are stored as **naive datetimes** in **Philippine Time (Asia/Manila, UTC+8)**
- `USE_TZ = False` is **intentional** (see [ADR-001](docs/architecture/ADR-001-timezone-handling.md))
- Philippines does **NOT** observe daylight saving time (constant UTC+8 year-round)
- All event times represent venue wall-clock time in the Philippines

### For Backend Developers
- **Use `timezone.now()`** (not `datetime.now()`) for current time
- All datetime fields in models are naive (no timezone info attached)
- Email templates automatically include "PHT" suffix
- API serializers include `timezone` and `timezone_offset` metadata fields

### For Frontend Developers
- **Always use timezone utilities** from `src/utils/timezone.ts`
- **NEVER use** `toLocaleDateString()` or `toLocaleTimeString()` directly
- **Use `formatPhilippinesTime()`** for consistent timezone display
- **Use `DateTimeDisplay` component** for automatic PHT labeling

#### Correct Usage Examples
```typescript
// ✅ GOOD - Uses timezone utilities
import { formatPhilippinesTime } from '../../utils/timezone';
formatPhilippinesTime(event.start_date, true, 'MMM d, yyyy h:mm a');
// Output: "Mar 15, 2026 6:00 PM PHT"

// ✅ GOOD - Uses DateTimeDisplay component
<DateTimeDisplay date={event.start_date} showDualTimezone />

// ❌ BAD - Uses browser's local timezone
new Date(event.start_date).toLocaleDateString()
// Output varies by browser timezone - WRONG!
```

#### Available Utilities
- `formatPhilippinesTime(date, includeTimezone, format)` - Format date in PHT
- `formatDualTimezone(date, adminTimezone)` - Show both business and admin timezones
- `DateTimeDisplay` component - React component with PHT display
- `DateTimeFull` component - Full date with day of week
- `DateDisplay` component - Date only (no time)
- `TimeDisplay` component - Time only (no date)

### For API Clients
- All datetime fields are in **Philippine Time**
- Each response includes `timezone: "Asia/Manila"` and `timezone_offset: "+08:00"`
- Convert to your local timezone on the client side
- See API documentation at `/api/docs/` for examples

### Why Single Timezone?
- All events are physical venue events in the Philippines
- Simpler architecture for single-timezone business
- Matches how venue staff think about event times
- See [ADR-001](docs/architecture/ADR-001-timezone-handling.md) for full rationale

### Migration Path
If business expands internationally:
- Enable `USE_TZ = True` in Django settings
- Run migration to convert naive datetimes to timezone-aware
- Update all `datetime.now()` to `timezone.now()`
- Estimated effort: 2-3 weeks

### References
- **Architecture Decision**: [ADR-001](docs/architecture/ADR-001-timezone-handling.md)
- **Frontend Utilities**: `frontend/admin-crm/src/utils/timezone.ts`
- **Backend Settings**: `backend/core/settings.py:196`
- **Email Templates**: `backend/core/domains/communications/context_service.py`