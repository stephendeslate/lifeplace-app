# backend/core/domains/bookingflow/views/booking_session_views.py
from core.utils.permissions import IsAdminOrClient
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from ..models import BookingFlow, BookingSession
from ..serializers import (
    BookingFlowStepSerializer,
    BookingSessionCreateSerializer,
    BookingSessionSerializer,
    BookingSessionUpdateSerializer,
    PublicBookingFlowSerializer,
)
from ..services import BookingFlowService, BookingSessionService
from ..exceptions import BookingFlowNotFound


class BookingSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing booking sessions
    """
    permission_classes = [IsAdminOrClient]
    serializer_class = BookingSessionSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin can see all sessions
        if user.is_staff or getattr(user, 'role', None) == 'ADMIN':
            queryset = BookingSession.objects.all()
        else:
            # Clients can only see their own sessions
            queryset = BookingSession.objects.filter(client=user)
        
        # Apply filters
        booking_flow_id = self.request.query_params.get('booking_flow')
        is_completed = self.request.query_params.get('is_completed')
        is_abandoned = self.request.query_params.get('is_abandoned')
        
        if booking_flow_id:
            queryset = queryset.filter(booking_flow_id=booking_flow_id)
        
        if is_completed is not None:
            is_completed = is_completed.lower() == 'true'
            queryset = queryset.filter(is_completed=is_completed)
        
        if is_abandoned is not None:
            is_abandoned = is_abandoned.lower() == 'true'
            queryset = queryset.filter(is_abandoned=is_abandoned)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BookingSessionCreateSerializer
        elif self.action == 'update_data':
            return BookingSessionUpdateSerializer
        return BookingSessionSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new booking session"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            session_data = {
                'ip_address': serializer.validated_data.get('ip_address'),
                'user_agent': serializer.validated_data.get('user_agent'),
                'referrer_url': serializer.validated_data.get('referrer_url'),
            }
            
            session = BookingSessionService.create_session(
                booking_flow_id=serializer.validated_data['booking_flow'],
                client_id=request.user.id if request.user.is_authenticated else None,
                session_data=session_data
            )
            
            return Response(
                BookingSessionSerializer(session, context=self.get_serializer_context()).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['patch'])
    def update_data(self, request, pk=None):
        """Update session data for a step"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            session = BookingSessionService.update_session_data(
                session_id=serializer.validated_data['session_id'],
                step_data=serializer.validated_data['step_data'],
                mark_completed=serializer.validated_data.get('mark_completed', False)
            )
            
            return Response(
                BookingSessionSerializer(session, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def complete_booking(self, request, pk=None):
        """Complete the booking and create event"""
        try:
            session = self.get_object()
            event = BookingSessionService.complete_booking(str(session.session_id))
            
            from core.domains.events.serializers import EventSerializer
            return Response(
                {
                    "detail": "Booking completed successfully",
                    "event": EventSerializer(event, context=self.get_serializer_context()).data,
                    "session": BookingSessionSerializer(session, context=self.get_serializer_context()).data
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def abandon(self, request, pk=None):
        """Mark session as abandoned"""
        reason = request.data.get('reason', 'User abandoned')
        
        try:
            session = self.get_object()
            abandoned_session = BookingSessionService.abandon_session(
                str(session.session_id), reason
            )
            
            return Response(
                BookingSessionSerializer(abandoned_session, context=self.get_serializer_context()).data
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class PublicBookingFlowViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public ViewSet for client-facing booking flow endpoints
    """
    permission_classes = [AllowAny]
    serializer_class = PublicBookingFlowSerializer
    
    def get_queryset(self):
        return BookingFlow.objects.filter(is_active=True).select_related(
            'event_type'
        ).prefetch_related('enabled_steps')
    
    @action(detail=True, methods=['post'])
    def start_session(self, request, pk=None):
        """Start a new booking session for this flow"""
        try:
            flow = self.get_object()
            
            session_data = {
                'ip_address': request.META.get('REMOTE_ADDR'),
                'user_agent': request.META.get('HTTP_USER_AGENT', ''),
                'referrer_url': request.META.get('HTTP_REFERER', ''),
            }
            
            session = BookingSessionService.create_session(
                booking_flow_id=flow.id,
                client_id=request.user.id if request.user.is_authenticated else None,
                session_data=session_data
            )
            
            return Response(
                {
                    "session_id": str(session.session_id),
                    "current_step": BookingFlowStepSerializer(
                        session.current_step, context=self.get_serializer_context()
                    ).data if session.current_step else None,
                    "expires_at": session.expires_at,
                    "progress_percentage": session.progress_percentage
                },
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def payment_gateways(self, request, pk=None):
        """Get available payment gateways for this booking flow (public endpoint)"""
        try:
            flow = self.get_object()
            gateways = flow.get_available_payment_gateways()
            
            # Return only public gateway information
            gateway_data = []
            for gateway in gateways:
                data = {
                    'id': gateway.id,
                    'name': gateway.name,
                    'code': gateway.code,
                    'description': gateway.description,
                }
                
                # Add only public configuration (never secret keys)
                public_config = {}
                if gateway.code == 'stripe':
                    public_config['publishable_key'] = gateway.config.get('publishable_key')
                    public_config['supports_apple_pay'] = True
                    public_config['supports_google_pay'] = True
                elif gateway.code == 'paypal':
                    public_config['client_id'] = gateway.config.get('client_id')
                    public_config['environment'] = gateway.config.get('environment', 'sandbox')
                # Add other gateways as needed
                
                data['public_config'] = public_config
                gateway_data.append(data)
            
            return Response({
                'available_gateways': gateway_data,
                'default_gateway': flow.default_payment_gateway.id if flow.default_payment_gateway else None,
                'require_immediate_payment': flow.require_immediate_payment
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )