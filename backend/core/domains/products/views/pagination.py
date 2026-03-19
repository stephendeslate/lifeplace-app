# backend/core/domains/products/views/pagination.py
from rest_framework.pagination import PageNumberPagination


class LargePagination(PageNumberPagination):
    """Custom pagination for endpoints that need larger page sizes"""

    page_size = 100
    page_size_query_param = "page_size"
    max_page_size = 1000
