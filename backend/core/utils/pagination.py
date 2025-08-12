# backend/core/utils/pagination.py

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination class for the LifePlace application.
    Provides consistent pagination across all endpoints.
    """
    page_size = 25  # Default number of items per page
    page_size_query_param = 'page_size'  # Allow client to override page size
    max_page_size = 100  # Maximum limit for page_size
    
    def get_paginated_response(self, data):
        """
        Customize the paginated response to include additional metadata
        """
        return Response({
            'count': self.page.paginator.count,
            'next': self.get_next_link(),
            'previous': self.get_previous_link(),
            'page_count': self.page.paginator.num_pages,
            'current_page': self.page.number,
            'page_size': self.page_size,
            'results': data
        })


class LargeResultsSetPagination(PageNumberPagination):
    """
    Pagination for endpoints that typically return larger datasets
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200