import logging

from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from rest_framework_simplejwt.tokens import RefreshToken

from core.utils.permissions import IsAdmin, IsOwnerOrAdmin
from core.utils.security import (
    InvitationAcceptRateThrottle,
    validate_password_strength,
)

from ..cache_service import users_cache_service
from ..models import AdminInvitation, User
from ..serializers import (
    AdminInvitationSerializer,
    AvatarUploadSerializer,
    PublicAdminInvitationSerializer,
    UserCreateSerializer,
    UserSerializer,
)
from ..services import AdminInvitationService, UserService

logger = logging.getLogger(__name__)


class UserListCreateAPIView(generics.ListCreateAPIView):
    """
    List and create users
    """

    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        search_query = self.request.query_params.get("search", None)

        # Try cache for search results
        if search_query:
            cached_results = users_cache_service.get_cached_user_search_results(search_query)
            if cached_results is not None:
                logger.debug(f"User search results served from cache for query: {search_query}")
                # Convert cached results back to queryset-like behavior
                # For now, we'll fall back to database query but this could be optimized
                return UserService.get_users(search_query)

        # Try cache for general user list
        query_params = dict(self.request.query_params)
        cached_users = users_cache_service.get_cached_user_list(query_params)

        if cached_users is not None and not search_query:
            logger.debug("User list served from cache")
            # Convert cached results back to queryset-like behavior
            # For now, we'll fall back to database query but this could be optimized

        return UserService.get_users(search_query)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return UserCreateSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Strip confirm_password as it's only used for validation
        user_data = {k: v for k, v in serializer.validated_data.items() if k != "confirm_password"}

        with transaction.atomic():
            user = UserService.create_user(user_data)

        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class UserDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a user
    """

    serializer_class = UserSerializer
    permission_classes = [IsOwnerOrAdmin]

    def get_object(self):
        user_id = self.kwargs.get("pk")

        # Try to get from cache first
        cached_user = users_cache_service.get_cached_user_detail(int(user_id))

        if cached_user is not None:
            logger.debug(f"User detail for {user_id} served from cache")
            # We still need the actual user object for permissions checking
            # But we can optimize this in the future
            user = UserService.get_user_by_id(user_id)
            self.check_object_permissions(self.request, user)
            return user

        # Cache miss - get from database
        user = UserService.get_user_by_id(user_id)
        self.check_object_permissions(self.request, user)

        # Cache the user detail
        user_data = UserSerializer(user).data
        users_cache_service.cache_user_detail(user.id, user_data)
        logger.info(f"User detail for {user_id} cached after database query")

        return user

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            updated_user = UserService.update_user(user, serializer.validated_data)

        return Response(UserSerializer(updated_user).data)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()

        if user == request.user:
            return Response({"detail": "You cannot delete your own account."}, status=status.HTTP_400_BAD_REQUEST)

        UserService.delete_user(user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    """
    Get or update current logged in user
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_id = request.user.id

        # Try to get from cache first
        cached_user = users_cache_service.get_cached_user_detail(user_id)

        if cached_user is not None:
            logger.debug(f"Current user data served from cache for user {user_id}")
            return Response(cached_user)

        # Cache miss - serialize and cache
        user_data = UserSerializer(request.user, context={"request": request}).data
        users_cache_service.cache_user_detail(user_id, user_data)
        users_cache_service.cache_user_by_email(request.user.email, user_data)
        logger.info(f"Current user data cached for user {user_id}")

        return Response(user_data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            updated_user = UserService.update_user(request.user, serializer.validated_data)

        return Response(UserSerializer(updated_user, context={"request": request}).data)


class AvatarUploadView(APIView):
    """
    Upload avatar for current user

    POST /api/users/me/avatar/
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AvatarUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        avatar_file = serializer.validated_data["avatar"]

        # Ensure user has a profile
        if not hasattr(user, "profile") or user.profile is None:
            from ..models import UserProfile

            UserProfile.objects.create(user=user)

        # Delete old avatar if exists
        if user.profile.avatar:
            user.profile.avatar.delete(save=False)

        # Save new avatar
        user.profile.avatar = avatar_file
        user.profile.save()

        # Invalidate user cache
        users_cache_service.invalidate_user_caches(user_id=user.id)

        logger.info(f"Avatar uploaded for user {user.id}")

        return Response(UserSerializer(user, context={"request": request}).data)

    def delete(self, request):
        """Delete current user's avatar"""
        user = request.user

        if hasattr(user, "profile") and user.profile and user.profile.avatar:
            user.profile.avatar.delete(save=True)
            users_cache_service.invalidate_user_caches(user_id=user.id)
            logger.info(f"Avatar deleted for user {user.id}")

        return Response(UserSerializer(user, context={"request": request}).data)


class AdminInvitationListCreateAPIView(generics.ListCreateAPIView):
    """
    List and create admin invitations
    """

    serializer_class = AdminInvitationSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        # Try to get from cache first
        cached_invitations = users_cache_service.get_cached_pending_invitations()

        if cached_invitations is not None:
            logger.debug("Pending invitations served from cache")
            # For now, fall back to database query but cache the results
            queryset = AdminInvitation.objects.filter(is_accepted=False)
            return queryset

        # Cache miss - get from database and cache
        queryset = AdminInvitation.objects.filter(is_accepted=False)

        # Cache the results
        invitations_data = []
        for invitation in queryset:
            invitations_data.append(AdminInvitationSerializer(invitation).data)

        users_cache_service.cache_pending_invitations(invitations_data)
        logger.info("Pending invitations cached after database query")

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            invitation = AdminInvitationService.create_invitation(
                email=serializer.validated_data["email"],
                first_name=serializer.validated_data["first_name"],
                last_name=serializer.validated_data["last_name"],
                invited_by=request.user,
                permissions=serializer.validated_data.get("permissions", {}),
            )

        return Response(AdminInvitationSerializer(invitation).data, status=status.HTTP_201_CREATED)


class AdminInvitationDetailAPIView(generics.RetrieveDestroyAPIView):
    """
    Retrieve or delete an admin invitation
    """

    serializer_class = AdminInvitationSerializer
    permission_classes = [IsAdmin]  # Only admins should delete invitations

    def get_object(self):
        invitation_id = self.kwargs.get("pk")
        return AdminInvitationService.get_invitation_by_id(invitation_id)

    def get_permissions(self):
        """
        Override to allow anyone to view an invitation, but only admins to delete
        """
        if self.request.method == "DELETE":
            return [IsAdmin()]
        return [permissions.AllowAny()]

    def get_serializer_class(self):
        """Use limited serializer for unauthenticated GET requests."""
        if self.request.method == "GET" and not (self.request.user and self.request.user.is_authenticated):
            return PublicAdminInvitationSerializer
        return AdminInvitationSerializer

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()

        # Optional: Add additional checks if needed
        if instance.is_accepted:
            return Response(
                {"detail": "Cannot delete an already accepted invitation."}, status=status.HTTP_400_BAD_REQUEST
            )

        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([InvitationAcceptRateThrottle])
def accept_invitation(request, invitation_id):
    """
    Accept an admin invitation and create a user account

    Security features:
    - Rate limiting (5 attempts per hour per IP) - SECURITY FIX
    """
    password = request.data.get("password")
    confirm_password = request.data.get("confirm_password")

    if not password:
        return Response({"detail": "Password is required."}, status=status.HTTP_400_BAD_REQUEST)

    if password != confirm_password:
        return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

    # Validate password strength (consistent with client_register)
    password_validation = validate_password_strength(password)
    if not password_validation["is_valid"]:
        return Response(
            {
                "detail": "Password does not meet security requirements",
                "password_feedback": password_validation["messages"],
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    with transaction.atomic():
        user = AdminInvitationService.accept_invitation(invitation_id, password)

    tokens = UserService.get_tokens_for_user(user)

    return Response(
        {"message": "Invitation accepted successfully.", "tokens": tokens, "user": UserSerializer(user).data}
    )
