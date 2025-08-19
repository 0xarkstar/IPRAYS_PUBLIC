import { WebIrys } from '@irys/sdk';

export interface IrysConfig {
  network: 'mainnet' | 'testnet';
  token: 'ethereum' | 'polygon' | 'arbitrum' | 'irys';
  rpcUrl?: string;
}

export interface MutableUploadOptions {
  mutability: boolean;
  previousTxId?: string;
  description?: string;
}

export interface UploadResult {
  txId: string;
  downloadUrl: string;
  uploaderUrl: string;
  gatewayUrl: string;
  isMutable: boolean;
}

export class EnhancedIrysClient {
  private irys: WebIrys | null = null;
  private config: IrysConfig;
  
  constructor(config: IrysConfig) {
    this.config = config;
  }
  
  async connect(wallet: any = {}): Promise<WebIrys> {
    try {
      if (this.irys) {
        return this.irys;
      }

      this.irys = new WebIrys({
        network: this.config.network,
        token: this.config.token,
        wallet: wallet.provider || (window as any).ethereum
      });
      
      await this.irys.ready();
      
      console.log('Enhanced WebIrys connected:', { 
        network: this.config.network, 
        address: this.irys.address, 
        balance: await this.irys.getLoadedBalance(),
        programmableData: !!this.irys.programmableData
      });
      
      return this.irys;
    } catch (error) {
      console.error('Enhanced WebIrys connection failed:', error);
      throw new Error(`Enhanced WebIrys connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Upload data with mutability support
   * @param data Data to upload
   * @param options Upload options including mutability
   */
  async uploadWithMutability(data: any, options: MutableUploadOptions): Promise<UploadResult> {
    if (!this.irys) {
      throw new Error('WebIrys not connected. Call connect() first.');
    }

    try {
      const tags = [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'App-Name', value: 'IPRAYS' },
        { name: 'App-Version', value: '2.0' },
        { name: 'Timestamp', value: Date.now().toString() }
      ];

      // Add mutability tags
      if (options.mutability) {
        tags.push({ name: 'Mutable', value: 'true' });
        
        if (options.previousTxId) {
          tags.push({ name: 'Previous-Version', value: options.previousTxId });
        }
        
        if (options.description) {
          tags.push({ name: 'Update-Description', value: options.description });
        }
      }

      const dataToUpload = typeof data === 'string' ? data : JSON.stringify(data);
      
      const receipt = await this.irys.upload(dataToUpload, {
        tags
      });

      console.log('Enhanced upload completed:', {
        txId: receipt.id,
        size: receipt.size,
        isMutable: options.mutability,
        previousVersion: options.previousTxId
      });

      return {
        txId: receipt.id,
        uploaderUrl: `http://uploader.irys.xyz/tx/${receipt.id}`,
        gatewayUrl: `https://gateway.irys.xyz/${receipt.id}`,
        downloadUrl: `https://gateway.irys.xyz/${receipt.id}`, // backward compatibility
        isMutable: options.mutability
      };
    } catch (error) {
      console.error('Enhanced upload failed:', error);
      throw error;
    }
  }

  /**
   * Get data using best practice URL pattern
   * @param txId Transaction ID
   * @param preferUploader Use uploader URL instead of gateway
   */
  async getData(txId: string, preferUploader = true): Promise<any> {
    const url = preferUploader 
      ? `http://uploader.irys.xyz/tx/${txId}`
      : `https://gateway.irys.xyz/${txId}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      console.error('Data retrieval failed:', error);
      
      // Fallback to alternative URL
      if (preferUploader) {
        console.log('Retrying with gateway URL...');
        return this.getData(txId, false);
      }
      
      throw error;
    }
  }

  /**
   * Create access list for Programmable Data
   * @param txId Transaction ID
   * @param startOffset Start offset for data
   * @param length Length of data to read
   */
  async createAccessList(txId: string, startOffset = 0, length?: number): Promise<any[]> {
    if (!this.irys?.programmableData) {
      throw new Error('Programmable Data not available');
    }

    try {
      const accessList = await this.irys.programmableData.read(txId, startOffset, length).toAccessList();
      console.log('Access list created:', { txId, startOffset, length, accessListLength: accessList.length });
      return accessList;
    } catch (error) {
      console.error('Access list creation failed:', error);
      throw error;
    }
  }

  /**
   * Get URL patterns for a transaction ID
   * @param txId Transaction ID
   */
  getUrls(txId: string) {
    return {
      uploader: `http://uploader.irys.xyz/tx/${txId}`,
      gateway: `https://gateway.irys.xyz/${txId}`,
      // For compatibility with existing code
      download: `https://gateway.irys.xyz/${txId}`
    };
  }

  /**
   * Upload pixel data with canvas state backup
   * @param pixelData Pixel data to upload
   * @param canvasState Current canvas state for backup
   * @param previousTxId Previous transaction ID for mutability
   */
  async uploadPixelWithBackup(pixelData: any, canvasState: any, previousTxId?: string): Promise<UploadResult> {
    const backupData = {
      pixel: pixelData,
      canvasSnapshot: canvasState,
      timestamp: Date.now(),
      backup: true
    };

    return this.uploadWithMutability(backupData, {
      mutability: !!previousTxId,
      previousTxId,
      description: `Pixel update at (${pixelData.x}, ${pixelData.y})`
    });
  }

  async getBalance(): Promise<string> {
    if (!this.irys) {
      throw new Error('WebIrys not connected');
    }
    
    const balance = await this.irys.getLoadedBalance();
    return balance.toString();
  }

  async fundWallet(amount: string): Promise<void> {
    if (!this.irys) {
      throw new Error('WebIrys not connected');
    }
    
    await this.irys.fund(amount);
  }

  isConnected(): boolean {
    return !!this.irys;
  }

  getAddress(): string {
    if (!this.irys) {
      throw new Error('WebIrys not connected');
    }
    return this.irys.address;
  }
}

export default EnhancedIrysClient;