import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, ExternalLink, Clock } from "lucide-react";

interface Transaction {
  id: string;
  type: 'pixel_place' | 'funding_contribution';
  status: 'pending' | 'completed' | 'failed';
  hash?: string;
  amount?: number;
  gasEstimate?: number;
  timestamp: number;
  error?: string;
}

interface TransactionStatusProps {
  transactions: Transaction[];
  onViewTransaction: (hash: string) => void;
}

export const TransactionStatus = ({ transactions, onViewTransaction }: TransactionStatusProps) => {
  const recentTransactions = transactions
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-secondary" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-accent" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-secondary border-secondary">Pending</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-accent border-accent">Completed</Badge>;
      case 'failed':
        return <Badge variant="outline" className="text-destructive border-destructive">Failed</Badge>;
    }
  };

  const getTransactionDescription = (transaction: Transaction) => {
    switch (transaction.type) {
      case 'pixel_place':
        return 'Pixel placement';
      case 'funding_contribution':
        return `Funding contribution (${transaction.amount?.toFixed(3)} IRYS)`;
    }
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  if (recentTransactions.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 border-border bg-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Clock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Transaction Status</h3>
          <p className="text-sm text-muted-foreground">Recent blockchain activity</p>
        </div>
      </div>

      <div className="space-y-3">
        {recentTransactions.map((transaction) => (
          <div 
            key={transaction.id}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(transaction.status)}
              <div>
                <div className="text-sm font-medium text-foreground">
                  {getTransactionDescription(transaction)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTime(transaction.timestamp)}
                  {transaction.gasEstimate && (
                    <span className="ml-2">
                      • Gas: {transaction.gasEstimate.toFixed(4)} IRYS
                    </span>
                  )}
                </div>
                {transaction.error && (
                  <div className="text-xs text-destructive mt-1">
                    {transaction.error}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {getStatusBadge(transaction.status)}
              {transaction.hash && transaction.status === 'completed' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewTransaction(transaction.hash!)}
                  className="h-8 w-8 p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current Activity Summary */}
      {recentTransactions.some(tx => tx.status === 'pending') && (
        <div className="mt-4 p-3 rounded-lg bg-secondary/10 border border-secondary/20">
          <div className="flex items-center gap-2 text-secondary">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm font-medium">
              {recentTransactions.filter(tx => tx.status === 'pending').length} transaction(s) pending...
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};