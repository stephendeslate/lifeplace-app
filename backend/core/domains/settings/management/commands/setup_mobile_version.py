# backend/core/domains/settings/management/commands/setup_mobile_version.py

from django.core.management.base import BaseCommand
from core.domains.settings.models import MobileAppVersion


class Command(BaseCommand):
    help = 'Set up initial mobile app version configuration for iOS and Android'

    def add_arguments(self, parser):
        parser.add_argument(
            '--ios-version',
            type=str,
            default='1.0.0',
            help='Initial iOS version (default: 1.0.0)',
        )
        parser.add_argument(
            '--android-version',
            type=str,
            default='1.0.0',
            help='Initial Android version (default: 1.0.0)',
        )
        parser.add_argument(
            '--ios-store-url',
            type=str,
            default='',
            help='iOS App Store URL',
        )
        parser.add_argument(
            '--android-store-url',
            type=str,
            default='',
            help='Android Play Store URL',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-creation even if configurations already exist',
        )

    def handle(self, *args, **options):
        ios_version = options['ios_version']
        android_version = options['android_version']
        ios_store_url = options['ios_store_url']
        android_store_url = options['android_store_url']
        force = options['force']

        self.stdout.write(self.style.NOTICE('Setting up mobile app version configurations...'))

        # Deactivate existing active configs if force is True
        if force:
            MobileAppVersion.objects.filter(is_active=True).update(is_active=False)
            self.stdout.write(self.style.WARNING('Deactivated existing configurations'))

        # Create iOS configuration
        ios_exists = MobileAppVersion.objects.filter(platform='ios', is_active=True).exists()
        if not ios_exists or force:
            MobileAppVersion.objects.create(
                platform='ios',
                minimum_required_version=ios_version,
                recommended_version=ios_version,
                latest_version=ios_version,
                ios_store_url=ios_store_url,
                android_store_url='',
                update_title='Update Available',
                update_message='A new version of LifePlace is available with improvements and bug fixes.',
                force_title='Update Required',
                force_message='Please update to the latest version to continue using LifePlace.',
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS(f'Created iOS configuration: v{ios_version}'))
        else:
            self.stdout.write(self.style.WARNING('iOS configuration already exists (use --force to recreate)'))

        # Create Android configuration
        android_exists = MobileAppVersion.objects.filter(platform='android', is_active=True).exists()
        if not android_exists or force:
            MobileAppVersion.objects.create(
                platform='android',
                minimum_required_version=android_version,
                recommended_version=android_version,
                latest_version=android_version,
                ios_store_url='',
                android_store_url=android_store_url,
                update_title='Update Available',
                update_message='A new version of LifePlace is available with improvements and bug fixes.',
                force_title='Update Required',
                force_message='Please update to the latest version to continue using LifePlace.',
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS(f'Created Android configuration: v{android_version}'))
        else:
            self.stdout.write(self.style.WARNING('Android configuration already exists (use --force to recreate)'))

        self.stdout.write(self.style.NOTICE('\nMobile version configurations:'))
        for config in MobileAppVersion.objects.filter(is_active=True):
            self.stdout.write(f'  {config.get_platform_display()}: v{config.latest_version}')

        self.stdout.write(self.style.SUCCESS('\nMobile app version setup completed!'))
        self.stdout.write(self.style.WARNING('\nNext steps:'))
        self.stdout.write('  1. Update store URLs in Django admin')
        self.stdout.write('  2. Configure feature flags if needed')
        self.stdout.write('  3. Test version check endpoint: GET /api/mobile/version/?platform=ios&current_version=1.0.0')
