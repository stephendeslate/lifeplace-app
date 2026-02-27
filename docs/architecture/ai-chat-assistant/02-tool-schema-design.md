# AI Chat Assistant — Tool Schema Design

**Document:** 02-tool-schema-design.md
**Part of:** [AI Chat Assistant Architecture](./00-master-overview.md)
**Status:** Design Proposal
**Date:** 2026-02-19

---

## 1. Overview

This document defines every tool the PydanticAI agent can call, including exact function signatures, parameter types, return shapes, and which existing backend services they delegate to. Tools are the bridge between the LLM's reasoning and the production database.

**Core principle:** The LLM never accesses the database directly. Every data access goes through a typed tool function that queries existing Django services and models.

---

## 2. Tool Architecture

### 2.1 Dependency Injection

All tools receive a `RunContext[ChatDeps]` that provides access to session state and identifiers:

```python
# services/agent_service.py
from dataclasses import dataclass

@dataclass
class ChatDeps:
    """Injected into every tool via RunContext."""
    session_id: str                    # ChatSession UUID
    client_id: int | None             # User ID if authenticated, None for anonymous
    extracted_preferences: dict        # Current accumulated preferences
```

### 2.2 Tool Registration

Tools are organized by domain and registered on the PydanticAI agent:

```python
from pydantic_ai import Agent
from .tools import package_tools, venue_tools, pricing_tools, faq_tools, event_type_tools

agent = Agent(
    'openai:gpt-4.1-mini',
    deps_type=ChatDeps,
    output_type=str,
    instructions="...",
)

# Register all tools
package_tools.register(agent)
venue_tools.register(agent)
pricing_tools.register(agent)
faq_tools.register(agent)
event_type_tools.register(agent)
```

Each tool module exports a `register(agent)` function that decorates its tools onto the agent.

---

## 3. Tool Definitions

### 3.1 Package Tools

**Source data:** `ProductOption` model (type='PACKAGE'), `ProductCategory` model
**Existing service:** `products/services.py`, `products/cache_service.py`

#### `query_packages`

```python
# tools/package_tools.py
from pydantic_ai import RunContext
from pydantic import BaseModel

class PackageResult(BaseModel):
    id: int
    name: str
    description: str
    category: str
    base_price: str            # Decimal as string for precision
    price_with_tax: str
    pricing_unit: str           # PER_EVENT, PER_PERSON, PER_HOUR
    minimum_guests: int | None
    maximum_guests: int | None
    recommended_guests: int | None
    event_days: int | None      # For multi-day packages (camps, retreats)
    minimum_hours: int | None
    is_featured: bool
    includes: list[str]         # From category.includes
    badge_text: str             # From category.badge_text

def register(agent):

    @agent.tool
    async def query_packages(
        ctx: RunContext[ChatDeps],
        event_type: str | None = None,
        min_guests: int | None = None,
        max_budget: float | None = None,
        category_slug: str | None = None,
    ) -> list[dict]:
        """Search available event packages based on criteria.

        Args:
            event_type: Type of event (e.g., 'wedding', 'camp', 'retreat', 'corporate').
            min_guests: Minimum guest capacity needed.
            max_budget: Maximum budget in PHP.
            category_slug: Specific category to filter (e.g., 'all-in-weddings', 'event-packages').
        """
        from core.domains.products.models import ProductOption
        from asgiref.sync import sync_to_async

        @sync_to_async
        def _query():
            qs = ProductOption.objects.filter(
                type='PACKAGE',
                is_active=True,
            ).select_related('category').prefetch_related('event_types')

            if event_type:
                qs = qs.filter(event_types__name__icontains=event_type)

            if min_guests:
                qs = qs.filter(
                    models.Q(maximum_guests__gte=min_guests) |
                    models.Q(maximum_guests__isnull=True)
                )

            if max_budget:
                qs = qs.filter(base_price__lte=max_budget)

            if category_slug:
                qs = qs.filter(category__slug=category_slug)

            results = []
            for pkg in qs.order_by('category__sort_order', 'sort_order')[:20]:
                results.append({
                    'id': pkg.id,
                    'name': pkg.name,
                    'description': pkg.description or '',
                    'category': pkg.category.name if pkg.category else '',
                    'base_price': str(pkg.base_price),
                    'price_with_tax': str(pkg.price_with_tax),
                    'pricing_unit': pkg.pricing_unit,
                    'minimum_guests': pkg.minimum_guests,
                    'maximum_guests': pkg.maximum_guests,
                    'recommended_guests': pkg.recommended_guests,
                    'event_days': pkg.event_days,
                    'minimum_hours': pkg.minimum_hours,
                    'is_featured': pkg.is_featured,
                    'includes': pkg.category.includes if pkg.category else [],
                    'badge_text': pkg.category.badge_text if pkg.category else '',
                    'event_types': list(pkg.event_types.values_list('name', flat=True)),
                })
            return results

        return await _query()
```

#### `query_addons`

```python
    @agent.tool
    async def query_addons(
        ctx: RunContext[ChatDeps],
        event_type: str | None = None,
        category_slug: str | None = None,
    ) -> list[dict]:
        """Search available add-on products that can supplement a package.

        Args:
            event_type: Type of event to filter compatible add-ons.
            category_slug: Specific add-on category.
        """
        from core.domains.products.models import ProductOption
        from asgiref.sync import sync_to_async

        @sync_to_async
        def _query():
            qs = ProductOption.objects.filter(
                type='PRODUCT',
                is_active=True,
            ).select_related('category').prefetch_related('event_types')

            if event_type:
                qs = qs.filter(event_types__name__icontains=event_type)

            if category_slug:
                qs = qs.filter(category__slug=category_slug)

            results = []
            for addon in qs.order_by('category__sort_order', 'sort_order')[:30]:
                results.append({
                    'id': addon.id,
                    'name': addon.name,
                    'description': addon.description or '',
                    'category': addon.category.name if addon.category else '',
                    'base_price': str(addon.base_price),
                    'pricing_unit': addon.pricing_unit,
                    'allow_multiple': addon.allow_multiple,
                    'maximum_quantity': addon.maximum_quantity,
                })
            return results

        return await _query()
```

---

### 3.2 Venue Tools

**Source data:** `Venue` model, `VenueOperatingRules`, `VenueBlockedDate`, `VenueEventTypeConfiguration`
**Existing service:** `venues/services.py`

#### `query_venues`

```python
# tools/venue_tools.py

def register(agent):

    @agent.tool
    async def query_venues(
        ctx: RunContext[ChatDeps],
        min_capacity: int | None = None,
        is_outdoor: bool | None = None,
        amenities: list[str] | None = None,
    ) -> list[dict]:
        """Search available venues at LifePlace.

        Args:
            min_capacity: Minimum guest capacity needed.
            is_outdoor: Filter for outdoor vs indoor venues.
            amenities: List of desired amenities (e.g., 'pool', 'garden', 'stage').
        """
        from core.domains.venues.models import Venue
        from asgiref.sync import sync_to_async

        @sync_to_async
        def _query():
            qs = Venue.objects.filter(is_active=True)

            if min_capacity:
                qs = qs.filter(
                    models.Q(max_capacity__gte=min_capacity) |
                    models.Q(max_capacity__isnull=True)
                )

            results = []
            for venue in qs.order_by('sort_order'):
                venue_data = {
                    'id': venue.id,
                    'name': venue.name,
                    'description': venue.description or '',
                    'max_capacity': venue.max_capacity,
                    'min_capacity': venue.min_capacity,
                    'is_rentable_standalone': venue.is_rentable_standalone,
                    'standalone_base_price': str(venue.standalone_base_price) if venue.standalone_base_price else None,
                    'standalone_included_hours': venue.standalone_included_hours,
                    'standalone_excess_hour_price': str(venue.standalone_excess_hour_price) if venue.standalone_excess_hour_price else None,
                    'amenities': venue.amenities if hasattr(venue, 'amenities') else [],
                    'featured_image': venue.featured_image.url if venue.featured_image else None,
                }
                results.append(venue_data)
            return results

        return await _query()
```

#### `check_availability`

```python
    @agent.tool
    async def check_availability(
        ctx: RunContext[ChatDeps],
        date: str,
        venue_ids: list[int] | None = None,
    ) -> dict:
        """Check if a specific date is available for booking.

        Args:
            date: Date to check in YYYY-MM-DD format.
            venue_ids: Optional list of specific venue IDs to check.
        """
        from core.domains.events.models import Event
        from core.domains.venues.models import VenueBlockedDate
        from asgiref.sync import sync_to_async
        from datetime import datetime

        @sync_to_async
        def _check():
            try:
                check_date = datetime.strptime(date, '%Y-%m-%d').date()
            except ValueError:
                return {'available': False, 'reason': 'Invalid date format. Use YYYY-MM-DD.'}

            from django.utils import timezone
            today = timezone.now().date()
            if check_date <= today:
                return {'available': False, 'reason': 'Date must be in the future.'}

            # Check venue-specific blocks
            if venue_ids:
                blocked = VenueBlockedDate.objects.filter(
                    venue_id__in=venue_ids,
                    date=check_date,
                    is_active=True
                ).exists()

                if blocked:
                    return {
                        'available': False,
                        'reason': 'One or more selected venues are not available on this date.'
                    }

            # Check global date blocks (events already booked)
            conflicting_events = Event.objects.filter(
                start_date__date=check_date,
                status__in=['CONFIRMED', 'IN_PROGRESS']
            )

            if venue_ids:
                conflicting_events = conflicting_events.filter(venue_id__in=venue_ids)

            if conflicting_events.exists():
                return {
                    'available': False,
                    'reason': 'This date already has a confirmed event.'
                }

            return {
                'available': True,
                'date': date,
                'note': 'Date appears available. Final availability confirmed during booking.'
            }

        return await _check()
```

---

### 3.3 Pricing Tools

**Source data:** `PricingCalculationService` in `sales/pricing_service.py`
**Critical:** The LLM must NEVER compute prices. This tool is the only way to get pricing.

#### `calculate_pricing`

```python
# tools/pricing_tools.py

def register(agent):

    @agent.tool
    async def calculate_pricing(
        ctx: RunContext[ChatDeps],
        package_ids: list[int],
        addon_ids: list[int] | None = None,
        guest_count: int | None = None,
        event_hours: int | None = None,
        venue_additional_hours: dict | None = None,
        discount_code: str | None = None,
    ) -> dict:
        """Calculate accurate pricing for a package configuration. ALWAYS use this
        tool to provide pricing — never estimate prices yourself.

        Args:
            package_ids: List of package IDs to include in pricing.
            addon_ids: Optional list of add-on product IDs.
            guest_count: Number of guests (used for per-person pricing).
            event_hours: Total event duration in hours.
            venue_additional_hours: Extra hours per venue, as {"venue_id": hours}.
            discount_code: Optional discount code to apply.
        """
        from core.domains.sales.pricing_service import PricingCalculationService
        from asgiref.sync import sync_to_async

        @sync_to_async
        def _calculate():
            # Build booking_data structure expected by PricingCalculationService
            booking_data = {
                'selected_packages': [
                    {'id': pid, 'quantity': 1} for pid in package_ids
                ],
                'selected_addons': [
                    {'id': aid, 'quantity': 1} for aid in (addon_ids or [])
                ],
                'venue_additional_hours': venue_additional_hours or {},
            }

            if discount_code:
                booking_data['applied_discount_code'] = discount_code

            # Determine event_type_id from preferences
            event_type_id = ctx.deps.extracted_preferences.get('event_type_id')

            try:
                breakdown = PricingCalculationService.calculate_from_booking_data(
                    booking_data=booking_data,
                    event_type_id=event_type_id,
                    num_participants=guest_count,
                )

                result = {
                    'subtotal': str(breakdown.subtotal),
                    'tax_amount': str(breakdown.tax_amount),
                    'tax_rate': str(breakdown.tax_rate),
                    'discount_amount': str(breakdown.discount_amount),
                    'total_amount': str(breakdown.total_amount),
                    'currency': 'PHP',
                    'line_items': [],
                }

                for item in breakdown.line_items:
                    result['line_items'].append({
                        'name': item.name,
                        'type': item.item_type,
                        'base_price': str(item.base_unit_price),
                        'quantity': item.quantity,
                        'excess_hours': item.excess_hours,
                        'excess_cost': str(item.excess_cost) if item.excess_cost else '0.00',
                        'line_total': str(item.line_total),
                        'pricing_unit': item.pricing_unit,
                    })

                if breakdown.discount_error:
                    result['discount_error'] = str(breakdown.discount_error)

                return result

            except Exception as e:
                return {
                    'error': f'Unable to calculate pricing: {str(e)}',
                    'suggestion': 'Please contact LifePlace directly for a detailed quote.'
                }

        return await _calculate()
```

---

### 3.4 FAQ / Document Search Tools

**Source data:** `DocumentChunk` model (pgvector), company documentation
**Service:** `RAGService` (see [03-rag-pipeline.md](./03-rag-pipeline.md))

#### `search_faq`

```python
# tools/faq_tools.py

def register(agent):

    @agent.tool
    async def search_faq(
        ctx: RunContext[ChatDeps],
        query: str,
        category: str | None = None,
    ) -> list[dict]:
        """Search LifePlace's documentation and FAQs. Use this to answer
        factual questions about policies, processes, venues, and services.

        Args:
            query: The search query describing what information is needed.
            category: Optional filter: 'faq', 'policy', 'process', 'venue', 'package', 'general'.
        """
        from ..services.rag_service import RAGService

        results = await RAGService.hybrid_search(
            query=query,
            category=category,
            limit=5,
        )

        return [
            {
                'content': chunk['content'],
                'source': chunk['source_document'],
                'section': chunk['source_section'],
                'relevance_score': round(chunk['rrf_score'], 4),
            }
            for chunk in results
        ]
```

---

### 3.5 Event Type Tools

**Source data:** `EventType` model
**Existing service:** `events/services.py`

#### `get_event_types`

```python
# tools/event_type_tools.py

def register(agent):

    @agent.tool_plain
    async def get_event_types() -> list[dict]:
        """Get all available event types that LifePlace supports.
        Call this when a user asks what kinds of events can be hosted."""
        from core.domains.events.models import EventType
        from asgiref.sync import sync_to_async

        @sync_to_async
        def _query():
            return [
                {
                    'id': et.id,
                    'name': et.name,
                    'description': et.description or '',
                }
                for et in EventType.objects.filter(is_active=True).order_by('sort_order')
            ]

        return await _query()
```

#### `get_event_type_details`

```python
    @agent.tool_plain
    async def get_event_type_details(event_type_id: int) -> dict:
        """Get detailed information about a specific event type, including
        available packages and venues.

        Args:
            event_type_id: The ID of the event type.
        """
        from core.domains.events.models import EventType
        from core.domains.products.models import ProductOption
        from core.domains.venues.models import Venue
        from asgiref.sync import sync_to_async

        @sync_to_async
        def _query():
            try:
                et = EventType.objects.get(id=event_type_id, is_active=True)
            except EventType.DoesNotExist:
                return {'error': 'Event type not found.'}

            packages = ProductOption.objects.filter(
                type='PACKAGE',
                is_active=True,
                event_types=et,
            ).values('id', 'name', 'base_price', 'description')[:20]

            return {
                'id': et.id,
                'name': et.name,
                'description': et.description or '',
                'available_packages_count': len(packages),
                'available_packages': [
                    {
                        'id': p['id'],
                        'name': p['name'],
                        'base_price': str(p['base_price']),
                        'description': (p['description'] or '')[:200],
                    }
                    for p in packages
                ],
            }

        return await _query()
```

---

## 4. Tool Interaction Patterns

### 4.1 Discovery Flow (User Exploring Options)

```
User: "What kinds of events can I host at LifePlace?"
  → Agent calls: get_event_types()
  → Agent responds with formatted list of event types

User: "Tell me about wedding packages"
  → Agent calls: query_packages(event_type="wedding")
  → Agent presents packages with descriptions and starting prices

User: "What venues do you have for 150 guests?"
  → Agent calls: query_venues(min_capacity=150)
  → Agent describes matching venues
```

### 4.2 Curation Flow (User Building a Package)

```
User: "I want a rustic garden wedding for 150 guests, 2 days"
  → Agent calls: query_packages(event_type="wedding", min_guests=150)
  → Agent calls: query_venues(min_capacity=150)     [parallel]
  → Agent presents matching options, asks for preferences

User: "I like the Gold Package. How much with the pool area added?"
  → Agent calls: calculate_pricing(
        package_ids=[1],
        guest_count=150,
        venue_additional_hours={"3": 4}
    )
  → Agent presents detailed pricing breakdown

User: "Can we add a photo booth?"
  → Agent calls: query_addons(event_type="wedding")
  → Agent calls: calculate_pricing(       [after user confirms]
        package_ids=[1],
        addon_ids=[5],
        guest_count=150
    )
```

### 4.3 FAQ Flow (User Asking Questions)

```
User: "What's your cancellation policy?"
  → Agent calls: search_faq(query="cancellation policy", category="policy")
  → Agent synthesizes answer from retrieved documentation

User: "Is September 15 available?"
  → Agent calls: check_availability(date="2026-09-15")
  → Agent reports availability status
```

### 4.4 Mixed Flow (Questions + Curation)

```
User: "We want a wedding at LifePlace. Around 100 guests. What do you recommend
       and what should we expect in the process?"
  → Agent calls: search_faq(query="wedding booking process")    [parallel]
  → Agent calls: query_packages(event_type="wedding", min_guests=100) [parallel]
  → Agent answers the process question AND presents package options
```

---

## 5. Tool Output Guidelines

### 5.1 Data Formatting Rules

1. **Prices**: Always returned as strings (`"50000.00"`) to preserve decimal precision. The LLM formats these for display (e.g., "₱50,000.00").
2. **IDs**: Always integers. The LLM uses these in follow-up tool calls but never shows them to users.
3. **Descriptions**: Truncated to 200 characters in list contexts. Full descriptions in detail contexts.
4. **Null handling**: Use `None`/`null` for missing values, never empty strings for numeric fields.
5. **Result limits**: Tools cap results at 20-30 items to stay within context window budgets.

### 5.2 Error Handling in Tools

Tools should never raise exceptions. Instead, return error objects:

```python
# On failure
return {'error': 'Unable to calculate pricing.', 'suggestion': 'Contact LifePlace directly.'}

# On empty results
return []  # Empty list — agent will explain no matches found

# On partial failure
return {
    'results': [...],
    'warnings': ['Some venues could not be checked for availability.']
}
```

This ensures the LLM can gracefully explain the situation to the user rather than the conversation breaking.

### 5.3 Context Window Budget

Each tool call's return data consumes tokens from the LLM's context window. Budget allocation:

| Tool | Estimated tokens per call | Max results |
|------|--------------------------|-------------|
| `query_packages` | ~200 per package × 20 max | 20 |
| `query_addons` | ~100 per addon × 30 max | 30 |
| `query_venues` | ~150 per venue × 15 max | 15 |
| `calculate_pricing` | ~500 (breakdown) | 1 |
| `search_faq` | ~200 per chunk × 5 max | 5 |
| `check_availability` | ~50 | 1 |
| `get_event_types` | ~50 per type × 10 max | 10 |
| `get_event_type_details` | ~300 | 1 |

GPT-4.1-mini has a 1M token context window. With typical conversation history of ~2K tokens and system prompt of ~1K tokens, there is ample room. However, tools should still be efficient.

---

## 6. Preference Extraction

Tools are also responsible for updating `extracted_preferences` on the session when they identify user intent. This happens in the ChatService orchestrator, not in individual tools.

After each agent run, ChatService inspects the conversation for extractable preferences:

```python
# In ChatService.send_message(), after agent.run():

# The agent's response + tool calls give us implicit preference signals.
# E.g., if agent called query_packages(event_type="wedding", min_guests=150),
# we can infer: event_type="wedding", guest_count >= 150

# Explicit extraction is done by the agent itself via a structured output
# when it recognizes preference-setting language. The agent is instructed to
# call update_preferences when it identifies new preference data.
```

#### `update_preferences` tool

```python
# tools/preference_tools.py (registered alongside other tools)

    @agent.tool
    async def update_preferences(
        ctx: RunContext[ChatDeps],
        event_type: str | None = None,
        guest_count: int | None = None,
        preferred_date: str | None = None,
        budget_min: float | None = None,
        budget_max: float | None = None,
        style_preferences: list[str] | None = None,
        must_haves: list[str] | None = None,
        special_requests: str | None = None,
    ) -> str:
        """Update the client's event preferences based on what they've told you.
        Call this whenever the client mentions specific requirements.

        Args:
            event_type: Type of event (wedding, camp, retreat, corporate, etc.).
            guest_count: Number of expected guests.
            preferred_date: Preferred event date in YYYY-MM-DD format.
            budget_min: Minimum budget in PHP.
            budget_max: Maximum budget in PHP.
            style_preferences: Style/vibe keywords (rustic, modern, garden, etc.).
            must_haves: Must-have features (live_band, photo_booth, pool, etc.).
            special_requests: Any special requests or notes.
        """
        from ..services.preference_service import PreferenceService
        from asgiref.sync import sync_to_async

        updates = {}
        if event_type is not None:
            updates['event_type'] = event_type
        if guest_count is not None:
            updates['guest_count'] = guest_count
        if preferred_date is not None:
            updates['preferred_date'] = preferred_date
        if budget_min is not None or budget_max is not None:
            updates['budget_range'] = {
                'min': budget_min or ctx.deps.extracted_preferences.get('budget_range', {}).get('min'),
                'max': budget_max or ctx.deps.extracted_preferences.get('budget_range', {}).get('max'),
                'currency': 'PHP'
            }
        if style_preferences is not None:
            updates['style_preferences'] = style_preferences
        if must_haves is not None:
            updates['must_haves'] = must_haves
        if special_requests is not None:
            updates['special_requests'] = special_requests

        await sync_to_async(PreferenceService.update_preferences)(
            ctx.deps.session_id,
            updates
        )

        return "Preferences updated successfully."
```

---

## 7. Tool Security

### 7.1 Read-Only Principle

All tools are **read-only** against the production database. No tool creates, updates, or deletes any record in the core domain models (events, bookings, payments, etc.). The only writes are:

1. `update_preferences` — writes to `ChatSession.extracted_preferences` (chat domain only)
2. `ChatService.send_message` — writes `ChatMessage` and `ChatSession` records (chat domain only)
3. `start_booking` — creates a `BookingSession` via the existing booking flow service

### 7.2 Input Validation

Tool parameters are validated by PydanticAI's type system before execution. Additional validation:

- `date` parameters validated for format and future-date constraint
- `*_ids` parameters validated for existence before querying
- String parameters sanitized (no SQL injection via ORM)
- List parameters capped at reasonable sizes

### 7.3 Rate Limiting

Tool calls are not individually rate-limited (the LLM is already throttled at the API level), but the ChatService tracks total tool calls per session and per minute to detect runaway loops:

```python
MAX_TOOL_CALLS_PER_MESSAGE = 10    # Agent shouldn't need more than this
MAX_TOOL_CALLS_PER_SESSION = 200   # Over entire conversation
```

---

## 8. Testing Strategy

Each tool is tested independently with known database fixtures:

```python
# tests/test_tools.py

class TestPackageTools:
    @pytest.fixture
    def sample_packages(self, db):
        """Create known packages for testing."""
        category = ProductCategory.objects.create(name="Weddings", slug="weddings")
        event_type = EventType.objects.create(name="Wedding")
        pkg = ProductOption.objects.create(
            name="Gold Package",
            type="PACKAGE",
            category=category,
            base_price=50000,
            minimum_guests=50,
            maximum_guests=200,
            is_active=True,
        )
        pkg.event_types.add(event_type)
        return pkg

    async def test_query_packages_by_event_type(self, sample_packages):
        deps = ChatDeps(session_id="test", client_id=None, extracted_preferences={})
        ctx = MockRunContext(deps)
        results = await query_packages(ctx, event_type="wedding")
        assert len(results) >= 1
        assert results[0]['name'] == "Gold Package"

    async def test_query_packages_by_guest_count(self, sample_packages):
        deps = ChatDeps(session_id="test", client_id=None, extracted_preferences={})
        ctx = MockRunContext(deps)
        results = await query_packages(ctx, min_guests=300)
        assert len(results) == 0  # Gold Package max is 200
```

---

## References

- [01-backend-architecture.md](./01-backend-architecture.md) — Domain structure and service patterns
- [03-rag-pipeline.md](./03-rag-pipeline.md) — RAG search implementation (used by `search_faq`)
- [04-chat-to-booking-bridge.md](./04-chat-to-booking-bridge.md) — How preferences become a booking
