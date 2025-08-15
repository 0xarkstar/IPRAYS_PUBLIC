import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

export interface OptimisticPixel {
  x: number;
  y: number;
  color: string;
  timestamp: number;
  isOptimistic: true;
  transactionId?: string;
}

export interface PixelData {
  x: number;
  y: number;
  color: string;
  owner?: string;
  timestamp: number;
  isOptimistic?: boolean;
  transactionId?: string;
}

export const useOptimisticCanvas = () => {
  const [optimisticPixels, setOptimisticPixels] = useState<Map<string, OptimisticPixel>>(new Map());
  const [pendingTransactions, setPendingTransactions] = useState<Map<string, OptimisticPixel>>(new Map());

  // Add optimistic pixel
  const addOptimisticPixel = useCallback((x: number, y: number, color: string, transactionId?: string) => {
    const key = `${x},${y}`;
    const pixel: OptimisticPixel = {
      x,
      y,
      color,
      timestamp: Date.now(),
      isOptimistic: true,
      transactionId
    };

    setOptimisticPixels(prev => new Map(prev).set(key, pixel));
    
    if (transactionId) {
      setPendingTransactions(prev => new Map(prev).set(transactionId, pixel));
    }

    console.log(`Added optimistic pixel at (${x}, ${y}) with color ${color}`);
  }, []);

  // Remove optimistic pixel after confirmation
  const removeOptimisticPixel = useCallback((x: number, y: number, transactionId?: string) => {
    const key = `${x},${y}`;
    
    setOptimisticPixels(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });

    if (transactionId) {
      setPendingTransactions(prev => {
        const newMap = new Map(prev);
        newMap.delete(transactionId);
        return newMap;
      });
    }

    console.log(`Removed optimistic pixel at (${x}, ${y})`);
  }, []);

  // Rollback optimistic pixel on failure
  const rollbackOptimisticPixel = useCallback((x: number, y: number, reason?: string) => {
    const key = `${x},${y}`;
    const pixel = optimisticPixels.get(key);
    
    if (pixel) {
      setOptimisticPixels(prev => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });

      if (pixel.transactionId) {
        setPendingTransactions(prev => {
          const newMap = new Map(prev);
          newMap.delete(pixel.transactionId!);
          return newMap;
        });
      }

      const message = reason ? `Pixel (${x}, ${y}) placement failed: ${reason}` : `Pixel (${x}, ${y}) placement failed`;
      toast.error(message);
      
      console.log(`Rolled back optimistic pixel at (${x}, ${y}):`, reason);
    }
  }, [optimisticPixels]);

  // Confirm optimistic pixel by tx id
  const confirmOptimisticPixel = useCallback((transactionId: string) => {
    const pixel = pendingTransactions.get(transactionId);
    if (pixel) {
      removeOptimisticPixel(pixel.x, pixel.y, transactionId);
      toast.success(`Pixel placed at (${pixel.x}, ${pixel.y})`);
    }
  }, [pendingTransactions, removeOptimisticPixel]);

  // Cleanup expired optimistic pixels (after 30s)
  const cleanupExpiredPixels = useCallback(() => {
    const now = Date.now();
    const expiredTime = 30000; // 30 seconds

    setOptimisticPixels(prev => {
      const newMap = new Map(prev);
      let cleanedCount = 0;

      for (const [key, pixel] of newMap.entries()) {
        if (now - pixel.timestamp > expiredTime) {
          newMap.delete(key);
          cleanedCount++;
          
          // Also remove from tx map
          if (pixel.transactionId) {
            setPendingTransactions(pendingMap => {
              const newPendingMap = new Map(pendingMap);
              newPendingMap.delete(pixel.transactionId!);
              return newPendingMap;
            });
          }
        }
      }

      if (cleanedCount > 0) {
        console.log(`Cleaned up ${cleanedCount} expired optimistic pixels`);
        toast.warning(`${cleanedCount} unconfirmed optimistic pixels expired`);
      }

      return newMap;
    });
  }, []);

  // Global rollback event listener
  useEffect(() => {
    const handleRollback = (event: CustomEvent) => {
      const { x, y, reason } = event.detail;
      rollbackOptimisticPixel(x, y, reason);
    };

    window.addEventListener('rollback-pixel', handleRollback as EventListener);
    
    return () => {
      window.removeEventListener('rollback-pixel', handleRollback as EventListener);
    };
  }, [rollbackOptimisticPixel]);

  // Periodic cleanup (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(cleanupExpiredPixels, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cleanupExpiredPixels]);

  // Merge confirmed pixels with optimistic ones
  const mergePixelsWithOptimistic = useCallback((confirmedPixels: PixelData[]): PixelData[] => {
    const pixelMap = new Map<string, PixelData>();
    
    // 확정된 픽셀 먼저 추가
    confirmedPixels.forEach(pixel => {
      const key = `${pixel.x},${pixel.y}`;
      pixelMap.set(key, pixel);
    });

    // 낙관적 픽셀 추가 (덮어쓰기)
    optimisticPixels.forEach(optimisticPixel => {
      const key = `${optimisticPixel.x},${optimisticPixel.y}`;
      pixelMap.set(key, optimisticPixel);
    });

    return Array.from(pixelMap.values());
  }, [optimisticPixels]);

  return {
    optimisticPixels: Array.from(optimisticPixels.values()),
    pendingTransactions: Array.from(pendingTransactions.values()),
    addOptimisticPixel,
    removeOptimisticPixel,
    rollbackOptimisticPixel,
    confirmOptimisticPixel,
    mergePixelsWithOptimistic,
    hasOptimisticPixel: (x: number, y: number) => optimisticPixels.has(`${x},${y}`),
    isPending: pendingTransactions.size > 0
  };
};
