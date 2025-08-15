import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Move, 
  Save, 
  Share2,
  Download,
  Grid,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { useIrys } from "@/hooks/useIrys";

interface Pixel {
  x: number;
  y: number;
  color: string;
  owner?: string;
  timestamp?: number;
  irysId?: string; // Added for Irys integration
  irysPayloadLength?: number; // bytes length of uploaded JSON
}

interface EnhancedCanvasProps {
  selectedColor: string;
  onPixelPlace: (pixel: Pixel) => void;
  pixels: Pixel[];
  onCanvasSave?: (canvasData: string) => void;
  canvasSize: { width: number; height: number };
  pixelPrice: number;
}

export const EnhancedPixelCanvas = ({ 
  selectedColor, 
  onPixelPlace, 
  pixels,
  onCanvasSave,
  canvasSize,
  pixelPrice
}: EnhancedCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragDistance, setDragDistance] = useState(0);
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number, y: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [hasMovedDuringDrag, setHasMovedDuringDrag] = useState(false);
  const { uploadPixelData, isUploading, isConnected } = useIrys();
  
  const CANVAS_SIZE = Math.max(1, Math.min(10000, Math.floor(canvasSize.width)));
  const MIN_ZOOM = 2;
  const MAX_ZOOM = 20;

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const pixelSize = zoom;
    const startX = Math.max(0, Math.floor(-pan.x / pixelSize));
    const startY = Math.max(0, Math.floor(-pan.y / pixelSize));
    const endX = Math.min(CANVAS_SIZE, Math.ceil((canvas.width - pan.x) / pixelSize));
    const endY = Math.min(CANVAS_SIZE, Math.ceil((canvas.height - pan.y) / pixelSize));

    // Draw grid only if enabled and not in preview mode
    if (showGrid && !isPreviewMode) {
      ctx.strokeStyle = 'hsl(var(--canvas-grid))';
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
    }

    // Draw pixels with enhanced styling
    pixels.forEach(pixel => {
      const xPos = pixel.x * pixelSize + pan.x;
      const yPos = pixel.y * pixelSize + pan.y;
      
      if (xPos >= -pixelSize && xPos <= canvas.width && 
          yPos >= -pixelSize && yPos <= canvas.height) {
        
        ctx.fillStyle = pixel.color;
        const padding = isPreviewMode ? 0 : 1;
        ctx.fillRect(xPos + padding, yPos + padding, pixelSize - padding, pixelSize - padding);
        
        // Add subtle glow for Irys-stored pixels
        if (pixel.irysId && !isPreviewMode) {
          ctx.shadowColor = 'hsl(var(--primary))';
          ctx.shadowBlur = 3;
          ctx.fillRect(xPos + padding, yPos + padding, pixelSize - padding, pixelSize - padding);
          ctx.shadowBlur = 0;
        }
      }
    });

    // Draw hover effect
    if (hoveredPixel && zoom >= 4 && !isPreviewMode) {
      const xPos = hoveredPixel.x * pixelSize + pan.x;
      const yPos = hoveredPixel.y * pixelSize + pan.y;
      
      ctx.strokeStyle = 'hsl(var(--pixel-hover))';
      ctx.lineWidth = 2;
      ctx.strokeRect(xPos, yPos, pixelSize, pixelSize);
      
      ctx.fillStyle = selectedColor + '80';
      ctx.fillRect(xPos + 1, yPos + 1, pixelSize - 1, pixelSize - 1);
    }
  }, [zoom, pan, pixels, hoveredPixel, selectedColor, showGrid, isPreviewMode]);

  const getPixelCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    const pixelX = Math.floor((x - pan.x) / zoom);
    const pixelY = Math.floor((y - pan.y) / zoom);
    
    if (pixelX >= 0 && pixelX < CANVAS_SIZE && pixelY >= 0 && pixelY < CANVAS_SIZE) {
      return { x: pixelX, y: pixelY };
    }
    return null;
  };

  const handleCanvasClick = async (e: React.MouseEvent) => {
    // Prevent pixel placement if has moved during drag
    if (isPreviewMode || hasMovedDuringDrag) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    const coords = getPixelCoords(e.clientX, e.clientY);
    if (coords) {
      // Competitive mode: always allow overwrite
      const newPixel: Pixel = {
        x: coords.x,
        y: coords.y,
        color: selectedColor,
        timestamp: Date.now()
      };
      
      // Invoke placement handler (Irys upload + blockchain tx handled downstream)
      try {
        await onPixelPlace(newPixel);
        // Success toast is handled downstream to avoid duplicates.
      } catch (error: any) {
        const msg = error?.message || 'Failed to place pixel';
        toast.error(msg);
      }
    }
  };

  // Unified pointer handling (mouse/touch)
  const handlePointerMove = (e: React.PointerEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    
    if (isDragging && clientX && clientY) {
      const deltaX = clientX - dragStart.x;
      const deltaY = clientY - dragStart.y;
      
      // Calculate total drag distance and mark as moved if distance > 1
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      setDragDistance(distance);
      
      if (distance > 1) {
        setHasMovedDuringDrag(true);
      }
      
      setPan(prev => {
        // Pan limits: prevent moving beyond (0,0)
        const maxPanX = 0;
        const maxPanY = 0;
        const minPanX = -(CANVAS_SIZE * zoom - (canvasRef.current?.width || 0));
        const minPanY = -(CANVAS_SIZE * zoom - (canvasRef.current?.height || 0));
        
        return {
          x: Math.max(minPanX, Math.min(maxPanX, prev.x + deltaX)),
          y: Math.max(minPanY, Math.min(maxPanY, prev.y + deltaY))
        };
      });
      setDragStart({ x: clientX, y: clientY });
    } else if (!isPreviewMode && clientX && clientY) {
      const coords = getPixelCoords(clientX, clientY);
      setHoveredPixel(coords);
    }
  };

  // Touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX, y: touch.clientY });
    }
  };

  // Touch end
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsDragging(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setHasMovedDuringDrag(false);
      setDragStart({ x: e.clientX, y: e.clientY });
      setDragDistance(0); // Reset drag distance
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Reset the move flag after a delay to allow click handler to read it
    setTimeout(() => setHasMovedDuringDrag(false), 100);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
    setZoom(newZoom);
  };

  const resetView = () => {
    setZoom(8);
    setPan({ x: 0, y: 0 });
    toast.success("View reset");
  };

  const saveCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const dataURL = canvas.toDataURL('image/png');
    onCanvasSave?.(dataURL);
    
    // Create download link
    const link = document.createElement('a');
    link.download = `pixel-canvas-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
    
    toast.success("Canvas saved!");
  };

  const shareCanvas = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Pixel Art',
          text: 'Check out my pixel art creation!',
          url: window.location.href
        });
      } catch (error) {
        toast.error("Sharing failed");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Canvas URL copied to clipboard!");
    }
  };

  // Responsive canvas sizing (larger defaults)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;
      
      const containerRect = container.getBoundingClientRect();
      
      // Desktop: height-based, Mobile: width-based
      const isMobile = window.innerWidth < 768;
      const padding = isMobile ? 12 : 24;
      
      let maxSize;
      if (isMobile) {
        // Mobile: width-based
        maxSize = Math.min(containerRect.width - padding, window.innerHeight * 0.8);
      } else {
        // Desktop: height-based only (no width limit)
        maxSize = window.innerHeight - 200; // 200px for header/footer/padding
      }
      
      const size = Math.max(400, maxSize); // min 400px
      
      // Square canvas resolution
      canvas.width = size;
      canvas.height = size;
      drawCanvas();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('orientationchange', resizeCanvas);

    // Add wheel event listener with passive: false to ensure preventDefault works
    const canvasContainer = canvas.parentElement;
    if (canvasContainer) {
      const wheelHandler = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -1 : 1;
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta));
        setZoom(newZoom);
      };
      
      canvasContainer.addEventListener('wheel', wheelHandler, { passive: false });
      
      return () => {
        window.removeEventListener('resize', resizeCanvas);
        window.removeEventListener('orientationchange', resizeCanvas);
        canvasContainer.removeEventListener('wheel', wheelHandler);
      };
    }

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('orientationchange', resizeCanvas);
    };
  }, [drawCanvas, zoom]);

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
    <div className="w-full">
      {/* Canvas Controls - Responsive */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 p-2 bg-card/50 rounded-lg border">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-accent border-accent text-xs">
            {pixels.filter(p => p.irysId).length} on Irys
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Enhanced Canvas
          </span>
        </div>
        
        <div className="flex items-center gap-1 flex-wrap">
          {/* Zoom Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.max(MIN_ZOOM, zoom - 1))}
            disabled={zoom <= MIN_ZOOM}
            className="p-1 h-8 w-8"
          >
            <ZoomOut className="h-3 w-3" />
          </Button>
          <span className="text-xs text-muted-foreground px-1 min-w-[30px] text-center">
            {zoom}x
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoom(Math.min(MAX_ZOOM, zoom + 1))}
            disabled={zoom >= MAX_ZOOM}
            className="p-1 h-8 w-8"
          >
            <ZoomIn className="h-3 w-3" />
          </Button>
          
          {/* View Controls */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            className="p-1 h-8 w-8"
          >
            <Grid className="h-3 w-3" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="p-1 h-8 w-8"
          >
            {isPreviewMode ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={resetView}
            className="p-1 h-8 w-8"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          
          {/* Action Controls - Hidden on mobile */}
          <div className="hidden sm:flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={saveCanvas}
              className="p-1 h-8 w-8"
            >
              <Download className="h-3 w-3" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={shareCanvas}
              className="p-1 h-8 w-8"
            >
              <Share2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="relative w-full aspect-square overflow-hidden rounded-lg border border-border bg-canvas-bg">
        <canvas
          ref={canvasRef}
          className={`block w-full h-full bg-canvas-bg ${isPreviewMode ? 'cursor-grab' : 'cursor-crosshair'} touch-none`}
          onClick={handleCanvasClick}
          onPointerMove={handlePointerMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={(e) => handlePointerMove(e as any)}
          onTouchEnd={handleTouchEnd}
        />
        
        {/* Status Overlays */}
        {hoveredPixel && !isPreviewMode && (
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
              Panning...
            </div>
          </div>
        )}
        
        {isPreviewMode && (
          <div className="absolute top-2 left-2 bg-accent/90 backdrop-blur-sm px-3 py-2 rounded-lg border border-border">
            <div className="flex items-center gap-2 text-sm text-accent-foreground">
              <Eye className="h-4 w-4" />
              Preview Mode
            </div>
          </div>
        )}
        
        {isUploading && (
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-card p-4 rounded-lg border border-border">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="text-sm font-medium">Uploading to Irys...</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3 text-center text-xs text-muted-foreground">
        {isPreviewMode 
          ? "Preview mode • Drag to pan • Scroll to zoom" 
          : "Click to place pixels • Drag to pan • Scroll to zoom"
        }
      </div>
    </div>
  );
};