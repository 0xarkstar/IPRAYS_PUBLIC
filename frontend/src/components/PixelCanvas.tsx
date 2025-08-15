import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, RotateCcw, Move } from "lucide-react";
import { toast } from "sonner";

interface Pixel {
  x: number;
  y: number;
  color: string;
  owner?: string;
  timestamp?: number;
}

interface CanvasProps {
  selectedColor: string;
  onPixelPlace: (pixel: Pixel) => void;
  pixels: Pixel[];
  canvasSize: { width: number; height: number };
  pixelPrice: number;
}

export const PixelCanvas = ({ selectedColor, onPixelPlace, pixels, canvasSize, pixelPrice }: CanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number, y: number } | null>(null);
  
  const CANVAS_SIZE = Math.max(1, Math.min(10000, Math.floor(canvasSize.width))); // clamp for safety
  const MIN_ZOOM = 2;
  const MAX_ZOOM = 20;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate visible area
    const pixelSize = zoom;
    const startX = Math.max(0, Math.floor(-pan.x / pixelSize));
    const startY = Math.max(0, Math.floor(-pan.y / pixelSize));
    const endX = Math.min(CANVAS_SIZE, Math.ceil((canvas.width - pan.x) / pixelSize));
    const endY = Math.min(CANVAS_SIZE, Math.ceil((canvas.height - pan.y) / pixelSize));

    // Draw grid
    ctx.strokeStyle = '#2a2a3a';
    ctx.lineWidth = 0.5;
    
    for (let x = startX; x <= endX; x++) {
      const xPos = x * pixelSize + pan.x;
      ctx.beginPath();
      ctx.moveTo(xPos, 0);
      ctx.lineTo(xPos, canvas.height);
      ctx.stroke();
    }
    
    for (let y = startY; y <= endY; y++) {
      const yPos = y * pixelSize + pan.y;
      ctx.beginPath();
      ctx.moveTo(0, yPos);
      ctx.lineTo(canvas.width, yPos);
      ctx.stroke();
    }

    // Draw pixels
    pixels.forEach(pixel => {
      const xPos = pixel.x * pixelSize + pan.x;
      const yPos = pixel.y * pixelSize + pan.y;
      
      if (xPos >= -pixelSize && xPos <= canvas.width && 
          yPos >= -pixelSize && yPos <= canvas.height) {
        ctx.fillStyle = pixel.color;
        ctx.fillRect(xPos + 1, yPos + 1, pixelSize - 1, pixelSize - 1);
      }
    });

    // Draw hover effect
    if (hoveredPixel && zoom >= 4) {
      const xPos = hoveredPixel.x * pixelSize + pan.x;
      const yPos = hoveredPixel.y * pixelSize + pan.y;
      
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.strokeRect(xPos, yPos, pixelSize, pixelSize);
      
      // Preview color
      ctx.fillStyle = selectedColor + '80'; // Semi-transparent
      ctx.fillRect(xPos + 1, yPos + 1, pixelSize - 1, pixelSize - 1);
    }
  }, [zoom, pan, pixels, hoveredPixel, selectedColor]);

  const getPixelCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const pixelX = Math.floor((x - pan.x) / zoom);
    const pixelY = Math.floor((y - pan.y) / zoom);
    
    if (pixelX >= 0 && pixelX < CANVAS_SIZE && pixelY >= 0 && pixelY < CANVAS_SIZE) {
      return { x: pixelX, y: pixelY };
    }
    return null;
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    const coords = getPixelCoords(e.clientX, e.clientY);
    if (coords) {
      const existingPixel = pixels.find(p => p.x === coords.x && p.y === coords.y);
      if (existingPixel) {
        toast.info(`Pixel already placed by ${existingPixel.owner || 'unknown'}`);
        return;
      }
      
      const newPixel: Pixel = {
        x: coords.x,
        y: coords.y,
        color: selectedColor,
        owner: 'you',
        timestamp: Date.now()
      };
      
      onPixelPlace(newPixel);
      toast.success(`Pixel placed at (${coords.x}, ${coords.y}) for ${pixelPrice.toFixed(3)} mIrys`);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      setDragStart({ x: e.clientX, y: e.clientY });
    } else {
      const coords = getPixelCoords(e.clientX, e.clientY);
      setHoveredPixel(coords);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    setZoom(newZoom);
  };

  const resetView = () => {
    setZoom(8);
    setPan({ x: 0, y: 0 });
    toast.success("View reset");
  };

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseLeave = () => {
      setHoveredPixel(null);
      setIsDragging(false);
    };

    canvas.addEventListener('mouseleave', handleMouseLeave);
    return () => canvas.removeEventListener('mouseleave', handleMouseLeave);
  }, []);

  return (
    <Card className="p-4 canvas-container">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground">Pixel Canvas</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.max(MIN_ZOOM, zoom - 1))}
            disabled={zoom <= MIN_ZOOM}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            {zoom}x
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.min(MAX_ZOOM, zoom + 1))}
            disabled={zoom >= MAX_ZOOM}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="relative overflow-hidden rounded-lg border border-border">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="block cursor-crosshair bg-canvas-bg"
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onWheel={handleWheel}
        />
        
        {hoveredPixel && (
          <div className="absolute top-2 right-2 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
            <div className="text-sm text-foreground">
              Position: ({hoveredPixel.x}, {hoveredPixel.y})
            </div>
          <div className="text-xs text-muted-foreground">
              Cost: {pixelPrice.toFixed(3)} IRYS
            </div>
          </div>
        )}
        
        {isDragging && (
          <div className="absolute bottom-2 left-2 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Move className="h-4 w-4" />
              Dragging...
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-4 text-center text-sm text-muted-foreground">
        Click to place pixels • Drag to pan • Scroll to zoom
      </div>
    </Card>
  );
};