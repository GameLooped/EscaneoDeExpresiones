import React, { useState, useEffect } from 'react';
import { Play, Edit2, CheckCircle2 } from 'lucide-react';

interface ExpressionEditorProps {
  initialText: string;
  onConfirm: (text: string) => void;
  onCancel: () => void;
}

export const ExpressionEditor: React.FC<ExpressionEditorProps> = ({ initialText, onConfirm, onCancel }) => {
  const [text, setText] = useState(initialText);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!initialText) return;
    
    // 1. Extraer la línea que más se parece a una expresión matemática
    const lines = initialText.split('\n');
    let bestLine = initialText;
    let maxScore = -1;
    
    for (const line of lines) {
      // Contar caracteres puramente matemáticos (números y operadores)
      const mathChars = line.match(/[0-9+\-*/()=÷:xX.,]/g);
      const mathCount = mathChars ? mathChars.length : 0;
      
      // Contar letras (que suelen ser ruido)
      const letters = line.match(/[a-wy-zA-WY-Z]/g);
      const letterCount = letters ? letters.length : 0;
      
      // Puntuación: +1 por cada caracter matemático, -1 por cada letra
      const score = mathCount - letterCount;
      
      if (score > maxScore && mathCount > 0) {
        maxScore = score;
        bestLine = line;
      }
    }

    // 2. Limpiar la línea extraída
    let cleaned = bestLine.replace(/\s+/g, '');
    
    // 3. Normalizar operaciones básicas (enfoque en suma, resta, mult, div)
    cleaned = cleaned.replace(/[xX×•·]/g, '*'); // Multiplicación
    cleaned = cleaned.replace(/[÷:\\]/g, '/'); // División
    cleaned = cleaned.replace(/,/g, '.');      // Decimales
    // Nota: Ya no forzamos letras a números (a->4, s->5) porque corrompía las fórmulas reales.
    
    // 4. Filtrar estrictamente solo números, 4 operadores y paréntesis
    cleaned = cleaned.replace(/[^0-9+\-*/().]/g, '');
    
    // Evitar que queden operadores sueltos al inicio por error (ej: *5+3)
    cleaned = cleaned.replace(/^[\*/]+/, '');
    
    setText(cleaned);
  }, [initialText]);

  return (
    <div className="glass-panel animate-fade-in" style={styles.container}>
      <h3 style={styles.title}>Fórmula Detectada</h3>
      
      {isEditing ? (
        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          style={styles.input}
          autoFocus
        />
      ) : (
        <div style={styles.expressionDisplay}>
          {text || "No se detectó texto"}
        </div>
      )}

      <div style={styles.actions}>
        <button 
          className="btn btn-secondary" 
          onClick={() => isEditing ? setIsEditing(false) : onCancel()}
        >
          {isEditing ? 'Cancelar Edición' : 'Re-escanear'}
        </button>
        
        {isEditing ? (
          <button className="btn btn-primary" onClick={() => setIsEditing(false)}>
            <CheckCircle2 size={18} /> Guardar
          </button>
        ) : (
          <>
            <button className="btn btn-secondary btn-icon" onClick={() => setIsEditing(true)}>
              <Edit2 size={18} />
            </button>
            <button className="btn btn-primary" onClick={() => onConfirm(text)}>
              <Play size={18} /> Generar Árbol
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    zIndex: 10
  },
  title: {
    margin: 0,
    fontSize: '1.2rem',
    fontWeight: 600,
    color: 'var(--text-secondary)'
  },
  expressionDisplay: {
    fontSize: '2rem',
    fontWeight: 700,
    letterSpacing: '2px',
    textAlign: 'center',
    padding: '16px 0',
    wordBreak: 'break-all'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    fontSize: '1.5rem',
    backgroundColor: 'rgba(0,0,0,0.2)',
    border: '1px solid var(--glass-border)',
    borderRadius: '8px',
    color: 'white',
    fontFamily: 'Outfit',
    textAlign: 'center'
  },
  actions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    marginTop: '8px'
  }
};
