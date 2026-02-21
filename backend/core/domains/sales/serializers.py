# backend/core/domains/sales/serializers.py
from core.domains.contracts.serializers import ContractTemplateSerializer
from core.domains.events.serializers import EventSerializer, EventTypeSerializer
from core.domains.products.serializers import ProductOptionSerializer
from core.domains.questionnaires.serializers import QuestionnaireSerializer
from core.domains.users.serializers import UserSerializer
from rest_framework import serializers

from .models import (
    EventQuote,
    QuoteActivity,
    QuoteLineItem,
    QuoteOption,
    QuoteOptionItem,
    QuoteReminder,
    QuoteTemplate,
    QuoteTemplateProduct,
)


class QuoteTemplateProductSerializer(serializers.ModelSerializer):
    product_details = ProductOptionSerializer(source='product', read_only=True)
    
    class Meta:
        model = QuoteTemplateProduct
        fields = [
            'id', 'template', 'product', 'product_details', 
            'quantity', 'is_required', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuoteTemplateSerializer(serializers.ModelSerializer):
    event_type_name = serializers.CharField(source='event_type.name', read_only=True)
    # Fix the products relation - get the right source name
    products = serializers.SerializerMethodField()
    contract_templates = ContractTemplateSerializer(many=True, read_only=True)
    questionnaires = QuestionnaireSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuoteTemplate
        fields = [
            'id', 'name', 'introduction', 'event_type', 'event_type_name',
            'terms_and_conditions', 'is_active', 'products', 
            'contract_templates', 'questionnaires', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_products(self, obj):
        """Get the products through the through model"""
        # Use the related manager to benefit from prefetch_related if available
        if hasattr(obj, 'template_products'):
            template_products = obj.template_products.all()
        else:
            # Fallback if related name is different
            template_products = QuoteTemplateProduct.objects.filter(template=obj)
        return QuoteTemplateProductSerializer(template_products, many=True).data


class QuoteLineItemSerializer(serializers.ModelSerializer):
    # Write-only field for setting venue hours (not stored directly, used for calculation)
    venue_additional_hours = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = QuoteLineItem
        fields = [
            'id', 'quote', 'description', 'quantity', 'unit_price',
            'tax_rate', 'total', 'product', 'notes',
            # Excess hours pricing breakdown fields
            'item_type', 'base_unit_price', 'excess_hours',
            'excess_hour_price', 'excess_cost', 'venue_hours_breakdown',
            # Write-only field for recalculation
            'venue_additional_hours',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuoteOptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteOptionItem
        fields = [
            'id', 'option', 'description', 'quantity', 'unit_price',
            'total', 'product', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuoteOptionSerializer(serializers.ModelSerializer):
    items = QuoteOptionItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuoteOption
        fields = [
            'id', 'quote', 'name', 'description', 'total_price',
            'is_selected', 'items', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuoteActivitySerializer(serializers.ModelSerializer):
    action_by_name = serializers.CharField(source='action_by.get_full_name', read_only=True)
    
    class Meta:
        model = QuoteActivity
        fields = [
            'id', 'quote', 'action', 'action_by', 'action_by_name',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class QuoteReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuoteReminder
        fields = [
            'id', 'quote', 'scheduled_date', 'is_sent', 'sent_at',
            'message', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class EventQuoteSerializer(serializers.ModelSerializer):
    event_details = serializers.SerializerMethodField()
    template_details = QuoteTemplateSerializer(source='template', read_only=True)
    line_items = QuoteLineItemSerializer(many=True, read_only=True)
    options = QuoteOptionSerializer(many=True, read_only=True)
    activities = QuoteActivitySerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # Expiration calculated fields (matches contracts pattern)
    is_expired = serializers.SerializerMethodField()
    is_expiring_soon = serializers.SerializerMethodField()
    days_until_expiry = serializers.SerializerMethodField()
    expiry_urgency = serializers.SerializerMethodField()
    
    class Meta:
        model = EventQuote
        fields = [
            'id', 'event', 'event_details', 'template', 'template_details',
            'version', 'status', 'status_display', 'subtotal', 'tax_amount',
            'service_charge_amount', 'discount_amount', 'vip_discount_amount',
            'applied_vip_benefits', 'total_amount', 'valid_until', 'sent_at',
            'accepted_at', 'rejected_at', 'rejection_reason', 'notes',
            'terms_and_conditions', 'client_message', 'signature_data',
            'line_items', 'options', 'activities',
            # Expiration calculated fields
            'is_expired', 'is_expiring_soon', 'days_until_expiry', 'expiry_urgency',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'version', 'created_at', 'updated_at']
    
    def get_event_details(self, obj):
        """Get basic event details to avoid circular imports"""
        return {
            'id': obj.event.id,
            'name': obj.event.name,
            'client_name': getattr(obj.event, 'client_name',
                f"{obj.event.client.first_name} {obj.event.client.last_name}" if obj.event.client else "Unknown"),
            'client_email': obj.event.client.email if obj.event.client else None,
            'start_date': obj.event.start_date,
            'status': obj.event.status,
        }

    def get_is_expired(self, obj):
        """
        Check if quote is expired.
        Only applies to DRAFT and SENT quotes - accepted/rejected/expired quotes don't need this check.
        """
        if obj.status not in ['DRAFT', 'SENT']:
            return False
        if obj.valid_until:
            from datetime import date
            return date.today() > obj.valid_until
        return False

    def get_is_expiring_soon(self, obj):
        """
        Check if quote is expiring within 7 days.
        """
        if obj.status not in ['DRAFT', 'SENT'] or not obj.valid_until:
            return False
        from datetime import date
        days = (obj.valid_until - date.today()).days
        return 0 < days <= 7

    def get_days_until_expiry(self, obj):
        """
        Get number of days until quote expires.
        Negative values indicate already expired.
        """
        if obj.status not in ['DRAFT', 'SENT'] or not obj.valid_until:
            return None
        from datetime import date
        return (obj.valid_until - date.today()).days

    def get_expiry_urgency(self, obj):
        """
        Get expiry urgency level.
        Returns 'CRITICAL' (expired or 1 day), 'HIGH' (2-3 days), 'NORMAL' (4-7 days), or None.
        """
        if obj.status not in ['DRAFT', 'SENT'] or not obj.valid_until:
            return None
        from datetime import date
        days = (obj.valid_until - date.today()).days
        if days <= 1:
            return 'CRITICAL'
        elif days <= 3:
            return 'HIGH'
        elif days <= 7:
            return 'NORMAL'
        return None


class ClientEventQuoteSerializer(serializers.ModelSerializer):
    """
    Client-safe serializer for EventQuote that excludes admin-only fields
    and includes only necessary information for client viewing
    """
    event_details = serializers.SerializerMethodField()
    line_items = QuoteLineItemSerializer(many=True, read_only=True)
    options = QuoteOptionSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = EventQuote
        fields = [
            'id', 'event_details', 'version', 'status', 'status_display',
            'subtotal', 'tax_amount', 'service_charge_amount', 'discount_amount', 'total_amount',
            'valid_until', 'sent_at', 'accepted_at', 'rejected_at',
            'rejection_reason', 'terms_and_conditions', 'client_message',
            'notes',  # Expose notes for client to see their original message
            'line_items', 'options', 'created_at'
        ]
        read_only_fields = [
            'id', 'version', 'subtotal', 'tax_amount', 'service_charge_amount', 'discount_amount',
            'total_amount', 'sent_at', 'accepted_at', 'rejected_at',
            'notes', 'client_message',  # Make notes read-only
            'created_at'
        ]

    def get_event_details(self, obj):
        """Get basic event details for client viewing"""
        return {
            'id': obj.event.id,
            'name': obj.event.name,
            'start_date': obj.event.start_date,
            'end_date': obj.event.end_date,
            'status': obj.event.status,
        }