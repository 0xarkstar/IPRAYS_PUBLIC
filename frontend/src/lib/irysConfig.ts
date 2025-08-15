// Irys 네트워크 설정 및 상태 관리

import { toast } from 'sonner';

export interface IrysNetwork {
  name: string;
  url: string;
  token: string;
  isTestnet: boolean;
  faucetUrl?: string;
}

export interface NetworkStatus {
  healthy: boolean;
  latency?: number;
  blockHeight?: number;
  nodeVersion?: string;
  error?: string;
}

// Irys 네트워크 설정 (공식 문서 기반)
export const IRYS_NETWORKS: Record<string, IrysNetwork> = {
  devnet: {
    name: 'Irys Devnet',
    url: 'https://devnet.irys.xyz',
    token: 'matic',
    isTestnet: true,
    faucetUrl: import.meta.env.VITE_POLYGON_FAUCET_URL || 'https://faucet.polygon.technology/',
  },
  mainnet: {
    name: 'Irys Mainnet',
    url: 'https://node1.irys.xyz',
    token: 'matic',
    isTestnet: false,
  },
  local: {
    name: 'Local Irys Node',
    url: 'http://localhost:4000',
    token: 'matic',
    isTestnet: true,
  },
};

// 환경 변수에서 네트워크 설정 가져오기
export const getCurrentNetwork = (): IrysNetwork => {
  const networkName = import.meta.env.VITE_IRYS_NETWORK || 'devnet';
  const customUrl = import.meta.env.VITE_IRYS_URL;
  
  if (customUrl) {
    return {
      name: 'Custom',
      url: customUrl,
      token: import.meta.env.VITE_IRYS_TOKEN || 'matic',
      isTestnet: true,
    };
  }
  
  return IRYS_NETWORKS[networkName] || IRYS_NETWORKS.devnet;
};

// 네트워크 연결 설정
export const getConnectionConfig = () => {
  const network = getCurrentNetwork();
  
  return {
    url: network.url,
    token: network.token,
    key: getPrivateKey(),
    config: {
      providerUrl: getProviderUrl(),
    },
  };
};

// Private key 가져오기 (환경 변수에서)
const getPrivateKey = (): string => {
  // 개발 환경에서만 환경 변수 사용
  if (import.meta.env.DEV && import.meta.env.VITE_IRYS_PRIVATE_KEY) {
    return import.meta.env.VITE_IRYS_PRIVATE_KEY;
  }
  
  // 프로덕션에서는 지갑에서 가져옴
  throw new Error('Private key not available - use wallet connection');
};

// Provider URL 가져오기
const getProviderUrl = (): string => {
  const network = getCurrentNetwork();
  
  if (network.token === 'matic') {
    return import.meta.env.VITE_POLYGON_RPC_URL || 'https://polygon-rpc.com';
  }
  
  return import.meta.env.VITE_ETH_RPC_URL || 'https://eth.llamarpc.com';
};

// 네트워크 상태 확인
export const checkNetworkHealth = async (nodeUrl?: string): Promise<NetworkStatus> => {
  const network = getCurrentNetwork();
  const url = nodeUrl || network.url;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const startTime = Date.now();
    const response = await fetch(`${url}/info`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;
    
    if (response.ok) {
      const info = await response.json();
      return {
        healthy: true,
        latency,
        blockHeight: info.height,
        nodeVersion: info.version,
      };
    }
    
    return {
      healthy: false,
      error: `HTTP ${response.status}: ${response.statusText}`,
    };
    
  } catch (error) {
    return {
      healthy: false,
      error: error instanceof Error ? error.message : 'Network check failed',
    };
  }
};

// 네트워크 자동 전환
export const switchToOptimalNetwork = async (): Promise<IrysNetwork> => {
  const networks = Object.values(IRYS_NETWORKS).filter(n => n.isTestnet);
  
  for (const network of networks) {
    const status = await checkNetworkHealth(network.url);
    if (status.healthy && (status.latency || 0) < 5000) {
      return network;
    }
  }
  
  toast.warning('All networks seem slow, using default devnet');
  return IRYS_NETWORKS.devnet;
};

// 네트워크 설정 검증
export const validateNetworkConfig = (): boolean => {
  try {
    const network = getCurrentNetwork();
    
    if (!network.url || !network.token) {
      toast.error('Invalid network configuration');
      return false;
    }
    
    return true;
  } catch (error) {
    toast.error('Network configuration error');
    return false;
  }
};