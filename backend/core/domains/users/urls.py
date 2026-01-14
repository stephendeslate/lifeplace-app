# backend/core/domains/users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views
from .views_password import ChangePasswordView
from .views_password_reset import (
    request_password_reset,
    confirm_password_reset,
    validate_reset_token,
)

app_name = 'users'

urlpatterns = [
    # Authentication endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('login/', views.UserLoginAPIView.as_view(), name='login'),
    path('logout/', views.secure_logout, name='secure_logout'),
    path('logout-all/', views.logout_all_devices, name='logout_all_devices'),
    path('sessions/', views.active_sessions, name='active_sessions'),
    path('me/', views.CurrentUserView.as_view(), name='current_user'),

    # Client registration endpoint
    path('register/', views.client_register, name='client_register'),

    # Password reset endpoints
    path('password-reset/request/', request_password_reset, name='password_reset_request'),
    path('password-reset/validate/<uuid:token_id>/', validate_reset_token, name='password_reset_validate'),
    path('password-reset/confirm/<uuid:token_id>/', confirm_password_reset, name='password_reset_confirm'),

    # User management endpoints
    path('', views.UserListCreateAPIView.as_view(), name='user_list_create'),
    path('<int:pk>/', views.UserDetailAPIView.as_view(), name='user_detail'),
    path('me/change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Admin invitation endpoints
    path('invitations/', views.AdminInvitationListCreateAPIView.as_view(), name='invitation_list_create'),
    path('invitations/<uuid:pk>/', views.AdminInvitationDetailAPIView.as_view(), name='invitation_detail'),
    path('invitations/<uuid:invitation_id>/accept/', views.accept_invitation, name='accept_invitation'),

    # DPA Compliance - Data Subject Rights
    path('me/data/', views.DataAccessView.as_view(), name='data-access'),
    path('me/export/', views.DataExportView.as_view(), name='data-export'),
    path('me/delete/', views.AccountDeletionView.as_view(), name='account-deletion'),
    path('me/correct/', views.DataCorrectionView.as_view(), name='data-correction'),
    path('me/object/', views.ProcessingObjectionView.as_view(), name='processing-objection'),

    # Consent Management
    path('me/consents/', views.ConsentListView.as_view(), name='consent-list'),
    path('me/consents/<str:consent_type>/withdraw/', views.ConsentWithdrawView.as_view(), name='consent-withdraw'),

    # Privacy Request Tracking
    path('me/privacy-requests/', views.PrivacyRequestListView.as_view(), name='privacy-requests'),

    # Admin Permission Management
    path('permissions/', views.AdminPermissionsPresetsView.as_view(), name='admin-permissions-presets'),
    path('<int:user_id>/permissions/', views.UpdateAdminPermissionsView.as_view(), name='admin-permissions-update'),
]