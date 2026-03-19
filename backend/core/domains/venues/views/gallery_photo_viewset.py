from django.db import models, transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..models import GalleryPhoto
from ..serializers import GalleryPhotoAdminSerializer


class GalleryPhotoViewSet(viewsets.ModelViewSet):
    """Admin API for gallery photo management."""

    permission_classes = [IsAdmin]
    serializer_class = GalleryPhotoAdminSerializer
    queryset = GalleryPhoto.objects.all().select_related("venue", "event_type")
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "description"]
    ordering_fields = ["title", "sort_order", "created_at", "category"]
    ordering = ["sort_order"]

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category.upper())
        return qs

    @action(detail=False, methods=["post"], url_path="bulk-create")
    def bulk_create(self, request):
        """Bulk create gallery photos for a single category."""
        category = request.data.get("category", "").upper()
        valid_categories = [c[0] for c in GalleryPhoto.CATEGORY_CHOICES]
        if category not in valid_categories:
            return Response(
                {"detail": f"Invalid category. Must be one of: {', '.join(valid_categories)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        images = request.FILES.getlist("images")
        if not images:
            return Response(
                {"detail": "No images provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_order = GalleryPhoto.objects.aggregate(max_order=models.Max("sort_order"))["max_order"] or 0

        created = []
        with transaction.atomic():
            for i, image_file in enumerate(images):
                # Auto-generate title from filename
                name = image_file.name.rsplit(".", 1)[0] if "." in image_file.name else image_file.name
                title = name.replace("_", " ").replace("-", " ").strip().title()

                photo = GalleryPhoto.objects.create(
                    image=image_file,
                    title=title,
                    category=category,
                    sort_order=max_order + i + 1,
                )
                created.append(photo)

        # Re-fetch with select_related for serializer
        created_ids = [p.id for p in created]
        photos = GalleryPhoto.objects.filter(id__in=created_ids).select_related("venue", "event_type")
        serializer = self.get_serializer(photos, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
