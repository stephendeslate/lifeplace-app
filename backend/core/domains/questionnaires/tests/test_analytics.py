"""
Unit tests for questionnaires domain analytics module.

Tests:
- QuestionnaireAnalytics.get_questionnaire_stats
- QuestionnaireAnalytics.get_all_questionnaires_summary
- QuestionnaireAnalytics.get_field_value_distribution
- QuestionnaireAnalytics.get_response_trends
"""


import pytest
from freezegun import freeze_time

from core.domains.questionnaires.analytics import QuestionnaireAnalytics


@pytest.mark.django_db
class TestQuestionnaireStats:
    """Unit tests for get_questionnaire_stats method."""

    def test_stats_for_questionnaire_not_found(self):
        """Test stats for non-existent questionnaire returns error."""
        stats = QuestionnaireAnalytics.get_questionnaire_stats(99999)

        assert "error" in stats
        assert "not found" in stats["error"].lower()

    def test_stats_for_empty_questionnaire(self, questionnaire_factory):
        """Test stats for questionnaire with no fields."""
        questionnaire = questionnaire_factory(name="Empty Questionnaire")

        stats = QuestionnaireAnalytics.get_questionnaire_stats(questionnaire.id)

        assert stats["questionnaire_id"] == questionnaire.id
        assert stats["questionnaire_name"] == "Empty Questionnaire"
        assert stats["total_fields"] == 0
        assert stats["required_fields"] == 0
        assert stats["events_with_responses"] == 0
        assert stats["completion_rate"] == 0.0

    def test_stats_for_questionnaire_with_fields(self, questionnaire_factory, questionnaire_field_factory):
        """Test stats for questionnaire with fields."""
        questionnaire = questionnaire_factory(name="Test Questionnaire")
        questionnaire_field_factory(questionnaire=questionnaire, required=True)
        questionnaire_field_factory(questionnaire=questionnaire, required=True)
        questionnaire_field_factory(questionnaire=questionnaire, required=False)

        stats = QuestionnaireAnalytics.get_questionnaire_stats(questionnaire.id)

        assert stats["total_fields"] == 3
        assert stats["required_fields"] == 2
        assert stats["events_with_responses"] == 0
        assert "field_completion_rates" in stats

    def test_stats_with_responses(
        self, questionnaire_factory, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test stats with actual responses."""
        questionnaire = questionnaire_factory()
        field1 = questionnaire_field_factory(questionnaire=questionnaire, required=True)
        field2 = questionnaire_field_factory(questionnaire=questionnaire, required=True)

        event = event_factory()
        questionnaire_response_factory(event=event, field=field1, value="Answer 1")
        questionnaire_response_factory(event=event, field=field2, value="Answer 2")

        stats = QuestionnaireAnalytics.get_questionnaire_stats(questionnaire.id)

        assert stats["events_with_responses"] == 1
        assert stats["complete_responses"] == 1
        assert stats["incomplete_responses"] == 0
        assert stats["completion_rate"] == 100.0

    def test_stats_with_incomplete_responses(
        self, questionnaire_factory, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test stats with incomplete responses."""
        questionnaire = questionnaire_factory()
        field1 = questionnaire_field_factory(questionnaire=questionnaire, required=True)
        questionnaire_field_factory(questionnaire=questionnaire, required=True)

        event = event_factory()
        # Only answer one required field
        questionnaire_response_factory(event=event, field=field1, value="Answer 1")

        stats = QuestionnaireAnalytics.get_questionnaire_stats(questionnaire.id)

        assert stats["events_with_responses"] == 1
        assert stats["complete_responses"] == 0
        assert stats["incomplete_responses"] == 1
        assert stats["completion_rate"] == 0.0

    def test_stats_field_completion_rates(
        self, questionnaire_factory, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test per-field completion rates in stats."""
        questionnaire = questionnaire_factory()
        field1 = questionnaire_field_factory(questionnaire=questionnaire, name="Field 1", required=True)
        field2 = questionnaire_field_factory(questionnaire=questionnaire, name="Field 2", required=False)

        event1 = event_factory()
        event2 = event_factory()

        # Both events answer field1, only one answers field2
        questionnaire_response_factory(event=event1, field=field1, value="A1")
        questionnaire_response_factory(event=event2, field=field1, value="A2")
        questionnaire_response_factory(event=event1, field=field2, value="B1")

        stats = QuestionnaireAnalytics.get_questionnaire_stats(questionnaire.id)

        assert "Field 1" in stats["field_completion_rates"]
        assert "Field 2" in stats["field_completion_rates"]
        assert stats["field_completion_rates"]["Field 1"]["response_count"] == 2
        assert stats["field_completion_rates"]["Field 2"]["response_count"] == 1

    @freeze_time("2024-06-15 12:00:00")
    def test_stats_recent_activity(
        self, questionnaire_factory, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test recent activity tracking in stats."""
        questionnaire = questionnaire_factory()
        field = questionnaire_field_factory(questionnaire=questionnaire)

        # Create events with responses at different times
        event1 = event_factory()
        event2 = event_factory()
        event3 = event_factory()

        # Response from 3 days ago
        with freeze_time("2024-06-12 12:00:00"):
            questionnaire_response_factory(event=event1, field=field, value="Recent")

        # Response from 15 days ago
        with freeze_time("2024-05-31 12:00:00"):
            questionnaire_response_factory(event=event2, field=field, value="Last month")

        # Response from 60 days ago
        with freeze_time("2024-04-16 12:00:00"):
            questionnaire_response_factory(event=event3, field=field, value="Old")

        stats = QuestionnaireAnalytics.get_questionnaire_stats(questionnaire.id)

        assert "recent_activity" in stats
        assert stats["recent_activity"]["last_7_days"] == 1
        assert stats["recent_activity"]["last_30_days"] == 2
        assert stats["recent_activity"]["last_90_days"] == 3


@pytest.mark.django_db
class TestAllQuestionnairesSummary:
    """Unit tests for get_all_questionnaires_summary method."""

    def test_summary_no_questionnaires(self):
        """Test summary with no questionnaires."""
        summaries = QuestionnaireAnalytics.get_all_questionnaires_summary()

        assert summaries == []

    def test_summary_multiple_questionnaires(self, questionnaire_factory, questionnaire_field_factory):
        """Test summary with multiple questionnaires."""
        q1 = questionnaire_factory(name="Questionnaire 1", is_active=True)
        q2 = questionnaire_factory(name="Questionnaire 2", is_active=False)

        questionnaire_field_factory(questionnaire=q1)
        questionnaire_field_factory(questionnaire=q1)
        questionnaire_field_factory(questionnaire=q2)

        summaries = QuestionnaireAnalytics.get_all_questionnaires_summary()

        assert len(summaries) == 2

        q1_summary = next(s for s in summaries if s["questionnaire_id"] == q1.id)
        assert q1_summary["questionnaire_name"] == "Questionnaire 1"
        assert q1_summary["is_active"] is True
        assert q1_summary["total_fields"] == 2

        q2_summary = next(s for s in summaries if s["questionnaire_id"] == q2.id)
        assert q2_summary["is_active"] is False
        assert q2_summary["total_fields"] == 1

    def test_summary_with_responses(
        self, questionnaire_factory, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test summary includes response counts."""
        questionnaire = questionnaire_factory()
        field = questionnaire_field_factory(questionnaire=questionnaire)

        event1 = event_factory()
        event2 = event_factory()

        questionnaire_response_factory(event=event1, field=field, value="A1")
        questionnaire_response_factory(event=event2, field=field, value="A2")

        summaries = QuestionnaireAnalytics.get_all_questionnaires_summary()

        assert len(summaries) == 1
        assert summaries[0]["events_with_responses"] == 2
        assert summaries[0]["total_responses"] == 2

    def test_summary_questionnaire_without_fields(self, questionnaire_factory):
        """Test summary for questionnaire without fields."""
        questionnaire_factory(name="No Fields")

        summaries = QuestionnaireAnalytics.get_all_questionnaires_summary()

        assert len(summaries) == 1
        assert summaries[0]["total_fields"] == 0
        assert summaries[0]["events_with_responses"] == 0
        assert summaries[0]["total_responses"] == 0


@pytest.mark.django_db
class TestFieldValueDistribution:
    """Unit tests for get_field_value_distribution method."""

    def test_distribution_field_not_found(self):
        """Test distribution for non-existent field returns error."""
        distribution = QuestionnaireAnalytics.get_field_value_distribution(99999)

        assert "error" in distribution
        assert "not found" in distribution["error"].lower()

    def test_distribution_no_responses(self, questionnaire_field_factory):
        """Test distribution for field with no responses."""
        field = questionnaire_field_factory(name="Empty Field", type="select")

        distribution = QuestionnaireAnalytics.get_field_value_distribution(field.id)

        assert distribution["field_id"] == field.id
        assert distribution["field_name"] == "Empty Field"
        assert distribution["total_responses"] == 0
        assert distribution["distribution"] == []

    def test_distribution_with_responses(
        self, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test distribution for field with responses."""
        field = questionnaire_field_factory(name="Favorite Color", type="select")

        event1 = event_factory()
        event2 = event_factory()
        event3 = event_factory()
        event4 = event_factory()

        questionnaire_response_factory(event=event1, field=field, value="Blue")
        questionnaire_response_factory(event=event2, field=field, value="Blue")
        questionnaire_response_factory(event=event3, field=field, value="Red")
        questionnaire_response_factory(event=event4, field=field, value="Green")

        distribution = QuestionnaireAnalytics.get_field_value_distribution(field.id)

        assert distribution["total_responses"] == 4
        assert len(distribution["distribution"]) == 3

        # Blue should be first (most common)
        blue = distribution["distribution"][0]
        assert blue["value"] == "Blue"
        assert blue["count"] == 2
        assert blue["percentage"] == 50.0

    def test_distribution_respects_limit(
        self, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test distribution respects limit parameter."""
        field = questionnaire_field_factory(type="text")

        # Create many different values
        for i in range(15):
            event = event_factory()
            questionnaire_response_factory(event=event, field=field, value=f"Value {i}")

        distribution = QuestionnaireAnalytics.get_field_value_distribution(field.id, limit=5)

        assert len(distribution["distribution"]) == 5

    def test_distribution_ordered_by_count(
        self, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test distribution is ordered by count descending."""
        field = questionnaire_field_factory(type="select")

        # Create values with different frequencies
        for _ in range(5):
            event = event_factory()
            questionnaire_response_factory(event=event, field=field, value="Common")

        for _ in range(2):
            event = event_factory()
            questionnaire_response_factory(event=event, field=field, value="Medium")

        event = event_factory()
        questionnaire_response_factory(event=event, field=field, value="Rare")

        distribution = QuestionnaireAnalytics.get_field_value_distribution(field.id)

        assert distribution["distribution"][0]["value"] == "Common"
        assert distribution["distribution"][0]["count"] == 5
        assert distribution["distribution"][1]["value"] == "Medium"
        assert distribution["distribution"][1]["count"] == 2
        assert distribution["distribution"][2]["value"] == "Rare"
        assert distribution["distribution"][2]["count"] == 1


@pytest.mark.django_db
class TestResponseTrends:
    """Unit tests for get_response_trends method."""

    def test_trends_questionnaire_not_found(self):
        """Test trends for non-existent questionnaire returns error."""
        trends = QuestionnaireAnalytics.get_response_trends(99999)

        assert "error" in trends
        assert "not found" in trends["error"].lower()

    def test_trends_questionnaire_no_fields(self, questionnaire_factory):
        """Test trends for questionnaire with no fields."""
        questionnaire = questionnaire_factory(name="No Fields")

        trends = QuestionnaireAnalytics.get_response_trends(questionnaire.id)

        assert trends["questionnaire_id"] == questionnaire.id
        assert trends["questionnaire_name"] == "No Fields"
        assert trends["daily_counts"] == []

    @freeze_time("2024-06-15 12:00:00")
    def test_trends_with_responses(
        self, questionnaire_factory, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test trends with responses over time."""
        questionnaire = questionnaire_factory()
        field = questionnaire_field_factory(questionnaire=questionnaire)

        # Create responses on different days
        event1 = event_factory()
        event2 = event_factory()
        event3 = event_factory()

        with freeze_time("2024-06-14 10:00:00"):
            questionnaire_response_factory(event=event1, field=field, value="Day 1 Response")

        with freeze_time("2024-06-13 10:00:00"):
            questionnaire_response_factory(event=event2, field=field, value="Day 2 Response 1")
            questionnaire_response_factory(event=event3, field=field, value="Day 2 Response 2")

        trends = QuestionnaireAnalytics.get_response_trends(questionnaire.id, days=7)

        assert trends["period_days"] == 7
        assert len(trends["daily_counts"]) >= 1

    def test_trends_respects_days_parameter(self, questionnaire_factory, questionnaire_field_factory):
        """Test trends respects the days parameter."""
        questionnaire = questionnaire_factory()
        questionnaire_field_factory(questionnaire=questionnaire)

        trends = QuestionnaireAnalytics.get_response_trends(questionnaire.id, days=30)
        assert trends["period_days"] == 30

        trends = QuestionnaireAnalytics.get_response_trends(questionnaire.id, days=7)
        assert trends["period_days"] == 7

    @freeze_time("2024-06-15 12:00:00")
    def test_trends_excludes_old_responses(
        self, questionnaire_factory, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test trends excludes responses outside the time range."""
        questionnaire = questionnaire_factory()
        field = questionnaire_field_factory(questionnaire=questionnaire)

        # Response within range
        event1 = event_factory()
        with freeze_time("2024-06-10 12:00:00"):
            questionnaire_response_factory(event=event1, field=field, value="Within range")

        # Response outside range (more than 7 days ago)
        event2 = event_factory()
        with freeze_time("2024-06-01 12:00:00"):
            questionnaire_response_factory(event=event2, field=field, value="Outside range")

        trends = QuestionnaireAnalytics.get_response_trends(questionnaire.id, days=7)

        # Only the response within range should be counted
        total_events = sum(dc["events"] for dc in trends["daily_counts"])
        assert total_events == 1

    @freeze_time("2024-06-15 12:00:00")
    def test_trends_counts_unique_events(
        self, questionnaire_factory, questionnaire_field_factory, event_factory, questionnaire_response_factory
    ):
        """Test trends counts unique events per day."""
        questionnaire = questionnaire_factory()
        field1 = questionnaire_field_factory(questionnaire=questionnaire)
        field2 = questionnaire_field_factory(questionnaire=questionnaire)

        event = event_factory()

        # Multiple responses for same event on same day
        with freeze_time("2024-06-14 12:00:00"):
            questionnaire_response_factory(event=event, field=field1, value="Answer 1")
            questionnaire_response_factory(event=event, field=field2, value="Answer 2")

        trends = QuestionnaireAnalytics.get_response_trends(questionnaire.id, days=7)

        # Should count as 1 event, but 2 responses
        if trends["daily_counts"]:
            day_data = trends["daily_counts"][-1]  # Most recent day
            assert day_data["events"] == 1
            assert day_data["responses"] == 2
