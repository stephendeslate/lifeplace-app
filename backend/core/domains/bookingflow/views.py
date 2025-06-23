# backend/core/domains/bookingflow/views.py
import uuid

from core.utils.permissions import IsAdmin, IsAdminOrClient
from django.db import transaction
from django.utils import timezone
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import (
    BookingFlow,
    BookingFlowAnalytics,
    BookingFlowStep,
    BookingSession,
)
from .serializers import (
    BookingCompletionSerializer,
    BookingFlowAnalyticsSerializer,
    BookingFlowCreateUpdateSerializer,
    BookingFlowDetailSerializer,
    BookingFlowSerializer,
    BookingFlowStepSerializer,
    BookingSessionCreateSerializer,
    BookingSessionSerializer,
    BookingSessionUpdateSerializer,
    PublicBookingFlowSerializer,
)
from .services import (
    AvailabilityService,
    BookingFlowService,
    BookingFlowStepService,
    BookingSessionService,
    PricingService,
)


class BookingFlowViewSet(viewsets.ModelViewSet):
    """ViewSet for managing booking flows"""
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description']
    
    def get_queryset(self):
        event_type_id = self.request.query_params.get('event_type')
        is_active = self.request.query_params.get('is_active')
        search_query = self.request.query_params.get('search')
        
        # Convert string to boolean if provided
        if is_active is not None:
            is_active = is_active.lower() == 'true'
        
        return BookingFlowService.get_all_flows(
            search_query=search_query,
            event_type_id=event_type_id,
            is_active=is_active
        )
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return BookingFlowDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return BookingFlowCreateUpdateSerializer
        return BookingFlowSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            flow = BookingFlowService.create_flow(
                serializer.validated_data,
                request.user
            )
        
        return Response(
            BookingFlowDetailSerializer(flow).data,
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            flow = BookingFlowService.update_flow(
                instance.id,
                serializer.validated_data,
                request.user
            )
        
        return Response(BookingFlowDetailSerializer(flow).data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        with transaction.atomic():
            BookingFlowService.delete_flow(instance.id, request.user)
        
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active booking flows"""
        active_flows = BookingFlowService.get_all_flows(is_active=True)
        page = self.paginate_queryset(active_flows)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(active_flows, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Create a duplicate of a booking flow"""
        new_name = request.data.get('name')
        if not new_name:
            return Response(
                {"detail": "New name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                new_flow = BookingFlowService.duplicate_flow(pk, new_name, request.user)
            
            return Response(
                BookingFlowDetailSerializer(new_flow).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def steps(self, request, pk=None):
        """Get all steps for a booking flow"""
        steps = BookingFlowStepService.get_steps_for_flow(pk)
        serializer = BookingFlowStepSerializer(steps, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        """Get analytics for a booking flow"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timezone.timedelta(days=days)
        
        analytics = BookingFlowAnalytics.objects.filter(
            booking_flow_id=pk,
            date__gte=start_date
        ).order_by('-date')
        
        serializer = BookingFlowAnalyticsSerializer(analytics, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def sessions(self, request, pk=None):
        """Get sessions for a booking flow"""
        sessions = BookingSession.objects.filter(
            booking_flow_id=pk
        ).order_by('-created_at')
        
        # Apply filters
        is_completed = request.query_params.get('is_completed')
        if is_completed is not None:
            is_completed = is_completed.lower() == 'true'
            sessions = sessions.filter(is_completed=is_completed)
        
        page = self.paginate_queryset(sessions)
        if page is not None:
            serializer = BookingSessionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = BookingSessionSerializer(sessions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def test_mode(self, request, pk=None):
        """Toggle test mode for a booking flow"""
        instance = self.get_object()
        instance.is_test_mode = not instance.is_test_mode
        instance.save()
        
        return Response(
            {"is_test_mode": instance.is_test_mode},
            status=status.HTTP_200_OK
        )


class BookingFlowStepViewSet(viewsets.ModelViewSet):
    """ViewSet for managing booking flow steps"""
    serializer_class = BookingFlowStepSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        flow_id = self.request.query_params.get('flow_id')
        if flow_id:
            return BookingFlowStepService.get_steps_for_flow(flow_id)
        return BookingFlowStep.objects.all().order_by('booking_flow', 'order')
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract flow ID
        flow_id = serializer.validated_data.pop('booking_flow').id
        
        try:
            with transaction.atomic():
                step = BookingFlowStepService.create_step(
                    flow_id,
                    serializer.validated_data,
                    request.user
                )
            
            return Response(
                self.get_serializer(step).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        # Remove booking_flow from validated_data if present (shouldn't change)
        validated_data = serializer.validated_data.copy()
        validated_data.pop('booking_flow', None)
        
        try:
            with transaction.atomic():
                step = BookingFlowStepService.update_step(
                    instance.id,
                    validated_data,
                    request.user
                )
            
            return Response(self.get_serializer(step).data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        
        try:
            with transaction.atomic():
                BookingFlowStepService.delete_step(instance.id, request.user)
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder steps within a booking flow"""
        flow_id = request.data.get('flow_id')
        order_mapping = request.data.get('order_mapping', {})
        
        if not flow_id or not order_mapping:
            return Response(
                {"detail": "flow_id and order_mapping are required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                steps = BookingFlowStepService.reorder_steps(
                    flow_id,
                    order_mapping,
                    request.user
                )
            
            serializer = self.get_serializer(steps, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class PublicBookingFlowViewSet(viewsets.ReadOnlyModelViewSet):
    """Public ViewSet for booking flows (used by clients)"""
    serializer_class = PublicBookingFlowSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        return BookingFlow.objects.filter(is_active=True).select_related('event_type')
    
    @action(detail=True, methods=['get'])
    def check_availability(self, request, pk=None):
        """Check availability for a specific date"""
        booking_flow = self.get_object()
        event_date = request.query_params.get('date')
        duration_hours = request.query_params.get('duration_hours')
        
        if not event_date:
            return Response(
                {"detail": "date parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from datetime import datetime
            event_date_obj = datetime.fromisoformat(event_date.replace('Z', '+00:00')).date()
            
            is_available = AvailabilityService.check_date_availability(
                booking_flow,
                event_date_obj,
                int(duration_hours) if duration_hours else None
            )
            
            time_slots = AvailabilityService.get_available_time_slots(
                booking_flow,
                event_date_obj
            )
            
            return Response({
                "available": is_available,
                "time_slots": time_slots
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def calculate_pricing(self, request, pk=None):
        """Calculate pricing for selected packages/addons"""
        booking_flow = self.get_object()
        packages = request.data.get('packages', [])
        addons = request.data.get('addons', [])
        booking_data = request.data.get('booking_data', {})
        discount_code = request.data.get('discount_code')
        
        try:
            total = 0
            package_prices = []
            addon_prices = []
            
            # Calculate package prices
            for package_id in packages:
                price = PricingService.calculate_package_price(package_id, booking_data)
                package_prices.append({"id": package_id, "price": str(price)})
                total += price
            
            # Calculate addon prices
            for addon_id in addons:
                price = PricingService.calculate_package_price(addon_id, booking_data)
                addon_prices.append({"id": addon_id, "price": str(price)})
                total += price
            
            # Apply discount if provided
            discount_amount = 0
            discount_info = None
            if discount_code:
                try:
                    discount_amount, discount = PricingService.apply_discount(
                        total, discount_code, booking_data
                    )
                    discount_info = {
                        "code": discount.code,
                        "name": discount.name,
                        "type": discount.discount_type,
                        "amount": str(discount_amount)
                    }
                except Exception:
                    pass  # Ignore discount errors in pricing calculation
            
            final_total = max(total - discount_amount, 0)
            
            return Response({
                "subtotal": str(total),
                "discount_amount": str(discount_amount),
                "total": str(final_total),
                "package_prices": package_prices,
                "addon_prices": addon_prices,
                "discount": discount_info
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class BookingSessionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing booking sessions"""
    serializer_class = BookingSessionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see their own sessions, admins can see all
        if self.request.user.role == 'ADMIN':
            return BookingSession.objects.all().order_by('-created_at')
        else:
            return BookingSession.objects.filter(
                client=self.request.user
            ).order_by('-created_at')
    
    def create(self, request, *args, **kwargs):
        """Create a new booking session"""
        serializer = BookingSessionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            session = BookingSessionService.create_session(
                flow_id=serializer.validated_data['booking_flow_id'],
                client=request.user if request.user.is_authenticated else None,
                client_ip=serializer.validated_data.get('client_ip'),
                user_agent=serializer.validated_data.get('user_agent'),
                referrer_url=serializer.validated_data.get('referrer_url')
            )
            
            return Response(
                BookingSessionSerializer(session).data,
                status=status.HTTP_201_CREATED
            )
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'])
    def by_session_id(self, request):
        """Get session by session ID"""
        session_id = request.query_params.get('session_id')
        if not session_id:
            return Response(
                {"detail": "session_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = BookingSessionService.get_session_by_id(session_id)
            
            # Check permissions
            if (session.client != request.user and 
                request.user.role != 'ADMIN' and 
                not request.user.is_staff):
                return Response(
                    {"detail": "Permission denied"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = self.get_serializer(session)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def update_step(self, request):
        """Update booking session data for a specific step"""
        serializer = BookingSessionUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        session_id = request.data.get('session_id')
        if not session_id:
            return Response(
                {"detail": "session_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = BookingSessionService.update_session_data(
                session_id=session_id,
                step_id=serializer.validated_data['step_id'],
                step_data=serializer.validated_data['step_data'],
                mark_completed=serializer.validated_data['mark_completed']
            )
            
            return Response(BookingSessionSerializer(session).data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def complete_booking(self, request):
        """Complete a booking session"""
        serializer = BookingCompletionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            with transaction.atomic():
                session = BookingSessionService.complete_booking(
                    session_id=serializer.validated_data['session_id'],
                    final_data=serializer.validated_data.get('final_data'),
                    create_event=serializer.validated_data['create_event'],
                    send_confirmation=serializer.validated_data['send_confirmation']
                )
            
            return Response({
                "session": BookingSessionSerializer(session).data,
                "event_id": session.created_event.id if session.created_event else None,
                "message": "Booking completed successfully"
            })
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'])
    def abandon_session(self, request):
        """Mark a session as abandoned"""
        session_id = request.data.get('session_id')
        reason = request.data.get('reason')
        
        if not session_id:
            return Response(
                {"detail": "session_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            session = BookingSessionService.abandon_session(session_id, reason)
            return Response(BookingSessionSerializer(session).data)
        except Exception as e:
            return Response(
                {"detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class BookingFlowAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for booking flow analytics"""
    serializer_class = BookingFlowAnalyticsSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        flow_id = self.request.query_params.get('flow_id')
        days = int(self.request.query_params.get('days', 30))
        start_date = timezone.now().date() - timezone.timedelta(days=days)
        
        queryset = BookingFlowAnalytics.objects.filter(date__gte=start_date)
        
        if flow_id:
            queryset = queryset.filter(booking_flow_id=flow_id)
        
        return queryset.order_by('-date')
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get analytics summary across all flows"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timezone.timedelta(days=days)
        
        analytics = BookingFlowAnalytics.objects.filter(date__gte=start_date)
        
        total_sessions = sum(a.total_sessions for a in analytics)
        total_bookings = sum(a.completed_bookings for a in analytics)
        total_abandoned = sum(a.abandoned_sessions for a in analytics)
        total_revenue = sum(a.total_revenue for a in analytics)
        
        conversion_rate = (total_bookings / total_sessions * 100) if total_sessions > 0 else 0
        average_booking_value = (total_revenue / total_bookings) if total_bookings > 0 else 0
        
        return Response({
            "period_days": days,
            "total_sessions": total_sessions,
            "completed_bookings": total_bookings,
            "abandoned_sessions": total_abandoned,
            "conversion_rate": round(conversion_rate, 2),
            "total_revenue": str(total_revenue),
            "average_booking_value": str(average_booking_value)
        })