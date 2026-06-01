import React, { useState, useEffect } from 'react';
import { CameraScanner } from './components/CameraScanner';
import { ExpressionEditor } from './components/ExpressionEditor';
import { TreeCanvas } from './components/TreeCanvas';
import { parseExpression } from './logic/Parser';
import type { TreeNode } from './logic/Parser';
import { Camera } from 'lucide-react';
import './index.css';

type AppState = 'scan' | 'edit' | 'canvas';

function App() {
  const [appState, setAppState] = useState<AppState>('scan');
  const [scannedText, setScannedText] = useState<string>('');
  const [rootNode, setRootNode] = useState<TreeNode | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
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
    <div className="app-container" style={{ width: '100%', height: '100vh', position: 'relative' }}>
      
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>MathTree OCR</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {deferredPrompt && (
            <button className="btn btn-primary" onClick={handleInstallClick} style={{ padding: '8px 16px', backgroundColor: 'var(--success)' }}>
              📥 Descargar App
            </button>
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
  header: {
    height: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    zIndex: 50,
    position: 'relative'
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
    height: 'calc(100vh - 60px)',
    position: 'relative'
  },
  editBg: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.2) 0%, transparent 70%)'
  }
};

export default App;
