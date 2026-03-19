# backend/core/types.py
"""
Base types for cross-domain data transfer objects (DTOs).

All cross-domain data should flow through frozen dataclasses rather than
raw dicts. This provides type safety, IDE support, and self-documenting
interfaces between domains.

Usage:
    from core.types import DomainDTO

    @dataclass(frozen=True)
    class PaymentResult(DomainDTO):
        payment_id: int
        status: str
        amount: Decimal

See ADR-002 for conventions: docs/architecture/ADR-002-refactoring-conventions.md
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, fields
from typing import Any


@dataclass(frozen=True)
class DomainDTO:
    """Base class for all cross-domain data transfer objects.

    Frozen dataclasses enforce immutability — once created, the DTO cannot
    be modified. This prevents accidental mutation when data crosses domain
    boundaries.

    Subclasses should:
    - Use `frozen=True` (inherited from this base)
    - Use keyword-only arguments for clarity at call sites
    - Include type annotations on all fields
    """

    def to_dict(self) -> dict[str, Any]:
        """Convert to plain dict for serialization."""
        return asdict(self)

    @classmethod
    def field_names(cls) -> tuple[str, ...]:
        """Return field names for introspection."""
        return tuple(f.name for f in fields(cls))
