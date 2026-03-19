from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.utils.permissions import IsAdmin

from ..models import QuestionnaireField
from ..serializers import QuestionnaireFieldSerializer
from ..services import QuestionnaireFieldService


class QuestionnaireFieldViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing questionnaire fields
    """

    serializer_class = QuestionnaireFieldSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        return QuestionnaireField.objects.select_related("questionnaire").order_by("questionnaire", "order")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Get all the validated data
        validated_data = serializer.validated_data.copy()
        # Extract questionnaire instance and get its ID
        questionnaire = validated_data.pop("questionnaire")
        questionnaire_id = questionnaire.id

        with transaction.atomic():
            field = QuestionnaireFieldService.create_field(questionnaire_id, validated_data)

        return Response(self.get_serializer(field).data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            field = QuestionnaireFieldService.update_field(instance.id, serializer.validated_data)

        return Response(self.get_serializer(field).data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        with transaction.atomic():
            QuestionnaireFieldService.delete_field(instance.id)

        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=["post"])
    def reorder(self, request):
        """Reorder fields within a questionnaire"""
        questionnaire_id = request.data.get("questionnaire_id")
        order_mapping = request.data.get("order_mapping", {})

        if not questionnaire_id or not order_mapping:
            return Response(
                {"detail": "Missing required fields: questionnaire_id or order_mapping"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Transaction is managed only in the view
        with transaction.atomic():
            # Call the service method which uses select_for_update
            fields = QuestionnaireFieldService.reorder_fields(questionnaire_id, order_mapping)

            # Get fresh data after reordering to ensure consistency
            reordered_fields = QuestionnaireField.objects.filter(id__in=[f.id for f in fields]).order_by("order")

        serializer = self.get_serializer(reordered_fields, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def value_distribution(self, request, pk=None):
        """
        Get value distribution for a specific field.
        Useful for analyzing select/multi-select field responses.
        Query params:
            limit: Maximum number of values to return (default: 10)
        """
        from ..analytics import QuestionnaireAnalytics

        limit = int(request.query_params.get("limit", 10))
        distribution = QuestionnaireAnalytics.get_field_value_distribution(int(pk), limit)
        return Response(distribution)
