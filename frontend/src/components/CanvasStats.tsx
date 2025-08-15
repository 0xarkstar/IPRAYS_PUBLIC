import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Palette, 
  Activity,
  TrendingUp,
  Clock
} from "lucide-react";

interface CanvasStatsProps {
  totalPixels: number;
  userPixels: number;
  activeUsers: number;
  lastActivity?: number;
}

export const CanvasStats = ({ 
  totalPixels, 
  userPixels, 
  activeUsers, 
  lastActivity 
}: CanvasStatsProps) => {
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

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-accent/10">
          <Activity className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Canvas Stats</h3>
          <p className="text-sm text-muted-foreground">Live activity</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Total Pixels */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Total Pixels</span>
          </div>
          <Badge variant="outline" className="font-mono">
            {totalPixels.toLocaleString()}
          </Badge>
        </div>

        {/* User Pixels */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">Your Pixels</span>
          </div>
          <Badge variant="secondary" className="font-mono">
            {userPixels.toLocaleString()}
          </Badge>
        </div>

        {/* Active Users */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-secondary" />
            <span className="text-sm text-muted-foreground">Active Users</span>
          </div>
          <Badge variant="outline" className="font-mono">
            {activeUsers}
          </Badge>
        </div>

        {/* Last Activity */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Last Activity</span>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            {getTimeAgo(lastActivity)}
          </span>
        </div>

        {/* Canvas Progress */}
        <div className="pt-3 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Canvas Progress</span>
            <span className="text-xs text-muted-foreground">
              {((totalPixels / (1024 * 1024)) * 100).toFixed(2)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${Math.min((totalPixels / (1024 * 1024)) * 100, 100)}%` 
              }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {(1024 * 1024 - totalPixels).toLocaleString()} pixels remaining
          </div>
        </div>
      </div>
    </Card>
  );
};