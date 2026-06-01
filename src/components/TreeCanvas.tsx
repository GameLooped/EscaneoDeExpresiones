import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { TreeNode } from '../logic/Parser';
import { Evaluator } from '../logic/Evaluator';
import type { EvalStep } from '../logic/Evaluator';
import { Play, RotateCcw, StepForward } from 'lucide-react';

interface TreeCanvasProps {
  rootNode: TreeNode;
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({ rootNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [steps, setSteps] = useState<EvalStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1); // -1 means initial tree
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Viewport state for pan & zoom
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initialize evaluator
  useEffect(() => {
    const evaluator = new Evaluator();
    const { steps } = evaluator.evaluate(rootNode);
    setSteps(steps);
    setCurrentStep(-1);
    
    // Auto-center on load
    if (containerRef.current) {
      setOffset({ x: containerRef.current.clientWidth / 2, y: 60 });
    }
  }, [rootNode]);

  // Drawing logic
  const drawTree = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Apply transformations
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    const activeTree = currentStep === -1 ? rootNode : steps[currentStep].tree;
    const highlightedNodeId = currentStep !== -1 ? steps[currentStep].evaluatedNodeId : null;

    // Layout calculation (simple recursive width division)
    const NODE_RADIUS = 25;
    const LEVEL_HEIGHT = 80;

    const calcLayout = (node: TreeNode, x: number, y: number, horizontalSpacing: number) => {
      // First draw lines to children
      if (node.left) {
        const childX = x - horizontalSpacing;
        const childY = y + LEVEL_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(x, y + NODE_RADIUS);
        ctx.lineTo(childX, childY - NODE_RADIUS);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        calcLayout(node.left, childX, childY, horizontalSpacing / 1.8);
      }
      
      if (node.right) {
        const childX = x + horizontalSpacing;
        const childY = y + LEVEL_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(x, y + NODE_RADIUS);
        ctx.lineTo(childX, childY - NODE_RADIUS);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();
        calcLayout(node.right, childX, childY, horizontalSpacing / 1.8);
      }

      // Draw node
      ctx.beginPath();
      ctx.arc(x, y, NODE_RADIUS, 0, 2 * Math.PI);
      
      // Node styling
      const isHighlighted = node.id === highlightedNodeId || node.isEvaluated;
      if (node.type === 'number') {
        ctx.fillStyle = isHighlighted ? '#a78bfa' : '#8b5cf6'; // Purple variations
      } else {
        ctx.fillStyle = isHighlighted ? '#f472b6' : '#ec4899'; // Pink variations
      }
      
      ctx.fill();
      if (isHighlighted) {
         ctx.shadowColor = ctx.fillStyle;
         ctx.shadowBlur = 15;
         ctx.stroke();
         ctx.shadowBlur = 0;
      }
      
      // Text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 18px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.value, x, y);
    };

    if (activeTree) {
      calcLayout(activeTree, 0, 0, 150);
    }

    ctx.restore();
  }, [rootNode, steps, currentStep, scale, offset]);

  useEffect(() => {
    drawTree();
  }, [drawTree]);

  // Playback logic
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isPlaying && currentStep < steps.length - 1) {
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1000);
    } else if (isPlaying && currentStep >= steps.length - 1) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length]);

  // Touch & Mouse handlers for Pan
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Wheel handler for Zoom
  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(0.5, prev + delta), 3));
  };

  return (
    <div style={styles.container} ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
      />

      <div className="glass-panel animate-fade-in" style={styles.controlsPanel}>
        <div style={styles.resultDisplay}>
          {currentStep === steps.length - 1 
            ? `Resultado final: ${steps[steps.length - 1].resultValue}`
            : currentStep === -1 
              ? "Árbol generado" 
              : `Resolviendo... ${steps[currentStep].resultValue}`}
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-secondary btn-icon" onClick={() => { setCurrentStep(-1); setIsPlaying(false); }}>
            <RotateCcw size={20} />
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={currentStep >= steps.length - 1}
          >
            <Play size={20} /> {isPlaying ? 'Pausar' : 'Animar'}
          </button>
          <button 
            className="btn btn-secondary btn-icon" 
            onClick={() => { if (currentStep < steps.length - 1) setCurrentStep(c => c + 1); setIsPlaying(false); }}
            disabled={currentStep >= steps.length - 1}
          >
            <StepForward size={20} />
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
          Puedes arrastrar y hacer scroll para moverte
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden'
  },
  canvas: {
    width: '100%',
    height: '100%',
    cursor: 'grab'
  },
  controlsPanel: {
    position: 'absolute',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    width: '90%',
    maxWidth: '400px'
  },
  resultDisplay: {
    fontSize: '1.25rem',
    fontWeight: 'bold',
    color: 'white'
  }
};
