import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useDisconnect, useSignMessage, useChainId, useSwitchChain } from 'wagmi';
import { useIrys } from './useIrys';
import { toast } from 'sonner';
import { ethers } from 'ethers';

// Wallet integration state interface
export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  balance: string;
  isCorrectNetwork: boolean;
  isIrysConnected: boolean;
  walletProvider: any;
}

// Wallet integration config
export interface WalletIntegrationConfig {
  supportedChainIds: number[];
  irysChainId: number;
  autoConnectIrys: boolean;
  enableBalancePolling: boolean;
  pollingInterval: number;
}

const defaultConfig: WalletIntegrationConfig = {
  supportedChainIds: [1, 11155111, 1270], // Mainnet, Sepolia, Irys Testnet
  irysChainId: 1270, // Irys Testnet
  autoConnectIrys: true,
  enableBalancePolling: true,
  pollingInterval: 10000, // 10 seconds
};

export const useWalletIntegration = (config: Partial<WalletIntegrationConfig> = {}) => {
  const mergedConfig = { ...defaultConfig, ...config };
  
  // wagmi hooks
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  // Irys hooks
  const { connectIrys, isConnected: isIrysConnected, balance: irysBalance } = useIrys();
  
  // Sync Irys connection state with local state
  useEffect(() => {
    setWalletState(prev => ({
      ...prev,
      isIrysConnected
    }));
  }, [isIrysConnected]);
  
  // Local state
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    balance: '0',
    isCorrectNetwork: false,
    isIrysConnected: false,
    walletProvider: null,
  });
  
  const [isInitializing, setIsInitializing] = useState(false);
  const [balancePolling, setBalancePolling] = useState<NodeJS.Timeout | null>(null);
  const providerRef = useRef<ethers.BrowserProvider | null>(null);

  // Initialize wallet provider
  const initializeProvider = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        providerRef.current = provider;
        
        // Fetch network info
        const network = await provider.getNetwork();
        /* dev log removed */
          chainId: Number(network.chainId),
          name: network.name,
        });
        
        return provider;
      } catch (error) {
        
        toast.error('Failed to initialize wallet connection');
        return null;
      }
    }
    return null;
  }, []);

  // Fetch IRYS balance
  const getIrysBalance = useCallback(async (address: string): Promise<string> => {
    if (!providerRef.current) return '0';
    
    try {
      const balance = await providerRef.current.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
       
      return '0';
    }
  }, []);

  // Update wallet state
  const updateWalletState = useCallback(async () => {
    if (!isConnected || !address) {
      setWalletState({
        isConnected: false,
        address: null,
        chainId: null,
        balance: '0',
        isCorrectNetwork: false,
        isIrysConnected: false,
        walletProvider: null,
      });
      return;
    }

    const provider = await initializeProvider();
    const balance = await getIrysBalance(address);
    const isCorrectNetwork = mergedConfig.supportedChainIds.includes(chainId || 0);

    setWalletState({
      isConnected: true,
      address,
      chainId: chainId || null,
      balance,
      isCorrectNetwork,
      isIrysConnected,
      walletProvider: provider,
    });
  }, [isConnected, address, chainId, isIrysConnected, initializeProvider, getIrysBalance, mergedConfig.supportedChainIds]);

  // Connect to Irys
  const connectToIrys = useCallback(async (force: boolean = false) => {
    if (!isConnected || !address || !providerRef.current) {
      toast.error('Please connect your wallet first');
      return false;
    }

    if (isIrysConnected && !force) {
       
      return true;
    }

    // Prevent duplicate init while initializing
    if (isInitializing) {
      
      return false;
    }

    setIsInitializing(true);
    try {
      
      
      // Connect without manual signing (UX)
      // Irys settings (full wallet integration)
        const irysConfig = {
          network: chainId === 1 ? 'mainnet' : 'testnet',
          token: 'irys',
          wallet: {
            provider: providerRef.current,
            name: 'ethersv6',
          },
          config: {
            providerUrl: chainId === 1 
              ? (import.meta.env.VITE_IRYS_MAINNET_RPC || 'https://rpc.irys.xyz') 
              : (import.meta.env.VITE_IRYS_RPC || 'https://testnet-rpc.irys.xyz/v1/execution-rpc'),
            timeout: 30000,
          },
        };

      
      const success = await connectIrys(irysConfig);
      
      if (success) {
        
        toast.success('Successfully connected to Irys network');
        return true;
      } else {
        
        toast.error('Failed to connect to Irys');
        return false;
      }
    } catch (error) {
      
      toast.error('Error during Irys connection');
      return false;
    } finally {
      setIsInitializing(false);
    }
  }, [isConnected, address, chainId, isIrysConnected, connectIrys, isInitializing]);

  // Switch network
  const switchToSupportedNetwork = useCallback(async (targetChainId?: number) => {
    const targetId = targetChainId || mergedConfig.irysChainId;
    
    try {
      
      await switchChain({ chainId: targetId });
      
      // Update state after switching network
      setTimeout(() => {
        updateWalletState();
      }, 2000);
      
      toast.success(`Switched network to ${getNetworkInfo(targetId).name}`);
    } catch (error: any) {
      
      
      // User rejected
      if (error?.code === 4001) {
        toast.error('Network switch rejected');
      } 
      // Network not added to wallet
      else if (error?.code === 4902) {
        toast.error('Network is not added in wallet');
        
        // If Irys testnet, attempt to add network
        if (targetId === 1270) {
          try {
            await window.ethereum?.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x4F6', // 1270 in hex
                chainName: 'Irys Testnet',
                nativeCurrency: {
                  name: 'IRYS',
                  symbol: 'IRYS',
                  decimals: 18,
                },
                rpcUrls: [import.meta.env.VITE_IRYS_RPC || 'https://testnet-rpc.irys.xyz/v1/execution-rpc'],
                blockExplorerUrls: [import.meta.env.VITE_IRYS_EXPLORER_URL || 'https://testnet-explorer.irys.xyz'],
              }],
            });
            toast.success('Irys Testnet has been added to your wallet');
          } catch (addError) {
            
            toast.error('Failed to add network');
          }
        }
      } 
      else {
        toast.error('Failed to switch network');
      }
    }
  }, [switchChain, mergedConfig.irysChainId, updateWalletState]);

  // Disconnect wallet
  const disconnectWallet = useCallback(async () => {
    try {
      // Stop balance polling
      if (balancePolling) {
        clearInterval(balancePolling);
        setBalancePolling(null);
      }

      // Cleanup provider
      providerRef.current = null;

      // Disconnect wagmi
      disconnect();
      
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [disconnect, balancePolling]);

  // Start balance polling
  const startBalancePolling = useCallback(() => {
    if (!mergedConfig.enableBalancePolling || !address) return;

    if (balancePolling) {
      clearInterval(balancePolling);
    }

    const interval = setInterval(async () => {
      if (address && providerRef.current) {
        const balance = await getIrysBalance(address);
        setWalletState(prev => ({ ...prev, balance }));
      }
    }, mergedConfig.pollingInterval);

    setBalancePolling(interval);
  }, [address, balancePolling, getIrysBalance, mergedConfig.enableBalancePolling, mergedConfig.pollingInterval]);

  // Wallet event listeners
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        
        if (accounts.length === 0) {
          disconnectWallet();
        }
      };

      const handleChainChanged = (chainId: string) => {
        
        // Update state without full reload
        setTimeout(() => {
          updateWalletState();
        }, 1000);
      };

      const handleDisconnect = () => {
        
        disconnectWallet();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
        window.ethereum?.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [disconnectWallet]);

  // Watch wallet state changes
  useEffect(() => {
    updateWalletState();
  }, [updateWalletState, isIrysConnected]); // isIrysConnected 추가

  // Auto-connect Irys
  useEffect(() => {
    if (
      mergedConfig.autoConnectIrys && 
      isConnected && 
      address && 
      walletState.isCorrectNetwork && 
      !isIrysConnected &&
      !isInitializing
    ) {
      // Use setTimeout to avoid loops
      const timer = setTimeout(() => {
        connectToIrys();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [
    mergedConfig.autoConnectIrys,
    isConnected,
    address,
    walletState.isCorrectNetwork,
    isIrysConnected,
    isInitializing
    // connectToIrys 제거 - 무한루프 방지
  ]);

  // Start balance polling
  useEffect(() => {
    if (isConnected && address) {
      startBalancePolling();
    }

    return () => {
      if (balancePolling) {
        clearInterval(balancePolling);
      }
    };
  }, [isConnected, address, startBalancePolling]);

  // Format wallet info
  const formatAddress = useCallback((addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  const formatBalance = useCallback((balance: string, decimals: number = 4) => {
    return `${parseFloat(balance).toFixed(decimals)} IRYS`;
  }, []);

  // Network info
  const getNetworkInfo = (chainId: number) => {
    const networks: Record<number, { name: string; color: string; isTestnet: boolean }> = {
      1: { name: 'Ethereum Mainnet', color: 'green', isTestnet: false },
      11155111: { name: 'Sepolia Testnet', color: 'yellow', isTestnet: true },
      1270: { name: 'Irys Testnet', color: 'blue', isTestnet: true },
    };

    return networks[chainId] || { name: 'Unknown Network', color: 'gray', isTestnet: true };
  };

  return {
    // State
    walletState,
    isInitializing,
    
    // Actions
    connectToIrys,
    switchToSupportedNetwork,
    disconnectWallet,
    
    // Utils
    formatAddress,
    formatBalance,
    getNetworkInfo,
    
    // Provider access
    provider: providerRef.current,
    
    // Computed values
    needsNetworkSwitch: isConnected && !walletState.isCorrectNetwork,
    canConnectIrys: isConnected && walletState.isCorrectNetwork && !isIrysConnected,
    isFullyConnected: isConnected && isIrysConnected && walletState.isCorrectNetwork,
  };
};
