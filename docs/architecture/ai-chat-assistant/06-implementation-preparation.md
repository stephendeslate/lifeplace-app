# AI Chat Assistant — Implementation Preparation Checklist

**Document:** 06-implementation-preparation.md
**Part of:** [AI Chat Assistant Architecture](./00-master-overview.md)
**Status:** Pre-Implementation
**Date:** 2026-02-22

---

## Overview

This document lists everything that must be manually prepared **before writing code**. Each item is a human decision, external account setup, infrastructure change, or content authoring task that cannot be automated during implementation.

Items are ordered by dependency — earlier items unblock later ones.

---

## 1. OpenAI Account & API Key

The architecture uses GPT-4.1-mini for the conversational agent and text-embedding-3-small for the RAG embedding pipeline. Both require an OpenAI platform account.

- [ ] Create an [OpenAI platform account](https://platform.openai.com) (or use an existing one)
- [ ] Generate an API key with access to:
  - `gpt-4.1-mini` (chat completions)
  - `text-embedding-3-small` (embeddings)
- [ ] Set a **monthly spending limit** in the OpenAI dashboard
  - Recommended starting limit: **$10–20/month** during development
  - Architecture estimate at moderate traffic: ~$3–5/month
- [ ] Record the API key securely — it will be added to Fly.io secrets and local `.env`

> **Why GPT-4.1-mini?** Best tool-calling reliability at $0.40/$1.60 per 1M tokens with a 1M context window. See [00-master-overview.md](./00-master-overview.md) for the full provider comparison.

---

## 2. Enable pgvector on Fly.io PostgreSQL

The RAG pipeline stores document embeddings in PostgreSQL using the pgvector extension. This must be enabled manually on the production database.

- [ ] Check if your Fly.io Postgres image supports pgvector:
  ```bash
  flyctl ssh console --app lifeplace-db
  psql -U postgres -c "SELECT * FROM pg_available_extensions WHERE name = 'vector';"
  ```
- [ ] If available, enable it:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  ```
- [ ] Verify it works:
  ```sql
  SELECT '[1,2,3]'::vector;
  ```
- [ ] If pgvector is **not** available on your current image, upgrade to a Postgres image that bundles it:
  - `flyio/postgres-flex` images include pgvector
  - Check current image: `flyctl postgres config show --app lifeplace-db`

> pgvector is also needed in local development. Install locally via:
> - **macOS (Homebrew):** `brew install pgvector` then `CREATE EXTENSION vector;` in your local DB
> - **Docker:** Use `ankane/pgvector` image

---

## 3. Environment Variables & Secrets

### 3.1 Fly.io Production Secrets

- [ ] Add the OpenAI API key:
  ```bash
  flyctl secrets set OPENAI_API_KEY=sk-... --app lifeplace-api
  ```
- No other new secrets needed — Redis, Sentry, Stripe, and database credentials are already configured.

### 3.2 Local Backend `.env`

- [ ] Add to `backend/.env`:
  ```env
  # AI Chat Assistant
  OPENAI_API_KEY=sk-...your-development-key...
  ```

### 3.3 Local Frontend `.env`

- [ ] **No changes needed.** The client-portal already has `VITE_API_URL` configured, and the `wsUrl.ts` utility derives WebSocket URLs from it. See [05-frontend-chat-ui.md Section 6](./05-frontend-chat-ui.md#6-websocket-url-utility).

---

## 4. Write the RAG Document Corpus

**This is the most time-consuming preparation task.** The RAG pipeline ingests static markdown documents into the vector store. The quality of the chat assistant is directly proportional to the quality and coverage of these documents.

### 4.1 Required Documents

Create markdown files in `backend/core/domains/ai_chat/documents/`:

| File | Contents | Priority |
|------|----------|----------|
| `faq.md` | Common client questions: pricing policies, cancellation, deposits, rescheduling, what's included, parking, catering restrictions, dress code, etc. | **High** |
| `booking-process.md` | Step-by-step explanation of how booking works at LifePlace — from inquiry to event day | **High** |
| `venues.md` | Detailed descriptions of each venue: capacity, amenities, layout, rules, best-suited events, photo context | **High** |
| `packages-guide.md` | Detailed write-ups supplementing DB fields — what's included in setup, teardown, staffing, AV equipment, etc. | **High** |
| `event-types.md` | What to expect for each event type: weddings, corporate events, debuts, birthdays, christenings, etc. | Medium |
| `policies.md` | Payment terms, cancellation policy, force majeure, time limits, damage deposit, overtime charges | Medium |
| `add-ons-guide.md` | Detailed descriptions of add-on services beyond their DB names/prices | Medium |

### 4.2 Document Authoring Guidelines

Follow these guidelines from [03-rag-pipeline.md](./03-rag-pipeline.md):

- Write in **natural question-answer style** where possible ("Q: Can I bring my own caterer? A: Yes, LifePlace allows...")
- Use **clear headings** (##, ###) — the chunking pipeline uses these as split boundaries
- Keep individual sections to **300–500 words** for optimal chunk sizing
- Avoid tables with many columns — they chunk poorly
- Include **keywords** that clients would actually search for (e.g., "parking", "cancellation", "deposit refund")
- Front-load the most important information in each section

### 4.3 Content Sourcing

Potential sources for document content:
- [ ] Existing LifePlace website copy
- [ ] Email templates already used for client inquiries
- [ ] Staff knowledge (common questions they answer repeatedly)
- [ ] Existing contracts/terms and conditions
- [ ] Social media FAQ highlights

---

## 5. Write the Agent System Prompt

The PydanticAI agent's `instructions` parameter defines the assistant's personality, capabilities, and guardrails. This is a content/editorial decision.

### 5.1 Key Decisions

- [ ] **Tone and personality:** Warm and professional? Casual and friendly? Formal?
- [ ] **Name:** "LifePlace Assistant" (current default) or something else?
- [ ] **Language:** English only, or should it handle Filipino/Tagalog queries?
- [ ] **Escalation trigger:** When should the assistant say "Let me connect you with our team"?

### 5.2 Guardrails to Define

- [ ] The assistant must **never fabricate** package details, prices, or availability — always use tools
- [ ] The assistant must **never promise** specific discounts or negotiate pricing
- [ ] The assistant must **never disclose** internal business logic, cost margins, or staff information
- [ ] The assistant should **redirect** medical/legal/safety questions to appropriate contacts
- [ ] Define a maximum conversation scope — at what point suggest booking or contacting directly?

### 5.3 Draft Template

```
You are the LifePlace event assistant. You help prospective clients explore
venues, discover event packages, and prepare for booking.

Rules:
- Always use your tools to look up packages, venues, pricing, and availability.
  Never guess or fabricate details.
- Be warm, helpful, and professional. Use a conversational but respectful tone.
- When you have enough information about what the client wants (event type,
  date, guest count, package preferences), suggest they start the booking
  process.
- If a question is outside your scope (legal, medical, detailed contract
  negotiation), politely suggest they contact the LifePlace team directly.
- Never discuss internal pricing logic, profit margins, or staff details.
- Keep responses concise — aim for 2-4 short paragraphs maximum.
```

- [ ] Review and finalize the system prompt before it goes into `agent_service.py`

---

## 6. Rate Limiting Decisions

The architecture supports configurable rate limits. Decide on thresholds before implementation.

| Setting | Recommended Default | Your Decision |
|---------|-------------------|---------------|
| Max messages per session | 100 | [ ] _________ |
| Max sessions per anonymous IP / day | 3 | [ ] _________ |
| Max sessions per authenticated user / day | 10 | [ ] _________ |
| Session expiry (inactive) | 24 hours | [ ] _________ |
| Max message length (characters) | 2,000 | [ ] _________ |

These values are configured in `settings.py` and the viewset throttle classes.

---

## 7. Frontend Content Decisions

### 7.1 Welcome Screen Suggestions

The `ChatWelcomeScreen` component displays 4 suggestion chips for first-time users. Current defaults:

1. "What kinds of events can I host?"
2. "Show me wedding packages"
3. "What venues do you have?"
4. "What's the booking process?"

- [ ] Review and finalize these 4 suggestions. They should represent the most common client entry points.

### 7.2 UI Copy

| Element | Current Default | Your Decision |
|---------|----------------|---------------|
| Widget header | "LifePlace Assistant" | [ ] _________ |
| Input placeholder | "Ask about events, packages, or venues..." | [ ] _________ |
| Welcome heading | "Hi! I'm the LifePlace Assistant" | [ ] _________ |
| Welcome subtext | "I can help you explore our venues, find the perfect package, and answer questions about your event." | [ ] _________ |

---

## 8. Admin CRM Visibility

The architecture includes an `AdminChatSessionViewSet` with conversation viewing and conversion stats. Decide on the scope.

- [ ] **Include admin chat visibility in Phase 1?** (recommended: yes, read-only)
- [ ] Admin actions needed:
  - [ ] View chat conversations (read-only)
  - [ ] View conversion statistics (sessions → bookings)
  - [ ] Flag/archive sessions
  - [ ] Export conversation logs
- [ ] Should admins receive notifications when a chat converts to a booking?

> This can be deferred to a later implementation phase if needed.

---

## 9. Notification Integration

The architecture's signals layer can notify admins of chat events. Decide what triggers notifications.

- [ ] **Chat → Booking conversion:** Notify admins when a chat session results in a booking?
  - Recommended: **Yes** — high-value signal for the sales team
- [ ] **High-volume sessions:** Alert when a single session exceeds N messages (potential frustrated user)?
  - Recommended: Optional, can defer
- [ ] **Daily digest:** Summary of chat sessions, conversion rates, popular questions?
  - Recommended: Defer to post-launch analytics

For each enabled notification, a `NotificationType` entry must be created in the database.

---

## 10. Post-Implementation Verification

These tasks happen **after code is written** but before going live:

### 10.1 Database

- [ ] Run migrations: `python manage.py makemigrations ai_chat && python manage.py migrate`
- [ ] Verify pgvector index was created: check for `documentchunk_embedding_hnsw_idx` in `\di` output

### 10.2 RAG Ingestion

- [ ] Place all authored documents in `backend/core/domains/ai_chat/documents/`
- [ ] Run the ingestion command: `python manage.py ingest_documents`
- [ ] Verify chunks were created: `python manage.py shell -c "from core.domains.ai_chat.models import DocumentChunk; print(DocumentChunk.objects.count())"`

### 10.3 Celery Beat Schedule

- [ ] Verify the two new beat entries are registered:
  - `ai_chat.cleanup_expired_sessions` (daily, analytics queue)
  - `ai_chat.ingest_documents` (weekly, analytics queue)

### 10.4 Smoke Testing

- [ ] Open client portal → click chat widget → send a message → verify streaming response
- [ ] Test anonymous session → login → verify session migration
- [ ] Test "Start Booking" flow → verify BookingSession is pre-populated
- [ ] Test tool calls: ask about packages, venues, pricing → verify live data appears
- [ ] Test RAG: ask an FAQ question → verify document-sourced answer
- [ ] Test rate limits: exceed message limit → verify graceful error

### 10.5 Monitoring

- [ ] Verify Sentry captures chat errors with `chat_session_id` context tag
- [ ] Check OpenAI usage dashboard after smoke testing to validate cost estimates
- [ ] Review admin stats endpoint: `GET /api/ai-chat/admin/sessions/stats/`

---

## Summary: Priority Order

| Priority | Task | Effort | Blocks |
|----------|------|--------|--------|
| **P0** | OpenAI account + API key | 10 min | All backend AI work |
| **P0** | Enable pgvector on production DB | 15 min | RAG pipeline, migrations |
| **P0** | Add Fly.io secrets | 5 min | Production deployment |
| **P1** | Write RAG document corpus | **4–8 hours** | RAG quality, FAQ accuracy |
| **P1** | Write agent system prompt | 1–2 hours | Agent behavior, tone |
| **P2** | Rate limiting decisions | 15 min | Configuration values |
| **P2** | Frontend content decisions | 30 min | UI copy, welcome screen |
| **P3** | Admin CRM scope decision | 15 min | Admin viewset implementation |
| **P3** | Notification integration decisions | 15 min | Signal handlers |

**Total estimated manual preparation time: 6–12 hours**, with the document corpus being the dominant task.

---

## References

- [00-master-overview.md](./00-master-overview.md) — System architecture and implementation phases
- [01-backend-architecture.md](./01-backend-architecture.md) — Backend domain, models, services, settings
- [03-rag-pipeline.md](./03-rag-pipeline.md) — Document ingestion, chunking, hybrid search
- [05-frontend-chat-ui.md](./05-frontend-chat-ui.md) — Frontend components, hooks, WebSocket utility
