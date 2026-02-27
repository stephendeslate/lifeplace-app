# AI Chat Assistant — Backend Architecture Design

**Document:** 01-backend-architecture.md
**Part of:** [AI Chat Assistant Architecture](./00-master-overview.md)
**Status:** Design Proposal
**Date:** 2026-02-19

---

## 1. Overview

This document defines the backend architecture for the AI chat assistant, a new Django domain (`ai_chat`) that enables conversational package curation and FAQ assistance for LifePlace clients. The design follows every existing convention in the codebase — DDD structure, static-method services, DRF ViewSets, JWT auth, and Channels WebSocket infrastructure.

---

## 2. New Domain: `core.domains.ai_chat`

### 2.1 File Layout

Following the established domain pattern (see `messaging/`, `bookingflow/`, `communications/`):

```
backend/core/domains/ai_chat/
├── __init__.py
├── apps.py                      # AppConfig with ready() for signal registration
├── models.py                    # ChatSession, ChatMessage, DocumentChunk
├── serializers.py               # 3-tier serializers (list, detail, create)
├── views.py                     # ChatSessionViewSet + public endpoints
├── services/
│   ├── __init__.py
│   ├── chat_service.py          # Core orchestration: receive message → LLM → response
│   ├── agent_service.py         # PydanticAI agent configuration and tool registry
│   ├── rag_service.py           # Document retrieval (pgvector + FTS hybrid search)
│   ├── embedding_service.py     # Embedding generation and document ingestion
│   └── preference_service.py    # Extract/accumulate structured preferences from conversation
├── tools/
│   ├── __init__.py
│   ├── package_tools.py         # query_packages, query_addons
│   ├── venue_tools.py           # query_venues, check_availability
│   ├── pricing_tools.py         # calculate_pricing
│   ├── faq_tools.py             # search_faq
│   ├── event_type_tools.py      # get_event_types, get_event_type_details
│   └── preference_tools.py      # update_preferences
├── tasks.py                     # Celery tasks: cleanup, ingest, track_conversion
├── urls.py                      # DRF router + public endpoints
├── consumers.py                 # WebSocket consumer for streaming responses
├── routing.py                   # WebSocket URL patterns
├── signals.py                   # Analytics updates, session cleanup triggers, notifications
├── exceptions.py                # ChatSessionNotFound, LLMProviderError, etc.
├── permissions.py               # CanAccessChatSession
├── admin.py                     # Django admin for ChatSession, DocumentChunk
├── management/
│   └── commands/
│       ├── ingest_documents.py  # CLI: embed and store company docs
│       └── cleanup_sessions.py  # CLI: remove expired chat sessions
├── migrations/
└── tests/
    ├── test_chat_service.py
    ├── test_agent_service.py
    ├── test_rag_service.py
    ├── test_tools.py
    └── test_views.py
```

### 2.2 Registration

```python
# ai_chat/apps.py
from django.apps import AppConfig

class AiChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'core.domains.ai_chat'

    def ready(self):
        import core.domains.ai_chat.signals  # noqa
```

Add to `INSTALLED_APPS` in `core/settings.py`:
```python
'core.domains.ai_chat',
```

Add URL route in `core/urls.py`:
```python
path('api/ai-chat/', include('core.domains.ai_chat.urls')),
```

Add WebSocket route in `core/asgi.py`:
```python
from core.domains.ai_chat.routing import websocket_urlpatterns as ai_chat_ws
# Merge into existing websocket_urlpatterns
```

---

## 3. Data Models

### 3.1 ChatSession

Tracks a complete conversation with accumulated preferences. Analogous to `MessageThread` in messaging and `BookingSession` in bookingflow.

```python
class ChatSession(BaseModel):
    """A conversation session between a client and the AI assistant."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Owner (nullable for anonymous/guest users on public pages)
    client = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='chat_sessions',
        limit_choices_to={'role': 'CLIENT'}
    )

    # Session metadata
    status = models.CharField(
        max_length=20,
        choices=[
            ('active', 'Active'),
            ('completed', 'Completed'),      # User started a booking
            ('expired', 'Expired'),          # TTL reached
            ('abandoned', 'Abandoned'),      # Explicitly closed
        ],
        default='active',
        db_index=True
    )
    title = models.CharField(max_length=255, blank=True, default='')

    # Accumulated structured preferences extracted from conversation
    # Shape: see Section 3.4
    extracted_preferences = models.JSONField(default=dict)

    # PydanticAI message history (serialized via ModelMessagesTypeAdapter)
    # This is the LLM-format history, not the display-format messages
    llm_message_history = models.JSONField(default=list)

    # Bridge to booking flow
    booking_session = models.ForeignKey(
        'bookingflow.BookingSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_chat_session'
    )

    # Tracking
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, default='')
    expires_at = models.DateTimeField()
    message_count = models.PositiveIntegerField(default=0)

    # Token usage tracking (Gap 9 — cost monitoring)
    total_input_tokens = models.PositiveIntegerField(default=0)
    total_output_tokens = models.PositiveIntegerField(default=0)
    total_tool_calls = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['client', 'status', '-updated_at']),
            models.Index(fields=['status', 'expires_at']),
        ]

    def __str__(self):
        owner = self.client.get_display_name() if self.client else 'Anonymous'
        return f"Chat {self.id} - {owner}"

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.expires_at

    @classmethod
    def migrate_to_user(cls, session_id, user):
        """
        Migrate an anonymous chat session to an authenticated user.
        Called post-login when the client-portal detects a stored session ID
        in localStorage that belongs to an anonymous session.

        Raises ValueError if the session already has a client (already owned).
        Raises ChatSession.DoesNotExist if the session ID is invalid/expired.
        """
        session = cls.objects.get(id=session_id, client__isnull=True)
        session.client = user
        session.save(update_fields=['client', 'updated_at'])
        return session
```

### 3.2 ChatMessage

Display-format messages for the UI. Separate from `llm_message_history` because the LLM history contains tool calls, system prompts, and internal messages that should never be shown to the user.

```python
class ChatMessage(BaseModel):
    """A single message in a chat session, for display purposes."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        ChatSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )

    role = models.CharField(
        max_length=10,
        choices=[
            ('user', 'User'),
            ('assistant', 'Assistant'),
            ('system', 'System'),       # e.g., "Session started", "Booking created"
        ]
    )
    content = models.TextField()

    # Optional structured data attached to this message
    # e.g., package recommendations, pricing breakdowns, venue cards
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['session', 'created_at']),
        ]

    def __str__(self):
        return f"{self.role}: {self.content[:80]}"
```

### 3.3 DocumentChunk

Vector-indexed document chunks for RAG retrieval. See [03-rag-pipeline.md](./03-rag-pipeline.md) for full details.

```python
from pgvector.django import VectorField, HnswIndex

class DocumentChunk(BaseModel):
    """A chunk of company documentation with vector embedding for semantic search."""
    content = models.TextField()
    embedding = VectorField(dimensions=1536)

    # Source tracking
    source_document = models.CharField(max_length=255)   # e.g., "faq.md", "cancellation-policy.md"
    source_section = models.CharField(max_length=255, blank=True, default='')
    chunk_index = models.PositiveIntegerField()           # Order within source document

    # Metadata for filtering
    category = models.CharField(
        max_length=50,
        choices=[
            ('faq', 'FAQ'),
            ('policy', 'Policy'),
            ('process', 'Process'),
            ('venue', 'Venue Info'),
            ('package', 'Package Info'),
            ('general', 'General'),
        ],
        default='general',
        db_index=True
    )
    metadata = models.JSONField(default=dict, blank=True)

    # Full-text search support
    search_vector = SearchVectorField(null=True)

    class Meta:
        ordering = ['source_document', 'chunk_index']
        indexes = [
            HnswIndex(
                name='docchunk_embedding_hnsw',
                fields=['embedding'],
                m=16,
                ef_construction=64,
                opclasses=['vector_cosine_ops'],
            ),
            GinIndex(name='docchunk_fts', fields=['search_vector']),
        ]
        unique_together = [('source_document', 'chunk_index')]

    def __str__(self):
        return f"{self.source_document}[{self.chunk_index}]: {self.content[:60]}"
```

### 3.4 Extracted Preferences Schema

The `extracted_preferences` JSON field on ChatSession accumulates structured data across conversation turns:

```python
# Shape of ChatSession.extracted_preferences
{
    "event_type": "wedding",              # From EventType.name
    "event_type_id": 5,                   # Resolved EventType.id
    "guest_count": 150,
    "preferred_date": "2026-09-15",       # ISO format, nullable
    "preferred_time": "18:00",            # nullable
    "duration_days": 2,                   # nullable
    "budget_range": {                     # nullable
        "min": 100000,
        "max": 200000,
        "currency": "PHP"
    },
    "style_preferences": ["rustic", "garden", "outdoor"],
    "venue_preferences": ["open_field", "pool_area"],
    "venue_ids": [1, 3],                  # Resolved Venue.ids
    "must_haves": ["live_band", "photo_booth"],
    "dietary_requirements": ["halal"],
    "special_requests": "Need valet parking",
    "recommended_packages": [             # Set by pricing tool
        {"id": 1, "name": "Gold Package", "price": "50000.00"},
        {"id": 3, "name": "Custom Venue Bundle", "price": "75000.00"}
    ],
    "recommended_addons": [
        {"id": 5, "name": "Premium Sound", "price": "5000.00"}
    ],
    "confidence": {                       # How complete the preferences are
        "event_type": "confirmed",        # confirmed | inferred | unknown
        "guest_count": "confirmed",
        "budget_range": "inferred",
        "preferred_date": "unknown"
    }
}
```

---

## 4. Service Architecture

All services follow the existing static-method pattern. No service instances.

### 4.1 ChatService — Core Orchestrator

```python
# services/chat_service.py
class ChatService:
    """
    Core orchestration service. Receives a user message,
    runs the PydanticAI agent, and returns the response.
    """

    SESSION_TTL_HOURS = 24

    @staticmethod
    async def create_session(client=None, ip_address=None, user_agent=''):
        """Create a new chat session with 24-hour TTL."""
        ...

    @staticmethod
    async def send_message(session_id, user_message, client=None):
        """
        Main entry point. Processes a user message through the AI agent.

        Flow:
        1. Validate session (not expired, not completed)
        2. Create ChatMessage(role='user')
        3. Load llm_message_history from session
        4. Run PydanticAI agent with tools and history
        5. Agent may call tools (DB queries, pricing, RAG search)
        6. Save assistant response as ChatMessage(role='assistant')
        7. Update llm_message_history on session
        8. Update extracted_preferences if agent extracted new info
        9. Record token usage on session (total_input_tokens, total_output_tokens, total_tool_calls)
        10. Return response with any structured metadata

        Error handling: LLM exceptions are caught, logged to Sentry with
        session context, and raised as LLMProviderError to the caller.
        """
        ...

    @staticmethod
    async def migrate_session_to_user(session_id, user):
        """
        Migrate an anonymous session to an authenticated user post-login.
        Idempotent — silently ignores already-owned or missing sessions.
        """
        ...

    @staticmethod
    async def get_session(session_id):
        """Retrieve session with validation."""
        ...

    @staticmethod
    async def get_messages(session_id, limit=50, offset=0):
        """Get display messages for a session (paginated)."""
        ...

    @staticmethod
    def cleanup_expired_sessions():
        """Mark expired sessions. Called by management command / Celery beat."""
        ...
```

### 4.2 AgentService — PydanticAI Configuration

```python
# services/agent_service.py
from pydantic_ai import Agent, RunContext
from pydantic_ai.messages import ModelMessage
from dataclasses import dataclass

@dataclass
class ChatDeps:
    """Dependencies injected into every tool call."""
    session_id: str
    client_id: int | None
    extracted_preferences: dict

def trim_old_messages(messages: list[ModelMessage]) -> list[ModelMessage]:
    """
    History processor: keep system context + last 20 exchange pairs.
    Prevents unbounded context growth in long conversations.

    Note: PydanticAI's history_processors run BEFORE the LLM call.
    Tool call and tool result messages must stay paired — never split them.
    The safe approach is to keep trailing messages in multiples of 2
    (user + assistant, tool_call + tool_result).

    GPT-4.1-mini: 1M token context. At ~500 tokens/exchange, 20 pairs
    = 10K tokens — well within budget, keeping latency low.
    """
    MAX_PAIRS = 20
    MAX_MESSAGES = MAX_PAIRS * 2  # rough upper bound

    if len(messages) <= MAX_MESSAGES + 2:  # +2 for system + buffer
        return messages

    # Keep first message (system/instructions) + most recent MAX_MESSAGES
    return messages[:1] + messages[-MAX_MESSAGES:]

agent = Agent(
    'openai:gpt-4.1-mini',
    deps_type=ChatDeps,
    output_type=str,
    instructions="""You are LifePlace's event planning assistant... (see Section 5)""",
    retries=2,
    history_processors=[trim_old_messages],
)

# Tools are registered on this agent instance (see 02-tool-schema-design.md)
```

### 4.3 RAGService

See [03-rag-pipeline.md](./03-rag-pipeline.md) for complete specification.

```python
# services/rag_service.py
class RAGService:
    @staticmethod
    async def hybrid_search(query, category=None, limit=5):
        """Combine pgvector cosine similarity with PostgreSQL FTS via RRF."""
        ...

    @staticmethod
    async def get_context_for_query(query, category=None):
        """Return formatted context string for injection into LLM prompt."""
        ...
```

### 4.4 EmbeddingService

See [03-rag-pipeline.md](./03-rag-pipeline.md) for complete specification.

```python
# services/embedding_service.py
class EmbeddingService:
    @staticmethod
    async def generate_embedding(text):
        """Generate embedding via OpenAI text-embedding-3-small."""
        ...

    @staticmethod
    async def ingest_document(file_path, category='general'):
        """Chunk, embed, and store a document."""
        ...
```

### 4.5 PreferenceService

```python
# services/preference_service.py
class PreferenceService:
    """
    Extracts and accumulates structured preferences from conversation.
    Called by tools when the LLM identifies user intent.
    """

    @staticmethod
    def update_preferences(session_id, new_preferences):
        """Merge new preferences into session.extracted_preferences."""
        ...

    @staticmethod
    def get_readiness_assessment(preferences):
        """
        Assess how complete preferences are for booking.
        Returns: { ready: bool, missing_fields: [...], confidence: float }
        """
        ...
```

---

## 5. System Prompt Design

The system prompt is the most critical piece. It defines the agent's behavior, boundaries, and personality.

```
You are LifePlace's event planning assistant for LifePlace Alfonso, an event
venue in Alfonso, Cavite, Philippines.

YOUR ROLE:
- Answer questions about LifePlace's venues, packages, services, policies, and
  the event planning process
- Help clients discover and curate event packages based on their preferences
- Recommend existing packages first; suggest custom combinations only when no
  existing package fits
- Provide accurate pricing using the calculate_pricing tool (NEVER estimate or
  guess prices)

TOOLS:
- Use search_faq to answer factual questions about LifePlace
- Use query_packages and query_venues when the user describes what they want
- Use calculate_pricing to provide pricing — NEVER calculate prices yourself
- Use check_availability when the user mentions specific dates

BEHAVIORAL RULES:
1. Be warm, professional, and concise
2. Ask clarifying questions when preferences are vague (event type, guest count,
   date, budget)
3. When you have enough information, proactively recommend packages
4. Always present prices from tool results, never from your own knowledge
5. If a question is outside your scope, suggest the user contact LifePlace
   directly via the messaging system
6. All dates and times are Philippine Time (Asia/Manila, UTC+8)
7. Currency is Philippine Peso (PHP) unless stated otherwise
8. When the user is ready, guide them to start a booking

WHAT YOU CANNOT DO:
- Confirm bookings or accept payments (direct to booking flow)
- Access or modify existing bookings
- Make promises about availability without checking
- Provide legal advice about contracts
```

---

## 6. API Endpoints

### 6.1 URL Registration

```python
# urls.py
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'sessions', ChatSessionViewSet, basename='chat-session')
router.register(r'admin/sessions', AdminChatSessionViewSet, basename='admin-chat-session')

urlpatterns = [
    # Public endpoints (AllowAny — rate-limited by AiChatAnonThrottle)
    path('public/sessions/', PublicChatSessionCreateView.as_view(), name='public-chat-create'),
    path('public/sessions/<uuid:session_id>/messages/', PublicChatMessageView.as_view(), name='public-chat-message'),
    path('public/sessions/<uuid:session_id>/messages/', PublicChatMessageView.as_view(), name='public-chat-messages-list'),

    # Authenticated + admin endpoints (via DRF router)
    path('', include(router.urls)),
]

# Router auto-generates:
#   GET/POST  /sessions/
#   GET/PUT/DELETE  /sessions/{id}/
#   POST  /sessions/{id}/messages/       (ChatSessionViewSet.messages)
#   POST  /sessions/{id}/migrate/        (ChatSessionViewSet.migrate)
#   POST  /sessions/{id}/start-booking/  (ChatSessionViewSet.start_booking)
#   GET   /admin/sessions/               (AdminChatSessionViewSet list)
#   GET   /admin/sessions/{id}/          (AdminChatSessionViewSet retrieve)
#   GET   /admin/sessions/stats/         (AdminChatSessionViewSet.stats)
```

### 6.2 Endpoint Specification

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/ai-chat/public/sessions/` | AllowAny | Create anonymous chat session |
| `POST` | `/api/ai-chat/public/sessions/{id}/messages/` | AllowAny | Send message (anonymous) |
| `GET` | `/api/ai-chat/public/sessions/{id}/messages/` | AllowAny | Get messages (anonymous) |
| `POST` | `/api/ai-chat/sessions/` | IsAuthenticated | Create authenticated session |
| `GET` | `/api/ai-chat/sessions/` | IsAuthenticated | List user's sessions |
| `GET` | `/api/ai-chat/sessions/{id}/` | IsAuthenticated | Get session detail |
| `POST` | `/api/ai-chat/sessions/{id}/messages/` | IsAuthenticated | Send message |
| `GET` | `/api/ai-chat/sessions/{id}/messages/` | IsAuthenticated | Get messages |
| `POST` | `/api/ai-chat/sessions/{id}/migrate/` | IsAuthenticated | Claim anonymous session post-login |
| `POST` | `/api/ai-chat/sessions/{id}/start-booking/` | IsAuthenticated | Create BookingSession from chat |
| `DELETE` | `/api/ai-chat/sessions/{id}/` | IsAuthenticated | End/abandon session |
| `GET` | `/api/ai-chat/admin/sessions/` | IsAdmin | List all sessions (admin) |
| `GET` | `/api/ai-chat/admin/sessions/{id}/` | IsAdmin | Session detail with messages (admin) |
| `GET` | `/api/ai-chat/admin/sessions/stats/` | IsAdmin | Conversion funnel metrics |

### 6.3 View Structure

```python
# views.py
class ChatSessionViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ChatSession.objects.filter(
            client=self.request.user,
            status='active'
        ).order_by('-updated_at')

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChatSessionDetailSerializer
        elif self.action == 'create':
            return ChatSessionCreateSerializer
        return ChatSessionListSerializer

    @action(detail=True, methods=['post'])
    async def messages(self, request, pk=None):
        """Send a message and get AI response."""
        session = self.get_object()
        serializer = ChatMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        response = await ChatService.send_message(
            session_id=session.id,
            user_message=serializer.validated_data['content'],
            client=request.user
        )

        return Response(
            ChatMessageSerializer(response, many=True).data,
            status=status.HTTP_200_OK
        )

    @action(detail=True, methods=['post'])
    async def migrate(self, request, pk=None):
        """
        Claim an anonymous chat session after login.
        Called by the frontend immediately after authentication when
        localStorage contains a session ID with no associated client.
        Idempotent — safe to call multiple times.
        """
        session = self.get_object()
        await ChatService.migrate_session_to_user(session.id, request.user)
        return Response({'status': 'migrated'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    async def start_booking(self, request, pk=None):
        """Bridge chat preferences into a BookingSession."""
        session = self.get_object()
        # See 04-chat-to-booking-bridge.md
        booking_session = await BookingBridgeService.create_booking_from_chat(session)
        return Response(
            {'booking_session_id': str(booking_session.session_id)},
            status=status.HTTP_201_CREATED
        )


class AdminChatSessionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Admin-only read access to all chat sessions for analytics and support.
    Mirrors the pattern of MessageThreadAdminViewSet in the messaging domain.
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        'title',
        'client__first_name',
        'client__last_name',
        'client__email',
    ]
    ordering_fields = ['created_at', 'updated_at', 'message_count']
    ordering = ['-updated_at']

    def get_queryset(self):
        return (
            ChatSession.objects.all()
            .select_related('client', 'booking_session')
            .prefetch_related('messages')
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return AdminChatSessionDetailSerializer
        return AdminChatSessionListSerializer

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Conversion funnel metrics.
        Returns: total sessions, converted to booking, completed payment, conversion rate.
        """
        total = ChatSession.objects.count()
        converted = ChatSession.objects.filter(
            status='completed',
            booking_session__isnull=False,
        ).count()
        paid = ChatSession.objects.filter(
            booking_session__is_completed=True,
        ).count()
        return Response({
            'total_sessions': total,
            'converted_to_booking': converted,
            'completed_payment': paid,
            'conversion_rate': round(converted / total * 100, 1) if total else 0.0,
            'payment_completion_rate': round(paid / converted * 100, 1) if converted else 0.0,
        })


class PublicChatSessionCreateView(APIView):
    """Create anonymous chat session — no auth required."""
    permission_classes = [AllowAny]
    throttle_classes = [AnonRateThrottle]

    async def post(self, request):
        session = await ChatService.create_session(
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        return Response(
            ChatSessionDetailSerializer(session).data,
            status=status.HTTP_201_CREATED
        )
```

### 6.4 Serializers

```python
# serializers.py
class ChatSessionListSerializer(serializers.ModelSerializer):
    """Minimal fields for session list."""
    class Meta:
        model = ChatSession
        fields = ['id', 'status', 'title', 'message_count', 'created_at', 'updated_at']
        read_only_fields = fields

class ChatSessionDetailSerializer(ChatSessionListSerializer):
    """Full session detail with recent messages."""
    recent_messages = serializers.SerializerMethodField()
    extracted_preferences = serializers.JSONField(read_only=True)

    class Meta(ChatSessionListSerializer.Meta):
        fields = ChatSessionListSerializer.Meta.fields + [
            'extracted_preferences', 'recent_messages', 'booking_session'
        ]

    def get_recent_messages(self, obj):
        messages = obj.messages.order_by('-created_at')[:20]
        return ChatMessageSerializer(reversed(list(messages)), many=True).data

class ChatSessionCreateSerializer(serializers.Serializer):
    """Create a new chat session."""
    initial_message = serializers.CharField(required=False, allow_blank=True)

class ChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatMessage
        fields = ['id', 'role', 'content', 'metadata', 'created_at']
        read_only_fields = fields

class ChatMessageCreateSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=2000)

    def validate_content(self, value):
        """
        Sanitize user input via the existing security utility.
        Strips HTML tags, removes null bytes, and trims whitespace.
        Matches the pattern used in the messaging domain.
        """
        from core.utils.security import sanitize_input
        sanitized = sanitize_input(value, max_length=2000, allow_html=False)
        if not sanitized or not sanitized.strip():
            raise serializers.ValidationError("Message cannot be empty.")
        return sanitized

class AdminChatSessionListSerializer(serializers.ModelSerializer):
    """Minimal fields for admin session list."""
    owner = serializers.SerializerMethodField()

    class Meta:
        model = ChatSession
        fields = [
            'id', 'status', 'title', 'owner', 'message_count',
            'total_input_tokens', 'total_output_tokens', 'total_tool_calls',
            'booking_session', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_owner(self, obj):
        if obj.client:
            return obj.client.get_display_name()
        return 'Anonymous'

class AdminChatSessionDetailSerializer(AdminChatSessionListSerializer):
    """Full detail including all messages, for admin inspection."""
    messages = ChatMessageSerializer(many=True, read_only=True)
    extracted_preferences = serializers.JSONField(read_only=True)

    class Meta(AdminChatSessionListSerializer.Meta):
        fields = AdminChatSessionListSerializer.Meta.fields + [
            'messages', 'extracted_preferences', 'ip_address',
        ]
```

---

## 7. WebSocket Architecture (Streaming)

For streaming LLM responses token-by-token, use Channels (already in the stack).

### 7.1 Consumer

```python
# consumers.py
class AiChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for streaming AI responses."""

    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']

        # Authenticate via query string JWT (same pattern as MessagingConsumer)
        query_string = self.scope['query_string'].decode()
        if 'token=' not in query_string:
            # Allow anonymous for public chat
            self.user = None
        else:
            token = query_string.split('token=')[-1].split('&')[0]
            try:
                access_token = AccessToken(token)
                self.user = await self.get_user_from_token(access_token)
            except (InvalidToken, TokenError):
                await self.close(code=4401)
                return

        # Verify session access
        has_access = await self.check_session_access()
        if not has_access:
            await self.close(code=4403)
            return

        self.group_name = f'ai_chat_{self.session_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'message':
            # Process via ChatService with streaming
            await self.stream_response(data['content'])

    async def stream_response(self, user_message):
        """Stream AI response tokens via WebSocket."""
        from .services.chat_service import ChatService

        # Send typing indicator
        await self.send(text_data=json.dumps({
            'type': 'typing_start'
        }))

        async for chunk in ChatService.send_message_streaming(
            session_id=self.session_id,
            user_message=user_message,
            client=self.user
        ):
            await self.send(text_data=json.dumps({
                'type': 'token',
                'content': chunk.text,
            }))

        # Send completion
        await self.send(text_data=json.dumps({
            'type': 'message_complete',
            'metadata': chunk.metadata  # Package cards, pricing, etc.
        }))
```

### 7.2 Routing

```python
# routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r'ws/ai-chat/(?P<session_id>[0-9a-f-]+)/$',
        consumers.AiChatConsumer.as_asgi()
    ),
]
```

---

## 8. Permissions

```python
# permissions.py
from rest_framework import permissions

class CanAccessChatSession(permissions.BasePermission):
    """Clients access their own sessions. Anonymous access via session UUID only."""
    message = "You don't have permission to access this chat session."

    def has_object_permission(self, request, view, obj):
        # Admin can access any session
        if request.user.is_authenticated and request.user.role == 'ADMIN':
            return True
        # Authenticated client can access their own sessions
        if request.user.is_authenticated and obj.client == request.user:
            return True
        # Anonymous sessions are accessed via UUID in URL (no client set)
        if obj.client is None:
            return True
        return False
```

---

## 9. Exceptions

```python
# exceptions.py
from rest_framework import status
from rest_framework.exceptions import APIException

class AiChatException(APIException):
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'An AI chat error occurred.'
    default_code = 'ai_chat_error'

class ChatSessionNotFound(AiChatException):
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Chat session not found.'
    default_code = 'chat_session_not_found'

class ChatSessionExpired(AiChatException):
    status_code = status.HTTP_410_GONE
    default_detail = 'Chat session has expired.'
    default_code = 'chat_session_expired'

class LLMProviderError(AiChatException):
    status_code = status.HTTP_502_BAD_GATEWAY
    default_detail = 'AI service temporarily unavailable. Please try again.'
    default_code = 'llm_provider_error'

class RateLimitExceeded(AiChatException):
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Too many messages. Please wait a moment.'
    default_code = 'rate_limit_exceeded'
```

---

## 10. Signals

```python
# signals.py
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)

@receiver(post_save, sender='ai_chat.ChatMessage')
def update_session_message_count(sender, instance, created, **kwargs):
    """Update message count and title on session when new message is added."""
    if created:
        session = instance.session
        session.message_count = session.messages.count()

        # Auto-title from first user message
        if not session.title and instance.role == 'user':
            session.title = instance.content[:100]

        session.save(update_fields=['message_count', 'title', 'updated_at'])

@receiver(post_save, sender='ai_chat.ChatSession')
def handle_session_completion(sender, instance, **kwargs):
    """
    Fire when a chat session converts to a booking.
    - Logs the conversion for analytics
    - Notifies admins via the existing NotificationService
    - Triggers async Celery task to record conversion metrics
    """
    if instance.status == 'completed' and instance.booking_session:
        logger.info(
            f"Chat session {instance.id} converted to booking "
            f"{instance.booking_session.session_id}"
        )

        # Notify admins (matches 'new_inquiry' pattern in messaging domain)
        try:
            from core.domains.notifications.services import NotificationService
            owner = instance.client.get_display_name() if instance.client else 'Anonymous user'
            NotificationService.notify_admins(
                title='Chat converted to booking',
                content=f'{owner} started a booking from an AI chat session.',
                category='WORKFLOW',
            )
        except Exception:
            logger.exception("Failed to send admin notification for chat conversion")

        # Async analytics tracking via Celery
        try:
            from core.domains.ai_chat.tasks import track_conversion
            track_conversion.delay(
                str(instance.id),
                str(instance.booking_session.session_id),
            )
        except Exception:
            logger.exception("Failed to queue conversion tracking task")
```

---

## 11. Configuration (Environment Variables)

Add to existing `.env` / Fly.io secrets:

```bash
# LLM Provider
OPENAI_API_KEY=sk-...                       # Required for GPT-4.1-mini and embeddings
AI_CHAT_MODEL=openai:gpt-4.1-mini           # PydanticAI model string
AI_CHAT_FALLBACK_MODEL=google-gla:gemini-2.5-flash-lite  # Optional fallback

# Embedding
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536

# Chat Configuration
AI_CHAT_SESSION_TTL_HOURS=24
AI_CHAT_MAX_MESSAGES_PER_SESSION=100
AI_CHAT_MAX_MESSAGE_LENGTH=2000
AI_CHAT_RATE_LIMIT_PER_MINUTE=20

# pgvector (no extra config needed — uses existing DATABASE_URL)
```

Access in Django settings:

```python
# core/settings.py (add to existing)
AI_CHAT_CONFIG = {
    'MODEL': os.getenv('AI_CHAT_MODEL', 'openai:gpt-4.1-mini'),
    'FALLBACK_MODEL': os.getenv('AI_CHAT_FALLBACK_MODEL', ''),
    'SESSION_TTL_HOURS': int(os.getenv('AI_CHAT_SESSION_TTL_HOURS', '24')),
    'MAX_MESSAGES_PER_SESSION': int(os.getenv('AI_CHAT_MAX_MESSAGES_PER_SESSION', '100')),
    'MAX_MESSAGE_LENGTH': int(os.getenv('AI_CHAT_MAX_MESSAGE_LENGTH', '2000')),
    'RATE_LIMIT_PER_MINUTE': int(os.getenv('AI_CHAT_RATE_LIMIT_PER_MINUTE', '20')),
    'EMBEDDING_MODEL': os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small'),
    'EMBEDDING_DIMENSIONS': int(os.getenv('EMBEDDING_DIMENSIONS', '1536')),
}
```

---

## 12. Celery Tasks

The `ai_chat` domain uses the existing Celery infrastructure (Redis broker, `analytics` queue). Add the following file:

```python
# ai_chat/tasks.py
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(
    name='ai_chat.cleanup_expired_sessions',
    queue='analytics',
    max_retries=3,
    default_retry_delay=60,
)
def cleanup_expired_sessions():
    """Hourly: mark expired chat sessions."""
    from .services.chat_service import ChatService
    count = ChatService.cleanup_expired_sessions()
    logger.info(f"Cleaned up {count} expired chat sessions")
    return {'cleaned': count}


@shared_task(
    name='ai_chat.ingest_documents',
    queue='analytics',
    max_retries=1,
    default_retry_delay=300,
    time_limit=600,  # 10 min hard limit
)
def ingest_documents_task():
    """On-demand: re-embed all company documents. Triggered by management command or CI."""
    import asyncio
    from .services.embedding_service import EmbeddingService
    count = asyncio.run(EmbeddingService.ingest_all_documents())
    logger.info(f"Ingested {count} document chunks")
    return {'chunks_ingested': count}


@shared_task(
    name='ai_chat.track_conversion',
    queue='analytics',
    max_retries=3,
    default_retry_delay=30,
)
def track_conversion(chat_session_id: str, booking_session_id: str):
    """Async: record conversion analytics after chat → booking bridge."""
    logger.info(
        f"Chat→Booking conversion: chat={chat_session_id} booking={booking_session_id}"
    )
    # Future: write to analytics table or send to external analytics service
```

**Add to Celery beat schedule in `core/celery.py`:**

```python
'cleanup-expired-chat-sessions': {
    'task': 'ai_chat.cleanup_expired_sessions',
    'schedule': 60 * 60,  # Hourly
    'options': {'queue': 'analytics'},
},
```

**Add task routing in `core/celery.py` `task_routes`:**

```python
'core.domains.ai_chat.tasks.*': {'queue': 'analytics'},
```

---

## 13. Sentry Error Context

The Sentry SDK is already configured in `core/settings.py`. LLM errors in `ChatService.send_message()` should include chat-specific context for easier debugging. Pattern matches existing Sentry usage in the security and payments domains:

```python
# In services/chat_service.py — send_message() error handler:
import sentry_sdk

try:
    result = await agent.run(prompt, deps=deps, message_history=history)
except Exception as e:
    with sentry_sdk.new_scope() as scope:
        scope.set_context("ai_chat", {
            "session_id": str(session_id),
            "user_id": str(client.id) if client else "anonymous",
            "message_count": session.message_count,
            "model": settings.AI_CHAT_CONFIG['MODEL'],
        })
        scope.capture_exception(e)
    raise LLMProviderError()
```

Individual tool errors are caught internally (tools return error dicts rather than raising), so they don't require separate Sentry instrumentation.

---

## 14. Dependencies

New Python packages to add to `requirements.txt`:

```
pydantic-ai>=1.62.0          # Agent framework (tools, history management, structured output)
openai>=1.60.0               # OpenAI SDK (GPT-4.1-mini + text-embedding-3-small)
pgvector>=0.4.0              # Django VectorField, HnswIndex, cosine distance ORM support
```

Optional (if provider flexibility needed later):
```
litellm>=1.81.0              # Multi-provider LLM gateway — swap models via config
```

No additional packages needed for Celery (already configured), Sentry (already in stack), Django Channels (already in stack), or notifications (already in stack).

---

## 15. Database Migrations

### 15.1 Enable pgvector Extension

```python
# First migration in ai_chat domain
from pgvector.django import VectorExtension

class Migration(migrations.Migration):
    dependencies = []
    operations = [
        VectorExtension(),  # CREATE EXTENSION IF NOT EXISTS vector
    ]
```

### 15.2 Fly.io PostgreSQL

Fly.io managed Postgres supports pgvector. Verify with:
```sql
SELECT * FROM pg_available_extensions WHERE name = 'vector';
```

If using Fly.io managed Postgres (Supabase-backed), pgvector is pre-installed. If using a custom Postgres, install via:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 16. Async Considerations

The codebase already uses Daphne (ASGI). Key considerations for async views:

1. **ORM access**: Use `async for`, `await Model.objects.aget()`, `await Model.objects.acreate()`, etc.
2. **Transactions**: Wrap in `@sync_to_async` since `transaction.atomic()` is synchronous:
   ```python
   from asgiref.sync import sync_to_async

   @sync_to_async
   def create_event_atomic(data):
       with transaction.atomic():
           return Event.objects.create(**data)
   ```
3. **PydanticAI**: All `agent.run()` calls are natively async — call directly in async views.
4. **Existing sync services**: Wrap calls to existing sync services (PricingCalculationService, BookingSessionService) with `sync_to_async`:
   ```python
   pricing = await sync_to_async(PricingCalculationService.calculate_from_booking_data)(data)
   ```

---

## 17. Rate Limiting

Add to `REST_FRAMEWORK['DEFAULT_THROTTLE_RATES']`:

```python
'ai_chat_anon': '10/minute',       # Anonymous chat messages
'ai_chat_user': '20/minute',       # Authenticated chat messages
'ai_chat_session_create': '5/hour', # Session creation
```

Custom throttle class:

```python
# In views.py or a dedicated throttles.py
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

class AiChatAnonThrottle(AnonRateThrottle):
    rate = '10/minute'

class AiChatUserThrottle(UserRateThrottle):
    rate = '20/minute'
```

---

## References

- [02-tool-schema-design.md](./02-tool-schema-design.md) — Tool definitions and schemas
- [03-rag-pipeline.md](./03-rag-pipeline.md) — RAG pipeline and document ingestion
- [04-chat-to-booking-bridge.md](./04-chat-to-booking-bridge.md) — Booking session creation from chat
- [05-frontend-chat-ui.md](./05-frontend-chat-ui.md) — Frontend implementation
