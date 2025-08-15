// Irys Chunked Uploader 구현 (공식 문서 기반)

import { WebIrys } from '@irys/sdk';
import { irysDebugger } from './irysDebugger';

export interface ChunkedUploadOptions {
  chunkSize?: number; // 청크 크기 (bytes)
  maxConcurrentUploads?: number; // 동시 업로드 수
  retryAttempts?: number; // 재시도 횟수
  tags?: { name: string; value: string }[];
  onProgress?: (progress: ChunkedUploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, chunkId: string) => void;
  onError?: (error: Error, chunkIndex?: number) => void;
}

export interface ChunkedUploadProgress {
  uploadedChunks: number;
  totalChunks: number;
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  currentChunkIndex: number;
  estimatedTimeRemaining?: number;
}

export interface ChunkedUploadResult {
  manifestId: string;
  chunkIds: string[];
  totalSize: number;
  uploadTime: number;
  averageSpeed: number; // bytes per second
  chunks: ChunkInfo[];
}

export interface ChunkInfo {
  index: number;
  id: string;
  size: number;
  uploadTime: number;
  retryCount: number;
}

class IrysChunkedUploader {
  private client: WebIrys;
  private options: Required<ChunkedUploadOptions>;
  private uploadStartTime: number = 0;

  constructor(client: WebIrys, options: ChunkedUploadOptions = {}) {
    this.client = client;
    this.options = {
      chunkSize: options.chunkSize || 1024 * 1024, // 1MB 기본
      maxConcurrentUploads: options.maxConcurrentUploads || 3,
      retryAttempts: options.retryAttempts || 3,
      tags: options.tags || [],
      onProgress: options.onProgress || (() => {}),
      onChunkComplete: options.onChunkComplete || (() => {}),
      onError: options.onError || (() => {}),
    };
  }

  // 대용량 캔버스 데이터 청크 업로드
  async uploadLargeCanvasData(
    canvasData: any,
    options: Partial<ChunkedUploadOptions> = {}
  ): Promise<ChunkedUploadResult> {
    const mergedOptions = { ...this.options, ...options };
    const dataString = JSON.stringify(canvasData);
    const dataBuffer = Buffer.from(dataString, 'utf-8');

    irysDebugger.info('Starting chunked canvas upload', {
      totalSize: dataBuffer.length,
      chunkSize: mergedOptions.chunkSize,
      estimatedChunks: Math.ceil(dataBuffer.length / mergedOptions.chunkSize),
    });

    return this.uploadData(dataBuffer, {
      ...mergedOptions,
      tags: [
        ...mergedOptions.tags,
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Type', value: 'large-canvas-data' },
        { name: 'Upload-Method', value: 'chunked' },
        { name: 'Canvas-ID', value: canvasData.metadata?.canvasId || 'unknown' },
      ],
    });
  }

  // 기본 데이터 청크 업로드
  async uploadData(
    data: Buffer,
    options: Partial<ChunkedUploadOptions> = {}
  ): Promise<ChunkedUploadResult> {
    const mergedOptions = { ...this.options, ...options };
    this.uploadStartTime = Date.now();

    try {
      // 데이터를 청크로 분할
      const chunks = this.splitIntoChunks(data, mergedOptions.chunkSize);
      const chunkInfos: ChunkInfo[] = [];
      const uploadPromises: Promise<ChunkInfo>[] = [];

      irysDebugger.info('Data split into chunks', {
        totalChunks: chunks.length,
        totalSize: data.length,
        chunkSize: mergedOptions.chunkSize,
      });

      // 동시 업로드 제한을 위한 세마포어
      const semaphore = new Semaphore(mergedOptions.maxConcurrentUploads);

      // 각 청크를 비동기로 업로드
      for (let i = 0; i < chunks.length; i++) {
        const uploadPromise = semaphore.acquire().then(async (release) => {
          try {
            const chunkInfo = await this.uploadChunk(
              chunks[i],
              i,
              mergedOptions,
              chunks.length,
              data.length
            );
            return chunkInfo;
          } finally {
            release();
          }
        });

        uploadPromises.push(uploadPromise);
      }

      // 모든 청크 업로드 완료 대기
      const results = await Promise.allSettled(uploadPromises);
      
      // 성공한 청크들 수집
      const successfulChunks: ChunkInfo[] = [];
      const failedChunks: number[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulChunks.push(result.value);
        } else {
          failedChunks.push(index);
          irysDebugger.error('Chunk upload failed', {
            chunkIndex: index,
          }, new Error(result.reason));
        }
      });

      if (failedChunks.length > 0) {
        throw new Error(`Failed to upload ${failedChunks.length} chunks: ${failedChunks.join(', ')}`);
      }

      // 매니페스트 생성 (청크들을 연결하는 메타데이터)
      const manifest = await this.createManifest(successfulChunks, mergedOptions.tags);

      const uploadTime = Date.now() - this.uploadStartTime;
      const averageSpeed = data.length / (uploadTime / 1000);

      const result: ChunkedUploadResult = {
        manifestId: manifest.id,
        chunkIds: successfulChunks.map(chunk => chunk.id),
        totalSize: data.length,
        uploadTime,
        averageSpeed,
        chunks: successfulChunks,
      };

      irysDebugger.info('Chunked upload completed', {
        manifestId: result.manifestId,
        totalChunks: result.chunks.length,
        totalSize: result.totalSize,
        uploadTime: `${uploadTime}ms`,
        averageSpeed: `${(averageSpeed / 1024).toFixed(2)} KB/s`,
      });

      return result;

    } catch (error) {
      const uploadTime = Date.now() - this.uploadStartTime;
      irysDebugger.error('Chunked upload failed', {
        totalSize: data.length,
        uploadTime: `${uploadTime}ms`,
      }, error as Error);
      throw error;
    }
  }

  // 개별 청크 업로드
  private async uploadChunk(
    chunk: Buffer,
    index: number,
    options: Required<ChunkedUploadOptions>,
    totalChunks: number,
    totalSize: number
  ): Promise<ChunkInfo> {
    const chunkStartTime = Date.now();
    let retryCount = 0;

    while (retryCount <= options.retryAttempts) {
      try {
        irysDebugger.debug('Uploading chunk', {
          chunkIndex: index,
          chunkSize: chunk.length,
          retryCount,
        });

        // 청크별 태그 추가
        const chunkTags = [
          ...options.tags,
          { name: 'Chunk-Index', value: index.toString() },
          { name: 'Chunk-Size', value: chunk.length.toString() },
          { name: 'Total-Chunks', value: totalChunks.toString() },
          { name: 'Chunk-Hash', value: await this.calculateChunkHash(chunk) },
        ];

        const receipt = await this.client.upload(chunk, { tags: chunkTags });
        
        const chunkInfo: ChunkInfo = {
          index,
          id: receipt.id,
          size: chunk.length,
          uploadTime: Date.now() - chunkStartTime,
          retryCount,
        };

        // 진행률 콜백 호출
        const uploadedBytes = (index + 1) * options.chunkSize;
        const progress: ChunkedUploadProgress = {
          uploadedChunks: index + 1,
          totalChunks,
          uploadedBytes: Math.min(uploadedBytes, totalSize),
          totalBytes: totalSize,
          percentage: Math.min((uploadedBytes / totalSize) * 100, 100),
          currentChunkIndex: index,
        };

        // 남은 시간 추정
        if (index > 0) {
          const elapsed = Date.now() - this.uploadStartTime;
          const avgTimePerChunk = elapsed / (index + 1);
          const remainingChunks = totalChunks - (index + 1);
          progress.estimatedTimeRemaining = avgTimePerChunk * remainingChunks;
        }

        options.onProgress(progress);
        options.onChunkComplete(index, receipt.id);

        irysDebugger.debug('Chunk upload completed', {
          chunkIndex: index,
          chunkId: receipt.id,
          uploadTime: `${chunkInfo.uploadTime}ms`,
          retryCount,
        });

        return chunkInfo;

      } catch (error) {
        retryCount++;
        irysDebugger.warn('Chunk upload failed, retrying', {
          chunkIndex: index,
          retryCount,
          maxRetries: options.retryAttempts,
          error: error instanceof Error ? error.message : 'Unknown error',
        });

        if (retryCount > options.retryAttempts) {
          options.onError(error as Error, index);
          throw error;
        }

        // 지수 백오프 재시도
        const backoffTime = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }

    throw new Error(`Failed to upload chunk ${index} after ${options.retryAttempts} attempts`);
  }

  // 데이터를 청크로 분할
  private splitIntoChunks(data: Buffer, chunkSize: number): Buffer[] {
    const chunks: Buffer[] = [];
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const end = Math.min(i + chunkSize, data.length);
      chunks.push(data.slice(i, end));
    }

    return chunks;
  }

  // 청크 해시 계산
  private async calculateChunkHash(chunk: Buffer): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', chunk);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for environments without Web Crypto API
      return Buffer.from(chunk).toString('base64').slice(0, 32);
    }
  }

  // 매니페스트 생성 (청크 메타데이터)
  private async createManifest(
    chunks: ChunkInfo[],
    additionalTags: { name: string; value: string }[]
  ): Promise<{ id: string }> {
    const manifest = {
      version: '1.0.0',
      type: 'chunked-upload-manifest',
      createdAt: Date.now(),
      chunks: chunks.sort((a, b) => a.index - b.index).map(chunk => ({
        index: chunk.index,
        id: chunk.id,
        size: chunk.size,
        hash: `chunk-${chunk.index}`, // 실제로는 청크 해시 저장
      })),
      totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0),
      totalChunks: chunks.length,
    };

    const manifestTags = [
      ...additionalTags,
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Type', value: 'upload-manifest' },
      { name: 'Manifest-Version', value: '1.0.0' },
      { name: 'Total-Chunks', value: chunks.length.toString() },
      { name: 'Total-Size', value: manifest.totalSize.toString() },
    ];

    const receipt = await this.client.upload(JSON.stringify(manifest), {
      tags: manifestTags,
    });

    irysDebugger.info('Manifest created', {
      manifestId: receipt.id,
      totalChunks: chunks.length,
      totalSize: manifest.totalSize,
    });

    return { id: receipt.id };
  }

  // 청크 업로드로부터 원본 데이터 복원
  async reconstructData(manifestId: string): Promise<Buffer> {
    try {
      // 매니페스트 다운로드
      const manifestResponse = await fetch(`${import.meta.env.VITE_IRYS_GATEWAY_URL || 'https://gateway.irys.xyz'}/${manifestId}`);
      const manifest = await manifestResponse.json();

      if (manifest.type !== 'chunked-upload-manifest') {
        throw new Error('Invalid manifest type');
      }

      irysDebugger.info('Reconstructing data from chunks', {
        manifestId,
        totalChunks: manifest.totalChunks,
        totalSize: manifest.totalSize,
      });

      // 청크들을 순서대로 다운로드
      const chunks: Buffer[] = new Array(manifest.totalChunks);
      const downloadPromises = manifest.chunks.map(async (chunkInfo: any) => {
        const chunkResponse = await fetch(`${import.meta.env.VITE_IRYS_GATEWAY_URL || 'https://gateway.irys.xyz'}/${chunkInfo.id}`);
        const chunkData = await chunkResponse.arrayBuffer();
        chunks[chunkInfo.index] = Buffer.from(chunkData);
      });

      await Promise.all(downloadPromises);

      // 청크들을 연결하여 원본 데이터 복원
      const reconstructedData = Buffer.concat(chunks);

      irysDebugger.info('Data reconstruction completed', {
        manifestId,
        reconstructedSize: reconstructedData.length,
        expectedSize: manifest.totalSize,
      });

      return reconstructedData;

    } catch (error) {
      irysDebugger.error('Data reconstruction failed', { manifestId }, error as Error);
      throw error;
    }
  }
}

// 세마포어 구현 (동시 업로드 제한용)
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => {
          this.permits++;
          if (this.waitQueue.length > 0) {
            const next = this.waitQueue.shift()!;
            next();
          }
        });
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          resolve(() => {
            this.permits++;
            if (this.waitQueue.length > 0) {
              const next = this.waitQueue.shift()!;
              next();
            }
          });
        });
      }
    });
  }
}

// 팩토리 함수
export const createChunkedUploader = (
  client: WebIrys,
  options?: ChunkedUploadOptions
): IrysChunkedUploader => {
  return new IrysChunkedUploader(client, options);
};

// 편의 함수
export const uploadLargeCanvas = async (
  client: WebIrys,
  canvasData: any,
  options?: ChunkedUploadOptions
): Promise<ChunkedUploadResult> => {
  const uploader = createChunkedUploader(client, options);
  return uploader.uploadLargeCanvasData(canvasData, options);
};
