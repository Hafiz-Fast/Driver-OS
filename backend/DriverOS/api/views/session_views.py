import base64
import numpy as np
import cv2
import mediapipe as mp
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.shortcuts import get_object_or_404

from DriverOS.models import CarProfile, DriveSession, DrowsinessEvent

mp_face_mesh = mp.solutions.face_mesh

# MediaPipe landmark indices for left and right eye
LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]

def eye_aspect_ratio(landmarks, eye_indices, img_w, img_h):
    coords = [
        (int(landmarks[i].x * img_w), int(landmarks[i].y * img_h))
        for i in eye_indices
    ]
    # Vertical distances
    v1 = np.linalg.norm(np.array(coords[1]) - np.array(coords[5]))
    v2 = np.linalg.norm(np.array(coords[2]) - np.array(coords[4]))
    # Horizontal distance
    h  = np.linalg.norm(np.array(coords[0]) - np.array(coords[3]))
    return (v1 + v2) / (2.0 * h)

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

class AnalyzeFrameView(APIView):
    permission_classes = [IsAuthenticated]

    EAR_THRESHOLD      = 0.25   # below this = eyes closing
    CONSECUTIVE_FRAMES = 10     # how many frames before alert fires

    # In-memory counter per user (fine for now, move to Redis later)
    _frame_counters = {}

    def post(self, request):
        image_data = request.data.get('frame')  # base64 string
        session_id = request.data.get('session_id')

        if not image_data or not session_id:
            return Response({'error': 'frame and session_id required'}, status=400)

        # Decode base64 -> numpy array -> OpenCV image
        img_bytes = base64.b64decode(image_data.split(',')[-1])
        np_arr    = np.frombuffer(img_bytes, np.uint8)
        frame     = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if frame is None:
             return Response({'error': 'invalid image data'}, status=400)
             
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        h, w = frame.shape[:2]
        user_id = request.user.id

        with mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        ) as face_mesh:
            results = face_mesh.process(rgb_frame)

        if not results.multi_face_landmarks:
            return Response({'face_detected': False, 'drowsy': False})

        landmarks = results.multi_face_landmarks[0].landmark
        left_ear  = eye_aspect_ratio(landmarks, LEFT_EYE,  w, h)
        right_ear = eye_aspect_ratio(landmarks, RIGHT_EYE, w, h)
        avg_ear   = (left_ear + right_ear) / 2.0

        # Update consecutive frame counter
        counter = self._frame_counters.get(user_id, 0)
        if avg_ear < self.EAR_THRESHOLD:
            counter += 1
        else:
            counter = 0
        self._frame_counters[user_id] = counter

        drowsy = counter >= self.CONSECUTIVE_FRAMES
        alert  = drowsy  # extend this later for escalating alerts

        # Log to DB only when alert fires
        if alert:
            try:
                session = DriveSession.objects.get(id=session_id, is_active=True, car__owner=request.user)
                DrowsinessEvent.objects.create(
                    session=session,
                    ear_value=avg_ear,
                    alert_triggered=True
                )
            except DriveSession.DoesNotExist:
                pass

        return Response({
            'face_detected': True,
            'ear': round(avg_ear, 3),
            'drowsy': drowsy,
            'alert': alert,
            'consecutive_frames': counter
        })
