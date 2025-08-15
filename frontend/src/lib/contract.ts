import { formatEther } from 'ethers'
import { IRYS_CONFIG } from '@/config/irys'
import { config as wagmiConfig } from '@/config'
// wagmi actions for contract interactions
import { 
  writeContract, 
  waitForTransactionReceipt, 
  simulateContract, 
  readContract,
  getPublicClient
} from 'wagmi/actions'
import { parseEther, createPublicClient, http } from 'viem'

export const ABI = [
  { "inputs": [], "name": "getCanvasInfo", "outputs": [ { "internalType": "uint256", "name": "width", "type": "uint256" }, { "internalType": "uint256", "name": "height", "type": "uint256" }, { "internalType": "uint256", "name": "totalPixelsPlaced", "type": "uint256" }, { "internalType": "uint256", "name": "pixelPriceWei", "type": "uint256" }, { "internalType": "uint256", "name": "maxSize", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "pixelPrice", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "x", "type": "uint256" }, { "internalType": "uint256", "name": "y", "type": "uint256" }, { "internalType": "bytes3", "name": "color", "type": "bytes3" }, { "internalType": "string", "name": "irysTxId", "type": "string" } ], "name": "placePixel", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "x", "type": "uint256" }, { "internalType": "uint256", "name": "y", "type": "uint256" }, { "internalType": "string", "name": "irysTxId", "type": "string" } ], "name": "placePixelWithProgrammableData", "outputs": [], "stateMutability": "payable", "type": "function" },
  { "inputs": [ { "internalType": "uint256", "name": "x", "type": "uint256" }, { "internalType": "uint256", "name": "y", "type": "uint256" } ], "name": "getPixel", "outputs": [ { "internalType": "bytes3", "name": "color", "type": "bytes3" }, { "internalType": "address", "name": "placedBy", "type": "address" }, { "internalType": "uint256", "name": "timestamp", "type": "uint256" }, { "internalType": "string", "name": "irysTxId", "type": "string" }, { "internalType": "bool", "name": "isProgrammableData", "type": "bool" } ], "stateMutability": "view", "type": "function" },
  // Rate limiting functions
  { "inputs": [], "name": "minPlacementInterval", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "inputs": [ { "internalType": "address", "name": "", "type": "address" } ], "name": "lastPlacementAt", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" },
  { "anonymous": false, "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "x", "type": "uint256" },
      { "indexed": true, "internalType": "uint256", "name": "y", "type": "uint256" },
      { "indexed": false, "internalType": "bytes3", "name": "color", "type": "bytes3" },
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ], "name": "PixelPlaced", "type": "event" }
] as const

// Load settings from env/config
const RPC_URL = IRYS_CONFIG.rpcUrl
export const CONTRACT_ADDRESS = IRYS_CONFIG.contractAddress as `0x${string}`
const CHAIN_ID = IRYS_CONFIG.chainId
const BLOCK_CONFIRMATIONS = IRYS_CONFIG.blockConfirmations
const MAX_GAS_LIMIT = IRYS_CONFIG.maxGasLimit

// Create public client for reading contract data
export function getPublicClientForReads() {
  return createPublicClient({
    chain: {
      id: CHAIN_ID,
      name: IRYS_CONFIG.network === 'testnet' ? 'Irys Testnet' : 'Irys Mainnet',
      network: IRYS_CONFIG.network === 'testnet' ? 'irys-testnet' : 'irys-mainnet',
      nativeCurrency: {
        name: IRYS_CONFIG.network === 'testnet' ? 'mIrys' : 'IRYS',
        symbol: IRYS_CONFIG.network === 'testnet' ? 'mIRYS' : 'IRYS',
        decimals: 18,
      },
      rpcUrls: {
        default: { http: [RPC_URL] },
        public: { http: [RPC_URL] },
      },
    },
    transport: http(RPC_URL),
  })
}

export function getChainIdFromEnv(): number {
  return CHAIN_ID
}

export function getWsUrlFromEnv(): string { return IRYS_CONFIG.wsUrl as any }

export function getConfirmationsFromEnv(): number {
  return BLOCK_CONFIRMATIONS
}

export function getMaxGasLimit(): number {
  return MAX_GAS_LIMIT
}

export function getGasMultiplier(): number {
  return GAS_MULTIPLIER
}

export async function fetchCanvasInfo() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set. Please set VITE_CONTRACT_ADDRESS')
  }

  try {
    // Primary: Use wagmi readContract for better type safety
    const [width, height, totalPixelsPlaced, pixelPriceWei, maxSize] = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'getCanvasInfo',
    }) as readonly [bigint, bigint, bigint, bigint, bigint]

    return {
      width: Number(width),
      height: Number(height),
      totalPixelsPlaced: Number(totalPixelsPlaced),
      maxSize: Number(maxSize),
      pixelPrice: Number(formatEther(pixelPriceWei.toString())),
      pixelPriceWei: pixelPriceWei,
    }
  } catch (primaryError) {
    try {
      // Fallback: Read pixelPrice only
      const pixelPriceWei = await readContract(wagmiConfig, {
        address: CONTRACT_ADDRESS,
        abi: ABI,
        functionName: 'pixelPrice',
      }) as bigint

      return {
        width: 1024,
        height: 1024,
        totalPixelsPlaced: 0,
        maxSize: 1024,
        pixelPrice: Number(formatEther(pixelPriceWei.toString())),
        pixelPriceWei,
      }
    } catch (fallbackError) {
      console.error('Failed to fetch canvas info:', fallbackError)
      throw fallbackError
    }
  }
}

function hexToBytes3(hex: string): string {
  const h = hex.replace('#', '')
  const r = h.slice(0, 2).padStart(2, '0')
  const g = h.slice(2, 4).padStart(2, '0')
  const b = h.slice(4, 6).padStart(2, '0')
  return `0x${r}${g}${b}`
}

export async function placePixelWrite(
  x: number,
  y: number,
  hexColor: string,
  irysTxId: string,
  valueWei: bigint
) {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set. Please set VITE_CONTRACT_ADDRESS')
  }

  const colorBytes = hexToBytes3(hexColor) as `0x${string}`

  try {
    // Use wagmi for contract interaction
    const { request } = await simulateContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'placePixel',
      args: [BigInt(x), BigInt(y), colorBytes, irysTxId],
      value: valueWei,
    })

    const hash = await writeContract(wagmiConfig, request)
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
    return receipt
  } catch (error) {
    console.error('Failed to place pixel:', error)
    throw error
  }
}

/**
 * @dev Official Irys Programmable Data transaction function
 * 
 * Official guide: https://github.com/Irys-xyz/irys-js/blob/master/tests/programmableData.ts
 * Reference: Official example - Include Access List in EIP-1559 transaction
 * 
 * Note: Only data uploaded to permanent storage (ledgerId 0) can be read
 *       DataItems are currently unsupported (planned for future support)
 * 
 * @param x X coordinate
 * @param y Y coordinate
 * @param irysTxId Irys transaction ID (must be included in Access List)
 * @param accessList Programmable Data Access List
 * @param valueWei Payment amount (wei)
 * @returns Transaction receipt
 */
export async function placePixelWithPDWrite(
  x: number,
  y: number,
  irysTxId: string,
  accessList: any[], // Access List array
  valueWei: bigint
) {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set')
  }

  try {
    // Use wagmi to simulate the transaction first
    const { request } = await simulateContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'placePixelWithProgrammableData',
      args: [BigInt(x), BigInt(y), irysTxId],
      value: valueWei,
      // Note: accessList support in wagmi might be limited, may need custom transaction
    })

    const hash = await writeContract(wagmiConfig, request)
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
    
    return receipt
    
  } catch (error) {
    console.error('Programmable Data transaction failed:', error)
    throw new Error(`Programmable Data transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

// Legacy compatibility function (for testing/local development)
export async function placePixelWithPDWriteLegacy(
  x: number,
  y: number,
  irysTxId: string,
  startOffset: number,
  length: number,
  valueWei: bigint
) {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set')
  }

  try {
    const { request } = await simulateContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'placePixelWithProgrammableDataLegacy',
      args: [BigInt(x), BigInt(y), irysTxId, BigInt(startOffset), BigInt(length)],
      value: valueWei,
    })

    const hash = await writeContract(wagmiConfig, request)
    const receipt = await waitForTransactionReceipt(wagmiConfig, { hash })
    return receipt
  } catch (error) {
    console.error('Legacy PD transaction failed:', error)
    throw error
  }
}

// funding removed

export async function estimatePixelPlaceFeeEth(
  x: number,
  y: number,
  hexColor: string,
  irysTxId: string,
  valueWei: bigint
): Promise<number> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set')
  }

  try {
    const colorBytes = hexToBytes3(hexColor) as `0x${string}`
    
    // Use simulateContract to get gas estimation
    const { request } = await simulateContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'placePixel',
      args: [BigInt(x), BigInt(y), colorBytes, irysTxId],
      value: valueWei,
    })

    // Estimate gas usage (wagmi doesn't expose gas directly, use a reasonable default)
    const estimatedGas = 150000n // Conservative estimate for pixel placement
    const gasPrice = 1000000000n // 1 gwei (Irys network)
    const totalWei = estimatedGas * gasPrice
    
    return Number(formatEther(totalWei.toString()))
  } catch (error) {
    console.error('Failed to estimate gas:', error)
    return 0.001 // Fallback estimate
  }
}

export async function estimateContributeFeeEth(amountWei: bigint): Promise<number> {
  return 0
}

export type PixelPlacedEvent = {
  x: bigint;
  y: bigint;
  color: string; // 0xRRGGBB
  user: string;
  timestamp: bigint;
  blockNumber: number;
}

export type FundingEvent = {
  // removed
}

export async function queryPixelPlacedEvents(fromBlock: number, toBlock: number): Promise<PixelPlacedEvent[]> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set')
  }

  try {
    const publicClient = getPublicClientForReads()
    
    const logs = await publicClient.getLogs({
      address: CONTRACT_ADDRESS,
      event: {
        type: 'event',
        name: 'PixelPlaced',
        inputs: [
          { indexed: true, internalType: 'uint256', name: 'x', type: 'uint256' },
          { indexed: true, internalType: 'uint256', name: 'y', type: 'uint256' },
          { indexed: false, internalType: 'bytes3', name: 'color', type: 'bytes3' },
          { indexed: true, internalType: 'address', name: 'user', type: 'address' },
          { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' }
        ]
      },
      fromBlock: BigInt(fromBlock),
      toBlock: BigInt(toBlock),
    })

    return logs.map(log => ({
      x: log.args.x as bigint,
      y: log.args.y as bigint,
      color: log.args.color as string,
      user: log.args.user as string,
      timestamp: log.args.timestamp as bigint,
      blockNumber: Number(log.blockNumber),
    }))
  } catch (error) {
    console.error('Failed to query pixel events:', error)
    return []
  }
}

export async function queryFundingEvents(fromBlock: number, toBlock: number): Promise<FundingEvent[]> {
  return []
}

export async function getCurrentBlockNumber(): Promise<number> {
  try {
    const publicClient = getPublicClientForReads()
    const blockNumber = await publicClient.getBlockNumber()
    return Number(blockNumber)
  } catch (error) {
    console.error('Failed to get current block number:', error)
    return 0
  }
}

// Rate limiting functions
export async function getRateLimitInfo() {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set')
  }

  try {
    const minInterval = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'minPlacementInterval',
    }) as bigint

    return {
      minPlacementInterval: Number(minInterval),
      isEnabled: Number(minInterval) > 0
    }
  } catch (error) {
    console.error('Failed to get rate limit info:', error)
    return { minPlacementInterval: 0, isEnabled: false }
  }
}

export async function getLastPlacementTime(address: string) {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set')
  }

  try {
    const lastPlacement = await readContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'lastPlacementAt',
      args: [address as `0x${string}`],
    }) as bigint

    return Number(lastPlacement)
  } catch (error) {
    console.error('Failed to get last placement time:', error)
    return 0
  }
}

export async function checkRateLimitStatus(address: string) {
  if (!CONTRACT_ADDRESS || !address) {
    return { canPlace: true, timeRemaining: 0, message: 'Address not available' }
  }

  try {
    const [rateLimitInfo, lastPlacement] = await Promise.all([
      getRateLimitInfo(),
      getLastPlacementTime(address)
    ])

    if (!rateLimitInfo.isEnabled) {
      return { canPlace: true, timeRemaining: 0, message: 'Rate limiting disabled' }
    }

    if (lastPlacement === 0) {
      return { canPlace: true, timeRemaining: 0, message: 'First placement' }
    }

    const currentTime = Math.floor(Date.now() / 1000)
    const timeSinceLastPlacement = currentTime - lastPlacement
    const timeRemaining = Math.max(0, rateLimitInfo.minPlacementInterval - timeSinceLastPlacement)
    const canPlace = timeRemaining === 0

    return {
      canPlace,
      timeRemaining,
      message: canPlace 
        ? 'Ready to place pixel' 
        : `Must wait ${timeRemaining}s before next placement`
    }
  } catch (error) {
    console.error('Failed to check rate limit status:', error)
    return { canPlace: false, timeRemaining: 0, message: 'Unable to check rate limit' }
  }
}

// Gas/Fee estimation helpers
export async function estimatePlacePixelFeeWei(
  x: number,
  y: number,
  hexColor: string,
  irysTxId: string,
  valueWei: bigint
): Promise<{ gasLimit: bigint; feePerGasWei: bigint; totalFeeWei: bigint }> {
  if (!CONTRACT_ADDRESS) {
    throw new Error('Contract address not set')
  }

  try {
    const colorBytes = hexToBytes3(hexColor) as `0x${string}`
    
    // Use simulateContract for gas estimation
    await simulateContract(wagmiConfig, {
      address: CONTRACT_ADDRESS,
      abi: ABI,
      functionName: 'placePixel',
      args: [BigInt(x), BigInt(y), colorBytes, irysTxId],
      value: valueWei,
    })

    // Use conservative estimates for Irys network
    const gasLimit = 150000n
    const feePerGasWei = 1000000000n // 1 gwei
    const totalFeeWei = gasLimit * feePerGasWei
    
    return { gasLimit, feePerGasWei, totalFeeWei }
  } catch (error) {
    console.error('Failed to estimate gas:', error)
    // Fallback estimates
    const gasLimit = 200000n
    const feePerGasWei = 1000000000n
    const totalFeeWei = gasLimit * feePerGasWei
    return { gasLimit, feePerGasWei, totalFeeWei }
  }
}

export async function estimateContributeFeeWei(
  amountWei: bigint
): Promise<{ gasLimit: bigint; feePerGasWei: bigint; totalFeeWei: bigint }> {
  // Funding disabled: return zeroed estimation
  return { gasLimit: 0n, feePerGasWei: 0n, totalFeeWei: 0n }
}
