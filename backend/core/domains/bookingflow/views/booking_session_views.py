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
    ViewSet for managing booking sessions (Admin/Authenticated users only)
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
        """Create a new booking session (Authenticated users only)"""
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
        """Update session data for a step (Authenticated users only)"""
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
        """Complete the booking and create event (Authenticated users only)"""
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
    UPDATED: Added public session management endpoints
    """
    permission_classes = [AllowAny]
    serializer_class = PublicBookingFlowSerializer
    pagination_class = None  # Disable pagination
    
    def get_queryset(self):
        event_type_id = self.request.query_params.get('event_type')
        queryset = BookingFlow.objects.filter(is_active=True).select_related(
            'event_type'
        ).prefetch_related('steps')
        
        # Apply event type filter if provided
        if event_type_id:
            queryset = queryset.filter(event_type_id=event_type_id)
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        """Override list to ensure no pagination"""
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def start_session(self, request, pk=None):
        """Start a new booking session for this flow (Public endpoint)"""
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
    
    @action(detail=False, methods=['get'], url_path='session/(?P<session_uuid>[^/.]+)')
    def get_session(self, request, session_uuid=None):
        """Get session data by UUID (Public endpoint)"""
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)
            
            # Return minimal session data for public access
            return Response({
                "session_id": str(session.session_id),
                "booking_flow": session.booking_flow.id,
                "current_step": BookingFlowStepSerializer(
                    session.current_step, context=self.get_serializer_context()
                ).data if session.current_step else None,
                "progress_percentage": session.progress_percentage,
                "expires_at": session.expires_at,
                "is_completed": session.is_completed,
                "is_abandoned": session.is_abandoned,
                "total_price": str(session.calculate_total_price()),
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['patch'], url_path='session/(?P<session_uuid>[^/.]+)/update')
    def update_session_data(self, request, session_uuid=None):
        """Update session data (Public endpoint)"""
        try:
            step_id = request.data.get('step_id')
            step_data = request.data.get('step_data', {})
            mark_completed = request.data.get('mark_completed', False)
            
            if not step_id:
                return Response(
                    {"detail": "step_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            session = BookingSessionService.update_session_data(
                session_id=session_uuid,
                step_data=step_data,
                mark_completed=mark_completed
            )
            
            # Return minimal session data
            return Response({
                "session_id": str(session.session_id),
                "current_step": BookingFlowStepSerializer(
                    session.current_step, context=self.get_serializer_context()
                ).data if session.current_step else None,
                "progress_percentage": session.progress_percentage,
                "validation_errors": session.validation_errors,
                "total_price": str(session.calculate_total_price()),
                "updated_at": session.updated_at,
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='session/(?P<session_uuid>[^/.]+)/validate')
    def validate_step_data(self, request, session_uuid=None):
        """Validate step data without saving (Public endpoint)"""
        try:
            step_id = request.data.get('step_id')
            step_data = request.data.get('step_data', {})
            
            if not step_id:
                return Response(
                    {"detail": "step_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get session to access current step for validation
            session = BookingSessionService.get_session_by_id(session_uuid)
            
            # Find the step
            step = session.booking_flow.steps.filter(id=step_id).first()
            if not step:
                return Response(
                    {"detail": "Step not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Validate step data (you'll need to implement this in the service)
            validation_errors = BookingSessionService._validate_step_data(step, step_data)
            
            return Response({
                "isValid": len(validation_errors) == 0,
                "errors": validation_errors
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='session/(?P<session_uuid>[^/.]+)/complete')
    def complete_booking_public(self, request, session_uuid=None):
        """Complete booking (Public endpoint - requires contact info)"""
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)
            
            # For guest bookings, we need to ensure they provided contact info
            contact_data = None
            for step_key, step_data in session.booking_data.items():
                if isinstance(step_data, dict) and 'email' in step_data:
                    contact_data = step_data
                    break
            
            if not contact_data or not contact_data.get('email'):
                return Response(
                    {"detail": "Contact information is required to complete booking"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create user account if requested
            user = None
            if contact_data.get('create_account') and not request.user.is_authenticated:
                from core.domains.users.services import UserService
                try:
                    user_data = {
                        'email': contact_data['email'],
                        'first_name': contact_data.get('full_name', '').split(' ')[0] if contact_data.get('full_name') else '',
                        'last_name': ' '.join(contact_data.get('full_name', '').split(' ')[1:]) if contact_data.get('full_name') else '',
                        'password': contact_data.get('password'),
                        'phone': contact_data.get('phone', ''),
                    }
                    user = UserService.create_user(user_data)
                    
                    # Update session with new user
                    session.client = user
                    session.save()
                except Exception as e:
                    # Log error but continue with guest booking
                    print(f"Failed to create user account: {e}")
            
            event = BookingSessionService.complete_booking(session_uuid)
            
            from core.domains.events.serializers import EventSerializer
            return Response(
                {
                    "detail": "Booking completed successfully",
                    "event": EventSerializer(event, context=self.get_serializer_context()).data,
                    "session_id": session_uuid,
                    "user_created": user is not None,
                },
                status=status.HTTP_200_OK
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