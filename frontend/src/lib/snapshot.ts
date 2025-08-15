export type PixelSnapshot = {
  x: number
  y: number
  color: string
  owner?: string
  timestamp?: number
}

export type CanvasSnapshot = {
  blockNumber: number
  pixels: PixelSnapshot[]
  fundingIrys: number // in Irys units (parsed for display)
}

const SNAPSHOT_KEY = 'pixel-canvas-snapshot-v1'

export function loadSnapshot(): CanvasSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CanvasSnapshot
    if (
      typeof parsed.blockNumber === 'number' &&
      Array.isArray(parsed.pixels) &&
      typeof parsed.fundingIrys === 'number'
    ) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

export function saveSnapshot(snapshot: CanvasSnapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore
  }
}

export function clearSnapshot() {
  try {
    localStorage.removeItem(SNAPSHOT_KEY)
  } catch {
    // ignore
  }
}


