import React from 'react';
import { useAccount } from 'wagmi';

interface Pixel {
  x: number;
  y: number;
  color: string;
  owner?: string;
  timestamp?: number;
  irysId?: string;
  irysPayloadLength?: number;
}

interface CanvasBottomBarProps {
  pixels: Pixel[];
}

export const CanvasBottomBar = ({ pixels }: CanvasBottomBarProps) => {
  const { address } = useAccount();
  const lowerAddr = address?.toLowerCase();
  const activeUsers = Array.from(new Set(pixels.map(p => p.owner?.toLowerCase()).filter(Boolean))).length;
  const yourPixels = pixels.filter(p => p.owner && p.owner.toLowerCase() === lowerAddr).length;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Canvas Stats */}
        <div className="grid grid-cols-5 gap-4 text-sm text-center">
          <span className="text-foreground whitespace-nowrap">
            Total Pixels: <span className="font-medium">{pixels.length}</span>
          </span>
          <span className="text-foreground whitespace-nowrap">
            On Irys: <span className="font-medium">{pixels.filter(p => p.irysId).length}</span>
          </span>
          <span className="text-foreground whitespace-nowrap">
            Permanent: <span className="font-medium">{Math.round((pixels.filter(p => p.irysId).length / Math.max(1, pixels.length)) * 100)}%</span>
          </span>
          <span className="text-foreground whitespace-nowrap">
            Active Users: <span className="font-medium">{activeUsers}</span>
          </span>
          <span className="text-foreground whitespace-nowrap">
            Your Pixels: <span className="font-medium">{yourPixels}</span>
          </span>
        </div>
      </div>
    </div>
  );
};