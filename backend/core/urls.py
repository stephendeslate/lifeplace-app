# lifeplace-app/backend/core/urls.py

from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/users/', include('core.domains.users.urls')),
    path('api/communications/', include('core.domains.communications.urls')),
    path('api/clients/', include('core.domains.clients.urls')),
    path('api/events/', include('core.domains.events.urls')),
    path('api/products/', include('core.domains.products.urls')),
    path('api/questionnaires/', include('core.domains.questionnaires.urls')),
]