import Irys from '@irys/sdk';

export interface IrysConfig {
  network: 'mainnet' | 'testnet';
  token: 'ethereum' | 'polygon' | 'arbitrum';
  rpcUrl?: string;
}

export class IrysClient {
  private irys: Irys | null = null;
  private config: IrysConfig;
  
  constructor(config: IrysConfig) {
    this.config = config;
  }
  
  async connect(wallet: any = {}): Promise<Irys> {
    try {
      if (this.irys) {
        return this.irys;
      }

      this.irys = new Irys({
        network: this.config.network,
        token: this.config.token,
        // In browser wallets, no privateKey. Initialize without key.
        // If SDK supports, wire signer integration later.
        key: wallet.privateKey || wallet.signMessage || undefined
      });
      
      // Connection check
      await this.irys.ready();
      
      console.log('Irys connected:', { network: this.config.network, address: this.irys.address, balance: await this.irys.getLoadedBalance() });
      
      return this.irys;
    } catch (error) {
      console.error('Irys connection failed:', error);
      throw new Error(`Irys connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async uploadData(data: any): Promise<string> {
    if (!this.irys) {
      throw new Error('Irys not connected. Call connect() first.');
    }
    
    try {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const receipt = await this.irys.upload(dataString);
      
      console.log('Irys upload success:', { transactionId: receipt.id, timestamp: receipt.timestamp });
      
      return receipt.id;
    } catch (error) {
      console.error('Irys upload failed:', error);
      throw new Error(`Irys upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async getData(transactionId: string): Promise<any> {
    if (!this.irys) {
      throw new Error('Irys not connected. Call connect() first.');
    }
    
    try {
      const response = await fetch(`${import.meta.env.VITE_IRYS_GATEWAY_URL || 'https://gateway.irys.xyz'}/${transactionId}`);
      const data = await response.text();
      
      console.log('Irys download success:', { transactionId, dataLength: data.length });
      
      return data;
    } catch (error) {
      console.error('Irys download failed:', error);
      throw new Error(`Irys download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async getBalance(): Promise<string> {
    if (!this.irys) {
      throw new Error('Irys not connected. Call connect() first.');
    }
    
    try {
      const balance = await this.irys.getLoadedBalance();
      return balance.toString();
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  async fundAccount(amount: string): Promise<void> {
    if (!this.irys) {
      throw new Error('Irys not connected. Call connect() first.');
    }
    
    try {
      const receipt = await this.irys.fund(amount);
      console.log('Irys fund success:', { amount, transactionId: receipt.id });
    } catch (error) {
      console.error('Irys fund failed:', error);
      throw new Error(`Irys fund failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  disconnect(): void {
    this.irys = null;
    console.log('Irys disconnected');
  }
  
  isConnected(): boolean {
    return this.irys !== null;
  }
}
