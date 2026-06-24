from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from DriverOS.api.views.auth_views import GetUserView, SignupView
from DriverOS.api.views.car_views import CarView, CarsView
from DriverOS.api.views.session_views import StartSessionView, EndSessionView, LogSafetyEventView

urlpatterns = [
    path('user/', GetUserView.as_view(), name='get-user'),
    path('signup/', SignupView.as_view(), name='signup'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('refresh/', TokenRefreshView.as_view(), name='refresh'),
    path('cars/', CarsView.as_view(), name='create-car'),
    path('cars/<int:pk>/', CarView.as_view(), name='get-car'),
    path('sessions/start/', StartSessionView.as_view()),
    path('sessions/end/', EndSessionView.as_view()),
    path('sessions/events/', LogSafetyEventView.as_view()),
]
