import { useState, useEffect } from "react";
import { CompactWalletConnect } from "@/components/CompactWalletConnect";
import { EnhancedPixelCanvas } from "@/components/EnhancedPixelCanvas";
import { CanvasBottomBar } from "@/components/CanvasBottomBar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useOptimisticCanvas } from "@/hooks/useOptimisticCanvas";
import { useCanvasSync } from "@/hooks/useCanvasSync";
import { usePixelPlacement } from "@/hooks/usePixelPlacement";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ColorSidebar } from "@/components/ColorSidebar";
import { MobileColorPicker } from "@/components/MobileColorPicker";
import { Grid3X3, Users } from "lucide-react";
import { fetchCanvasInfo } from "@/lib/contract";

interface Pixel { 
  x: number; 
  y: number; 
  color: string; 
  owner?: string; 
  timestamp?: number; 
  irysId?: string; 
  irysPayloadLength?: number;
}

const Index = () => {
  const isMobile = useIsMobile();
  const optimisticCanvas = useOptimisticCanvas();
  const { 
    confirmedPixels
  } = useCanvasSync();
  
  const [selectedColor, setSelectedColor] = useState("#a855f7");
  const [canvasSize, setCanvasSize] = useState({ width: 1024, height: 1024 }); // Fixed 1024x1024
  const [pixelPrice, setPixelPrice] = useState(0.0);
  const [pixelPriceWei, setPixelPriceWei] = useState<bigint | null>(null);
  const [activeUsers] = useState(0);
  const [userPixels] = useState(0);

  // 낙관적 픽셀과 확정 픽셀을 합친 최종 픽셀 배열
  const pixels = optimisticCanvas.mergePixelsWithOptimistic(
    confirmedPixels.map(p => ({
      ...p,
      timestamp: p.timestamp || Date.now()
    }))
  );

  const { 
    transactions, 
    handlePixelPlace, 
    handleContribute, 
    handleViewTransaction 
  } = usePixelPlacement(pixelPriceWei, () => {
    // Data refresh callback
    loadPixelsAndTransactionsIfNeeded(true);
  });

  // Load canvas info and set fixed size to 1024x1024
  useEffect(() => {
    let mounted = true;
    let retryTimer: any;
    const load = async (attempt = 0) => {
      try {
        const info = await fetchCanvasInfo();
        if (!mounted) return;
        setPixelPrice(info.pixelPrice);
        setPixelPriceWei(info.pixelPriceWei as bigint);
      } catch (e) {
        if (!mounted) return;
        // 지수 백오프 재시도: 최대 5회
        const delay = Math.min(15000, 1000 * Math.pow(2, attempt));
        if (attempt < 5) {
          retryTimer = setTimeout(() => load(attempt + 1), delay);
        }
      }
    };
    load();
    return () => { mounted = false; if (retryTimer) clearTimeout(retryTimer); };
  }, []);

  // Data refresh helper
  const loadPixelsAndTransactionsIfNeeded = async (force = false) => {
    // This function is kept for compatibility with existing code
    // The actual sync is now handled by useCanvasSync hook
  };

  // Pixel place handler with funding success callback
  const handlePixelPlaceWrapper = async (pixel: Pixel) => {
    await handlePixelPlace(pixel);
  };

  const handleContributeWrapper = async (amount: number) => {
    await handleContribute(amount);
  };

  // All sync logic is now handled by useCanvasSync hook

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background w-full flex pb-16">{/* Added bottom padding for fixed bottom bar */}
        {/* Color Sidebar - 데스크탑에서만 표시 */}
        {!isMobile && <ColorSidebar selectedColor={selectedColor} onColorSelect={setSelectedColor} />}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="w-full px-4 py-3">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="p-2 rounded-lg gradient-primary">
                    <img src="/IPRAYS.png" alt="IPRAYS Logo" className="h-5 w-5 md:h-6 md:w-6" />
                  </div>
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-foreground">IPRAYS</h1>
                    <div className="space-y-1">
                      <p className="text-xs md:text-sm text-muted-foreground">Decentralized pixel art • 1024×1024</p>
                      <p className="text-xs text-muted-foreground/80">
                        {pixelPrice < 0.001 ? 
                          `${(pixelPrice * 1000).toFixed(1)} mIRYS per pixel • Get 0.5 IRYS daily from faucet` : 
                          `${pixelPrice.toFixed(4)} IRYS per pixel`
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Right - 지갑 / UI선택 */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* 모바일에서만 색상 선택기 표시 */}
                  {isMobile && <MobileColorPicker selectedColor={selectedColor} onColorSelect={setSelectedColor} />}
                  <CompactWalletConnect />
                  <ThemeToggle />
                </div>
              </div>
            </div>
          </header>

          {/* Main Canvas Area */}
          <main className="flex-1 p-4 overflow-hidden">
            <div className="w-full h-full mx-auto px-2">
              <EnhancedPixelCanvas 
                selectedColor={selectedColor} 
                onPixelPlace={handlePixelPlaceWrapper} 
                pixels={pixels} 
                canvasSize={canvasSize} 
                pixelPrice={pixelPrice} 
              />
            </div>
          </main>

        </div>
        
        {/* Fixed Bottom Bar */}
        <CanvasBottomBar pixels={pixels} />
      </div>
    </SidebarProvider>
  );
};

export default Index;
