# backend/core/domains/products/signals.py
from django.db.models.signals import post_migrate, post_save, post_delete
from django.dispatch import receiver
from django.apps import apps
import logging

logger = logging.getLogger(__name__)


@receiver(post_migrate)
def create_default_categories(sender, **kwargs):
    """Create default product categories for event planning business"""
    if sender.name != 'core.domains.products':
        return
    
    ProductCategory = apps.get_model('products', 'ProductCategory')
    
    # Check if categories already exist to avoid duplicates
    if ProductCategory.objects.exists():
        print("🛍️ Product categories already exist, skipping creation")
        return
    
    print("🛍️ Creating default product categories...")
    
    # Main event categories with industry-standard subcategories
    categories_data = [
        # Weddings
        {
            'name': 'Weddings',
            'description': 'Wedding planning and coordination services',
            'slug': 'weddings',
            'requires_venue': True,
            'typical_duration_hours': 8,
            'sort_order': 10,
            'children': [
                {
                    'name': 'Full Wedding Planning',
                    'description': 'Complete wedding planning and coordination from start to finish',
                    'typical_duration_hours': 12,
                    'sort_order': 10
                },
                {
                    'name': 'Wedding Coordination',
                    'description': 'Day-of and month-of coordination services',
                    'typical_duration_hours': 10,
                    'sort_order': 20
                },
                {
                    'name': 'Destination Weddings',
                    'description': 'Planning for destination wedding events and travel coordination',
                    'typical_duration_hours': 16,
                    'sort_order': 30
                },
                {
                    'name': 'Elopements',
                    'description': 'Intimate wedding ceremonies and micro-wedding planning',
                    'typical_duration_hours': 4,
                    'sort_order': 40
                },
            ]
        },
        
        # Corporate Events
        {
            'name': 'Corporate Events',
            'description': 'Business and corporate event planning services',
            'slug': 'corporate-events',
            'requires_venue': True,
            'typical_duration_hours': 6,
            'sort_order': 20,
            'children': [
                {
                    'name': 'Conference Planning',
                    'description': 'Large-scale conference and summit planning with speaker coordination',
                    'typical_duration_hours': 8,
                    'sort_order': 10
                },
                {
                    'name': 'Team Building Events',
                    'description': 'Corporate team building activities and company retreats',
                    'typical_duration_hours': 6,
                    'sort_order': 20
                },
                {
                    'name': 'Product Launches',
                    'description': 'Product launch events and marketing activations',
                    'typical_duration_hours': 4,
                    'sort_order': 30
                },
                {
                    'name': 'Awards Ceremonies',
                    'description': 'Corporate awards and recognition events',
                    'typical_duration_hours': 4,
                    'sort_order': 40
                },
                {
                    'name': 'Holiday Parties',
                    'description': 'Corporate holiday and celebration events',
                    'typical_duration_hours': 4,
                    'sort_order': 50
                },
                {
                    'name': 'Board Meetings',
                    'description': 'Executive board meetings and shareholder events',
                    'typical_duration_hours': 3,
                    'sort_order': 60
                },
            ]
        },
        
        # Social Events
        {
            'name': 'Social Events',
            'description': 'Personal and social celebrations',
            'slug': 'social-events',
            'requires_venue': True,
            'typical_duration_hours': 4,
            'sort_order': 30,
            'children': [
                {
                    'name': 'Birthday Parties',
                    'description': 'Birthday celebrations and milestone birthday events',
                    'typical_duration_hours': 4,
                    'sort_order': 10
                },
                {
                    'name': 'Anniversary Celebrations',
                    'description': 'Anniversary parties and milestone celebrations',
                    'typical_duration_hours': 4,
                    'sort_order': 20
                },
                {
                    'name': 'Graduations',
                    'description': 'Graduation parties and academic achievement celebrations',
                    'typical_duration_hours': 3,
                    'sort_order': 30
                },
                {
                    'name': 'Baby Showers',
                    'description': 'Baby shower planning and coordination',
                    'typical_duration_hours': 3,
                    'sort_order': 40
                },
                {
                    'name': 'Bridal Showers',
                    'description': 'Bridal shower events and celebrations',
                    'typical_duration_hours': 3,
                    'sort_order': 50
                },
                {
                    'name': 'Reunions',
                    'description': 'Family and class reunion events',
                    'typical_duration_hours': 6,
                    'sort_order': 60
                },
                {
                    'name': 'Retirement Parties',
                    'description': 'Retirement celebrations and farewell events',
                    'typical_duration_hours': 4,
                    'sort_order': 70
                },
            ]
        },
        
        # Fundraising & Non-Profit
        {
            'name': 'Fundraising Events',
            'description': 'Charity and fundraising event planning',
            'slug': 'fundraising-events',
            'requires_venue': True,
            'typical_duration_hours': 4,
            'sort_order': 40,
            'children': [
                {
                    'name': 'Charity Galas',
                    'description': 'Formal charity gala events and auctions',
                    'typical_duration_hours': 5,
                    'sort_order': 10
                },
                {
                    'name': 'Benefit Dinners',
                    'description': 'Fundraising dinner events and speaking programs',
                    'typical_duration_hours': 4,
                    'sort_order': 20
                },
                {
                    'name': 'Walk/Run Events',
                    'description': 'Charity walks, runs, and outdoor fundraising events',
                    'typical_duration_hours': 6,
                    'sort_order': 30
                },
                {
                    'name': 'Silent Auctions',
                    'description': 'Silent auction events and coordination',
                    'typical_duration_hours': 4,
                    'sort_order': 40
                },
                {
                    'name': 'Golf Tournaments',
                    'description': 'Charity golf tournaments and sporting events',
                    'typical_duration_hours': 8,
                    'sort_order': 50
                },
            ]
        },
        
        # Entertainment & Cultural
        {
            'name': 'Entertainment Events',
            'description': 'Entertainment and cultural event planning',
            'slug': 'entertainment-events',
            'requires_venue': True,
            'typical_duration_hours': 4,
            'sort_order': 50,
            'children': [
                {
                    'name': 'Concerts',
                    'description': 'Music concert and performance events',
                    'typical_duration_hours': 4,
                    'sort_order': 10
                },
                {
                    'name': 'Festivals',
                    'description': 'Cultural festivals and community events',
                    'typical_duration_hours': 8,
                    'sort_order': 20
                },
                {
                    'name': 'Art Exhibitions',
                    'description': 'Art gallery openings and cultural exhibitions',
                    'typical_duration_hours': 3,
                    'sort_order': 30
                },
                {
                    'name': 'Fashion Shows',
                    'description': 'Fashion show production and coordination',
                    'typical_duration_hours': 3,
                    'sort_order': 40
                },
                {
                    'name': 'Theater Productions',
                    'description': 'Theater and performing arts event coordination',
                    'typical_duration_hours': 3,
                    'sort_order': 50
                },
            ]
        },
        
        # Religious & Cultural Ceremonies
        {
            'name': 'Religious Events',
            'description': 'Religious and cultural ceremony planning',
            'slug': 'religious-events',
            'requires_venue': True,
            'typical_duration_hours': 3,
            'sort_order': 60,
            'children': [
                {
                    'name': 'Baptisms',
                    'description': 'Baptism ceremonies and celebrations',
                    'typical_duration_hours': 2,
                    'sort_order': 10
                },
                {
                    'name': 'Bar/Bat Mitzvahs',
                    'description': 'Bar and Bat Mitzvah celebrations',
                    'typical_duration_hours': 4,
                    'sort_order': 20
                },
                {
                    'name': 'Confirmations',
                    'description': 'Religious confirmation ceremonies',
                    'typical_duration_hours': 2,
                    'sort_order': 30
                },
                {
                    'name': 'Memorial Services',
                    'description': 'Memorial and celebration of life services',
                    'typical_duration_hours': 2,
                    'sort_order': 40
                },
                {
                    'name': 'First Communions',
                    'description': 'First communion ceremonies and celebrations',
                    'typical_duration_hours': 2,
                    'sort_order': 50
                },
            ]
        },
        
        # Educational Events
        {
            'name': 'Educational Events',
            'description': 'Educational workshops and seminars',
            'slug': 'educational-events',
            'requires_venue': True,
            'typical_duration_hours': 6,
            'sort_order': 70,
            'children': [
                {
                    'name': 'Workshops',
                    'description': 'Educational workshops and hands-on training sessions',
                    'typical_duration_hours': 4,
                    'sort_order': 10
                },
                {
                    'name': 'Seminars',
                    'description': 'Professional seminars and presentations',
                    'typical_duration_hours': 3,
                    'sort_order': 20
                },
                {
                    'name': 'Training Programs',
                    'description': 'Multi-day training and certification programs',
                    'typical_duration_hours': 8,
                    'sort_order': 30
                },
                {
                    'name': 'Webinars',
                    'description': 'Online educational events and virtual presentations',
                    'typical_duration_hours': 2,
                    'sort_order': 40,
                    'requires_venue': False
                },
                {
                    'name': 'Symposiums',
                    'description': 'Academic symposiums and research conferences',
                    'typical_duration_hours': 6,
                    'sort_order': 50
                },
            ]
        },
        
        # Government & Public Events
        {
            'name': 'Government Events',
            'description': 'Government and public sector event planning',
            'slug': 'government-events',
            'requires_venue': True,
            'typical_duration_hours': 4,
            'sort_order': 80,
            'children': [
                {
                    'name': 'Town Halls',
                    'description': 'Public town hall meetings and community forums',
                    'typical_duration_hours': 2,
                    'sort_order': 10
                },
                {
                    'name': 'Inaugurations',
                    'description': 'Government inauguration ceremonies',
                    'typical_duration_hours': 3,
                    'sort_order': 20
                },
                {
                    'name': 'Public Ceremonies',
                    'description': 'Public ceremonies and civic events',
                    'typical_duration_hours': 2,
                    'sort_order': 30
                },
                {
                    'name': 'Ribbon Cuttings',
                    'description': 'Grand opening and ribbon cutting ceremonies',
                    'typical_duration_hours': 1,
                    'sort_order': 40
                },
            ]
        },
    ]
    
    # Create categories with proper error handling
    created_count = 0
    try:
        for category_data in categories_data:
            children_data = category_data.pop('children', [])
            
            # Create parent category
            parent_category = ProductCategory.objects.create(**category_data)
            created_count += 1
            
            # Create child categories
            for child_data in children_data:
                child_data['parent'] = parent_category
                child_data['slug'] = f"{parent_category.slug}-{child_data['name'].lower().replace(' ', '-').replace('/', '-')}"
                
                # Inherit parent settings if not specified
                if 'requires_venue' not in child_data:
                    child_data['requires_venue'] = category_data.get('requires_venue', True)
                if 'typical_duration_hours' not in child_data:
                    child_data['typical_duration_hours'] = category_data.get('typical_duration_hours', 4)
                if 'sort_order' not in child_data:
                    child_data['sort_order'] = 10
                
                ProductCategory.objects.create(**child_data)
                created_count += 1
        
        print(f"🛍️ Successfully created {created_count} product categories")
        
    except Exception as e:
        print(f"❌ Error creating product categories: {str(e)}")
        # Don't raise the exception to avoid breaking migrations
        pass


@receiver(post_migrate)
def create_sample_products(sender, **kwargs):
    """Create some sample products for demonstration purposes"""
    if sender.name != 'core.domains.products':
        return
    
    ProductCategory = apps.get_model('products', 'ProductCategory')
    ProductOption = apps.get_model('products', 'ProductOption')
    
    # Only create if no products exist and categories exist
    if ProductOption.objects.exists() or not ProductCategory.objects.exists():
        return
    
    print("🛍️ Creating sample products...")
    
    try:
        # Get some categories for sample products
        wedding_planning = ProductCategory.objects.filter(name='Full Wedding Planning').first()
        corporate_conf = ProductCategory.objects.filter(name='Conference Planning').first()
        birthday_party = ProductCategory.objects.filter(name='Birthday Parties').first()
        
        sample_products = []
        
        if wedding_planning:
            sample_products.extend([
                {
                    'name': 'Premium Wedding Planning Package',
                    'description': 'Complete wedding planning service including venue selection, vendor coordination, timeline management, and day-of coordination.',
                    'category': wedding_planning,
                    'pricing_model': 'FIXED',
                    'base_price': '150000.00',
                    'currency': 'PHP',
                    'tax_rate': '12.00',
                    'type': 'PACKAGE',
                    'is_active': True,
                    'is_featured': True,
                    'has_excess_hours': True,
                    'included_hours': 40,
                    'excess_hour_price': '2500.00',
                    'advance_booking_days': 30,
                    'sku': 'WED-PREM-001',
                    'sort_order': 10,
                },
                {
                    'name': 'Wedding Day Coordination',
                    'description': 'Professional coordination services for your wedding day to ensure everything runs smoothly.',
                    'category': wedding_planning,
                    'pricing_model': 'FIXED',
                    'base_price': '45000.00',
                    'currency': 'PHP',
                    'tax_rate': '12.00',
                    'type': 'PRODUCT',
                    'is_active': True,
                    'has_excess_hours': True,
                    'included_hours': 12,
                    'excess_hour_price': '2000.00',
                    'advance_booking_days': 14,
                    'sku': 'WED-COORD-001',
                    'sort_order': 20,
                },
            ])
        
        if corporate_conf:
            sample_products.append({
                'name': 'Corporate Conference Management',
                'description': 'Full-service conference planning including venue booking, speaker coordination, catering, and audio-visual setup.',
                'category': corporate_conf,
                'pricing_model': 'HOURLY',
                'base_price': '3500.00',
                'currency': 'PHP',
                'tax_rate': '12.00',
                'type': 'PACKAGE',
                'is_active': True,
                'has_excess_hours': False,
                'minimum_hours': 8,
                'maximum_hours': 16,
                'advance_booking_days': 21,
                'sku': 'CORP-CONF-001',
                'sort_order': 10,
            })
        
        if birthday_party:
            sample_products.append({
                'name': 'Children\'s Birthday Party Planning',
                'description': 'Fun and memorable birthday party planning for children including theme decoration, entertainment, and party coordination.',
                'category': birthday_party,
                'pricing_model': 'FIXED',
                'base_price': '25000.00',
                'currency': 'PHP',
                'tax_rate': '12.00',
                'type': 'PACKAGE',
                'is_active': True,
                'has_excess_hours': True,
                'included_hours': 6,
                'excess_hour_price': '1500.00',
                'advance_booking_days': 7,
                'sku': 'BDAY-CHILD-001',
                'sort_order': 10,
            })
        
        # Create the sample products
        for product_data in sample_products:
            ProductOption.objects.create(**product_data)
        
        print(f"🛍️ Successfully created {len(sample_products)} sample products")
        
    except Exception as e:
        print(f"❌ Error creating sample products: {str(e)}")
        # Don't raise the exception to avoid breaking migrations
        pass


@receiver(post_migrate)
def create_sample_discounts(sender, **kwargs):
    """Create some sample discounts for demonstration purposes"""
    if sender.name != 'core.domains.products':
        return
    
    Discount = apps.get_model('products', 'Discount')
    ProductCategory = apps.get_model('products', 'ProductCategory')
    
    # Only create if no discounts exist and categories exist
    if Discount.objects.exists() or not ProductCategory.objects.exists():
        return
    
    print("🛍️ Creating sample discounts...")
    
    try:
        from datetime import date, timedelta
        
        # Get wedding category for targeted discount
        wedding_category = ProductCategory.objects.filter(name='Weddings').first()
        
        sample_discounts = [
            {
                'name': 'Early Bird Special',
                'code': 'EARLY2024',
                'description': 'Book your event 3 months in advance and save 15%',
                'discount_type': 'PERCENTAGE',
                'application_type': 'CODE_REQUIRED',
                'value': '15.00',
                'is_active': True,
                'valid_from': date.today(),
                'valid_until': date.today() + timedelta(days=365),
                'max_uses': 50,
                'minimum_order_amount': '50000.00',
            },
            {
                'name': 'New Client Welcome',
                'code': 'WELCOME',
                'description': 'Welcome discount for first-time clients',
                'discount_type': 'FIXED',
                'application_type': 'CODE_REQUIRED',
                'value': '5000.00',
                'is_active': True,
                'valid_from': date.today(),
                'max_uses': 100,
                'max_uses_per_client': 1,
            },
            {
                'name': 'Referral Bonus',
                'description': 'Automatic discount for client referrals',
                'discount_type': 'PERCENTAGE',
                'application_type': 'ADMIN_ONLY',
                'value': '10.00',
                'is_active': True,
                'valid_from': date.today(),
                'max_uses_per_client': 1,
            },
        ]
        
        for discount_data in sample_discounts:
            discount = Discount.objects.create(**discount_data)
            
            # Add wedding category to the early bird discount
            if discount.name == 'Early Bird Special' and wedding_category:
                discount.applicable_categories.add(wedding_category)
        
        print(f"🛍️ Successfully created {len(sample_discounts)} sample discounts")
        
    except Exception as e:
        print(f"❌ Error creating sample discounts: {str(e)}")
        # Don't raise the exception to avoid breaking migrations
        pass


# === CACHE INVALIDATION SIGNALS ===

@receiver([post_save, post_delete], sender='products.ProductCategory')
def invalidate_category_caches(sender, instance, **kwargs):
    """Invalidate category-related caches when categories are modified"""
    try:
        from .cache_service import product_cache_service
        product_cache_service.invalidate_category_caches(instance.id)
        logger.info(f"Invalidated category caches for: {instance.name}")
    except Exception as e:
        logger.error(f"Failed to invalidate category caches: {e}")


@receiver([post_save, post_delete], sender='products.ProductOption')
def invalidate_product_caches(sender, instance, **kwargs):
    """Invalidate product-related caches when products are modified"""
    try:
        from .cache_service import product_cache_service
        product_cache_service.invalidate_product_caches(instance.id)
        logger.info(f"Invalidated product caches for: {instance.name}")
    except Exception as e:
        logger.error(f"Failed to invalidate product caches: {e}")


@receiver([post_save, post_delete], sender='products.Discount')
def invalidate_discount_caches(sender, instance, **kwargs):
    """Invalidate discount-related caches when discounts are modified"""
    try:
        from .cache_service import product_cache_service
        product_cache_service.invalidate_discount_caches(instance.id)
        logger.info(f"Invalidated discount caches for: {instance.name}")
    except Exception as e:
        logger.error(f"Failed to invalidate discount caches: {e}")


def connect_product_signals():
    """Connect all product domain cache invalidation signals"""
    logger.info("Successfully connected all product domain signals")