import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Database, 
  Upload, 
  Wallet, 
  Activity, 
  CheckCircle, 
  Clock,
  Zap,
  Network,
  Settings
} from "lucide-react";
import { useIrys, IrysPixelData } from "@/hooks/useIrys";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { IRYS_CONFIG, getNetworkConfig } from "@/config/irys";

interface IrysIntegrationProps {
  pixels: any[];
  onIrysUpload?: (uploadId: string) => void;
}

export const IrysIntegration = ({ pixels, onIrysUpload }: IrysIntegrationProps) => {
  const { address, isConnected: walletConnected } = useAccount();
  const { 
    isConnected, 
    isLoading,
    isUploading, 
    balance, 
    connect, 
    disconnect,
    uploadCanvasState,
    getFundingPrice,
    fundAccount,
    getLoadedBalance
  } = useIrys();
  
  const [estimatedCost, setEstimatedCost] = useState<string>('0');
  const [fundAmount, setFundAmount] = useState<string>('0.1');
  const [uploadHistory, setUploadHistory] = useState<Array<{
    id: string;
    timestamp: number;
    type: 'pixel' | 'canvas';
    status: 'completed' | 'pending' | 'failed';
    transactionId?: string;
  }>>([]);

  const networkConfig = getNetworkConfig(IRYS_CONFIG.network);

  // Calculate estimated upload cost
  useEffect(() => {
    const calculateCost = async () => {
      if (pixels.length > 0) {
        const dataSize = JSON.stringify(pixels).length;
        const cost = await getFundingPrice(dataSize.toString());
        setEstimatedCost(cost.toString());
      }
    };
    calculateCost();
  }, [pixels, getFundingPrice]);

  // Auto-refresh balance
  useEffect(() => {
    if (isConnected) {
      const interval = setInterval(() => {
        getLoadedBalance();
      }, 30000); // 30초마다 새로고침
      
      return () => clearInterval(interval);
    }
  }, [isConnected, getLoadedBalance]);

  const handleConnectIrys = async () => {
    if (!walletConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    const success = await connect();
    
    if (success) {
      setUploadHistory(prev => [{
        id: 'init_connection',
        timestamp: Date.now(),
        type: 'canvas',
        status: 'completed',
        transactionId: 'connection_success'
      }, ...prev]);
      
      toast.success('Successfully connected to Irys network');
    }
  };

  const handleDisconnectIrys = () => {
    disconnect();
    setUploadHistory(prev => [{
      id: 'disconnect',
      timestamp: Date.now(),
      type: 'canvas',
      status: 'completed',
      transactionId: 'disconnected'
    }, ...prev]);
    
    toast.info('Disconnected from Irys network');
  };

  const handleUploadCanvas = async () => {
    if (!isConnected || pixels.length === 0) {
      toast.error('Connect to Irys and ensure canvas has pixels');
      return;
    }

    const irysPixels: IrysPixelData[] = pixels.map(pixel => ({
      x: pixel.x,
      y: pixel.y,
      color: pixel.color,
      owner: pixel.owner || 'anonymous',
      timestamp: pixel.timestamp || Date.now()
    }));

    const canvasData = {
      pixels: irysPixels,
      metadata: {
        canvasId: 'pixel-canvas-v1',
        size: { width: 100, height: 100 },
        created: Date.now(),
        lastModified: Date.now(),
        totalPixels: pixels.length
      }
    };

    // Start upload
    const uploadId = `upload_${Date.now()}`;
    setUploadHistory(prev => [{
      id: uploadId,
      timestamp: Date.now(),
      type: 'canvas',
      status: 'pending'
    }, ...prev]);

    try {
      const response = await uploadCanvasState(canvasData);
      
      if (response) {
        setUploadHistory(prev => 
          prev.map(item => 
            item.id === uploadId 
              ? { ...item, status: 'completed', transactionId: response.id }
              : item
          )
        );
        
        onIrysUpload?.(response.id);
        toast.success('Canvas state successfully uploaded to Irys');
      }
    } catch (error) {
      setUploadHistory(prev => 
        prev.map(item => 
          item.id === uploadId 
            ? { ...item, status: 'failed' }
            : item
        )
      );
      
      toast.error('Failed to upload canvas');
    }
  };

  const handleFundAccount = async () => {
    if (!isConnected) {
      toast.error('Please connect to Irys first');
      return;
    }

    try {
      await fundAccount(fundAmount);
      toast.success(`Funded account with ${fundAmount} ${networkConfig.nativeCurrency.symbol}`);
    } catch (error) {
      toast.error('Failed to fund account');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'failed': return <Activity className="w-4 h-4 text-red-600" />;
      default: return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Irys Network Integration</h3>
        </div>
        <Badge variant={isConnected ? "default" : "secondary"}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Network className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Network</span>
          </div>
          <Badge variant="outline">{networkConfig.name}</Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Wallet className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">Balance</span>
          </div>
          <div className="text-lg font-mono">
            {parseFloat(balance).toFixed(4)} {networkConfig.nativeCurrency.symbol}
          </div>
        </div>
      </div>

      <Separator />

      {!isConnected ? (
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">
              Connect to Irys to use Programmable Data features
            </p>
            <Button 
              onClick={handleConnectIrys} 
              disabled={!walletConnected || isLoading}
              className="w-full"
            >
              {isLoading ? 'Connecting...' : 'Connect to Irys'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <Button 
              onClick={handleUploadCanvas} 
              disabled={isUploading || pixels.length === 0}
              className="flex-1"
            >
              {isUploading ? 'Uploading...' : 'Upload Canvas State'}
            </Button>
            <Button 
              onClick={handleDisconnectIrys} 
              variant="outline"
            >
              Disconnect
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Estimated Upload Cost:</span>
              <span className="font-mono">{estimatedCost} {networkConfig.nativeCurrency.symbol}</span>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={fundAmount}
                onChange={(e) => setFundAmount(e.target.value)}
                placeholder="0.1"
                step="0.1"
                min="0"
                className="flex-1 px-3 py-2 border rounded-md text-sm"
              />
              <Button 
                onClick={handleFundAccount}
                size="sm"
                variant="outline"
              >
                 Fund
              </Button>
            </div>
          </div>
        </div>
      )}

      {uploadHistory.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2">
              <Activity className="w-4 h-4" />
               <span>Upload History</span>
            </h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {uploadHistory.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(item.status)}
                    <span className="text-sm">
                      {item.type === 'canvas' ? 'Canvas' : 'Pixel'} upload
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  );
};