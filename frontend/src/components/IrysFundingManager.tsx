import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useIrys } from '@/hooks/useIrys';
import { toast } from 'sonner';
import { Wallet, Upload, Download, DollarSign, Info, AlertTriangle } from 'lucide-react';

export const IrysFundingManager: React.FC = () => {
  const { 
    isConnected, 
    balance, 
    fundAccount, 
    withdrawBalance, 
    getLoadedBalance,
    getFundingPrice 
  } = useIrys();

  const [fundAmount, setFundAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [dataSize, setDataSize] = useState('1024');
  const [isLoading, setIsLoading] = useState(false);
  const [balanceFormatted, setBalanceFormatted] = useState('0');

  // Format balance for display
  useEffect(() => {
    if (balance && balance !== '0') {
    // Simple Wei->IRYS display (use utils.fromAtomic in production)
    const irysBalance = (parseInt(balance) / 1e18).toFixed(6);
    setBalanceFormatted(irysBalance);
    } else {
      setBalanceFormatted('0');
    }
  }, [balance]);

  // Calculate estimated cost
  const calculateCost = async () => {
    if (!dataSize || !isConnected) return;

    try {
      const cost = await getFundingPrice(dataSize.toString());
      const irysCost = (parseFloat(cost.toString()) / 1e18).toFixed(8);
    setEstimatedCost(irysCost);
    } catch (error) {
      console.error('Failed to calculate cost:', error);
      toast.error('Failed to calculate cost');
    }
  };

  // Fund account
  const handleFund = async () => {
    if (!fundAmount || parseFloat(fundAmount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const result = await fundAccount(fundAmount);
      toast.success(`Funded ${fundAmount} IRYS`);
      setFundAmount('');
      
      // 잔액 새로고침
      await getLoadedBalance();
    } catch (error) {
      console.error('Funding failed:', error);
      toast.error('펀딩에 실패했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  // Withdraw balance
  const handleWithdraw = async (withdrawAll: boolean = false) => {
    if (!withdrawAll && (!withdrawAmount || parseFloat(withdrawAmount) <= 0)) {
      toast.error('Please enter a valid amount');
      return;
    }

    setIsLoading(true);
    try {
      const result = await withdrawBalance(withdrawAll ? undefined : withdrawAmount);
      const amount = withdrawAll ? 'All balance' : `${withdrawAmount} IRYS`;
      toast.success(`Withdrew ${amount}`);
      setWithdrawAmount('');
      
      // 잔액 새로고침
      await getLoadedBalance();
    } catch (error) {
      console.error('Withdrawal failed:', error);
      toast.error('Failed to withdraw');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh balance
  const refreshBalance = async () => {
    setIsLoading(true);
    try {
      await getLoadedBalance();
      toast.success('Balance updated');
    } catch (error) {
      console.error('Balance refresh failed:', error);
      toast.error('Failed to update balance');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
             Irys Funding Manager
          </CardTitle>
          <CardDescription>
             Connect to the Irys network to manage funding.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
               Please connect to the Irys network first.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-6">
      {/* Balance section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
               Irys Account Balance
            </span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshBalance}
              disabled={isLoading}
            >
               Refresh
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              {balanceFormatted} IRYS
            </div>
             <Badge variant={parseFloat(balanceFormatted) > 0 ? "default" : "secondary"}>
               {parseFloat(balanceFormatted) > 0 ? "Available" : "Funding required"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
             Sufficient balance is required to upload.
          </p>
        </CardContent>
      </Card>

      {/* Cost calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
             Upload Cost Estimation
          </CardTitle>
          <CardDescription>
             Check estimated upload cost per data size.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Data size (bytes)"
              value={dataSize}
              onChange={(e) => setDataSize(e.target.value)}
              className="flex-1"
            />
            <Button onClick={calculateCost} disabled={isLoading}>
              Calculate
            </Button>
          </div>
          
          {estimatedCost && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                 Estimated cost for <strong>{dataSize} bytes</strong>: <strong>{estimatedCost} IRYS</strong>
              </AlertDescription>
            </Alert>
          )}

          <div className="text-sm text-muted-foreground">
            <p>• Uploads under 100 KiB are free.</p>
            <p>• Actual cost may vary with network conditions.</p>
          </div>
        </CardContent>
      </Card>

      {/* Funding section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
             Fund Account
          </CardTitle>
          <CardDescription>
                             Deposit IRYS to your account for uploads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.001"
              placeholder="IRYS amount to fund (e.g., 0.01)"
              value={fundAmount}
              onChange={(e) => setFundAmount(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleFund} 
              disabled={isLoading || !fundAmount}
            >
              Fund
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFundAmount('0.01')}
            >
                              0.01 IRYS
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFundAmount('0.05')}
            >
                              0.05 IRYS
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setFundAmount('0.1')}
            >
                              0.1 IRYS
            </Button>
          </div>

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
             Funding is immediate and will be deducted on upload.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Withdraw section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
             Withdraw Balance
          </CardTitle>
          <CardDescription>
             Withdraw unused balance to your wallet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.001"
                              placeholder="IRYS amount to withdraw"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={() => handleWithdraw(false)} 
              disabled={isLoading || !withdrawAmount}
              variant="outline"
            >
              Withdraw
            </Button>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <div>
               <p className="font-medium">Withdraw Full Balance</p>
              <p className="text-sm text-muted-foreground">
                 Withdraw your entire current balance
              </p>
            </div>
            <Button 
              onClick={() => handleWithdraw(true)} 
              disabled={isLoading || parseFloat(balanceFormatted) === 0}
              variant="destructive"
            >
              Withdraw All
            </Button>
          </div>

          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
               Network fees apply to withdrawals.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
