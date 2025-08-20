import { useState } from 'react';
import { toast } from 'sonner';
import { parseEther } from 'ethers';
import { useAccount, useChainId } from 'wagmi';
import { getChainIdFromEnv, checkRateLimitStatus } from '@/lib/contract';
import { estimatePixelPlaceFeeEth } from '@/lib/gasEstimation';
import { placePixelWithRecovery } from '@/lib/pixelPlacement';
import { useIrys } from '@/hooks/useIrys';
import { useOptimisticCanvas } from '@/hooks/useOptimisticCanvas';
import { useRateLimitInfo } from '@/hooks/useRateLimitInfo';

interface Pixel {
  x: number;
  y: number;
  color: string;
  owner?: string;
  timestamp?: number;
  irysId?: string;
  irysPayloadLength?: number;
}

interface Transaction {
  id: string;
  type: 'pixel_place' | 'funding_contribution';
  status: 'pending' | 'completed' | 'failed';
  hash?: string;
  amount?: number;
  gasEstimate?: number;
  timestamp: number;
  error?: string;
}

export const usePixelPlacement = (
  pixelPriceWei: bigint | null,
  onDataRefresh?: () => void
) => {
  const { isConnected, address } = useAccount();
  const activeChainId = useChainId();
  const expectedChainId = getChainIdFromEnv();
  const { createAccessList, uploadPixelData, isConnected: irysConnected } = useIrys();
  const optimisticCanvas = useOptimisticCanvas();
  const { rateLimitInfo } = useRateLimitInfo();
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Legacy client-side rate limiting (for UX only) - Use contract's actual cooldown
  const RATE_LIMIT_DURATION = (rateLimitInfo.minPlacementInterval || 3) * 1000; // Use contract cooldown
  const getStorageKey = (addr?: string | null) => `pixelPlacement_${addr || 'unknown'}`;
  
  const checkClientRateLimit = (addr?: string | null) => {
    try {
      const last = localStorage.getItem(getStorageKey(addr));
      const lastTs = last ? parseInt(last, 10) : 0;
      const elapsed = Date.now() - lastTs;
      return { canPlace: elapsed >= RATE_LIMIT_DURATION, timeRemaining: Math.max(0, RATE_LIMIT_DURATION - elapsed) };
    } catch {
      return { canPlace: true, timeRemaining: 0 };
    }
  };
  
  const recordClientPlacement = (addr?: string | null) => {
    try { localStorage.setItem(getStorageKey(addr), Date.now().toString()); } catch {}
  };

  // Contract-based rate limiting (primary security)
  const checkContractRateLimit = async (userAddress?: string) => {
    if (!userAddress) {
      return { canPlace: false, timeRemaining: 0, message: 'Wallet not connected' };
    }
    
    try {
      return await checkRateLimitStatus(userAddress);
    } catch (error) {
      console.error('Failed to check contract rate limit:', error);
      return { canPlace: true, timeRemaining: 0, message: 'Unable to verify rate limit' };
    }
  };

  const handlePixelPlace = async (pixel: Pixel) => {
    // Basic validation
    if (!isConnected) {
      throw new Error('Please connect your wallet');
    }
    if (activeChainId !== expectedChainId) {
      throw new Error(`Please switch to the correct network (chain ${expectedChainId})`);
    }
    if (pixelPriceWei === null || pixelPriceWei === undefined) {
      throw new Error('Pixel price is still loading. Please try again shortly');
    }

    // Primary rate limit check: Contract-based (secure)
    const contractRateLimit = await checkContractRateLimit(address);
    if (!contractRateLimit.canPlace) {
      const sec = Math.ceil(contractRateLimit.timeRemaining);
      throw new Error(
        sec > 0 
          ? `Rate limited: Please wait ${sec}s before placing another pixel` 
          : contractRateLimit.message || 'Cannot place pixel at this time'
      );
    }

    // Secondary rate limit check: Client-based (UX improvement)
    const clientRateLimit = checkClientRateLimit(address);
    if (!clientRateLimit.canPlace) {
      const sec = Math.ceil(clientRateLimit.timeRemaining / 1000);
      // Show warning but allow proceeding (contract will enforce)
      toast.info(`Client cache suggests ${sec}s remaining. Proceeding with contract verification...`);
    }

    const txId = `tx_${Date.now()}`;
    
    // Gas estimation (best-effort, 실패해도 진행)
    let gasEstimate = 0;
    try {
      gasEstimate = await estimatePixelPlaceFeeEth(
        pixel.x,
        pixel.y,
        pixel.color,
        pixel.irysId || 'ui',
        pixelPriceWei
      );
    } catch {}

    // Add transaction
    const newTx: Transaction = { 
      id: txId, 
      type: 'pixel_place', 
      status: 'pending', 
      gasEstimate, 
      timestamp: Date.now() 
    };
    setTransactions(prev => [newTx, ...prev]);

    try {
      // 공식 Irys PD 플로우: 먼저 데이터를 Irys에 업로드
      let finalPixel = { ...pixel };
      
      if (irysConnected && !pixel.irysId) {
        try {
          
          
          // Prepare pixel data to upload to Irys
          const pixelData = {
            x: pixel.x,
            y: pixel.y,
            color: pixel.color,
            timestamp: Date.now(),
            type: 'pixel_placement',
            version: '1.0'
          };
          
          // Upload pixel data to Irys
          const uploadResult = await uploadPixelData(pixelData);
          if (uploadResult && uploadResult.id) {
            finalPixel.irysId = uploadResult.id;
            finalPixel.irysPayloadLength = JSON.stringify(pixelData).length;
            toast.success('Pixel data uploaded to Irys');
          } else {
            throw new Error('Invalid Irys upload result');
          }
          
        } catch (uploadError) {
          
          toast.warning('Irys upload failed, proceeding with standard placement');
          // Continue with standard flow when Irys upload fails
        }
      }

      await placePixelWithRecovery(
        finalPixel,
        {
          useOptimistic: true,
          maxRetries: 3,
          enableFallback: true
        },
        optimisticCanvas,
        irysConnected,
        createAccessList,
        pixelPriceWei
      );

      // Success
      setTransactions(prev => 
        prev.map(tx => 
          tx.id === txId 
            ? { ...tx, status: 'completed' } 
            : tx
        )
      );

      // Update client-side cache for UX (secondary security layer)
      recordClientPlacement(address);
      
      // Show success message with actual contract cooldown
      const cooldownSec = rateLimitInfo.minPlacementInterval || 3;
      toast.success(`Pixel placed successfully! Next placement available in ${cooldownSec}s.`);
      
      onDataRefresh?.();

    } catch (error: any) {
      console.error('Pixel placement failed:', error);
      
      // Enhanced error handling for rate limiting
      const errorMessage = error?.reason || error?.message || 'Unknown error';
      let userFriendlyMessage = errorMessage;
      
      // Check for contract rate limit errors
      if (errorMessage.includes('Placement rate limited') || 
          errorMessage.includes('rate limit') ||
          errorMessage.includes('minPlacementInterval')) {
        userFriendlyMessage = 'Rate limited by smart contract. Please wait before placing another pixel.';
        // Try to get updated rate limit info
        try {
          const rateLimitStatus = await checkContractRateLimit(address);
          if (rateLimitStatus.timeRemaining > 0) {
            userFriendlyMessage = `Rate limited: ${rateLimitStatus.timeRemaining}s remaining`;
          }
        } catch {}
      } else if (errorMessage.includes('insufficient funds') || 
                 errorMessage.includes('Insufficient payment')) {
        userFriendlyMessage = 'Insufficient funds for pixel placement';
      } else if (errorMessage.includes('User rejected') || 
                 errorMessage.includes('user rejected')) {
        userFriendlyMessage = 'Transaction cancelled by user';
      }
      
      setTransactions(prev => 
        prev.map(tx => 
          tx.id === txId 
            ? { ...tx, status: 'failed', error: userFriendlyMessage } 
            : tx
        )
      );
      
      // Show user-friendly error message
      toast.error(userFriendlyMessage);
      throw new Error(userFriendlyMessage);
    }
  };


  const handleViewTransaction = (hash: string) => {
    const explorerUrl = import.meta.env.VITE_IRYS_EXPLORER_URL || 'https://testnet-explorer.irys.xyz';
    window.open(`${explorerUrl}/tx/${hash}`, '_blank');
  };

  return {
    transactions,
    handlePixelPlace,
    handleViewTransaction,
    // Rate limiting utilities
    checkContractRateLimit,
    checkClientRateLimit
  };
};