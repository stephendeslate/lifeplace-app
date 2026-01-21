# backend/core/domains/analytics/urls_v2.py
"""
Simplified analytics URL configuration.
Clean, flat URL structure with descriptive names.
"""
from django.urls import path
from . import views_v2 as views

app_name = 'analytics'

urlpatterns = [
    # Dashboard
    path('dashboard/', views.dashboard_kpis, name='dashboard'),

    # Sales & Reservations
    path('sales/bookings/', views.bookings_summary, name='bookings-summary'),
    path('sales/pipeline/', views.reservation_pipeline, name='reservation-pipeline'),
    path('sales/revenue/', views.revenue_by_type, name='revenue-by-type'),
    path('sales/payments/', views.payment_tracking, name='payment-tracking'),

    # Events & Guests
    path('events/attendance/', views.event_attendance, name='event-attendance'),
    path('events/packages/', views.package_performance, name='package-performance'),
    path('events/feedback/', views.feedback_scores, name='feedback-scores'),
    path('events/types/', views.event_type_breakdown, name='event-type-breakdown'),
    path('events/demographics/', views.guest_demographics, name='guest-demographics'),
    path('events/repeat-clients/', views.repeat_clients, name='repeat-clients'),

    # Customers & Leads
    path('customers/leads/', views.lead_sources, name='lead-sources'),
    path('customers/conversion/', views.conversion_rates, name='conversion-rates'),
    path('customers/list/', views.customer_list, name='customer-list'),
    path('customers/growth/', views.customer_growth, name='customer-growth'),

    # Operations
    path('operations/venues/', views.venue_usage, name='venue-usage'),
    path('operations/calendar/', views.calendar_utilization, name='calendar-utilization'),
    path('operations/booking-times/', views.booking_time_analysis, name='booking-times'),
    path('operations/kitchen/', views.kitchen_usage, name='kitchen-usage'),
    path('operations/inventory/', views.inventory_report, name='inventory-report'),

    # App Engagement (placeholder)
    path('engagement/', views.app_engagement, name='app-engagement'),

    # Booking Flow Analytics
    path('booking-flow/funnel/', views.booking_flow_funnel, name='booking-flow-funnel'),
    path('booking-flow/performance/', views.booking_flow_performance, name='booking-flow-performance'),
    path('booking-flow/abandonment/', views.booking_flow_abandonment, name='booking-flow-abandonment'),
    path('booking-flow/trends/', views.booking_flow_trends, name='booking-flow-trends'),

    # Questionnaire Analytics
    path('questionnaires/summary/', views.questionnaire_summary, name='questionnaire-summary'),
    path('questionnaires/<int:questionnaire_id>/heatmap/', views.questionnaire_field_heatmap, name='questionnaire-heatmap'),
    path('questionnaires/problem-fields/', views.questionnaire_problem_fields, name='questionnaire-problems'),
]
