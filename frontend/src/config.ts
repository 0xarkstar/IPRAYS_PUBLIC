import { http, createConfig } from 'wagmi'
import { sepolia, mainnet } from 'wagmi/chains'
import { defineChain } from 'viem'
import { injected, metaMask, safe, walletConnect } from 'wagmi/connectors'

// WalletConnect Project ID - 실제 프로젝트에서는 https://cloud.walletconnect.com/ 에서 발급받으세요
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo'

// Irys 테스트넷 체인 정의
const irysTestnet = defineChain({
  id: 1270,
  name: 'Irys Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'IRYS',
    symbol: 'IRYS',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.irys.xyz/v1/execution-rpc'],
    },
  },
  blockExplorers: {
    default: { name: 'Irys Explorer', url: 'https://explorer.irys.xyz' },
  },
  testnet: true,
})

export const config = createConfig({
  chains: [sepolia, mainnet, irysTestnet],
  connectors: [
    injected(), // MetaMask, Brave Wallet, etc.
    metaMask(), // MetaMask 전용
    walletConnect({ projectId }), // WalletConnect 지원 지갑들
    safe(), // Safe (Gnosis Safe)
  ],
  transports: {
    [sepolia.id]: http(),
    [mainnet.id]: http(),
    [irysTestnet.id]: http('https://testnet-rpc.irys.xyz/v1/execution-rpc'),
  },
})
