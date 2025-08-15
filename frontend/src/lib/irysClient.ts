import { WebIrys } from '@irys/sdk';

export interface IrysConfig {
  network: 'mainnet' | 'testnet';
  token: 'ethereum' | 'polygon' | 'arbitrum' | 'irys';
  rpcUrl?: string;
}

export class IrysClient {
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

      // Use WebIrys for browser environments with Programmable Data support
      this.irys = new WebIrys({
        network: this.config.network,
        token: this.config.token,
        wallet: wallet.provider || (window as any).ethereum
      });
      
      // Connection check
      await this.irys.ready();
      
      console.log('WebIrys connected:', { 
        network: this.config.network, 
        address: this.irys.address, 
        balance: await this.irys.getLoadedBalance(),
        programmableData: !!this.irys.programmableData
      });
      
      return this.irys;
    } catch (error) {
      console.error('WebIrys connection failed:', error);
      throw new Error(`WebIrys connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async uploadData(data: any): Promise<string> {
    if (!this.irys) {
      throw new Error('WebIrys not connected. Call connect() first.');
    }
    
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      
      // Upload to permanent storage (ledgerId 0) for Programmable Data compatibility
      const receipt = await this.irys.upload(dataString, {
        tags: [
          { name: 'Content-Type', value: 'application/json' },
          { name: 'App-Name', value: 'IPRAYS' },
          { name: 'App-Version', value: '1.0.0' },
          { name: 'Data-Type', value: 'pixel-data' }
        ]
      });
      
      console.log('WebIrys upload success:', { 
        transactionId: receipt.id, 
        timestamp: receipt.timestamp,
        permanent: true 
      });
      
      return receipt.id;
    } catch (error) {
      console.error('WebIrys upload failed:', error);
      throw new Error(`WebIrys upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async getData(transactionId: string): Promise<any> {
    if (!this.irys) {
      throw new Error('WebIrys not connected. Call connect() first.');
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_IRYS_GATEWAY_URL || 'https://gateway.irys.xyz'}/${transactionId}`);
      const data = await response.text();
      
      console.log('WebIrys download success:', { transactionId, dataLength: data.length });
      
      return data;
    } catch (error) {
      console.error('WebIrys download failed:', error);
      throw new Error(`WebIrys download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Official Irys Programmable Data Access List creation
   * Based on official E2E test pattern from irys-js/tests/programmableData.ts
   * 
   * @param transactionId Irys transaction ID
   * @param startOffset Byte offset to start reading from
   * @param length Number of bytes to read
   * @returns Access list for EIP-1559 transaction
   */
  async createProgrammableDataAccessList(transactionId: string, startOffset: number, length: number): Promise<any[]> {
    if (!this.irys) {
      throw new Error('WebIrys not connected. Call connect() first.');
    }
    
    if (!this.irys.programmableData) {
      throw new Error('Programmable Data not supported by this WebIrys instance');
    }
    
    try {
      // Official Irys pattern: Generate access list using programmableData.read()
      const accessList = await this.irys.programmableData.read(transactionId, startOffset, length);
      
      console.log('Programmable Data access list created:', {
        transactionId: transactionId.slice(0, 10) + '...',
        startOffset,
        length,
        accessListEntries: accessList.length
      });
      
      return accessList;
    } catch (error) {
      console.error('Programmable Data access list creation failed:', error);
      throw new Error(`Access list creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async getBalance(): Promise<string> {
    if (!this.irys) {
      throw new Error('WebIrys not connected. Call connect() first.');
    }
    
    try {
      const balance = await this.irys.getLoadedBalance();
      return balance.toString();
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Get upload price for data size
   * @param dataSize Size in bytes
   * @returns Price in atomic units
   */
  async getPrice(dataSize: number): Promise<string> {
    if (!this.irys) {
      throw new Error('WebIrys not connected. Call connect() first.');
    }
    
    try {
      const price = await this.irys.getPrice(dataSize);
      return price.toString();
    } catch (error) {
      console.error('Failed to get price:', error);
      throw new Error(`Failed to get price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  /**
   * Check if Programmable Data is available
   * @returns True if Programmable Data is supported
   */
  hasProgrammableDataSupport(): boolean {
    return this.irys !== null && !!this.irys.programmableData;
  }
  
  /**
   * Get the underlying WebIrys instance
   * @returns WebIrys instance or null
   */
  getIrysInstance(): WebIrys | null {
    return this.irys;
  }
  
  disconnect(): void {
    this.irys = null;
    console.log('WebIrys disconnected');
  }
  
  isConnected(): boolean {
    return this.irys !== null;
  }
}
