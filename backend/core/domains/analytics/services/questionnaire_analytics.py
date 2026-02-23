# backend/core/domains/analytics/services/questionnaire_analytics.py
"""
Integration service for questionnaire analytics.
Provides completion rates and response insights for the main dashboard.
"""



class QuestionnaireIntegrationService:
    """
    Service to integrate questionnaire analytics into the main analytics dashboard.
    """

    @staticmethod
    def get_questionnaire_summary(start_date, end_date):
        """
        Get summary of questionnaire performance across all questionnaires.

        Returns:
            Dict with overall stats and per-questionnaire breakdown
        """
        from core.domains.events.models import Event
        from core.domains.questionnaires.models import Questionnaire, QuestionnaireResponse

        # Get events in date range
        event_ids = list(Event.objects.filter(created_at__range=(start_date, end_date)).values_list("id", flat=True))

        questionnaires = Questionnaire.objects.filter(is_active=True).prefetch_related("fields")

        results = []
        total_events_with_responses = 0
        total_complete = 0
        total_incomplete = 0

        for q in questionnaires:
            field_ids = list(q.fields.values_list("id", flat=True))

            if not field_ids:
                continue

            # Events with any response to this questionnaire
            events_with_responses = (
                QuestionnaireResponse.objects.filter(field_id__in=field_ids, event_id__in=event_ids)
                .values("event_id")
                .distinct()
                .count()
            )

            if events_with_responses == 0:
                continue

            # Required fields
            required_field_ids = set(q.fields.filter(required=True).values_list("id", flat=True))

            # Calculate completion
            complete_count = 0
            incomplete_count = 0

            responding_event_ids = (
                QuestionnaireResponse.objects.filter(field_id__in=field_ids, event_id__in=event_ids)
                .values_list("event_id", flat=True)
                .distinct()
            )

            for event_id in responding_event_ids:
                responded_field_ids = set(
                    QuestionnaireResponse.objects.filter(event_id=event_id, field_id__in=field_ids).values_list(
                        "field_id", flat=True
                    )
                )

                if required_field_ids.issubset(responded_field_ids):
                    complete_count += 1
                else:
                    incomplete_count += 1

            completion_rate = (
                round((complete_count / events_with_responses) * 100, 1) if events_with_responses > 0 else 0
            )

            results.append(
                {
                    "questionnaire_id": q.id,
                    "questionnaire_name": q.name,
                    "total_fields": len(field_ids),
                    "required_fields": len(required_field_ids),
                    "events_with_responses": events_with_responses,
                    "complete_responses": complete_count,
                    "incomplete_responses": incomplete_count,
                    "completion_rate": completion_rate,
                }
            )

            total_events_with_responses += events_with_responses
            total_complete += complete_count
            total_incomplete += incomplete_count

        overall_completion = (
            round((total_complete / total_events_with_responses) * 100, 1) if total_events_with_responses > 0 else 0
        )

        return {
            "overall": {
                "total_events_with_responses": total_events_with_responses,
                "total_complete": total_complete,
                "total_incomplete": total_incomplete,
                "overall_completion_rate": overall_completion,
            },
            "by_questionnaire": sorted(results, key=lambda x: x["events_with_responses"], reverse=True),
        }

    @staticmethod
    def get_field_completion_heatmap(questionnaire_id, start_date, end_date):
        """
        Get field-level completion rates for a specific questionnaire.
        Useful for identifying problematic fields.

        Returns:
            List of dicts with field name, type, completion rate, response count
        """
        from core.domains.events.models import Event
        from core.domains.questionnaires.models import Questionnaire, QuestionnaireResponse

        try:
            questionnaire = Questionnaire.objects.get(id=questionnaire_id)
        except Questionnaire.DoesNotExist:
            return []

        # Get events in date range
        event_ids = list(Event.objects.filter(created_at__range=(start_date, end_date)).values_list("id", flat=True))

        fields = questionnaire.fields.all().order_by("order")
        field_ids = [f.id for f in fields]

        # Total events that started this questionnaire
        total_events = (
            QuestionnaireResponse.objects.filter(field_id__in=field_ids, event_id__in=event_ids)
            .values("event_id")
            .distinct()
            .count()
        )

        if total_events == 0:
            return []

        results = []
        for field in fields:
            response_count = QuestionnaireResponse.objects.filter(field_id=field.id, event_id__in=event_ids).count()

            completion_rate = round((response_count / total_events) * 100, 1)

            results.append(
                {
                    "field_id": field.id,
                    "field_name": field.name,
                    "field_type": field.type,
                    "required": field.required,
                    "order": field.order,
                    "response_count": response_count,
                    "completion_rate": completion_rate,
                }
            )

        return results

    @staticmethod
    def get_low_completion_fields(start_date, end_date, threshold=80):
        """
        Identify fields with completion rates below threshold.
        Useful for improving questionnaire design.

        Args:
            threshold: Minimum acceptable completion rate (default 80%)

        Returns:
            List of problematic fields across all questionnaires
        """
        from core.domains.events.models import Event
        from core.domains.questionnaires.models import Questionnaire, QuestionnaireResponse

        event_ids = list(Event.objects.filter(created_at__range=(start_date, end_date)).values_list("id", flat=True))

        problematic_fields = []

        for questionnaire in Questionnaire.objects.filter(is_active=True).prefetch_related("fields"):
            field_ids = list(questionnaire.fields.values_list("id", flat=True))

            if not field_ids:
                continue

            total_events = (
                QuestionnaireResponse.objects.filter(field_id__in=field_ids, event_id__in=event_ids)
                .values("event_id")
                .distinct()
                .count()
            )

            if total_events < 10:  # Need minimum sample size
                continue

            for field in questionnaire.fields.filter(required=True):
                response_count = QuestionnaireResponse.objects.filter(field_id=field.id, event_id__in=event_ids).count()

                completion_rate = round((response_count / total_events) * 100, 1)

                if completion_rate < threshold:
                    problematic_fields.append(
                        {
                            "questionnaire_id": questionnaire.id,
                            "questionnaire_name": questionnaire.name,
                            "field_id": field.id,
                            "field_name": field.name,
                            "field_type": field.type,
                            "completion_rate": completion_rate,
                            "gap_from_threshold": round(threshold - completion_rate, 1),
                        }
                    )

        return sorted(problematic_fields, key=lambda x: x["completion_rate"])
