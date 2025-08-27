# backend/core/domains/communications/management/commands/setup_communication_templates.py

from django.core.management.base import BaseCommand, CommandError
from core.domains.communications.config import communication_config


class Command(BaseCommand):
    help = 'Create default communication templates and validate configuration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--validate-only',
            action='store_true',
            help='Only validate configuration without creating templates',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force recreation of existing templates',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Communication Templates Setup')
        )
        self.stdout.write('=' * 50)

        # Validate configuration first
        self.stdout.write('\n1. Validating configuration...')
        is_valid, errors = communication_config.validate_configuration()
        
        if not is_valid:
            self.stdout.write(
                self.style.WARNING(f'Configuration validation found {len(errors)} issues:')
            )
            for error in errors:
                self.stdout.write(f'  - {error}')
            self.stdout.write('')
        else:
            self.stdout.write(
                self.style.SUCCESS('✓ Configuration is valid')
            )

        if options['validate_only']:
            if not is_valid:
                raise CommandError('Configuration validation failed')
            return

        # Create default templates
        self.stdout.write('\n2. Creating default templates...')
        try:
            created_count = communication_config.create_default_templates()
            
            if created_count > 0:
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Created {created_count} new templates')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('ℹ All default templates already exist')
                )
                
        except Exception as e:
            raise CommandError(f'Failed to create templates: {str(e)}')

        # Final validation after template creation
        self.stdout.write('\n3. Final validation...')
        is_valid_final, errors_final = communication_config.validate_configuration()
        
        if not is_valid_final:
            self.stdout.write(
                self.style.ERROR('Final validation failed:')
            )
            for error in errors_final:
                self.stdout.write(f'  - {error}')
            raise CommandError('Setup completed but configuration is invalid')

        self.stdout.write('\n' + '=' * 50)
        self.stdout.write(
            self.style.SUCCESS('✓ Communication templates setup completed successfully!')
        )
        
        # Show configuration summary
        self.stdout.write('\nConfiguration Summary:')
        self.stdout.write('-' * 30)
        
        template_mappings = communication_config.DEFAULT_TEMPLATES
        for key, name in template_mappings.items():
            try:
                configured_name = communication_config.get_template_name(key)
                status = '✓' if configured_name == name else f'→ {configured_name}'
                self.stdout.write(f'{key}: {name} {status}')
            except ValueError:
                self.stdout.write(f'{key}: {name} ✗ MISSING')