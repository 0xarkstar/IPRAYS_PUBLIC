// Irys 공식 문서 기반 고급 업로드 기능

import { WebIrys } from '@irys/sdk';
import { irysDebugger } from './irysDebugger';
import { validatePixelData, validateCanvasState } from './irysValidator';

export interface AdvancedUploadOptions {
  tags?: { name: string; value: string }[];
  anchor?: string; // 결정적 데이터 아이템 ID 방지용
  lazy?: boolean; // Lazy funding 사용 여부
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
        cost: await this.calculateActualCost(dataSize),
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



  // 실제 업로드 비용 계산
  private async calculateActualCost(dataSize: number): Promise<string> {
    try {
      if (!this.client) {
        return '0';
      }
      
      const price = await this.client.getPrice(dataSize);
      return price.toString();
    } catch (error) {
      irysDebugger.error('Cost calculation failed', { dataSize }, error as Error);
      return '0';
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

