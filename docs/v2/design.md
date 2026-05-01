# LifePlace v2 — Architecture Design

**Status**: Draft for review. Awaiting approval before any implementation work begins.
**Mode**: Greenfield rebuild on the atelier-booking factory template. v1 is not preserved — no data migration, no API continuity, no dual-write. v1 turns off only when v2 is *polished and definitively better*.
**Tier**: client-stewarded · **Region**: `ap-southeast-1` (Singapore).

This document is the architectural commitment. It pairs with `visual-contract.md` (the frozen visual spec for the 12 PublicLayout marketing routes).

---

## 1. Goals

1. **Replicate the existing client-portal public pages 1:1** for the 12 PublicLayout-wrapped routes (`/`, `/about`, `/services`, `/rates`, `/facilities`, `/gallery`, `/reviews`, `/contact`, `/partner`, `/podcasts`, `/privacy`, `/terms`). The visual contract is frozen in `visual-contract.md`.
2. **Redesign everything else** — booking flow, authenticated client area, admin-crm — within the same brand token system, using 2026 best practices. Free hand to optimize UX.
3. **Land cleanly on the atelier-booking factory stack** (Next 15 + Supabase + Tailwind v4 + shadcn/ui + Vercel + Resend + Stripe + Vitest + Playwright + Sentry) with a small, documented set of L44 reserved exceptions.
4. **Reimplement the Python tail in TypeScript**: event-sourced payments → Postgres + Server Actions; Brevo → Resend; Channels → Supabase Realtime; reportlab → React-PDF; Celery+beat → Inngest; idempotency/ETag middleware → Server-Action wrappers; DPA cron → Inngest schedules.
5. **Simplify the workflow engine** toward the StudioNinja model that operators actually use, while adding two corrections StudioNinja under-delivers (job-relative date anchors, first-class per-job overrides).
6. **Operator UX paradigm**: Event Profile as the dense single-page hub. Calendar is secondary.
7. **Stay handoffable** — every dependency is on a SaaS the client can take ownership of (Supabase org, Vercel project, Stripe account, Resend domain, Cloudflare R2 bucket, Sentry project).

---

## 2. Non-Goals — what v2 deliberately does NOT carry over from v1

Explicit list. Anything below is not in v2 unless re-justified.

| Dropped | Why |
|---|---|
| **Django + DRF backend** | Replaced wholesale by Next 15 App Router + Server Actions + Supabase. The Python tail (Channels, reportlab, Celery, custom middleware) is reimplemented in TypeScript. |
| **`USE_TZ=False` naive PHT storage** | v2 stores all timestamps as `timestamptz` (UTC), renders in `Asia/Manila` via a centralized `formatPhilippinesTime()` helper. ADR-001 spirit (single-business-timezone simplicity) preserved by the helper, not by storage. See §10. |
| **MUI v7** | Replaced by Tailwind v4 + shadcn/ui v3 + a custom marketing layer. Visual contract reproduced via CSS-variable token system. |
| **React Router v7** | Replaced by Next App Router. |
| **Celery + beat + Upstash Redis (key-prefixed) + DatabaseScheduler** | Replaced by Inngest (cron + step functions + retries + DLQ + observability). |
| **Django Channels + Daphne ASGI** | The only WebSocket route that survives — date availability — runs on Supabase Realtime broadcast. The two messaging WS routes (`ws/messaging/thread/*`, `ws/messaging/global/`) are dropped (general messaging was orphaned in v1; only `SupportInquiry` survives, and a polled REST endpoint is sufficient for support volume). |
| **Brevo (Sendinblue) email pipeline + HMAC webhook + sandboxed template renderer** | Replaced by Resend + React Email + Resend webhooks. Unsubscribe tokens reimplemented as signed JWTs. |
| **reportlab PDF generation** | Replaced by `@react-pdf/renderer` for contracts and receipts. |
| **Custom IdempotencyMiddleware + ETagMiddleware** | Idempotency handled via Server Actions + transactional Postgres (one-shot semantics by request ID). ETag handled via Next's built-in caching headers + `revalidateTag`. |
| **`vendors` domain** | Genuinely orphaned in v1 (zero downstream references in bookingflow / events services, zero client-portal API). Hard delete. If venues need to reference vendors later, add it back as a flat join table on event-level. |
| **Generic messaging (`MessageThread` / `Message` / `MessageReadStatus` / `MessageAttachment`)** | Half-orphaned in v1. Only `SupportInquiry` is wired into UI. v2 keeps a slim support-inquiry domain (with attachments + read state for the inquiry context only). |
| **`metrics` admin page (DORA, GA4, Sentry)** | User-confirmed: was a personal dashboard for the architect, not the operator. Removed. |
| **`/organizations`, `/security`, `/integrations` admin stubs** | Literal "Coming soon..." JSX in v1's `App.tsx`. Removed from v2 scope. |
| **VIP at the v1 schema heft (7 models: VIPSettings, VIPTier, VIPBenefit, ClientVIPStatus, VIPPointTransaction, VIPRewardRedemption, VIPTierHistory)** | v2 keeps VIP as a feature (user-confirmed), but redesigns the schema to ~3 tables: `loyalty_tier`, `client_loyalty` (denormalized current tier + lifetime points + last_calculated_at), `loyalty_event` (event-sourced point grants + redemptions). Tier escalation is a derived computation, not a stored history table. |
| **v1 booking flow's 3-concurrent progress indicators** (LinearProgress + Stepper + mobile box) | Redesigned in v2 to a single linear progress bar + persistent right-rail (desktop) / collapsible (mobile) pricing summary. |
| **`openapi.yaml` hand-curated file** | Stale (missing 6 domains), unused. v2 uses `openapi-typescript` generated from a real spec or hand-typed API client. |
| **Workflow boolean fast-path triggers** (`trigger_on_payment_received`, `trigger_on_quote_accepted`, `trigger_on_contract_signed`) | Redundant with the `trigger_type` enum. v2 unifies under a single `trigger_type` discriminated union. |
| **`WorkflowStage` model and stage-machine abstraction** | Over-engineered relative to StudioNinja and operator usage. v2 collapses to flat `workflow_task` per event with task primitives. See §7. |
| **Mobile app (for v2.0 launch)** | Deferred to v2.x. The v2 backend + API + Supabase project must be designed mobile-friendly from day one (see §11) so mobile pickup is unblocked. Existing bundle id `com.lifeplace.app` and EAS project preserved for the v2.x mobile rebuild. |
| **Cloudflare worker `app-links`** | Was committed with placeholder Apple teamId / Android SHA — never deployed. Not in v2 until mobile ships. |
| **`frontend/shared/` package as it exists** | Misnomer in v1 (mostly the messaging feature). v2 has multiple proper shared packages (`packages/db`, `packages/domain`, `packages/ui`, `packages/emails`, `packages/pdf`, `packages/types`, `packages/config`). |
| **StudioNinja's "Pick & Choose vs Fixed Quote" dichotomy** | One quote model with optional client-selectable line items (`is_optional` boolean per line item). |

---

## 3. Architecture Decisions

### 3.1 Tier + Region

- **Tier**: client-stewarded (per factory `Per-tier requirements`).
- **Region**: `ap-southeast-1` (Singapore Supabase + Vercel `sin1` edge region for Singapore-routing).
- **Implies**: own Supabase Pro project, own Vercel team project, own Stripe account, custom domain (`lifeplace.dev` + `admin.lifeplace.dev`), populated `docs/client-handoff.md`, contracts dir, own Sentry project, own R2 bucket `lifeplace-backups`, Tailscale tag optional. All required by factory L273.

### 3.2 Backend & runtime

- **Framework**: Next.js 15 App Router (factory locked).
- **Language**: TypeScript strict (factory locked).
- **Package manager**: pnpm with workspaces (factory locked).
- **Hosting**: Vercel (Pro, atelier org).
- **Backend services**: Supabase Pro (Postgres + Auth + Storage + Realtime + Edge Functions).
- **Background jobs**: **Inngest** (L44 reserved exception — factory doesn't specify; Inngest is the right call because the workflow engine's date-anchored triggers map cleanly to Inngest's `inngest.send()` + scheduled functions, and we get retries + DLQ + observability for free).
- **Real-time**: Supabase Realtime broadcast (date availability for the booking flow). No other real-time channels in v2.
- **PDF generation**: `@react-pdf/renderer` running in Server Actions for contracts and receipts. If a template outgrows React-PDF's capabilities (signed PDFs with embedded fonts, complex tables), fall back to `playwright-core` headless on a Vercel function.
- **Email**: Resend (factory). React Email templates in `packages/emails/`. Webhook receiver as a Server Action route.

### 3.3 Frontend

- **Component library**: Tailwind CSS v4 + shadcn/ui v3 + Radix primitives + a custom `packages/ui/marketing` layer that recreates the v1 sage/terracotta design system as CSS-variable tokens. Factory-aligned (no L44 deviation needed). The custom marketing layer wraps shadcn primitives with brand tokens for the 12 public routes.
- **Forms**: React Hook Form + Zod, schemas shared client+server (factory locked).
- **State**: Server Components + Server Actions default. TanStack Query only for optimistic UX (booking flow date holds, support thread sends). Zustand: zero in v2 web (factory mandate). Mobile when it picks up will use Zustand per existing convention.
- **Data fetching**: RSC for server-fetched data, Server Actions for mutations from forms, TanStack Query for client-side mutations needing optimistic UX. No raw `fetch` from client components for our own API.
- **Auth**: Supabase Auth — email magic link + Google OAuth. Apple OAuth deferred to v2.x mobile.
- **RLS**: enabled on every table. Default deny. Policies named `<table>_<action>_<role>` (factory). Server Actions use the SSR Supabase client (per-request user JWT, RLS-enforced) by default; service-role key only for cross-tenant admin ops behind explicit role-check guards.

### 3.4 Database

- **Database**: Postgres 16 via Supabase.
- **ORM / query layer**: **Drizzle ORM** (L44 reserved exception — factory doesn't mandate; Drizzle is the modern type-safe default and plays cleanly with Supabase migrations).
- **Schema migrations**: Supabase CLI migrations (factory locked). Drizzle schema follows the migration files (drizzle-kit `introspect` for sync).
- **Conventions** (factory locked): `id uuid primary key default gen_random_uuid()`; `created_at timestamptz default now()`; `updated_at timestamptz default now()` with auto-update trigger; soft delete via `deleted_at timestamptz` only on tables that need retention; migration filename `YYYYMMDDHHmmss_short_description.sql`; no raw SQL in app code (queries via Drizzle or Supabase client).
- **Timezone**: `timestamptz` everywhere (UTC stored). Display rendered in `Asia/Manila` via `formatPhilippinesTime()` (see §10).

### 3.5 Storage

- **Files**: Supabase Storage. Buckets:
  - `gallery-public` — venue / event-type images shown on public pages
  - `event-files-private` — client-uploaded event files
  - `contracts-private` — generated contract PDFs + signature artifacts
  - `avatars-public` — user avatars
- **Backup**: nightly `pg_dump` → Cloudflare R2 bucket `lifeplace-backups`, weekly EVO pull → restic (factory pattern).

### 3.6 Payments

- **Provider**: Stripe direct.
- **Account**: new Stripe account under the client's brand (per client-stewarded tier).
- **Pattern**: event-sourced — keep v1's `payment_events` + `payment_state_history` pattern. Webhooks land at a Supabase Edge Function (Deno, signature-verified, idempotent by Stripe `event.id`), which writes to `payment_events` and triggers an Inngest `payment.event_received` function that drives the state machine.
- **Refunds + disputes**: webhook-driven, same shape as v1.
- **Reconciliation**: nightly Inngest job comparing `payments` table to Stripe ledger.

### 3.7 Project shape

**L44 reserved exception**: two Next apps in one monorepo, not the factory-default single `apps/web/`.

**Justification (goes in `docs/runbook.md`)**: admin-crm and client-portal serve different users, ship different bundles, have different performance profiles, benefit from independent deploy cadence. A single-app design with route groups would still ship admin code to the public bundle and force a single Sentry release, single CI pipeline. The two-app shape is the correct call given the scope.

```
lifeplace-v2/
├── .github/workflows/                 # ci, preview, prod, backup
├── apps/
│   ├── web/                           # Client portal → lifeplace.dev
│   │   ├── app/
│   │   │   ├── (public)/              # 12 marketing routes (visual contract)
│   │   │   ├── (auth)/                # login, register, forgot-password, accept-invitation
│   │   │   ├── (booking)/             # booking flow (redesigned)
│   │   │   ├── (client)/              # authenticated client area (redesigned)
│   │   │   ├── api/                   # Server Action wrappers, public webhook receivers
│   │   │   ├── opengraph-image.tsx    # OG card generator
│   │   │   ├── sitemap.ts
│   │   │   ├── robots.ts
│   │   │   └── layout.tsx
│   │   ├── components/                # web-app-only components
│   │   ├── lib/
│   │   │   ├── supabase/              # SSR clients, middleware
│   │   │   └── env.ts                 # Zod-parsed env access
│   │   ├── public/                    # /logo.png, /favicon.svg, /images/*
│   │   ├── middleware.ts              # auth gating + i18n hooks
│   │   └── next.config.mjs
│   │
│   └── admin/                         # Admin CRM → admin.lifeplace.dev (full redesign)
│       ├── app/
│       │   ├── (auth)/                # admin login + password reset
│       │   ├── (dashboard)/           # operator surfaces
│       │   │   ├── events/[id]/       # Event Profile (the operator hub)
│       │   │   ├── events/            # Events list (primary surface)
│       │   │   ├── clients/[id]/
│       │   │   ├── clients/
│       │   │   ├── calendar/          # secondary surface
│       │   │   ├── tasks/
│       │   │   ├── analytics/
│       │   │   ├── help/              # bundled markdown help center
│       │   │   ├── support/           # support inquiry triage
│       │   │   └── settings/          # 22 → ~15 sub-pages
│       │   └── api/
│       ├── components/                # admin-only
│       ├── lib/
│       └── next.config.mjs
│
├── packages/
│   ├── config/                        # eslint, tsconfig, prettier, tailwind preset
│   ├── db/                            # Drizzle schema + types + repositories (selectors-equivalent)
│   ├── domain/                        # business logic — workflow engine, payments state machine, dpa, loyalty, pricing
│   ├── ui/
│   │   ├── primitives/                # shadcn primitives copied in
│   │   ├── tokens/                    # CSS-variable token system (sage/terracotta/gold/cream)
│   │   ├── marketing/                 # public-page components (HeroBackground, GlassCard, ModernCard, AnimatedElement, Section, Container, etc.)
│   │   ├── booking/                   # booking-flow components (used by web app's (booking) routes)
│   │   ├── admin/                     # admin-only components (Event Profile hub, workflow editor, etc.)
│   │   └── shared/                    # used by both web and admin (Button, form primitives, Toast, etc.)
│   ├── emails/                        # React Email templates (transactional + workflow automations)
│   ├── pdf/                           # React-PDF templates (contract, receipt, invoice)
│   └── types/                         # cross-app types (Drizzle inferred + zod schemas)
│
├── supabase/
│   ├── config.toml                    # Singapore region pinned
│   ├── migrations/                    # YYYYMMDDHHmmss_*.sql — Supabase CLI managed
│   ├── seed.sql                       # local dev only
│   ├── functions/                     # Edge Functions (Stripe webhook, Resend webhook)
│   └── tests/                         # pgTAP if needed
│
├── inngest/
│   └── functions/                     # background jobs (workflow triggers, reconciliation, DPA cron)
│
├── docs/
│   ├── runbook.md                     # ops procedures + L44 deviations documented
│   ├── tier.md                        # client-stewarded
│   ├── conventions.md                 # project-specific deviations
│   ├── extension-manifest.md          # Postgres extensions used
│   ├── client-handoff.md              # required before going live
│   └── v2/
│       ├── design.md                  # this file
│       └── visual-contract.md
│
├── scripts/
│   ├── reset-db.sh
│   └── deploy.sh
│
├── .env.example
├── package.json                       # workspaces declared
├── pnpm-workspace.yaml
├── turbo.json                         # if Turborepo used for build orchestration
├── tsconfig.json
└── README.md
```

### 3.8 Reserved exceptions (L44) — full list

These are the documented deviations from the atelier-booking factory stack. Each appears in `docs/runbook.md`:

1. **Two Next apps** (`apps/web` + `apps/admin`) instead of one. Justified above (§3.7).
2. **Inngest** for background jobs (factory doesn't specify a default; Inngest is the right tool for the workflow engine).
3. **Drizzle ORM** for query layer (factory doesn't specify; Drizzle is the modern default).

That's it. Everything else is factory-aligned.

---

## 4. Auth Strategy

- **Provider**: Supabase Auth.
- **Methods**: email magic link (default) + Google OAuth (factory locked). Apple OAuth deferred to v2.x mobile.
- **Profile data**: `profiles` table with `id` referencing `auth.users(id)` 1:1, plus `role enum ('CLIENT', 'ADMIN', 'OWNER')` and brand-specific fields (display_name, phone, avatar_url, locale, marketing_opt_in).
- **Session management**: Supabase SSR cookies (factory locked) — never localStorage in web app.
- **Route protection**:
  - `apps/web` middleware gates `(client)/*` and `(booking)/*` to authenticated CLIENT or ADMIN. Public + auth routes don't require a session.
  - `apps/admin` middleware gates everything to ADMIN or OWNER. Login redirects to admin login.
- **Admin invitations**: an OWNER invites an ADMIN by email → email contains signed JWT invitation link → invitee creates an account with role = ADMIN.
- **Client invitations**: an ADMIN invites a CLIENT by email → same shape.
- **Password reset**: Supabase Auth's built-in flow.
- **DPA self-service** (`/me/data/`, `/me/export/`, `/me/delete/`, `/me/correct/`, `/me/object/`): rebuilt as Server Actions on `apps/web`. Data export = Drizzle query → JSON / CSV download. Delete = soft delete with retention timer (per security domain rules in §9).

---

## 5. Data Model — high-level entities

This is the v2 entity catalog. Schema details (columns, indexes, RLS policies) defined in `packages/db/schema/` and Supabase migrations.

### 5.1 People

- **`profiles`** — supabase auth user mirror. Holds role + display fields.
- **`clients`** — the venue's customer record. May or may not have an `auth.users` row (operator-created clients without portal access). Fields: primary_email, primary_phone, company, address, billing_contact_id, onsite_contact_id, decision_maker_id, notes, lead_source_id, vip_tier_id (loyalty), created_at, deleted_at.
- **`client_contacts`** — multi-role contact people per client (billing / onsite / decision-maker / additional). StudioNinja-inspired but extended for venues: photographers have primary + secondary client; venues need 3+ roles per event.
- **`client_invitations`** — pending email invites to portal-link a client.

### 5.2 Catalog

- **`venues`** — physical spaces. Fields: name, slug, capacity (min/max), description, hourly_rate, full_day_rate, gallery, operating_rules (jsonb), blocked_dates (separate table).
- **`venue_blocked_dates`** — recurring + one-off blocks per venue.
- **`event_types`** — wedding, retreat, team-building, workshop, etc. Drives default workflow assignment (StudioNinja-inspired). Fields: name, slug, description, featured_image_id, default_workflow_template_id, default_questionnaire_template_id, default_contract_template_id.
- **`product_categories`** — package / addon grouping.
- **`products`** — bookable items: packages, addons, hourly add-ons, per-guest fees, vendor coordination fees. Fields: name, sku, category_id, base_price, pricing_dimension (`fixed | per_hour | per_guest`), tax_classification, is_active.
- **`product_packages`** — composite packages bundling multiple products with optional discount.
- **`gallery_photos`** — public gallery photos with category tagging. Public-read.
- **`lead_sources`** — marketing attribution channels (StudioNinja-inspired; Dashboard graph).

### 5.3 Events (the central aggregate)

- **`events`** — single record with a status flip (StudioNinja-inspired, already in v1):
  - `status enum ('LEAD', 'CONFIRMED', 'COMPLETED', 'CANCELLED')`
  - Lead-stage features grey out once `status >= CONFIRMED`
  - Fields: client_id, primary_contact_id, event_type_id, status, lead_source_id, name, start_at (timestamptz), end_at (timestamptz), setup_at (optional, timestamptz), teardown_at (optional, timestamptz), guest_count_estimate, guest_count_final, location_notes, internal_notes, current_workflow_template_id, payment_status (computed: UNPAID | PARTIALLY_PAID | PAID | OVERPAID), date_hold_status, check_in_status, created_at, deleted_at
- **`event_venues`** — many-to-many: rooms/spaces assigned to an event with start/end times per venue (multi-room events).
- **`event_products`** — many-to-many: products attached to an event with quantity, override price, notes.
- **`event_files`** — uploaded files per event (private bucket).
- **`event_timeline`** — append-only audit log of significant state changes.
- **`event_feedback`** — post-event feedback collected via questionnaire-style survey.
- **`date_reservations`** — short-lived holds during booking flow (5-min cleanup via Inngest).

### 5.4 Sales (quotes + line items)

- **`quotes`** — one quote model (no Pick & Choose / Fixed dichotomy). Fields: event_id, status (DRAFT, SENT, VIEWED, ACCEPTED, REJECTED, EXPIRED), total, expires_at, sent_at, accepted_at.
- **`quote_line_items`** — per-product line items with: product_id (or freeform), quantity, unit_price, is_optional (client can toggle in portal), is_selected (client's choice if optional), notes.
- **`quote_activity`** — activity log per quote (sent, viewed, line-item-toggled, accepted).
- **`quote_templates`** + **`quote_template_products`** — operator-saved quote shapes.

### 5.5 Contracts

- **`contract_templates`** — operator-authored templates with merge-tag variables (`{{client.name}}`, `{{event.start_at}}`, etc.).
- **`event_contracts`** — instantiated contracts per event. Fields: template_id, event_id, status (DRAFT, SENT, VIEWED, SIGNED, EXPIRED, AMENDED), pdf_url (Supabase storage), expires_at, sent_at, signed_at.
- **`contract_signatures`** — multi-signer (StudioNinja-inspired): signer_email, signer_name, typed_full_name, signed_at, ip_address, user_agent. Operator counter-signs as a separate row.
- **`contract_amendments`** — versioned amendments after signing. Each amendment is a new signed PDF with a parent_id pointer.

### 5.6 Payments

- **`invoices`** — one or more per event. Fields: event_id, status (DRAFT, SENT, OVERDUE, PAID), total, balance_due, due_date.
- **`invoice_line_items`** — line items denormalized from quote at invoice creation.
- **`invoice_taxes`** — per-tax breakdown.
- **`payments`** — one payment attempt. Fields: invoice_id, status (CREATED, PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED, REFUNDED), amount, currency (PHP), gateway (`STRIPE`), stripe_payment_intent_id, stripe_charge_id.
- **`payment_events`** — append-only event store of every payment state transition (event-sourced pattern from v1).
- **`payment_state_history`** — derived view / materialized table for fast reads.
- **`payment_disputes`** — Stripe dispute webhook landing.
- **`refunds`** — partial + full refunds, gateway-processed.
- **`payment_terms_configurations`** — per-flow deposit + balance schedule. Fields: deposit_type (PERCENTAGE | FIXED), deposit_value, balance_due_type (DAYS_BEFORE | DAY_BEFORE), balance_due_offset.
- **`tax_rates`** — VAT (12% PH default) + custom rates.

### 5.7 Workflow (simplified — see §7)

- **`workflow_templates`** — flat list of tasks (NOT stages).
- **`workflow_template_tasks`** — task definitions with type, anchor, automation_action_type, etc.
- **`event_workflow_tasks`** — instantiated tasks per event with completion + override flags.

### 5.8 Questionnaires

- **`questionnaire_templates`** — operator-authored template shells.
- **`questionnaire_fields`** — field definitions with type (text, select, checkbox, file, date, etc.), validation rules, write-back target (`questionnaire_only | client_field | event_field` + field_name) — StudioNinja-inspired field-mapping.
- **`event_questionnaires`** — instantiated questionnaires per event.
- **`questionnaire_responses`** — answers, with a write-back trigger that updates `clients` or `events` rows when configured.

### 5.9 Communications

- **`email_layouts`** — operator-authored email shells (header / footer / brand).
- **`communication_templates`** — emails with merge-tag variables. Fields: subject, body (rich), layout_id, type (TRANSACTIONAL | WORKFLOW_AUTOMATION | MANUAL).
- **`communication_records`** — sent email audit log. Fields: template_id, recipient, subject, body_rendered, sent_at, opened_at, clicked_at, bounced_at, complained_at (Resend webhook updates).
- **`email_unsubscribe_tokens`** — signed JWTs (CAN-SPAM unsubscribe).

### 5.10 Notifications (in-app)

- **`notification_types`** — taxonomy.
- **`notifications`** — per-user in-app notifications.
- **`notification_preferences`** — per-user opt-in/out per type.
- **`device_push_tokens`** — populated when mobile picks up.
- **`notification_digests`** — periodic email digests of in-app notifications.

### 5.11 Loyalty (simplified VIP)

Replaces v1's 7-table VIP schema with 3 tables (see §2 Non-Goals):

- **`loyalty_tiers`** — tier definitions (Bronze, Silver, Gold). Fields: name, threshold_points, benefits (jsonb).
- **`client_loyalty`** — per-client current state (denormalized): current_tier_id, lifetime_points, available_points, last_calculated_at.
- **`loyalty_events`** — append-only point grants + redemptions. Fields: client_id, type (EARN | REDEEM | EXPIRE | ADJUST), points, source_type (booking, manual, referral), source_id, expires_at.

Tier escalation is a derived computation (Inngest periodic job recalculates `client_loyalty.current_tier_id` from `loyalty_events` totals).

### 5.12 Support

- **`support_inquiries`** — replaces v1's MessageThread+SupportInquiry. Fields: client_id, subject, status (OPEN, REPLIED, RESOLVED, CLOSED), priority, last_message_at.
- **`support_messages`** — messages within an inquiry, with attachments.
- **`support_message_attachments`** — file attachments.

(No general MessageThread / Message / global messaging WS in v2.)

### 5.13 Compliance (DPA — Philippine NPC)

- **`security_breaches`** — operator-logged breach events.
- **`breach_notifications`** — NPC notification timeline tracking (72-hour rule).
- **`affected_users`** — per-breach affected-user list.
- **`consent_records`** — per-user consent log (marketing, terms, privacy version).
- **`privacy_requests`** — per-user data-subject-rights requests (export, delete, correct, object).
- **Retention enforcement** — Inngest weekly job per the v1 hardcoded values: financial 10y, contracts 10y, account 7y, security logs 1y. Configurable via env.

### 5.14 Settings (singletons)

- **`app_settings`** — global app config.
- **`currency_settings`** — currency formatting rules (PHP default).
- **`legal_documents`** — privacy policy + terms of service rich text. Public-read.
- **`company_settings`** — venue brand info (name, logo, contact, social).

### 5.15 Webhooks (operator-configured outbound)

- **`workflow_webhooks`** — operator-configured outbound HTTP endpoints triggered by workflow events. Fields: url, secret, event_types (jsonb array), is_active.
- **`workflow_webhook_deliveries`** — delivery log + retry state.

---

## 6. Booking Flow (redesigned)

Out of visual-contract scope (free to redesign within brand tokens). v2 design:

- **Route shape**: `/booking/[flowId]/[step]` — bookmarkable resume, analytics-trackable, browser-back-friendly.
- **Single linear progress bar at the top** (replaces v1's 3-concurrent indicators).
- **Persistent right-rail pricing summary** (desktop) / collapsible drawer (mobile) showing live total + discount + payment terms.
- **Steps** (driven by `booking_flow_steps` config per event type, similar to v1 — operator can enable/disable per flow):
  1. `event_type_selection` (only when entering `/booking` with no flow selected)
  2. `introduction` (acknowledgement step — optional per flow)
  3. `venue_selection` (multi-select)
  4. `date_time` (with availability check against `date_reservations` + `venue_blocked_dates`)
  5. `package_selection` (one package + optional add-ons)
  6. `addon_selection` (additional hours per venue + addon products)
  7. `questionnaire` (operator-configured fields)
  8. `pricing_summary` (renamed from "Review" per CLAUDE.md — this is the customer-facing pricing review screen)
  9. `contact_info` (with optional account creation + "I already have an account" inline auth)
  10. `payment_info` (Stripe Payment Element + quote-only fallback if event-type allows)
  11. `confirmation` (read-only summary; replaces `BookingComplete` route)
- **Optimistic step transitions** via Server Actions — UI moves immediately, server validates async, error state rolls back with explanation.
- **Date-hold** during booking flow: when client picks a date+venue, a `date_reservations` row holds it for 15 min (Inngest cleanup job deletes expired). Holds prevent double-booking only via a Postgres unique partial index `(venue_id, start_at, end_at) WHERE expires_at > now()`.
- **Session persistence**: a `booking_sessions` table holds in-progress flow state (jsonb) keyed by an HTTP cookie session id, allowing recovery across tabs / devices when authenticated.
- **No SessionRecoveryDialog separate UI** — recovery is automatic on landing at `/booking` with an existing session cookie.
- **Confirmation screen** contains: success badge + booking reference + event details summary + payment status + next steps (contract incoming, questionnaire pending, balance due date) + contact support card.

---

## 7. Workflow Engine v2

### 7.1 Design rationale

v1's engine modeled `WorkflowTemplate → WorkflowStage → WorkflowTrigger` plus a 4-value `EventWorkflowOverride` enum and 4 boolean fast-path triggers — much heavier than what StudioNinja (the source material) actually does.

StudioNinja's workflow is a **flat structured task list with 4 task primitives**. No graph/canvas editor, no IF/THEN branching. The two things StudioNinja under-delivers — **job-relative date anchors** and **first-class per-job overrides** — are v2's differentiators.

v2 simplifies back to the StudioNinja shape and adds those two corrections.

### 7.2 Schema

```
workflow_templates
  id  uuid pk
  name  text
  description  text
  default_for_event_type_id  fk events.event_types  (nullable)
  is_active  bool
  created_at  timestamptz

workflow_template_tasks
  id  uuid pk
  template_id  fk workflow_templates
  position  int  (sort order, drag-to-reorder)
  task_type  enum ('TODO', 'AUTOMATION', 'EXTRA_DATE', 'APPOINTMENT')

  -- task display
  title  text
  description  text

  -- trigger configuration (discriminated union by trigger_type)
  trigger_type  enum (
    'ABSOLUTE_DATE',          -- fixed calendar date
    'RELATIVE_TO_EVENT',      -- offset from event.start_at
    'RELATIVE_TO_SYSTEM_EVENT', -- offset from a system event (lead_created, quote_accepted, contract_signed, invoice_paid, shoot_started, shoot_completed)
    'MANUAL'                  -- operator manually fires
  )
  trigger_anchor  enum (    -- only when trigger_type = RELATIVE_TO_SYSTEM_EVENT
    'LEAD_CREATED', 'QUOTE_SENT', 'QUOTE_ACCEPTED', 'CONTRACT_SENT',
    'CONTRACT_SIGNED', 'INVOICE_SENT', 'INVOICE_PAID', 'SHOOT_STARTED',
    'SHOOT_COMPLETED', 'EVENT_CREATED', 'EVENT_COMPLETED'
  )
  trigger_offset_days  int  (signed; negative = before, positive = after)
  trigger_absolute_date  date  (when trigger_type = ABSOLUTE_DATE)

  -- automation config (only when task_type = AUTOMATION)
  automation_action  enum ('SEND_EMAIL', 'SEND_CONTRACT', 'SEND_QUESTIONNAIRE', 'SEND_INVOICE', 'CREATE_TASK', 'FIRE_WEBHOOK', 'UPDATE_EVENT_STATUS')
  automation_config  jsonb  (e.g., {template_id: ..., recipient: ...})

event_workflow_tasks
  id  uuid pk
  event_id  fk events
  template_task_id  fk workflow_template_tasks  (nullable when manually added override)
  position  int  (denormalized from template, can be reordered per event)

  -- snapshot at time of instantiation
  task_type, title, description, trigger_type, trigger_anchor,
  trigger_offset_days, trigger_absolute_date,
  automation_action, automation_config

  -- per-event override flags
  is_overridden  bool  (true when this task diverges from template — template edits will NOT propagate)
  is_skipped  bool
  is_completed  bool
  completed_at  timestamptz
  completed_by_user_id  fk profiles

  -- computed fire time
  scheduled_for  timestamptz  (computed when event milestones change; nullable when MANUAL or system-event-not-yet-fired)
  fired_at  timestamptz  (when the automation actually ran)
  status  enum ('PENDING', 'SCHEDULED', 'FIRED', 'COMPLETED', 'SKIPPED', 'FAILED')

  created_at  timestamptz
```

### 7.3 Behavior rules

1. **Template assignment**: when an event is created, the `event_type.default_workflow_template_id` is applied — `event_workflow_tasks` rows are instantiated by snapshot from `workflow_template_tasks`. The event tracks `current_workflow_template_id` for reference.
2. **Live-linked by default**: edits to a `workflow_template_tasks` row propagate to all `event_workflow_tasks` rows where `is_overridden = false` AND `template_task_id` matches AND task hasn't fired yet. Overridden tasks are immune.
3. **Per-event override is first-class**: changing any field on an `event_workflow_tasks` row sets `is_overridden = true`. Adding a new task (without `template_task_id`) and removing a task (`is_skipped = true`) work without breaking template sync for the rest.
4. **Date-anchored triggers**:
   - `ABSOLUTE_DATE`: fires at midnight in `Asia/Manila` on the date.
   - `RELATIVE_TO_EVENT`: `event.start_at + trigger_offset_days days`. Recalculated when event date changes (Inngest job).
   - `RELATIVE_TO_SYSTEM_EVENT`: when the anchor system event fires (e.g., `quote.accepted`), the corresponding `event_workflow_tasks` rows where `trigger_anchor = QUOTE_ACCEPTED` get `scheduled_for = now() + trigger_offset_days`.
   - `MANUAL`: operator clicks "Fire now" button.
5. **System events are emitted by domain logic** (Server Actions) and consumed by an Inngest function `event.system_event_fired` that schedules matching `event_workflow_tasks`.
6. **The Inngest scheduler** runs every 5 minutes, picks up `event_workflow_tasks` with `status = SCHEDULED AND scheduled_for <= now()`, fires the automation, and sets status accordingly.
7. **Automations**:
   - `SEND_EMAIL` — render template via `packages/emails`, send via Resend, log to `communication_records`.
   - `SEND_CONTRACT` — instantiate `event_contracts` from template, generate PDF, email to client.
   - `SEND_QUESTIONNAIRE` — instantiate `event_questionnaires`, email link to client.
   - `SEND_INVOICE` — instantiate invoice from quote, email to client.
   - `CREATE_TASK` — create a TODO `event_workflow_tasks` row for the operator.
   - `FIRE_WEBHOOK` — POST to `workflow_webhooks` matching event type.
   - `UPDATE_EVENT_STATUS` — flip `events.status`.
8. **Editor UX (admin-crm)**: list-based, drag-to-reorder, per-task lightbox (StudioNinja pattern). NOT a graph/canvas editor. Each task row shows: type icon · title · trigger summary ("3 days before event date") · last-fired status. Lightbox edits the discriminated union via conditional fields.

### 7.4 Monitoring

- **Per-event workflow checklist** rendered inline on the Event Profile page (the operator hub — see §8).
- **Global "upcoming triggers" list** in admin-crm dashboard: next 30 `event_workflow_tasks` to fire across all events, with quick-jump to event.
- **Failed tasks** surface as a banner on dashboard + per-event.

---

## 8. Frontends Plan

### 8.1 `apps/web` — Client Portal

Three layout zones:

- **`(public)/`** — visual contract frozen (see `visual-contract.md`). 12 routes.
- **`(booking)/`** — redesigned (§6). Same brand tokens.
- **`(client)/`** — redesigned authenticated client area. Route map:
  - `/dashboard` — events overview, upcoming actions, recent activity
  - `/events` — list of client's events
  - `/events/[id]` — event detail (read-only client view of operator data)
  - `/contracts` — list
  - `/contracts/[id]` — contract view + sign action
  - `/quotes` — list
  - `/quotes/[id]` — quote view + accept/reject + line-item-toggle (for optional items)
  - `/payments` — list
  - `/payments/[id]` — payment detail + pay action
  - `/questionnaires` — list of pending questionnaires
  - `/questionnaires/[id]` — answer / edit
  - `/documents` — files shared by venue
  - `/notifications` — in-app notifications
  - `/support` — support inquiry inbox + new inquiry form
  - `/profile` — account settings + DPA self-service
  - `/loyalty` — VIP status, tier, point history (only when feature-flagged on)
- **`(auth)/`** — login, register, forgot password, accept invitation.

Navigation: top nav for desktop, bottom nav for mobile. Same brand tokens; modern dashboard-style layout (NOT marketing aesthetic — different intent).

### 8.2 `apps/admin` — Admin CRM (full redesign)

Operator's hub. Top-level navigation (collapsed from v1's 9 → 8 items):

- **Dashboard** — KPI cards, today's tasks, upcoming workflow triggers, recent activity, lead-source attribution graph
- **Events** (renamed from Jobs in v1) — primary surface. List view default with status filters (LEAD / CONFIRMED / COMPLETED / CANCELLED), search, sort. Card view + table view toggle.
- **Calendar** — secondary surface. Month + week views. NOT the primary surface (StudioNinja insight).
- **Clients** — list + detail. Detail page shows all events for the client, quotes, contracts, payments, communications, files.
- **Tasks** — unified to-do across all events for operator follow-up.
- **Payments** — invoice + payment list. Reconciliation status indicator.
- **Analytics** — report dashboard with tabs for booking flow, communications, customers, events, operations, sales (drop questionnaire tab unless data is real). All tabs ship with real data — no placeholders.
- **Settings** — collapsed from v1's 22 → ~15 sub-pages. Flat groupings:
  - Account: account, admin users, notifications, company branding, push devices (when mobile ships)
  - Booking: booking flows, event types, lead sources
  - Templates: contract templates, questionnaire templates, workflow templates, communication templates, email layouts, notification types
  - Commerce: products & packages, currency & taxes, payments (gateway config), tax rates, discount/promotions
  - Content: gallery
  - Legal: privacy policy, terms of service
  - Loyalty: VIP tiers + benefits
  - Webhooks: outbound webhook config + delivery log

Drop from v1: VIP-Settings as a separate area (consolidated into Loyalty), Workflow Webhooks as separate (now under Webhooks), Guided Tours (drop entirely — modern tooltips/empty-states instead).

### 8.3 The Event Profile page (the operator hub)

Highest-impact admin surface. Single-page dense layout (NOT tabs). StudioNinja-inspired.

**Layout** (desktop, 1440+):

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header: status badge · event name · client · date · primary actions      │
├────────────────────────────────────────┬─────────────────────────────────┤
│                                        │                                 │
│  EVENT DETAILS card                    │  CLIENT card                    │
│  - dates, venues, guest count          │  - primary contact + role       │
│  - workflow assignment                  │  - secondary contacts           │
│  - lead source, internal notes         │  - quick: email, phone, view    │
│                                        │                                 │
│  WORKFLOW CHECKLIST (full width left)  │  PAYMENTS card                  │
│  - flat task list                      │  - balance due                  │
│  - status icons                        │  - payment schedule             │
│  - inline override / skip / complete   │  - send invoice action          │
│  - drag-to-reorder per-event           │                                 │
│  - "Add task" inline                   │  QUOTES card                    │
│                                        │  - status, total, sent date    │
│                                        │  - send proposal action        │
│  TIMELINE / activity log               │                                 │
│  - append-only feed                    │  CONTRACTS card                │
│  - communications, payments,           │  - status, expiry, signers     │
│    workflow firings, manual notes      │                                 │
│                                        │  QUESTIONNAIRES card            │
│                                        │  - completion status            │
│                                        │                                 │
│                                        │  FILES card                     │
└────────────────────────────────────────┴─────────────────────────────────┘
```

Mobile: same boxes vertically stacked.

**The "Send Proposal" lightbox** — the highest-value operator action (StudioNinja insight). One screen lets operator bundle:
- Quote (select template or build inline)
- Contract (select template, with merge-tag preview)
- Questionnaire (select template)
- Custom message
- Send via single email to client

Replaces three separate flows in v1.

### 8.4 Variable / merge-tag system

Standardize early. Single namespace used in: contract templates, communication templates, email layouts, quote templates.

```
{{client.name}}            {{client.email}}            {{client.phone}}
{{client.company}}         {{client.address}}
{{secondary_client.name}}

{{event.name}}             {{event.start_at}}          {{event.end_at}}
{{event.venue_names}}      {{event.guest_count}}       {{event.status}}
{{event.location}}

{{quote.total}}            {{quote.expires_at}}        {{quote.url}}
{{contract.url}}           {{contract.signed_at}}
{{invoice.balance_due}}    {{invoice.due_date}}        {{invoice.url}}

{{company.name}}           {{company.email}}           {{company.phone}}
{{company.address}}        {{company.signature}}
```

Stored as Mustache-style strings, rendered at send-time via a shared `packages/domain/template-renderer.ts`.

---

## 9. Mobile Plan (deferred to v2.x)

Mobile is **not** in v2.0 launch scope. v2 backend + API are designed mobile-friendly so v2.x mobile pickup is unblocked:

- **Auth**: Supabase Auth has first-class React Native SDK with SecureStore adapter — mobile can re-use the same Supabase project.
- **API**: Server Actions are not mobile-callable directly — mobile picks up via either: (a) generating a thin REST layer over Drizzle queries in `apps/web/api/`, or (b) using Supabase client directly from React Native (RLS-enforced). Decision deferred to mobile re-pickup time.
- **Real-time**: Supabase Realtime has first-class React Native client.
- **PDFs**: server-rendered, mobile downloads via signed URLs (Supabase Storage).
- **Push**: Expo push tokens already wired in v1's `device_push_tokens` schema — v2 keeps the table, populates when mobile ships.
- **Bundle id `com.lifeplace.app` and EAS project preserved** — mobile rebuild lands in `apps/mobile/` (Expo router, RN 0.81+, React 19) and reuses the same Supabase + Stripe + Inngest backend.
- **Apple OAuth**: added when mobile ships.

The v1 mobile codebase is reference material only — not migrated.

---

## 10. Timezone Strategy

**Decision**: Move from v1's naive `USE_TZ=False` to **`timestamptz` UTC storage with display conversion to `Asia/Manila`**.

**Why this is definitively the right call now**:

1. **`timestamptz` is the Postgres lingua franca** — Supabase clients (JS, Realtime, RLS policies, scheduled functions, pg_cron) all assume `timestamptz`. Storing naive `timestamp` requires either constant casting or accepting subtle wrong behavior.
2. **RLS policies that compare dates** (`WHERE expires_at > now()`) need a timezone-aware `now()` for correctness. Naive storage forces every policy to assume Asia/Manila implicitly.
3. **JS `Date` semantics** — `new Date(timestamp_string)` interprets ISO strings as UTC, which means naive-PHT strings produce 8-hour-off Date objects in the browser unless every parse explicitly appends `+08:00`. Error-prone.
4. **Stripe webhooks deliver UTC** — and we pipeline them straight into Postgres. With naive storage we have to convert; with `timestamptz` we don't.
5. **JWT exp claims are UTC** — auth code that compares JWT exp against DB timestamps needs consistent semantics.
6. **Audit log timestamps** — `created_at` / `updated_at` defaulted to `now()` in naive storage produces wrong values when CI / dev / prod servers have different system timezones.
7. **Future-proofing** — if business expands beyond PH (ADR-001 review trigger), the migration cost is zero with `timestamptz`.

**ADR-001 spirit preserved**:

- **Centralized display**: `formatPhilippinesTime(date, format = 'PPP p')` in `packages/domain/datetime.ts` is the only function used to render datetimes to users. Always renders in `Asia/Manila` and labels with `PHT` suffix.
- **Centralized parsing**: `parseAsPhilippinesTime(string, format)` for accepting wall-clock datetime input from operators (turns "2026-07-15 18:00" into the correct UTC `timestamptz`).
- **Operator UI never shows UTC** — every date/time input/output goes through these helpers.
- **API responses include timezone metadata** for clarity (preserved from v1):
  ```json
  {
    "start_at": "2026-07-15T10:00:00.000Z",
    "timezone": "Asia/Manila",
    "timezone_offset": "+08:00"
  }
  ```

**Implementation**:
- All `timestamptz` columns.
- `packages/domain/datetime.ts` exports `formatPhilippinesTime`, `parseAsPhilippinesTime`, `BUSINESS_TIMEZONE = 'Asia/Manila'`, `BUSINESS_TIMEZONE_DISPLAY = 'PHT'`.
- Built on `@formkit/tempo` or the Temporal API where Node 22+ supports it natively; `date-fns-tz` as fallback.
- Operator inputs always parsed via the helper (no raw `new Date(input)` from form values).
- A linting rule (custom ESLint or just `no-restricted-imports` blocking direct `Intl.DateTimeFormat` usage outside the helper file) keeps the discipline.

---

## 11. Email + Notifications Strategy

### 11.1 Email (Resend)

- **Provider**: Resend (factory locked).
- **Templates**: React Email components in `packages/emails/`. Compiled to HTML at send time.
- **Sender**: `noreply@lifeplace.dev` for transactional, `events@lifeplace.dev` for event-related (more recognizable to clients). Both domain-verified in Resend with SPF + DKIM + DMARC.
- **Webhook receiver**: Edge Function at `supabase/functions/resend-webhook/`. Verifies signature, updates `communication_records.{opened_at, clicked_at, bounced_at, complained_at, delivered_at}`.
- **Unsubscribe**: signed JWT tokens (`packages/domain/unsubscribe-tokens.ts`), one-click unsubscribe URL in every marketing email per CAN-SPAM.
- **Deliverability monitor** (StudioNinja-pain-point fix): admin-crm dashboard widget showing 7-day delivery rate, bounce rate, complaint rate, and a "Setup Wizard" that walks operator through verifying SPF/DKIM/DMARC in DNS (Resend has APIs for this).

### 11.2 In-app notifications

- **Storage**: `notifications` table per user.
- **Delivery**: rendered in `apps/web` and `apps/admin` notification panel (RSC fetch + revalidate on action). Real-time push via Supabase Realtime channel `user:{user_id}` (low-volume, single channel per user).
- **Preferences**: per-user opt-in/out per `notification_type` in `notification_preferences`.

### 11.3 Push (mobile-future)

`device_push_tokens` table reserved. Populated when mobile ships. Expo Push API integration via `inngest/functions/push.ts`.

---

## 12. Background Jobs Catalog (Inngest)

Replaces v1's ~35 Celery beat tasks. Initial v2 catalog:

| Inngest function | Trigger | Purpose |
|---|---|---|
| `event/created` | event.system_event_fired{type=EVENT_CREATED} | Schedule matching workflow tasks |
| `event/quote.accepted` | event.system_event_fired{type=QUOTE_ACCEPTED} | Schedule matching workflow tasks; flip event status to CONFIRMED if payment terms allow |
| `event/contract.signed` | event.system_event_fired{type=CONTRACT_SIGNED} | Schedule matching workflow tasks |
| `event/payment.received` | event.system_event_fired{type=PAYMENT_RECEIVED} | Update event.payment_status; schedule matching workflow tasks |
| `event/event.completed` | event.system_event_fired{type=EVENT_COMPLETED} | Trigger feedback questionnaire send |
| `workflow/scheduler` | cron `*/5 * * * *` | Pick up `event_workflow_tasks` with `scheduled_for <= now()`, fire automations |
| `payments/reconcile` | cron `0 3 * * *` (daily) | Compare payments table to Stripe ledger, alert on drift |
| `payments/webhook-retries` | cron `*/5 * * * *` | Retry failed Stripe webhook processings |
| `payments/overdue-notices` | cron `0 9 * * *` (daily) | Send overdue invoice reminders |
| `bookings/cleanup-reservations` | cron `*/5 * * * *` | Delete expired `date_reservations` |
| `events/recompute-payment-status` | event.payment.changed | Recompute `events.payment_status` from invoices |
| `events/mark-past-completed` | cron `0 0 * * *` (daily) | Flip events to COMPLETED when end_at < now() and status = CONFIRMED |
| `contracts/expire` | cron `0 * * * *` (hourly) | Mark unsigned contracts as expired past `expires_at` |
| `contracts/expiry-reminders` | cron `0 9 * * *` | Send reminder emails before contract expiry |
| `quotes/expire` | cron `0 * * * *` | Mark quotes expired |
| `quotes/expiry-reminders` | cron `0 9 * * *` | Send reminder emails before quote expiry |
| `notifications/cleanup` | cron `0 4 * * *` | Delete read notifications older than 30 days |
| `notifications/digest` | cron `0 8 * * *` | Send daily digest of unread in-app notifications |
| `loyalty/recompute-tiers` | cron `0 5 * * *` | Recompute `client_loyalty.current_tier_id` from `loyalty_events` |
| `loyalty/expire-points` | cron `0 0 * * 0` (weekly) | Expire old points per loyalty config |
| `dpa/notification-deadlines` | cron `0 * * * *` | Check NPC 72-hour breach notification deadlines |
| `dpa/retention-cleanup` | cron `0 2 * * 0` (weekly) | Enforce data retention values (financial 10y, contracts 10y, account 7y, security logs 1y) |
| `auth/jwt-cleanup` | cron `0 3 * * *` | Flush expired JWT tokens (Supabase handles natively, but a sweep for our `email_unsubscribe_tokens` is needed) |
| `analytics/snapshot-kpis` | cron `0 1 * * *` | Daily KPI snapshot for trend graphs |

Hooks: `inngest/functions/*.ts`. Inngest dev server runs locally via `npx inngest-cli dev`. Production functions deployed alongside Vercel deploy.

---

## 13. Ops + Handoff Plan

### 13.1 Domain + DNS

- **Apex**: `lifeplace.dev` → Vercel `apps/web` (client portal). Cloudflare DNS (proxied).
- **Subdomain**: `admin.lifeplace.dev` → Vercel `apps/admin` (admin CRM). Cloudflare DNS (proxied).
- **Email sender**: `noreply@lifeplace.dev`, `events@lifeplace.dev` → Resend, with SPF/DKIM/DMARC records in Cloudflare DNS.
- **Existing `app.lifeplace.dev` worker** (App Links) — unchanged, kept dormant until mobile ships.

### 13.2 Cutover plan (v1 turn-off when v2 polished)

1. v2 builds out on its own subdomain (e.g., `v2.lifeplace.dev`) for QA without affecting live v1.
2. When v2 is "polished and definitively better": swap DNS so `lifeplace.dev` → v2 client portal, `admin.lifeplace.dev` → v2 admin.
3. v1 turn-off: delete the Fly app, archive the v1 repo, decommission v1's Brevo + Upstash + Cloudflare R2 bucket (keep backups in cold storage).
4. **No data migration** — v1 users are notified to recreate accounts on v2. v1 bookings are not preserved.

### 13.3 Stripe

- **New Stripe account** under the client's brand (per client-stewarded tier — tier matrix L273 says "per-client").
- v1's Stripe account is unrelated to v2. v2 starts with no products / prices / customers.
- Webhook endpoint configured during cutover (not before, to avoid double-processing during overlap).

### 13.4 Backups

- Nightly `pg_dump` from Supabase → R2 bucket `lifeplace-backups` via GitHub Actions `backup.yml`.
- Weekly EVO pull → restic (factory pattern).
- Storage bucket backups: nightly rclone sync from Supabase Storage → R2.

### 13.5 Monitoring

- **Sentry** — own project per tier. Source maps uploaded on prod deploy.
- **Uptime Kuma** — own group when Pi #2 is built (factory pattern). Until then, use Vercel's built-in monitoring + Sentry alerts.
- **Inngest dashboard** — built-in observability for background jobs.
- **Supabase dashboard** — built-in DB + Auth + Storage + Realtime metrics.

### 13.6 Client handoff

`docs/client-handoff.md` populated before going live (factory L289 requirement). Contents:
- Account ownership: Supabase org, Vercel team, Resend account, Stripe account, Cloudflare account, Sentry org, R2 bucket, GitHub repo
- Access transfer procedure for each
- DNS record reference
- Env var reference (with rotation procedure for each secret)
- Runbook reference for: applying migrations, reading logs, running backups manually, restoring from backup
- Contact for SJD Labs ongoing maintenance (if any)

---

## 14. Sequenced Workflow

This is the dependency graph for v2 development. **No timelines.** Each item is a self-contained workstream; arrows mean "must complete before."

```
[FOUNDATION]
  Bootstrap repo from atelier-booking-template (init script, CLAUDE.md, runbook)
    ↓
  Provision Supabase project (ap-southeast-1), Vercel project, Cloudflare DNS
    ↓
  Land token system (packages/ui/tokens) + load Cormorant + Inter via next/font
    ↓
  Land shadcn primitives + Tailwind v4 config + design-system marketing layer
    │
    ├──→ [VISUAL CONTRACT — public pages]
    │       Implement PublicLayout + PublicHeader + PublicFooter
    │         ↓
    │       Implement Section / Container / GlassCard / ModernCard / HeroBackground / AnimatedElement
    │         ↓
    │       Implement 12 public routes (home → about → services → rates → facilities →
    │         gallery → reviews → contact → partner → podcasts → privacy → terms)
    │         ↓
    │       Snapshot tests against visual-contract.md acceptance criteria
    │
    ├──→ [DATABASE + CORE DOMAIN]
    │       Drizzle schema for: profiles, clients, client_contacts, venues, event_types,
    │         products, events, event_venues, event_products
    │         ↓
    │       RLS policies for above (default deny + role-based)
    │         ↓
    │       Domain layer: events service, client service, venue selectors
    │
    └──→ [AUTH]
            Supabase Auth setup (email + Google OAuth)
              ↓
            apps/web middleware (route gating)
              ↓
            apps/admin middleware (admin/owner only)


[BOOKING FLOW] (depends on FOUNDATION + DB + AUTH)
  Booking flow config (booking_flows + booking_flow_steps + payment_terms_configurations)
    ↓
  Date hold logic (date_reservations + Postgres unique partial index + Inngest cleanup)
    ↓
  Booking flow UI (redesigned single-progress + right-rail summary + 11 steps)
    ↓
  Stripe Payment Element integration + webhook receiver (Edge Function)
    ↓
  Booking session persistence + confirmation screen


[CLIENT PORTAL — authenticated area] (depends on BOOKING FLOW for event creation)
  Dashboard + Events list + Event detail
    ↓
  Quotes view + accept/reject + line-item-toggle for optional items
    ↓
  Contracts view + sign action (typed legal name → signature)
    ↓
  Payments view + pay action (Stripe Payment Element)
    ↓
  Questionnaires view + answer
    ↓
  Documents + Notifications + Profile + DPA self-service
    ↓
  Support inquiry form + thread


[WORKFLOW ENGINE] (depends on DB + EVENTS)
  workflow_templates + workflow_template_tasks schema
    ↓
  Workflow editor admin UI (list-based + drag-to-reorder + per-task lightbox)
    ↓
  Event workflow task instantiation on event creation
    ↓
  Inngest scheduler function (`workflow/scheduler` cron)
    ↓
  System event emitters (in domain services) + Inngest consumers
    ↓
  Per-event override UI on Event Profile workflow checklist


[ADMIN CRM] (depends on DB + AUTH + WORKFLOW ENGINE)
  Dashboard (KPI cards, today's tasks, lead-source graph)
    ↓
  Events list (primary surface) + filters/search/sort + card+table views
    ↓
  Event Profile page (the operator hub — single-page dense layout)
    ↓
  Send Proposal lightbox (quote + contract + questionnaire bundle)
    ↓
  Clients list + detail
    ↓
  Calendar (secondary surface)
    ↓
  Tasks unified view
    ↓
  Settings tree (15 sub-pages, simplified from v1's 22)
    ↓
  Analytics tabs (real data, no placeholders)
    ↓
  Webhooks UI + delivery log


[CONTRACTS + PDF] (depends on DB + EVENTS)
  React-PDF templates (contract base, receipt, invoice)
    ↓
  Contract template authoring + merge-tag preview
    ↓
  Contract signing flow (typed legal name → signature)
    ↓
  Multi-signer support


[EMAIL + NOTIFICATIONS] (depends on DB + RESEND)
  React Email templates (transactional + workflow automations)
    ↓
  Resend send wrapper + webhook receiver (Edge Function)
    ↓
  Communication records logging
    ↓
  In-app notifications (table + Realtime channel + UI)
    ↓
  Notification preferences UI
    ↓
  Deliverability monitor (admin dashboard widget) + SPF/DKIM setup wizard


[LOYALTY] (depends on DB + EVENTS + PAYMENTS)
  Simplified loyalty schema (loyalty_tiers + client_loyalty + loyalty_events)
    ↓
  Earn rules in domain layer (per-event point grants on payment.completed)
    ↓
  Tier recomputation Inngest job
    ↓
  Client portal /loyalty page
    ↓
  Admin Settings → Loyalty (tier + benefits config)


[DPA / COMPLIANCE] (can ship in parallel with ADMIN CRM)
  Schema: security_breaches, breach_notifications, affected_users, consent_records, privacy_requests
    ↓
  Retention enforcement Inngest job
    ↓
  NPC notification deadline tracker
    ↓
  DPA self-service UI (already in CLIENT PORTAL plan)
    ↓
  Admin breach logging UI


[ANALYTICS] (depends on DB events flowing — last)
  Daily KPI snapshot Inngest job
    ↓
  Analytics tabs implementation (replace v1's stub endpoints with real queries)


[CUTOVER] (after all above ship and v2 is polished + definitively better)
  Final QA on v2.lifeplace.dev
    ↓
  DNS swap (lifeplace.dev → v2)
    ↓
  Stripe live keys swap to new account
    ↓
  v1 Fly app archived; v1 repo archived; v1 backups moved to cold storage
    ↓
  client-handoff.md finalized; account ownership transfer to client
```

Many of these workstreams can run in parallel (visual contract is independent of database; workflow engine depends on DB but not on admin UI). The dependency graph above is the minimum order, not the maximum parallelism.

---

## 15. Open Questions Resolved

- ✅ **Admin-crm in scope?** Yes — full redesign. Free hand on UX.
- ✅ **Mobile in scope?** No — deferred to v2.x. Backend is mobile-friendly so re-pickup is unblocked.
- ✅ **Visual replication scope?** 12 PublicLayout marketing routes only. Booking flow + authenticated client area + admin redesigned within brand tokens.
- ✅ **Workflow engine?** Keep — they use it (StudioNinja-derived). Simplify back toward StudioNinja's flat-task-list model. Add job-relative date anchors and first-class per-job overrides as v2 differentiators.
- ✅ **VIP?** Keep — specifically requested. Redesigned schema (3 tables instead of 7).
- ✅ **Vendors?** Drop — orphaned in v1.
- ✅ **Generic messaging?** Drop. Keep slim support inquiry domain only.
- ✅ **Metrics admin page?** Drop.
- ✅ **Workflow editor / analytics tabs / help center?** Keep all three.
- ✅ **Backend?** Full Next + Supabase rebuild. Python tail reimplemented in TypeScript.
- ✅ **Component library?** Tailwind v4 + shadcn/ui v3 + Radix + custom marketing layer (factory-aligned).
- ✅ **Background jobs?** Inngest (L44 reserved exception).
- ✅ **Real-time?** Supabase Realtime (date availability only; messaging WS dropped).
- ✅ **PDF?** React-PDF.
- ✅ **Email?** Resend (factory locked + user-confirmed).
- ✅ **ORM?** Drizzle (L44 reserved exception).
- ✅ **Timezone?** `timestamptz` UTC + display via `formatPhilippinesTime` helper.
- ✅ **Cutover?** v1 turns off only when v2 is polished and definitively better. No hard date.
- ✅ **Stripe?** New account under client's brand. No data continuity.
- ✅ **Domain?** Same domain (`lifeplace.dev`) via DNS cutover from v2.lifeplace.dev staging.

---

## 16. Open Questions Outstanding

These remain for the user before implementation begins. None block the design — they're calibrations:

1. **Brand identity for emails**: confirm sender addresses and "from name" — `noreply@lifeplace.dev` (transactional) and `events@lifeplace.dev` (event-related) is the proposal. Or single sender? Or branded as "LifePlace · Alfonso"?
2. **Lead source taxonomy**: what lead sources should pre-populate in the seed (Google, Facebook, Instagram, referral, walk-in, repeat client, partner, etc.)?
3. **Loyalty rules — point earning rate**: e.g., "1 point per ₱1 paid", or per-event flat grants, or both? Tier thresholds (Bronze 0–999, Silver 1000–4999, Gold 5000+)?
4. **Default workflow templates per event type**: should v2 ship with template seeds for the common event types (wedding, retreat, team-building, workshop, camp), or is this an empty-state experience for the operator to author from scratch? StudioNinja ships sample templates.
5. **Quote / contract / invoice numbering format**: sequential (`Q-0001`), prefixed by year (`Q-2026-0001`), or something else?
6. **Currency**: PHP only? Multi-currency support not needed in v2?
7. **Tax policy**: VAT 12% (PH default) on everything, or configurable per product? Tax-inclusive pricing or tax-exclusive?
8. **Booking flow event-type configuration**: should each event type have a different `booking_flow` (different steps, different fields), or is one universal booking flow with conditional steps sufficient?
9. **Webhook event taxonomy**: what outbound webhook events should v2 ship with — just the StudioNinja-style system events (`lead_created`, `quote_accepted`, etc.), or also lower-level CRUD events?
10. **Help center content**: keep v1's bundled markdown articles as-is (recently shipped), or rewrite for the v2 admin UX?

---

## Change log

- v0.1 — initial draft. Awaiting user review and approval.
