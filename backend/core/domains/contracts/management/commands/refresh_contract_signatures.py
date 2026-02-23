# backend/core/domains/contracts/management/commands/refresh_contract_signatures.py

from django.core.management.base import BaseCommand

from core.domains.contracts.models import EventContract
from core.domains.contracts.services import ContractTemplateService


class Command(BaseCommand):
    help = "Refresh contract content to include signatures for contracts that have been signed"

    def add_arguments(self, parser):
        parser.add_argument(
            "--contract-id",
            type=int,
            help="ID of a specific contract to refresh (optional)",
        )
        parser.add_argument(
            "--template-id",
            type=int,
            help="ID of template - refresh all contracts using this template (optional)",
        )

    def handle(self, *args, **options):
        contract_id = options.get("contract_id")
        template_id = options.get("template_id")

        if contract_id:
            # Refresh specific contract
            try:
                contract = EventContract.objects.get(id=contract_id)
                self.stdout.write(f"Refreshing contract {contract_id}: {contract.event.name}")
                ContractTemplateService.render_contract_with_signatures(contract_id)
                self.stdout.write(self.style.SUCCESS(f"Successfully refreshed contract {contract_id}"))
            except EventContract.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Contract with ID {contract_id} not found"))
        elif template_id:
            # Refresh all contracts using specific template
            contracts = EventContract.objects.filter(template_id=template_id)
            self.stdout.write(f"Found {contracts.count()} contracts using template {template_id}")

            for contract in contracts:
                self.stdout.write(f"Refreshing contract {contract.id}: {contract.event.name}")
                ContractTemplateService.render_contract_with_signatures(contract.id)

            self.stdout.write(self.style.SUCCESS(f"Successfully refreshed {contracts.count()} contracts"))
        else:
            # Refresh all contracts that have signatures
            contracts = EventContract.objects.filter(signatures__isnull=False).distinct()
            self.stdout.write(f"Found {contracts.count()} contracts with signatures")

            for contract in contracts:
                self.stdout.write(f"Refreshing contract {contract.id}: {contract.event.name}")
                ContractTemplateService.render_contract_with_signatures(contract.id)

            self.stdout.write(
                self.style.SUCCESS(f"Successfully refreshed {contracts.count()} contracts with signatures")
            )
