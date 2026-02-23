# backend/core/domains/workflows/client_serializers.py
from rest_framework import serializers

from .models import WorkflowStage


class ClientWorkflowStageSerializer(serializers.ModelSerializer):
    """Limited serializer for client-facing workflow stages"""

    status = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowStage
        fields = ["id", "name", "stage", "order", "status"]

    def get_status(self, obj):
        """Determine stage status relative to current event stage"""
        event = self.context.get("event")
        if not event or not event.current_stage:
            return "pending"

        # Check if this is the current stage first
        if obj.id == event.current_stage_id:
            return "current"

        current_order = int(event.current_stage.order) if event.current_stage.order is not None else 0
        current_type = event.current_stage.stage
        obj_order = int(obj.order) if obj.order is not None else 0

        # Compare by stage type order first, then by order within type
        stage_type_order = {"LEAD": 1, "PRODUCTION": 2, "POST_PRODUCTION": 3}
        current_type_order = stage_type_order.get(current_type, 0)
        obj_type_order = stage_type_order.get(obj.stage, 0)

        if obj_type_order < current_type_order:
            return "completed"
        elif obj_type_order > current_type_order:
            return "pending"
        elif obj_order < current_order:
            return "completed"
        else:
            return "pending"


class ClientWorkflowProgressSerializer(serializers.Serializer):
    """Serializer for client-facing workflow progress"""

    current_stage_id = serializers.IntegerField(allow_null=True)
    current_stage_name = serializers.CharField(allow_null=True)
    current_stage_type = serializers.CharField(allow_null=True)
    total_stages = serializers.IntegerField()
    completed_stages = serializers.IntegerField()
    progress_percentage = serializers.FloatField()
    stages = serializers.ListField(child=serializers.DictField())
