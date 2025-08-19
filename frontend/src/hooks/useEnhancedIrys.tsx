import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { EnhancedIrysClient } from '@/lib/irysClientEnhanced';
import { IrysBackupManager } from '@/lib/irysBackupManager';
import { IRYS_CONFIG, getTxUrl } from '@/config/irys';

export interface EnhancedIrysState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  balance: string | null;
  client: EnhancedIrysClient | null;
  backupManager: IrysBackupManager | null;
}

export const useEnhancedIrys = () => {
  const { isConnected: walletConnected } = useAccount();
  const [state, setState] = useState<EnhancedIrysState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    balance: null,
    client: null,
    backupManager: null
  });

  // Initialize Irys client
  const initializeClient = useCallback(async () => {
    if (!walletConnected || state.isConnecting) return;

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const client = new EnhancedIrysClient({
        network: IRYS_CONFIG.network,
        token: IRYS_CONFIG.token
      });

      await client.connect();
      const balance = await client.getBalance();
      const backupManager = new IrysBackupManager(client);

      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        client,
        backupManager,
        balance
      }));

      console.log('Enhanced Irys client initialized successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage
      }));
      console.error('Enhanced Irys initialization failed:', error);
    }
  }, [walletConnected, state.isConnecting]);

  // Auto-initialize when wallet connects
  useEffect(() => {
    if (walletConnected && !state.isConnected && !state.isConnecting) {
      initializeClient();
    }
  }, [walletConnected, state.isConnected, state.isConnecting, initializeClient]);

  // Upload pixel data with mutability and backup
  const uploadPixelData = useCallback(async (pixelData: any, canvasState: any, previousTxId?: string) => {
    if (!state.client || !state.backupManager) {
      throw new Error('Enhanced Irys not connected');
    }

    try {
      // Upload with backup functionality
      const result = await state.client.uploadPixelWithBackup(pixelData, canvasState, previousTxId);
      
      console.log('Pixel uploaded with backup:', {
        txId: result.txId,
        isMutable: result.isMutable,
        uploaderUrl: result.uploaderUrl
      });

      return result;
    } catch (error) {
      console.error('Pixel upload failed:', error);
      throw error;
    }
  }, [state.client, state.backupManager]);

  // Create canvas snapshot
  const createSnapshot = useCallback(async (canvasData: any[], metadata: any) => {
    if (!state.backupManager) {
      throw new Error('Backup manager not available');
    }

    try {
      const txId = await state.backupManager.createSnapshot(canvasData, metadata);
      console.log('Canvas snapshot created:', txId);
      return txId;
    } catch (error) {
      console.error('Snapshot creation failed:', error);
      throw error;
    }
  }, [state.backupManager]);

  // Restore from snapshot
  const restoreFromSnapshot = useCallback(async (txId: string) => {
    if (!state.backupManager) {
      throw new Error('Backup manager not available');
    }

    try {
      const snapshot = await state.backupManager.restoreFromSnapshot(txId);
      console.log('Canvas restored from snapshot:', txId);
      return snapshot;
    } catch (error) {
      console.error('Snapshot restoration failed:', error);
      throw error;
    }
  }, [state.backupManager]);

  // Get data with best practice URL
  const getData = useCallback(async (txId: string, preferUploader = true) => {
    if (!state.client) {
      throw new Error('Enhanced Irys not connected');
    }

    try {
      const data = await state.client.getData(txId, preferUploader);
      console.log('Data retrieved successfully:', {
        txId,
        url: getTxUrl(txId, preferUploader),
        size: JSON.stringify(data).length
      });
      return data;
    } catch (error) {
      console.error('Data retrieval failed:', error);
      throw error;
    }
  }, [state.client]);

  // Create access list for Programmable Data
  const createAccessList = useCallback(async (txId: string, startOffset = 0, length?: number) => {
    if (!state.client) {
      throw new Error('Enhanced Irys not connected');
    }

    try {
      const accessList = await state.client.createAccessList(txId, startOffset, length);
      console.log('Access list created for Programmable Data:', {
        txId,
        startOffset,
        length,
        accessListLength: accessList.length
      });
      return accessList;
    } catch (error) {
      console.error('Access list creation failed:', error);
      throw error;
    }
  }, [state.client]);

  // Get URL patterns for a transaction
  const getUrls = useCallback((txId: string) => {
    if (!state.client) {
      return {
        uploader: getTxUrl(txId, true),
        gateway: getTxUrl(txId, false),
        download: getTxUrl(txId, false)
      };
    }
    return state.client.getUrls(txId);
  }, [state.client]);

  // Fund wallet
  const fundWallet = useCallback(async (amount: string) => {
    if (!state.client) {
      throw new Error('Enhanced Irys not connected');
    }

    try {
      await state.client.fundWallet(amount);
      const newBalance = await state.client.getBalance();
      setState(prev => ({ ...prev, balance: newBalance }));
      console.log('Wallet funded successfully:', { amount, newBalance });
    } catch (error) {
      console.error('Wallet funding failed:', error);
      throw error;
    }
  }, [state.client]);

  // Refresh balance
  const refreshBalance = useCallback(async () => {
    if (!state.client) return;

    try {
      const balance = await state.client.getBalance();
      setState(prev => ({ ...prev, balance }));
      return balance;
    } catch (error) {
      console.error('Balance refresh failed:', error);
      throw error;
    }
  }, [state.client]);

  // Get latest snapshot
  const getLatestSnapshot = useCallback(async () => {
    if (!state.backupManager) {
      throw new Error('Backup manager not available');
    }

    try {
      return await state.backupManager.getLatestSnapshot();
    } catch (error) {
      console.error('Failed to get latest snapshot:', error);
      throw error;
    }
  }, [state.backupManager]);

  // List all snapshots
  const listSnapshots = useCallback(async () => {
    if (!state.backupManager) {
      throw new Error('Backup manager not available');
    }

    try {
      return await state.backupManager.listSnapshots();
    } catch (error) {
      console.error('Failed to list snapshots:', error);
      throw error;
    }
  }, [state.backupManager]);

  // Cleanup old snapshots
  const cleanupSnapshots = useCallback(async (keepCount = 5) => {
    if (!state.backupManager) {
      throw new Error('Backup manager not available');
    }

    try {
      await state.backupManager.cleanupOldSnapshots(keepCount);
      console.log(`Cleanup completed, kept ${keepCount} snapshots`);
    } catch (error) {
      console.error('Snapshot cleanup failed:', error);
      throw error;
    }
  }, [state.backupManager]);

  return {
    // State
    ...state,
    
    // Actions
    initializeClient,
    uploadPixelData,
    createSnapshot,
    restoreFromSnapshot,
    getData,
    createAccessList,
    getUrls,
    fundWallet,
    refreshBalance,
    getLatestSnapshot,
    listSnapshots,
    cleanupSnapshots,
    
    // Helper
    getTxUrl: (txId: string, preferUploader = true) => getTxUrl(txId, preferUploader)
  };
};

export default useEnhancedIrys;