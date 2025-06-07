# backend/core/domains/users/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views
from .views_password import ChangePasswordView

app_name = 'users'

urlpatterns = [
    # Authentication endpoints
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('login/', views.UserLoginAPIView.as_view(), name='login'),
    path('me/', views.CurrentUserView.as_view(), name='current_user'),
    
    # Client registration endpoint
    path('register/', views.client_register, name='client_register'),
    
    # User management endpoints
    path('', views.UserListCreateAPIView.as_view(), name='user_list_create'),
    path('<int:pk>/', views.UserDetailAPIView.as_view(), name='user_detail'),
    path('me/change-password/', ChangePasswordView.as_view(), name='change_password'),
    
    # Admin invitation endpoints
    path('invitations/', views.AdminInvitationListCreateAPIView.as_view(), name='invitation_list_create'),
    path('invitations/<uuid:pk>/', views.AdminInvitationDetailAPIView.as_view(), name='invitation_detail'),
    path('invitations/<uuid:invitation_id>/accept/', views.accept_invitation, name='accept_invitation'),
]