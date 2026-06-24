import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { startSession, endSession, analyzeFrame } from '../api';

function DriveSessionPage() {
  const { carId } = useParams();
  const navigate = useNavigate();
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [activeSession, setActiveSession] = useState(null);
  const [status, setStatus] = useState('initializing'); // initializing, active, error
  const [drowsyAlert, setDrowsyAlert] = useState(false);
  const [earValue, setEarValue] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);

  // Audio for alert using SpeechSynthesis for guaranteed playback
  const playAlert = () => {
    if (!window.speechSynthesis) return;
    if (window.speechSynthesis.speaking) return; // don't overlap speech
    
    const utterance = new SpeechSynthesisUtterance("Drowsiness detected. Please wake up.");
    utterance.rate = 1.1; // Slightly faster
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    // 1. Start the camera and the session
    async function init() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        const sessionData = await startSession(carId);
        setActiveSession(sessionData.session_id);
        setStatus('active');
      } catch (err) {
        console.error('Failed to init drive session', err);
        setStatus('error');
      }
    }
    
    init();

    return () => {
      // Cleanup camera on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [carId]);

  useEffect(() => {
    if (!activeSession || status !== 'active') return;

    let isRunning = true;

    const captureAndAnalyze = async () => {
      if (!isRunning) return;
      if (!videoRef.current || !canvasRef.current) {
        setTimeout(captureAndAnalyze, 100);
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setTimeout(captureAndAnalyze, 100);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = canvas.toDataURL('image/jpeg', 0.5); // base64

      try {
        const data = await analyzeFrame(frame, activeSession);
        
        setFaceDetected(data.face_detected);
        if (data.ear !== undefined) {
          setEarValue(data.ear);
        }

        if (data.alert) {
          setDrowsyAlert(true);
          playAlert();
        } else {
          setDrowsyAlert(false);
          // If alert stops, cancel any ongoing speech so it stops immediately
          if (window.speechSynthesis && window.speechSynthesis.speaking) {
             window.speechSynthesis.cancel();
          }
        }
      } catch (err) {
        console.error('Frame analysis failed', err);
      }

      // Chain the next frame. This fixes the massive delay issue by not queuing up 
      // requests while the backend is processing!
      if (isRunning) {
        setTimeout(captureAndAnalyze, 100);
      }
    };

    // Start the recursive loop
    captureAndAnalyze();

    return () => {
      isRunning = false;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, [activeSession, status]);

  const handleEndSession = async () => {
    // Optimistically stop the camera to give immediate feedback
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
          <p style={{ color: '#888', margin: 0 }}>Monitoring driver alertness in real-time</p>
        </div>
        <button className="btn btn-danger" onClick={handleEndSession}>
          🛑 End Session
        </button>
      </div>

      {status === 'initializing' && (
        <div className="loading-screen" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="spinner" />
          <p style={{ marginLeft: '12px' }}>Starting Camera & Session...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="auth-error-box" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#331111', color: '#ff6b6b' }}>
          Failed to start camera or session. Please ensure camera permissions are granted.
        </div>
      )}

      {/* Main drive layout, always rendered so videoRef is attached, but visually toggled */}
      <div style={{ display: status === 'active' ? 'flex' : 'none', flex: 1, gap: '24px' }}>
        {/* Main Video Area */}
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
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(255, 0, 0, 0.3)',
                border: '8px solid red',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                animation: 'pulse 1s infinite'
              }}>
                <h1 style={{ color: 'white', fontSize: '3rem', fontWeight: 'bold', textShadow: '2px 2px 4px #000' }}>
                  DROWSINESS DETECTED!
                </h1>
              </div>
            )}
            
            {/* Overlay stats */}
            <div style={{
                position: 'absolute',
                bottom: '16px', left: '16px',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '12px',
                borderRadius: '8px',
                color: 'white',
                fontFamily: 'monospace',
                fontSize: '14px'
            }}>
              <div>Face Detected: <strong style={{ color: faceDetected ? '#51cf66' : '#ff6b6b' }}>{faceDetected ? 'YES' : 'NO'}</strong></div>
              {faceDetected && <div>EAR Value: {earValue.toFixed(3)}</div>}
              <div style={{ marginTop: '4px' }}>Status: <strong style={{ color: drowsyAlert ? '#ff6b6b' : '#51cf66' }}>{drowsyAlert ? 'DROWSY' : 'AWAKE'}</strong></div>
            </div>
          </div>

          {/* Side panel for stats/info */}
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
              <div style={{ color: drowsyAlert ? '#ff6b6b' : '#51cf66', fontWeight: 'bold', fontSize: '1.2rem', textAlign: 'center', marginTop: '24px' }}>
                {drowsyAlert ? '⚠️ ALERT' : '✅ SAFE'}
              </div>
            </div>
          </div>
        </div>

      {/* Hidden canvas for extracting frames */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
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
