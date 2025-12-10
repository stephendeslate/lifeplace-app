# Software Requirements Specification (SRS)
# LifePlace Event Management Platform

**Version:** 1.0
**Date:** 2025-11-24
**Project:** LifePlace Event Management System
**Classification:** Reverse-Engineered from Production Codebase

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [System Architecture](#3-system-architecture)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Domain Models and Data Requirements](#6-domain-models-and-data-requirements)
7. [External Interfaces](#7-external-interfaces)
8. [System Features](#8-system-features)
9. [Technical Constraints](#9-technical-constraints)
10. [Appendices](#10-appendices)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document describes the functional and non-functional requirements for the LifePlace Event Management Platform - a full-stack web application designed to manage the complete event lifecycle from initial booking through event completion.

### 1.2 Document Scope

This SRS covers:
- Backend API system built with Django REST Framework
- Admin CRM interface for internal staff
- Client Portal interface for customers
- All integrated third-party services
- Database schema and domain models
- Business workflows and automation

### 1.3 Intended Audience

- Development team members
- System architects and designers
- Quality assurance team
- Project stakeholders
- Technical documentation team

### 1.4 Product Scope

LifePlace is a comprehensive event management platform that enables:
- Multi-step online booking with payment processing
- Event lifecycle management with workflow automation
- Quote and invoice generation
- Contract generation and e-signature
- Payment processing with multiple payment plans
- Client communication via email/SMS
- Real-time notifications and messaging
- Analytics and reporting

---

## 2. Overall Description

### 2.1 Product Perspective

LifePlace consists of three main components:

1. **Backend API Server** (Django REST Framework)
   - RESTful API endpoints
   - WebSocket support for real-time features
   - Background task processing (Celery)
   - PostgreSQL database
   - Redis cache and message broker

2. **Admin CRM** (React TypeScript)
   - Internal staff dashboard
   - Event and client management
   - Quote/invoice creation
   - Contract management
   - Workflow automation
   - Analytics and reporting

3. **Client Portal** (React TypeScript)
   - Multi-step booking flow
   - Payment processing
   - Contract signing
   - Event information viewing
   - Real-time chat with staff

### 2.2 Product Functions

#### Core Business Functions:
- **Booking Management**: Multi-step configurable booking flows with real-time availability
- **Event Management**: Complete event lifecycle from lead to completion
- **Financial Management**: Quotes, invoices, payments, payment plans, refunds
- **Contract Management**: Template-based contract generation with multi-party e-signatures
- **Workflow Automation**: Trigger-based workflow progression with automated tasks
- **Communication**: Template-based email/SMS with tracking
- **Client Management**: User profiles, contact information, event history
- **Product Management**: Package and add-on catalog with dynamic pricing
- **Analytics**: Booking conversion, revenue tracking, event statistics

### 2.3 User Classes and Characteristics

#### 2.3.1 Admin Users
- **Role**: Internal staff managing events
- **Access**: Admin CRM application
- **Permissions**: Full CRUD operations on all entities
- **Technical Expertise**: Moderate (business users)
- **Primary Functions**: Event management, client communication, financial operations

#### 2.3.2 Client Users
- **Role**: Customers booking and managing events
- **Access**: Client Portal application
- **Permissions**: View own data, book events, make payments, sign contracts
- **Technical Expertise**: Low (general public)
- **Primary Functions**: Event booking, payment, contract signing, information viewing

#### 2.3.3 System
- **Role**: Automated processes
- **Functions**: Workflow triggers, scheduled tasks, webhook processing

### 2.4 Operating Environment

**Production Environment:**
- **Backend**: Railway.app (all-in-one service with Honcho process manager)
- **Frontend**: Netlify (two separate deployments)
- **Database**: Railway-managed PostgreSQL 16+
- **Cache**: Railway-managed Redis 256MB
- **External Services**: Stripe, Brevo, Sentry

**Development Environment:**
- **Backend**: Local Python 3.12 with Daphne ASGI server
- **Frontend**: Local Vite dev server (ports 5173, 5174)
- **Database**: Local PostgreSQL
- **Cache**: Local Redis

### 2.5 Design and Implementation Constraints

**Technical Constraints:**
- Python 3.12 runtime required
- Django 5.2.1 framework
- React 19.1.0 for frontend
- PostgreSQL 16+ for database
- Node.js 24.2.0 for frontend builds

**Business Constraints:**
- HTTPS required for production
- PCI DSS compliance for payment processing (via Stripe)
- Electronic signature compliance (ESIGN Act)
- Data retention policies for financial records

### 2.6 Assumptions and Dependencies

**Assumptions:**
- Continuous internet connectivity
- Modern web browsers (Chrome, Firefox, Safari, Edge)
- JavaScript enabled in browsers
- Valid SSL certificates in production

**Dependencies:**
- Stripe API for payment processing
- Brevo API for email/SMS delivery
- Django REST Framework for API
- Material-UI component library
- React Query for state management

---

## 3. System Architecture

### 3.1 Architectural Pattern

**Backend**: Domain-Driven Design (DDD) with 16 bounded contexts
**Frontend**: Component-based architecture with React
**Communication**: RESTful HTTP APIs + WebSocket for real-time features
**State Management**: Server state (React Query) + Local state (React hooks)

### 3.2 Technology Stack

#### Backend
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Python | 3.12 | Server execution |
| Framework | Django | 5.2.1 | Web framework |
| API Framework | Django REST Framework | 3.16.0 | RESTful APIs |
| Database | PostgreSQL | 16+ | Data persistence |
| Cache | Redis | Latest | Caching & message broker |
| Task Queue | Celery | 5.5.3 | Background jobs |
| ASGI Server | Daphne | 4.1.2 | WebSocket support |
| WSGI Server | Gunicorn | 23.0.0 | HTTP server |
| WebSocket | Django Channels | 4.1.0 | Real-time communication |

#### Frontend
| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Node.js | 24.2.0 | Build environment |
| Framework | React | 19.1.0 | UI library |
| Language | TypeScript | 5.x | Type safety |
| UI Library | Material-UI | 7.1.1 | Component library |
| State Management | React Query | 5.80.5 | Server state |
| Router | React Router | 7.6.2 | Navigation |
| Build Tool | Vite | Latest | Module bundler |
| Testing | Vitest | Latest | Unit testing |
| HTTP Client | Axios | 1.9.0 | API requests |

#### Key Libraries
- **Stripe SDK** (12.2.0): Payment processing
- **ReportLab** (4.2.5): PDF generation
- **TipTap** (Admin): Rich text editing
- **Recharts** (3.1.2): Data visualization
- **date-fns** (4.1.0): Date manipulation
- **Zod** (4.1.3): Schema validation

### 3.3 Domain Architecture

The backend follows Domain-Driven Design with 16 core domains:

```
core/domains/
├── analytics/        # Event tracking and reporting
├── bookingflow/      # Multi-step booking engine
├── clients/          # Client management (legacy, uses users)
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

Each domain typically contains:
- `models.py` - Database models
- `serializers.py` - DRF serializers
- `views.py` - API endpoints
- `urls.py` - URL routing
- `services.py` - Business logic
- `signals.py` - Event handlers
- `tasks.py` - Celery background tasks

---

## 4. Functional Requirements

### 4.1 User Authentication and Authorization

#### REQ-AUTH-001: Email-Based Authentication
**Priority**: High
**Description**: System shall authenticate users via email and password.
- Username field is removed; email is the unique identifier
- Password must meet Django's default password validators
- JWT tokens with 1-hour access token and 7-day refresh token
- Token rotation enabled for security

#### REQ-AUTH-002: Role-Based Access Control
**Priority**: High
**Description**: System shall enforce role-based permissions.
- Two primary roles: ADMIN and CLIENT
- Superusers automatically assigned ADMIN role
- Admins have full access to Admin CRM
- Clients have restricted access to Client Portal
- Field-level permissions on API endpoints

#### REQ-AUTH-003: Admin Invitation System
**Priority**: Medium
**Description**: System shall support inviting new admin users.
- Existing admins can send invitations via email
- Invitations valid for 7 days
- Supports upgrading existing CLIENT users to ADMIN
- Unique invitation tokens (UUID)
- Email notification with invitation link

#### REQ-AUTH-004: Password Reset
**Priority**: High
**Description**: System shall provide secure password reset.
- Password reset tokens (UUID) valid for 1 hour
- Single-use tokens marked as used after reset
- Email notification with reset link
- Old tokens automatically expire

### 4.2 Booking Flow Management

#### REQ-BOOK-001: Configurable Multi-Step Booking
**Priority**: Critical
**Description**: System shall support configurable booking flows.
- Multiple booking flows per event type
- Configurable steps: Introduction, DateTime, Package Selection, Add-ons, Questionnaire, Contact Info, Payment, Confirmation
- Step ordering and visibility conditions
- Skip logic based on booking data
- Progress tracking per session

#### REQ-BOOK-002: Booking Session Management
**Priority**: High
**Description**: System shall track booking sessions.
- Unique session IDs (UUID)
- Session data persisted in JSON field
- Session expiration (configurable)
- Resume capability for abandoned sessions
- IP address and user agent tracking
- Conversion tracking to events

#### REQ-BOOK-003: Real-Time Availability Checking
**Priority**: High
**Description**: System shall check availability during booking.
- Date/time conflict detection
- Venue availability checking
- Resource availability checking
- Buffer time before/after events
- Blocked dates configuration
- Available days of week configuration

#### REQ-BOOK-004: Dynamic Pricing Calculation
**Priority**: High
**Description**: System shall calculate prices dynamically.
- Base package pricing
- Excess hours calculation
- Add-on pricing
- Discount code application
- Tax calculation
- Currency formatting (PHP default)
- Centralized pricing service (DRY principle)

#### REQ-BOOK-005: Package and Add-on Selection
**Priority**: High
**Description**: System shall support product selection.
- Single or multiple package selection
- Category-based filtering
- Add-on selection with quantities
- Product descriptions and images
- Pricing display
- Comparison functionality
- Recommendations based on selections

#### REQ-BOOK-006: Contact Information Collection
**Priority**: High
**Description**: System shall collect client contact information.
- Required fields: full name, email, phone
- Optional fields: address, company
- Custom fields via JSON configuration
- Account creation during booking
- Validation using Zod schemas

#### REQ-BOOK-007: Payment Processing During Booking
**Priority**: Critical
**Description**: System shall process payments during booking.
- Full payment option
- Deposit payment option (percentage-based)
- Payment plan option
- Quote request option (no immediate payment)
- Stripe integration
- Payment gateway selection
- Receipt generation

#### REQ-BOOK-008: Booking Confirmation
**Priority**: High
**Description**: System shall confirm bookings.
- Confirmation page with booking summary
- Email confirmation (template-based)
- Calendar invite generation (optional)
- Event creation in system
- Workflow trigger on completion

### 4.3 Event Management

#### REQ-EVENT-001: Event Lifecycle Tracking
**Priority**: Critical
**Description**: System shall track complete event lifecycle.
- Event statuses: LEAD, CONFIRMED, COMPLETED, CANCELLED
- Event type association
- Client association
- Start and end date/time
- Venue information
- Assigned staff
- Payment status tracking
- Workflow stage tracking

#### REQ-EVENT-002: Event Product Association
**Priority**: High
**Description**: System shall link products to events.
- Package and add-on tracking
- Quantity and final pricing
- Event duration parameters (hours, nights, participants)
- Excess hours calculation
- Product option history

#### REQ-EVENT-003: Event Timeline
**Priority**: Medium
**Description**: System shall maintain event activity timeline.
- Action types: Status Change, Stage Change, Quote Created, Quote Accepted, Contract Signed, Payment Received, etc.
- Actor tracking (user who performed action)
- Description and metadata (JSON)
- Public vs internal visibility
- Chronological ordering

#### REQ-EVENT-004: Event Task Management
**Priority**: High
**Description**: System shall manage event-related tasks.
- Task creation and assignment
- Due dates and priorities (LOW, MEDIUM, HIGH, URGENT)
- Status tracking (PENDING, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED)
- Workflow stage association
- Task dependencies
- Client visibility flags
- Completion notes and timestamps

#### REQ-EVENT-005: Event File Management
**Priority**: Medium
**Description**: System shall manage event files.
- File categories: Contract, Quote, Payment, Requirements, Photo, Other
- File upload validation (PDF, DOC, DOCX, JPG, JPEG, PNG)
- Version tracking
- Uploader tracking
- File size and MIME type storage
- Public vs internal visibility

#### REQ-EVENT-006: Event Feedback Collection
**Priority**: Low
**Description**: System shall collect event feedback.
- Overall rating (1-5 stars)
- Category-specific ratings (JSON)
- Comments and testimonials
- Public testimonial flag
- Admin response capability
- One feedback per client per event

#### REQ-EVENT-007: Event Payment Status
**Priority**: Critical
**Description**: System shall track event payment status.
- Payment statuses: UNPAID, PARTIALLY_PAID, PAID
- Total amount due calculation from invoices
- Total amount paid calculation from completed payments
- Automatic status updates
- Invoice-payment relationship tracking

### 4.4 Payment and Financial Management

#### REQ-PAY-001: Payment Processing
**Priority**: Critical
**Description**: System shall process payments.
- Payment states: CREATED, PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED
- Unique payment numbers with atomic generation
- Amount and currency tracking
- Due date management
- Payment method association
- Manual payment support
- Receipt generation
- State machine with audit trail

#### REQ-PAY-002: Payment Gateway Integration
**Priority**: Critical
**Description**: System shall integrate multiple payment gateways.
- Stripe primary integration
- Encrypted gateway configuration
- Active/inactive gateway management
- Gateway-specific webhooks
- Transaction logging

#### REQ-PAY-003: Invoice Generation
**Priority**: High
**Description**: System shall generate invoices.
- Unique invoice IDs
- Invoice statuses: DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID, CANCELLED
- Line items with pricing details
- Tax calculation
- Quote association
- PDF generation
- Issue and due dates
- Payment tracking

#### REQ-PAY-004: Payment Plans
**Priority**: High
**Description**: System shall support payment plans.
- Down payment + installments
- Frequency: Weekly, Bi-weekly, Monthly
- Installment generation
- Status tracking: PENDING, ACTIVE, COMPLETED, SUSPENDED, DEFAULTED, CANCELLED
- Grace period management
- Late fee application
- Auto-payment support
- Terms acceptance tracking

#### REQ-PAY-005: Refund Processing
**Priority**: Medium
**Description**: System shall process refunds.
- Refund statuses: PENDING, PROCESSING, COMPLETED, FAILED, REJECTED
- Partial and full refunds
- Reason tracking
- Gateway integration
- Timeline updates

#### REQ-PAY-006: Tax Management
**Priority**: Medium
**Description**: System shall manage tax rates.
- Tax rate configuration
- Regional tax rates
- Default tax rate selection
- Tax application on invoices

#### REQ-PAY-007: Payment Notifications
**Priority**: High
**Description**: System shall send payment notifications.
- Notification types: Invoice Issued, Payment Reminder, Payment Received, Payment Overdue, Receipt Sent
- Email delivery
- Template usage
- Delivery tracking

#### REQ-PAY-008: Payment Settings
**Priority**: Medium
**Description**: System shall maintain global payment settings (singleton).
- Balance due days (default: 30)
- Grace period days (default: 7)
- Default deposit percentage (default: 50%)
- Late fee configuration
- Refund policy
- Default payment gateways
- Auto-retry settings

### 4.5 Quote and Sales Management

#### REQ-QUOTE-001: Quote Generation
**Priority**: High
**Description**: System shall generate event quotes.
- Quote versioning
- Quote statuses: DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED
- Line items with pricing
- Tax and discount calculation
- Validity period
- PDF generation
- Template-based creation

#### REQ-QUOTE-002: Quote Templates
**Priority**: Medium
**Description**: System shall support quote templates.
- Event type association
- Product inclusion
- Default terms and conditions
- Multiple options support
- Contract template linking
- Questionnaire linking
- Workflow template linking

#### REQ-QUOTE-003: Quote Acceptance/Rejection
**Priority**: High
**Description**: System shall handle quote decisions.
- Digital signature capture
- Acceptance triggers event confirmation
- Rejection with reason
- Activity logging
- Email notifications
- Workflow trigger on acceptance

#### REQ-QUOTE-004: Quote Activity Tracking
**Priority**: Medium
**Description**: System shall track quote activities.
- Activity types: Created, Updated, Sent, Viewed, Accepted, Rejected, Expired, Reminder Sent
- Actor tracking
- Activity notes
- Chronological log

#### REQ-QUOTE-005: Quote Reminders
**Priority**: Low
**Description**: System shall send quote reminders.
- Scheduled reminder dates
- Automatic reminder creation on send
- Delivery tracking

### 4.6 Contract Management

#### REQ-CONTRACT-001: Contract Templates
**Priority**: High
**Description**: System shall support contract templates.
- Template content with variables
- Event type association
- Section structure (JSON)
- Multi-party signature requirements
- Amendment settings
- Signature role configuration (CLIENT, WITNESS, COMPANY_REP, GUARDIAN, PARTNER, OTHER)

#### REQ-CONTRACT-002: Contract Generation
**Priority**: High
**Description**: System shall generate event contracts.
- Template-based rendering
- Variable substitution
- Contract statuses: DRAFT, SENT, PARTIALLY_SIGNED, SIGNED, EXPIRED, VOID, AMENDED
- Contract value tracking
- Payment schedule reference
- Version control

#### REQ-CONTRACT-003: Multi-Party E-Signature
**Priority**: Critical
**Description**: System shall support electronic signatures.
- Multiple signers per contract
- Role-based signing (one signature per role)
- Signature data (base64 encoded)
- IP address and user agent tracking
- Device fingerprinting
- Signature confidence scoring
- Legal compliance fields (ESIGN Act)
- Electronic consent tracking
- Verification methods

#### REQ-CONTRACT-004: Contract Amendments
**Priority**: Medium
**Description**: System shall support contract amendments.
- Amendment versioning
- Section change tracking
- Value change calculation
- Approval workflow
- Signature requirements
- Amendment statuses: REQUESTED, DRAFT, SENT_FOR_REVIEW, APPROVED, SIGNED, REJECTED, CANCELLED

#### REQ-CONTRACT-005: Contract Documents
**Priority**: Low
**Description**: System shall attach documents to contracts.
- Document types: Attachment, Addendum, Schedule, Terms, Waiver, Other
- File upload
- Version tracking
- Active/inactive status

### 4.7 Workflow Automation

#### REQ-WORKFLOW-001: Workflow Templates
**Priority**: High
**Description**: System shall support workflow templates.
- Event type association
- Stage definitions
- Active/inactive management

#### REQ-WORKFLOW-002: Workflow Stages
**Priority**: High
**Description**: System shall define workflow stages.
- Stage categories: LEAD, PRODUCTION, POST_PRODUCTION
- Ordered progression
- Automation configuration
- Trigger conditions
- Progression criteria

#### REQ-WORKFLOW-003: Automated Actions
**Priority**: High
**Description**: System shall execute automated actions.
- Action types: Email, Task, Quote, Contract, Reminder, Notification
- Email template integration
- Task creation
- Contract generation
- Notification delivery
- Trigger timing configuration

#### REQ-WORKFLOW-004: Workflow Triggers
**Priority**: High
**Description**: System shall track workflow triggers.
- Trigger types: Payment Received, Quote Accepted, Contract Signed, Event Created, Task Completed, Date Trigger, Manual Trigger
- Event association
- Trigger data (JSON)
- Processing status

#### REQ-WORKFLOW-005: Workflow Progression
**Priority**: High
**Description**: System shall progress workflows based on triggers.
- Automatic stage advancement
- Condition checking
- Task completion requirements
- Idempotency protection
- Backwards movement prevention
- Timeline updates

### 4.8 Product and Package Management

#### REQ-PROD-001: Product Categories
**Priority**: Medium
**Description**: System shall organize products in categories.
- Hierarchical categories (parent-child)
- Category slugs
- Active/inactive status
- Sort ordering
- Venue requirement flags
- Typical duration metadata

#### REQ-PROD-002: Product Options
**Priority**: High
**Description**: System shall define products and packages.
- Product types: PRODUCT (add-on), PACKAGE
- Pricing models: FIXED, HOURLY, TIERED, CUSTOM
- Base price and currency (default: PHP)
- Tax rate (default: 12%)
- Active/featured flags
- Time-based configuration (excess hours, included hours, min/max hours)
- Guest capacity constraints
- SKU tracking
- Event type compatibility

#### REQ-PROD-003: Discount Management
**Priority**: Medium
**Description**: System shall support discounts and promotions.
- Discount types: PERCENTAGE, FIXED, FREE_HOURS
- Application types: AUTOMATIC, CODE_REQUIRED, ADMIN_ONLY
- Discount codes (unique)
- Validity periods
- Usage limits (global and per-client)
- Minimum requirements (amount, hours)
- Product/category applicability

### 4.9 Communication Management

#### REQ-COMM-001: Communication Templates
**Priority**: High
**Description**: System shall support communication templates.
- Channels: EMAIL, SMS
- Categories: SYSTEM, MANUAL, AUTO
- Subject and body templates
- Variable schema definition
- System vs user-created templates

#### REQ-COMM-002: Communication Delivery
**Priority**: High
**Description**: System shall deliver communications.
- Email delivery via Brevo
- SMS delivery via Brevo
- Template rendering with variables
- Delivery status tracking: PENDING, SENT, DELIVERED, FAILED, BOUNCED
- Open tracking
- External message ID tracking

#### REQ-COMM-003: Communication Records
**Priority**: Medium
**Description**: System shall maintain communication history.
- Template tracking
- Recipient tracking
- Client and sender association
- Delivery timestamps
- Context data storage (JSON)

### 4.10 Notification System

#### REQ-NOTIF-001: Notification Types
**Priority**: Medium
**Description**: System shall define notification types.
- Categories: SYSTEM, EVENT, TASK, PAYMENT, CLIENT, CONTRACT, WORKFLOW, COMMUNICATION
- Priority levels: LOW, NORMAL, HIGH, URGENT
- Default templates (title, content, email, SMS)
- Visual properties (icon, color)
- Channel support flags
- Auto-read configuration

#### REQ-NOTIF-002: Notification Preferences
**Priority**: Medium
**Description**: System shall support user notification preferences.
- Global delivery method toggles (email, SMS, in-app)
- Category-specific preferences
- Quiet hours configuration
- Digest frequency: IMMEDIATE, HOURLY, DAILY, WEEKLY
- Notification type blacklist

#### REQ-NOTIF-003: Notification Delivery
**Priority**: High
**Description**: System shall deliver notifications.
- Multi-channel delivery (email, SMS, in-app)
- Template rendering
- Context data support
- Event and client association
- Action URLs
- Read status tracking
- Delivery attempt tracking
- Expiration support

#### REQ-NOTIF-004: Notification Digests
**Priority**: Low
**Description**: System shall batch notifications into digests.
- Frequency-based batching
- Notification aggregation
- Delivery tracking
- Period tracking

### 4.11 Analytics and Reporting

#### REQ-ANALYTICS-001: Booking Flow Analytics
**Priority**: Medium
**Description**: System shall track booking flow performance.
- Daily aggregation per flow
- Session counts
- Completion rates
- Abandonment tracking
- Step completion/drop-off data
- Revenue metrics
- Average booking value
- Bounce rate
- Average completion time

#### REQ-ANALYTICS-002: Event Analytics
**Priority**: Low
**Description**: System shall provide event analytics.
- Event counts by status
- Revenue tracking
- Payment status distribution
- Event type distribution
- Timeline visualization

### 4.12 Messaging and Real-Time Features

#### REQ-MSG-001: Real-Time Messaging
**Priority**: Low
**Description**: System shall support real-time messaging via WebSockets.
- Admin-client messaging
- Message history
- Read status
- Typing indicators
- Online status

#### REQ-MSG-002: WebSocket Channels
**Priority**: Low
**Description**: System shall maintain WebSocket channels.
- Per-event channels
- Per-user channels
- Channel subscriptions
- Message broadcasting

---

## 5. Non-Functional Requirements

### 5.1 Performance Requirements

#### REQ-PERF-001: API Response Time
**Priority**: High
**Requirement**:
- Typical CRUD operations: < 200ms
- Health checks: < 100ms
- Complex queries (with joins): < 500ms
- Booking flow steps: < 300ms

#### REQ-PERF-002: Database Query Optimization
**Priority**: High
**Requirement**:
- Use select_related for foreign keys
- Use prefetch_related for many-to-many
- Redis caching for frequently accessed data (5-minute TTL)
- Database indexes on frequently queried fields

#### REQ-PERF-003: Frontend Performance
**Priority**: Medium
**Requirement**:
- Bundle size: Admin CRM ~800KB, Client Portal ~600KB
- First load: < 2s on 3G
- React Query caching: 5-minute stale time
- Code splitting for large components

#### REQ-PERF-004: Caching Strategy
**Priority**: Medium
**Requirement**:
- Redis-backed caching
- Workflow progress cached per event
- Default TTL: 5 minutes
- Cache invalidation on updates

### 5.2 Security Requirements

#### REQ-SEC-001: Authentication Security
**Priority**: Critical
**Requirement**:
- JWT authentication with token rotation
- Access token lifetime: 1 hour
- Refresh token lifetime: 7 days
- Secure password storage (Django default hashers)

#### REQ-SEC-002: Data Protection
**Priority**: Critical
**Requirement**:
- HTTPS enforced in production
- CSRF protection enabled
- CORS configured per environment
- Field-level encryption for sensitive data (payment gateway configs)
- SQL injection protection via ORM
- XSS protection via React DOM escaping
- Input sanitization via DRF serializers

#### REQ-SEC-003: Payment Security
**Priority**: Critical
**Requirement**:
- PCI DSS compliance via Stripe integration
- No credit card data stored locally
- Encrypted payment gateway configurations
- Webhook signature verification
- Secure token handling

#### REQ-SEC-004: API Security
**Priority**: High
**Requirement**:
- Rate limiting on sensitive endpoints (100-2000 req/hour)
- Permission-based access control
- Request/response validation
- Security headers (X-Frame-Options, XSS Protection)

### 5.3 Reliability Requirements

#### REQ-REL-001: System Availability
**Priority**: High
**Requirement**:
- Target uptime: 99.5%
- Health check endpoints
- Database connection pooling
- Graceful degradation on service failures

#### REQ-REL-002: Data Integrity
**Priority**: Critical
**Requirement**:
- Database transactions for critical operations
- Foreign key constraints
- Data validation at model and serializer levels
- Atomic payment operations
- State machine for payment states

#### REQ-REL-003: Backup and Recovery
**Priority**: High
**Requirement**:
- Automated database backups (Railway managed)
- Point-in-time recovery capability
- Redis persistence configuration

### 5.4 Scalability Requirements

#### REQ-SCALE-001: Current Capacity
**Priority**: Medium
**Requirement**:
- Current demo setup: 50-100 concurrent users
- Production setup: 1000+ concurrent users
- Database: PostgreSQL 16+
- Gunicorn workers: CPU × 2 + 1

#### REQ-SCALE-002: Horizontal Scaling Path
**Priority**: Low
**Requirement**:
- Stateless API design
- File storage migration to S3/R2
- Redis cluster support
- Database read replicas
- Celery worker scaling

### 5.5 Usability Requirements

#### REQ-USE-001: User Interface
**Priority**: High
**Requirement**:
- Material-UI design system
- Responsive design (mobile, tablet, desktop)
- Accessibility compliance (WCAG 2.1 Level AA target)
- Consistent navigation patterns
- Error messages and validation feedback

#### REQ-USE-002: User Experience
**Priority**: Medium
**Requirement**:
- Progress indicators for multi-step flows
- Real-time form validation
- Toast notifications for user actions
- Loading states
- Optimistic UI updates

### 5.6 Maintainability Requirements

#### REQ-MAINT-001: Code Quality
**Priority**: High
**Requirement**:
- TypeScript for type safety
- ESLint for code linting
- Django system checks
- Code documentation
- Consistent naming conventions

#### REQ-MAINT-002: Testing
**Priority**: High
**Requirement**:
- Unit tests (Vitest for frontend, Django tests for backend)
- Integration tests
- Type checking (TypeScript)
- Test coverage tracking

#### REQ-MAINT-003: Logging
**Priority**: Medium
**Requirement**:
- Domain-specific loggers with emoji prefixes
- Log levels: INFO, WARNING, ERROR, CRITICAL
- Specialized security log
- Structured logging format

### 5.7 Compatibility Requirements

#### REQ-COMPAT-001: Browser Support
**Priority**: High
**Requirement**:
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

#### REQ-COMPAT-002: Device Support
**Priority**: Medium
**Requirement**:
- Desktop (1920x1080 and above)
- Tablet (768x1024 and above)
- Mobile (375x667 and above)
- Touch and mouse input support

---

## 6. Domain Models and Data Requirements

### 6.1 User Management Domain

#### User Model
**Purpose**: Core user authentication and profile
**Key Fields**:
- `email` (unique identifier)
- `first_name`, `last_name`
- `role` (CLIENT, ADMIN)
- `is_active`, `is_staff`, `is_superuser`
- `date_joined`, `last_login`

**Relationships**:
- One-to-one: UserProfile
- One-to-many: Events, Payments, Quotes, Contracts, Notifications

#### UserProfile Model
**Purpose**: Extended user information
**Key Fields**:
- `phone`, `company`
- `display_timezone` (default: Asia/Manila)
- `timezone_display_mode` (business_only, business_with_local, dual_display)

#### AdminInvitation Model
**Purpose**: Invite new admins or upgrade clients
**Key Fields**:
- `id` (UUID)
- `email`, `first_name`, `last_name`
- `invited_by` (User FK)
- `user` (User FK, for upgrades)
- `is_accepted`, `is_upgrade`
- `expires_at` (7 days default)

#### PasswordResetToken Model
**Purpose**: Secure password recovery
**Key Fields**:
- `id` (UUID)
- `user` (User FK)
- `is_used`
- `expires_at` (1 hour)

**Validation**:
- Token expiration checking
- Single-use enforcement

### 6.2 Event Management Domain

#### EventType Model
**Purpose**: Categorize events
**Key Fields**:
- `name`, `description`
- `is_active`

#### Event Model
**Purpose**: Core event entity
**Key Fields**:
- `client` (User FK)
- `event_type` (EventType FK)
- `status` (LEAD, CONFIRMED, COMPLETED, CANCELLED)
- `completion_type` (payment, quote)
- `name`, `start_date`, `end_date`
- `workflow_template` (WorkflowTemplate FK)
- `current_stage` (WorkflowStage FK)
- `payment_status` (UNPAID, PARTIALLY_PAID, PAID)
- `total_amount_due`, `total_amount_paid`
- `preferences` (JSON)

**Relationships**:
- Many-to-many: ProductOptions (via EventProductOption)
- One-to-many: Payments, Invoices, Quotes, Contracts, Tasks, Files, Feedback, Timeline

**Computed Properties**:
- `workflow_progress` (cached in Redis)
- `next_task`
- `computed_total_amount_due` (from invoices)
- `computed_total_amount_paid` (from payments)

**Business Logic**:
- `update_payment_status()` - Recalculate payment status from invoices and payments

#### EventProductOption Model
**Purpose**: Link products to events with pricing
**Key Fields**:
- `event` (Event FK)
- `product_option` (ProductOption FK)
- `quantity`
- `final_price`
- `num_participants`, `num_nights`, `excess_hours`

#### EventTask Model
**Purpose**: Task management for events
**Key Fields**:
- `event` (Event FK)
- `title`, `description`
- `due_date`, `priority` (LOW, MEDIUM, HIGH, URGENT)
- `status` (PENDING, IN_PROGRESS, COMPLETED, BLOCKED, CANCELLED)
- `assigned_to` (User FK)
- `workflow_stage` (WorkflowStage FK)
- `completed_at`, `completed_by`
- `is_visible_to_client`, `requires_client_input`

**Relationships**:
- Many-to-many: Self (dependencies)

#### EventTimeline Model
**Purpose**: Audit trail for events
**Key Fields**:
- `event` (Event FK)
- `action_type` (STATUS_CHANGE, PAYMENT_RECEIVED, CONTRACT_SIGNED, etc.)
- `description`
- `actor` (User FK)
- `action_data` (JSON)
- `is_public`

#### EventFile Model
**Purpose**: File attachments for events
**Key Fields**:
- `event` (Event FK)
- `category` (CONTRACT, QUOTE, PAYMENT, REQUIREMENTS, PHOTO, OTHER)
- `file` (FileField)
- `name`, `description`
- `mime_type`, `size`
- `uploaded_by` (User FK)
- `version`
- `is_public`

#### EventFeedback Model
**Purpose**: Post-event feedback
**Key Fields**:
- `event` (Event FK)
- `submitted_by` (User FK)
- `overall_rating` (1-5)
- `categories` (JSON for category-specific ratings)
- `comments`, `testimonial`
- `is_public`
- `response`, `response_by`

**Constraints**:
- One feedback per user per event

### 6.3 Booking Flow Domain

#### BookingFlow Model
**Purpose**: Configure booking experience
**Key Fields**:
- `name`, `description`
- `event_type` (EventType FK, nullable for "Any Event Type")
- `workflow_template` (WorkflowTemplate FK)
- `confirmation_email_template`, `reminder_email_template` (CommunicationTemplate FK)
- `is_active`
- `allow_guest_booking`, `require_account_creation`
- `auto_approve_bookings`, `enable_progress_saving`
- `max_advance_booking_days`, `min_advance_booking_days`
- `allow_discounts`
- `require_immediate_payment`
- `redirect_url`, `success_message`
- `is_test_mode`, `conversion_tracking_code`

**Relationships**:
- Many-to-many: Discounts, PaymentGateways
- One-to-many: BookingFlowSteps, BookingSessions

**Validation**:
- One active flow per event type

#### BookingFlowStep Model
**Purpose**: Individual steps in booking flow
**Key Fields**:
- `booking_flow` (BookingFlow FK)
- `step_type` (introduction, date_time, questionnaire, package_selection, addon_selection, pricing_summary, contact_info, payment_info, confirmation)
- `name`, `description`, `order`
- `is_enabled`, `is_required`, `is_skippable`
- `display_conditions` (JSON)
- `configuration` (JSON)
- `validation_rules` (JSON)

**Constraints**:
- Unique ordering per booking flow
- One step type per booking flow

**Step Configurations** (One-to-One relationships):
- IntroductionStepConfiguration
- DateTimeStepConfiguration (with availability checking)
- QuestionnaireStepConfiguration
- PackageSelectionStepConfiguration
- AddonSelectionStepConfiguration
- PricingSummaryStepConfiguration
- ContactInfoStepConfiguration
- PaymentInfoStepConfiguration
- ConfirmationStepConfiguration

#### BookingSession Model
**Purpose**: Track booking progress
**Key Fields**:
- `session_id` (UUID)
- `booking_flow` (BookingFlow FK)
- `client` (User FK, nullable)
- `current_step` (BookingFlowStep FK)
- `booking_data` (JSON - all form data)
- `validation_errors` (JSON)
- `ip_address`, `user_agent`, `referrer_url`
- `is_completed`, `is_abandoned`
- `completed_at`, `expires_at`
- `created_event` (Event FK)

**Relationships**:
- Many-to-many: completed_steps

**Computed Properties**:
- `progress_percentage`

**Business Logic**:
- `calculate_total_price()` - Using centralized PricingCalculationService
- `mark_step_completed()` - Progress to next step

#### BookingFlowAnalytics Model
**Purpose**: Track conversion metrics
**Key Fields**:
- `booking_flow` (BookingFlow FK)
- `date`
- `total_sessions`, `completed_bookings`, `abandoned_sessions`
- `conversion_rate`
- `step_completion_data`, `step_drop_off_data` (JSON)
- `total_revenue`, `average_booking_value`
- `average_completion_time`, `bounce_rate`

**Constraints**:
- One record per flow per date

### 6.4 Payment Domain

#### PaymentSettings Model (Singleton)
**Purpose**: Global payment configuration
**Key Fields**:
- `balance_due_days` (default: 30)
- `grace_period_days` (default: 7)
- `default_installments` (default: 2)
- `default_installment_frequency` (WEEKLY, BIWEEKLY, MONTHLY)
- `late_fee_enabled`, `default_late_fee_amount`
- `default_deposit_percentage` (default: 50%)
- `default_currency` (default: PHP)
- `auto_payment_retry_attempts`, `auto_payment_retry_delay_days`
- `allow_refunds`, `refund_deadline_hours`, `refund_percentage`
- `refund_policy_text`

**Relationships**:
- Many-to-many: default_payment_gateways
- Foreign Key: primary_payment_gateway

#### PaymentGateway Model
**Purpose**: Payment provider configuration
**Key Fields**:
- `name`, `code` (unique)
- `is_active`
- `config` (EncryptedJSONField - API keys, secrets)
- `description`

**Security**:
- Encrypted configuration storage
- Config validation by gateway type (Stripe, PayPal, Square)

#### Payment Model
**Purpose**: Payment records
**Key Fields**:
- `payment_number` (unique, auto-generated atomically)
- `event` (Event FK)
- `amount`, `currency` (default: PHP)
- `status` (CREATED, PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED)
- `due_date`, `paid_on`
- `payment_method` (PaymentMethod FK)
- `description`, `notes`, `reference_number`
- `is_manual`, `processed_by`
- `receipt_number`, `receipt_generated_on`, `receipt_sent`, `receipt_sent_on`
- `receipt_pdf` (FileField)
- `quote` (EventQuote FK), `invoice` (Invoice FK), `installment` (PaymentInstallment FK)

**Business Logic**:
- `complete_payment()` - Mark completed, generate receipt, send notification, update event status, trigger workflow
- State machine integration with transition methods
- Atomic state transitions with audit trail

**Relationships**:
- One-to-many: Transactions, Refunds, Notifications

#### PaymentMethod Model
**Purpose**: Saved payment methods for clients
**Key Fields**:
- `user` (User FK)
- `type` (CREDIT_CARD, BANK_TRANSFER, CHECK, CASH, DIGITAL_WALLET)
- `is_default`
- `nickname`, `instructions`
- `gateway` (PaymentGateway FK)
- `token_reference`, `last_four`, `expiry_date`
- `metadata` (JSON)

**Business Logic**:
- Auto-unset other defaults when marking as default

#### PaymentTransaction Model
**Purpose**: Gateway transaction records
**Key Fields**:
- `payment` (Payment FK)
- `gateway` (PaymentGateway FK)
- `transaction_id`, `amount`, `currency`
- `status` (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)
- `response_data` (JSON)
- `error_message`, `is_test`

**Business Logic**:
- Auto-update payment status on transaction completion

#### PaymentPlan Model
**Purpose**: Installment payment management
**Key Fields**:
- `event` (Event FK, one-to-one)
- `total_amount`, `down_payment_amount`, `currency`
- `down_payment_due_date`
- `number_of_installments`, `frequency` (WEEKLY, BIWEEKLY, MONTHLY)
- `notes`
- `quote` (EventQuote FK)
- `status` (PENDING, ACTIVE, COMPLETED, SUSPENDED, DEFAULTED, CANCELLED)
- `next_payment_date`, `final_payment_date`
- `grace_period_days` (default: 7)
- `terms_accepted`, `terms_accepted_at`, `terms_accepted_ip`
- `auto_payment_enabled`, `auto_payment_method` (PaymentMethod FK)
- `created_from_booking_session` (BookingSession FK)

**Computed Properties**:
- `paid_amount` - Sum of completed payments
- `remaining_balance` - total_amount - paid_amount
- `is_overdue` - Check for overdue installments
- `completion_percentage`

**Business Logic**:
- `create_installments()` - Auto-generate installments on creation
- `update_next_payment_date()` - Update from pending installments
- `update_status()` - Recalculate status from installments

#### PaymentInstallment Model
**Purpose**: Individual installment in payment plan
**Key Fields**:
- `payment_plan` (PaymentPlan FK)
- `amount`, `due_date`
- `status` (PENDING, PAID, OVERDUE, PARTIAL, WAIVED, CANCELLED)
- `installment_number`, `description`
- `last_reminder_sent`, `reminder_count`
- `late_fee_amount`, `late_fee_applied_date`

**Computed Properties**:
- `paid_amount` - From related payment
- `remaining_amount` - amount + late_fee - paid_amount
- `is_fully_paid`
- `days_overdue_count`

**Business Logic**:
- `check_status()` - Auto-mark overdue
- `create_payment()` - Generate payment record
- `apply_late_fee()` - One-time late fee application
- `mark_as_paid()` - Update status and parent plan
- `send_reminder()` - Track reminder sends

#### Invoice Model
**Purpose**: Client invoices
**Key Fields**:
- `invoice_id` (unique)
- `event` (Event FK), `client` (User FK)
- `subtotal`, `tax_amount`, `total_amount`, `currency`
- `issue_date`, `due_date`
- `status` (DRAFT, ISSUED, PARTIALLY_PAID, PAID, VOID, CANCELLED)
- `notes`, `payment_terms`
- `quote` (EventQuote FK)
- `invoice_pdf` (FileField)

**Computed Properties**:
- `paid_amount` - Sum from related payments
- `remaining_amount` - total - paid
- `is_fully_paid`, `is_partially_paid`

**Business Logic**:
- `mark_as_paid()` - Intelligent status update based on actual payments
- `issue()` - Mark as issued, send notification, update timeline

**Relationships**:
- One-to-many: InvoiceLineItems, InvoiceTaxes, Related Payments

#### InvoiceLineItem Model
**Purpose**: Invoice line items with pricing details
**Key Fields**:
- `invoice` (Invoice FK)
- `description`, `quantity`, `unit_price`, `tax_rate`, `total`
- `product` (ProductOption FK)
- `notes`
- `item_type` (PACKAGE, ADDON)
- `base_unit_price`, `excess_hours`, `excess_hour_price`, `excess_cost`

**Business Logic**:
- Auto-calculate total on save
- Preserve pricing details for audit trail

#### Refund Model
**Purpose**: Refund processing
**Key Fields**:
- `payment` (Payment FK)
- `amount`, `currency`, `reason`
- `status` (PENDING, PROCESSING, COMPLETED, FAILED, REJECTED)
- `refunded_by` (User FK)
- `refund_transaction_id`
- `gateway_response` (JSON)

**Business Logic**:
- Update timeline on completion

#### TaxRate Model
**Purpose**: Tax configuration
**Key Fields**:
- `name`, `rate`, `region`
- `is_default`

**Business Logic**:
- Auto-unset other defaults when marking as default

#### PaymentNotification Model
**Purpose**: Payment-related notification tracking
**Key Fields**:
- `payment` (Payment FK)
- `notification_type` (INVOICE_ISSUED, PAYMENT_REMINDER, PAYMENT_RECEIVED, PAYMENT_OVERDUE, RECEIPT_SENT)
- `sent_at`, `sent_to`
- `template_used` (CommunicationTemplate FK)
- `is_successful`, `reference`

#### PaymentStateHistory Model
**Purpose**: Audit trail for payment state transitions
**Key Fields**:
- `payment` (Payment FK)
- `from_state`, `to_state`, `reason`
- `triggered_by`, `metadata` (JSON)
- `timestamp`

#### PaymentEventStore Model
**Purpose**: Event sourcing for payment domain events
**Key Fields**:
- `event_id` (unique), `event_type`
- `payment` (Payment FK), `payment_number`
- `event_data` (JSON)
- `from_state`, `to_state`, `transition_reason`, `triggered_by`
- `processed`, `processing_started_at`, `processing_completed_at`
- `external_system_refs` (JSON)
- `processing_errors` (JSON), `retry_count`

**Business Logic**:
- `mark_processing_started()`, `mark_processing_completed()`
- `add_processing_error()`, `can_retry()`

#### PaymentWebhookLog Model
**Purpose**: Webhook event logging
**Key Fields**:
- `gateway_code`, `event_type`, `event_id` (unique)
- `transaction_id`
- `raw_data` (JSON)
- `received_at`, `processed_at`, `processed_successfully`
- `action_taken`, `error_message`, `retry_count`

**Business Logic**:
- `mark_processed()`, `increment_retry()`

### 6.5 Sales Domain

#### EventQuote Model
**Purpose**: Quote/proposal generation
**Key Fields**:
- `event` (Event FK)
- `template` (QuoteTemplate FK)
- `version` (sequential)
- `status` (DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED)
- `subtotal`, `tax_amount`, `discount_amount`, `total_amount`
- `valid_until`
- `sent_at`, `accepted_at`, `rejected_at`, `rejection_reason`
- `notes`, `terms_and_conditions`, `client_message`
- `signature_data`
- `created_by` (User FK)
- `pdf_file` (FileField)
- `discount` (Discount FK)

**Business Logic**:
- `accept()` - Mark accepted, update event status, create activity
- `reject()` - Mark rejected with reason, create activity
- `send_to_client()` - Mark sent, send email, trigger workflow, create reminder
- `create_next_version()` - Clone quote with incremented version

**Relationships**:
- One-to-many: QuoteLineItems, QuoteOptions, QuoteActivities, QuoteReminders

**Constraints**:
- Unique version per event

#### QuoteTemplate Model
**Purpose**: Reusable quote templates
**Key Fields**:
- `name`, `introduction`
- `event_type` (EventType FK)
- `terms_and_conditions`
- `is_active`, `default_validity_days` (default: 30)
- `has_multiple_options`
- `default_tax_rate` (TaxRate FK)
- `workflow_template` (WorkflowTemplate FK)

**Relationships**:
- Many-to-many: ProductOptions (via QuoteTemplateProduct), ContractTemplates, Questionnaires

**Business Logic**:
- `apply_to_event()` - Create quote from template

#### QuoteLineItem Model
**Purpose**: Quote line items
**Key Fields**:
- `quote` (EventQuote FK)
- `description`, `quantity`, `unit_price`, `tax_rate`, `total`
- `product` (ProductOption FK), `notes`
- `item_type` (PACKAGE, ADDON)
- `base_unit_price`, `excess_hours`, `excess_hour_price`, `excess_cost`

**Business Logic**:
- Auto-calculate total on save
- Quote totals assigned from PricingCalculationService (DRY)

#### QuoteOption Model
**Purpose**: Multiple pricing options in quote
**Key Fields**:
- `quote` (EventQuote FK)
- `name`, `description`, `total_price`
- `is_selected`

**Business Logic**:
- `calculate_total()` - Sum from option items

#### QuoteActivity Model
**Purpose**: Quote activity tracking
**Key Fields**:
- `quote` (EventQuote FK)
- `action` (CREATED, UPDATED, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED, REMINDER_SENT)
- `action_by` (User FK), `notes`

#### QuoteReminder Model
**Purpose**: Scheduled quote reminders
**Key Fields**:
- `quote` (EventQuote FK)
- `scheduled_date`, `is_sent`, `sent_at`, `message`

### 6.6 Product Domain

#### ProductCategory Model
**Purpose**: Product organization
**Key Fields**:
- `name` (unique), `description`, `slug` (unique)
- `parent` (Self FK - hierarchical)
- `is_active`, `sort_order`
- `requires_venue`, `typical_duration_hours`

**Computed Properties**:
- `full_path` - Hierarchical path
- `level` - Nesting level

**Business Logic**:
- Auto-generate unique slugs

#### ProductOption Model
**Purpose**: Products and packages
**Key Fields**:
- `name`, `description`, `category` (ProductCategory FK)
- `pricing_model` (FIXED, HOURLY, TIERED, CUSTOM)
- `base_price`, `currency` (default: PHP), `tax_rate` (default: 12%)
- `type` (PRODUCT, PACKAGE)
- `is_active`, `is_featured`, `allow_multiple`, `requires_approval`
- `has_excess_hours`, `included_hours`, `excess_hour_price`
- `minimum_hours`, `maximum_hours`
- `advance_booking_days`, `maximum_booking_days`
- `minimum_guests`, `maximum_guests`, `recommended_guests`
- `sku` (unique), `sort_order`
- `event_type` (EventType FK)

**Computed Properties**:
- `formatted_price`
- `price_with_tax`

**Constraints**:
- Unique name per category

#### Discount Model
**Purpose**: Promotional discounts
**Key Fields**:
- `name`, `code` (unique), `description`, `currency`
- `discount_type` (PERCENTAGE, FIXED, FIXED_AMOUNT)
- `application_type` (AUTOMATIC, CODE_REQUIRED, ADMIN_ONLY)
- `value`
- `is_active`, `valid_from`, `valid_until`
- `max_uses`, `max_uses_per_client`, `current_uses`
- `minimum_order_amount`, `minimum_hours`

**Relationships**:
- Many-to-many: applicable_products, applicable_categories

**Business Logic**:
- `is_valid()` - Check activation status and dates
- `can_be_used_by_client()` - Check usage limits and minimums

### 6.7 Contract Domain

#### ContractTemplate Model
**Purpose**: Reusable contract templates
**Key Fields**:
- `name`, `description`
- `event_type` (EventType FK)
- `content` (template text)
- `variables` (JSON - variable definitions)
- `requires_signature`
- `sections` (JSON - structure)
- `signature_requirements` (JSON - required roles)
- `requires_witness`, `requires_company_signature`
- `allows_amendments`, `amendment_requires_signature`

**Business Logic**:
- `get_sections()` - Parse section structure
- `get_signature_requirements()` - Determine required signatures

#### EventContract Model
**Purpose**: Event-specific contracts
**Key Fields**:
- `event` (Event FK)
- `template` (ContractTemplate FK)
- `status` (DRAFT, SENT, PARTIALLY_SIGNED, SIGNED, EXPIRED, VOID, AMENDED)
- `content` (rendered contract)
- `sent_at`, `fully_signed_at`, `valid_until`
- `contract_value`, `payment_schedule_reference`, `currency`
- Legacy signature fields (deprecated in favor of ContractSignature)
- `is_amendment`, `original_contract` (Self FK), `amendment_number`

**Business Logic**:
- `is_fully_signed()` - Check all required signatures present
- `get_missing_signatures()` - List missing signature roles
- `update_status_based_on_signatures()` - Auto-update status and trigger workflow
- `can_be_amended()` - Check if amendable

**Relationships**:
- One-to-many: ContractSignatures, ContractDocuments, ContractNotes, Amendments

**Constraints**:
- Unique amendment number per event

#### ContractSignature Model
**Purpose**: Multi-party electronic signatures
**Key Fields**:
- `contract` (EventContract FK)
- `signer` (User FK)
- `role` (CLIENT, WITNESS, COMPANY_REP, GUARDIAN, PARTNER, OTHER)
- `signature_data` (base64 encoded)
- `signed_at`, `ip_address`, `user_agent`
- `signer_name`, `signer_title`, `signer_email`
- `is_verified`, `verification_method`
- `device_fingerprint`, `signature_metadata` (JSON)
- `signature_confidence_score`
- `legal_disclosure_accepted`, `electronic_consent_timestamp`, `signature_intent_confirmed`

**Business Logic**:
- Auto-update contract status on save

**Constraints**:
- One signature per role per contract

#### ContractAmendment Model
**Purpose**: Track contract modifications
**Key Fields**:
- `original_contract` (EventContract FK)
- `amendment_contract` (EventContract FK, one-to-one)
- `amendment_reason`, `changes_description`
- `section_changes` (JSON)
- `status` (REQUESTED, DRAFT, SENT_FOR_REVIEW, APPROVED, SIGNED, REJECTED, CANCELLED)
- `original_value`, `new_value`, `value_change`
- `requested_by`, `requested_at`, `reviewed_by`, `reviewed_at`, `review_notes`
- `requires_new_signatures`, `signature_deadline`

**Business Logic**:
- `calculate_value_change()` - Compute value delta

#### ContractDocument Model
**Purpose**: Attachments to contracts
**Key Fields**:
- `contract` (EventContract FK)
- `name`, `description`
- `document_type` (ATTACHMENT, ADDENDUM, SCHEDULE, TERMS, WAIVER, OTHER)
- `file` (FileField)
- `version`, `is_active`
- `uploaded_by` (User FK)

**Constraints**:
- Unique name and version per contract

#### ContractNote Model
**Purpose**: Internal contract notes
**Key Fields**:
- `contract` (EventContract FK)
- `note`, `is_internal`
- `created_by` (User FK)
- `category` (GENERAL, LEGAL, NEGOTIATION, AMENDMENT, ISSUE, REMINDER)

### 6.8 Workflow Domain

#### WorkflowTemplate Model
**Purpose**: Define workflow processes
**Key Fields**:
- `name`, `description`
- `event_type` (EventType FK)
- `is_active`

**Relationships**:
- One-to-many: WorkflowStages

#### WorkflowStage Model
**Purpose**: Individual workflow steps
**Key Fields**:
- `template` (WorkflowTemplate FK)
- `name`, `stage` (LEAD, PRODUCTION, POST_PRODUCTION)
- `order`
- `is_automated`, `automation_type` (EMAIL, TASK, QUOTE, CONTRACT, REMINDER, NOTIFICATION)
- `trigger_time` (ON_CREATION, AFTER_X_DAYS, etc.)
- `email_template` (CommunicationTemplate FK)
- `task_description`
- `progression_condition` (QUOTE_ACCEPTED, PAYMENT_RECEIVED, CONTRACT_SIGNED, etc.)
- `required_tasks_completed`
- Trigger flags: `trigger_on_payment_received`, `trigger_on_quote_accepted`, `trigger_on_contract_signed`, `trigger_on_event_created`, `trigger_on_quote_sent`
- `metadata` (JSON - automation configuration)

**Business Logic**:
- `check_advancement_criteria()` - Validate progression conditions
- `apply_to_event()` - Apply stage to event with validation (prevent backwards movement)
- `_execute_automation()` - Execute configured automation (email, task, contract, notification)

**Constraints**:
- Unique stage order per template and stage category

#### WorkflowTrigger Model
**Purpose**: Track workflow events
**Key Fields**:
- `event` (Event FK)
- `stage` (WorkflowStage FK)
- `trigger_type` (PAYMENT_RECEIVED, QUOTE_ACCEPTED, CONTRACT_SIGNED, EVENT_CREATED, etc.)
- `details`, `result_data` (JSON)
- `processed`, `processed_at`

### 6.9 Communication Domain

#### CommunicationTemplate Model
**Purpose**: Email/SMS templates
**Key Fields**:
- `name` (unique)
- `channel` (EMAIL, SMS)
- `category` (SYSTEM, MANUAL, AUTO)
- `subject_template` (email only)
- `body_template`
- `is_system`
- `variables_schema` (JSON - expected variables)

#### CommunicationRecord Model
**Purpose**: Communication history
**Key Fields**:
- `id` (UUID)
- `template_name`, `channel`, `category`
- `recipient`, `subject`, `body`
- `client` (User FK), `sent_by` (User FK)
- `external_message_id`
- `delivery_status` (PENDING, SENT, DELIVERED, FAILED, BOUNCED)
- `sent_at`, `delivered_at`, `opened_at`, `is_opened`
- `context_data` (JSON)

### 6.10 Notification Domain

#### NotificationType Model
**Purpose**: Define notification types
**Key Fields**:
- `code` (unique), `name`, `description`
- `category` (SYSTEM, EVENT, TASK, PAYMENT, CLIENT, CONTRACT, WORKFLOW, COMMUNICATION)
- `icon`, `color`, `priority` (LOW, NORMAL, HIGH, URGENT)
- `default_title_template`, `default_content_template`
- `default_email_template`, `default_sms_template`
- `is_active`, `is_system`
- `supports_email`, `supports_sms`
- `auto_read_after_days`

#### NotificationPreference Model
**Purpose**: User notification settings
**Key Fields**:
- `user` (User FK, one-to-one)
- Global toggles: `email_enabled`, `sms_enabled`, `in_app_enabled`
- Category-specific preferences (e.g., `system_email`, `event_sms`, `payment_in_app`)
- `quiet_hours_enabled`, `quiet_hours_start`, `quiet_hours_end`
- `digest_frequency` (IMMEDIATE, HOURLY, DAILY, WEEKLY)

**Relationships**:
- Many-to-many: disabled_types (NotificationType)

**Business Logic**:
- `is_delivery_method_enabled()` - Check category preferences
- `is_notification_enabled()` - Check specific notification and method

#### Notification Model
**Purpose**: Individual notifications
**Key Fields**:
- `recipient` (User FK)
- `notification_type` (NotificationType FK)
- `title`, `content`, `action_url`
- `context_data` (JSON)
- `event` (Event FK), `client` (User FK)
- `is_read`, `read_at`
- `delivered_via` (JSON - list of methods)
- `delivery_attempts` (JSON)
- `expires_at`, `is_expired`

**Business Logic**:
- `mark_as_read()` - Update read status and timestamp
- `is_delivery_successful()` - Check method delivery
- `add_delivery_method()` - Record delivery attempt

#### NotificationDigest Model
**Purpose**: Batched notifications
**Key Fields**:
- `user` (User FK)
- `frequency` (HOURLY, DAILY, WEEKLY)
- `period_start`, `period_end`
- `notification_count`
- `is_sent`, `sent_at`
- `delivery_methods` (JSON)

**Relationships**:
- Many-to-many: notifications

**Constraints**:
- Unique user, frequency, and period_start

### 6.11 Questionnaire Domain

#### Questionnaire Model
**Purpose**: Dynamic form builder
**Key Fields**:
- `name`, `description`
- `is_active`, `event_type` (EventType FK)

**Relationships**:
- One-to-many: Questions

#### Question Model
**Purpose**: Individual form questions
**Key Fields**:
- `questionnaire` (Questionnaire FK)
- `question_text`
- `question_type` (TEXT, NUMBER, DATE, CHOICE, MULTIPLE_CHOICE, FILE)
- `is_required`, `order`
- `validation_rules` (JSON)
- `options` (JSON - for choice questions)

### 6.12 Analytics Domain

#### BookingFlowAnalytics Model
(Covered in Booking Flow Domain section above)

### 6.13 Messaging Domain

#### Channel Model
**Purpose**: WebSocket message channels
**Key Fields**:
- `name` (unique)
- `channel_type` (EVENT, USER, BROADCAST)
- `event` (Event FK, nullable)
- `is_active`

**Relationships**:
- Many-to-many: participants (User)

#### Message Model
**Purpose**: Chat messages
**Key Fields**:
- `channel` (Channel FK)
- `sender` (User FK)
- `content`, `message_type` (TEXT, FILE, SYSTEM)
- `is_read`, `read_at`
- `file` (FileField, optional)

### 6.14 Notes Domain

#### Note Model
**Purpose**: Internal notes on any entity
**Key Fields**:
- `content_type` (ContentType FK - generic relation)
- `object_id`
- `note`, `created_by` (User FK)
- `is_pinned`, `is_internal`
- `category` (GENERAL, IMPORTANT, FOLLOW_UP)

**Note**: Uses Django's ContentType framework for polymorphic relationships

### 6.15 Settings Domain

#### CurrencySettings Model
**Purpose**: Currency display and formatting
**Key Fields**:
- `user` (User FK, nullable - system vs user-specific)
- `currency_code` (default: PHP)
- `display_format` (SYMBOL_BEFORE, SYMBOL_AFTER, CODE_BEFORE, CODE_AFTER)
- `decimal_places` (default: 2)
- `thousand_separator`, `decimal_separator`

**Business Logic**:
- `get_system_settings()` - Singleton system settings
- `get_user_settings()` - User-specific or fallback to system
- `format_amount()` - Centralized currency formatting

---

## 7. External Interfaces

### 7.1 User Interfaces

#### 7.1.1 Admin CRM Interface
**Technology**: React 19.1.0 + TypeScript + Material-UI 7.1.1
**Features**:
- Dashboard with event and revenue analytics
- Event management (list, detail, create, edit)
- Client management and profiles
- Quote creation and management
- Invoice generation
- Contract template management
- Payment tracking and processing
- Workflow template configuration
- Booking flow builder
- Product and package management
- Communication template management
- Settings and configuration
- Analytics and reports
- Real-time notifications

**Key Pages**:
- `/` - Dashboard
- `/events` - Events list
- `/events/:id` - Event detail
- `/clients` - Client management
- `/clients/:id` - Client profile
- `/sales/quotes` - Quote management
- `/payments` - Payment tracking
- `/contracts` - Contract management
- `/workflows` - Workflow automation
- `/settings` - System configuration
- `/analytics` - Reports and analytics

#### 7.1.2 Client Portal Interface
**Technology**: React 19.1.0 + TypeScript + Material-UI 7.1.1
**Features**:
- Home page with venue information
- Multi-step booking flow
- Event information viewing
- Invoice and payment portal
- Contract signing
- Real-time chat with staff
- Notification center
- Profile management

**Key Pages**:
- `/` - Home/Welcome
- `/booking/:flow_id` - Multi-step booking
- `/events` - My events
- `/payments` - Financial portal (invoices, payments)
- `/contracts/:id` - Contract signing
- `/messages` - Chat with staff
- `/records` - Event records
- `/about` - About venue

### 7.2 API Interfaces

#### 7.2.1 RESTful API
**Base URL**: `/api/`
**Authentication**: JWT Bearer tokens
**Format**: JSON
**Pagination**: 25 items per page (configurable)

**Core Endpoints**:
- `/api/users/` - User management
- `/api/auth/login/` - Authentication
- `/api/auth/refresh/` - Token refresh
- `/api/events/` - Event CRUD
- `/api/payments/invoices/` - Invoice management
- `/api/payments/payments/` - Payment processing
- `/api/payments/payment-plans/` - Payment plan management
- `/api/sales/quotes/` - Quote management
- `/api/contracts/` - Contract management
- `/api/contracts/signatures/` - Signature endpoints
- `/api/bookingflow/flows/` - Booking flow configuration
- `/api/bookingflow/sessions/` - Booking session management
- `/api/products/` - Product catalog
- `/api/products/discounts/` - Discount management
- `/api/workflows/templates/` - Workflow templates
- `/api/communications/templates/` - Communication templates
- `/api/notifications/` - Notification management
- `/api/analytics/` - Analytics data

**HTTP Methods**: GET, POST, PUT, PATCH, DELETE
**Status Codes**:
- 200 OK
- 201 Created
- 204 No Content
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Internal Server Error

**Rate Limiting**: 100-2000 requests/hour (varies by endpoint)

#### 7.2.2 WebSocket API
**Protocol**: WebSocket (Django Channels)
**Base URL**: `wss://api-url/ws/`
**Authentication**: JWT token in connection params

**Channels**:
- `/ws/events/{event_id}/` - Event-specific channel
- `/ws/users/{user_id}/` - User-specific channel
- `/ws/notifications/` - Notification stream

**Message Format**:
```json
{
  "type": "message_type",
  "data": {},
  "timestamp": "ISO-8601"
}
```

### 7.3 External Service Interfaces

#### 7.3.1 Stripe Payment API
**Purpose**: Payment processing
**Integration**: Stripe SDK 12.2.0
**API Version**: Latest

**Features Used**:
- Payment Intents
- Customer management
- Payment Methods
- Webhooks (charge.succeeded, payment_intent.succeeded, etc.)
- Refunds

**Credentials**:
- Publishable Key (frontend)
- Secret Key (backend, encrypted)
- Webhook Secret (backend)

#### 7.3.2 Brevo Email/SMS API
**Purpose**: Transactional email and SMS
**Integration**: REST API

**Features Used**:
- Send transactional email
- Send transactional SMS
- Template management
- Webhook events (delivered, bounced, opened)

**Credentials**:
- API Key (backend, encrypted)
- Webhook Secret (backend)

**Endpoints**:
- `POST /v3/smtp/email` - Send email
- `POST /v3/transactionalSMS/sms` - Send SMS

#### 7.3.3 Sentry Error Tracking
**Purpose**: Error monitoring and logging
**Integration**: Sentry SDK

**Features**:
- Exception tracking
- Performance monitoring
- Release tracking

**Credentials**:
- DSN (Data Source Name)

### 7.4 Database Interface

**Database**: PostgreSQL 16+
**ORM**: Django ORM
**Connection**: psycopg2

**Connection Pooling**: Enabled
**Max Connections**: Managed by Railway
**SSL**: Required in production

**Backup**: Automated by Railway
**Migrations**: Django migrations system

### 7.5 Cache Interface

**Cache**: Redis (latest)
**Purpose**: Session cache, Celery broker/backend, query caching

**Database Separation**:
- DB 0: Django cache (default)
- DB 1: Celery broker
- DB 2: Celery results
- DB 3: Django Channels (WebSocket)
- DB 4: Sessions cache
- DB 5: Analytics cache

**Persistence**: Configured for durability
**Eviction**: LRU with TTL

---

## 8. System Features

### 8.1 Multi-Step Configurable Booking Flow
**Priority**: Critical
**Description**: Fully configurable booking experience with 9 step types, conditional visibility, progress saving, real-time availability checking, dynamic pricing, and session management.

**Functional Requirements**: REQ-BOOK-001 through REQ-BOOK-008

**Business Rules**:
- One active booking flow per event type
- Sessions expire after configured period
- Pricing calculated via centralized service
- Automatic event creation on completion
- Workflow trigger on booking completion

### 8.2 Event Lifecycle Management
**Priority**: Critical
**Description**: Complete event tracking from lead through completion with status management, task assignment, timeline, file attachments, and feedback collection.

**Functional Requirements**: REQ-EVENT-001 through REQ-EVENT-007

**Business Rules**:
- Event statuses progress: LEAD → CONFIRMED → COMPLETED/CANCELLED
- Payment status auto-updates from invoices and payments
- Workflow stages track progress
- Timeline records all significant actions

### 8.3 Comprehensive Payment Processing
**Priority**: Critical
**Description**: Full-featured payment system with multiple gateways, payment plans, installments, invoices, receipts, refunds, and state machine-based tracking.

**Functional Requirements**: REQ-PAY-001 through REQ-PAY-008

**Business Rules**:
- Atomic payment number generation
- State machine enforces valid transitions
- Auto-generate receipts on completion
- Support full payment, deposit, and payment plans
- Late fees applied after grace period
- Payment completion triggers workflow

### 8.4 Quote and Sales Management
**Priority**: High
**Description**: Template-based quote generation with versioning, acceptance/rejection workflow, PDF generation, and activity tracking.

**Functional Requirements**: REQ-QUOTE-001 through REQ-QUOTE-005

**Business Rules**:
- Quote acceptance triggers event confirmation
- Quote versioning for revisions
- Automatic reminder creation on send
- Quote sent triggers workflow progression
- Pricing uses centralized calculation service

### 8.5 Contract Generation and E-Signature
**Priority**: Critical
**Description**: Template-based contract generation with multi-party electronic signatures, amendment support, and legal compliance tracking.

**Functional Requirements**: REQ-CONTRACT-001 through REQ-CONTRACT-005

**Business Rules**:
- One signature per role per contract
- Contract fully signed triggers workflow
- Signature metadata for legal compliance
- Amendment versioning tracked
- Support for witness and company representative signatures

### 8.6 Workflow Automation Engine
**Priority**: High
**Description**: Trigger-based workflow automation with email sending, task creation, contract generation, and notification delivery.

**Functional Requirements**: REQ-WORKFLOW-001 through REQ-WORKFLOW-005

**Business Rules**:
- Workflows progress based on triggers (payment, quote acceptance, contract signing)
- Prevent backwards stage movement
- Idempotent workflow progression
- Automated actions execute on stage application
- Task completion can gate progression

### 8.7 Product and Package Catalog
**Priority**: High
**Description**: Hierarchical product catalog with dynamic pricing, excess hours, discounts, and guest capacity constraints.

**Functional Requirements**: REQ-PROD-001 through REQ-PROD-003

**Business Rules**:
- Pricing models: FIXED, HOURLY, TIERED, CUSTOM
- Excess hours calculated for time-based products
- Discounts apply based on type and applicability
- Tax rates configurable per product

### 8.8 Multi-Channel Communication System
**Priority**: High
**Description**: Template-based email and SMS delivery with Brevo integration, delivery tracking, and open tracking.

**Functional Requirements**: REQ-COMM-001 through REQ-COMM-003

**Business Rules**:
- Templates support variable substitution
- Delivery status tracked via webhooks
- Communication records maintained for audit

### 8.9 Notification and Preference Management
**Priority**: Medium
**Description**: Multi-channel notification system with user preferences, digest batching, and delivery tracking.

**Functional Requirements**: REQ-NOTIF-001 through REQ-NOTIF-004

**Business Rules**:
- User preferences control delivery channels
- Quiet hours respected
- Digest batching for non-urgent notifications
- System notifications cannot be disabled
- Auto-read after configured days

### 8.10 Analytics and Reporting
**Priority**: Medium
**Description**: Booking flow conversion tracking, revenue reporting, and event analytics.

**Functional Requirements**: REQ-ANALYTICS-001, REQ-ANALYTICS-002

**Business Rules**:
- Daily aggregation per booking flow
- Step completion/drop-off analysis
- Revenue and conversion rate calculation
- Average booking value tracking

---

## 9. Technical Constraints

### 9.1 Technology Constraints
- **Python Version**: 3.12 required
- **Django Version**: 5.2.1
- **PostgreSQL Version**: 16+ required
- **Node.js Version**: 24.2.0 for frontend builds
- **React Version**: 19.1.0

### 9.2 Platform Constraints
- **Demo Deployment**: Railway all-in-one service with Honcho
- **Frontend Deployment**: Netlify (two separate sites)
- **Database**: Railway-managed PostgreSQL
- **Cache**: Railway-managed Redis (supports DB 0-15)
- **File Storage**: Currently local filesystem with WhiteNoise; future migration to S3/R2

### 9.3 Integration Constraints
- **Payment Processing**: Stripe API required
- **Email/SMS**: Brevo API required
- **WebSocket**: Daphne ASGI server required (not standard Django runserver)

### 9.4 Security Constraints
- **HTTPS**: Required in production
- **PCI DSS**: Compliance via Stripe
- **ESIGN Act**: Compliance for e-signatures
- **CSRF**: Protection enabled
- **CORS**: Configured per environment

### 9.5 Data Constraints
- **Payment Numbers**: Must be unique and atomic
- **Email**: Unique identifier for users
- **Session Expiration**: Configurable per booking flow
- **Token Expiration**: Password reset 1 hour, invitation 7 days

### 9.6 Performance Constraints
- **API Response**: < 200ms for typical operations
- **Database Queries**: Optimized with select_related/prefetch_related
- **Caching**: Redis with 5-minute default TTL
- **File Upload**: Max 10MB for questionnaire files

---

## 10. Appendices

### 10.1 Glossary

| Term | Definition |
|------|------------|
| **Booking Flow** | Configurable multi-step process for clients to book events |
| **Booking Session** | Individual instance of a user progressing through a booking flow |
| **Domain** | Bounded context in Domain-Driven Design; self-contained business area |
| **Event** | Core business entity representing a client event |
| **Quote** | Proposal sent to client with pricing |
| **Invoice** | Bill sent to client for payment |
| **Payment Plan** | Installment-based payment schedule |
| **Contract** | Legal agreement between company and client |
| **Workflow** | Automated process that progresses through stages |
| **Workflow Stage** | Individual step in a workflow with potential automation |
| **Product Option** | Package or add-on that can be purchased |
| **Discount** | Promotional reduction in price |
| **Communication Template** | Reusable email or SMS template |
| **Notification Type** | Categorized notification definition |
| **E-Signature** | Electronic signature with legal compliance tracking |

### 10.2 Acronyms and Abbreviations

| Acronym | Meaning |
|---------|---------|
| **API** | Application Programming Interface |
| **ASGI** | Asynchronous Server Gateway Interface |
| **CRUD** | Create, Read, Update, Delete |
| **CSRF** | Cross-Site Request Forgery |
| **CORS** | Cross-Origin Resource Sharing |
| **DDD** | Domain-Driven Design |
| **DRF** | Django REST Framework |
| **DRY** | Don't Repeat Yourself |
| **FK** | Foreign Key |
| **JWT** | JSON Web Token |
| **MUI** | Material-UI |
| **ORM** | Object-Relational Mapping |
| **PCI DSS** | Payment Card Industry Data Security Standard |
| **PDF** | Portable Document Format |
| **REST** | Representational State Transfer |
| **SMS** | Short Message Service |
| **SQL** | Structured Query Language |
| **SRS** | Software Requirements Specification |
| **SSL** | Secure Sockets Layer |
| **TTL** | Time To Live |
| **UUID** | Universally Unique Identifier |
| **WCAG** | Web Content Accessibility Guidelines |
| **WSGI** | Web Server Gateway Interface |
| **XSS** | Cross-Site Scripting |

### 10.3 References

**Documentation**:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [ENV_VARS.md](./ENV_VARS.md) - Environment variables
- [CLAUDE.md](./CLAUDE.md) - Development instructions
- [infrastructure/DEMO_SETUP.md](./infrastructure/DEMO_SETUP.md) - Deployment guide
- [infrastructure/MIGRATION_GUIDE.md](./infrastructure/MIGRATION_GUIDE.md) - Production migration
- [infrastructure/SERVICE_INVENTORY.md](./infrastructure/SERVICE_INVENTORY.md) - Service catalog

**External Documentation**:
- Django 5.2 Documentation: https://docs.djangoproject.com/en/5.2/
- Django REST Framework: https://www.django-rest-framework.org/
- React 19 Documentation: https://react.dev/
- Material-UI Documentation: https://mui.com/
- Stripe API Documentation: https://stripe.com/docs/api
- Brevo API Documentation: https://developers.brevo.com/

### 10.4 Domain Entity Relationship Summary

**Core Relationships**:
- User → Events (one-to-many)
- User → Payments (one-to-many)
- User → Quotes (one-to-many)
- User → Contracts (one-to-many)
- User → Notifications (one-to-many)
- Event → Payments (one-to-many)
- Event → Invoices (one-to-many)
- Event → Quotes (one-to-many)
- Event → Contracts (one-to-many)
- Event → Tasks (one-to-many)
- Event → Timeline (one-to-many)
- Event → Files (one-to-many)
- Event → ProductOptions (many-to-many via EventProductOption)
- Event → PaymentPlan (one-to-one)
- Event → WorkflowTemplate (many-to-one)
- Event → WorkflowStage (many-to-one for current stage)
- BookingFlow → BookingFlowSteps (one-to-many)
- BookingFlow → BookingSessions (one-to-many)
- BookingSession → Event (many-to-one for created event)
- Quote → QuoteLineItems (one-to-many)
- Invoice → InvoiceLineItems (one-to-many)
- Invoice → Payments (one-to-many)
- Contract → ContractSignatures (one-to-many)
- PaymentPlan → PaymentInstallments (one-to-many)
- WorkflowTemplate → WorkflowStages (one-to-many)
- ProductCategory → ProductOptions (one-to-many)
- ProductCategory → ProductCategory (self-referential for hierarchy)

### 10.5 Key Business Rules Summary

1. **Payment Rules**:
   - Payment status calculated from invoices and completed payments
   - Payment numbers generated atomically
   - State machine enforces valid payment state transitions
   - Late fees applied after grace period
   - Payment completion triggers workflow

2. **Booking Rules**:
   - One active booking flow per event type
   - Session expiration configurable
   - Pricing centralized via PricingCalculationService
   - Booking completion creates event and triggers workflow

3. **Workflow Rules**:
   - Stages cannot move backwards within same category
   - Workflow progression idempotent
   - Triggers: payment received, quote accepted, contract signed, event created
   - Automated actions execute on stage application

4. **Contract Rules**:
   - One signature per role per contract
   - Multi-party signing supported
   - Contract fully signed triggers workflow
   - Legal compliance metadata tracked

5. **Quote Rules**:
   - Quote acceptance triggers event confirmation
   - Versioning for revisions
   - Quote sent triggers workflow

6. **Product Rules**:
   - Excess hours calculation for time-based pricing
   - Discounts apply based on applicability rules
   - Tax rates configurable

7. **Notification Rules**:
   - User preferences control delivery channels
   - System notifications cannot be disabled
   - Auto-read after configured days
   - Digest batching for non-urgent notifications

---

**END OF SOFTWARE REQUIREMENTS SPECIFICATION**

**Document Status**: Complete
**Reverse Engineered From**: Production codebase analysis (2025-11-24)
**Accuracy**: High - based on actual implementation
**Coverage**: Comprehensive - all major domains and features documented
