"""
Management command to fix gallery image URLs that were incorrectly stored
with the API server domain instead of the R2 storage domain.
"""
from django.core.management.base import BaseCommand
from django.conf import settings

from core.domains.venues.models import Venue
from core.domains.products.models import Product


class Command(BaseCommand):
    help = 'Fix gallery image URLs to use the correct R2 storage domain'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making changes',
        )
        parser.add_argument(
            '--old-domain',
            type=str,
            required=True,
            help='Old domain to replace (e.g., lifeplace-api.fly.dev)',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        old_domain = options['old_domain']

        # Get the new R2 domain from settings
        new_domain = getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None)
        if not new_domain:
            self.stderr.write(self.style.ERROR(
                'AWS_S3_CUSTOM_DOMAIN is not set. This command should be run in production.'
            ))
            return

        self.stdout.write(f"Migrating URLs from '{old_domain}' to '{new_domain}'")
        if dry_run:
            self.stdout.write(self.style.WARNING('DRY RUN - No changes will be made'))

        # Fix venue gallery images
        self._fix_model_gallery(
            Venue, 'gallery_images', old_domain, new_domain, dry_run
        )

        # Fix product gallery images
        self._fix_model_gallery(
            Product, 'gallery_images', old_domain, new_domain, dry_run
        )

        self.stdout.write(self.style.SUCCESS('Done!'))

    def _fix_model_gallery(self, model, field_name, old_domain, new_domain, dry_run):
        model_name = model.__name__
        self.stdout.write(f"\nProcessing {model_name}...")

        updated_count = 0
        for obj in model.objects.all():
            gallery = getattr(obj, field_name, [])
            if not gallery:
                continue

            new_gallery = []
            changed = False

            for url in gallery:
                if old_domain in url:
                    # Replace the old domain with new R2 domain
                    # Handle both http:// and https://
                    new_url = url.replace(f'https://{old_domain}', f'https://{new_domain}')
                    new_url = new_url.replace(f'http://{old_domain}', f'https://{new_domain}')
                    new_gallery.append(new_url)
                    changed = True
                    self.stdout.write(f"  {model_name} #{obj.id}: {url} -> {new_url}")
                else:
                    new_gallery.append(url)

            if changed:
                if not dry_run:
                    setattr(obj, field_name, new_gallery)
                    obj.save(update_fields=[field_name])
                updated_count += 1

        self.stdout.write(f"  Updated {updated_count} {model_name} records")
