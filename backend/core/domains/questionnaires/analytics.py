# backend/core/domains/questionnaires/analytics.py
"""
Analytics module for questionnaire domain.
Provides statistics and insights about questionnaire usage and completion rates.
"""

from datetime import datetime, timedelta
from typing import Any

from django.db.models import Count


class QuestionnaireAnalytics:
    """Analytics service for questionnaire data"""

    @staticmethod
    def get_questionnaire_stats(questionnaire_id: int) -> dict[str, Any]:
        """
        Get comprehensive usage statistics for a questionnaire.

        Returns:
            Dict containing:
            - questionnaire_id: int
            - questionnaire_name: str
            - total_fields: int
            - required_fields: int
            - events_with_responses: int
            - complete_responses: int
            - incomplete_responses: int
            - completion_rate: float (percentage)
            - field_completion_rates: Dict[str, float]
            - recent_activity: Dict with counts for last 7, 30, 90 days
        """

        from .models import Questionnaire, QuestionnaireResponse

        try:
            questionnaire = Questionnaire.objects.get(id=questionnaire_id)
        except Questionnaire.DoesNotExist:
            return {"error": "Questionnaire not found"}

        fields = list(questionnaire.fields.all())
        field_ids = [f.id for f in fields]

        if not field_ids:
            return {
                "questionnaire_id": questionnaire_id,
                "questionnaire_name": questionnaire.name,
                "total_fields": 0,
                "required_fields": 0,
                "events_with_responses": 0,
                "complete_responses": 0,
                "incomplete_responses": 0,
                "completion_rate": 0.0,
                "field_completion_rates": {},
                "recent_activity": {"last_7_days": 0, "last_30_days": 0, "last_90_days": 0},
            }

        # Events with any response to this questionnaire
        event_ids_with_responses = list(
            QuestionnaireResponse.objects.filter(field_id__in=field_ids).values_list("event_id", flat=True).distinct()
        )
        events_with_responses = len(event_ids_with_responses)

        # Required fields
        required_fields = [f for f in fields if f.required]
        required_field_ids = {f.id for f in required_fields}

        # Calculate completion rates
        complete_count = 0
        incomplete_count = 0

        if event_ids_with_responses:
            for event_id in event_ids_with_responses:
                responded_field_ids = set(
                    QuestionnaireResponse.objects.filter(event_id=event_id, field_id__in=field_ids).values_list(
                        "field_id", flat=True
                    )
                )

                if required_field_ids.issubset(responded_field_ids):
                    complete_count += 1
                else:
                    incomplete_count += 1

        # Calculate per-field completion rates
        field_completion_rates = {}
        for field in fields:
            response_count = QuestionnaireResponse.objects.filter(field_id=field.id).count()
            field_completion_rates[field.name] = {
                "field_id": field.id,
                "field_type": field.type,
                "required": field.required,
                "response_count": response_count,
                "completion_rate": round(response_count / max(events_with_responses, 1) * 100, 1),
            }

        # Recent activity
        now = datetime.now()
        recent_activity = {
            "last_7_days": QuestionnaireResponse.objects.filter(
                field_id__in=field_ids, created_at__gte=now - timedelta(days=7)
            )
            .values("event_id")
            .distinct()
            .count(),
            "last_30_days": QuestionnaireResponse.objects.filter(
                field_id__in=field_ids, created_at__gte=now - timedelta(days=30)
            )
            .values("event_id")
            .distinct()
            .count(),
            "last_90_days": QuestionnaireResponse.objects.filter(
                field_id__in=field_ids, created_at__gte=now - timedelta(days=90)
            )
            .values("event_id")
            .distinct()
            .count(),
        }

        return {
            "questionnaire_id": questionnaire_id,
            "questionnaire_name": questionnaire.name,
            "total_fields": len(fields),
            "required_fields": len(required_fields),
            "events_with_responses": events_with_responses,
            "complete_responses": complete_count,
            "incomplete_responses": incomplete_count,
            "completion_rate": round(complete_count / max(events_with_responses, 1) * 100, 1),
            "field_completion_rates": field_completion_rates,
            "recent_activity": recent_activity,
        }

    @staticmethod
    def get_all_questionnaires_summary() -> list[dict[str, Any]]:
        """
        Get summary statistics for all questionnaires.

        Returns:
            List of dicts with basic stats for each questionnaire
        """
        from .models import Questionnaire, QuestionnaireResponse

        questionnaires = Questionnaire.objects.all().prefetch_related("fields")
        summaries = []

        for questionnaire in questionnaires:
            field_ids = list(questionnaire.fields.values_list("id", flat=True))

            if field_ids:
                events_with_responses = (
                    QuestionnaireResponse.objects.filter(field_id__in=field_ids).values("event_id").distinct().count()
                )

                total_responses = QuestionnaireResponse.objects.filter(field_id__in=field_ids).count()
            else:
                events_with_responses = 0
                total_responses = 0

            summaries.append(
                {
                    "questionnaire_id": questionnaire.id,
                    "questionnaire_name": questionnaire.name,
                    "is_active": questionnaire.is_active,
                    "total_fields": questionnaire.fields.count(),
                    "events_with_responses": events_with_responses,
                    "total_responses": total_responses,
                }
            )

        return summaries

    @staticmethod
    def get_field_value_distribution(field_id: int, limit: int = 10) -> dict[str, Any]:
        """
        Get distribution of values for a specific field.
        Useful for select/multi-select fields to see popular options.

        Args:
            field_id: The field to analyze
            limit: Maximum number of values to return

        Returns:
            Dict with field info and value distribution
        """
        from .models import QuestionnaireField, QuestionnaireResponse

        try:
            field = QuestionnaireField.objects.get(id=field_id)
        except QuestionnaireField.DoesNotExist:
            return {"error": "Field not found"}

        responses = QuestionnaireResponse.objects.filter(field_id=field_id)
        total_responses = responses.count()

        # Get value counts
        value_counts = responses.values("value").annotate(count=Count("id")).order_by("-count")[:limit]

        distribution = []
        for vc in value_counts:
            distribution.append(
                {
                    "value": vc["value"],
                    "count": vc["count"],
                    "percentage": round(vc["count"] / max(total_responses, 1) * 100, 1),
                }
            )

        return {
            "field_id": field_id,
            "field_name": field.name,
            "field_type": field.type,
            "total_responses": total_responses,
            "distribution": distribution,
        }

    @staticmethod
    def get_response_trends(questionnaire_id: int, days: int = 30) -> dict[str, Any]:
        """
        Get daily response trends for a questionnaire.

        Args:
            questionnaire_id: The questionnaire to analyze
            days: Number of days to look back

        Returns:
            Dict with daily response counts
        """
        from django.db.models.functions import TruncDate

        from .models import Questionnaire, QuestionnaireResponse

        try:
            questionnaire = Questionnaire.objects.get(id=questionnaire_id)
        except Questionnaire.DoesNotExist:
            return {"error": "Questionnaire not found"}

        field_ids = list(questionnaire.fields.values_list("id", flat=True))

        if not field_ids:
            return {
                "questionnaire_id": questionnaire_id,
                "questionnaire_name": questionnaire.name,
                "period_days": days,
                "daily_counts": [],
            }

        start_date = datetime.now() - timedelta(days=days)

        daily_counts = (
            QuestionnaireResponse.objects.filter(field_id__in=field_ids, created_at__gte=start_date)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(events=Count("event_id", distinct=True), responses=Count("id"))
            .order_by("date")
        )

        return {
            "questionnaire_id": questionnaire_id,
            "questionnaire_name": questionnaire.name,
            "period_days": days,
            "daily_counts": [
                {
                    "date": dc["date"].isoformat() if dc["date"] else None,
                    "events": dc["events"],
                    "responses": dc["responses"],
                }
                for dc in daily_counts
            ],
        }
