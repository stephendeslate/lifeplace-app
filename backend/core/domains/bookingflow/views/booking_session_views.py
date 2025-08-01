# backend/core/domains/bookingflow/views/booking_session_views.py
from core.utils.permissions import IsAdminOrClient
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from decimal import Decimal
from core.domains.products.models import ProductOption
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
        ).prefetch_related(
            'steps',
            # Add comprehensive prefetch for all step configurations
            'steps__package_config',
            'steps__addon_config',
            'steps__pricing_config',
            'steps__contact_config',
            'steps__payment_config',
            'steps__confirmation_config',
            'steps__introduction_config',
            'steps__datetime_config',
            'steps__questionnaire_config',
            # Prefetch ManyToMany relationships
            'steps__package_config__available_categories',
            'steps__package_config__available_packages',
            'steps__addon_config__available_categories',
            'steps__addon_config__available_addons',
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
            
            event = BookingSessionService.complete_booking(session_uuid)
            
            from core.domains.events.serializers import EventSerializer
            return Response(
                {
                    "detail": "Booking completed successfully",
                    "event": EventSerializer(event, context=self.get_serializer_context()).data,
                    "session_id": session_uuid,
                    "user_created": user_created,
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
                'default_gateway': flow.default_payment_gateway.id if flow.default_payment_gateway else None,
                'require_immediate_payment': flow.require_immediate_payment
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    @action(detail=False, methods=['post'], url_path='session/(?P<session_uuid>[^/.]+)/calculate-pricing')
    def calculate_pricing(self, request, session_uuid=None):
        """Calculate pricing for current session state"""
        try:
            session = BookingSessionService.get_session_by_id(session_uuid)
            
            # Get selected products from session with consistent structure
            booking_data = session.booking_data or {}
            
            # FIXED: Look for packages in both places - direct and under step keys
            selected_packages = booking_data.get('selected_packages', [])
            selected_addons = booking_data.get('selected_addons', [])
            
            # If not found directly, check under step keys (but only take first occurrence)
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
            
            discount_code = request.data.get('discount_code', '')
            
            # Log for debugging
            logger.info(f"Pricing calculation for session {session_uuid}: "
                    f"packages={len(selected_packages)}, addons={len(selected_addons)}, "
                    f"discount_code='{discount_code}'")
            
            # Initialize totals
            subtotal = Decimal('0.00')
            tax_total = Decimal('0.00')
            discount_amount = Decimal('0.00')
            discount_details = None
            
            # Process packages (products with type='PACKAGE')
            for package_item in selected_packages:
                try:
                    product_id = package_item.get('product_id')
                    quantity = int(package_item.get('quantity', 1))
                    
                    if not product_id:
                        logger.warning(f"Package item missing product_id: {package_item}")
                        continue
                        
                    product = ProductOption.objects.get(
                        id=product_id,
                        type='PACKAGE',
                        is_active=True
                    )
                    
                    # Calculate base price
                    base_price = Decimal(str(product.base_price))
                    item_total = base_price * quantity
                    
                    # Handle excess hours if applicable
                    duration_hours = package_item.get('duration_hours', 0)
                    if product.has_excess_hours and product.included_hours and duration_hours:
                        if duration_hours > product.included_hours:
                            excess_hours = duration_hours - product.included_hours
                            excess_hour_price = Decimal(str(product.excess_hour_price or '0'))
                            excess_cost = excess_hours * excess_hour_price
                            item_total += excess_cost * quantity
                    
                    subtotal += item_total
                    
                    # Calculate tax for this item
                    if product.tax_rate:
                        item_tax = item_total * (Decimal(str(product.tax_rate)) / 100)
                        tax_total += item_tax
                        
                except ProductOption.DoesNotExist:
                    logger.warning(f"Package product {product_id} not found")
                    continue
                except Exception as e:
                    logger.error(f"Error processing package {package_item}: {str(e)}")
                    continue
            
            # Process addons (products with type='ADDON')
            for addon_item in selected_addons:
                try:
                    product_id = addon_item.get('product_id')
                    quantity = int(addon_item.get('quantity', 1))
                    
                    if not product_id:
                        logger.warning(f"Addon item missing product_id: {addon_item}")
                        continue
                        
                    product = ProductOption.objects.get(
                        id=product_id,
                        type='PRODUCT',
                        is_active=True
                    )
                    
                    # Calculate price
                    base_price = Decimal(str(product.base_price))
                    item_total = base_price * quantity
                    
                    subtotal += item_total
                    
                    # Calculate tax for this item
                    if product.tax_rate:
                        item_tax = item_total * (Decimal(str(product.tax_rate)) / 100)
                        tax_total += item_tax
                        
                except ProductOption.DoesNotExist:
                    logger.warning(f"Addon product {product_id} not found")
                    continue
                except Exception as e:
                    logger.error(f"Error processing addon {addon_item}: {str(e)}")
                    continue
            
            # Apply discount if provided
            if discount_code:
                try:
                    from core.domains.products.services import DiscountService
                    discount = DiscountService.validate_discount_code(discount_code)
                    
                    if discount and discount.is_active:
                        # Check if discount is applicable to the total
                        if discount.minimum_amount and subtotal < Decimal(str(discount.minimum_amount)):
                            logger.info(f"Discount {discount_code} not applied: minimum amount not met")
                        else:
                            # Calculate discount amount
                            if discount.discount_type == 'PERCENTAGE':
                                discount_value = Decimal(str(discount.value))
                                discount_amount = subtotal * (discount_value / 100)
                                # Cap percentage discount at subtotal if needed
                                discount_amount = min(discount_amount, subtotal)
                            elif discount.discount_type == 'FIXED':
                                discount_amount = Decimal(str(discount.value))
                                # Ensure discount doesn't exceed subtotal
                                discount_amount = min(discount_amount, subtotal)
                            
                            # Set discount details for response
                            discount_details = {
                                'code': discount.code,
                                'type': discount.discount_type,
                                'value': str(discount.value),
                                'amount_applied': str(discount_amount)
                            }
                            
                except Exception as e:
                    logger.warning(f"Error applying discount code {discount_code}: {str(e)}")
            
            # Calculate final total
            total = subtotal + tax_total - discount_amount
            
            # Ensure non-negative total
            if total < 0:
                total = Decimal('0.00')
            
            # Log calculation details for debugging
            logger.info(f"Pricing calculation for session {session_uuid}: "
                    f"subtotal={subtotal}, tax={tax_total}, discount={discount_amount}, total={total}")
            
            return Response({
                'subtotal': str(subtotal.quantize(Decimal('0.01'))),
                'tax': str(tax_total.quantize(Decimal('0.01'))),
                'discount': str(discount_amount.quantize(Decimal('0.01'))),
                'total': str(total.quantize(Decimal('0.01'))),
                'discount_details': discount_details
            })
            
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
        
    @staticmethod
    def _validate_step_data(step, step_data):
        """Validate step data against step configuration"""
        errors = {}
        
        # Block validation for removed step types
        if step.step_type == 'availability_check':
            errors['step_type'] = (
                "Availability check step type is no longer supported. "
                "Use date_time step with availability checking enabled instead."
            )
            return errors
        
        # Add validation for pricing summary step
        if step.step_type == 'pricing_summary':
            # Pricing summary only stores the discount code
            # All calculations are done server-side
            if 'applied_discount_code' in step_data and step_data['applied_discount_code']:
                # Validate discount code if provided
                try:
                    from core.domains.products.services import DiscountService
                    discount_code = step_data['applied_discount_code']
                    discount = DiscountService.validate_discount_code(discount_code)
                    if not discount or not discount.is_active:
                        errors['applied_discount_code'] = ["Invalid or expired discount code"]
                except Exception as e:
                    errors['applied_discount_code'] = ["Unable to validate discount code"]
        
        # Common validation for all step types
        if hasattr(step, f"{step.step_type}_config"):
            config = getattr(step, f"{step.step_type}_config")
            
            # Step-specific validation based on configuration
            if step.step_type == 'introduction':
                if step_data.get('acknowledged') is not True:
                    errors['acknowledged'] = ["Acknowledgment is required"]
                    
            elif step.step_type == 'date_time':
                if not step_data.get('date'):
                    errors['date'] = ["Date selection is required"]
                if config.allow_time_selection and not step_data.get('time'):
                    errors['time'] = ["Time selection is required"]
                    
            elif step.step_type == 'questionnaire':
                # Validate questionnaire responses
                questionnaire_items = config.questionnaire_items.all()
                for item in questionnaire_items:
                    questionnaire = item.questionnaire
                    response_key = f'questionnaire_{questionnaire.id}'
                    if questionnaire.is_required and not step_data.get(response_key):
                        errors[response_key] = [f"{questionnaire.name} is required"]
                        
            elif step.step_type == 'package_selection':
                selected = step_data.get('selected_packages', [])
                if config.min_selection and len(selected) < config.min_selection:
                    errors['selected_packages'] = [f"Select at least {config.min_selection} package(s)"]
                if config.max_selection and len(selected) > config.max_selection:
                    errors['selected_packages'] = [f"Select at most {config.max_selection} package(s)"]
                    
            elif step.step_type == 'addon_selection':
                selected = step_data.get('selected_addons', [])
                if config.min_selection and len(selected) < config.min_selection:
                    errors['selected_addons'] = [f"Select at least {config.min_selection} addon(s)"]
                if config.max_selection and len(selected) > config.max_selection:
                    errors['selected_addons'] = [f"Select at most {config.max_selection} addon(s)"]
                    
            elif step.step_type == 'contact_info':
                if config.require_full_name and not step_data.get('full_name'):
                    errors['full_name'] = ["Full name is required"]
                if config.require_email and not step_data.get('email'):
                    errors['email'] = ["Email is required"]
                if config.require_phone and not step_data.get('phone'):
                    errors['phone'] = ["Phone number is required"]
                    
            elif step.step_type == 'payment_info':
                if not step_data.get('payment_method'):
                    errors['payment_method'] = ["Payment method is required"]
        
        return errors