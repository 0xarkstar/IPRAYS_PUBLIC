import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Palette, Check } from "lucide-react";

interface MobileColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const BASIC_COLORS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
  '#ff8000', '#8000ff', '#ff0080', '#80ff00', '#0080ff', '#ff8080', '#80ff80', '#8080ff'
];

const PRESET_COLORS = [
  '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#e11d48', '#64748b',
  '#fb7185', '#fbbf24', '#34d399', '#60a5fa', '#a78bfa', '#f472b6', '#94a3b8', '#1e293b'
];

export const MobileColorPicker = ({ selectedColor, onColorSelect }: MobileColorPickerProps) => {
  const [customColor, setCustomColor] = useState(selectedColor);
  const [isOpen, setIsOpen] = useState(false);

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    setCustomColor(color);
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    onColorSelect(color);
  };

  const ColorGrid = ({ colors, title }: { colors: string[], title: string }) => (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">{title}</h4>
      <div className="grid grid-cols-8 gap-2">
        {colors.map((color) => (
          <button
            key={color}
            className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 active:scale-95 ${
              selectedColor === color 
                ? 'border-primary ring-2 ring-primary/30' 
                : 'border-border hover:border-accent'
            }`}
            style={{ backgroundColor: color }}
            onClick={() => handleColorSelect(color)}
          >
            {selectedColor === color && (
              <Check className="h-4 w-4 text-white drop-shadow-lg mx-auto" />
            )}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 px-3">
          <div 
            className="w-4 h-4 rounded border border-border"
            style={{ backgroundColor: selectedColor }}
          />
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Colors</span>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Select Color
          </SheetTitle>
        </SheetHeader>
        
        <div className="space-y-6 py-4">
          {/* Current Selection */}
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg border">
            <div 
              className="w-12 h-12 rounded-lg border-2 border-border"
              style={{ backgroundColor: selectedColor }}
            />
            <div>
              <p className="text-sm font-medium">Selected Color</p>
              <Badge variant="outline" className="font-mono text-xs">
                {selectedColor.toUpperCase()}
              </Badge>
            </div>
          </div>

          {/* Custom Color Input */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">Custom Color</h4>
            <div className="flex gap-2">
              <Input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="w-16 h-10 p-1 cursor-pointer"
              />
              <Input
                type="text"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                onBlur={() => onColorSelect(customColor)}
                placeholder="#000000"
                className="font-mono text-sm"
              />
            </div>
          </div>

          {/* Basic Colors */}
          <ColorGrid colors={BASIC_COLORS} title="Basic Colors" />

          {/* Preset Colors */}
          <ColorGrid colors={PRESET_COLORS} title="Preset Colors" />
        </div>
      </SheetContent>
    </Sheet>
  );
};