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