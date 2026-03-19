from django.db import models, transaction

from core.utils.models import BaseModel


class TaxRate(BaseModel):
    """Tax rates for different regions or product types"""

    name = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=5, decimal_places=2)
    region = models.CharField(max_length=100, blank=True)
    is_default = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.name} ({self.rate}%)"

    def save(self, *args, **kwargs):
        # If this rate is set as default, unset other defaults
        # Use atomic transaction to prevent race conditions when setting defaults
        if self.is_default:
            with transaction.atomic():
                TaxRate.objects.filter(is_default=True).exclude(pk=self.pk).update(is_default=False)
                super().save(*args, **kwargs)
        else:
            super().save(*args, **kwargs)
