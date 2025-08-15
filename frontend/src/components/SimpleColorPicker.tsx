import React, { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Palette } from "lucide-react";

interface SimpleColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export const SimpleColorPicker = ({ selectedColor, onColorSelect }: SimpleColorPickerProps) => {
  const [inputColor, setInputColor] = useState(selectedColor);

  const handleColorChange = (value: string) => {
    setInputColor(value);
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      onColorSelect(value);
    }
  };

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputColor(value);
    onColorSelect(value);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-accent/10">
          <Palette className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Color Picker</h3>
          <p className="text-sm text-muted-foreground">Choose your pixel color</p>
        </div>
      </div>

      {/* Current Color Preview */}
      <div className="mb-4 flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-lg border-2 border-border shadow-md"
          style={{ backgroundColor: selectedColor }}
        />
        <div>
          <div className="text-sm font-medium text-foreground">Current Color</div>
          <div className="text-xs text-muted-foreground font-mono">
            {selectedColor.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Color Input */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="color"
            value={selectedColor}
            onChange={handleColorInput}
            className="w-16 h-10 rounded-lg border-2 border-border cursor-pointer bg-transparent"
            style={{ 
              WebkitAppearance: 'none',
              appearance: 'none',
              padding: '2px'
            }}
          />
          <Input
            type="text"
            value={inputColor}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="#FF0000"
            className="flex-1 font-mono text-sm"
            maxLength={7}
          />
        </div>
        
        <div className="text-xs text-muted-foreground">
          Select a color using the color picker or enter a hex code
        </div>
      </div>
    </Card>
  );
};