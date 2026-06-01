import React, { useState, useEffect } from 'react';
import { CameraScanner } from './components/CameraScanner';
import { ExpressionEditor } from './components/ExpressionEditor';
import { TreeCanvas } from './components/TreeCanvas';
import { parseExpression } from './logic/Parser';
import type { TreeNode } from './logic/Parser';
import { Camera, Download, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import './index.css';

type AppState = 'scan' | 'edit' | 'canvas';

const APK_URL = import.meta.env.BASE_URL + 'MathTree-OCR.apk';

function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function App() {
  const [appState, setAppState] = useState<AppState>('scan');
  const [scannedText, setScannedText] = useState<string>('');
  const [rootNode, setRootNode] = useState<TreeNode | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [geminiKey, setGeminiKey] = useState<string>(localStorage.getItem('gemini_api_key') || '');
  const [tempKey, setTempKey] = useState<string>(geminiKey);

  useEffect(() => {
    // Show the download banner on mobile devices, but ONLY if we are NOT already in the native app
    if (isMobileDevice() && !Capacitor.isNativePlatform()) {
      setShowBanner(true);
    }
  }, []);

  const saveApiKey = () => {
    localStorage.setItem('gemini_api_key', tempKey);
    setGeminiKey(tempKey);
    setShowSettings(false);
  };

  const handleScan = (text: string) => {
    if (text) {
      setScannedText(text);
      setAppState('edit');
    } else {
      alert("No se pudo detectar ninguna fórmula. Intenta de nuevo.");
    }
  };

  const handleConfirmExpression = (text: string) => {
    const ast = parseExpression(text);
    if (ast) {
      setRootNode(ast);
      setAppState('canvas');
    } else {
      alert("La fórmula ingresada no es válida o no se puede procesar.");
    }
  };

  return (
    <div className="app-container" style={{ width: '100%', minHeight: '100dvh', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      
      {/* Settings Modal */}
      {showSettings && (
        <div style={styles.modalOverlay}>
          <div className="glass-panel" style={styles.modalContent}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: 'white' }}>⚙️ Ajustes de Inteligencia Artificial</h2>
              <button onClick={() => setShowSettings(false)} style={styles.bannerClose}><X size={20}/></button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Para leer fórmulas matemáticas escritas a mano a la perfección, esta aplicación puede conectarse al cerebro visual de Google Gemini 1.5 Flash. 
              <br/><br/>
              Consigue tu clave API gratis en <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" style={{color: '#3b82f6'}}>Google AI Studio</a>.
            </p>
            <input 
              type="password" 
              placeholder="Pega tu Gemini API Key aquí..."
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              style={styles.input}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setShowSettings(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveApiKey}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* APK Download Banner for mobile */}
      {showBanner && (
        <div style={styles.banner}>
          <div style={styles.bannerContent}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={styles.bannerIcon}>📱</div>
              <div>
                <p style={styles.bannerTitle}>¡Descarga la app nativa!</p>
                <p style={styles.bannerSubtitle}>Instala MathTree OCR en tu Android</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a href={APK_URL} download="MathTree-OCR.apk" className="btn btn-primary" style={styles.bannerButton}>
                <Download size={16} /> Descargar APK
              </a>
              <button onClick={() => setShowBanner(false)} style={styles.bannerClose}>
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>MathTree OCR</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {!Capacitor.isNativePlatform() && (
            <a href={APK_URL} download="MathTree-OCR.apk" className="btn btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem', textDecoration: 'none', backgroundColor: 'var(--success)' }}>
              <Download size={14} /> APK
            </a>
          )}
          {appState === 'canvas' && (
            <button className="btn btn-secondary" onClick={() => setAppState('scan')} style={{ padding: '8px 16px' }}>
              <Camera size={16} /> Nuevo
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.main}>
        {appState === 'scan' && (
          <CameraScanner onScan={handleScan} geminiKey={geminiKey} />
        )}
        
        {appState === 'edit' && (
          <div style={styles.editBg}>
            <ExpressionEditor 
              initialText={scannedText} 
              onConfirm={handleConfirmExpression} 
              onCancel={() => setAppState('scan')}
            />
          </div>
        )}
        
        {appState === 'canvas' && rootNode && (
          <TreeCanvas rootNode={rootNode} />
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    background: 'linear-gradient(135deg, #10b981, #059669)',
    padding: '12px 16px',
    zIndex: 100,
    animation: 'fadeIn 0.4s ease forwards',
  },
  bannerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '10px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  bannerIcon: {
    fontSize: '1.8rem',
  },
  bannerTitle: {
    margin: 0,
    fontWeight: 700,
    fontSize: '0.95rem',
    color: 'white',
  },
  bannerSubtitle: {
    margin: 0,
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.85)',
  },
  bannerButton: {
    padding: '8px 16px',
    fontSize: '0.85rem',
    textDecoration: 'none',
    backgroundColor: 'white',
    color: '#059669',
    boxShadow: 'none',
  },
  bannerClose: {
    background: 'none',
    border: 'none',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    padding: '4px',
  },
  header: {
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 20px',
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    zIndex: 50,
    position: 'relative',
    flexWrap: 'wrap',
    gap: '10px'
  },
  headerTitle: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    background: 'linear-gradient(to right, #3b82f6, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  editBg: {
    width: '100%',
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.2) 0%, transparent 70%)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  modalContent: {
    padding: '24px',
    width: '100%',
    maxWidth: '450px',
    display: 'flex',
    flexDirection: 'column'
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid var(--glass-border)',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: 'white',
    fontSize: '1rem',
    fontFamily: 'monospace'
  }
};

export default App;

