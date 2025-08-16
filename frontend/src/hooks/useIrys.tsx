import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { toast } from 'sonner';
import { IrysClient, IrysConfig } from '@/lib/irysClient';
import { IRYS_CONFIG } from '@/config/irys';
import { useAccount } from 'wagmi';

// Irys 통합을 위한 간단한 타입 정의
export interface IrysPixelData {
  x: number;
  y: number;
  color: string;
  owner?: string;
  timestamp: number;
  irysId?: string;
  irysPayloadLength?: number;
}

export interface UploadResponse {
  id: string;
  timestamp: number;
  version: string;
  public: string;
  signature: string;
  deadlineHeight: string;
  validatorSignatures: any[];
}

interface IrysContextType {
  isConnected: boolean;
  isLoading: boolean;
  isUploading: boolean;
  balance: string;
  client: IrysClient | null;
  connect: () => Promise<boolean>;
  connectIrys: (config?: any) => Promise<boolean>;
  disconnect: () => void;
  uploadPixelData: (data: IrysPixelData) => Promise<UploadResponse | null>;
  uploadCanvasState: (data: any) => Promise<UploadResponse | null>;
  getFundingPrice: (amount: string) => Promise<number>;
  createAccessList: (transactionId: string, startOffset: number, length: number) => Promise<any[]>;
  getLoadedBalance: () => Promise<string>;
}

// 기본값 제공
const defaultIrysContext: IrysContextType = {
  isConnected: false,
  isLoading: false,
  isUploading: false,
  balance: '0',
  client: null,
  connect: async () => false,
  connectIrys: async () => false,
  disconnect: () => {},
  uploadPixelData: async () => null,
  uploadCanvasState: async () => null,
  getFundingPrice: async () => 0,
  createAccessList: async () => [],
  getLoadedBalance: async () => '0',
};

// 컨텍스트 생성
const IrysContext = createContext<IrysContextType>(defaultIrysContext);

// IrysProvider 컴포넌트
export function IrysProvider({ children }: { children: ReactNode }) {
  const { address, isConnected: walletConnected } = useAccount();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [balance, setBalance] = useState('0');
  const [client, setClient] = useState<IrysClient | null>(null);

  // Irys 클라이언트 초기화
  useEffect(() => {
    const irysConfig: IrysConfig = {
      network: IRYS_CONFIG.network,
      token: IRYS_CONFIG.token,
      rpcUrl: IRYS_CONFIG.rpcUrl
    };
    
    const irysClient = new IrysClient(irysConfig);
    setClient(irysClient);
    
    return () => {
      irysClient.disconnect();
    };
  }, []);

  // 지갑 연결 상태 변경 시 Irys 연결 해제
  useEffect(() => {
    if (!walletConnected && isConnected) {
      disconnect();
    }
  }, [walletConnected, isConnected]);

  const connect = useCallback(async (): Promise<boolean> => {
    if (!client || !address) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setIsLoading(true);
    try {
      // WebIrys auto-connects in browser environments
      // pass empty wallet object instead of private key
      await client.connect({});
      setIsConnected(true);
      
      // 잔액 조회
      const balanceAmount = await client.getBalance();
      setBalance(balanceAmount);
      
      toast.success('Connected to Irys network');
      return true;
    } catch (error) {
      console.error('Irys connection failed:', error);
      toast.error(`Failed to connect to Irys network: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [client, address]);

  const disconnect = useCallback(() => {
    if (client) {
      client.disconnect();
    }
    setIsConnected(false);
    setBalance('0');
    toast.info('Disconnected from Irys network');
  }, [client]);

  const uploadPixelData = useCallback(async (data: IrysPixelData): Promise<UploadResponse | null> => {
    if (!isConnected || !client) {
      toast.error('Not connected to Irys network');
      return null;
    }

    setIsUploading(true);
    try {
      const transactionId = await client.uploadData(data);
      
      const response: UploadResponse = {
        id: transactionId,
        timestamp: Date.now(),
        version: '1.0.0',
        public: 'true',
        signature: 'actual_signature',
        deadlineHeight: 'actual_height',
        validatorSignatures: []
      };

      toast.success(`Pixel data uploaded to Irys: ${transactionId.slice(0, 10)}...`);
      return response;
    } catch (error) {
      console.error('Pixel data upload failed:', error);
      toast.error(`Pixel data upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [isConnected, client]);

  const uploadCanvasState = useCallback(async (data: any): Promise<UploadResponse | null> => {
    if (!isConnected || !client) {
      toast.error('Not connected to Irys network');
      return null;
    }

    setIsUploading(true);
    try {
      const transactionId = await client.uploadData(data);
      
      const response: UploadResponse = {
        id: transactionId,
        timestamp: Date.now(),
        version: '1.0.0',
        public: 'true',
        signature: 'actual_canvas_signature',
        deadlineHeight: 'actual_height',
        validatorSignatures: []
      };

      toast.success(`Canvas state uploaded to Irys: ${transactionId.slice(0, 10)}...`);
      return response;
    } catch (error) {
      console.error('Canvas state upload failed:', error);
      toast.error(`Canvas state upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [isConnected, client]);

  const getFundingPrice = useCallback(async (amount: string): Promise<number> => {
    try {
      const numAmount = parseFloat(amount);
      return numAmount * 0.0001; // Mock price calculation - Updated for 0.1 mIRYS
    } catch (error) {
      console.error('자금 조달 가격 조회 실패:', error);
      return 0;
    }
  }, []);

  const createAccessList = useCallback(async (transactionId: string, startOffset: number, length: number): Promise<any[]> => {
    if (!isConnected || !client) {
      throw new Error('WebIrys not connected to network');
    }

    if (!client.hasProgrammableDataSupport()) {
      throw new Error('Programmable Data not supported by WebIrys client');
    }

    try {
      // Official Irys Programmable Data Access List creation pattern
      // Based on E2E test: irys-js/tests/programmableData.ts
      const accessList = await client.createProgrammableDataAccessList(transactionId, startOffset, length);
      
      console.log('Access list created successfully:', {
        transactionId: transactionId.slice(0, 10) + '...',
        startOffset,
        length,
        accessListLength: accessList.length
      });
      
      return accessList;
    } catch (error) {
      console.error('Programmable Data Access List creation failed:', error);
      throw new Error(`Failed to create access list: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [isConnected, client]);

  const connectIrys = useCallback(async (config?: any): Promise<boolean> => {
    return connect();
  }, [connect]);


  const getLoadedBalance = useCallback(async (): Promise<string> => {
    if (isConnected && client) {
      try {
        const balanceAmount = await client.getBalance();
        setBalance(balanceAmount);
        return balanceAmount;
      } catch (error) {
        console.error('Failed to fetch balance:', error);
        return balance;
      }
    }
    return balance;
  }, [isConnected, client, balance]);

  const contextValue: IrysContextType = {
    isConnected,
    isLoading,
    isUploading,
    balance,
    client,
    connect,
    connectIrys,
    disconnect,
    uploadPixelData,
    uploadCanvasState,
    getFundingPrice,
    createAccessList,
    getLoadedBalance
  };

  return (
    <IrysContext.Provider value={contextValue}>
      {children}
    </IrysContext.Provider>
  );
}

// useIrys 훅
export function useIrys(): IrysContextType {
  const context = useContext(IrysContext);
  if (!context) {
    throw new Error('useIrys must be used within an IrysProvider');
  }
  return context;
}