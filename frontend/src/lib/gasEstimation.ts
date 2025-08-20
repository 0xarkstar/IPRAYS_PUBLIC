import { formatEther } from 'ethers'
import { getPublicClientForReads, CONTRACT_ADDRESS, ABI } from './contract'

function hexToBytes3(hex: string): string {
  const h = hex.replace('#', '')
  const r = h.slice(0, 2).padStart(2, '0')
  const g = h.slice(2, 4).padStart(2, '0')
  const b = h.slice(4, 6).padStart(2, '0')
  return `0x${r}${g}${b}`
}

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
    const publicClient = getPublicClientForReads()
    
    // Get current network gas price (real-time)
    const gasPrice = await publicClient.getGasPrice()
    
    // Try to get accurate gas estimate
    let estimatedGas: bigint
    
    try {
      const dummyAccount = '0x1000000000000000000000000000000000000001' as `0x${string}`
      
      estimatedGas = await publicClient.estimateGas({
        account: dummyAccount,
        to: CONTRACT_ADDRESS,
        data: publicClient.encodeFunctionData({
          abi: ABI,
          functionName: 'placePixel',
          args: [BigInt(x), BigInt(y), colorBytes, irysTxId],
        }),
        value: valueWei,
      })
      
      // Add 20% safety buffer
      estimatedGas = (estimatedGas * 12n) / 10n
      
    } catch (gasEstimateError) {
      // Realistic fallback - pixel placement typically uses 80-120k gas
      estimatedGas = 100000n
      console.warn('Gas estimation failed, using fallback:', gasEstimateError)
    }
    
    // Calculate total transaction fee
    const totalWei = estimatedGas * gasPrice
    const totalEth = Number(formatEther(totalWei.toString()))
    
    console.log('⛽ Gas Estimation:', {
      gasLimit: estimatedGas.toString(),
      gasPriceGwei: Number(formatEther(gasPrice * 1000000000n)).toFixed(2),
      totalFeeIRYS: totalEth.toFixed(8),
    })
    
    return totalEth
    
  } catch (error) {
    console.error('Gas estimation failed:', error)
    // Much more realistic fallback (was 0.0001)
    return 0.00005
  }
}

export async function getCurrentGasPriceGwei(): Promise<number> {
  try {
    const publicClient = getPublicClientForReads()
    const gasPrice = await publicClient.getGasPrice()
    return Number(formatEther(gasPrice * 1000000000n))
  } catch (error) {
    console.error('Failed to get gas price:', error)
    return 0.5 // 0.5 gwei fallback
  }
}

export async function getGasPriceRecommendation(): Promise<{
  currentGwei: number
  status: 'low' | 'normal' | 'high' | 'very-high'
  recommendation: string
}> {
  const currentGwei = await getCurrentGasPriceGwei()
  
  if (currentGwei < 0.5) {
    return {
      currentGwei,
      status: 'low',
      recommendation: 'Great time to place pixels! Gas fees are very low.'
    }
  } else if (currentGwei < 2.0) {
    return {
      currentGwei,
      status: 'normal', 
      recommendation: 'Normal gas fees. Good time for pixel placement.'
    }
  } else if (currentGwei < 5.0) {
    return {
      currentGwei,
      status: 'high',
      recommendation: 'Gas fees are higher than usual. Consider waiting if not urgent.'
    }
  } else {
    return {
      currentGwei,
      status: 'very-high',
      recommendation: 'Gas fees are very high. Recommend waiting for lower fees.'
    }
  }
}

export async function getDetailedGasEstimate(
  x: number,
  y: number,
  hexColor: string,
  irysTxId: string,
  valueWei: bigint
): Promise<{
  gasLimit: bigint
  gasPrice: bigint
  totalFeeWei: bigint
  totalFeeEth: number
  breakdown: {
    gasLimitDisplay: string
    gasPriceGwei: string
    totalFeeDisplay: string
  }
}> {
  const publicClient = getPublicClientForReads()
  const colorBytes = hexToBytes3(hexColor) as `0x${string}`
  
  try {
    const gasPrice = await publicClient.getGasPrice()
    
    let gasLimit: bigint
    try {
      const dummyAccount = '0x1000000000000000000000000000000000000001' as `0x${string}`
      
      gasLimit = await publicClient.estimateGas({
        account: dummyAccount,
        to: CONTRACT_ADDRESS,
        data: publicClient.encodeFunctionData({
          abi: ABI,
          functionName: 'placePixel',
          args: [BigInt(x), BigInt(y), colorBytes, irysTxId],
        }),
        value: valueWei,
      })
      
      gasLimit = (gasLimit * 12n) / 10n
      
    } catch {
      gasLimit = 100000n
    }
    
    const totalFeeWei = gasLimit * gasPrice
    const totalFeeEth = Number(formatEther(totalFeeWei.toString()))
    
    return {
      gasLimit,
      gasPrice,
      totalFeeWei,
      totalFeeEth,
      breakdown: {
        gasLimitDisplay: gasLimit.toLocaleString(),
        gasPriceGwei: (Number(formatEther(gasPrice * 1000000000n))).toFixed(2),
        totalFeeDisplay: totalFeeEth.toFixed(8)
      }
    }
    
  } catch (error) {
    console.error('Detailed gas estimation failed:', error)
    
    const gasLimit = 100000n
    const gasPrice = 500000000n
    const totalFeeWei = gasLimit * gasPrice
    const totalFeeEth = Number(formatEther(totalFeeWei.toString()))
    
    return {
      gasLimit,
      gasPrice,
      totalFeeWei,
      totalFeeEth,
      breakdown: {
        gasLimitDisplay: gasLimit.toLocaleString(),
        gasPriceGwei: '0.50',
        totalFeeDisplay: totalFeeEth.toFixed(8)
      }
    }
  }
}
