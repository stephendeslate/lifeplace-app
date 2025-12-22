# core/domains/users/throttling.py
"""
Throttle classes for Data Subject Rights (DSR) endpoints.

These classes provide rate limiting for DPA compliance endpoints to prevent abuse
while still allowing legitimate access to personal data rights.
"""

from rest_framework.throttling import UserRateThrottle
from django.conf import settings


class DSRBaseThrottle(UserRateThrottle):
    """Base throttle class for Data Subject Rights endpoints"""

    def allow_request(self, request, view):
        """Skip throttling in development mode"""
        if settings.DEBUG:
            return True
        return super().allow_request(request, view)


class DataAccessThrottle(DSRBaseThrottle):
    """
    Throttle for Right to Access endpoint.
    Rate: 10/hour
    """
    scope = 'data_access'


class DataExportThrottle(DSRBaseThrottle):
    """
    Throttle for Right to Portability (export) endpoint.
    Rate: 1/day
    """
    scope = 'data_export'


class AccountDeletionThrottle(DSRBaseThrottle):
    """
    Throttle for Right to Erasure endpoint.
    Rate: 1/day
    """
    scope = 'account_deletion'


class DataCorrectionThrottle(DSRBaseThrottle):
    """
    Throttle for Right to Correction endpoint.
    Rate: 5/day
    """
    scope = 'data_correction'


class ProcessingObjectionThrottle(DSRBaseThrottle):
    """
    Throttle for Right to Object endpoint.
    Rate: 3/day
    """
    scope = 'processing_objection'


class ConsentManagementThrottle(DSRBaseThrottle):
    """
    Throttle for consent management endpoints.
    Rate: 20/hour
    """
    scope = 'consent_management'
