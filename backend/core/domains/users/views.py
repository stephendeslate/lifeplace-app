# backend/core/domains/users/views.py
from core.utils.permissions import IsAdmin, IsOwnerOrAdmin
from django.contrib.auth import authenticate
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView

from .exceptions import InvalidCredentials, UserNotFound
from .models import AdminInvitation, User
from .serializers import (
    AdminInvitationSerializer,
    UserCreateSerializer,
    UserLoginSerializer,
    UserSerializer,
)
from .services import AdminInvitationService, UserService

@method_decorator(csrf_exempt, name='dispatch')
class UserLoginAPIView(APIView):
    """
    User login API view
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        remember_me = serializer.validated_data.get('remember_me', False)
        
        user = authenticate(request, username=email, password=password)
        
        if user is None:
            raise InvalidCredentials()
        
        tokens = UserService.get_tokens_for_user(user, remember_me)
        
        return Response({
            'tokens': tokens,
            'user': UserSerializer(user).data
        })


@csrf_exempt
@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def client_register(request):
    """
    Public endpoint for client self-registration
    
    This endpoint allows clients to register directly without an invitation.
    It's exempted from CSRF protection to work with the client portal.
    """
    serializer = UserCreateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    # Make a copy of the validated data to avoid modifying the original
    user_data = serializer.validated_data.copy()
    
    # Remove confirm_password field - it's only for validation
    user_data.pop('confirm_password', None)
    
    # Ensure role is set to CLIENT
    user_data['role'] = 'CLIENT'
    
    try:
        with transaction.atomic():
            # Use UserService.create_user() which properly handles profile creation
            user = UserService.create_user(user_data)
            
            # Generate tokens for automatic login
            tokens = UserService.get_tokens_for_user(user)
            
            return Response({
                'tokens': tokens,
                'user': UserSerializer(user).data
            }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({
            'detail': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


class UserListCreateAPIView(generics.ListCreateAPIView):
    """
    List and create users
    """
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        search_query = self.request.query_params.get('search', None)
        return UserService.get_users(search_query)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            user = UserService.create_user(serializer.validated_data)
        
        return Response(
            UserSerializer(user).data,
            status=status.HTTP_201_CREATED
        )


class UserDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    """
    Retrieve, update or delete a user
    """
    serializer_class = UserSerializer
    permission_classes = [IsOwnerOrAdmin]
    
    def get_object(self):
        user_id = self.kwargs.get('pk')
        user = UserService.get_user_by_id(user_id)
        self.check_object_permissions(self.request, user)
        return user
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        user = self.get_object()
        serializer = self.get_serializer(user, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            updated_user = UserService.update_user(user, serializer.validated_data)
        
        return Response(UserSerializer(updated_user).data)
    
    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        
        if user == request.user:
            return Response(
                {"detail": "You cannot delete your own account."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        UserService.delete_user(user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CurrentUserView(APIView):
    """
    Get or update current logged in user
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        return Response(UserSerializer(request.user).data)
    
    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            updated_user = UserService.update_user(request.user, serializer.validated_data)
        
        return Response(UserSerializer(updated_user).data)


class AdminInvitationListCreateAPIView(generics.ListCreateAPIView):
    """
    List and create admin invitations
    """
    serializer_class = AdminInvitationSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        return AdminInvitation.objects.filter(is_accepted=False)
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            invitation = AdminInvitationService.create_invitation(
                email=serializer.validated_data['email'],
                first_name=serializer.validated_data['first_name'],
                last_name=serializer.validated_data['last_name'],
                invited_by=request.user
            )
        
        return Response(
            AdminInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED
        )


class AdminInvitationDetailAPIView(generics.RetrieveDestroyAPIView):
    """
    Retrieve or delete an admin invitation
    """
    serializer_class = AdminInvitationSerializer
    permission_classes = [IsAdmin]  # Only admins should delete invitations
    
    def get_object(self):
        invitation_id = self.kwargs.get('pk')
        return AdminInvitationService.get_invitation_by_id(invitation_id)
        
    def get_permissions(self):
        """
        Override to allow anyone to view an invitation, but only admins to delete
        """
        if self.request.method == 'DELETE':
            return [IsAdmin()]
        return [permissions.AllowAny()]
        
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        # Optional: Add additional checks if needed
        if instance.is_accepted:
            return Response(
                {"detail": "Cannot delete an already accepted invitation."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def accept_invitation(request, invitation_id):
    """
    Accept an admin invitation and create a user account
    """
    password = request.data.get('password')
    confirm_password = request.data.get('confirm_password')
    
    if not password:
        return Response(
            {"detail": "Password is required."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if password != confirm_password:
        return Response(
            {"detail": "Passwords do not match."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    with transaction.atomic():
        user = AdminInvitationService.accept_invitation(invitation_id, password)
    
    tokens = UserService.get_tokens_for_user(user)
    
    return Response({
        'message': 'Invitation accepted successfully.',
        'tokens': tokens,
        'user': UserSerializer(user).data
    })