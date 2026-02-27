# AI Chat Assistant — Master Architecture Overview

**Status:** Design Proposal
**Date:** 2026-02-19
**Author:** Architecture review with Claude Code

---

## What This Is

A conversational AI assistant embedded in the LifePlace client portal that serves two purposes:

1. **Knowledge Assistant** — Answers questions about venues, packages, policies, the booking process, and FAQs by retrieving content from company documentation.
2. **Package Curator** — Helps clients discover and assemble event packages based on their preferences (event type, guest count, style, budget), using live production data for accurate recommendations and pricing.

The assistant culminates in a **one-click bridge to the existing booking flow**, where accumulated preferences pre-populate a BookingSession so the client can review, confirm, and pay without re-entering information.

---

## Architecture Documents

| # | Document | What It Covers |
|---|----------|----------------|
| 01 | [Backend Architecture](./01-backend-architecture.md) | New `ai_chat` Django domain: models, services, views, serializers, WebSocket consumer, permissions, signals, configuration, async patterns |
| 02 | [Tool Schema Design](./02-tool-schema-design.md) | Every tool the LLM can call: `query_packages`, `query_addons`, `query_venues`, `check_availability`, `calculate_pricing`, `search_faq`, `get_event_types`, `get_event_type_details`, `update_preferences` — with exact signatures, return shapes, and interaction patterns |
| 03 | [RAG Pipeline](./03-rag-pipeline.md) | Document ingestion (chunking, embedding), pgvector storage, hybrid search (vector + full-text with Reciprocal Rank Fusion), management commands, document authoring guidelines |
| 04 | [Chat-to-Booking Bridge](./04-chat-to-booking-bridge.md) | How `ChatSession.extracted_preferences` maps to `BookingSession.booking_data`, step pre-population, landing step determination, edge cases, conversion tracking |
| 05 | [Frontend Chat UI](./05-frontend-chat-ui.md) | React component tree, ChatWidget, ChatPanel, rich message rendering, WebSocket streaming, useChat hook, ChatContext, booking handoff UX, accessibility, mobile responsiveness |
| 06 | [Implementation Preparation](./06-implementation-preparation.md) | Manual preparation checklist: OpenAI account, pgvector setup, env vars, RAG document corpus authoring, system prompt, rate limits, frontend copy, admin scope, post-deployment verification |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CLIENT PORTAL (React)                            │
│                                                                         │
│  ┌──────────────┐    ┌──────────────────────────────────────────────┐   │
│  │ ChatWidget   │───▶│ ChatPanel                                    │   │
│  │ (FAB button) │    │  ├── ChatWelcomeScreen (suggestions)         │   │
│  └──────────────┘    │  ├── ChatMessageList                         │   │
│                      │  │     ├── ChatMessageBubble (text)          │   │
│                      │  │     ├── ChatPackageCard (rich card)       │   │
│                      │  │     ├── ChatPricingBreakdown (table)      │   │
│                      │  │     └── ChatBookingPrompt (CTA)           │   │
│                      │  ├── ChatTypingIndicator                     │   │
│                      │  └── ChatInput                               │   │
│                      └──────────────────────────────────────────────┘   │
│                           │                        │                    │
│                    HTTP POST             WebSocket (streaming)           │
│                    (fallback)            ws://host/ws/ai-chat/{id}/     │
└───────────────────────────┼────────────────────────┼────────────────────┘
                            │                        │
┌───────────────────────────┼────────────────────────┼────────────────────┐
│                        BACKEND (Django / Daphne ASGI)                   │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     ai_chat domain                                │  │
│  │                                                                   │  │
│  │  Views (DRF)              │  Consumers (Channels)                 │  │
│  │  POST /sessions/          │  AiChatConsumer                       │  │
│  │  POST /sessions/{id}/     │    ├── connect (JWT auth)             │  │
│  │       messages/           │    ├── receive (user message)         │  │
│  │  POST /sessions/{id}/     │    └── stream_response (tokens)       │  │
│  │       start-booking/      │                                       │  │
│  │                           │                                       │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                    ChatService                              │  │  │
│  │  │  1. Validate session                                        │  │  │
│  │  │  2. Save user ChatMessage                                   │  │  │
│  │  │  3. Load llm_message_history                                │  │  │
│  │  │  4. Run PydanticAI agent ─────────────────────────┐         │  │  │
│  │  │  5. Save assistant ChatMessage                     │         │  │  │
│  │  │  6. Update extracted_preferences                   │         │  │  │
│  │  │  7. Return response                                │         │  │  │
│  │  └────────────────────────────────────────────────────┼─────┘  │  │
│  │                                                       │        │  │
│  │  ┌────────────────────────────────────────────────────▼─────┐  │  │
│  │  │              PydanticAI Agent                             │  │  │
│  │  │  Model: GPT-4.1-mini (via OpenAI SDK)                    │  │  │
│  │  │  Context: ChatDeps (session_id, client_id, preferences)  │  │  │
│  │  │                                                          │  │  │
│  │  │  Tools available:                                        │  │  │
│  │  │  ┌──────────────────┐  ┌───────────────────────┐         │  │  │
│  │  │  │ query_packages   │  │ search_faq            │         │  │  │
│  │  │  │ query_addons     │  │ (RAG hybrid search)   │         │  │  │
│  │  │  │ query_venues     │  │                       │         │  │  │
│  │  │  │ check_avail.     │  │   ┌─── pgvector ───┐  │         │  │  │
│  │  │  │ calculate_pricing│  │   │ cosine search   │  │         │  │  │
│  │  │  │ get_event_types  │  │   │ + FTS ranking   │  │         │  │  │
│  │  │  │ update_prefs     │  │   │ + RRF fusion    │  │         │  │  │
│  │  │  └────────┬─────────┘  │   └────────────────┘  │         │  │  │
│  │  │           │            └───────────────────────┘         │  │  │
│  │  └───────────┼──────────────────────────────────────────────┘  │  │
│  │              │                                                 │  │
│  └──────────────┼─────────────────────────────────────────────────┘  │
│                 │                                                     │
│  ┌──────────────▼─────────────────────────────────────────────────┐  │
│  │                  EXISTING DOMAIN SERVICES                      │  │
│  │                                                                │  │
│  │  products/          venues/           sales/                   │  │
│  │  ├─ ProductOption   ├─ Venue          ├─ PricingCalculation    │  │
│  │  └─ ProductCategory └─ VenueBlocked     Service               │  │
│  │                       Date                                     │  │
│  │  events/            bookingflow/                               │  │
│  │  ├─ EventType       ├─ BookingFlow                             │  │
│  │  └─ Event           ├─ BookingSession  ◀── BRIDGE creates this │  │
│  │                     └─ BookingFlowStep                         │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                     PostgreSQL (Fly.io)                         │  │
│  │                                                                │  │
│  │  ┌─ ChatSession ──┐  ┌─ DocumentChunk ─────────────────────┐  │  │
│  │  │  id (UUID)      │  │  content (text)                     │  │  │
│  │  │  client (FK)    │  │  embedding (vector, 1536-dim)       │  │  │
│  │  │  status         │  │  search_vector (tsvector)           │  │  │
│  │  │  extracted_     │  │  source_document                    │  │  │
│  │  │    preferences  │  │  category                           │  │  │
│  │  │  llm_message_   │  │                                     │  │  │
│  │  │    history      │  │  Indexes:                           │  │  │
│  │  │  booking_       │  │    HNSW (cosine) on embedding       │  │  │
│  │  │    session (FK) │  │    GIN on search_vector             │  │  │
│  │  └────────────────┘  └─────────────────────────────────────┘  │  │
│  │                                                                │  │
│  │  ┌─ ChatMessage ──┐  ┌─ Existing tables ──────────────────┐  │  │
│  │  │  session (FK)   │  │  ProductOption, Venue, EventType,  │  │  │
│  │  │  role           │  │  BookingFlow, BookingSession,      │  │  │
│  │  │  content        │  │  BookingFlowStep, PaymentSettings  │  │  │
│  │  │  metadata (JSON)│  │  ... (20 domains, unchanged)       │  │  │
│  │  └────────────────┘  └────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **LLM** | GPT-4.1-mini ($0.40/$1.60 per 1M tokens) | Best tool-calling reliability, 1M context window, purpose-built for agentic workflows. Monthly cost at expected volume: $5-15 |
| **Agent framework** | PydanticAI v1.62.0 | Type-safe tools via decorators, async-native (fits Django ASGI), structured output via Pydantic models, conversation history management built-in. Lighter than LangChain |
| **Embeddings** | OpenAI text-embedding-3-small (1536 dims, $0.02/1M tokens) | Proven quality, negligible cost for the document corpus |
| **Vector storage** | pgvector in existing PostgreSQL | Zero new infrastructure. HNSW index for cosine similarity. Supports filtered queries (pgvector 0.8.0+ iterative scan) |
| **Search strategy** | Hybrid (pgvector + PostgreSQL FTS) via RRF | 18-22% better retrieval than vector-only. Both capabilities already in PostgreSQL |
| **Streaming** | Django Channels WebSocket (already in stack) | Real-time token streaming, same pattern as existing `MessagingConsumer` |
| **Frontend** | MUI components, React Query, Axios, TypeScript | Matches every existing convention in the client-portal codebase |
| **Provider flexibility** | OpenAI SDK directly (liteLLM optional later) | At current volume, provider switching isn't needed. PydanticAI supports 15+ providers natively if migration is needed |

---

## Data Flow: Complete User Journey

```
1. USER OPENS CHAT
   └── ChatWidget FAB clicked
       └── ChatPanel renders ChatWelcomeScreen with suggestions

2. USER SENDS FIRST MESSAGE
   └── "I want a rustic wedding for 150 guests"
       └── POST /api/ai-chat/public/sessions/ (creates ChatSession)
       └── WebSocket connects to ws://host/ws/ai-chat/{session_id}/
       └── ChatService.send_message():
           ├── Saves ChatMessage(role='user')
           ├── Runs PydanticAI agent
           │   ├── Agent calls update_preferences(event_type="wedding", guest_count=150)
           │   ├── Agent calls query_packages(event_type="wedding", min_guests=150)
           │   └── Agent calls query_venues(min_capacity=150)
           ├── Agent responds with package recommendations
           ├── Saves ChatMessage(role='assistant', metadata={packages: [...]})
           └── Streams tokens via WebSocket

3. USER REFINES
   └── "How much is the Gold Package with the pool area?"
       └── Agent calls calculate_pricing(package_ids=[1], ...)
       └── Response includes PricingBreakdown in metadata

4. USER ASKS FAQ
   └── "What's the cancellation policy?"
       └── Agent calls search_faq(query="cancellation policy", category="policy")
       └── RAGService.hybrid_search():
           ├── Generates query embedding via OpenAI
           ├── pgvector cosine similarity → top 40 candidates
           ├── PostgreSQL FTS ranking → top 40 candidates
           ├── Reciprocal Rank Fusion → top 5 merged
           └── Returns formatted context
       └── Agent synthesizes answer from retrieved documentation

5. USER READY TO BOOK
   └── Agent includes booking_prompt: true in response metadata
   └── ChatBookingPrompt renders "Start Booking" button

6. USER CLICKS "START BOOKING"
   └── If not authenticated → ChatAuthPrompt (login/register)
   └── If authenticated:
       └── POST /api/ai-chat/sessions/{id}/start-booking/
       └── BookingBridgeService.create_booking_from_chat():
           ├── Resolves BookingFlow for event type
           ├── Maps extracted_preferences → booking_data:
           │   ├── selected_packages from recommended_packages
           │   ├── selected_addons from recommended_addons
           │   ├── step_N data for venue, date/time, etc.
           │   └── special_requests
           ├── Creates BookingSession via existing BookingSessionService
           ├── Sets current_step to pricing_summary (or first incomplete step)
           ├── Marks completed steps (intro, venue, package, addon)
           └── Links ChatSession → BookingSession

7. HANDOFF TO BOOKING FLOW
   └── Frontend navigates to /booking?session={booking_session_uuid}
   └── Existing BookingContext loads the pre-populated session
   └── Client lands on pricing summary, reviews, accepts terms, pays
   └── Existing BookingSessionService.complete_booking() handles everything
```

---

## What Is New vs. What Is Unchanged

### New (all in `ai_chat` domain + frontend chat components)

| Component | Location | Description |
|-----------|----------|-------------|
| `ChatSession` model | `ai_chat/models.py` | Conversation state + preferences |
| `ChatMessage` model | `ai_chat/models.py` | Display messages |
| `DocumentChunk` model | `ai_chat/models.py` | RAG vector store |
| `ChatService` | `ai_chat/services/` | Orchestrates LLM calls |
| `AgentService` | `ai_chat/services/` | PydanticAI agent + tools |
| `RAGService` | `ai_chat/services/` | Hybrid search |
| `EmbeddingService` | `ai_chat/services/` | Document ingestion |
| `BookingBridgeService` | `ai_chat/services/` | Chat → Booking conversion |
| `PreferenceService` | `ai_chat/services/` | Preference extraction |
| 9 tool functions | `ai_chat/tools/` | LLM-callable tools |
| `AiChatConsumer` | `ai_chat/consumers.py` | WebSocket streaming |
| Views + Serializers | `ai_chat/views.py` | REST API endpoints |
| `ChatWidget` + components | `client-portal/components/chat/` | UI components |
| `useChat` hook | `client-portal/hooks/` | React hook |
| `ChatContext` | `client-portal/contexts/` | State provider |
| `chatApi` | `client-portal/apis/` | API layer |
| Company docs (markdown) | `ai_chat/documents/` | FAQ, policy, process docs |

### Unchanged (zero modifications)

| Component | Why |
|-----------|-----|
| `BookingFlow` model + service | Bridge creates sessions via existing API |
| `BookingSession` model + service | Pre-populated `booking_data` uses existing schema |
| `BookingFlowStep` validation | Standard step validation applies as-is |
| `PricingCalculationService` | Called via tool, not modified |
| `ProductOption` / `Venue` models | Queried via tools, not modified |
| `Event` creation on booking completion | Existing `complete_booking()` handles it |
| Payment processing | Existing Stripe integration handles it |
| Email notifications | Existing `CommunicationService` handles it |
| Frontend booking flow components | Load pre-populated session like any other |
| All other 20 domains | No cross-domain modifications |

---

## Infrastructure Impact

| Resource | Change |
|----------|--------|
| **PostgreSQL** | +3 tables (ChatSession, ChatMessage, DocumentChunk). pgvector extension enabled. ~1MB for document embeddings |
| **Fly.io** | No new services. Runs on existing Daphne process |
| **External APIs** | OpenAI API key needed (GPT-4.1-mini + embeddings) |
| **Environment variables** | +5 new env vars (API key, model config, rate limits) |
| **Python dependencies** | +3 packages (pydantic-ai, openai, pgvector) |
| **Monthly cost** | ~$5-15 for LLM API at expected volume. Embeddings negligible |

---

## Implementation Phases

### Phase 1: Foundation (Backend Core)
- Create `ai_chat` domain with models and migrations
- Implement `ChatService`, `AgentService` with basic tools (`get_event_types`, `query_packages`, `query_venues`)
- HTTP-only API (no WebSocket yet)
- Basic system prompt
- Unit tests for tools and services

### Phase 2: RAG Pipeline
- Author company documents (markdown files)
- Implement `EmbeddingService` with chunking and ingestion
- Implement `RAGService` with hybrid search
- Add `search_faq` tool
- Run `ingest_documents` management command

### Phase 3: Pricing + Preferences
- Implement `calculate_pricing` tool (wraps `PricingCalculationService`)
- Implement `update_preferences` tool and `PreferenceService`
- Implement `check_availability` tool
- Refine system prompt based on testing

### Phase 4: Frontend Chat UI
- Implement `ChatWidget`, `ChatPanel`, `ChatInput`, `ChatMessageBubble`
- Implement `useChat` hook and `ChatContext`
- Implement `chatApi` layer
- HTTP-only integration (send message, get response)

### Phase 5: WebSocket Streaming
- Implement `AiChatConsumer`
- Add WebSocket connection to `useChat` hook
- Implement `ChatTypingIndicator` and streaming display
- Fallback to HTTP when WebSocket unavailable

### Phase 6: Booking Bridge
- Implement `BookingBridgeService`
- Implement `ChatBookingPrompt` and `ChatAuthPrompt` components
- Implement `start-booking` endpoint
- Test end-to-end flow: chat → bridge → booking → payment

### Phase 7: Rich Messages + Polish
- Implement `ChatPackageCard`, `ChatPricingBreakdown`, `ChatWelcomeScreen`
- Add metadata to assistant responses (package cards, pricing tables)
- Mobile responsiveness testing
- Accessibility audit
- Rate limiting and security hardening

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM hallucinates prices | Users see wrong pricing | **Pricing tool only** — system prompt strictly forbids price estimation. `calculate_pricing` calls `PricingCalculationService` for verified numbers |
| LLM recommends unavailable dates | User frustration at booking step | `check_availability` tool exists. System prompt instructs "never promise availability without checking." Date/time step in booking flow validates independently |
| OpenAI API outage | Chat stops working | Return `LLMProviderError` (502). Frontend shows "temporarily unavailable." Fallback model configurable via `AI_CHAT_FALLBACK_MODEL` env var |
| Stale FAQ content | Wrong policy info served | RAG only ingests static docs. Live data (prices, packages, availability) comes from tools querying the database directly |
| Anonymous abuse (spam) | Cost and rate limit issues | Rate limiting: 10 msgs/min anon, 20 msgs/min auth. Session creation throttled to 5/hour. Max 100 messages per session |
| Prompt injection attempts | LLM reveals system prompt or tool schemas | System prompt includes behavioral boundaries. Tools are read-only. No tool can modify production data. PydanticAI validates tool parameters |
| Context window exhaustion in long conversations | Degraded responses | PydanticAI `history_processors` can trim old messages. GPT-4.1-mini has 1M token context — sufficient for hundreds of conversation turns |

---

## Supplementary: Gaps Identified in Post-Audit

The following cross-cutting concerns were identified after auditing the architecture documents against the actual codebase. Each gap references existing infrastructure that the `ai_chat` domain must integrate with.

---

### Gap 1: Anonymous-to-Authenticated Session Migration (HIGH)

**What exists in the codebase:** The booking flow supports `client_id=None` for guest sessions. The contact info step creates or links a `User` from the guest's email. `AuthContext.tsx` handles post-login state restoration.

**What the chat docs missed:** No pattern for migrating an anonymous chat session to an authenticated user when a guest logs in mid-conversation. If a user starts chatting anonymously, then logs in to start a booking, the chat session should transfer to their account.

**Resolution — add to `ChatSession` model (01-backend-architecture.md, Section 3.1):**

```python
# On ChatSession model:
@classmethod
def migrate_to_user(cls, session_id, user):
    """
    Migrate an anonymous chat session to an authenticated user.
    Called post-login when localStorage contains a chat session ID.
    """
    session = cls.objects.get(id=session_id, client__isnull=True)
    session.client = user
    session.save(update_fields=['client', 'updated_at'])
    return session
```

**Resolution — add to frontend `useChat` hook (05-frontend-chat-ui.md, Section 6):**

```typescript
// In useChat, after authentication state changes:
useEffect(() => {
  if (isAuthenticated && sessionId) {
    // Migrate anonymous session to authenticated user
    chatApi.migrateSession(sessionId).catch(() => {
      // Session may already be owned or expired — ignore
    });
  }
}, [isAuthenticated, sessionId]);
```

**Resolution — add API endpoint (01-backend-architecture.md, Section 6.2):**

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/ai-chat/sessions/{id}/migrate/` | IsAuthenticated | Link anonymous session to logged-in user |

---

### Gap 2: Admin Visibility and Chat Analytics (MEDIUM)

**What exists in the codebase:** `MessageThreadAdminViewSet` gives admins read/write access to all messaging threads with filtering, assignment, and stats endpoints. Admins can manage support inquiries via `AdminSupportInquiryViewSet`.

**What the chat docs missed:** No admin-facing viewset for chat sessions. Admins cannot view conversations, track conversion metrics, or identify sessions that need human escalation.

**Resolution — add to 01-backend-architecture.md, Section 6:**

```python
class AdminChatSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin-only read access to all chat sessions for analytics and support."""
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'client__first_name', 'client__last_name', 'client__email']
    ordering_fields = ['created_at', 'updated_at', 'message_count']

    def get_queryset(self):
        return ChatSession.objects.all().select_related('client', 'booking_session')

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return conversion funnel metrics."""
        total = ChatSession.objects.count()
        converted = ChatSession.objects.filter(status='completed', booking_session__isnull=False).count()
        paid = ChatSession.objects.filter(booking_session__is_completed=True).count()
        return Response({
            'total_sessions': total,
            'converted_to_booking': converted,
            'completed_payment': paid,
            'conversion_rate': round(converted / total * 100, 1) if total else 0,
        })
```

**URL registration:**
```python
router.register(r'admin/sessions', AdminChatSessionViewSet, basename='admin-chat-session')
```

---

### Gap 3: Celery Task Integration (MEDIUM)

**What exists in the codebase:** Celery is configured with Redis broker, 9 dedicated queues (`notifications`, `communications`, `analytics`, etc.), 30+ beat-scheduled tasks, and a Dead Letter Queue (`FailedTask` model) for monitoring failed tasks.

**What the chat docs missed:** The `ai_chat` domain should use Celery for async operations rather than running them inline. Specific tasks needed:

**Resolution — add `ai_chat/tasks.py`:**

```python
# tasks.py
from celery import shared_task
import logging

logger = logging.getLogger(__name__)

@shared_task(name='ai_chat.cleanup_expired_sessions', queue='analytics')
def cleanup_expired_sessions():
    """Hourly: mark expired chat sessions."""
    from .services.chat_service import ChatService
    count = ChatService.cleanup_expired_sessions()
    logger.info(f"Cleaned up {count} expired chat sessions")

@shared_task(name='ai_chat.ingest_documents', queue='analytics')
def ingest_documents_task():
    """On-demand: re-embed all company documents."""
    import asyncio
    from .services.embedding_service import EmbeddingService
    count = asyncio.run(EmbeddingService.ingest_all_documents())
    logger.info(f"Ingested {count} document chunks")

@shared_task(name='ai_chat.track_conversion', queue='analytics')
def track_conversion(chat_session_id, booking_session_id):
    """Async: log conversion analytics after chat→booking bridge."""
    logger.info(f"Chat {chat_session_id} converted to booking {booking_session_id}")
```

**Add to Celery beat schedule (`celery.py`):**
```python
'cleanup-expired-chat-sessions': {
    'task': 'ai_chat.cleanup_expired_sessions',
    'schedule': 60 * 60,  # Hourly
    'options': {'queue': 'analytics'},
},
```

**Add task routing:**
```python
# In celery.py task_routes:
'core.domains.ai_chat.tasks.*': {'queue': 'analytics'},
```

---

### Gap 4: Sentry Error Context (LOW)

**What exists in the codebase:** Sentry SDK is initialized in `settings.py` with Django, Redis, and Celery integrations. Release tracking via `SENTRY_RELEASE` env var. Production-only.

**What the chat docs missed:** LLM provider errors, tool execution failures, and streaming errors should be tagged with chat-specific context for debugging.

**Resolution — add to `ChatService.send_message()`:**

```python
import sentry_sdk

try:
    result = await agent.run(prompt, deps=deps, message_history=history)
except Exception as e:
    sentry_sdk.set_context("ai_chat", {
        "session_id": str(session_id),
        "user_id": str(client.id) if client else "anonymous",
        "message_count": session.message_count,
    })
    sentry_sdk.capture_exception(e)
    raise LLMProviderError()
```

---

### Gap 5: Input Sanitization (HIGH)

**What exists in the codebase:** `core/utils/security.py` provides `sanitize_input()` for XSS prevention (strips HTML, removes null bytes), `validate_email_format()`, and custom rate throttles. The messaging domain uses these on user-provided content.

**What the chat docs missed:** Chat messages are user-provided text that must be sanitized before storage and display. The `ChatMessageCreateSerializer` in 01-backend-architecture.md does not call `sanitize_input()`.

**Resolution — add validation to serializer (01-backend-architecture.md, Section 6.4):**

```python
class ChatMessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=2000)

    def validate_content(self, value):
        from core.utils.security import sanitize_input
        sanitized = sanitize_input(value, max_length=2000, allow_html=False)
        if not sanitized or not sanitized.strip():
            raise serializers.ValidationError("Message cannot be empty.")
        return sanitized
```

---

### Gap 6: WebSocket URL Construction (MEDIUM)

**What exists in the codebase:** Frontend uses `VITE_API_URL` for HTTP. The existing `useAvailabilityWebSocket.ts` hook constructs WebSocket URLs by parsing `VITE_API_URL` with `new URL()` and replacing the protocol. No centralized WebSocket URL helper exists. WebSocket connections are validated against `ALLOWED_HOSTS` via `AllowedHostsOriginValidator` in `asgi.py`.

**What the chat docs missed:** The `useChat` hook originally referenced `import.meta.env.VITE_WS_URL` which doesn't exist in the environment configuration.

**Resolution — add WebSocket URL utility (05-frontend-chat-ui.md, Section 6):**

```typescript
// utils/wsUrl.ts — follows the same pattern as useAvailabilityWebSocket.ts
export function buildWsUrl(path: string, token?: string): string {
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const url = new URL(apiUrl);
  const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  let wsUrl = `${protocol}//${url.host}${path}`;
  if (token) {
    wsUrl += `?token=${encodeURIComponent(token)}`;
  }
  return wsUrl;
}

// Usage in useChat:
const url = buildWsUrl(`/ws/ai-chat/${sessionId}/`, tokens?.access);
```

No additional `.env` variable needed — the URL is derived from the existing `VITE_API_URL`.

---

### Gap 7: Notification System Integration (MEDIUM)

**What exists in the codebase:** `NotificationType` model supports 9 categories (SYSTEM, EVENT, TASK, PAYMENT, etc.) with per-type templates and per-user delivery preferences (`NotificationPreference`). The notification system fires on events, payments, contracts, and communications.

**What the chat docs missed:** No notification type defined for chat-to-booking conversion. Admins should be notified when a chat leads to a new booking (same as the existing "new lead" pattern).

**Resolution — add to signals (01-backend-architecture.md, Section 10):**

```python
@receiver(post_save, sender='ai_chat.ChatSession')
def notify_admins_on_conversion(sender, instance, **kwargs):
    """Notify admins when a chat session converts to a booking."""
    if instance.status == 'completed' and instance.booking_session:
        from core.domains.notifications.services import NotificationService

        NotificationService.notify_admins(
            title='Chat converted to booking',
            content=(
                f'{instance.client.get_display_name() if instance.client else "Anonymous user"} '
                f'started a booking from chat session.'
            ),
            category='WORKFLOW',
        )
```

---

### Gap 8: Conversation History Management (MEDIUM)

**What the chat docs missed:** No explicit strategy for managing `llm_message_history` growth in long conversations. GPT-4.1-mini has a 1M token context window, but history management prevents cost creep and latency.

**Resolution — add history processor to `AgentService` (01-backend-architecture.md, Section 4.2):**

```python
from pydantic_ai.messages import ModelMessage

def trim_old_messages(messages: list[ModelMessage]) -> list[ModelMessage]:
    """
    Keep system prompt + last 20 message pairs.
    Preserves tool call/result pairing integrity.
    """
    if len(messages) <= 42:  # system + 20 pairs + buffer
        return messages

    # Always keep the first message (system prompt)
    system = messages[:1]
    recent = messages[-40:]  # Last 20 pairs (user+assistant)
    return system + recent

agent = Agent(
    'openai:gpt-4.1-mini',
    deps_type=ChatDeps,
    output_type=str,
    instructions="...",
    retries=2,
    history_processors=[trim_old_messages],
)
```

---

### Gap 9: Token Usage and Cost Tracking (LOW)

**What the chat docs missed:** No mechanism to track per-session token usage for cost monitoring and budget alerting.

**Resolution — add to `ChatSession` model:**

```python
# On ChatSession model:
total_input_tokens = models.PositiveIntegerField(default=0)
total_output_tokens = models.PositiveIntegerField(default=0)
total_tool_calls = models.PositiveIntegerField(default=0)
```

**Update after each agent run in `ChatService`:**

```python
# PydanticAI RunResult exposes usage data:
result = await agent.run(prompt, deps=deps, message_history=history)

session.total_input_tokens += result.usage().request_tokens or 0
session.total_output_tokens += result.usage().response_tokens or 0
session.total_tool_calls += len([m for m in result.new_messages() if hasattr(m, 'tool_name')])
session.save(update_fields=['total_input_tokens', 'total_output_tokens', 'total_tool_calls'])
```

---

### Gap 10: Markdown Rendering in Assistant Messages (LOW)

**What the chat docs missed:** LLM responses often contain markdown (bold, lists, links). The frontend `ChatMessageBubble` renders with `whiteSpace: 'pre-wrap'` which does not handle markdown formatting.

**Resolution — add to 05-frontend-chat-ui.md, Section 8.3:**

Use a lightweight markdown renderer. The codebase does not currently use one, so add `react-markdown` (small bundle, no heavy dependencies):

```typescript
// In ChatMessageBubble.tsx, for assistant messages:
import ReactMarkdown from 'react-markdown';

{message.role === 'assistant' ? (
  <ReactMarkdown
    components={{
      p: ({ children }) => <Typography variant="body2" sx={{ mb: 1 }}>{children}</Typography>,
      li: ({ children }) => <Typography component="li" variant="body2">{children}</Typography>,
      strong: ({ children }) => <strong>{children}</strong>,
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
      ),
    }}
  >
    {message.content}
  </ReactMarkdown>
) : (
  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
    {message.content}
  </Typography>
)}
```

---

### Gap Summary

| # | Gap | Severity | Document to Update |
|---|-----|----------|-------------------|
| 1 | Anonymous → authenticated session migration | HIGH | 01-backend, 05-frontend |
| 2 | Admin viewset and conversion analytics | MEDIUM | 01-backend |
| 3 | Celery task infrastructure | MEDIUM | 01-backend |
| 4 | Sentry error context tagging | LOW | 01-backend |
| 5 | Input sanitization via `sanitize_input()` | HIGH | 01-backend |
| 6 | WebSocket URL construction utility | MEDIUM | 05-frontend |
| 7 | Notification system integration | MEDIUM | 01-backend |
| 8 | Conversation history trimming strategy | MEDIUM | 01-backend |
| 9 | Token usage and cost tracking | LOW | 01-backend |
| 10 | Markdown rendering in assistant messages | LOW | 05-frontend |

---

## Key Design Principles

1. **Additive, not invasive.** The entire feature lives in a new domain. Zero existing code is modified.
2. **Tools are the truth.** The LLM never guesses data. All facts come from tool calls against production data.
3. **Preferences accumulate.** Each conversation turn can add to `extracted_preferences`. The bridge maps whatever is available.
4. **Graceful degradation.** Missing preferences don't block booking — they just mean the user fills in more steps manually.
5. **Existing patterns everywhere.** DDD domains, static-method services, 3-tier serializers, JWT auth, Channels WebSocket, React Query hooks, MUI components — nothing new to learn.
