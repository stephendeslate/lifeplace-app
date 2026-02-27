# AI Chat Assistant — Chat-to-Booking-Session Bridge

**Document:** 04-chat-to-booking-bridge.md
**Part of:** [AI Chat Assistant Architecture](./00-master-overview.md)
**Status:** Design Proposal
**Date:** 2026-02-19

---

## 1. Overview

This document defines how a completed AI chat conversation transitions into the existing booking flow. The bridge takes the structured preferences accumulated during the chat (`ChatSession.extracted_preferences`) and creates a pre-populated `BookingSession` with `booking_data` that matches the exact schema expected by the existing booking flow infrastructure.

**Core constraint:** The bridge must produce data that the existing `BookingSessionService` can process without modification. No changes to the booking flow codebase are required.

---

## 2. The Problem

The chat assistant accumulates preferences in this shape (from `ChatSession.extracted_preferences`):

```python
{
    "event_type": "wedding",
    "event_type_id": 5,
    "guest_count": 150,
    "preferred_date": "2026-09-15",
    "preferred_time": "18:00",
    "venue_ids": [1, 3],
    "recommended_packages": [
        {"id": 1, "name": "Gold Package", "price": "50000.00"}
    ],
    "recommended_addons": [
        {"id": 5, "name": "Premium Sound", "price": "5000.00"}
    ],
    "special_requests": "Need valet parking",
    ...
}
```

The booking flow expects data in this shape (`BookingSession.booking_data`):

```python
{
    "selected_packages": [{"id": 1, "quantity": 1, ...}],
    "selected_addons": [{"id": 5, "quantity": 1, ...}],
    "venue_additional_hours": {},
    "step_3": {"start_date": "2026-09-15", "start_time": "18:00", ...},
    "step_7": {"terms_accepted": False, ...},
    ...
}
```

The bridge translates between these two schemas.

---

## 3. Bridge Architecture

### 3.1 Service Location

```python
# services/booking_bridge_service.py (in the ai_chat domain)
```

The bridge service lives in the `ai_chat` domain, not in `bookingflow`. It depends on `bookingflow` services but doesn't modify them.

### 3.2 Service Implementation

```python
# services/booking_bridge_service.py
import logging
from asgiref.sync import sync_to_async
from django.db import transaction

from core.domains.bookingflow.models import BookingFlow, BookingSession, BookingFlowStep
from core.domains.bookingflow.services.booking_session_service import BookingSessionService

logger = logging.getLogger(__name__)


class BookingBridgeService:
    """
    Bridges AI chat preferences into a pre-populated BookingSession.
    Creates a session that the client can resume in the booking flow UI.
    """

    @staticmethod
    async def create_booking_from_chat(chat_session) -> BookingSession:
        """
        Main entry point. Creates a BookingSession from ChatSession preferences.

        Flow:
        1. Resolve the correct BookingFlow for the event type
        2. Create a BookingSession via the existing service
        3. Map chat preferences to booking_data schema
        4. Pre-populate step data for each relevant step
        5. Mark completed steps where data is sufficient
        6. Link the BookingSession back to the ChatSession
        7. Return the session (client navigates to booking flow UI)

        Raises:
            BookingFlowNotFound: If no active flow exists for the event type.
            ValidationError: If preferences are insufficient.
        """
        preferences = chat_session.extracted_preferences

        @sync_to_async
        def _create():
            with transaction.atomic():
                # Step 1: Find the right booking flow
                booking_flow = BookingBridgeService._resolve_booking_flow(preferences)

                # Step 2: Build booking_data from preferences
                booking_data = BookingBridgeService._map_preferences_to_booking_data(
                    preferences, booking_flow
                )

                # Step 3: Create the session
                booking_session = BookingSessionService.create_session(
                    booking_flow_id=booking_flow.id,
                    client_id=chat_session.client_id,
                    session_data={
                        'booking_data': booking_data,
                        'ip_address': chat_session.ip_address,
                        'user_agent': chat_session.user_agent,
                    }
                )

                # Step 4: Determine which step to land on
                landing_step = BookingBridgeService._determine_landing_step(
                    booking_flow, preferences
                )

                if landing_step:
                    booking_session.current_step = landing_step
                    booking_session.save(update_fields=['current_step'])

                # Step 5: Mark pre-completed steps
                completed_steps = BookingBridgeService._get_completable_steps(
                    booking_flow, preferences
                )
                if completed_steps:
                    booking_session.completed_steps.set(completed_steps)

                # Step 6: Link back to chat session
                chat_session.booking_session = booking_session
                chat_session.status = 'completed'
                chat_session.save(update_fields=['booking_session', 'status', 'updated_at'])

                logger.info(
                    f"Created BookingSession {booking_session.session_id} "
                    f"from ChatSession {chat_session.id} "
                    f"(flow: {booking_flow.name}, event_type: {preferences.get('event_type')})"
                )

                return booking_session

        return await _create()

    @staticmethod
    def _resolve_booking_flow(preferences: dict) -> BookingFlow:
        """
        Find the active BookingFlow for the user's event type.

        Priority:
        1. Flow matching the specific event_type_id
        2. Flow with event_type=None (catch-all "Any Event Type" flow)

        Raises BookingFlowNotFound if no flow exists.
        """
        from core.domains.bookingflow.exceptions import BookingFlowNotFound

        event_type_id = preferences.get('event_type_id')

        if event_type_id:
            flow = BookingFlow.objects.filter(
                event_type_id=event_type_id,
                is_active=True,
            ).first()

            if flow:
                return flow

        # Fallback: catch-all flow
        flow = BookingFlow.objects.filter(
            event_type__isnull=True,
            is_active=True,
        ).first()

        if flow:
            return flow

        raise BookingFlowNotFound(
            detail="No active booking flow found for this event type."
        )

    @staticmethod
    def _map_preferences_to_booking_data(
        preferences: dict,
        booking_flow: BookingFlow,
    ) -> dict:
        """
        Transform ChatSession.extracted_preferences into
        BookingSession.booking_data format.

        This is the core mapping logic. It produces the exact structure
        that BookingSessionService.complete_booking() expects.
        """
        booking_data = {}

        # --- Root-level fields (always at root) ---

        # Packages
        recommended_packages = preferences.get('recommended_packages', [])
        if recommended_packages:
            booking_data['selected_packages'] = [
                {
                    'id': pkg['id'],
                    'quantity': 1,
                    'name': pkg.get('name', ''),
                    'price': pkg.get('price', '0.00'),
                }
                for pkg in recommended_packages
            ]

        # Add-ons
        recommended_addons = preferences.get('recommended_addons', [])
        if recommended_addons:
            booking_data['selected_addons'] = [
                {
                    'id': addon['id'],
                    'quantity': 1,
                    'name': addon.get('name', ''),
                    'price': addon.get('price', '0.00'),
                }
                for addon in recommended_addons
            ]

        # Venue additional hours (default empty)
        booking_data['venue_additional_hours'] = {}

        # Event type
        if preferences.get('event_type_id'):
            booking_data['event_type_id'] = preferences['event_type_id']

        # Special requests
        if preferences.get('special_requests'):
            booking_data['special_requests'] = preferences['special_requests']

        # --- Step-keyed data ---

        steps = booking_flow.steps.filter(is_enabled=True).order_by('order')
        step_map = {step.step_type: step for step in steps}

        # Venue Selection step
        if 'venue_selection' in step_map and preferences.get('venue_ids'):
            step_id = step_map['venue_selection'].id
            booking_data[f'step_{step_id}'] = {
                'selected_venues': preferences['venue_ids'],
            }

        # Date/Time step
        if 'date_time' in step_map:
            date_time_data = {}
            if preferences.get('preferred_date'):
                date_time_data['start_date'] = preferences['preferred_date']
            if preferences.get('preferred_time'):
                date_time_data['start_time'] = preferences['preferred_time']
            if preferences.get('duration_days'):
                date_time_data['duration_days'] = preferences['duration_days']

            if date_time_data:
                step_id = step_map['date_time'].id
                booking_data[f'step_{step_id}'] = date_time_data

        # Package Selection step
        if 'package_selection' in step_map and recommended_packages:
            step_id = step_map['package_selection'].id
            booking_data[f'step_{step_id}'] = {
                'confirmed': True,  # User confirmed in chat
            }

        # Add-on Selection step
        if 'addon_selection' in step_map and recommended_addons:
            step_id = step_map['addon_selection'].id
            booking_data[f'step_{step_id}'] = {
                'confirmed': True,
            }

        # Contact Info step (if user is authenticated)
        if 'contact_info' in step_map:
            contact_data = {}
            if preferences.get('full_name'):
                contact_data['full_name'] = preferences['full_name']
            if preferences.get('email'):
                contact_data['email'] = preferences['email']
            if preferences.get('phone'):
                contact_data['phone'] = preferences['phone']

            if contact_data:
                step_id = step_map['contact_info'].id
                booking_data[f'step_{step_id}'] = contact_data

        return booking_data

    @staticmethod
    def _determine_landing_step(
        booking_flow: BookingFlow,
        preferences: dict,
    ) -> BookingFlowStep | None:
        """
        Determine which step the client should land on when they
        open the booking flow. Skip steps that are already sufficiently
        populated from the chat.

        Strategy: Land on the first step that needs user input.
        """
        steps = list(
            booking_flow.steps.filter(is_enabled=True).order_by('order')
        )

        for step in steps:
            if step.step_type == 'introduction':
                # Always skip intro — chat already served this purpose
                continue

            if step.step_type == 'venue_selection':
                if preferences.get('venue_ids'):
                    continue  # Already selected in chat

            if step.step_type == 'date_time':
                if preferences.get('preferred_date'):
                    continue  # Date selected, but user should confirm

                # Date not set — land here
                return step

            if step.step_type == 'package_selection':
                if preferences.get('recommended_packages'):
                    continue  # Packages recommended, but user should review

            if step.step_type == 'addon_selection':
                # Always show — user may want to add/remove
                return step

            if step.step_type == 'questionnaire':
                # Always show — not collected in chat
                return step

            if step.step_type == 'pricing_summary':
                # Good landing point if packages + dates are set
                if (preferences.get('recommended_packages') and
                        preferences.get('preferred_date')):
                    return step

            # Default: land on this step
            return step

        # Fallback: first enabled step
        return steps[0] if steps else None

    @staticmethod
    def _get_completable_steps(
        booking_flow: BookingFlow,
        preferences: dict,
    ) -> list[BookingFlowStep]:
        """
        Return steps that can be marked as completed based on
        the chat preferences. Only mark a step complete if its
        data requirements are fully satisfied.
        """
        completed = []
        steps = booking_flow.steps.filter(is_enabled=True).order_by('order')

        for step in steps:
            if step.step_type == 'introduction':
                # Introduction doesn't require data
                completed.append(step)

            elif step.step_type == 'venue_selection':
                if preferences.get('venue_ids'):
                    completed.append(step)

            elif step.step_type == 'package_selection':
                if preferences.get('recommended_packages'):
                    completed.append(step)

            elif step.step_type == 'addon_selection':
                # Only complete if user explicitly said no add-ons or selected some
                if preferences.get('recommended_addons') is not None:
                    completed.append(step)

            # date_time: Don't auto-complete — user should confirm dates
            # questionnaire: Never auto-complete — not collected in chat
            # pricing_summary: Never auto-complete — requires user review
            # contact_info: Don't auto-complete — needs verification
            # payment_info: Never auto-complete — requires user action
            # confirmation: Never auto-complete

        return completed
```

---

## 4. Data Flow Diagram

```
ChatSession                              BookingSession
┌─────────────────────────┐             ┌──────────────────────────────┐
│ extracted_preferences:  │             │ booking_data:                │
│                         │  ─bridge──▶ │                              │
│ event_type: "wedding"   │             │ event_type_id: 5             │
│ event_type_id: 5        │             │                              │
│ guest_count: 150        │             │ selected_packages: [         │
│ preferred_date:         │             │   {id: 1, quantity: 1, ...}  │
│   "2026-09-15"          │             │ ]                            │
│ preferred_time: "18:00" │             │                              │
│ venue_ids: [1, 3]       │             │ selected_addons: [           │
│ recommended_packages: [ │             │   {id: 5, quantity: 1, ...}  │
│   {id:1, name:"Gold"}   │             │ ]                            │
│ ]                       │             │                              │
│ recommended_addons: [   │             │ venue_additional_hours: {}    │
│   {id:5, name:"Sound"}  │             │                              │
│ ]                       │             │ step_2: {                    │
│ special_requests:       │             │   selected_venues: [1, 3]    │
│   "Need valet parking"  │             │ }                            │
│                         │             │                              │
│ status: "completed" ◀───│             │ step_3: {                    │
│ booking_session: ───────│──────FK───▶ │   start_date: "2026-09-15"   │
│                         │             │   start_time: "18:00"        │
└─────────────────────────┘             │ }                            │
                                        │                              │
                                        │ special_requests:            │
                                        │   "Need valet parking"       │
                                        │                              │
                                        │ current_step: pricing_summary│
                                        │ completed_steps: [intro,     │
                                        │   venue, package, addon]     │
                                        └──────────────────────────────┘
```

---

## 5. User Experience Flow

### 5.1 Chat Conversation

```
User: I want a rustic garden wedding for 150 guests on September 15, 2026
AI:   [calls tools, presents options]
      Based on your preferences, I recommend the Gold Package...
      Would you like me to also add the Premium Sound add-on?
User: Yes, and can we have the pool area for an after-party?
AI:   [calls calculate_pricing with packages + pool venue]
      Here's the pricing breakdown: ...
      Ready to proceed with booking?
User: Yes, let's book it!
```

### 5.2 Bridge Activation

The frontend calls `POST /api/ai-chat/sessions/{id}/start-booking/`

The bridge:
1. Creates `BookingSession` with pre-populated `booking_data`
2. Sets `current_step` to the pricing summary (since packages + date are already set)
3. Marks introduction, venue selection, package selection as completed

### 5.3 Booking Flow Handoff

The API returns `{ booking_session_id: "uuid" }`. The frontend navigates to:

```
/booking?session=<uuid>
```

The existing booking flow UI loads the session, sees pre-populated data, and renders the pricing summary step. The client reviews, accepts terms, and proceeds to payment — all via the existing booking flow code.

### 5.4 Partial Handoff (Missing Preferences)

If the chat didn't collect enough data (e.g., no date selected):
- The bridge still creates the session with whatever data is available
- `current_step` is set to the first step that needs input (e.g., date/time)
- The client fills in the remaining steps normally

This graceful degradation means the bridge never fails due to incomplete preferences — it just starts the booking flow at the right point.

---

## 6. Authentication Requirement

The `start-booking` endpoint requires authentication (`IsAuthenticated`). This is intentional because:

1. `BookingSession` needs a `client` FK for the booking to be associated with a user
2. Payment processing requires an authenticated user
3. The existing booking flow expects a logged-in client

**If the user was chatting anonymously:**
- The frontend prompts them to log in or register before starting the booking
- After authentication, the `ChatSession` is linked to the user (via `client` FK update)
- Then the bridge proceeds normally

**If the user was already authenticated:**
- The bridge proceeds immediately

---

## 7. Edge Cases

### 7.1 Chat Session Already Converted

If `chat_session.booking_session` is already set, the bridge returns the existing booking session rather than creating a duplicate:

```python
if chat_session.booking_session:
    return chat_session.booking_session  # Idempotent
```

### 7.2 No Active Booking Flow

If no booking flow is active for the event type, the bridge raises `BookingFlowNotFound`. The frontend shows an appropriate message directing the user to contact LifePlace.

### 7.3 Recommended Packages No Longer Active

Between the chat conversation and the booking creation, a package could be deactivated. The bridge includes the IDs in `booking_data`, but the booking flow's package selection step will filter by `is_active=True`. If a package is inactive:
- It won't appear in the package selection UI
- The user selects an alternative
- This is the existing behavior — no special handling needed

### 7.4 Date No Longer Available

Same as above — the date/time step has availability checking built in. If the date became unavailable between the chat and the booking, the user is informed during the date/time step.

### 7.5 Chat Session Expired

If the chat session has expired (`is_expired` returns True), the bridge rejects the request:

```python
if chat_session.is_expired:
    raise ChatSessionExpired()
```

---

## 8. Metrics and Tracking

### 8.1 Conversion Tracking

The link between `ChatSession` and `BookingSession` enables conversion tracking:

```python
# How many chat sessions converted to bookings?
conversion_count = ChatSession.objects.filter(
    status='completed',
    booking_session__isnull=False,
).count()

# How many of those bookings completed payment?
paid_count = ChatSession.objects.filter(
    status='completed',
    booking_session__is_completed=True,
).count()

# Funnel: chat → booking started → booking completed
```

### 8.2 What Preferences Drive Conversions

The `extracted_preferences` JSON field is queryable, enabling analysis:

```python
# Which event types convert most?
from django.db.models import Count
ChatSession.objects.filter(
    status='completed'
).values(
    'extracted_preferences__event_type'
).annotate(
    count=Count('id')
).order_by('-count')
```

---

## 9. What Is NOT Modified

This bridge explicitly does NOT modify:

| Component | Status |
|-----------|--------|
| `BookingSession` model | Unchanged |
| `BookingSessionService` | Unchanged |
| `BookingFlowStep` validation | Unchanged |
| `PricingCalculationService` | Unchanged |
| Booking flow frontend components | Unchanged |
| Payment processing | Unchanged |
| Event creation on completion | Unchanged |
| Email notifications | Unchanged |

The entire bridge is an additive feature in the `ai_chat` domain that consumes the existing booking flow API as-is.

---

## References

- [01-backend-architecture.md](./01-backend-architecture.md) — ChatSession model, service patterns
- [02-tool-schema-design.md](./02-tool-schema-design.md) — `update_preferences` tool that builds extracted_preferences
- [05-frontend-chat-ui.md](./05-frontend-chat-ui.md) — Frontend handling of the booking handoff
