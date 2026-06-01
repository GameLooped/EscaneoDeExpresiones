import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, Upload } from 'lucide-react';
import Tesseract from 'tesseract.js';
import { Capacitor } from '@capacitor/core';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface CameraScannerProps {
  onScan: (text: string) => void;
  geminiKey?: string;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, geminiKey }) => {
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

  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const runGemini = async (base64Data: string): Promise<string> => {
    if (!geminiKey) throw new Error("No Gemini API Key");
    const genAI = new GoogleGenerativeAI(geminiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "Eres un experto en matemáticas leyendo fórmulas escritas a mano. Extrae la expresión matemática exacta de esta imagen. Tu respuesta DEBE contener ÚNICAMENTE la fórmula matemática final lista para ser evaluada, usando dígitos y los operadores matemáticos básicos (+, -, *, /). NO uses markdown, NO uses espacios, NO devuelvas texto explicativo, solo la pura ecuación.";
    
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: "image/png"
        }
      }
    ]);
    return result.response.text().trim();
  };

  const processImage = async (dataUrl: string) => {
    const base64Data = dataUrl.split(',')[1];

    if (geminiKey) {
      try {
        const text = await runGemini(base64Data);
        onScan(text);
        return;
      } catch (err) {
        console.error("Gemini failed, falling back to OCR", err);
      }
    }

    if (Capacitor.isNativePlatform()) {
      try {
        const result = await CapacitorPluginMlKitTextRecognition.detectText({
          base64Image: base64Data,
          rotation: 0
        });
        onScan(result.text.trim());
      } catch (err) {
        console.error("ML Kit Error:", err);
        alert("Error con el lector ML Kit.");
      }
    } else {
      try {
        const worker = await Tesseract.createWorker('eng', 1);
        await worker.setParameters({
          tessedit_char_whitelist: '0123456789+-*/()xX÷= ',
        });
        const result = await worker.recognize(dataUrl);
        await worker.terminate();
        onScan(result.data.text.trim());
      } catch (err) {
        console.error("OCR Error:", err);
      }
    }
  };

  const captureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.filter = 'grayscale(100%) contrast(300%)';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      const dataUrl = canvas.toDataURL('image/png');
      await processImage(dataUrl);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setIsScanning(false);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        if (!canvasRef.current) {
          setIsScanning(false);
          return;
        }
        const canvas = canvasRef.current;
        const maxDim = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w *= ratio;
          h *= ratio;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsScanning(false);
          return;
        }
        
        ctx.filter = 'grayscale(100%) contrast(300%)';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        try {
          const enhancedDataUrl = canvas.toDataURL('image/png');
          await processImage(enhancedDataUrl);
        } finally {
          setIsScanning(false);
        }
      };
      img.onerror = () => setIsScanning(false);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
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
        <div style={{ display: 'flex', gap: '16px' }}>
          <button className="btn btn-primary btn-icon" onClick={captureAndScan} disabled={isScanning} style={{ width: 64, height: 64 }} title="Tomar foto">
            <Camera size={32} />
          </button>
          
          <label className="btn btn-secondary btn-icon" style={{ width: 64, height: 64, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Subir imagen">
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload} 
              style={{ display: 'none' }}
              disabled={isScanning}
            />
            <Upload size={32} />
          </label>
        </div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Apunta a una fórmula o sube una imagen</p>
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
