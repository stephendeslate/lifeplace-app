"""
Railway Database Verification Script

Run this in Railway console to check what data was seeded:
  railway run python RAILWAY_VERIFICATION_SCRIPT.py

Or in Railway's built-in console/shell:
  Copy and paste the code inside
"""

from core.domains.communications.models import CommunicationTemplate
from core.domains.settings.models import CurrencySettings
from core.domains.payments.models import PaymentSettings, PaymentGateway
from core.domains.contracts.models import ContractTemplate
from core.domains.workflows.models import WorkflowTemplate, WorkflowStage
from core.domains.products.models import ProductCategory
from core.domains.notifications.models import NotificationType

print("=" * 70)
print("🔍 RAILWAY DATABASE VERIFICATION")
print("=" * 70)
print()

# Communication Templates
ct_count = CommunicationTemplate.objects.count()
print(f"📧 Communication Templates: {ct_count}")
if ct_count > 0:
    print("   Templates found:")
    for template in CommunicationTemplate.objects.all().order_by('channel', 'name')[:10]:
        print(f"     - {template.name} ({template.channel}/{template.category})")
    if ct_count > 10:
        print(f"     ... and {ct_count - 10} more")
else:
    print("   ❌ No templates found!")
print()

# Currency Settings
cs_count = CurrencySettings.objects.filter(user__isnull=True).count()
print(f"💱 Currency Settings (system): {cs_count}")
if cs_count > 0:
    cs = CurrencySettings.objects.filter(user__isnull=True).first()
    print(f"   Default Currency: {cs.default_currency}")
    print(f"   Enabled Currencies: {cs.enabled_currencies}")
else:
    print("   ❌ No system currency settings found!")
print()

# Payment Settings
ps_count = PaymentSettings.objects.count()
print(f"💳 Payment Settings: {ps_count}")
if ps_count > 0:
    ps = PaymentSettings.objects.first()
    print(f"   Default Deposit: {ps.default_deposit_percentage}%")
    print(f"   Grace Period: {ps.grace_period_days} days")
    print(f"   Primary Gateway: {ps.primary_payment_gateway}")
else:
    print("   ❌ No payment settings found!")
print()

# Payment Gateways
pg_count = PaymentGateway.objects.count()
print(f"🔌 Payment Gateways: {pg_count}")
if pg_count > 0:
    for gateway in PaymentGateway.objects.all():
        status = "✅ Active" if gateway.is_active else "❌ Inactive"
        configured = "🔑 Configured" if gateway.config else "⚠️  Needs Config"
        print(f"   - {gateway.name} ({gateway.code}) - {status} - {configured}")
else:
    print("   ❌ No payment gateways found!")
print()

# Contract Templates
contract_count = ContractTemplate.objects.count()
print(f"📄 Contract Templates: {contract_count}")
if contract_count > 0:
    for contract in ContractTemplate.objects.all():
        print(f"   - {contract.name}")
else:
    print("   ❌ No contract templates found!")
print()

# Workflow Templates
wf_count = WorkflowTemplate.objects.count()
print(f"🔄 Workflow Templates: {wf_count}")
if wf_count > 0:
    for workflow in WorkflowTemplate.objects.all():
        stage_count = WorkflowStage.objects.filter(template=workflow).count()
        status = "✅ Active" if workflow.is_active else "❌ Inactive"
        print(f"   - {workflow.name} ({stage_count} stages) - {status}")
else:
    print("   ❌ No workflow templates found!")
print()

# Product Categories
pc_count = ProductCategory.objects.count()
print(f"🛍️  Product Categories: {pc_count}")
print()

# Notification Types
nt_count = NotificationType.objects.count()
print(f"🔔 Notification Types: {nt_count}")
print()

print("=" * 70)
print("📊 SUMMARY")
print("=" * 70)

issues = []
if ct_count < 21:
    issues.append(f"⚠️  Expected 21 communication templates, found {ct_count}")
if cs_count == 0:
    issues.append("❌ No currency settings found - NEEDS SEEDING")
if ps_count == 0:
    issues.append("❌ No payment settings found - NEEDS SEEDING")
if pg_count == 0:
    issues.append("❌ No payment gateways found - NEEDS SEEDING")
if contract_count == 0:
    issues.append("❌ No contract templates found - NEEDS SEEDING")
if wf_count == 0:
    issues.append("❌ No workflow templates found - NEEDS SEEDING")

if issues:
    print()
    print("🚨 ISSUES FOUND:")
    for issue in issues:
        print(f"   {issue}")
    print()
    print("💡 SOLUTION: Run seeding manually:")
    print("   railway run python manage.py seed_default_settings")
else:
    print()
    print("✅ All essential data is present!")
    print()
    print("📋 Next Steps:")
    print("   1. Configure Stripe API keys in Django Admin")
    print("   2. Review and customize settings as needed")

print("=" * 70)
