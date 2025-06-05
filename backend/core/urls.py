# lifeplace-app/backend/core/urls.py

from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('django-admin/', admin.site.urls),
    # Add your API URLs here
    path('api/users/', include('core.domains.users.urls', namespace='users')),
]

# In production, serve React apps
if settings.IS_PRODUCTION:
    # Admin CRM routes
    urlpatterns += [
        re_path(r'^admin-crm/$', TemplateView.as_view(template_name='index.html')),
        re_path(r'^admin-crm/.*', TemplateView.as_view(template_name='index.html')),
    ]
    
    # Client Portal routes  
    urlpatterns += [
        re_path(r'^client-portal/$', TemplateView.as_view(template_name='index.html')),
        re_path(r'^client-portal/.*', TemplateView.as_view(template_name='index.html')),
    ]

# Serve static files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)