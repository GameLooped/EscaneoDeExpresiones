import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { TreeNode } from '../logic/Parser';
import { Evaluator } from '../logic/Evaluator';
import type { EvalStep } from '../logic/Evaluator';
import { Play, RotateCcw, StepForward, Pause } from 'lucide-react';

interface TreeCanvasProps {
  rootNode: TreeNode;
}

// Calculate the depth of the tree for spacing
function treeDepth(node: TreeNode | undefined): number {
  if (!node) return 0;
  return 1 + Math.max(treeDepth(node.left), treeDepth(node.right));
}

export const TreeCanvas: React.FC<TreeCanvasProps> = ({ rootNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [steps, setSteps] = useState<EvalStep[]>([]);
  const [snapshots, setSnapshots] = useState<TreeNode[]>([]);
  const [currentStep, setCurrentStep] = useState(-1); // -1 = initial tree
  const [isPlaying, setIsPlaying] = useState(false);
  const [finalResult, setFinalResult] = useState<number | null>(null);

  // Viewport state for pan & zoom
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Initialize evaluator
  useEffect(() => {
    const evaluator = new Evaluator();
    const { result, steps, snapshots } = evaluator.evaluate(rootNode);
    setSteps(steps);
    setSnapshots(snapshots);
    setFinalResult(result);
    setCurrentStep(-1);

    // Auto-center based on tree depth and screen size
    if (containerRef.current) {
      const depth = treeDepth(rootNode);
      const isMobile = window.innerWidth < 600;
      
      let autoScale = 1;
      if (isMobile) {
        autoScale = depth > 3 ? 0.45 : 0.6;
      } else {
        autoScale = depth > 4 ? 0.7 : 1;
      }
      
      setScale(autoScale);
      setOffset({ x: containerRef.current.clientWidth / 2, y: isMobile ? 40 : 60 });
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

    // Determine which tree snapshot to show
    // snapshots[0] = original tree, snapshots[1] = after step 0 resolved, etc.
    const activeTree = currentStep === -1 ? snapshots[0] : snapshots[currentStep];
    const activeStep = currentStep >= 0 && currentStep < steps.length ? steps[currentStep] : null;

    // Set of node IDs that are "flashing" (just got evaluated)
    const flashingIds = new Set<string>();
    if (activeStep) {
      flashingIds.add(activeStep.nodeId);
    }

    const NODE_RADIUS = 28;
    const LEVEL_HEIGHT = 90;

    const drawNode = (node: TreeNode, x: number, y: number, horizontalSpacing: number) => {
      // Draw lines to children FIRST (behind nodes)
      if (node.left) {
        const childX = x - horizontalSpacing;
        const childY = y + LEVEL_HEIGHT;
        
        // Line gradient
        const grad = ctx.createLinearGradient(x, y + NODE_RADIUS, childX, childY - NODE_RADIUS);
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
        grad.addColorStop(1, 'rgba(236, 72, 153, 0.3)');
        
        ctx.beginPath();
        ctx.moveTo(x, y + NODE_RADIUS);
        ctx.lineTo(childX, childY - NODE_RADIUS);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        drawNode(node.left, childX, childY, horizontalSpacing / 1.8);
      }

      if (node.right) {
        const childX = x + horizontalSpacing;
        const childY = y + LEVEL_HEIGHT;
        
        const grad = ctx.createLinearGradient(x, y + NODE_RADIUS, childX, childY - NODE_RADIUS);
        grad.addColorStop(0, 'rgba(139, 92, 246, 0.5)');
        grad.addColorStop(1, 'rgba(236, 72, 153, 0.3)');
        
        ctx.beginPath();
        ctx.moveTo(x, y + NODE_RADIUS);
        ctx.lineTo(childX, childY - NODE_RADIUS);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 2.5;
        ctx.stroke();
        drawNode(node.right, childX, childY, horizontalSpacing / 1.8);
      }

      // Determine node colors and state
      const isFlashing = flashingIds.has(node.id);
      const wasEvaluated = node.isEvaluated === true;

      // Draw glow behind flashing nodes
      if (isFlashing) {
        ctx.save();
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 25;
        ctx.beginPath();
        ctx.arc(x, y, NODE_RADIUS + 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
        ctx.fill();
        ctx.restore();
      }

      // Draw node circle
      ctx.beginPath();
      ctx.arc(x, y, NODE_RADIUS, 0, 2 * Math.PI);

      if (isFlashing) {
        // Green glow for the node that just resolved
        ctx.fillStyle = '#10b981';
      } else if (wasEvaluated) {
        // Soft teal for previously resolved nodes
        ctx.fillStyle = '#06b6d4';
      } else if (node.type === 'number') {
        // Purple for number leaves
        ctx.fillStyle = '#8b5cf6';
      } else {
        // Pink for operators
        ctx.fillStyle = '#ec4899';
      }

      ctx.fill();

      // Subtle border
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Node label text
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Truncate long decimals for display
      let label = node.value;
      if (node.type === 'number' && label.length > 6) {
        label = parseFloat(label).toFixed(2);
      }
      ctx.fillText(label, x, y);
    };

    if (activeTree) {
      const depth = treeDepth(activeTree);
      const baseSpacing = Math.max(80, depth * 50);
      drawNode(activeTree, 0, 0, baseSpacing);
    }

    ctx.restore();
  }, [snapshots, steps, currentStep, scale, offset]);

  useEffect(() => {
    drawTree();
  }, [drawTree]);

  // Playback logic
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    // Allow currentStep to reach steps.length (the final snapshot state)
    if (isPlaying && currentStep < steps.length) {
      timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 1500); // Slightly slower for visibility
    } else if (isPlaying && currentStep >= steps.length) {
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, steps.length]);

  // Pan handlers
  const [initialPinchDist, setInitialPinchDist] = useState<number | null>(null);

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      // 2 fingers
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      setInitialPinchDist(Math.sqrt(dx * dx + dy * dy));
      return;
    }
    
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if ('touches' in e && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (initialPinchDist) {
        const delta = dist - initialPinchDist;
        setScale(prev => Math.min(Math.max(0.3, prev + delta * 0.005), 3));
      }
      setInitialPinchDist(dist);
      return;
    }

    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({ x: clientX - dragStart.x, y: clientY - dragStart.y });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setInitialPinchDist(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale(prev => Math.min(Math.max(0.3, prev + delta), 3));
  };

  // Format the step description
  const getStepDescription = (): string => {
    if (currentStep === -1) {
      return 'Árbol generado — Presiona ▶ Resolver';
    }
    if (currentStep >= steps.length) {
      return `✅ Resultado final: ${finalResult}`;
    }
    const step = steps[currentStep];
    return `${formatNum(step.leftValue)} ${step.operator} ${formatNum(step.rightValue)} = ${formatNum(step.resultValue)}`;
  };

  const isFinished = currentStep >= steps.length && currentStep !== -1;

  return (
    <div style={styles.container} ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
      />

      <div className="glass-panel animate-fade-in" style={styles.controlsPanel}>
        <div style={styles.resultDisplay}>
          {getStepDescription()}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => { setCurrentStep(-1); setIsPlaying(false); }}
            title="Reiniciar"
          >
            <RotateCcw size={20} />
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              if (isFinished) {
                // Reset and replay
                setCurrentStep(-1);
                setTimeout(() => {
                  setCurrentStep(0);
                  setIsPlaying(true);
                }, 200);
              } else if (currentStep === -1) {
                setCurrentStep(0);
                setIsPlaying(true);
              } else {
                setIsPlaying(!isPlaying);
              }
            }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            {isFinished ? 'Repetir' : isPlaying ? 'Pausar' : 'Resolver'}
          </button>
          <button
            className="btn btn-secondary btn-icon"
            onClick={() => {
              setIsPlaying(false);
              if (currentStep === -1) {
                setCurrentStep(0);
              } else if (currentStep < steps.length - 1) {
                setCurrentStep(c => c + 1);
              }
            }}
            disabled={isFinished}
            title="Siguiente paso"
          >
            <StepForward size={20} />
          </button>
        </div>

        {currentStep >= 0 && !isFinished && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Paso {currentStep + 1} de {steps.length}
          </p>
        )}
        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Arrastra para mover · Scroll para zoom
        </p>
      </div>
    </div>
  );
};

function formatNum(n: number): string {
  if (Number.isInteger(n)) return n.toString();
  return parseFloat(n.toFixed(4)).toString();
}

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
    bottom: '20px',
    left: '16px',
    right: '16px',
    margin: '0 auto',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    maxWidth: '420px',
    maxHeight: '30vh',
    overflowY: 'auto'
  },
  resultDisplay: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center'
  }
};
