# ADR-002: Backend Refactoring Conventions — AI-Navigable DDD Monorepo

## Status
**Accepted** — 2026-03-19

## Context

The Lifeplace backend has grown to ~191K lines across 20 domains. Several files exceed 1,000 lines (worst: `booking_session_service.py` at 2,672 lines with 40 cross-domain imports). Large files degrade AI code navigation, slow human review, and increase merge conflict risk.

This ADR establishes the target structure, naming conventions, and refactoring patterns for breaking oversized files into AI-navigable modules while keeping every commit deployable.

## Decision

### Target Domain Structure

```
core/domains/{domain}/
  models/                    # Package if >500 lines, else flat models.py
    __init__.py              # Re-exports all model classes
    {entity}.py              # One model per file, 100–300 lines
  services/                  # Package if >500 lines, else flat services.py
    __init__.py
    {verb}_service.py        # Write operations only
  selectors/                 # NEW — read-only query logic
    __init__.py
    {entity}_selectors.py
  serializers/               # Package if >500 lines, else flat
    __init__.py
    {entity}_serializers.py
  views/                     # Package if >500 lines, else flat
    __init__.py
    {entity}_views.py
  types.py                   # Frozen dataclass DTOs for cross-domain data
  basic_serializers.py       # Existing pattern — keep
  exceptions.py              # Domain-specific exceptions
  tasks.py                   # Keep flat unless >500 lines
  signals.py
  urls.py
  admin.py
  tests/                     # Already colocated — keep
```

### Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| Single file | >500 lines | Must be split |
| Cross-domain data | Raw dict | Must use frozen dataclass DTO |
| Query in service | Read-only | Must move to selector |

### Key Patterns

#### 1. Selectors (Read/Write Separation)

All read-only query logic lives in `selectors.py` (or `selectors/` package). Selectors:
- Never mutate data (no `.save()`, `.create()`, `.delete()`, `.update()`)
- Use keyword-only arguments (`*`) for clarity at call sites
- Return QuerySets or model instances
- Are pure functions (static methods or module-level functions)

```python
# core/domains/notes/selectors.py
def get_notes_for_object(
    *,
    content_type_model: str,
    object_id: int,
    client_visible_only: bool = False,
) -> QuerySet[Note]:
    ...
```

Reference implementation: `core/domains/notes/selectors.py`

#### 2. Cross-Domain DTOs

Cross-domain data flows through frozen dataclasses inheriting from `core.types.DomainDTO`:

```python
# core/domains/payments/types.py
from core.types import DomainDTO
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)
class PaymentResult(DomainDTO):
    payment_id: int
    status: str
    amount: Decimal
    currency: str = "PHP"
```

Rules:
- Always frozen (immutable)
- All fields typed
- Used instead of raw dicts when data crosses domain boundaries
- Defined in the *producing* domain's `types.py`

#### 3. Module-to-Package Promotion

When a flat file (e.g., `models.py`) exceeds 500 lines, promote to a package:

1. Create `models/` directory
2. Split into submodules (`models/{entity}.py`)
3. Create `models/__init__.py` that re-exports all public names
4. External imports remain unchanged: `from core.domains.payments.models import Payment`

#### 4. Service Splits (Facade Pattern)

When splitting oversized services:
1. Create `services/` package with focused submodules
2. Original service becomes a thin facade delegating to submodules
3. All external callers remain unchanged
4. Internal methods move to the most relevant submodule

### Refactoring Approach: Strangler Fig

Each phase leaves the codebase working and deployable:
- No API contract changes
- No migration changes
- No frontend changes
- One git branch per phase (e.g., `refactor/phase-0-foundation`)
- Each branch merged via PR before starting the next

### Naming Conventions

| File Type | Naming | Example |
|-----------|--------|---------|
| Service (write) | `{verb}_service.py` | `booking_completion_service.py` |
| Selector (read) | `{entity}_selectors.py` | `note_selectors.py` |
| Model | `{entity}.py` | `payment.py`, `invoice.py` |
| View | `{entity}_views.py` | `event_views.py` |
| Serializer | `{entity}_serializers.py` | `payment_serializers.py` |
| DTO types | `types.py` | `core/domains/payments/types.py` |

### Typing Strategy

- `pyproject.toml` configures mypy for gradual adoption
- New files (`selectors/`, `types.py`) require strict typing
- Existing files: type hints added when touched during refactoring
- All public method signatures must be typed in refactored files

## Consequences

### Positive
- Every file under 500 lines — reliable AI navigation
- Clear read/write separation reduces accidental side effects
- Typed DTOs catch cross-domain contract drift at lint time
- Smaller files → fewer merge conflicts
- Self-documenting file names (e.g., `booking_completion_service.py`)

### Negative
- More files to navigate (mitigated by consistent naming)
- `__init__.py` re-exports add a maintenance surface
- Gradual migration means two patterns coexist temporarily

### Risks
- Re-export `__init__.py` files may drift from actual module contents
- Splitting services may surface hidden circular dependencies

## Verification Checklist (Every Phase)

1. `python manage.py check` — model discovery intact
2. `python manage.py makemigrations --check --dry-run` — no migration changes
3. `pytest --cov` — 60% threshold met
4. `python -c "from core.domains.{domain}.models import *"` — imports work
5. No new circular imports

## References

- **Base DTO class**: `backend/core/types.py`
- **Reference selector**: `backend/core/domains/notes/selectors.py`
- **mypy config**: `backend/pyproject.toml`
- **ADR-001**: `docs/architecture/ADR-001-timezone-handling.md`

## Decision Makers
- **Architect**: Stephen Deslate
- **Date**: 2026-03-19
- **Reviewed by**: Claude Code (AI Assistant)

## Change Log
- 2026-03-19: Initial decision documented (Phase 0)

---

**Last Updated**: 2026-03-19
