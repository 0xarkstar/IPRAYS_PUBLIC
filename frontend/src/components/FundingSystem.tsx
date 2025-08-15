import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Users, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

interface FundingSystemProps {
  currentFunding: number;
  targetFunding: number;
  onContribute: (amount: number) => void;
  contributions: Array<{
    address: string;
    amount: number;
    timestamp: number;
  }>;
}

export const FundingSystem = ({
  currentFunding,
  targetFunding,
  onContribute,
  contributions
}: FundingSystemProps) => {
  const [contributionAmount, setContributionAmount] = useState<string>("");
  const [isContributing, setIsContributing] = useState(false);

  const progressPercentage = targetFunding > 0 ? (currentFunding / targetFunding) * 100 : 0;
  const remainingFunding = targetFunding - currentFunding;

  const handleContribute = async () => {
    const amount = parseFloat(contributionAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amount > 1000) {
      toast.error("Maximum contribution is 1000 mIrys");
      return;
    }

    setIsContributing(true);
    try {
      await onContribute(amount);
      setContributionAmount("");
      toast.success(`Contributed ${amount} IRYS to canvas expansion!`);
    } catch (error) {
      toast.error("Failed to contribute. Please try again.");
    } finally {
      setIsContributing(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
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

  const quickAmounts = [0.001, 0.005, 0.01, 0.025, 0.05, 0.1];

  return (
    <Card className="p-4 border-border bg-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-accent/10">
          <DollarSign className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Canvas Expansion Funding</h3>
          <p className="text-sm text-muted-foreground">
            Help expand the canvas to {Math.sqrt(targetFunding * 10000)}×{Math.sqrt(targetFunding * 10000)}
          </p>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Progress</span>
          <Badge variant="outline" className="text-accent">
            {currentFunding.toFixed(1)} / {targetFunding.toFixed(1)} mIrys
          </Badge>
        </div>
        
        <Progress 
          value={progressPercentage} 
          className="h-3 bg-muted"
        />
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {progressPercentage.toFixed(1)}% funded
          </span>
          <span className="text-muted-foreground">
            {remainingFunding.toFixed(1)} mIrys remaining
          </span>
        </div>
      </div>

      {/* Contribution Input */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium text-foreground">Contribute to Expansion</span>
        </div>
        
        {/* Quick Amount Buttons */}
        <div className="grid grid-cols-3 gap-2">
          {quickAmounts.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              onClick={() => setContributionAmount(amount.toString())}
              className="text-xs"
            >
              {amount} IRYS
            </Button>
          ))}
        </div>

        {/* Custom Amount Input */}
        <div className="flex gap-2">
          <Input
            type="number"
              placeholder="Enter amount (IRYS)"
            value={contributionAmount}
            onChange={(e) => setContributionAmount(e.target.value)}
            min="0.1"
             max="1000"
             step="0.001"
            className="flex-1 text-sm"
          />
          <Button
            variant="glow"
            onClick={handleContribute}
            disabled={isContributing || !contributionAmount || parseFloat(contributionAmount) <= 0}
            className="glow-accent"
          >
            {isContributing ? "Contributing..." : "Contribute"}
          </Button>
        </div>
      </div>

      {/* Recent Contributions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Recent Contributions ({contributions.length})
          </span>
        </div>
        
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {contributions.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No contributions yet. Be the first to help expand the canvas!
            </div>
          ) : (
            contributions.slice(0, 5).map((contribution, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2 rounded bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent"></div>
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatAddress(contribution.address)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                     {contribution.amount.toFixed(3)} IRYS
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatTime(contribution.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Auto-expansion Notice */}
      {progressPercentage >= 100 && (
        <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
          <div className="flex items-center gap-2 text-accent">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm font-medium">
              Target reached! Canvas will expand automatically.
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};