from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from DriverOS.api.serializers.auth_serializers import (
    UserProfileSerializer,
    UserRegistrationSerializer,
)
from DriverOS.api.services.auth_services import build_user_payload, create_user


class SignupView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = create_user(
            username=serializer.validated_data['username'],
            email=serializer.validated_data['email'],
            password=serializer.validated_data['password'],
        )

        return Response(
            {
                'user': build_user_payload(user),
            },
            status=status.HTTP_201_CREATED,
        )


class GetUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
