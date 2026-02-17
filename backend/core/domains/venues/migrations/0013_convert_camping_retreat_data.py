from django.db import migrations


def merge_categories_forward(apps, schema_editor):
    """Convert RETREAT and CAMPING rows to CAMPS_AND_RETREATS."""
    GalleryPhoto = apps.get_model('venues', 'GalleryPhoto')
    GalleryPhoto.objects.filter(category__in=['RETREAT', 'CAMPING']).update(
        category='CAMPS_AND_RETREATS'
    )


def merge_categories_reverse(apps, schema_editor):
    """Revert CAMPS_AND_RETREATS back to RETREAT (best-effort reverse)."""
    GalleryPhoto = apps.get_model('venues', 'GalleryPhoto')
    GalleryPhoto.objects.filter(category='CAMPS_AND_RETREATS').update(
        category='RETREAT'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('venues', '0012_merge_camping_retreat_categories'),
    ]

    operations = [
        migrations.RunPython(merge_categories_forward, merge_categories_reverse),
    ]
