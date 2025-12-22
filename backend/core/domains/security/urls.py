# core/domains/security/urls.py

from django.urls import path

app_name = 'security'

# Security breach management is primarily done through Django Admin
# API endpoints for programmatic access can be added here as needed
urlpatterns = [
    # Future endpoints:
    # path('breaches/', BreachListView.as_view(), name='breach-list'),
    # path('breaches/<int:pk>/', BreachDetailView.as_view(), name='breach-detail'),
    # path('breaches/<int:pk>/notify-npc/', NotifyNPCView.as_view(), name='notify-npc'),
    # path('breaches/<int:pk>/notify-users/', NotifyUsersView.as_view(), name='notify-users'),
]
