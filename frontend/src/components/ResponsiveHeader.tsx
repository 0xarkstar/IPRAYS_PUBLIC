import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompactWalletConnect } from "@/components/CompactWalletConnect";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MobileColorPicker } from "@/components/MobileColorPicker";
import { Grid3X3, Users, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface ResponsiveHeaderProps {
  activeUsers: number;
  totalPixels: number;
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export const ResponsiveHeader = ({ 
  activeUsers, 
  totalPixels, 
  selectedColor, 
  onColorSelect 
}: ResponsiveHeaderProps) => {
  const MobileMenu = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
            <img src="/IPRAYS.png" alt="IPRAYS Logo" className="h-5 w-5" />
              IPRAYS
            </SheetTitle>
          </SheetHeader>
        
        <div className="space-y-6 py-4">
          {/* Stats */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Canvas Stats</h4>
            <div className="space-y-2">
              <Badge variant="outline" className="w-full justify-start">
                <Users className="h-3 w-3 mr-2" />
                {activeUsers} active users
              </Badge>
              <Badge variant="outline" className="w-full justify-start">
                <Grid3X3 className="h-3 w-3 mr-2" />
                {totalPixels.toLocaleString()} pixels
              </Badge>
            </div>
          </div>

          {/* Tools */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Tools</h4>
            <div className="space-y-2">
              <ThemeToggle />
              <CompactWalletConnect />
            </div>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Links</h4>
            <div className="space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                About
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                Documentation
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="w-full px-4 py-3">
        <div className="flex items-center justify-between w-full">
          {/* Left - Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="p-2 rounded-lg gradient-primary">
              <img src="/IPRAYS.png" alt="IPRAYS Logo" className="h-5 w-5 md:h-6 md:w-6" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">IPRAYS</h1>
              <p className="text-xs md:text-sm text-muted-foreground">Decentralized pixel art • 1024×1024</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-lg font-bold text-foreground">IPRAYS</h1>
            </div>
          </div>
          
          {/* Center - Mobile Color Picker */}
          <div className="flex md:hidden">
            <MobileColorPicker 
              selectedColor={selectedColor} 
              onColorSelect={onColorSelect} 
            />
          </div>

          {/* Right - Desktop Stats & Controls - 액티브 유저 / pixel / 지갑 / UI선택 */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <Badge variant="outline" className="text-accent border-accent">
              <Users className="h-3 w-3 mr-1" />
              {activeUsers}
            </Badge>
            
            <Badge variant="outline" className="text-primary border-primary">
              <Grid3X3 className="h-3 w-3 mr-1" />
              {totalPixels.toLocaleString()}
            </Badge>
            
            <CompactWalletConnect />
            
            <MobileColorPicker 
              selectedColor={selectedColor} 
              onColorSelect={onColorSelect} 
            />
            
            <ThemeToggle />
          </div>

          {/* Mobile Menu - 모바일에서만 표시 */}
          <div className="flex md:hidden">
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  );
};