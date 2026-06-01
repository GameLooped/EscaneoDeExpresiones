import React, { useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import Tesseract from 'tesseract.js';

interface CameraScannerProps {
  onScan: (text: string) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("No se pudo acceder a la cámara.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Auto-start on mount
  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw current frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Preprocessing could go here (grayscale, contrast)
      const dataUrl = canvas.toDataURL('image/png');
      // Use createWorker to restrict characters and improve OCR accuracy for math formulas
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: m => console.log(m)
      });
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789+-*/()xX÷= ',
      });
      const result = await worker.recognize(dataUrl);
      await worker.terminate();
      
      const text = result.data.text.trim();
      onScan(text);
    } catch (err) {
      console.error("OCR Error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="camera-container" style={styles.container}>
      <div className="glass-panel" style={styles.videoWrapper}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          style={styles.video}
        />
        {isScanning && (
          <div style={styles.scanningOverlay}>
            <RefreshCw className="spinner" size={32} />
            <p>Procesando imagen...</p>
          </div>
        )}
      </div>
      
      <div style={styles.controls}>
        <button className="btn btn-primary btn-icon" onClick={captureAndScan} disabled={isScanning} style={{ width: 64, height: 64 }}>
          <Camera size={32} />
        </button>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Apunta a una fórmula y captura</p>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
    padding: '20px'
  },
  videoWrapper: {
    width: '100%',
    maxWidth: '500px',
    maxHeight: '60vh',
    aspectRatio: '3/4',
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: '16px',
  },
  video: {
    width: '100%',
    height: '100%',
    objectFit: 'cover'
  },
  scanningOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    gap: '12px'
  },
  controls: {
    marginTop: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  }
};
