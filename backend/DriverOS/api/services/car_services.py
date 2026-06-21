from DriverOS.models import CarProfile


def list_user_car_profiles(user):
    return CarProfile.objects.filter(owner=user)


def create_car_profile(*, user, validated_data):
    return CarProfile.objects.create(owner=user, **validated_data)
