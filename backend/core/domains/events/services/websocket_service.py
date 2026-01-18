# backend/core/domains/events/services/websocket_service.py
"""
WebSocket Service for Availability Broadcasts

Provides a synchronous interface to broadcast availability updates
via Django Channels. Can be called from within Django views, services,
and signal handlers.
"""

import logging
from datetime import date, datetime
from typing import Optional
from django.utils import timezone

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)

# Must match the group name in AvailabilityConsumer
AVAILABILITY_GROUP = 'availability_updates'


class AvailabilityWebSocketService:
    """
    Service for broadcasting date availability updates via WebSocket.

    This service provides synchronous methods that can be called from
    regular Django code (views, services, signals, etc.).

    Usage:
        from core.domains.events.services.websocket_service import AvailabilityWebSocketService

        # When a date is blocked by a payment
        AvailabilityWebSocketService.broadcast_date_blocked(
            date=event.start_date.date(),
            blocking_event_id=event.id
        )

        # When a date is released
        AvailabilityWebSocketService.broadcast_date_released(
            date=event.start_date.date()
        )
    """

    @staticmethod
    def broadcast_date_blocked(
        date: date,
        blocking_event_id: int,
        reason: str = 'PAYMENT_COMPLETED'
    ) -> bool:
        """
        Broadcast that a date has been blocked.

        Args:
            date: The date that was blocked
            blocking_event_id: ID of the event that blocked the date
            reason: Reason for blocking (default: PAYMENT_COMPLETED)

        Returns:
            bool: True if broadcast was successful, False otherwise
        """
        try:
            channel_layer = get_channel_layer()

            if channel_layer is None:
                logger.warning("Channel layer not configured, cannot broadcast date_blocked")
                return False

            # Convert date to string for JSON serialization
            date_str = date.isoformat() if hasattr(date, 'isoformat') else str(date)

            message = {
                'type': 'date_blocked',
                'date': date_str,
                'event_id': blocking_event_id,
                'reason': reason,
                'timestamp': timezone.now().isoformat()
            }

            # Use async_to_sync to call async channel layer method
            async_to_sync(channel_layer.group_send)(
                AVAILABILITY_GROUP,
                message
            )

            logger.info(
                f"Broadcast date_blocked: {date_str} by event {blocking_event_id}"
            )
            return True

        except Exception as e:
            logger.error(f"Failed to broadcast date_blocked: {e}")
            return False

    @staticmethod
    def broadcast_date_released(
        date: date,
        reason: str = 'RELEASED'
    ) -> bool:
        """
        Broadcast that a date has been released.

        Args:
            date: The date that was released
            reason: Reason for release (e.g., EVENT_CANCELLED, RESERVATION_EXPIRED)

        Returns:
            bool: True if broadcast was successful, False otherwise
        """
        try:
            channel_layer = get_channel_layer()

            if channel_layer is None:
                logger.warning("Channel layer not configured, cannot broadcast date_released")
                return False

            date_str = date.isoformat() if hasattr(date, 'isoformat') else str(date)

            message = {
                'type': 'date_released',
                'date': date_str,
                'reason': reason,
                'timestamp': timezone.now().isoformat()
            }

            async_to_sync(channel_layer.group_send)(
                AVAILABILITY_GROUP,
                message
            )

            logger.info(f"Broadcast date_released: {date_str} (reason: {reason})")
            return True

        except Exception as e:
            logger.error(f"Failed to broadcast date_released: {e}")
            return False

    @staticmethod
    def broadcast_reservation_created(
        date: date,
        expires_at: datetime
    ) -> bool:
        """
        Broadcast that a temporary reservation has been created.

        This is an optional notification that informs other clients
        that a date is being held during payment processing.

        Args:
            date: The date being reserved
            expires_at: When the reservation expires

        Returns:
            bool: True if broadcast was successful, False otherwise
        """
        try:
            channel_layer = get_channel_layer()

            if channel_layer is None:
                logger.debug("Channel layer not configured, cannot broadcast reservation_created")
                return False

            date_str = date.isoformat() if hasattr(date, 'isoformat') else str(date)
            expires_str = expires_at.isoformat() if hasattr(expires_at, 'isoformat') else str(expires_at)

            message = {
                'type': 'reservation_created',
                'date': date_str,
                'expires_at': expires_str,
                'timestamp': timezone.now().isoformat()
            }

            async_to_sync(channel_layer.group_send)(
                AVAILABILITY_GROUP,
                message
            )

            logger.debug(f"Broadcast reservation_created: {date_str}")
            return True

        except Exception as e:
            logger.error(f"Failed to broadcast reservation_created: {e}")
            return False

    @staticmethod
    def broadcast_reservation_released(
        date: date,
        reason: str = 'RELEASED'
    ) -> bool:
        """
        Broadcast that a temporary reservation has been released.

        Args:
            date: The date that was reserved
            reason: Reason for release (EXPIRED, PAYMENT_FAILED, USER_CANCELLED)

        Returns:
            bool: True if broadcast was successful, False otherwise
        """
        try:
            channel_layer = get_channel_layer()

            if channel_layer is None:
                logger.debug("Channel layer not configured, cannot broadcast reservation_released")
                return False

            date_str = date.isoformat() if hasattr(date, 'isoformat') else str(date)

            message = {
                'type': 'reservation_released',
                'date': date_str,
                'reason': reason,
                'timestamp': timezone.now().isoformat()
            }

            async_to_sync(channel_layer.group_send)(
                AVAILABILITY_GROUP,
                message
            )

            logger.debug(f"Broadcast reservation_released: {date_str}")
            return True

        except Exception as e:
            logger.error(f"Failed to broadcast reservation_released: {e}")
            return False


# Convenience singleton instance
availability_ws_service = AvailabilityWebSocketService()
