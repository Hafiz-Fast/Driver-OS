import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { Activity, AlertTriangle, CheckCircle2, ScanFace, StopCircle, UserRoundX } from 'lucide-react';
import { startSession, endSession, logSafetyEvent } from '../api';

const LEFT_EYE = [362, 385, 387, 263, 373, 380];
const RIGHT_EYE = [33, 160, 158, 133, 153, 144];

const EAR_THRESHOLD = 0.25;
const CONSECUTIVE_FRAMES = 20;
const ALERT_COOLDOWN_MS = 5000;
const ALERT_VISIBLE_MS = 3000;

function calcEAR(landmarks, indices) {
  const p = indices.map((i) => ({
    x: landmarks[i].x,
    y: landmarks[i].y,
  }));

  const v1 = Math.hypot(p[1].x - p[5].x, p[1].y - p[5].y);
  const v2 = Math.hypot(p[2].x - p[4].x, p[2].y - p[4].y);
  const h = Math.hypot(p[0].x - p[3].x, p[0].y - p[3].y);

  return h === 0 ? 0 : (v1 + v2) / (2.0 * h);
}

function DriveSessionPage() {
  const { carId } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef(null);
  const cameraRef = useRef(null);
  const faceMeshRef = useRef(null);
  const frameCounterRef = useRef(0);
  const lastAlertTimeRef = useRef(0);
  const clearAlertTimerRef = useRef(null);

  const [activeSession, setActiveSession] = useState(null);
  const [status, setStatus] = useState('initializing');
  const [drowsyAlert, setDrowsyAlert] = useState(false);
  const [earValue, setEarValue] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  const playAlert = useCallback(() => {
    if (!window.speechSynthesis || window.speechSynthesis.speaking) return;

    const utterance = new SpeechSynthesisUtterance('Drowsiness detected. Please wake up.');
    utterance.rate = 1.1;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  }, []);

  const triggerAlert = useCallback(
    async (ear) => {
      const now = Date.now();
      if (now - lastAlertTimeRef.current < ALERT_COOLDOWN_MS) return;

      lastAlertTimeRef.current = now;
      setDrowsyAlert(true);
      playAlert();

      if (clearAlertTimerRef.current) {
        window.clearTimeout(clearAlertTimerRef.current);
      }

      clearAlertTimerRef.current = window.setTimeout(() => {
        setDrowsyAlert(false);
      }, ALERT_VISIBLE_MS);

      try {
        await logSafetyEvent({
          sessionId: activeSession,
          earValue: ear,
          eventType: 'drowsiness',
        });
      } catch (err) {
        console.error('Failed to log safety event', err);
      }
    },
    [activeSession, playAlert]
  );

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const sessionData = await startSession(carId);
        if (!isMounted) return;
        setActiveSession(sessionData.session_id);
        setStatus('active');
      } catch (err) {
        console.error('Failed to init drive session', err);
        if (isMounted) setStatus('error');
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [carId]);

  useEffect(() => {
    if (!activeSession || status !== 'active' || !videoRef.current) return undefined;

    let isCancelled = false;
    const video = videoRef.current;

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMeshRef.current = faceMesh;

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      if (isCancelled) return;

      if (!results.multiFaceLandmarks?.length) {
        setFaceDetected(false);
        frameCounterRef.current = 0;
        return;
      }

      setFaceDetected(true);

      const landmarks = results.multiFaceLandmarks[0];
      const leftEAR = calcEAR(landmarks, LEFT_EYE);
      const rightEAR = calcEAR(landmarks, RIGHT_EYE);
      const avgEAR = (leftEAR + rightEAR) / 2;

      setEarValue(avgEAR);

      if (avgEAR < EAR_THRESHOLD) {
        frameCounterRef.current += 1;

        if (frameCounterRef.current >= CONSECUTIVE_FRAMES) {
          triggerAlert(avgEAR);
          frameCounterRef.current = 0;
        }
      } else {
        frameCounterRef.current = 0;
      }
    });

    const camera = new Camera(video, {
      onFrame: async () => {
        if (!isCancelled && video.readyState >= 2) {
          await faceMesh.send({ image: video });
        }
      },
      width: 640,
      height: 480,
    });
    cameraRef.current = camera;

    camera.start().catch((err) => {
      console.error('Failed to start camera', err);
      if (!isCancelled) setStatus('error');
    });

    return () => {
      isCancelled = true;
      cameraRef.current?.stop();
      cameraRef.current = null;
      faceMeshRef.current?.close();
      faceMeshRef.current = null;
      frameCounterRef.current = 0;

      if (clearAlertTimerRef.current) {
        window.clearTimeout(clearAlertTimerRef.current);
        clearAlertTimerRef.current = null;
      }

      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [activeSession, status, triggerAlert]);

  const handleEndSession = async () => {
    cameraRef.current?.stop();

    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    if (activeSession) {
      try {
        await endSession(activeSession);
      } catch (err) {
        console.error('Error ending session', err);
      }
    }

    navigate('/dashboard');
  };

  return (
    <div className="drive-session-container" style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <div className="topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0 }}>Active Drive Session</h1>
          <p style={{ color: '#888', margin: 0 }}>Monitoring driver alertness in real time</p>
        </div>
        <button className="btn btn-danger" onClick={handleEndSession}>
          <StopCircle size={18} />
          End Session
        </button>
      </div>

      {status === 'initializing' && (
        <div className="loading-screen" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner" />
          <p style={{ marginLeft: '12px' }}>Starting session...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="auth-error-box" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#331111', color: '#ff6b6b' }}>
          Failed to start camera or session. Please ensure camera permissions are granted.
        </div>
      )}

      <div style={{ display: status === 'active' ? 'flex' : 'none', flex: 1, gap: '24px' }}>
        <div style={{ flex: 2, position: 'relative', borderRadius: '16px', overflow: 'hidden', backgroundColor: '#000' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
          />
          {drowsyAlert && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 0, 0, 0.3)',
              border: '8px solid red',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              animation: 'pulse 1s infinite',
            }}>
              <h1 style={{ color: 'white', fontSize: '3rem', fontWeight: 'bold', textShadow: '2px 2px 4px #000', textAlign: 'center' }}>
                DROWSINESS DETECTED!
              </h1>
            </div>
          )}

          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '12px',
            borderRadius: '8px',
            color: 'white',
            fontFamily: 'monospace',
            fontSize: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {faceDetected ? <ScanFace size={16} /> : <UserRoundX size={16} />}
              Face Detected: <strong style={{ color: faceDetected ? '#51cf66' : '#ff6b6b' }}>{faceDetected ? 'YES' : 'NO'}</strong>
            </div>
            {faceDetected && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={16} />
                EAR Value: {earValue.toFixed(3)}
              </div>
            )}
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {drowsyAlert ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              Status: <strong style={{ color: drowsyAlert ? '#ff6b6b' : '#51cf66' }}>{drowsyAlert ? 'DROWSY' : 'AWAKE'}</strong>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Session Details</h3>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#888' }}>Car ID:</span> {carId}
            </div>
            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#888' }}>Session ID:</span> {activeSession}
            </div>
            <hr style={{ borderColor: '#333', margin: '16px 0' }} />
            <div style={{ color: drowsyAlert ? '#ff6b6b' : '#51cf66', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', marginTop: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
              {drowsyAlert ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
              {drowsyAlert ? 'ALERT' : 'SAFE'}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: inset 0 0 0 0 rgba(255,0,0,0.7); }
          50% { box-shadow: inset 0 0 100px 50px rgba(255,0,0,0.4); }
          100% { box-shadow: inset 0 0 0 0 rgba(255,0,0,0.7); }
        }
      `}</style>
    </div>
  );
}

export default DriveSessionPage;
