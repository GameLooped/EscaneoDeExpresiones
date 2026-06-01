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

  useEffect(() => {
    // Show the download banner on mobile devices, but ONLY if we are NOT already in the native app
    if (isMobileDevice() && !Capacitor.isNativePlatform()) {
      setShowBanner(true);
    }
  }, []);

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
          <CameraScanner onScan={handleScan} />
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
  }
};

export default App;

