import React, { useState } from 'react';
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const WalletConnect = () => {
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const chainId = useChainId();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const isCorrectNetwork = chainId === 1270; // Irys Testnet
  
  const getConnectionStatus = () => {
    if (!isConnected) return { status: 'disconnected', color: 'secondary' };
    if (!isCorrectNetwork) return { status: 'wrong network', color: 'destructive' };
    return { status: 'connected', color: 'success' };
  };

  const handleConnect = async (connector: any) => {
    try {
      await connect({ connector });
      setIsDialogOpen(false);
      toast.success('Wallet connected successfully');
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
      await switchChain({ chainId: 1270 });
      toast.success('Network switched to Irys Testnet');
    } catch (error: any) {
      console.error('Network switch error:', error);
      toast.error('Failed to switch network. Please try manually in your wallet.');
    }
  };

  const getConnectorIcon = (connectorName: string) => {
    switch (connectorName.toLowerCase()) {
      case 'metamask':
        return <Wallet className="h-5 w-5" />;
      case 'walletconnect':
        return <Smartphone className="h-5 w-5" />;
      case 'injected':
        return <Globe className="h-5 w-5" />;
      case 'safe':
        return <Shield className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
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

  const connectionInfo = getConnectionStatus();

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <span className="font-semibold">Wallet</span>
        </div>
        <Badge 
          variant={connectionInfo.color === 'success' ? 'default' : 'secondary'}
          className={connectionInfo.color === 'destructive' ? 'bg-destructive text-destructive-foreground' : ''}
        >
          {connectionInfo.status}
        </Badge>
      </div>

      {!isConnected ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connect your wallet to start placing pixels
          </p>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
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
              
              <div className="mt-4 p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">
                  Don't have a wallet? Download{' '}
                  <a 
                    href={import.meta.env.VITE_METAMASK_DOWNLOAD_URL || "https://metamask.io/download/"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    MetaMask
                  </a>{' '}
                  or use{' '}
                  <a 
                    href={import.meta.env.VITE_WALLETCONNECT_EXPLORER_URL || "https://walletconnect.com/explorer"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    WalletConnect
                  </a>{' '}
                  to connect mobile wallets.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Address</span>
            <span className="font-mono text-sm">{formatAddress(address!)}</span>
          </div>
          
          {!isCorrectNetwork && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Wrong Network</p>
                <p className="text-xs text-muted-foreground">Switch to Irys Testnet</p>
              </div>
              <Button size="sm" variant="outline" onClick={switchNetwork}>
                Switch
              </Button>
            </div>
          )}

          {isCorrectNetwork && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-700 dark:text-green-300">Ready to place pixels</span>
            </div>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleDisconnect}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Disconnect
          </Button>
        </div>
      )}
    </Card>
  );
};