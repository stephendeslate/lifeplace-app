# backend/core/domains/notifications/signals/__init__.py
"""
Notifications signals module

This module handles all signal connections for the notifications domain.
Signals are organized by functionality for better maintainability.
"""

import logging
from django.apps import apps

logger = logging.getLogger(__name__)

def connect_all_signals():
    """Connect all notification signals when the app is ready"""
    try:
        from . import (
            setup_signals,      # Initial setup and migration signals
            user_signals,       # User-related notifications
            domain_signals,     # Cross-domain notification signals
            cleanup_signals,    # Maintenance and cleanup signals
        )
        
        # Setup signals are automatically connected via @receiver decorators
        # Domain signals need manual connection for dynamic model loading
        domain_signals.connect_domain_signals()
        
        logger.info("Successfully connected all notification signals")
        
    except Exception as e:
        logger.error(f"Error connecting notification signals: {str(e)}")
        # Don't raise to avoid breaking app startup