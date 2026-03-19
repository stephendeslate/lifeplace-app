# backend/core/domains/communications/context_service/__init__.py
"""
Backward-compatibility shim.

All classes have moved to submodules. This module re-exports
them so existing imports continue to work unchanged.

Original: 974 lines → split into context_service/{constants,service,context_providers}.py
"""
from .constants import (  # noqa: F401
    PHILIPPINES_TZ_DISPLAY,
    PHILIPPINES_TZ_LONG,
    PHILIPPINES_TZ_OFFSET,
    REQUIRED_OBJECTS,
    VARIABLE_GROUPS,
    ContextType,
)
from .service import CommunicationContextService  # noqa: F401

__all__ = [
    "ContextType",
    "REQUIRED_OBJECTS",
    "VARIABLE_GROUPS",
    "PHILIPPINES_TZ_DISPLAY",
    "PHILIPPINES_TZ_LONG",
    "PHILIPPINES_TZ_OFFSET",
    "CommunicationContextService",
]
