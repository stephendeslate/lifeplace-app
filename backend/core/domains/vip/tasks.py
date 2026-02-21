# backend/core/domains/vip/tasks.py

from celery import shared_task
from django.utils import timezone
from dateutil.relativedelta import relativedelta
import logging

logger = logging.getLogger(__name__)


@shared_task(name='vip.expire_vip_points')
def expire_vip_points():
    """
    Expire VIP points older than the configured expiry period.

    For each client with a positive points balance, finds earning transactions
    older than points_expiry_months and creates offsetting EXPIRED transactions.

    Runs weekly via Celery beat. Safe to run multiple times — already-expired
    points are tracked and won't be double-expired.
    """
    from django.db.models import Sum, Q
    from .models import VIPSettings, ClientVIPStatus, VIPPointTransaction

    settings = VIPSettings.get_settings()

    if not settings.is_program_enabled:
        logger.info("VIP program disabled, skipping point expiration")
        return 0

    if settings.points_expiry_months <= 0:
        logger.info("Point expiration disabled (points_expiry_months=0)")
        return 0

    cutoff_date = timezone.now() - relativedelta(months=settings.points_expiry_months)

    # Earning transaction types that can expire
    earning_types = ['EARNED_PAYMENT', 'EARNED_BONUS', 'EARNED_MANUAL', 'EARNED_BOOKING']

    # Find clients with positive balance who have old earning transactions
    client_statuses = ClientVIPStatus.objects.filter(
        points_balance__gt=0,
        status='ACTIVE',
    )

    expired_count = 0
    total_points_expired = 0

    for client_status in client_statuses:
        # Sum of old earning transactions
        old_earnings = VIPPointTransaction.objects.filter(
            client_vip_status=client_status,
            transaction_type__in=earning_types,
            created_at__lt=cutoff_date,
        ).aggregate(total=Sum('points'))['total'] or 0

        if old_earnings <= 0:
            continue

        # Sum of already-expired points for this client
        already_expired = VIPPointTransaction.objects.filter(
            client_vip_status=client_status,
            transaction_type='EXPIRED',
        ).aggregate(total=Sum('points'))['total'] or 0
        # already_expired is negative (points deducted)
        already_expired = abs(already_expired)

        # Points eligible for expiration = old earnings - already expired
        eligible_to_expire = old_earnings - already_expired
        if eligible_to_expire <= 0:
            continue

        # Cap at current balance (don't go negative)
        points_to_expire = min(eligible_to_expire, client_status.points_balance)
        if points_to_expire <= 0:
            continue

        # Create expiration transaction
        new_balance = client_status.points_balance - points_to_expire
        VIPPointTransaction.objects.create(
            client_vip_status=client_status,
            transaction_type='EXPIRED',
            points=-points_to_expire,
            description=f"Points expired ({settings.points_expiry_months}-month expiry policy)",
            balance_after=new_balance,
        )

        client_status.points_balance = new_balance
        client_status.save(update_fields=['points_balance', 'updated_at'])

        expired_count += 1
        total_points_expired += points_to_expire

        logger.info(
            f"Expired {points_to_expire} points for client {client_status.client.email} "
            f"(new balance: {new_balance})"
        )

    logger.info(f"Point expiration complete: {expired_count} clients, {total_points_expired} total points expired")
    return expired_count
