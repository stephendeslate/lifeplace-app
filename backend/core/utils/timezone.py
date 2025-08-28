# backend/core/utils/timezone.py
"""
Timezone utilities for managing Philippines-based events.
All events occur in the Philippines (Asia/Manila timezone).
"""

import zoneinfo
from datetime import datetime
from typing import Optional, Tuple

from django.conf import settings
from django.utils import timezone as django_timezone


class TimezoneManager:
    """Manager for handling timezone operations with Philippines as the primary timezone."""
    
    BUSINESS_TZ = zoneinfo.ZoneInfo('Asia/Manila')
    BUSINESS_TZ_NAME = 'Asia/Manila'
    BUSINESS_TZ_DISPLAY = 'PHT'
    
    @classmethod
    def get_business_timezone(cls) -> zoneinfo.ZoneInfo:
        """Get the business timezone (Philippines)."""
        return cls.BUSINESS_TZ
    
    @classmethod
    def now_in_business_timezone(cls) -> datetime:
        """Get current time in Philippines timezone."""
        return django_timezone.now().astimezone(cls.BUSINESS_TZ)
    
    @classmethod
    def convert_to_business_timezone(cls, dt: datetime) -> datetime:
        """Convert any datetime to Philippines timezone."""
        if django_timezone.is_naive(dt):
            # Make it aware in business timezone
            dt = django_timezone.make_aware(dt, cls.BUSINESS_TZ)
        return dt.astimezone(cls.BUSINESS_TZ)
    
    @classmethod
    def convert_to_user_timezone(cls, dt: datetime, user_timezone: str) -> datetime:
        """
        Convert datetime to user's preferred timezone.
        Used primarily for admin users who may want to see times in their local timezone.
        """
        try:
            user_tz = zoneinfo.ZoneInfo(user_timezone)
            if django_timezone.is_naive(dt):
                dt = django_timezone.make_aware(dt, cls.BUSINESS_TZ)
            return dt.astimezone(user_tz)
        except Exception:
            # Fallback to business timezone if conversion fails
            return cls.convert_to_business_timezone(dt)
    
    @classmethod
    def format_business_datetime(cls, dt: datetime, include_timezone: bool = True) -> str:
        """
        Format datetime for display in Philippines timezone.
        Returns: "January 25, 2025 at 2:00 PM PHT"
        """
        business_dt = cls.convert_to_business_timezone(dt)
        formatted = business_dt.strftime('%B %d, %Y at %-I:%M %p')
        if include_timezone:
            formatted += f" {cls.BUSINESS_TZ_DISPLAY}"
        return formatted
    
    @classmethod
    def format_dual_timezone(cls, dt: datetime, user_timezone: str) -> Tuple[str, str]:
        """
        Format datetime in both business and user timezones.
        Returns: ("2:00 PM PHT", "10:00 PM PST")
        """
        business_dt = cls.convert_to_business_timezone(dt)
        user_dt = cls.convert_to_user_timezone(dt, user_timezone)
        
        business_format = business_dt.strftime('%-I:%M %p') + f" {cls.BUSINESS_TZ_DISPLAY}"
        
        # Get user timezone abbreviation
        user_tz_name = user_dt.strftime('%Z') or user_timezone.split('/')[-1]
        user_format = user_dt.strftime('%-I:%M %p') + f" {user_tz_name}"
        
        # Add date if different
        if business_dt.date() != user_dt.date():
            if user_dt.date() < business_dt.date():
                user_format += " (previous day)"
            else:
                user_format += " (next day)"
        
        return business_format, user_format
    
    @classmethod
    def is_business_hours(cls, dt: Optional[datetime] = None) -> bool:
        """
        Check if given datetime is within Philippines business hours.
        Default business hours: 9 AM - 6 PM PHT
        """
        if dt is None:
            dt = cls.now_in_business_timezone()
        else:
            dt = cls.convert_to_business_timezone(dt)
        
        # Check if it's a weekday (Monday = 0, Sunday = 6)
        if dt.weekday() >= 5:  # Saturday or Sunday
            return False
        
        # Check if within business hours (9 AM - 6 PM)
        return 9 <= dt.hour < 18
    
    @classmethod
    def get_timezone_info(cls, user) -> dict:
        """
        Get timezone information for a user.
        Returns display preferences and current times.
        """
        info = {
            'business_timezone': cls.BUSINESS_TZ_NAME,
            'business_timezone_display': cls.BUSINESS_TZ_DISPLAY,
            'business_time': cls.now_in_business_timezone().isoformat(),
            'display_mode': 'business_only',
            'user_timezone': None,
            'user_time': None,
        }
        
        if hasattr(user, 'profile') and user.profile:
            info['display_mode'] = user.profile.timezone_display_mode
            info['user_timezone'] = user.profile.display_timezone
            
            if user.profile.display_timezone != cls.BUSINESS_TZ_NAME:
                try:
                    user_tz = zoneinfo.ZoneInfo(user.profile.display_timezone)
                    info['user_time'] = django_timezone.now().astimezone(user_tz).isoformat()
                except Exception:
                    pass
        
        return info
    
    @classmethod
    def serialize_datetime_with_timezone(cls, dt: datetime, user=None) -> dict:
        """
        Serialize datetime with timezone information for API responses.
        """
        business_dt = cls.convert_to_business_timezone(dt)
        
        data = {
            'datetime': business_dt.isoformat(),
            'display': cls.format_business_datetime(business_dt),
            'timezone': cls.BUSINESS_TZ_NAME,
            'timezone_display': cls.BUSINESS_TZ_DISPLAY,
        }
        
        # Add user timezone if applicable
        if user and hasattr(user, 'profile') and user.profile:
            if user.profile.timezone_display_mode in ['business_with_local', 'dual_display']:
                if user.profile.display_timezone != cls.BUSINESS_TZ_NAME:
                    user_dt = cls.convert_to_user_timezone(dt, user.profile.display_timezone)
                    data['user_timezone'] = {
                        'datetime': user_dt.isoformat(),
                        'display': user_dt.strftime('%B %d, %Y at %-I:%M %p %Z'),
                        'timezone': user.profile.display_timezone,
                    }
        
        return data


# Convenience functions
def get_business_time() -> datetime:
    """Get current time in Philippines timezone."""
    return TimezoneManager.now_in_business_timezone()


def format_philippines_time(dt: datetime, include_timezone: bool = True) -> str:
    """Format datetime for display in Philippines timezone."""
    return TimezoneManager.format_business_datetime(dt, include_timezone)


def is_business_hours() -> bool:
    """Check if current time is within Philippines business hours."""
    return TimezoneManager.is_business_hours()