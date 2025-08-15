import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Palette, 
  Activity,
  TrendingUp,
  Clock,
  Grid3X3
} from "lucide-react";

interface HorizontalCanvasStatsProps {
  totalPixels: number;
  userPixels: number;
  activeUsers: number;
  lastActivity?: number;
}

export const HorizontalCanvasStats = ({ 
  totalPixels, 
  userPixels, 
  activeUsers, 
  lastActivity 
}: HorizontalCanvasStatsProps) => {
  const getTimeAgo = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const progressPercentage = (totalPixels / (1024 * 1024)) * 100;

  return (
    <div className="bg-transparent rounded-lg p-2">
      {/* Compact Header Stats */}
      <div className="flex items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-accent border-accent text-xs">
            <Users className="h-3 w-3 mr-1" />
            {activeUsers}
          </Badge>
          
          <Badge variant="outline" className="text-primary border-primary text-xs">
            <Grid3X3 className="h-3 w-3 mr-1" />
            {totalPixels.toLocaleString()}
          </Badge>
          
          <Badge variant="secondary" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            {userPixels.toLocaleString()} yours
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {getTimeAgo(lastActivity)}
        </div>
        
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1">
            <Progress value={progressPercentage} className="h-1.5 w-16" />
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {progressPercentage.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};