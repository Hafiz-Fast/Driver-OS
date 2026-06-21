from django.http import JsonResponse


def home(request):
    return JsonResponse(
        {
            'message': 'Driver-OS backend is running',
            'phase': 'foundation',
            'endpoints': {
                'auth': '/api/auth/',
                'cars': '/api/cars/',
            },
        }
    )