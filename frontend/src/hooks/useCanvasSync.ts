import { useState, useEffect, useRef, useCallback } from 'react';
import { createPublicClient, webSocket } from 'viem';
import { loadSnapshot, saveSnapshot } from '@/lib/snapshot';
import { 
  queryPixelPlacedEvents, 
  // queryFundingEvents, 
  getCurrentBlockNumber,
  ABI,
  CONTRACT_ADDRESS,
  getWsUrlFromEnv,
  getConfirmationsFromEnv
} from '@/lib/contract';

interface Pixel {
  x: number;
  y: number;
  color: string;
  owner?: string;
  timestamp?: number;
  irysId?: string;
  irysPayloadLength?: number;
}

export const useCanvasSync = () => {
  const wsClientRef = useRef<any>(null);
  const unwatchPixelRef = useRef<null | (() => void)>(null);
  // const unwatchFundingRef = useRef<null | (() => void)>(null);
  const reconnectTimerRef = useRef<any>(null);
  const pollingTimerRef = useRef<any>(null);
  
  const [confirmedPixels, setConfirmedPixels] = useState<Pixel[]>([]);
  // Funding removed
  const [syncedBlock, setSyncedBlock] = useState<number | null>(null);
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [confirmedBlock, setConfirmedBlock] = useState<number>(0);

  const requiredConfs = getConfirmationsFromEnv();
  // Allow configuring the initial from-block to replay all events after reloads
  const initialFromBlockEnv = Number((import.meta as any).env?.VITE_INITIAL_EVENT_FROM_BLOCK ?? '0');

  // chunked events fetcher to avoid provider/log limits
  const fetchPixelEventsChunked = useCallback(async (fromBlock: number, toBlock: number, chunkSize = 2000) => {
    const all: Awaited<ReturnType<typeof queryPixelPlacedEvents>> = []
    if (fromBlock > toBlock) return all
    let start = fromBlock
    while (start <= toBlock) {
      const end = Math.min(start + chunkSize - 1, toBlock)
      const chunk = await queryPixelPlacedEvents(start, end)
      if (chunk.length) all.push(...chunk)
      start = end + 1
    }
    return all
  }, [])

  // Initial sync
  const performInitialSync = useCallback(async () => {
    try {
      const snap = loadSnapshot();
      if (snap) {
        setConfirmedPixels(snap.pixels);
        setSyncedBlock(snap.blockNumber);
      }

      const current = await getCurrentBlockNumber();
      // If we have a snapshot, continue from next block; otherwise, start from configured block (default 0)
      const from = snap?.blockNumber != null ? snap.blockNumber + 1 : Math.max(0, initialFromBlockEnv);
      
      // Only sync if there are new blocks to process
      if (from > current) {
        setSyncedBlock(current);
        return;
      }
      
      const pixelEvents = await fetchPixelEventsChunked(from, current, 2000);

      // Process pixel events
      const key = (x: bigint, y: bigint) => `${x.toString()}_${y.toString()}`;
      const latestByCoord = new Map<string, typeof pixelEvents[number]>();
      
      for (const ev of pixelEvents) {
        const k = key(ev.x, ev.y);
        const prev = latestByCoord.get(k);
        if (!prev || ev.blockNumber >= prev.blockNumber) {
          latestByCoord.set(k, ev);
        }
      }

      const toHex = (color: string) => {
        const raw = (color || '').toString().replace('0x', '');
        return `#${raw.padStart(6, '0').slice(0, 6)}`;
      };
      const syncedPixels: Pixel[] = Array.from(latestByCoord.values()).map(ev => ({
        x: Number(ev.x),
        y: Number(ev.y),
        color: toHex(ev.color),
        owner: ev.user,
        timestamp: Number(ev.timestamp) * 1000,
      }));

      setConfirmedPixels(prev => {
        const map = new Map(prev.map(p => [`${p.x}_${p.y}`, p]));
        for (const p of syncedPixels) {
          map.set(`${p.x}_${p.y}`, p);
        }
        return Array.from(map.values());
      });

      setSyncedBlock(current);

      // Save snapshot
      setTimeout(() => {
        saveSnapshot({
          blockNumber: current,
          pixels: Array.from(new Map(confirmedPixels.concat(syncedPixels).map(p => [`${p.x}_${p.y}`, p])).values()),
          fundingIrys: 0,
        });
      }, 0);

    } catch (e) {
      
    }
  }, [confirmedPixels]);

  // Setup watchers with polling only (Irys testnet has no WS)
  const setupWatchers = useCallback(() => {
    // Cleanup existing connections
    try { 
      unwatchPixelRef.current?.(); 
      // unwatchFundingRef.current?.();
      (wsClientRef.current as any)?.transport?.value?.close?.();
    } catch (e) {
      
    }

    // Skip WebSocket entirely; always poll

    // 폴링 방식으로 폴백
    const setupPolling = () => {
      
      
      // 기존 폴링 타이머 정리
      if (pollingTimerRef.current) {
        clearInterval(pollingTimerRef.current);
      }

      // 폴링 간격 (5초)
      const POLLING_INTERVAL = 5000;
      
      pollingTimerRef.current = setInterval(async () => {
        try {
          const from = (syncedBlock ?? 0) + 1;
          const current = await getCurrentBlockNumber();
          
          if (from <= current) {
            const pixelEvents = await queryPixelPlacedEvents(from, current);

            if (pixelEvents.length) {
              setConfirmedPixels(prev => {
                const map = new Map(prev.map(p => [`${p.x}_${p.y}`, p]));
                for (const ev of pixelEvents) {
                  map.set(`${Number(ev.x)}_${Number(ev.y)}`, {
                    x: Number(ev.x),
                    y: Number(ev.y),
                    color: `#${(ev.color as string).slice(2)}`,
                    owner: ev.user as string,
                    timestamp: Number(ev.timestamp) * 1000,
                  });
                }
                return Array.from(map.values());
              });
            }

            // funding removed
            setSyncedBlock(current);
          }
        } catch (error) {
          
        }
      }, POLLING_INTERVAL);
    };

    // Always use polling on Irys testnet
    setupPolling();
  }, [confirmedPixels, syncedBlock]);

  // Block tracking
  useEffect(() => {
    let timer: any;
    const tick = async () => {
      try {
        const current = await getCurrentBlockNumber();
        setCurrentBlock(current);
        setConfirmedBlock(Math.max(0, current - requiredConfs));
      } catch (e) {
        
      }
      timer = setTimeout(tick, 5000);
    };
    tick();
    return () => timer && clearTimeout(timer);
  }, [requiredConfs]);

  // Save snapshot when state changes
  useEffect(() => {
    if (syncedBlock != null && confirmedBlock >= syncedBlock - requiredConfs) {
      saveSnapshot({
        blockNumber: syncedBlock,
        pixels: confirmedPixels,
        fundingIrys: 0
      });
    }
  }, [confirmedPixels, syncedBlock, confirmedBlock, requiredConfs]);

  // Setup initial sync and watchers
  useEffect(() => {
    performInitialSync();
  }, []);

  useEffect(() => {
    setupWatchers();
    return () => {
      try {
        unwatchPixelRef.current?.();
        (wsClientRef.current as any)?.transport?.value?.close?.();
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      } catch (e) {
        
      }
    };
  }, [setupWatchers]);

  return {
    confirmedPixels,
    syncedBlock,
    currentBlock,
    confirmedBlock,
    setConfirmedPixels
  };
};