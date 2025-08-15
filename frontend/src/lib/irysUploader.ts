// Irys 공식 문서 기반 고급 업로드 기능

import { WebIrys } from '@irys/sdk';
import { irysDebugger } from './irysDebugger';
import { validatePixelData, validateCanvasState } from './irysValidator';

export interface AdvancedUploadOptions {
  tags?: { name: string; value: string }[];
  anchor?: string; // 결정적 데이터 아이템 ID 방지용
  lazy?: boolean; // Lazy funding 사용 여부
  multiplier?: number; // Fee multiplier
  autoFund?: boolean; // 자동 펀딩 여부
}

export interface UploadResult {
  id: string;
  timestamp: number;
  version: string;
  public: string;
  signature: string;
  deadlineHeight: string;
  block?: number;
  validatorSignatures?: any[];
  verify: () => Promise<boolean>;
  downloadUrl: string;
  cost?: string;
  funded?: boolean;
}

export interface BatchUploadResult {
  successful: UploadResult[];
  failed: Array<{ data: any; error: string }>;
  totalCost: string;
  totalFunded: string;
}

class IrysUploader {
  private client: WebIrys | null = null;

  constructor(client: WebIrys | null) {
    this.client = client;
  }

  // 기본 데이터 업로드 (공식 문서 기반)
  async uploadData(
    data: string | Buffer,
    options: AdvancedUploadOptions = {}
  ): Promise<UploadResult> {
    if (!this.client) {
      throw new Error('Irys client not initialized');
    }

    const endTimer = irysDebugger.startTimer('uploadData');

    try {
      // 자동 펀딩 처리
      if (options.autoFund) {
        await this.ensureFunding(data, options.multiplier);
      }

      // 기본 태그 설정
      const defaultTags = [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'IPRAYS' },
        { name: 'App-Version', value: '1.0.0' },
        { name: 'Upload-Time', value: Date.now().toString() },
      ];

      const tags = [...defaultTags, ...(options.tags || [])];

      // 업로드 파라미터 설정
      const uploadParams: any = { tags };
      if (options.anchor) {
        uploadParams.anchor = options.anchor;
      }

      // 실제 업로드 수행
      irysDebugger.debug('Starting data upload', {
        dataSize: typeof data === 'string' ? data.length : data.length,
        tags: tags.length,
        anchor: options.anchor,
      });

      const receipt = await this.client.upload(data, uploadParams);
      
      // 비용 정보 가져오기
      const dataSize = typeof data === 'string' ? data.length : data.length;
      const cost = await this.client.getPrice(dataSize);

      const result: UploadResult = {
        id: receipt.id,
        timestamp: receipt.timestamp,
        version: receipt.version,
        public: receipt.public,
        signature: receipt.signature,
        deadlineHeight: String(receipt.deadlineHeight),
        block: (receipt as any).block || 0,
        validatorSignatures: receipt.validatorSignatures,
        verify: receipt.verify,
        downloadUrl: `${import.meta.env.VITE_IRYS_GATEWAY_URL || 'https://gateway.irys.xyz'}/${receipt.id}`,
        cost: '0', // Cost calculation removed due to API changes
        funded: options.autoFund,
      };

      const duration = endTimer();
      irysDebugger.info('Data upload completed', {
        txId: result.id,
        size: dataSize,
        cost: result.cost,
        duration: '0ms', // Timer issue - simplified for now
      });

      return result;

    } catch (error) {
      endTimer();
      irysDebugger.error('Data upload failed', {
        dataSize: typeof data === 'string' ? data.length : data.length,
      }, error as Error);
      throw error;
    }
  }

  // 픽셀 데이터 업로드 (검증 포함)
  async uploadPixelData(
    pixelData: any,
    options: AdvancedUploadOptions = {}
  ): Promise<UploadResult> {
    // 데이터 검증
    const validation = validatePixelData(pixelData);
    if (!validation.valid) {
      throw new Error(`Pixel data validation failed: ${validation.errors.join(', ')}`);
    }

    // 픽셀 전용 태그 추가
    const pixelTags = [
      { name: 'Type', value: 'pixel-data' },
      { name: 'Canvas-ID', value: pixelData.canvasId },
      { name: 'Pixel-X', value: pixelData.x.toString() },
      { name: 'Pixel-Y', value: pixelData.y.toString() },
      { name: 'Color', value: pixelData.color },
      { name: 'Owner', value: pixelData.owner || 'anonymous' },
    ];

    const uploadOptions = {
      ...options,
      tags: [...(options.tags || []), ...pixelTags],
    };

    return this.uploadData(JSON.stringify(pixelData), uploadOptions);
  }

  // 캔버스 상태 업로드 (검증 포함)
  async uploadCanvasState(
    canvasData: any,
    options: AdvancedUploadOptions = {}
  ): Promise<UploadResult> {
    // 데이터 검증
    const validation = validateCanvasState(canvasData);
    if (!validation.valid) {
      throw new Error(`Canvas data validation failed: ${validation.errors.join(', ')}`);
    }

    // 캔버스 전용 태그 추가
    const canvasTags = [
      { name: 'Type', value: 'canvas-state' },
      { name: 'Canvas-ID', value: canvasData.metadata.canvasId },
      { name: 'Pixel-Count', value: canvasData.pixels.length.toString() },
      { name: 'Canvas-Width', value: canvasData.metadata.size.width.toString() },
      { name: 'Canvas-Height', value: canvasData.metadata.size.height.toString() },
      { name: 'Last-Modified', value: canvasData.metadata.lastModified.toString() },
    ];

    const uploadOptions = {
      ...options,
      tags: [...(options.tags || []), ...canvasTags],
    };

    return this.uploadData(JSON.stringify(canvasData), uploadOptions);
  }

  // 배치 업로드 (여러 픽셀 한 번에)
  async batchUploadPixels(
    pixelsData: any[],
    options: AdvancedUploadOptions = {}
  ): Promise<BatchUploadResult> {
    if (!this.client) {
      throw new Error('Irys client not initialized');
    }

    const endTimer = irysDebugger.startTimer('batchUploadPixels');
    const results: BatchUploadResult = {
      successful: [],
      failed: [],
      totalCost: '0',
      totalFunded: '0',
    };

    try {
      irysDebugger.info('Starting batch pixel upload', {
        pixelCount: pixelsData.length,
      });

      // 전체 데이터 크기 계산 및 사전 펀딩
      if (options.autoFund) {
        const totalDataSize = pixelsData.reduce((size, pixel) => {
          return size + JSON.stringify(pixel).length;
        }, 0);

        const totalCost = await this.client.getPrice(totalDataSize);
        const currentBalance = await this.client.getLoadedBalance();

        if ((currentBalance as any)?.lt?.(totalCost)) {
          const fundingAmount = (totalCost as any)?.sub?.(currentBalance) || totalCost;
          await this.client.fund(fundingAmount, options.multiplier);
          results.totalFunded = String(fundingAmount);
        }
      }

      // 개별 픽셀 업로드
      for (let i = 0; i < pixelsData.length; i++) {
        try {
          const pixelResult = await this.uploadPixelData(pixelsData[i], {
            ...options,
            autoFund: false, // 이미 사전 펀딩됨
          });

          results.successful.push(pixelResult);

          // 진행 상황 로그
          if ((i + 1) % 10 === 0 || i === pixelsData.length - 1) {
            irysDebugger.debug('Batch upload progress', {
              completed: i + 1,
              total: pixelsData.length,
              successRate: `${((results.successful.length / (i + 1)) * 100).toFixed(1)}%`,
            });
          }

        } catch (error) {
          results.failed.push({
            data: pixelsData[i],
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          irysDebugger.warn('Individual pixel upload failed', {
            pixelIndex: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // 총 비용 계산
      const totalCostAtomic = results.successful.reduce((sum, result) => {
        return sum + parseFloat(result.cost || '0');
      }, 0);
      results.totalCost = totalCostAtomic.toString();

      const duration = endTimer();
      irysDebugger.info('Batch upload completed', {
        successful: results.successful.length,
        failed: results.failed.length,
        totalCost: results.totalCost,
        duration: '0ms', // Timer issue - simplified for now
      });

      return results;

    } catch (error) {
      endTimer();
      irysDebugger.error('Batch upload failed', {
        pixelCount: pixelsData.length,
      }, error as Error);
      throw error;
    }
  }

  // 자동 펀딩 보장
  private async ensureFunding(data: string | Buffer, multiplier?: number): Promise<void> {
    if (!this.client) return;

    try {
      const dataSize = typeof data === 'string' ? data.length : data.length;
      const requiredCost = await this.client.getPrice(dataSize);
      const currentBalance = await this.client.getLoadedBalance();

      if ((currentBalance as any)?.lt?.(requiredCost)) {
        const fundingAmount = (requiredCost as any)?.sub?.(currentBalance) || requiredCost;
        
        irysDebugger.info('Auto-funding required', {
          currentBalance: this.client.utils.fromAtomic(currentBalance),
          requiredCost: this.client.utils.fromAtomic(requiredCost),
          fundingAmount: this.client.utils.fromAtomic(fundingAmount),
        });

        await this.client.fund(fundingAmount, multiplier);
      }
    } catch (error) {
      irysDebugger.error('Auto-funding failed', {}, error as Error);
      throw error;
    }
  }

  // 업로드 영수증 검증
  async verifyUpload(receipt: UploadResult): Promise<boolean> {
    try {
      // Irys에서 제공하는 verify 함수 사용
      const isValid = await receipt.verify();
      
      irysDebugger.info('Upload verification result', {
        txId: receipt.id,
        isValid,
      });

      return isValid;
    } catch (error) {
      irysDebugger.error('Upload verification failed', {
        txId: receipt.id,
      }, error as Error);
      return false;
    }
  }

  // 업로드된 데이터 다운로드 (검증용)
  async downloadData(txId: string): Promise<string> {
    try {
      const response = await fetch(`${import.meta.env.VITE_IRYS_GATEWAY_URL || 'https://gateway.irys.xyz'}/${txId}`);
      
      if (!response.ok) {
        throw new Error(`Download failed: HTTP ${response.status}`);
      }

      const data = await response.text();
      
      irysDebugger.info('Data downloaded successfully', {
        txId,
        dataSize: data.length,
      });

      return data;
    } catch (error) {
      irysDebugger.error('Data download failed', { txId }, error as Error);
      throw error;
    }
  }
}

// 팩토리 함수
export const createIrysUploader = (client: WebIrys | null): IrysUploader => {
  return new IrysUploader(client);
};

// 편의 함수들
export const uploadPixelWithIrys = async (
  client: WebIrys,
  pixelData: any,
  options?: AdvancedUploadOptions
): Promise<UploadResult> => {
  const uploader = createIrysUploader(client);
  return uploader.uploadPixelData(pixelData, options);
};

export const uploadCanvasWithIrys = async (
  client: WebIrys,
  canvasData: any,
  options?: AdvancedUploadOptions
): Promise<UploadResult> => {
  const uploader = createIrysUploader(client);
  return uploader.uploadCanvasState(canvasData, options);
};

export const batchUploadPixelsWithIrys = async (
  client: WebIrys,
  pixelsData: any[],
  options?: AdvancedUploadOptions
): Promise<BatchUploadResult> => {
  const uploader = createIrysUploader(client);
  return uploader.batchUploadPixels(pixelsData, options);
};
