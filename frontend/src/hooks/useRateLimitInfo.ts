import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { config as wagmiConfig } from '@/config';
import { ABI, CONTRACT_ADDRESS } from '@/lib/contract';

export interface RateLimitInfo {
  minPlacementInterval: number;
  isEnabled: boolean;
  pixelsPerMinute: number;
  lastPlacementAt: number;
  timeRemaining: number;
  canPlace: boolean;
}

export const useRateLimitInfo = () => {
  const { address } = useAccount();
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo>({
    minPlacementInterval: 3, // Default to 3 seconds for special sale
    isEnabled: true,
    pixelsPerMinute: 20,
    lastPlacementAt: 0,
    timeRemaining: 0,
    canPlace: true
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRateLimitInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get min placement interval from contract
      const minInterval = await readContract(wagmiConfig, {
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'minPlacementInterval',
      }) as bigint;

      const intervalSeconds = Number(minInterval);
      
      let lastPlacement = 0;
      let timeRemaining = 0;
      let canPlace = true;

      // Get last placement time for current user
      if (address && intervalSeconds > 0) {
        try {
          const lastPlacementResult = await readContract(wagmiConfig, {
            address: CONTRACT_ADDRESS,
            abi: ABI,
            functionName: 'lastPlacementAt',
            args: [address],
          }) as bigint;

          lastPlacement = Number(lastPlacementResult);
          
          if (lastPlacement > 0) {
            const now = Math.floor(Date.now() / 1000);
            const timeSinceLastPlacement = now - lastPlacement;
            timeRemaining = Math.max(0, intervalSeconds - timeSinceLastPlacement);
            canPlace = timeRemaining === 0;
          }
        } catch (userError) {
          console.warn('Could not fetch user placement info:', userError);
          // Continue with defaults
        }
      }

      const newInfo: RateLimitInfo = {
        minPlacementInterval: intervalSeconds,
        isEnabled: intervalSeconds > 0,
        pixelsPerMinute: intervalSeconds > 0 ? Math.floor(60 / intervalSeconds) : 20, // 20 ppm for 3-second cooldown
        lastPlacementAt: lastPlacement,
        timeRemaining,
        canPlace
      };

      setRateLimitInfo(newInfo);
      
      console.log('Rate limit info updated:', newInfo);
    } catch (contractError) {
      console.error('Failed to fetch rate limit info:', contractError);
      
      // Fallback to special sale defaults (3 seconds)
      const fallbackInfo: RateLimitInfo = {
        minPlacementInterval: 3,
        isEnabled: true,
        pixelsPerMinute: 20,
        lastPlacementAt: 0,
        timeRemaining: 0,
        canPlace: true
      };
      
      setRateLimitInfo(fallbackInfo);
      setError('Using fallback rate limit (3s) - contract may not be responding');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount and when address changes
  useEffect(() => {
    fetchRateLimitInfo();
  }, [address]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchRateLimitInfo, 30000);
    return () => clearInterval(interval);
  }, [address]);

  // Update time remaining every second when user has a cooldown
  useEffect(() => {
    if (rateLimitInfo.timeRemaining > 0) {
      const interval = setInterval(() => {
        setRateLimitInfo(prev => {
          const newTimeRemaining = Math.max(0, prev.timeRemaining - 1);
          return {
            ...prev,
            timeRemaining: newTimeRemaining,
            canPlace: newTimeRemaining === 0
          };
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [rateLimitInfo.timeRemaining]);

  const refresh = () => {
    fetchRateLimitInfo();
  };

  return {
    rateLimitInfo,
    isLoading,
    error,
    refresh
  };
};

export default useRateLimitInfo;