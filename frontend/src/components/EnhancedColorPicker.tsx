import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { toast } from "sonner";

interface EnhancedColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

// 기본 프리셋 색상
const PRESET_COLORS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
  '#ff00ff', '#00ffff', '#ff8000', '#8000ff', '#80ff00', '#ff0080'
];

const MAX_CUSTOM_PRESETS = 12;

export const EnhancedColorPicker = ({ selectedColor, onColorSelect }: EnhancedColorPickerProps) => {
  const [inputColor, setInputColor] = useState(selectedColor);
  const [customPresets, setCustomPresets] = useState<string[]>([]);

  // 로컬 스토리지에서 커스텀 프리셋 로드
  useEffect(() => {
    const savedCustomPresets = localStorage.getItem('customPresets');
    if (savedCustomPresets) {
      setCustomPresets(JSON.parse(savedCustomPresets));
    }
  }, []);

  // 커스텀 프리셋에 추가
  const addToCustomPresets = () => {
    if (!customPresets.includes(selectedColor) && customPresets.length < MAX_CUSTOM_PRESETS) {
      const newCustomPresets = [...customPresets, selectedColor];
      setCustomPresets(newCustomPresets);
      localStorage.setItem('customPresets', JSON.stringify(newCustomPresets));
      toast.success('Color saved to presets');
    }
  };

  // 커스텀 프리셋에서 제거
  const removeFromCustomPresets = (colorToRemove: string) => {
    const newCustomPresets = customPresets.filter(color => color !== colorToRemove);
    setCustomPresets(newCustomPresets);
    localStorage.setItem('customPresets', JSON.stringify(newCustomPresets));
    toast.success('Color removed from presets');
  };

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

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    setInputColor(color);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-accent/10">
          <Palette className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">Color Picker</h3>
          <p className="text-sm text-muted-foreground">Choose your pixel color</p>
        </div>
        <div 
          className="w-8 h-8 rounded-full border-2 border-border"
          style={{ backgroundColor: selectedColor }}
        />
      </div>

      {/* 기본 프리셋 색상 */}
      <div className="mb-4">
        <div className="text-xs font-medium text-muted-foreground mb-2">Basic Colors</div>
        <div className="grid grid-cols-6 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                selectedColor === color ? 'border-primary ring-2 ring-primary/50' : 'border-border'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
              title={color.toUpperCase()}
            />
          ))}
        </div>
      </div>

      {/* 커스텀 프리셋 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-medium text-muted-foreground">
            Custom Presets ({customPresets.length}/{MAX_CUSTOM_PRESETS})
          </div>
        </div>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: MAX_CUSTOM_PRESETS }, (_, index) => {
            const color = customPresets[index];
            const isEmpty = !color;
            
            return (
              <button
                key={`preset-${index}`}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 relative group ${
                  !isEmpty && selectedColor === color 
                    ? 'border-primary ring-2 ring-primary/50' 
                    : 'border-border'
                } ${isEmpty ? 'border-dashed bg-muted/20' : ''}`}
                style={!isEmpty ? { backgroundColor: color } : {}}
                onClick={() => !isEmpty && handleColorSelect(color)}
                title={!isEmpty ? `${color.toUpperCase()} (Right-click to remove)` : 'Empty slot'}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (!isEmpty) {
                    removeFromCustomPresets(color);
                  }
                }}
              >
                {isEmpty && (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-current opacity-50" />
                  </div>
                )}
                {!isEmpty && (
                  <div className="absolute inset-0 rounded-full bg-destructive/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-xs">×</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Right-click to remove colors
        </div>
      </div>

      {/* 커스텀 색상 입력 */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground">Custom Color</div>
        <div className="flex gap-2">
          <input
            type="color"
            value={selectedColor}
            onChange={handleColorInput}
            className="w-12 h-8 rounded border-2 border-border cursor-pointer bg-transparent"
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
            className="flex-1 font-mono text-xs h-8"
            maxLength={7}
          />
          {!customPresets.includes(selectedColor) && customPresets.length < MAX_CUSTOM_PRESETS && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={addToCustomPresets}
              className="h-8 px-3 text-xs"
            >
              Save
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};