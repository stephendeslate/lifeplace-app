# backend/core/domains/payments/services/tax_rate_service.py
from decimal import Decimal

from ..models import InvoiceTax, TaxRate


class TaxRateService:
    """Service for managing tax rates"""

    @staticmethod
    def create_tax_rate(data, user):
        """Create a new tax rate"""
        # Only staff can create tax rates
        if not user.is_staff:
            raise PermissionError("Only staff members can manage tax rates")

        # Check required fields
        if not data.get("name") or not data.get("rate"):
            raise ValueError("Name and rate are required for tax rates")

        # Create the tax rate
        tax_rate = TaxRate.objects.create(
            name=data.get("name"),
            rate=Decimal(str(data.get("rate"))),
            region=data.get("region", ""),
            is_default=data.get("is_default", False),
        )

        return tax_rate

    @staticmethod
    def update_tax_rate(rate_id, data, user):
        """Update a tax rate"""
        # Only staff can update tax rates
        if not user.is_staff:
            raise PermissionError("Only staff members can manage tax rates")

        try:
            tax_rate = TaxRate.objects.get(pk=rate_id)
        except TaxRate.DoesNotExist:
            raise ValueError(f"Tax rate with ID {rate_id} not found")

        # Update fields
        for field in ["name", "rate", "region", "is_default"]:
            if field in data:
                setattr(tax_rate, field, data[field])

        tax_rate.save()
        return tax_rate

    @staticmethod
    def delete_tax_rate(rate_id, user):
        """Delete a tax rate"""
        # Only staff can delete tax rates
        if not user.is_staff:
            raise PermissionError("Only staff members can manage tax rates")

        try:
            tax_rate = TaxRate.objects.get(pk=rate_id)
        except TaxRate.DoesNotExist:
            raise ValueError(f"Tax rate with ID {rate_id} not found")

        # Check if tax rate is in use
        is_used = InvoiceTax.objects.filter(tax_rate=tax_rate).exists()
        if is_used:
            raise ValueError("Cannot delete a tax rate that is in use")

        tax_rate.delete()
