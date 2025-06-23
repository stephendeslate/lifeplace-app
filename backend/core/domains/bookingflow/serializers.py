# backend/core/domains/bookingflow/serializers.py
from core.domains.events.serializers import EventTypeSerializer
from core.domains.products.serializers import ProductOptionSerializer
from core.domains.questionnaires.serializers import QuestionnaireSerializer
from core.domains.workflows.basic_serializers import WorkflowTemplateSerializer
from rest_framework import serializers

from .models import (
    AddonConfiguration,
    AddonItem,
    BookingFlow,
    ConfirmationConfiguration,
    DateConfiguration,
    IntroConfiguration,
    PackageConfiguration,
    PackageItem,
    PaymentConfiguration,
    QuestionnaireConfiguration,
    QuestionnaireItem,
    SummaryConfiguration,
)


# Base configuration serializers
class IntroConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = IntroConfiguration
        fields = [
            'id', 'title', 'description', 'show_event_details',
            'is_required', 'is_visible', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class DateConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DateConfiguration
        fields = [
            'id', 'title', 'description', 'min_days_in_future', 'max_days_in_future',
            'allow_time_selection', 'buffer_before_event', 'buffer_after_event',
            'allow_multi_day', 'is_required', 'is_visible', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class QuestionnaireItemSerializer(serializers.ModelSerializer):
    questionnaire_details = QuestionnaireSerializer(source='questionnaire', read_only=True)
    
    class Meta:
        model = QuestionnaireItem
        fields = [
            'id', 'questionnaire', 'questionnaire_details', 'order',
            'is_required', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class QuestionnaireConfigurationSerializer(serializers.ModelSerializer):
    questionnaire_items = QuestionnaireItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = QuestionnaireConfiguration
        fields = [
            'id', 'title', 'description', 'questionnaire_items',
            'is_required', 'is_visible', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'questionnaire_items']

class PackageItemSerializer(serializers.ModelSerializer):
    product_details = ProductOptionSerializer(source='product', read_only=True)
    
    class Meta:
        model = PackageItem
        fields = [
            'id', 'product', 'product_details', 'order', 'is_highlighted',
            'custom_price', 'custom_description', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class PackageConfigurationSerializer(serializers.ModelSerializer):
    package_items = PackageItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = PackageConfiguration
        fields = [
            'id', 'title', 'description', 'min_selection', 'max_selection',
            'selection_type', 'package_items', 'is_required', 'is_visible',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'package_items']

class AddonItemSerializer(serializers.ModelSerializer):
    product_details = ProductOptionSerializer(source='product', read_only=True)
    
    class Meta:
        model = AddonItem
        fields = [
            'id', 'product', 'product_details', 'order', 'is_highlighted',
            'custom_price', 'custom_description', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class AddonConfigurationSerializer(serializers.ModelSerializer):
    addon_items = AddonItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = AddonConfiguration
        fields = [
            'id', 'title', 'description', 'min_selection', 'max_selection',
            'addon_items', 'is_required', 'is_visible', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'addon_items']

class SummaryConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = SummaryConfiguration
        fields = [
            'id', 'title', 'description', 'show_date', 'show_packages',
            'show_addons', 'show_questionnaire', 'show_total', 'is_required',
            'is_visible', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class PaymentConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentConfiguration
        fields = [
            'id', 'title', 'description', 'require_deposit', 'deposit_percentage',
            'accept_credit_card', 'accept_paypal', 'accept_bank_transfer',
            'payment_instructions', 'is_required', 'is_visible', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class ConfirmationConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfirmationConfiguration
        fields = [
            'id', 'title', 'description', 'success_message', 'send_email',
            'email_template', 'show_summary', 'is_visible', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

# Booking Flow serializers
class BookingFlowSerializer(serializers.ModelSerializer):
    event_type_details = EventTypeSerializer(source='event_type', read_only=True)
    workflow_template_details = WorkflowTemplateSerializer(source='workflow_template', read_only=True)
    
    class Meta:
        model = BookingFlow
        fields = [
            'id', 'name', 'description', 'event_type', 'event_type_details',
            'workflow_template', 'workflow_template_details', 'is_active', 
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class BookingFlowDetailSerializer(serializers.ModelSerializer):
    event_type_details = EventTypeSerializer(source='event_type', read_only=True)
    workflow_template_details = WorkflowTemplateSerializer(source='workflow_template', read_only=True)
    intro_config = IntroConfigurationSerializer(read_only=True)
    date_config = DateConfigurationSerializer(read_only=True)
    questionnaire_config = QuestionnaireConfigurationSerializer(read_only=True)
    package_config = PackageConfigurationSerializer(read_only=True)
    addon_config = AddonConfigurationSerializer(read_only=True)
    summary_config = SummaryConfigurationSerializer(read_only=True)
    payment_config = PaymentConfigurationSerializer(read_only=True)
    confirmation_config = ConfirmationConfigurationSerializer(read_only=True)
    
    class Meta:
        model = BookingFlow
        fields = [
            'id', 'name', 'description', 'event_type', 'event_type_details',
            'workflow_template', 'workflow_template_details', 'is_active', 
            'intro_config', 'date_config', 'questionnaire_config',
            'package_config', 'addon_config', 'summary_config', 'payment_config',
            'confirmation_config', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']