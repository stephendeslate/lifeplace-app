# backend/core/domains/communications/config.py

import logging
from django.conf import settings
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class CommunicationConfig:
    """Configuration management for communications domain"""
    
    # Default template mappings
    DEFAULT_TEMPLATES = {
        'EMAIL_LAYOUT': 'Manual Email Layout',
        'SMS_LAYOUT': 'Manual SMS Layout',
        'NOTIFICATION_EMAIL': 'System Notification Email',
        'NOTIFICATION_SMS': 'System Notification SMS',
        'DIGEST_EMAIL': 'Notification Digest Email',
    }
    
    # Provider configuration
    PROVIDER_CONFIG = {
        'MOCK': {
            'class': 'communications.services.MockProvider',
            'enabled': True,
            'fallback_order': 1
        },
        'BREVO': {
            'class': 'communications.services.BrevoProvider',
            'enabled': True,
            'fallback_order': 2,
            'api_key_setting': 'BREVO_API_KEY'
        }
    }
    
    # Rate limiting configuration
    RATE_LIMITS = {
        'NOTIFICATIONS_PER_MINUTE': 60,
        'BULK_SEND_LIMIT': 100,
        'TEMPLATE_PREVIEW_PER_MINUTE': 30
    }
    
    # Cache configuration
    CACHE_TIMEOUTS = {
        'TEMPLATE_LIST': 1800,  # 30 minutes
        'TEMPLATE_DETAIL': 1800,
        'TEMPLATE_PREVIEW': 3600,  # 1 hour
        'ANALYTICS': 300,  # 5 minutes
        'VARIABLE_SCHEMAS': 14400,  # 4 hours
    }
    
    @classmethod
    def get_template_name(cls, template_key: str) -> str:
        """Get template name from configuration"""
        # Check for custom settings override
        custom_templates = getattr(settings, 'COMMUNICATION_TEMPLATES', {})
        
        if template_key in custom_templates:
            template_name = custom_templates[template_key]
            logger.debug(f"Using custom template mapping: {template_key} -> {template_name}")
            return template_name
        
        if template_key in cls.DEFAULT_TEMPLATES:
            template_name = cls.DEFAULT_TEMPLATES[template_key]
            logger.debug(f"Using default template mapping: {template_key} -> {template_name}")
            return template_name
        
        logger.warning(f"Template key {template_key} not found in configuration")
        raise ValueError(f"Template configuration not found for key: {template_key}")
    
    @classmethod
    def get_provider_config(cls, provider_name: str) -> Optional[Dict]:
        """Get provider configuration"""
        custom_providers = getattr(settings, 'COMMUNICATION_PROVIDERS', {})
        
        if provider_name in custom_providers:
            return custom_providers[provider_name]
        
        return cls.PROVIDER_CONFIG.get(provider_name)
    
    @classmethod
    def get_rate_limit(cls, limit_key: str) -> int:
        """Get rate limit from configuration"""
        custom_limits = getattr(settings, 'COMMUNICATION_RATE_LIMITS', {})
        
        if limit_key in custom_limits:
            return custom_limits[limit_key]
        
        return cls.RATE_LIMITS.get(limit_key, 100)  # Default fallback
    
    @classmethod
    def get_cache_timeout(cls, cache_key: str) -> int:
        """Get cache timeout from configuration"""
        custom_timeouts = getattr(settings, 'COMMUNICATION_CACHE_TIMEOUTS', {})
        
        if cache_key in custom_timeouts:
            return custom_timeouts[cache_key]
        
        return cls.CACHE_TIMEOUTS.get(cache_key, 1800)  # Default 30 minutes
    
    @classmethod
    def validate_configuration(cls) -> tuple[bool, list[str]]:
        """Validate communication configuration"""
        errors = []
        
        # Check if required templates exist
        from .models import CommunicationTemplate
        
        for key, template_name in cls.DEFAULT_TEMPLATES.items():
            try:
                custom_name = cls.get_template_name(key)
                if not CommunicationTemplate.objects.filter(name=custom_name).exists():
                    errors.append(f"Template '{custom_name}' for key '{key}' does not exist")
            except ValueError as e:
                errors.append(str(e))
        
        # Check provider configurations
        for provider_name, config in cls.PROVIDER_CONFIG.items():
            if config.get('enabled', False):
                api_key_setting = config.get('api_key_setting')
                if api_key_setting and not getattr(settings, api_key_setting, None):
                    # Only warn about missing API keys in development
                    if not getattr(settings, 'DEBUG', True):
                        errors.append(f"Missing required setting: {api_key_setting} for provider {provider_name}")
                    else:
                        logger.warning(f"Development mode: Missing API key {api_key_setting} for provider {provider_name}")
        
        return len(errors) == 0, errors
    
    @classmethod
    def create_default_templates(cls):
        """Create default templates if they don't exist"""
        from .models import CommunicationTemplate
        
        templates_to_create = [
            {
                'name': 'Manual Email Layout',
                'channel': 'EMAIL',
                'category': 'MANUAL',
                'subject_template': '{{custom_subject|default:"Message from LifePlace"}}',
                'body_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1976d2;">{{site_name|default:"LifePlace"}}</h1>
                    </div>
                    
                    <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        {{custom_body|safe}}
                    </div>
                    
                    {% if action_url %}
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{action_url}}" style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Details
                        </a>
                    </div>
                    {% endif %}
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
                        <p>Best regards,<br>The {{site_name|default:"LifePlace"}} Team</p>
                    </div>
                </div>
                ''',
                'is_system': True,
                'variables_schema': {
                    'custom_subject': 'Custom email subject',
                    'custom_body': 'Custom email body content',
                    'action_url': 'Optional action URL',
                    'site_name': 'Site name'
                }
            },
            {
                'name': 'Manual SMS Layout',
                'channel': 'SMS',
                'category': 'MANUAL',
                'subject_template': None,
                'body_template': '{{custom_body}} - {{site_name|default:"LifePlace"}}',
                'is_system': True,
                'variables_schema': {
                    'custom_body': 'SMS message content',
                    'site_name': 'Site name'
                }
            },
            {
                'name': 'System Notification Email',
                'channel': 'EMAIL',
                'category': 'SYSTEM',
                'subject_template': '{{title}}',
                'body_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1976d2;">{{site_name|default:"LifePlace"}}</h1>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-left: 4px solid #1976d2; margin-bottom: 20px;">
                        <h2 style="margin-top: 0; color: #333;">{{title}}</h2>
                        <div style="color: #555; line-height: 1.6;">
                            {{content|safe}}
                        </div>
                    </div>
                    
                    {% if action_url %}
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{{action_url}}" style="background-color: #1976d2; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                            View Details
                        </a>
                    </div>
                    {% endif %}
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
                        <p>This is an automated notification from {{site_name|default:"LifePlace"}}.</p>
                    </div>
                </div>
                ''',
                'is_system': True,
                'variables_schema': {
                    'title': 'Notification title',
                    'content': 'Notification content',
                    'action_url': 'Optional action URL',
                    'site_name': 'Site name'
                }
            },
            {
                'name': 'System Notification SMS',
                'channel': 'SMS',
                'category': 'SYSTEM',
                'subject_template': None,
                'body_template': '{{content}} - {{site_name|default:"LifePlace"}}',
                'is_system': True,
                'variables_schema': {
                    'content': 'SMS notification content',
                    'site_name': 'Site name'
                }
            },
            {
                'name': 'Notification Digest Email',
                'channel': 'EMAIL',
                'category': 'SYSTEM',
                'subject_template': 'Your {{frequency}} Notification Digest - {{site_name}}',
                'body_template': '''
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1976d2;">{{site_name|default:"LifePlace"}}</h1>
                        <h2 style="color: #555;">Your {{frequency}} Notification Digest</h2>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <p style="margin-top: 0;">Hello {{recipient_name}},</p>
                        <p>You have <strong>{{notification_count}}</strong> unread notifications:</p>
                    </div>
                    
                    {{custom_body|safe}}
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
                        <p>To manage your notification preferences, visit your account settings.</p>
                        <p>Best regards,<br>The {{site_name|default:"LifePlace"}} Team</p>
                    </div>
                </div>
                ''',
                'is_system': True,
                'variables_schema': {
                    'frequency': 'Digest frequency (Daily, Weekly, etc.)',
                    'notification_count': 'Number of notifications',
                    'recipient_name': 'Recipient name',
                    'custom_body': 'Digest content',
                    'site_name': 'Site name'
                }
            }
        ]
        
        created_count = 0
        for template_data in templates_to_create:
            template, created = CommunicationTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults=template_data
            )
            if created:
                created_count += 1
                logger.info(f"Created default template: {template.name}")
        
        return created_count


# Configuration instance
communication_config = CommunicationConfig()