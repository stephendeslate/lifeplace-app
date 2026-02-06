# backend/core/infrastructure/views.py
"""
Infrastructure API views.
- DORA metrics
- Deployment history
- Deploy recording endpoint (for CI/CD)
"""
import logging
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAdminUser, AllowAny
from rest_framework.response import Response
from django.utils import timezone

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def dora_metrics(request):
    """
    Get DORA metrics report.

    Query params:
        - days: Number of days to analyze (default: 30)
        - service: Filter by service (backend, admin-crm, client-portal)
    """
    from .services import DORAMetricsService

    days = int(request.query_params.get('days', 30))
    service = request.query_params.get('service', None)

    report = DORAMetricsService.full_report(days=days, service=service)
    return Response(report)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def deployment_history(request):
    """
    Get deployment history.

    Query params:
        - limit: Max results (default: 50)
        - service: Filter by service
        - environment: Filter by environment (default: production)
    """
    from .models import Deployment

    limit = int(request.query_params.get('limit', 50))
    service = request.query_params.get('service')
    environment = request.query_params.get('environment', 'production')

    qs = Deployment.objects.filter(environment=environment)
    if service:
        qs = qs.filter(service=service)

    deployments = qs[:limit]

    data = [
        {
            'id': str(d.id),
            'git_sha': d.git_sha,
            'git_sha_short': d.git_sha_short,
            'commit_message': d.commit_message,
            'service': d.service,
            'environment': d.environment,
            'status': d.status,
            'triggered_by': d.triggered_by,
            'deploy_duration_seconds': d.deploy_duration_seconds,
            'lead_time_seconds': d.lead_time_seconds,
            'caused_incident': d.caused_incident,
            'github_run_url': d.github_run_url,
            'created_at': d.created_at.isoformat(),
        }
        for d in deployments
    ]

    return Response(data)


@api_view(['POST'])
@authentication_classes([])  # No JWT auth - uses deploy secret
@permission_classes([AllowAny])
def record_deployment_api(request):
    """
    Record a deployment from CI/CD pipeline.
    Secured by X-Deploy-Secret header (not JWT).
    """
    from .models import Deployment

    # Verify deploy secret
    deploy_secret = getattr(settings, 'DEPLOY_SECRET', None) or ''
    provided_secret = request.headers.get('X-Deploy-Secret', '')

    if not deploy_secret or provided_secret != deploy_secret:
        return Response(
            {'error': 'Invalid deploy secret'},
            status=status.HTTP_403_FORBIDDEN,
        )

    data = request.data
    try:
        # Parse timestamps
        commit_ts = None
        if data.get('commit_timestamp'):
            try:
                commit_ts = timezone.datetime.fromisoformat(
                    data['commit_timestamp'].replace('Z', '+00:00')
                )
            except (ValueError, AttributeError):
                pass

        deploy_started = None
        if data.get('deploy_started_at'):
            try:
                deploy_started = timezone.datetime.fromisoformat(
                    data['deploy_started_at'].replace('Z', '+00:00')
                )
            except (ValueError, AttributeError):
                pass

        deployment = Deployment.objects.create(
            git_sha=data.get('git_sha', ''),
            commit_message=data.get('commit_message', '')[:500],
            commit_timestamp=commit_ts,
            service=data.get('service', 'backend'),
            environment=data.get('environment', 'production'),
            github_run_id=data.get('github_run_id', ''),
            github_run_url=data.get('github_run_url', ''),
            triggered_by=data.get('triggered_by', 'push'),
            deploy_started_at=deploy_started,
            deploy_finished_at=timezone.now(),
            status=data.get('status', 'SUCCESS'),
        )

        logger.info(
            f"Recorded deployment: {deployment.service} {deployment.git_sha_short} "
            f"({deployment.status})"
        )

        return Response(
            {'id': str(deployment.id), 'status': 'recorded'},
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        logger.error(f"Failed to record deployment: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST,
        )
