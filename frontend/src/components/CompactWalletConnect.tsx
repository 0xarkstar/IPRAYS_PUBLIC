import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Wallet, 
  LogOut,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Smartphone,
  Globe,
  Shield
} from "lucide-react";
import { toast } from "sonner";
import { IRYS_CONFIG, switchToIrysNetwork, checkAndSwitchNetwork } from "@/config/irys";

export const CompactWalletConnect = () => {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isCorrectNetwork = chainId === IRYS_CONFIG.chainId;
  
  const getNetworkName = () => {
    if (chainId === IRYS_CONFIG.chainId) return 'Irys Testnet';
    return `Chain ${chainId}`;
  };

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector });
      setIsDialogOpen(false);
      toast.success('Wallet connected');
      
      // 연결 후 네트워크 자동 전환 확인
      setTimeout(async () => {
        try {
          const switched = await checkAndSwitchNetwork();
          if (switched) {
            toast.success('Switched to Irys Testnet');
          }
        } catch (error) {
          console.error('Auto network switch failed:', error);
        }
      }, 1000);
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.info('Wallet disconnected');
  };

  const switchNetwork = async () => {
    try {
      // 먼저 Wagmi의 switchChain 시도
      await switchChain({ chainId: IRYS_CONFIG.chainId });
      toast.success('Switched to Irys Testnet');
    } catch (wagmiError: any) {
      console.warn('Wagmi switchChain failed, trying direct switch:', wagmiError);
      
      try {
        // Fallback direct switch
        await switchToIrysNetwork();
        toast.success('Switched to Irys Testnet');
      } catch (directError: any) {
        console.error('Direct network switch failed:', directError);
        toast.error('Failed to switch network. Please switch in your wallet.');
      }
    }
  };

  const getConnectorIcon = (connectorName: string) => {
    switch (connectorName.toLowerCase()) {
      case 'metamask':
        return <Wallet className="h-4 w-4" />;
      case 'walletconnect':
        return <Smartphone className="h-4 w-4" />;
      case 'injected':
        return <Globe className="h-4 w-4" />;
      case 'safe':
        return <Shield className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getConnectorDescription = (connectorName: string) => {
    switch (connectorName.toLowerCase()) {
      case 'metamask':
        return 'Most popular Ethereum wallet';
      case 'walletconnect':
        return 'Connect with mobile wallets';
      case 'injected':
        return 'Browser extension wallets';
      case 'safe':
        return 'Multi-signature wallet';
      default:
        return 'Wallet connector';
    }
  };

  if (!isConnected) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Wallet className="h-4 w-4 mr-2" />
            Connect Wallet
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect Your Wallet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {connectors.map((connector) => (
              <Button
                key={connector.uid}
                variant="outline"
                className="w-full justify-start h-auto p-4"
                onClick={() => handleConnect(connector)}
                disabled={isPending}
              >
                <div className="flex items-center w-full">
                  <div className="flex items-center gap-3 flex-1">
                    {getConnectorIcon(connector.name)}
                    <div className="text-left">
                      <div className="font-medium">{connector.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {getConnectorDescription(connector.name)}
                      </div>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </div>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Network Status */}
      <Badge 
        variant={isCorrectNetwork ? "default" : "destructive"}
        className="text-xs"
      >
        {isCorrectNetwork ? (
          <CheckCircle className="h-3 w-3 mr-1" />
        ) : (
          <AlertTriangle className="h-3 w-3 mr-1" />
        )}
        {getNetworkName()}
      </Badge>

      {/* Wrong Network Switch Button */}
      {!isCorrectNetwork && (
        <Button size="sm" variant="outline" onClick={switchNetwork}>
          Switch
        </Button>
      )}

      {/* Address */}
      <Badge variant="outline" className="font-mono text-xs">
        {formatAddress(address!)}
      </Badge>

      {/* Disconnect */}
      <Button 
        variant="ghost" 
        size="sm"
        onClick={handleDisconnect}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  );
};