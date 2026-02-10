# backend/core/domains/bookingflow/views/booking_session_views.py

from django.utils import timezone
from .... import settings
from core.utils.permissions import IsAdminOrClient
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from decimal import Decimal
from django.db.models import Prefetch, Count, Q
from core.domains.products.models import ProductOption, ProductCategory
from core.domains.products.services import DiscountService

import logging
logger = logging.getLogger(__name__)

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

        # Add select_related and prefetch_related for optimization
        queryset = queryset.select_related(
            'booking_flow',
            'booking_flow__event_type',
            'client',
            'current_step',
            'created_event',
        ).prefetch_related(
            'completed_steps',
        )

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
            logger.error(f"Booking session error: {e}", exc_info=True)
            return Response(
                {"detail": "An error occurred processing your request. Please try again."},
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
            logger.error(f"Booking session update error: {e}", exc_info=True)
            return Response(
                {"detail": "An error occurred processing your request. Please try again."},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def complete_booking(self, request, pk=None):
        """Complete the booking and create event (Authenticated users only)"""
        try:
            session = self.get_object()
            completion_type = request.data.get('completion_type', 'payment')
            
            # Validate completion_type
            if completion_type not in ['payment', 'quote']:
                return Response(
                    {"detail": "completion_type must be 'payment' or 'quote'"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            event = BookingSessionService.complete_booking(str(session.session_id), completion_type)
            
            from core.domains.events.serializers import EventSerializer
            response_message = "Booking completed successfully"
            if completion_type == 'quote':
                response_message = "Quote request submitted successfully"
            
            return Response(
                {
                    "detail": response_message,
                    "event": EventSerializer(event, context=self.get_serializer_context()).data,
                    "session": BookingSessionSerializer(session, context=self.get_serializer_context()).data,
                    "completion_type": completion_type
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
        annotated_categories = ProductCategory.objects.annotate(
            _products_count=Count('products', filter=Q(products__is_active=True)),
            _children_count=Count('children', filter=Q(children__is_active=True)),
        )
        queryset = BookingFlow.objects.filter(is_active=True).select_related(
            'event_type'
        ).prefetch_related(
            'steps',
            # Step configurations
            'steps__package_config',
            'steps__addon_config',
            'steps__pricing_config',
            'steps__contact_config',
            'steps__payment_config',
            'steps__confirmation_config',
            'steps__introduction_config',
            'steps__datetime_config',
            'steps__questionnaire_config',
            'steps__venue_selection_config',
            # Categories with count annotations to avoid N+1 COUNT queries
            Prefetch(
                'steps__package_config__available_categories',
                queryset=annotated_categories,
            ),
            Prefetch(
                'steps__addon_config__available_categories',
                queryset=annotated_categories,
            ),
            # Packages/addons with their nested relationships
            'steps__package_config__available_packages',
            'steps__addon_config__available_addons',
            'steps__package_config__available_packages__event_types',
            'steps__addon_config__available_addons__event_types',
            'steps__package_config__available_packages__package_venues__venue',
            'steps__addon_config__available_addons__package_venues__venue',
            'steps__questionnaire_config__questionnaire_items__questionnaire',
        )
        
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
            
            # SECURITY FIX: Replaced print statements with proper logging
            logger.debug(f"update_session_data: step_id={step_id}, mark_completed={mark_completed}, session_uuid={session_uuid}")

            if not step_id:
                return Response(
                    {"detail": "step_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            logger.debug("update_session_data: About to call service method")
            session = BookingSessionService.update_session_data(
                session_id=session_uuid,
                step_data=step_data,
                mark_completed=mark_completed
            )
            logger.debug("update_session_data: Service method completed")
            
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
            
            # Validate step data with session context for authenticated users
            validation_errors = BookingSessionService._validate_step_data(step, step_data, session)
            
            return Response({
                "isValid": len(validation_errors) == 0,
                "errors": validation_errors
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], url_path='session/(?P<session_uuid>[^/]+)/complete')
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
            
            # Always create a user for guest bookings if session doesn't have a client
            user = None
            user_created = False

            # Handle case where user logged in during booking flow but session wasn't updated
            if request.user.is_authenticated and not session.client:
                # Associate the authenticated user with the session
                session.client = request.user
                session.save()
                logger.info(f"Associated authenticated user {request.user.email} with session {session_uuid}")

            if not request.user.is_authenticated and not session.client:
                from core.domains.users.services import UserService
                try:
                    # Check if user already exists with this email
                    from django.contrib.auth import get_user_model
                    User = get_user_model()
                    
                    existing_user = User.objects.filter(
                        email=contact_data['email'], 
                        role='CLIENT'
                    ).first()
                    
                    if existing_user:
                        # Use existing client user
                        user = existing_user
                        session.client = user
                        session.save()
                    else:
                        # Create new user record
                        user_data = {
                            'email': contact_data['email'],
                            'first_name': contact_data.get('full_name', '').split(' ')[0] if contact_data.get('full_name') else '',
                            'last_name': ' '.join(contact_data.get('full_name', '').split(' ')[1:]) if contact_data.get('full_name') else '',
                            'role': 'CLIENT',
                            'profile': {
                                'phone': contact_data.get('phone', ''),
                                'company': contact_data.get('company', ''),
                            }
                        }
                        
                        # Determine if this should be an active account or guest account
                        if contact_data.get('create_account'):
                            # User wants an active account with password
                            user_data['password'] = contact_data.get('password')
                            user_data['is_active'] = True
                            user_created = True
                        else:
                            # Guest booking - create inactive user without usable password
                            user_data['is_active'] = False
                            # Don't set password - UserService will set unusable password
                        
                        user = UserService.create_user(user_data)
                        
                        # Update session with new user
                        session.client = user
                        session.save()
                        user_created = contact_data.get('create_account', False)
                        
                except Exception as e:
                    # Log error and return specific error message
                    logger.error(f"Failed to create user account for guest booking: {e}")
                    return Response(
                        {"detail": f"Failed to create user account: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Ensure session has a client before completing booking
            if not session.client:
                return Response(
                    {"detail": "Unable to complete booking: no client associated with session"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            completion_type = request.data.get('completion_type', 'payment')
            reservation_token = request.data.get('reservation_token')

            # Log request info (sanitized - no sensitive data)
            logger.debug(f"Public completion endpoint: session_uuid={session_uuid}, completion_type={completion_type}")

            # Validate completion_type
            if completion_type not in ['payment', 'quote']:
                return Response(
                    {"detail": "completion_type must be 'payment' or 'quote'"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            event = BookingSessionService.complete_booking(
                session_uuid,
                completion_type,
                reservation_token=reservation_token
            )
            
            from core.domains.events.serializers import EventSerializer
            response_message = "Booking completed successfully"
            if completion_type == 'quote':
                response_message = "Quote request submitted successfully"
            
            return Response(
                {
                    "detail": response_message,
                    "event": EventSerializer(event, context=self.get_serializer_context()).data,
                    "session_id": session_uuid,
                    "user_created": user_created,
                    "completion_type": completion_type
                },
                status=status.HTTP_200_OK
            )
        except Exception as e:
            logger.error(f"Error completing booking: {e}")
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
                'default_gateway': None,
                'require_immediate_payment': flow.require_immediate_payment
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    @action(detail=False, methods=['post'], url_path='session/(?P<session_uuid>[^/.]+)/calculate-pricing')
    def calculate_pricing(self, request, session_uuid=None):
        """Calculate pricing for current session state using centralized pricing service"""
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)

            # Get booking data
            booking_data = session.booking_data or {}

            # Add discount code to booking data if provided
            discount_code = request.data.get('discount_code', '')
            if discount_code:
                booking_data['applied_discount_code'] = discount_code

            # Extract venue_additional_hours - prefer request body over session data
            # This allows frontend to pass current local state for real-time pricing updates
            venue_additional_hours = request.data.get('venue_additional_hours') or booking_data.get('venue_additional_hours', {})

            # Get event_type_id from booking flow for event-type-specific pricing
            event_type_id = None
            if session.booking_flow and session.booking_flow.event_type:
                event_type_id = session.booking_flow.event_type_id

            # Log for debugging
            logger.info(f"=== PRICING API USING CENTRALIZED SERVICE ===")
            logger.info(f"Session: {session_uuid}, Discount: '{discount_code}'")
            logger.info(f"Venue Additional Hours: {venue_additional_hours}")
            logger.info(f"Event Type ID: {event_type_id}")

            # Use centralized pricing service for consistent calculations
            from core.domains.sales.pricing_service import PricingCalculationService
            pricing_breakdown = PricingCalculationService.calculate_from_booking_data(
                booking_data=booking_data,
                venue_additional_hours=venue_additional_hours,
                event_type_id=event_type_id
            )
            
            # Prepare discount details if discount was applied
            discount_details = None
            if pricing_breakdown.applied_discount:
                discount_details = {
                    'code': pricing_breakdown.applied_discount.code,
                    'type': pricing_breakdown.applied_discount.discount_type,
                    'value': str(pricing_breakdown.applied_discount.value),
                    'amount_applied': str(pricing_breakdown.discount_amount.quantize(Decimal('0.01')))
                }
            
            # Log final results
            logger.info(f"CENTRALIZED PRICING RESULT: subtotal=₱{pricing_breakdown.subtotal}, "
                       f"tax=₱{pricing_breakdown.tax_amount}, discount=₱{pricing_breakdown.discount_amount}, "
                       f"total=₱{pricing_breakdown.total_amount}")

            # Serialize line items with excess hour details
            line_items_data = []
            for item in pricing_breakdown.line_items:
                line_item_dict = {
                    'product_id': item.product_id,
                    'name': item.name,
                    'description': item.description,
                    'quantity': item.quantity,
                    'base_unit_price': str(item.base_unit_price.quantize(Decimal('0.01'))),
                    'total_unit_price': str(item.total_unit_price.quantize(Decimal('0.01'))),
                    'line_total': str(item.line_total.quantize(Decimal('0.01'))),
                    'tax_rate': str(item.tax_rate.quantize(Decimal('0.01'))),
                    'excess_hours': item.excess_hours,
                    'excess_hour_price': str(item.excess_hour_price.quantize(Decimal('0.01'))) if item.excess_hour_price else None,
                    'excess_cost': str(item.excess_cost.quantize(Decimal('0.01'))),
                }
                line_items_data.append(line_item_dict)

            response_data = {
                'subtotal': str(pricing_breakdown.subtotal.quantize(Decimal('0.01'))),
                'tax': str(pricing_breakdown.tax_amount.quantize(Decimal('0.01'))),
                'tax_rate': str(pricing_breakdown.tax_rate.quantize(Decimal('0.01'))),
                'discount': str(pricing_breakdown.discount_amount.quantize(Decimal('0.01'))),
                'total': str(pricing_breakdown.total_amount.quantize(Decimal('0.01'))),
                'discount_details': discount_details,
                'line_items': line_items_data,
            }

            # Include discount validation error if present
            if pricing_breakdown.discount_error:
                response_data['discount_error'] = pricing_breakdown.discount_error
                response_data['discount_error_type'] = pricing_breakdown.discount_error_type

            return Response(response_data)
            
        except BookingSession.DoesNotExist:
            return Response(
                {"detail": "Booking session not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error calculating pricing: {str(e)}", exc_info=True)
            return Response(
                {"detail": "Error calculating pricing"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    @action(detail=False, methods=['get'], url_path='questionnaires/(?P<questionnaire_id>[^/.]+)')
    def get_questionnaire_detail(self, request, questionnaire_id=None):
        """Get questionnaire details for booking flow (Public endpoint)"""
        from core.domains.questionnaires.models import Questionnaire
        from core.domains.questionnaires.serializers import QuestionnaireDetailSerializer
        
        try:
            questionnaire = Questionnaire.objects.prefetch_related(
                'fields'
            ).get(id=questionnaire_id, is_active=True)
            
            serializer = QuestionnaireDetailSerializer(
                questionnaire, 
                context=self.get_serializer_context()
            )
            return Response(serializer.data)
        except Questionnaire.DoesNotExist:
            return Response(
                {"detail": "Questionnaire not found or not active"},
                status=status.HTTP_404_NOT_FOUND
            )
        
    @action(detail=False, methods=['patch'], url_path='session/(?P<session_uuid>[^/.]+)/go-to-step')
    def go_to_step(self, request, session_uuid=None):
        """Navigate to a specific step without updating data"""
        try:
            step_id = request.data.get('step_id')
            if not step_id:
                return Response(
                    {"detail": "step_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            session = BookingSessionService.get_session_by_id(session_uuid)
            
            # Find the step
            step = session.booking_flow.steps.filter(id=step_id, is_enabled=True).first()
            if not step:
                return Response(
                    {"detail": "Step not found or not enabled"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Update current step
            session.current_step = step
            session.save()
            
            return Response({
                "session_id": str(session.session_id),
                "current_step": BookingFlowStepSerializer(
                    session.current_step, context=self.get_serializer_context()
                ).data,
                "progress_percentage": session.progress_percentage,
                "updated_at": session.updated_at,
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    @action(detail=False, methods=['post'], url_path='session/(?P<session_uuid>[^/]+)/send-confirmation')
    def send_confirmation(self, request, session_uuid=None):
        """Send confirmation email for completed booking"""
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)
            
            # Validations
            if not session.is_completed:
                return Response(
                    {"detail": "Booking must be completed first"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not session.client or not session.client.email:
                return Response(
                    {"detail": "No email address available"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if already sent (optional - prevent duplicates)
            if session.booking_data.get('confirmation_email_sent'):
                return Response(
                    {"detail": "Confirmation already sent"},
                    status=status.HTTP_200_OK
                )
            
            # Import the communication service
            from core.domains.communications.services import CommunicationService
            
            comm_service = CommunicationService()
            
            # Build comprehensive context from booking data
            booking_data = session.booking_data
            
            # FIXED: Extract date/time info from correct location
            # Look for date/time data at root level first
            event_date = booking_data.get('start_date')
            event_time = booking_data.get('start_time')
            end_date = booking_data.get('end_date')
            end_time = booking_data.get('end_time')
            duration = booking_data.get('duration')
            
            # If not found at root, check under step keys
            if not event_date:
                for step_key, step_data in booking_data.items():
                    if isinstance(step_data, dict):
                        if 'start_date' in step_data:
                            event_date = step_data.get('start_date')
                            event_time = step_data.get('start_time', '')
                            end_date = step_data.get('end_date', '')
                            end_time = step_data.get('end_time', '')
                            duration = step_data.get('duration')
                            break
            
            # Format the date and time for display
            if event_date:
                try:
                    from datetime import datetime
                    # Parse the date
                    date_obj = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                    event_date_formatted = date_obj.strftime('%B %d, %Y')  # e.g., "September 11, 2025"
                    
                    # Format time if available
                    if event_time:
                        # If time is in HH:MM format
                        if ':' in event_time:
                            time_parts = event_time.split(':')
                            hour = int(time_parts[0])
                            minute = time_parts[1]
                            am_pm = 'AM' if hour < 12 else 'PM'
                            if hour > 12:
                                hour -= 12
                            elif hour == 0:
                                hour = 12
                            event_time_formatted = f"{hour}:{minute} {am_pm}"
                        else:
                            event_time_formatted = event_time
                    else:
                        event_time_formatted = 'TBD'
                except (ValueError, AttributeError, TypeError, IndexError):
                    # Fallback to raw values if parsing fails
                    event_date_formatted = event_date
                    event_time_formatted = event_time or 'TBD'
            else:
                event_date_formatted = 'TBD'
                event_time_formatted = 'TBD'
            
            # Extract contact info - look at root level first, then in step data
            contact_phone = booking_data.get('phone')
            if not contact_phone:
                contact_info = booking_data.get('contact_info', {})
                if isinstance(contact_info, dict):
                    contact_phone = contact_info.get('phone')
                
                # Also check under step keys
                if not contact_phone:
                    for step_key, step_data in booking_data.items():
                        if isinstance(step_data, dict) and 'phone' in step_data:
                            contact_phone = step_data.get('phone')
                            break
            
            # Extract packages and addons from root level (consistent with pricing calculation)
            selected_packages = booking_data.get('selected_packages', [])
            selected_addons = booking_data.get('selected_addons', [])
            
            # If not found at root, check under step keys
            if not selected_packages:
                for step_key, step_data in booking_data.items():
                    if isinstance(step_data, dict) and 'selected_packages' in step_data:
                        selected_packages = step_data['selected_packages']
                        break
                        
            if not selected_addons:
                for step_key, step_data in booking_data.items():
                    if isinstance(step_data, dict) and 'selected_addons' in step_data:
                        selected_addons = step_data['selected_addons']
                        break
            
            # Build the context for the email template
            context = {
                'client_name': f"{session.client.first_name} {session.client.last_name}",
                'booking_reference': str(session.session_id)[-8:].upper(),
                'event_type': session.booking_flow.event_type.name if session.booking_flow.event_type else 'Event',
                
                # Use formatted date/time values
                'event_date': event_date_formatted,
                'event_time': event_time_formatted,
                'duration': duration,
                
                # Contact info
                'email': session.client.email,
                'phone': contact_phone,
                
                # Packages and pricing
                'selected_packages': selected_packages,
                'selected_addons': selected_addons,
                'total_price': str(session.calculate_total_price()),
                
                # Add any questionnaire responses
                'questionnaire_responses': booking_data.get('questionnaire', {}),
                
                # Links
                'dashboard_url': settings.CLIENT_FRONTEND_URL,
            }
            
            # Log for debugging
            logger.info(f"Sending confirmation email for session {session.session_id}")
            logger.debug(f"Email context - Date: {event_date_formatted}, Time: {event_time_formatted}")
            
            # Try to find the event associated with this session
            from core.domains.events.models import Event
            event = None
            try:
                # Look for the most recent event for this client created around the session completion time
                event = Event.objects.filter(
                    client=session.client
                ).order_by('-created_at').first()
            except Exception as e:
                logger.warning(f"Could not find event for session {session.session_id}: {e}")

            # Send the email
            if session.booking_flow.confirmation_email_template:
                result = comm_service.send_communication(
                    template_name=session.booking_flow.confirmation_email_template.name,
                    recipient=session.client.email,
                    context_data=context,
                    client=session.client,
                    event=event
                )
                
                # Mark as sent in session data
                session.booking_data['confirmation_email_sent'] = True
                session.booking_data['confirmation_email_sent_at'] = timezone.now().isoformat()
                session.save()
                
                logger.info(f"Confirmation email sent for session: {session.session_id}")
                
                return Response(
                    {"detail": "Confirmation email sent successfully"},
                    status=status.HTTP_200_OK
                )
            else:
                return Response(
                    {"detail": "No confirmation template configured"},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except Exception as e:
            logger.error(f"Failed to send confirmation: {e}")
            return Response(
                {"detail": f"Failed to send email: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # NOTE: Step validation is now handled by BookingSessionService._validate_step_data()
    # This provides enhanced validation including authenticated user context

    @action(detail=False, methods=['post'], url_path='session/(?P<session_uuid>[^/]+)/validate-availability')
    def validate_availability(self, request, session_uuid=None):
        """
        Validate date availability and create a temporary reservation.

        This endpoint should be called BEFORE processing payment to ensure the date
        is still available. It creates a 5-minute reservation window during which
        the payment can be processed.

        Request body:
            None required - uses date from session data

        Returns:
            {
                "available": true/false,
                "reservation_token": "uuid" (if available),
                "expires_at": "datetime" (if available),
                "error": "string" (if not available)
            }
        """
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)

            # Extract the event date from booking data
            booking_data = session.booking_data or {}
            event_date = None

            # Check root level first
            if 'start_date' in booking_data:
                event_date = booking_data.get('start_date')
            else:
                # Check in step data
                for step_key, step_data in booking_data.items():
                    if isinstance(step_data, dict) and 'start_date' in step_data:
                        event_date = step_data.get('start_date')
                        break

            if not event_date:
                return Response(
                    {
                        "available": False,
                        "error": "No event date found in booking session"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Parse the date
            from datetime import datetime
            if isinstance(event_date, str):
                try:
                    # Handle ISO format with timezone
                    date_obj = datetime.fromisoformat(event_date.replace('Z', '+00:00'))
                    check_date = date_obj.date()
                except ValueError:
                    # Try simple date format
                    check_date = datetime.strptime(event_date[:10], '%Y-%m-%d').date()
            else:
                check_date = event_date

            # Use atomic availability service to validate and reserve
            from core.domains.events.services import AtomicAvailabilityService

            result = AtomicAvailabilityService.validate_and_reserve_date(
                event_date=check_date,
                booking_session_id=session_uuid
            )

            if result['available']:
                return Response({
                    "available": True,
                    "reservation_token": result['reservation_token'],
                    "expires_at": result['expires_at'].isoformat() if result['expires_at'] else None,
                    "message": "Date is available. You have 5 minutes to complete payment."
                })
            else:
                return Response({
                    "available": False,
                    "error": result['error'] or "Date is no longer available",
                    "blocking_event_id": result.get('blocking_event_id')
                })

        except Exception as e:
            logger.error(f"Error validating availability: {e}")
            return Response(
                {
                    "available": False,
                    "error": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'], url_path='session/(?P<session_uuid>[^/]+)/release-reservation')
    def release_reservation(self, request, session_uuid=None):
        """
        Release a date reservation.

        This endpoint should be called if:
        1. Payment fails
        2. User cancels during payment
        3. Any error occurs after reservation was created

        Request body:
            {
                "reservation_token": "uuid"
            }

        Returns:
            {
                "success": true/false,
                "error": "string" (if failed)
            }
        """
        try:
            reservation_token = request.data.get('reservation_token')

            if not reservation_token:
                return Response(
                    {
                        "success": False,
                        "error": "reservation_token is required"
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Use atomic availability service to release
            from core.domains.events.services import AtomicAvailabilityService

            result = AtomicAvailabilityService.release_reservation(reservation_token)

            if result['success']:
                return Response({
                    "success": True,
                    "message": "Reservation released successfully"
                })
            else:
                return Response({
                    "success": False,
                    "error": result['error']
                })

        except Exception as e:
            logger.error(f"Error releasing reservation: {e}")
            return Response(
                {
                    "success": False,
                    "error": str(e)
                },
                status=status.HTTP_400_BAD_REQUEST
            )

    def _get_session_duration(self, booking_data):
        """Extract event duration from booking session data"""
        # Look for duration in various places in booking data
        duration = None
        
        # Check root level first
        if 'duration' in booking_data:
            duration = booking_data.get('duration')
        
        # Check in step data
        if not duration:
            for step_key, step_data in booking_data.items():
                if isinstance(step_data, dict):
                    if 'duration' in step_data:
                        duration = step_data['duration']
                        break
                    # Also check for end_time and start_time to calculate duration
                    elif 'start_time' in step_data and 'end_time' in step_data:
                        try:
                            from datetime import datetime
                            start_time = datetime.strptime(step_data['start_time'], '%H:%M')
                            end_time = datetime.strptime(step_data['end_time'], '%H:%M')
                            duration_hours = (end_time - start_time).seconds / 3600
                            duration = int(duration_hours)
                            break
                        except (ValueError, TypeError):
                            continue
        
        try:
            return int(duration) if duration else None
        except (ValueError, TypeError):
            return None