from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404

from DriverOS.models import CarProfile, DriveSession, DrowsinessEvent

class StartSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        car_id = request.data.get('car_id')
        if not car_id:
            return Response({'error': 'car_id is required'}, status=400)
            
        car = get_object_or_404(CarProfile, id=car_id, owner=request.user)
        
        # End any currently active sessions for this car/user
        DriveSession.objects.filter(car__owner=request.user, is_active=True).update(
            is_active=False, ended_at=timezone.now()
        )
        
        session = DriveSession.objects.create(car=car, is_active=True)
        return Response({'session_id': session.id})

class EndSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({'error': 'session_id is required'}, status=400)
            
        session = get_object_or_404(DriveSession, id=session_id, car__owner=request.user)
        session.is_active = False
        session.ended_at = timezone.now()
        session.save()
        return Response({'success': True})

class LogSafetyEventView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        ear_value = request.data.get('ear_value')
        event_type = request.data.get('event_type', 'drowsiness')

        if not session_id:
            return Response({'error': 'session_id is required'}, status=400)

        if event_type != 'drowsiness':
            return Response({'error': 'unsupported event_type'}, status=400)

        try:
            ear_value = float(ear_value)
        except (TypeError, ValueError):
            return Response({'error': 'valid ear_value is required'}, status=400)

        try:
            session = DriveSession.objects.get(
                id=session_id,
                car__owner=request.user,
                is_active=True
            )
        except DriveSession.DoesNotExist:
            return Response({'error': 'Session not found'}, status=404)

        DrowsinessEvent.objects.create(
            session=session,
            ear_value=ear_value,
            alert_triggered=True
        )

        return Response({'logged': True})
