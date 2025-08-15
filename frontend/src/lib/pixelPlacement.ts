import { errorHandler, withRetry, handlePixelPlacementError } from './errorHandler';
import { useOptimisticCanvas } from '../hooks/useOptimisticCanvas';
import { placePixelWrite, placePixelWithPDWrite, placePixelWithPDWriteLegacy } from './contract';
import { toast } from 'sonner';

export interface PixelPlacementData {
  x: number;
  y: number;
  color: string;
  irysId?: string;
  irysPayloadLength?: number;
}

export interface PixelPlacementOptions {
  useOptimistic: boolean;
  maxRetries: number;
  enableFallback: boolean;
}

export class PixelPlacementService {
  private static instance: PixelPlacementService;

  static getInstance(): PixelPlacementService {
    if (!PixelPlacementService.instance) {
      PixelPlacementService.instance = new PixelPlacementService();
    }
    return PixelPlacementService.instance;
  }

  async placePixelWithRecovery(
    pixel: PixelPlacementData,
    options: Partial<PixelPlacementOptions> = {},
    optimisticCanvas: ReturnType<typeof useOptimisticCanvas>,
    irysConnected: boolean,
    createAccessList: (transactionId: string, startOffset: number, length: number) => Promise<any[]>,
    pixelPriceWei: bigint
  ): Promise<void> {
    const {
      useOptimistic = true,
      maxRetries = 3,
      enableFallback = true
    } = options;

    let transactionId: string | undefined;

    try {
      // 1) Optimistic update (instant UI)
      if (useOptimistic) {
        transactionId = `opt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        optimisticCanvas.addOptimisticPixel(pixel.x, pixel.y, pixel.color, transactionId);
        toast.info(`Placing pixel (${pixel.x}, ${pixel.y})...`);
      }

      // 2) Try actual blockchain transaction
      const receipt = await this.executePixelPlacement(
        pixel,
        irysConnected,
        createAccessList,
        pixelPriceWei,
        maxRetries,
        enableFallback
      );

      // 3) Confirm optimistic state on success
      if (useOptimistic && transactionId) {
        optimisticCanvas.confirmOptimisticPixel(transactionId);
      }

      // Success toast (only when not optimistic)
      if (!useOptimistic) {
        toast.success(`Pixel placed at (${pixel.x}, ${pixel.y})`);
      }

      

    } catch (error) {
      // 4) Rollback optimistic state on failure
      if (useOptimistic && transactionId) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        optimisticCanvas.rollbackOptimisticPixel(pixel.x, pixel.y, errorMessage);
      }

      // 5) Error handling
      await handlePixelPlacementError(
        error instanceof Error ? error : new Error(String(error)),
        { 
          x: pixel.x, 
          y: pixel.y, 
          color: pixel.color, 
          transactionId 
        }
      );

      throw error;
    }
  }

  private async executePixelPlacement(
    pixel: PixelPlacementData,
    irysConnected: boolean,
    createAccessList: (transactionId: string, startOffset: number, length: number) => Promise<any[]>,
    pixelPriceWei: bigint,
    maxRetries: number,
    enableFallback: boolean
  ): Promise<any> {
    // If Irys is connected and irysId exists, try Programmable Data flow
    if (irysConnected && pixel.irysId) {
      try {
        return await this.tryProgrammableDataPlacement(
          pixel,
          createAccessList,
          pixelPriceWei,
          maxRetries,
          enableFallback
        );
      } catch (error) {
         
        if (!enableFallback) {
          throw error;
        }
      }
    }

    // Standard placement
    return await this.trySimplePixelPlacement(pixel, pixelPriceWei, maxRetries);
  }

  private async tryProgrammableDataPlacement(
    pixel: PixelPlacementData,
    createAccessList: (transactionId: string, startOffset: number, length: number) => Promise<any[]>,
    pixelPriceWei: bigint,
    maxRetries: number,
    enableFallback: boolean
  ): Promise<any> {
    
    try {
      // Programmable Data flow (official guide)

      // 1) Upload pixel data to Irys (if no irysId)
      let transactionId = pixel.irysId;
      let dataLength = pixel.irysPayloadLength || 0;
      
      if (!transactionId) {
        // Upload pixel data to Irys
        const pixelData = {
          x: pixel.x,
          y: pixel.y,
          color: pixel.color,
          timestamp: Date.now(),
          type: 'pixel_placement'
        };
        
        
        // Cannot call upload here; require irysId
        throw new Error('Irys transaction ID required. Please upload data to Irys first.');
      }

      // 2) Create Programmable Data Access List
      
      const accessList = await withRetry(
        () => createAccessList(transactionId!, 0, dataLength || 1024),
        'create-pd-access-list',
        2,
        { transactionId, dataLength }
      );

      if (!accessList || accessList.length === 0) {
        throw new Error('Failed to create Programmable Data Access List. Verify Irys transaction ID and network connectivity.');
      }

      

      // 3) Call contract with EIP-1559 tx (official)
      const receipt = await withRetry(
        () => placePixelWithPDWrite(
          pixel.x,
          pixel.y,
          transactionId!,
          accessList,
          pixelPriceWei
        ),
        'place-pixel-with-pd-official',
        maxRetries,
        { x: pixel.x, y: pixel.y, transactionId }
      );

      

      toast.success('Pixel placed with Programmable Data');
      return receipt;

    } catch (pdError: any) {
      

      if (!enableFallback) {
        throw new Error(`Programmable Data failed: ${pdError?.message || 'Unknown error'}`);
      }

      try {
        // Fallback: Legacy PD (dev/testing)
        
        
        if (!pixel.irysId) {
          throw new Error('Irys ID is required for legacy flow');
        }
        
        const legacyReceipt = await withRetry(
          () => placePixelWithPDWriteLegacy(
            pixel.x,
            pixel.y,
            pixel.irysId!,
            0,
            pixel.irysPayloadLength || 1024,
            pixelPriceWei
          ),
          'place-pixel-with-pd-legacy',
          maxRetries,
          { x: pixel.x, y: pixel.y, irysId: pixel.irysId }
        );

        toast.success('Pixel placed with Programmable Data (legacy)');
        return legacyReceipt;

      } catch (legacyError: any) {
        

        if (!enableFallback) {
          throw legacyError;
        }

        // 3) Final fallback to standard placement
        return await this.trySimplePixelPlacement(pixel, pixelPriceWei, maxRetries);
      }
    }
  }

  private async trySimplePixelPlacement(
    pixel: PixelPlacementData,
    pixelPriceWei: bigint,
    maxRetries: number
  ): Promise<any> {
    
    
    const receipt = await withRetry(
      () => placePixelWrite(
        pixel.x,
        pixel.y,
        pixel.color,
        pixel.irysId || 'ui',
        pixelPriceWei
      ),
      'place-pixel-simple',
      maxRetries,
      { x: pixel.x, y: pixel.y, color: pixel.color }
    );

    toast.success('Pixel placed');
    return receipt;
  }

  async placeBatchPixels(
    pixels: PixelPlacementData[],
    options: Partial<PixelPlacementOptions> = {}
  ): Promise<void> {
    for (const pixel of pixels) {
      await this.placePixelWithRecovery(pixel, options, {} as any, false, async () => [], BigInt(0));
    }
  }

  async placeSimplePixel(
    x: number,
    y: number,
    color: string,
    optimisticCanvas: ReturnType<typeof useOptimisticCanvas>,
    pixelPriceWei: bigint,
    options: Partial<PixelPlacementOptions> = {}
  ): Promise<void> {
    const pixel: PixelPlacementData = { x, y, color };
    await this.placePixelWithRecovery(
      pixel,
      options,
      optimisticCanvas,
      false,
      async () => [],
      pixelPriceWei
    );
  }
}

// 싱글톤 인스턴스 생성
const pixelPlacementService = PixelPlacementService.getInstance();

// 외부에서 사용할 수 있도록 export
export const placePixelWithRecovery = pixelPlacementService.placePixelWithRecovery.bind(pixelPlacementService);
export const placeSimplePixel = pixelPlacementService.placeSimplePixel.bind(pixelPlacementService);
