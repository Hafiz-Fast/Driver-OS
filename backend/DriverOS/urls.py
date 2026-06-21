from django.urls import include, path

from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('api/', include('DriverOS.api.urls')),
]