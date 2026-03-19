from .auth_views import UserLoginAPIView, client_register
from .dpa_views import (
    AccountDeletionView,
    ConsentListView,
    ConsentWithdrawView,
    DataAccessView,
    DataCorrectionView,
    DataExportView,
    PrivacyRequestListView,
    ProcessingObjectionView,
)
from .permissions_views import AdminPermissionsPresetsView, UpdateAdminPermissionsView
from .session_views import active_sessions, logout_all_devices, secure_logout
from .user_views import (
    AdminInvitationDetailAPIView,
    AdminInvitationListCreateAPIView,
    AvatarUploadView,
    CurrentUserView,
    UserDetailAPIView,
    UserListCreateAPIView,
    accept_invitation,
)

__all__ = [
    "UserLoginAPIView",
    "client_register",
    "UserListCreateAPIView",
    "UserDetailAPIView",
    "CurrentUserView",
    "AvatarUploadView",
    "AdminInvitationListCreateAPIView",
    "AdminInvitationDetailAPIView",
    "accept_invitation",
    "secure_logout",
    "logout_all_devices",
    "active_sessions",
    "DataAccessView",
    "DataExportView",
    "AccountDeletionView",
    "DataCorrectionView",
    "ProcessingObjectionView",
    "ConsentListView",
    "ConsentWithdrawView",
    "PrivacyRequestListView",
    "AdminPermissionsPresetsView",
    "UpdateAdminPermissionsView",
]
