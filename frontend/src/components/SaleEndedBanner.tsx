import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Clock, DollarSign } from 'lucide-react';
import { useRateLimitInfo } from '@/hooks/useRateLimitInfo';

export const SaleEndedBanner: React.FC = () => {
  const { rateLimitInfo, isLoading } = useRateLimitInfo();
  
  // Get actual cooldown from contract or fallback to current contract value (should be 3s during sale, then restored to normal)
  const cooldownSeconds = isLoading ? 3 : (rateLimitInfo.minPlacementInterval || 3);
  const pixelsPerMinute = Math.floor(60 / cooldownSeconds);
  
  return (
    <Card className="bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-lg border-0 mb-4">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          {/* 메인 메시지 */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary" className="bg-white text-green-600 font-bold">
                <CheckCircle className="w-3 h-3 mr-1" />
                SALE ENDED
              </Badge>
            </div>
            <h2 className="text-xl lg:text-2xl font-bold mb-1">
              Special Sale Has Ended - Thank You!
            </h2>
            <p className="text-sm lg:text-base opacity-90">
              Normal pricing and cooldowns have been restored
            </p>
          </div>

          {/* 복원된 설정 정보 */}
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="flex gap-3">
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm">
                  <DollarSign className="w-4 h-4" />
                  <span className="font-semibold">0.0001 IRYS</span>
                </div>
                <div className="text-xs opacity-75">Normal Price</div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center gap-1 text-sm">
                  <Clock className="w-4 h-4" />
                  <span className="font-semibold">{cooldownSeconds}s cooldown</span>
                </div>
                <div className="text-xs opacity-75">{pixelsPerMinute} pixels/min</div>
              </div>
            </div>
          </div>
        </div>

        {/* 감사 메시지 */}
        <div className="mt-3 pt-3 border-t border-white/20">
          <div className="flex flex-wrap gap-4 text-xs">
            <span>🎨 Thank you for participating in our special sale!</span>
            <span>📈 Normal operations resumed</span>
            <span>💎 Keep creating amazing pixel art</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SaleEndedBanner;