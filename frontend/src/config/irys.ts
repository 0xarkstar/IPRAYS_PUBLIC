export const IRYS_CONFIG = {
  // Network settings
  network: (import.meta.env.VITE_IRYS_NETWORK as 'mainnet' | 'testnet') || 'testnet',
  token: 'irys' as const, // Native IRYS token
  
  // RPC & WebSocket URLs
  rpcUrl: import.meta.env.VITE_IRYS_RPC || 'https://testnet-rpc.irys.xyz/v1/execution-rpc',
  wsUrl: import.meta.env.VITE_IRYS_WS || null,
  
  // Best practice URL patterns
  uploaderUrl: import.meta.env.VITE_IRYS_UPLOADER_URL || 'http://uploader.irys.xyz',
  gatewayUrl: import.meta.env.VITE_IRYS_GATEWAY_URL || 'https://gateway.irys.xyz',
  
  // Contract settings - Updated with latest deployment
  contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS || '0x9A854fA655994069500523f57101Ee80b753ea13',
  implementationAddress: import.meta.env.VITE_IMPLEMENTATION_ADDRESS || '0xD83cE894A6D4c8d6aC378887110ccf2e883d540F',
  chainId: Number(import.meta.env.VITE_CHAIN_ID) || 1270,
  
  // Blockchain settings
  blockConfirmations: Number(import.meta.env.VITE_BLOCK_CONFIRMATIONS) || 3,
  
  // Gas settings
  maxGasLimit: Number(import.meta.env.VITE_MAX_GAS_LIMIT) || 500000,
  gasMultiplier: Number(import.meta.env.VITE_GAS_MULTIPLIER) || 1.2,
  
  // Retry settings
  maxRetries: Number(import.meta.env.VITE_MAX_RETRIES) || 3,
  retryDelay: Number(import.meta.env.VITE_RETRY_DELAY) || 1000,
  
  // Data settings
  maxPayloadSize: Number(import.meta.env.VITE_MAX_PAYLOAD_SIZE) || 1024 * 1024, // 1MB
  chunkSize: Number(import.meta.env.VITE_CHUNK_SIZE) || 1024 * 64, // 64KB
};

export const IRYS_NETWORKS = {
  testnet: {
    name: 'Irys Testnet',
    rpc: 'https://testnet-rpc.irys.xyz/v1/execution-rpc',
    ws: 'wss://testnet-rpc.irys.xyz/v1/ws', // Placeholder - actual WS URL TBD
    explorer: 'https://testnet-explorer.irys.xyz',
    chainId: 1270,
    nativeCurrency: {
      name: 'mIrys',
      symbol: 'mIRYS', // Mini IRYS - atomic unit
      decimals: 18
    }
  },
  mainnet: {
    name: 'Irys Mainnet',
    rpc: 'https://rpc.irys.xyz/v1/execution-rpc', // TBD - mainnet not available yet
    ws: 'wss://rpc.irys.xyz/v1/ws',
    explorer: 'https://explorer.irys.xyz',
    chainId: 1270, // Same chain ID as testnet for now
    nativeCurrency: {
      name: 'IRYS',
      symbol: 'IRYS',
      decimals: 18
    }
  }
};

export const getNetworkConfig = (network: 'mainnet' | 'testnet' = 'testnet') => {
  return IRYS_NETWORKS[network];
};

export const isTestnet = () => IRYS_CONFIG.network === 'testnet';
export const isMainnet = () => IRYS_CONFIG.network === 'mainnet';

// Helpers for switching networks
export const switchToIrysNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Wallet not installed');
  }

  const networkConfig = getNetworkConfig(IRYS_CONFIG.network);
  const chainIdHex = `0x${networkConfig.chainId.toString(16)}`;

  try {
    // Attempt to switch network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError: any) {
    // Add network if missing
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: networkConfig.name,
              nativeCurrency: networkConfig.nativeCurrency,
              rpcUrls: [networkConfig.rpc],
              blockExplorerUrls: [networkConfig.explorer],
            },
          ],
        });
      } catch (addError) {
        throw new Error('Failed to add network');
      }
    } else {
      throw new Error('Failed to switch network');
    }
  }
};

export const checkAndSwitchNetwork = async () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    return false;
  }

  try {
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainId, 16);
    
    if (currentChainId !== IRYS_CONFIG.chainId) {
      await switchToIrysNetwork();
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to check network:', error);
    return false;
  }
};

// Helper functions for URL generation (Best Practice)
export const getIrysUrls = (txId: string) => ({
  uploader: `${IRYS_CONFIG.uploaderUrl}/tx/${txId}`,
  gateway: `${IRYS_CONFIG.gatewayUrl}/${txId}`,
  // Legacy compatibility
  download: `${IRYS_CONFIG.gatewayUrl}/${txId}`
});

export const getTxUrl = (txId: string, preferUploader = true): string => {
  return preferUploader 
    ? `${IRYS_CONFIG.uploaderUrl}/tx/${txId}`
    : `${IRYS_CONFIG.gatewayUrl}/${txId}`;
};
