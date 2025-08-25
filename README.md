# LifePlace - Event Management Platform

A comprehensive full-stack event management platform designed for event businesses to manage their entire workflow from initial client contact through event completion.

## 🚀 Features

- **Multi-Step Booking Flows**: Customizable booking journeys with dynamic forms
- **Client Management**: Complete client lifecycle management with communications tracking
- **Event Management**: Full event lifecycle from planning to completion
- **Payment Processing**: Integrated Stripe payment processing with invoicing and quotes
- **Workflow Automation**: Automated workflow stages and task management
- **Analytics & Reporting**: Comprehensive analytics and custom reporting
- **Dynamic Questionnaires**: Flexible form builder for client requirements
- **Contract Management**: Template-based contract generation and management
- **Communication Hub**: Centralized email/SMS communications with templates
- **Notification System**: Real-time in-app notifications and alerts

## 🏗️ Architecture

### Backend - Django REST API
- **Framework**: Django 5.2.1 with Django REST Framework
- **Database**: PostgreSQL with psycopg2
- **Authentication**: JWT tokens via djangorestframework-simplejwt
- **Task Queue**: Celery for async processing
- **Payments**: Stripe SDK integration
- **Architecture**: Domain-Driven Design (DDD)

### Frontend - Dual React Applications
- **Admin CRM**: Internal management dashboard
- **Client Portal**: Customer-facing booking and event portal
- **Framework**: React 19 with TypeScript
- **UI Library**: Material-UI (MUI) v7
- **State Management**: TanStack Query v5 for server state
- **Build Tool**: Vite
- **Testing**: Vitest with React Testing Library

## 📁 Project Structure

```
lifeplace-app/
├── backend/                    # Django REST API
│   ├── core/                  # Django project core
│   │   ├── domains/          # Domain-driven architecture
│   │   │   ├── analytics/    # Event tracking & reporting
│   │   │   ├── bookingflow/  # Multi-step booking engine
│   │   │   ├── clients/      # Client management
│   │   │   ├── communications/ # Email/SMS messaging
│   │   │   ├── contracts/    # Contract generation
│   │   │   ├── events/       # Event lifecycle management
│   │   │   ├── notes/        # Internal notes system
│   │   │   ├── notifications/ # In-app notifications
│   │   │   ├── payments/     # Payment processing
│   │   │   ├── products/     # Product catalog & pricing
│   │   │   ├── questionnaires/ # Dynamic form builder
│   │   │   ├── sales/        # Quote generation
│   │   │   ├── users/        # Authentication & users
│   │   │   └── workflows/    # Workflow automation
│   │   └── settings.py       # Django configuration
│   ├── requirements.txt      # Python dependencies
│   └── manage.py            # Django management
├── frontend/
│   ├── admin-crm/           # Admin dashboard app
│   │   ├── src/
│   │   │   ├── components/  # Reusable components
│   │   │   ├── pages/       # Page components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   ├── apis/        # API integration layer
│   │   │   ├── types/       # TypeScript definitions
│   │   │   └── utils/       # Utility functions
│   │   └── package.json
│   └── client-portal/       # Customer portal app
│       ├── src/
│       │   ├── components/  # Reusable components
│       │   ├── pages/       # Page components
│       │   ├── hooks/       # Custom React hooks
│       │   ├── apis/        # API integration layer
│       │   └── types/       # TypeScript definitions
│       └── package.json
└── README.md               # This file
```

## 🛠️ Tech Stack

### Backend Dependencies
- **Django 5.2.1** - Web framework
- **Django REST Framework 3.16.0** - API framework
- **PostgreSQL** (psycopg2-binary) - Database
- **Celery 5.5.3** - Async task processing
- **Stripe 12.2.0** - Payment processing
- **JWT Authentication** - Token-based auth
- **Gunicorn** - WSGI server
- **WhiteNoise** - Static file serving

### Frontend Dependencies
- **React 19** - UI library
- **TypeScript 5.8** - Type safety
- **Material-UI v7** - Component library
- **TanStack Query v5** - Server state management
- **React Router v7** - Client-side routing
- **Axios** - HTTP client
- **Stripe.js** - Payment forms (client-portal)
- **TipTap** - Rich text editing (admin-crm)
- **Recharts** - Analytics charts

## 🚦 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+
- PostgreSQL
- Git

### Backend Setup

```bash
# Clone the repository
git clone <repository-url>
cd lifeplace-app

# Backend setup
cd backend
pip install -r requirements.txt

# Create .env file with required variables:
# DATABASE_URL=postgresql://username:password@localhost/dbname
# SECRET_KEY=your-django-secret-key
# DEBUG=True
# ALLOWED_HOSTS=localhost,127.0.0.1
# CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
# STRIPE_SECRET_KEY=your-stripe-secret-key
# STRIPE_PUBLIC_KEY=your-stripe-public-key

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Start development server
python manage.py runserver
```

### Frontend Setup

#### Admin CRM
```bash
cd frontend/admin-crm
npm install

# Create .env file:
# VITE_API_URL=http://localhost:8000
# VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key

npm run dev  # Starts on http://localhost:3000
```

#### Client Portal
```bash
cd frontend/client-portal
npm install

# Create .env file:
# VITE_API_URL=http://localhost:8000
# VITE_STRIPE_PUBLIC_KEY=your-stripe-public-key

npm run dev  # Starts on http://localhost:3001
```

## 📋 Available Scripts

### Backend
```bash
python manage.py runserver      # Start development server
python manage.py makemigrations # Create database migrations
python manage.py migrate        # Apply database migrations
python manage.py shell          # Django shell
python manage.py collectstatic  # Collect static files
```

### Frontend (both apps)
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

## 🏢 Core Domains

### Analytics
Event tracking, conversion analytics, and custom reporting system.

### Booking Flow
Multi-step booking process with configurable steps:
- Introduction & Welcome
- Contact Information
- Date & Time Selection
- Package Selection
- Add-ons Selection
- Questionnaire
- Pricing Summary
- Payment Processing
- Review & Confirmation

### Client Management
Complete client lifecycle management with communication history and event tracking.

### Event Management
Full event lifecycle from initial inquiry through completion with workflow automation.

### Payment Processing
Comprehensive payment system with Stripe integration, invoicing, quotes, and payment plans.

### Workflow Engine
Automated workflow stages with task management and progress tracking.

## 🔐 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://username:password@localhost/dbname
SECRET_KEY=your-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
CSRF_TRUSTED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLIC_KEY=pk_test_...
```

### Frontend (.env for both apps)
```
VITE_API_URL=http://localhost:8000
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

## 🧪 Testing

### Backend
```bash
cd backend
python manage.py test
```

### Frontend
```bash
# Admin CRM
cd frontend/admin-crm
npm run test

# Client Portal
cd frontend/client-portal
npm run test
```

## 🚀 Deployment

The application is configured for deployment with:
- **Backend**: Gunicorn WSGI server with WhiteNoise for static files
- **Frontend**: Static builds can be served from any CDN or static hosting
- **Database**: PostgreSQL production setup
- **Environment**: Production environment variables

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Contributing

This is a private repository. Please follow the established coding standards:
- Follow existing code patterns and conventions
- Use TypeScript for all new frontend code
- Follow Django best practices for backend development
- Write tests for new functionality
- Use the established domain-driven architecture

## 📞 Support

For support and questions, please contact the development team.