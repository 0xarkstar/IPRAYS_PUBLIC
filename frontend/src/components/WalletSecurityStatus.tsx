import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  Activity, 
  Settings,
  AlertTriangle,
  CheckCircle,
  Key,
  Network
} from 'lucide-react';

import { useWalletIntegration } from '@/hooks/useWalletIntegration';
import { 
  walletSecurity, 
  PermissionLevel,
  initializeWalletSecurity,
  checkWalletPermission,
  performWalletSecurityCheck
} from '@/lib/walletSecurity';

export const WalletSecurityStatus: React.FC = () => {
  const { walletState, provider, isFullyConnected } = useWalletIntegration();
  
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [securityCheck, setSecurityCheck] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 보안 상태 업데이트
  const updateSecurityStatus = () => {
    if (walletState.address && provider) {
      // 지갑 보안 초기화 (필요시)
      if (!walletSecurity.getSecurityStatus().hasActiveSession) {
        initializeWalletSecurity(
          walletState.address, 
          provider,
          [PermissionLevel.READ_ONLY, PermissionLevel.PIXEL_PLACE]
        );
      }
      
      const status = walletSecurity.getSecurityStatus();
      setSecurityStatus(status);
    }
  };

  // 보안 검사 실행
  const runSecurityCheck = async () => {
    if (!walletState.address) return;

    setIsLoading(true);
    try {
      const checkResult = await performWalletSecurityCheck(walletState.address);
      setSecurityCheck(checkResult);
    } catch (error) {
      console.error('Security check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 권한 업그레이드 요청
  const requestPermissionUpgrade = async (permission: typeof PermissionLevel[keyof typeof PermissionLevel]) => {
    try {
      const success = await walletSecurity.requestPermissionUpgrade([permission]);
      if (success) {
        updateSecurityStatus();
      }
    } catch (error) {
      console.error('Permission upgrade failed:', error);
    }
  };

  // 컴포넌트 마운트 시 보안 상태 초기화
  useEffect(() => {
    if (isFullyConnected && walletState.address) {
      updateSecurityStatus();
      runSecurityCheck();
    }
  }, [isFullyConnected, walletState.address]);

  // 정기적으로 보안 상태 업데이트
  useEffect(() => {
    if (securityStatus?.hasActiveSession) {
      const interval = setInterval(updateSecurityStatus, 30000); // 30초마다
      return () => clearInterval(interval);
    }
  }, [securityStatus?.hasActiveSession]);

  if (!isFullyConnected || !walletState.address) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            지갑 보안 상태
          </CardTitle>
          <CardDescription>지갑 연결 후 보안 상태를 확인할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              지갑을 연결하고 Irys 네트워크에 연결한 후 보안 상태를 확인하세요.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const getSecurityScore = () => {
    if (!securityCheck) return 0;
    
    let score = 70; // 기본 점수
    
    if (securityCheck.safe) score += 20;
    if (securityCheck.warnings.length === 0) score += 10;
    if (walletState.isCorrectNetwork) score += 10;
    if (parseFloat(walletState.balance) > 0.0001) score -= 5; // 잔액이 너무 낮으면 감점 (0.1 mIRYS 기준)
    
    return Math.min(100, Math.max(0, score));
  };

  const getSecurityLevel = (score: number) => {
    if (score >= 90) return { level: 'Excellent', color: 'green', icon: ShieldCheck };
    if (score >= 70) return { level: 'Good', color: 'blue', icon: Shield };
    if (score >= 50) return { level: 'Fair', color: 'yellow', icon: ShieldAlert };
    return { level: 'Poor', color: 'red', icon: ShieldAlert };
  };

  const securityScore = getSecurityScore();
  const securityLevel = getSecurityLevel(securityScore);
  const SecurityIcon = securityLevel.icon;

  return (
    <div className="space-y-4">
      {/* 메인 보안 상태 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <SecurityIcon className="h-5 w-5" />
              지갑 보안 상태
            </span>
            <Badge 
              variant={securityLevel.color === 'green' ? 'default' : 'secondary'}
              className={`
                ${securityLevel.color === 'green' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}
                ${securityLevel.color === 'blue' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                ${securityLevel.color === 'yellow' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : ''}
                ${securityLevel.color === 'red' ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''}
              `}
            >
              {securityLevel.level}
            </Badge>
          </CardTitle>
          
          <div className="space-y-2">
            <Progress value={securityScore} className="h-3" />
            <CardDescription>
              보안 점수: {securityScore}/100 • 
              {securityScore >= 70 ? ' 안전한 연결입니다' : ' 보안 설정을 검토하세요'}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* 세션 정보 */}
          {securityStatus?.sessionInfo && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <div>
                    <div className="font-medium">활성 세션</div>
                    <div className="text-sm text-muted-foreground">
                      연결 시간: {new Date(securityStatus.sessionInfo.connectedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    권한: {securityStatus.sessionInfo.permissions.length}개
                  </div>
                  <div className="text-xs text-muted-foreground">
                    최근 활동: {new Date(securityStatus.sessionInfo.lastActivity).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 권한 상태 */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              <span className="font-medium">권한 수준</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {Object.values(PermissionLevel).map((permission) => {
                const hasPermission = checkWalletPermission(permission);
                return (
                  <div 
                    key={permission}
                    className={`flex items-center justify-between p-2 rounded border ${
                      hasPermission 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : 'bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800'
                    }`}
                  >
                    <span className="text-sm capitalize">
                      {permission.replace('_', ' ')}
                    </span>
                    {hasPermission ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => requestPermissionUpgrade(permission)}
                        className="h-6 px-2 text-xs"
                      >
                        요청
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 속도 제한 상태 */}
          {securityStatus?.rateLimitStatus && (
            <div className="p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="font-medium">활동 제한</span>
                </div>
                <div className="text-sm">
                  {securityStatus.rateLimitStatus.actionsUsed}/{securityStatus.rateLimitStatus.maxActions}
                </div>
              </div>
              <Progress 
                value={(securityStatus.rateLimitStatus.actionsUsed / securityStatus.rateLimitStatus.maxActions) * 100}
                className="h-2 mt-2"
              />
            </div>
          )}

          {/* 보안 경고 */}
          {securityCheck?.warnings && securityCheck.warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">보안 경고:</div>
                <ul className="text-sm space-y-1">
                  {securityCheck.warnings.map((warning: string, index: number) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* 보안 권장사항 */}
          {securityCheck?.recommendations && securityCheck.recommendations.length > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">권장사항:</div>
                <ul className="text-sm space-y-1">
                  {securityCheck.recommendations.map((rec: string, index: number) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* 액션 버튼들 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={runSecurityCheck}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? '검사 중...' : '보안 검사'}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowAdvanced(!showAdvanced)}
              size="sm"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 고급 보안 설정 */}
      {showAdvanced && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              고급 보안 설정
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {securityStatus?.config && (
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span>트랜잭션 서명 필수:</span>
                  <Badge variant={securityStatus.config.requireSignatureForTransactions ? 'default' : 'secondary'}>
                    {securityStatus.config.requireSignatureForTransactions ? '활성' : '비활성'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>최대 트랜잭션 값:</span>
                  <span>{securityStatus.config.maxTransactionValue} IRYS</span>
                </div>
                <div className="flex justify-between">
                  <span>세션 제한 시간:</span>
                  <span>{Math.floor(securityStatus.config.sessionTimeout / 1000 / 60)}분</span>
                </div>
                <div className="flex justify-between">
                  <span>속도 제한:</span>
                  <Badge variant={securityStatus.config.enableRateLimiting ? 'default' : 'secondary'}>
                    {securityStatus.config.enableRateLimiting ? '활성' : '비활성'}
                  </Badge>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={updateSecurityStatus}>
                상태 새로고침
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => walletSecurity.clearSession()}
              >
                세션 초기화
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
