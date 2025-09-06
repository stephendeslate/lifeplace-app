# backend/core/domains/contracts/management/commands/update_contract_template_with_signatures.py

from django.core.management.base import BaseCommand
from core.domains.contracts.models import ContractTemplate


class Command(BaseCommand):
    help = 'Update an existing contract template to include signature placeholders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--template-id',
            type=int,
            help='ID of the contract template to update',
            required=True
        )

    def handle(self, *args, **options):
        template_id = options['template_id']
        
        try:
            template = ContractTemplate.objects.get(id=template_id)
            self.stdout.write(f"Found template: {template.name}")
            self.stdout.write(f"Current content length: {len(template.content)} characters")
            
            # Add signature placeholders to the end of the template
            signature_section = """

<br><br>
<h3>Signatures</h3>
<p>By signing below, all parties agree to the terms and conditions outlined in this contract.</p>

<table style="width: 100%; margin-top: 30px;">
<tr>
    <td style="width: 50%; vertical-align: bottom; padding-right: 20px;">
        <strong>Client Signature:</strong><br>
        {{ SIGNATURE_CLIENT }}<br>
        Date: {{ client_signature_date }}<br>
        Name: {{ client_signer_name }}<br>
        Title: {{ client_signer_title }}
    </td>
    <td style="width: 50%; vertical-align: bottom;">
        <strong>LifePlace Representative:</strong><br>
        {{ SIGNATURE_COMPANY_REP }}<br>
        Date: {{ company_rep_signature_date }}<br>
        Name: {{ company_rep_signer_name }}<br>
        Title: {{ company_rep_signer_title }}
    </td>
</tr>
</table>
"""
            
            # Update the template content
            if "{{ SIGNATURE_" not in template.content:
                template.content += signature_section
                template.save()
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Successfully updated template "{template.name}" with signature placeholders'
                    )
                )
            else:
                self.stdout.write(
                    self.style.WARNING(
                        f'Template "{template.name}" already contains signature placeholders'
                    )
                )
                
        except ContractTemplate.DoesNotExist:
            self.stdout.write(
                self.style.ERROR(f'Contract template with ID {template_id} not found')
            )
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error updating template: {str(e)}')
            )