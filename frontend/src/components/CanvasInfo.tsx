import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Grid3X3, Coins, TrendingUp } from "lucide-react";

interface CanvasInfoProps {
  canvasSize: { width: number; height: number };
  pixelPrice: number;
  maxSize: { width: number; height: number };
  totalPixels: number;
}

export const CanvasInfo = ({
  canvasSize,
  pixelPrice,
  maxSize,
  totalPixels
}: CanvasInfoProps) => {
  const filledPixels = totalPixels;
  const totalCanvasPixels = canvasSize.width * canvasSize.height;
  const fillPercentage = (filledPixels / totalCanvasPixels) * 100;

  return (
    <Card className="p-4 border-border bg-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-secondary/10">
          <Info className="h-5 w-5 text-secondary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Canvas Information</h3>
          <p className="text-sm text-muted-foreground">Current statistics</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Canvas Size */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Canvas Size</span>
          </div>
          <Badge variant="outline" className="font-mono">
            {canvasSize.width} × {canvasSize.height}
          </Badge>
        </div>

        {/* Pixel Price */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium">Pixel Price</span>
          </div>
          <Badge variant="outline" className="text-accent font-mono">
            {pixelPrice < 0.001 ? `${(pixelPrice * 1000).toFixed(1)} mIRYS` : `${pixelPrice.toFixed(4)} IRYS`}
          </Badge>
        </div>

        {/* Canvas Fill Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Canvas Fill</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {filledPixels.toLocaleString()} / {totalCanvasPixels.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(fillPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            {fillPercentage.toFixed(1)}% filled
          </div>
        </div>


        {/* Maximum Size */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Maximum Size</span>
          </div>
          <Badge variant="outline" className="font-mono">
            {maxSize.width} × {maxSize.height}
          </Badge>
        </div>

      </div>
    </Card>
  );
};