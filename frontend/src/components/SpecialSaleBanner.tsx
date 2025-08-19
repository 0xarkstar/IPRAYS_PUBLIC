import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Timer, Zap, Percent } from 'lucide-react';
import { useRateLimitInfo } from '@/hooks/useRateLimitInfo';

interface SpecialSaleInfo {
  active: boolean;
  priceDiscount: string;
  cooldownReduction: string;
  pixelsPerMinute: number;
  dailyPixelLimit: number;
  currentPrice: string;
}

export const SpecialSaleBanner: React.FC = () => {
  const { rateLimitInfo, isLoading } = useRateLimitInfo();
  
  // Calculate dynamic sale info based on actual contract values
  const cooldownSeconds = isLoading ? 3 : (rateLimitInfo.minPlacementInterval || 3);
  const pixelsPerMinute = Math.floor(60 / cooldownSeconds);
  const dailyPixelLimit = Math.floor(0.5 / 0.00001); // 0.5 IRYS faucet / 0.00001 IRYS per pixel
  
  const [saleInfo, setSaleInfo] = useState<SpecialSaleInfo>({
    active: true,
    priceDiscount: "90%",
    cooldownReduction: "95%",
    pixelsPerMinute,
    dailyPixelLimit,
    currentPrice: "0.00001"
  });

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Update sale info when rate limit info changes
  useEffect(() => {
    setSaleInfo(prev => ({
      ...prev,
      pixelsPerMinute,
      dailyPixelLimit
    }));
  }, [pixelsPerMinute, dailyPixelLimit]);

  useEffect(() => {
    // 특가 세일 종료 시간 설정 (UTC 8월 25일 00:00:00)
    const saleEndTime = new Date('2025-08-25T00:00:00Z');

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = saleEndTime.getTime() - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
      } else {
        setSaleInfo(prev => ({ ...prev, active: false }));
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!saleInfo.active) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 text-white shadow-lg border-0 mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* 메인 메시지 */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-white text-purple-600 font-bold">
                🔥 SPECIAL SALE
              </Badge>
              <Badge variant="outline" className="border-white text-white">
                LIMITED TIME
              </Badge>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold mb-1">
              Pixel Placement Super Sale! 
            </h2>
            <p className="text-sm lg:text-base opacity-90">
              90% OFF pricing + 95% faster cooldowns - Perfect for artists!
            </p>
          </div>

          {/* 할인 정보 */}
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex gap-3">
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm">
                  <Percent className="w-4 h-4" />
                  <span className="font-semibold">{saleInfo.priceDiscount} OFF</span>
                </div>
                <div className="text-xs opacity-75">Only {saleInfo.currentPrice} IRYS</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm">
                  <Zap className="w-4 h-4" />
                  <span className="font-semibold">{cooldownSeconds}s cooldown</span>
                </div>
                <div className="text-xs opacity-75">{saleInfo.pixelsPerMinute}/min</div>
              </div>
            </div>

            {/* 카운트다운 타이머 */}
            <div className="flex items-center gap-2 bg-black/20 rounded-lg px-3 py-2">
              <Timer className="w-4 h-4" />
              <div className="flex gap-1 text-sm font-mono">
                <span>{timeLeft.days}d</span>
                <span>{timeLeft.hours.toString().padStart(2, '0')}h</span>
                <span>{timeLeft.minutes.toString().padStart(2, '0')}m</span>
                <span>{timeLeft.seconds.toString().padStart(2, '0')}s</span>
              </div>
            </div>
          </div>
        </div>

        {/* 추가 혜택 정보 */}
        <div className="mt-3 pt-3 border-t border-white/20">
          <div className="flex flex-wrap gap-4 text-xs">
            <span>✨ Daily Faucet = {saleInfo.dailyPixelLimit.toLocaleString()} pixels</span>
            <span>⚡ Up to {saleInfo.pixelsPerMinute * 60} pixels/hour</span>
            <span>🎨 Perfect for large artwork</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpecialSaleBanner;