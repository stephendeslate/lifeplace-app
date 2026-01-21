# backend/core/domains/events/public_views.py
"""
Public API endpoints for client-portal contact form submissions.
Creates Lead events from inquiry form data.
"""

import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from .models import Event
from ..users.models import User

logger = logging.getLogger(__name__)


class InquiryRateThrottle(AnonRateThrottle):
    """Rate limiting for inquiry submissions to prevent spam."""
    rate = '5/hour'  # 5 submissions per hour per IP


@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([InquiryRateThrottle])
def create_inquiry(request):
    """
    Public endpoint to create a lead from contact form submission.

    Creates:
    - User account if email doesn't exist (with minimal info)
    - Event with status='LEAD' and lead_source='CLIENT_PORTAL'

    Request Body:
    {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+639123456789",  # optional
        "inquiry_type": "GENERAL",  # GENERAL, EVENT_QUESTION, PARTNERSHIP, PRICING, OTHER
        "message": "I'm interested in..."
    }

    Returns:
    - 201: Lead created successfully
    - 400: Validation error
    - 429: Rate limit exceeded
    """
    try:
        # Extract and validate required fields
        name = request.data.get('name', '').strip()
        email = request.data.get('email', '').strip().lower()
        phone = request.data.get('phone', '').strip()
        inquiry_type = request.data.get('inquiry_type', 'GENERAL').strip().upper()
        message = request.data.get('message', '').strip()

        # Validation
        errors = {}
        if not name:
            errors['name'] = 'Name is required.'
        if not email:
            errors['email'] = 'Email is required.'
        elif '@' not in email or '.' not in email:
            errors['email'] = 'Please enter a valid email address.'
        if not message:
            errors['message'] = 'Message is required.'

        # Validate inquiry type
        valid_inquiry_types = ['GENERAL', 'EVENT_QUESTION', 'PARTNERSHIP', 'PRICING', 'OTHER']
        if inquiry_type not in valid_inquiry_types:
            errors['inquiry_type'] = f'Invalid inquiry type. Must be one of: {", ".join(valid_inquiry_types)}'

        if errors:
            return Response(
                {'errors': errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Parse name into first/last
        name_parts = name.split(' ', 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        with transaction.atomic():
            # Get or create user
            user, user_created = User.objects.get_or_create(
                email=email,
                defaults={
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': 'CLIENT',
                    'is_active': True,
                }
            )

            # Update name if user exists but doesn't have a name set
            if not user_created and not user.first_name:
                user.first_name = first_name
                user.last_name = last_name
                user.save(update_fields=['first_name', 'last_name'])

            # Create the lead event
            # Set start_date to a future date (30 days from now) as a placeholder
            placeholder_date = timezone.now() + timedelta(days=30)

            event = Event.objects.create(
                client=user,
                status='LEAD',
                lead_source='CLIENT_PORTAL',
                name=f"Inquiry: {inquiry_type.title().replace('_', ' ')}",
                start_date=placeholder_date,
                preferences={
                    'inquiry': {
                        'type': inquiry_type,
                        'message': message,
                        'phone': phone,
                        'submitted_at': timezone.now().isoformat(),
                    }
                }
            )

            logger.info(
                f"Lead created from client portal: event_id={event.id}, "
                f"email={email}, inquiry_type={inquiry_type}"
            )

        return Response(
            {
                'success': True,
                'message': 'Thank you for your inquiry! We will get back to you soon.',
                'inquiry_id': str(event.id),
            },
            status=status.HTTP_201_CREATED
        )

    except Exception as e:
        logger.error(f"Error creating inquiry: {str(e)}", exc_info=True)
        return Response(
            {'error': 'An unexpected error occurred. Please try again later.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
