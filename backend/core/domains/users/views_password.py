# backend/core/domains/users/views_password.py
from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.utils.security import validate_password_strength
from .exceptions import InvalidCredentials
from .serializers import ChangePasswordSerializer


class ChangePasswordView(APIView):
    """
    API endpoint for changing user password
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if serializer.is_valid():
            # Check if current password is correct
            user = authenticate(
                username=request.user.email,
                password=serializer.validated_data['current_password']
            )
            
            if user is None:
                return Response(
                    {"detail": "Current password is incorrect."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate password strength (consistent with accept_invitation, client_register, confirm_password_reset)
            new_password = serializer.validated_data['new_password']
            password_validation = validate_password_strength(new_password)
            if not password_validation['is_valid']:
                return Response({
                    'detail': 'Password does not meet security requirements',
                    'password_feedback': password_validation['messages']
                }, status=status.HTTP_400_BAD_REQUEST)

            # Set new password
            user.set_password(new_password)
            user.save()

            return Response(
                {"detail": "Password changed successfully."},
                status=status.HTTP_200_OK
            )
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)