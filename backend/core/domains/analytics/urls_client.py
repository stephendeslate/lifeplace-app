# backend/core/domains/analytics/urls_client.py
"""
Client-facing analytics URL configuration.
These endpoints are for authenticated clients to view their own data.
"""
from django.urls import path
from . import views_client

app_name = 'client-analytics'

urlpatterns = [
    path('dashboard/', views_client.client_dashboard, name='client-dashboard'),
    path('events/', views_client.client_event_history, name='client-events'),
    path('spending/', views_client.client_spending_trends, name='client-spending'),
    path('deadlines/', views_client.client_deadlines, name='client-deadlines'),
]
