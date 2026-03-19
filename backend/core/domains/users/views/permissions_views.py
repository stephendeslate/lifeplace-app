import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils.permissions import CanManageAdmins, IsAdmin

from ..models import User
from ..permissions_constants import (
    PERMISSION_DESCRIPTIONS,
    PERMISSION_LABELS,
    PERMISSION_PRESETS,
    validate_permissions,
)
from ..serializers import AdminPermissionsSerializer, UserSerializer

logger = logging.getLogger(__name__)


# ============================================================================
# Admin Permission Management Views
# ============================================================================


class AdminPermissionsPresetsView(APIView):
    """
    GET /api/users/permissions/
    Get available permission presets and descriptions for UI display.
    """

    permission_classes = [IsAdmin]

    def get(self, request):
        return Response(
            {
                "presets": PERMISSION_PRESETS,
                "descriptions": PERMISSION_DESCRIPTIONS,
                "labels": PERMISSION_LABELS,
            }
        )


class UpdateAdminPermissionsView(APIView):
    """
    PATCH /api/users/{user_id}/permissions/
    Update admin permissions for a specific user.
    Only users with 'can_manage_admins' permission can update permissions.
    """

    permission_classes = [IsAdmin, CanManageAdmins]

    def patch(self, request, user_id):
        try:
            target_user = User.objects.get(id=user_id, role="ADMIN")
        except User.DoesNotExist:
            return Response({"detail": "Admin user not found."}, status=status.HTTP_404_NOT_FOUND)

        # Prevent self-permission modification
        if target_user.id == request.user.id:
            return Response({"detail": "You cannot modify your own permissions."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent modifying superuser permissions
        if target_user.is_superuser:
            return Response({"detail": "Cannot modify superuser permissions."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = AdminPermissionsSerializer(data=request.data)
        if serializer.is_valid():
            # Validate and clean permissions
            validated_permissions = validate_permissions(serializer.validated_data)
            target_user.admin_permissions = validated_permissions
            target_user.save()

            # Log the permission change
            logger.info(
                f"Admin permissions updated for user {target_user.email} "
                f"by {request.user.email}: {validated_permissions}"
            )

            return Response({"detail": "Permissions updated successfully.", "user": UserSerializer(target_user).data})

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, user_id):
        """Get current permissions for a specific admin user."""
        try:
            target_user = User.objects.get(id=user_id, role="ADMIN")
        except User.DoesNotExist:
            return Response({"detail": "Admin user not found."}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "user_id": target_user.id,
                "email": target_user.email,
                "permissions": target_user.get_all_permissions_dict(),
                "is_full_admin": target_user.is_full_admin(),
            }
        )
