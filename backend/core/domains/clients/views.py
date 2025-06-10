# backend/core/domains/clients/views.py
from core.utils.permissions import IsAdmin
from django.db import models, transaction
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .serializers import (
    AcceptClientInvitationSerializer,
    ClientCreateUpdateSerializer,
    ClientDetailSerializer,
    ClientInvitationDetailSerializer,
    ClientInvitationSerializer,
    ClientListSerializer,
)
from .services import ClientInvitationService, ClientService


class ClientViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing clients (users with CLIENT role)
    """
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['first_name', 'last_name', 'email', 'profile__company', 'profile__phone']
    
    def get_queryset(self):
        is_active = self.request.query_params.get('is_active')
        has_account = self.request.query_params.get('has_account')
        search_query = self.request.query_params.get('search')
        
        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
            
        # Get base queryset first
        queryset = ClientService.get_all_clients(
            search_query=search_query,
            is_active=is_active
    )
            
        # has_account is a custom filter - if true, get clients with passwords set
        # if false, get clients without passwords (imported clients)
        if has_account is not None:
            has_account = has_account.lower() == 'true'
            
            if has_account:
                # Return clients with valid passwords
                client_ids = [client.id for client in queryset if client.has_usable_password()]
                return queryset.filter(id__in=client_ids)
            else:
                # Return clients without valid passwords
                client_ids = [client.id for client in queryset if not client.has_usable_password()]
                return queryset.filter(id__in=client_ids)
        
        return ClientService.get_all_clients(
            search_query=search_query,
            is_active=is_active
        )
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ClientListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ClientCreateUpdateSerializer
        elif self.action == 'send_invitation':
            return ClientInvitationSerializer
        return ClientDetailSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            client = ClientService.create_client(serializer.validated_data)
        
        return Response(
            ClientDetailSerializer(client).data, 
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            client = ClientService.update_client(
                instance.id, 
                serializer.validated_data
            )
        
        return Response(ClientDetailSerializer(client).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            ClientService.deactivate_client(instance.id)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get'])
    def events(self, request, pk=None):
        """Get all events for a client"""
        events = ClientService.get_client_events(pk)
        from core.domains.events.serializers import EventSerializer
        serializer = EventSerializer(events, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active clients"""
        active_clients = ClientService.get_all_clients(is_active=True)
        page = self.paginate_queryset(active_clients)
        
        if page is not None:
            serializer = ClientListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = ClientListSerializer(active_clients, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def send_invitation(self, request, pk=None):
        """Send an invitation to a client to create an account"""
        try:
            invitation = ClientInvitationService.send_client_invitation(
                client_id=pk,
                invited_by_id=request.user.id
            )
            serializer = ClientInvitationDetailSerializer(invitation)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class ClientInvitationViewSet(viewsets.ViewSet):
    """
    ViewSet for client invitations
    """
    def get_permissions(self):
        """
        Override to allow public access to retrieve and accept
        """
        if self.action in ['retrieve', 'accept']:
            return []
        return [IsAdmin()]
        
    def retrieve(self, request, pk=None):
        """
        Retrieve invitation details
        """
        try:
            invitation = ClientInvitationService.get_invitation_by_id(pk)
            serializer = ClientInvitationDetailSerializer(invitation)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """
        Accept an invitation and activate client account
        """
        serializer = AcceptClientInvitationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            client = ClientInvitationService.accept_invitation(
                invitation_id=pk,
                password=serializer.validated_data['password']
            )
            
            # Generate tokens for automatic login
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(client)
            
            return Response({
                "message": "Account activated successfully",
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh)
                },
                "user": ClientDetailSerializer(client).data
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )