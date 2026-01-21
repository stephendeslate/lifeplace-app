# backend/core/domains/vip/views.py
import logging

from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from core.utils.permissions import IsAdmin, IsClient, IsAdminOrClient

from .models import (
    VIPSettings,
    VIPTier,
    VIPBenefit,
    ClientVIPStatus,
    VIPPointTransaction,
    VIPRewardRedemption,
    VIPTierHistory,
)
from .serializers import (
    VIPSettingsSerializer,
    VIPTierSerializer,
    VIPTierListSerializer,
    VIPBenefitSerializer,
    ClientVIPStatusSerializer,
    ClientVIPStatusListSerializer,
    VIPPointTransactionSerializer,
    VIPRewardRedemptionSerializer,
    VIPTierHistorySerializer,
    ClientVIPStatusPublicSerializer,
    VIPBenefitPublicSerializer,
    AssignTierSerializer,
    AwardPointsSerializer,
    AdjustPointsSerializer,
    RedeemBenefitSerializer,
)
from .services import (
    VIPService,
    VIPPointsService,
    VIPRedemptionService,
)

logger = logging.getLogger(__name__)


class VIPSettingsViewSet(viewsets.ViewSet):
    """
    ViewSet for VIP program settings (singleton).
    Admin-only access.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def list(self, request):
        """Get VIP settings."""
        settings = VIPSettings.get_settings()
        serializer = VIPSettingsSerializer(settings)
        return Response(serializer.data)

    def create(self, request):
        """Update VIP settings (treated as create/update for singleton)."""
        settings = VIPSettings.get_settings()
        serializer = VIPSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=False, methods=['put', 'patch'])
    def update_settings(self, request):
        """Update VIP settings."""
        settings = VIPSettings.get_settings()
        serializer = VIPSettingsSerializer(settings, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class VIPTierViewSet(viewsets.ModelViewSet):
    """ViewSet for VIP tiers. Admin-only access."""
    queryset = VIPTier.objects.all().order_by('level')
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action == 'list':
            return VIPTierSerializer
        return VIPTierSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active tiers for dropdowns."""
        tiers = VIPTier.objects.filter(is_active=True).order_by('level')
        serializer = VIPTierListSerializer(tiers, many=True)
        return Response(serializer.data)


class VIPBenefitViewSet(viewsets.ModelViewSet):
    """ViewSet for VIP benefits. Admin-only access."""
    queryset = VIPBenefit.objects.all().select_related('tier')
    serializer_class = VIPBenefitSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by tier
        tier_id = self.request.query_params.get('tier')
        if tier_id:
            queryset = queryset.filter(tier_id=tier_id)

        # Filter by benefit type
        benefit_type = self.request.query_params.get('benefit_type')
        if benefit_type:
            queryset = queryset.filter(benefit_type=benefit_type)

        # Filter by application mode
        application_mode = self.request.query_params.get('application_mode')
        if application_mode:
            queryset = queryset.filter(application_mode=application_mode)

        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')

        return queryset.order_by('tier__level', 'benefit_type')

    @action(detail=False, methods=['get'])
    def benefit_types(self, request):
        """Get available benefit types for forms."""
        return Response([
            {'value': choice[0], 'label': choice[1]}
            for choice in VIPBenefit.BENEFIT_TYPE_CHOICES
        ])


class ClientVIPStatusViewSet(viewsets.ModelViewSet):
    """ViewSet for client VIP statuses. Admin-only access."""
    queryset = ClientVIPStatus.objects.all().select_related('client', 'current_tier', 'assigned_by')
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_serializer_class(self):
        if self.action == 'list':
            return ClientVIPStatusListSerializer
        return ClientVIPStatusSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by tier
        tier_id = self.request.query_params.get('tier')
        if tier_id:
            queryset = queryset.filter(current_tier_id=tier_id)

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Search by client email or name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                client__email__icontains=search
            ) | queryset.filter(
                client__first_name__icontains=search
            ) | queryset.filter(
                client__last_name__icontains=search
            )

        return queryset.order_by('-created_at')

    @action(detail=True, methods=['post'])
    def assign_tier(self, request, pk=None):
        """Manually assign a tier to a client."""
        client_status = self.get_object()
        serializer = AssignTierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        tier = get_object_or_404(VIPTier, id=serializer.validated_data['tier_id'])
        reason = serializer.validated_data.get('reason', '')

        updated_status = VIPService.assign_tier_manually(
            client=client_status.client,
            tier=tier,
            assigned_by=request.user,
            reason=reason
        )

        return Response(ClientVIPStatusSerializer(updated_status).data)

    @action(detail=True, methods=['post'])
    def award_points(self, request, pk=None):
        """Award bonus points to a client."""
        client_status = self.get_object()
        serializer = AwardPointsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        transaction = VIPPointsService.award_bonus_points(
            client=client_status.client,
            points=serializer.validated_data['points'],
            description=serializer.validated_data['description'],
            performed_by=request.user
        )

        # Refresh client status
        client_status.refresh_from_db()
        return Response({
            'transaction': VIPPointTransactionSerializer(transaction).data,
            'new_balance': client_status.points_balance,
        })

    @action(detail=True, methods=['post'])
    def adjust_points(self, request, pk=None):
        """Adjust points (can be negative)."""
        client_status = self.get_object()
        serializer = AdjustPointsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        transaction = VIPPointsService.adjust_points(
            client=client_status.client,
            points=serializer.validated_data['points'],
            description=serializer.validated_data['description'],
            performed_by=request.user
        )

        client_status.refresh_from_db()
        return Response({
            'transaction': VIPPointTransactionSerializer(transaction).data,
            'new_balance': client_status.points_balance,
        })

    @action(detail=True, methods=['get'])
    def tier_history(self, request, pk=None):
        """Get tier change history for a client."""
        client_status = self.get_object()
        history = VIPTierHistory.objects.filter(
            client_vip_status=client_status
        ).select_related('from_tier', 'to_tier', 'changed_by').order_by('-created_at')

        serializer = VIPTierHistorySerializer(history, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def point_transactions(self, request, pk=None):
        """Get point transaction history for a client."""
        client_status = self.get_object()
        transactions = VIPPointTransaction.objects.filter(
            client_vip_status=client_status
        ).select_related('event', 'payment', 'performed_by').order_by('-created_at')[:50]

        serializer = VIPPointTransactionSerializer(transactions, many=True)
        return Response(serializer.data)


class VIPPointTransactionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing point transactions. Admin-only access."""
    queryset = VIPPointTransaction.objects.all().select_related(
        'client_vip_status__client', 'event', 'payment', 'performed_by'
    )
    serializer_class = VIPPointTransactionSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filter by client
        client_id = self.request.query_params.get('client')
        if client_id:
            queryset = queryset.filter(client_vip_status__client_id=client_id)

        # Filter by transaction type
        transaction_type = self.request.query_params.get('transaction_type')
        if transaction_type:
            queryset = queryset.filter(transaction_type=transaction_type)

        return queryset.order_by('-created_at')


# ============================================
# Client Portal Views
# ============================================

class ClientVIPView(viewsets.ViewSet):
    """
    ViewSet for client's own VIP status.
    Used in client portal.
    """
    permission_classes = [IsAuthenticated, IsClient]

    @action(detail=False, methods=['get'])
    def my_status(self, request):
        """Get current client's VIP status."""
        settings = VIPSettings.get_settings()

        # Check visibility settings
        if not settings.show_vip_status_to_client:
            return Response({'detail': 'VIP status not available'}, status=status.HTTP_403_FORBIDDEN)

        client_status = VIPService.get_or_create_client_status(request.user)
        serializer = ClientVIPStatusPublicSerializer(client_status)

        # Filter response based on visibility settings
        data = serializer.data
        if not settings.show_points_balance_to_client:
            data.pop('points_balance', None)
        if not settings.show_tier_progress_to_client:
            data.pop('progress_to_next_tier', None)
            data.pop('next_tier', None)
        if not settings.show_available_rewards_to_client:
            data.pop('benefits', None)

        return Response(data)

    @action(detail=False, methods=['get'])
    def my_benefits(self, request):
        """Get current client's available benefits."""
        settings = VIPSettings.get_settings()

        if not settings.show_available_rewards_to_client:
            return Response({'detail': 'Benefits not available'}, status=status.HTTP_403_FORBIDDEN)

        benefits = VIPService.get_client_benefits(request.user)
        serializer = VIPBenefitPublicSerializer(benefits, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_points(self, request):
        """Get current client's point balance and recent transactions."""
        settings = VIPSettings.get_settings()

        if not settings.show_points_balance_to_client:
            return Response({'detail': 'Points not available'}, status=status.HTTP_403_FORBIDDEN)

        client_status = VIPService.get_or_create_client_status(request.user)
        transactions = VIPPointTransaction.objects.filter(
            client_vip_status=client_status
        ).order_by('-created_at')[:20]

        return Response({
            'balance': client_status.points_balance,
            'lifetime_earned': client_status.lifetime_points_earned,
            'lifetime_spent': client_status.lifetime_points_spent,
            'recent_transactions': VIPPointTransactionSerializer(transactions, many=True).data,
        })

    @action(detail=False, methods=['get'])
    def redeemable_benefits(self, request):
        """Get redeemable benefits available to the client."""
        benefits = VIPService.get_redeemable_benefits(request.user)
        serializer = VIPBenefitPublicSerializer(benefits, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def redeem_benefit(self, request):
        """Redeem a benefit for an event."""
        serializer = RedeemBenefitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        from core.domains.events.models import Event

        benefit = get_object_or_404(VIPBenefit, id=serializer.validated_data['benefit_id'])
        event = get_object_or_404(Event, id=serializer.validated_data['event_id'], client=request.user)

        try:
            redemption = VIPRedemptionService.redeem_benefit(
                client=request.user,
                benefit=benefit,
                event=event
            )
            return Response(VIPRewardRedemptionSerializer(redemption).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            logger.error(f"VIP redemption error: {e}", exc_info=True)
            return Response({'detail': 'Unable to redeem benefit. Please try again or contact support.'}, status=status.HTTP_400_BAD_REQUEST)
