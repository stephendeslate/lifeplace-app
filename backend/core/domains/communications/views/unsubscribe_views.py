import logging

from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

logger = logging.getLogger(__name__)


class UnsubscribeRateThrottle(AnonRateThrottle):
    """Rate limiting for unsubscribe endpoint to prevent abuse"""

    rate = "10/hour"  # 10 requests per hour per IP


@api_view(["GET", "POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([UnsubscribeRateThrottle])
def email_unsubscribe(request, token_id):
    """
    Public endpoint for one-click email unsubscribe (CAN-SPAM Compliance).

    GET: Display unsubscribe confirmation page
    POST: Process the unsubscribe action

    Args:
        token_id: UUID of the unsubscribe token

    Returns:
        JSON response with success/error message
    """

    from ..models import EmailUnsubscribeToken

    try:
        token = EmailUnsubscribeToken.objects.select_related("user").get(id=token_id)
    except EmailUnsubscribeToken.DoesNotExist:
        return Response(
            {"error": "Invalid or expired unsubscribe link", "success": False}, status=status.HTTP_404_NOT_FOUND
        )

    # Check if token is valid
    if not token.is_valid():
        if token.is_used:
            return Response(
                {"message": "You have already unsubscribed", "success": True, "already_unsubscribed": True},
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "This unsubscribe link has expired. Please contact support.", "success": False},
                status=status.HTTP_410_GONE,
            )

    if request.method == "GET":
        # Return confirmation info
        return Response(
            {
                "message": "Confirm unsubscribe",
                "email": token.user.email,
                "category": token.category,
                "category_display": dict(EmailUnsubscribeToken.CATEGORY_CHOICES).get(token.category, token.category),
                "success": True,
            }
        )

    # POST: Process unsubscribe
    if token.mark_used():
        logger.info(f"User {token.user.email} successfully unsubscribed from {token.category} emails")

        return Response(
            {
                "message": f"You have been successfully unsubscribed from {token.get_category_display()} emails",
                "email": token.user.email,
                "category": token.category,
                "success": True,
            }
        )
    else:
        return Response(
            {"error": "Unable to process unsubscribe request. Please try again.", "success": False},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
