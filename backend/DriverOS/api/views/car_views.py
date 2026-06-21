from rest_framework import generics, permissions

from DriverOS.api.serializers.car_serializers import CarProfileSerializer
from DriverOS.api.services.car_services import create_car_profile, list_user_car_profiles


class CarsView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CarProfileSerializer

    def get_queryset(self):
        return list_user_car_profiles(self.request.user)

    def perform_create(self, serializer):
        car_profile = create_car_profile(user=self.request.user, validated_data=serializer.validated_data)
        serializer.instance = car_profile


class CarView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CarProfileSerializer

    def get_queryset(self):
        return list_user_car_profiles(self.request.user)
