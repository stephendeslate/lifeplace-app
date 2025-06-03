# lifeplace-app/backend/core/urls.py

from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve
import os

urlpatterns = [
    path('django-admin/', admin.site.urls),
    # Add your API URLs here when ready:
    # path('api/', include('core.api_urls')),
]

# Serve admin-crm SPA in production
if not settings.DEBUG:
    # Serve the admin-crm index.html for all non-API routes
    def serve_admin_crm(request, path=''):
        """Serve the admin-crm SPA for all non-API routes"""
        if path and os.path.exists(os.path.join(settings.STATIC_ROOT, 'admin-crm', path)):
            return serve(request, path, document_root=os.path.join(settings.STATIC_ROOT, 'admin-crm'))
        return serve(request, 'index.html', document_root=os.path.join(settings.STATIC_ROOT, 'admin-crm'))
    
    urlpatterns += [
        re_path(r'^(?!api/)(?!django-admin/)(?!static/).*', serve_admin_crm),
    ]
else:
    # Development static files serving
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)