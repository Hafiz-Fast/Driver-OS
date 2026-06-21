from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from DriverOS.api.views.auth_views import GetUserView, SignupView
from DriverOS.api.views.car_views import CarView, CarsView

urlpatterns = [
    path('user/', GetUserView.as_view(), name='get-user'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('cars/', CarsView.as_view(), name='create-car'),
    path('cars/<int:pk>/', CarView.as_view(), name='get-car'),
]
