# backend/core/domains/questionnaires/basic_serializers.py
from rest_framework import serializers

from .models import Questionnaire, QuestionnaireField

"""
This module contains minimal serializers for the questionnaire domain models
that are used by other domains to prevent circular imports.
These serializers should be kept simple and only include essential fields.
"""


class QuestionnaireBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the Questionnaire model"""

    class Meta:
        model = Questionnaire
        fields = ["id", "name", "event_type", "is_active", "order", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class QuestionnaireFieldBasicSerializer(serializers.ModelSerializer):
    """Basic serializer for the QuestionnaireField model"""

    class Meta:
        model = QuestionnaireField
        fields = [
            "id",
            "questionnaire",
            "name",
            "type",
            "required",
            "order",
            "options",
            # Phase 1.1: Description and placeholder
            "description",
            "placeholder",
            # Phase 1.3: Guest count (deprecated - use 'guests' type)
            "is_guest_count",
            # Phase 2.1: Conditional display
            "show_conditions",
            # Phase 4.1: File upload settings
            "max_file_size_mb",
            "allowed_file_types",
            "max_files",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
