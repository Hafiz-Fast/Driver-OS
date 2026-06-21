from django.contrib.auth import get_user_model


User = get_user_model()


def create_user(*, username: str, email: str, password: str):
    return User.objects.create_user(username=username, email=email, password=password)


def build_user_payload(user):
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
    }
