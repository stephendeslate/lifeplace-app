# backend/core/domains/payments/management/commands/update_event_financials.py

from django.core.management.base import BaseCommand

from core.domains.events.models import Event
from core.domains.payments.signals import update_event_financial_totals


class Command(BaseCommand):
    help = "Update all events with correct financial totals based on invoices and payments"

    def add_arguments(self, parser):
        parser.add_argument(
            "--event-id",
            type=int,
            help="Update specific event ID (optional)",
        )

    def handle(self, *args, **options):
        if options["event_id"]:
            # Update specific event
            try:
                event = Event.objects.get(id=options["event_id"])
                self.stdout.write(f"Updating event {event.id}...")
                update_event_financial_totals(event)
                self.stdout.write(self.style.SUCCESS(f"Successfully updated event {event.id}"))
            except Event.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Event {options['event_id']} does not exist"))
        else:
            # Update all events
            events = Event.objects.all()
            total_events = events.count()
            self.stdout.write(f"Updating {total_events} events...")

            updated_count = 0
            for event in events:
                try:
                    update_event_financial_totals(event)
                    updated_count += 1
                    if updated_count % 10 == 0:
                        self.stdout.write(f"Updated {updated_count}/{total_events} events...")
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"Failed to update event {event.id}: {e}"))

            self.stdout.write(self.style.SUCCESS(f"Successfully updated {updated_count}/{total_events} events"))
