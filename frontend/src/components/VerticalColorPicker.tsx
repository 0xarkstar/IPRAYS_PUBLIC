import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Palette } from "lucide-react";
import { toast } from "sonner";

interface VerticalColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

// 기본 프리셋 색상
const PRESET_COLORS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
  '#ff00ff', '#00ffff', '#ff8000', '#8000ff', '#80ff00', '#ff0080'
];

const MAX_CUSTOM_PRESETS = 12;

export const VerticalColorPicker = ({ selectedColor, onColorSelect }: VerticalColorPickerProps) => {
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
    <div className="space-y-6">
      {/* Current Color */}
      <div className="text-center">
        <div className="text-xs font-medium text-muted-foreground mb-2">Current Color</div>
        <div 
          className="w-16 h-16 rounded-full border-2 border-border mx-auto shadow-md"
          style={{ backgroundColor: selectedColor }}
        />
        <div className="text-xs text-muted-foreground font-mono mt-2">
          {selectedColor.toUpperCase()}
        </div>
      </div>

      {/* 기본 프리셋 색상 - 원형으로 변경 */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-3 text-center">Basic Colors</div>
        <div className="grid grid-cols-4 gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
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
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-3 text-center">
          Custom Presets ({customPresets.length}/{MAX_CUSTOM_PRESETS})
        </div>
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: MAX_CUSTOM_PRESETS }, (_, index) => {
            const color = customPresets[index];
            const isEmpty = !color;
            
            return (
              <button
                key={`preset-${index}`}
                className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 relative ${
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
                onMouseEnter={(e) => {
                  if (!isEmpty) {
                    const overlay = e.currentTarget.querySelector('.delete-overlay');
                    if (overlay) {
                      (overlay as HTMLElement).style.opacity = '1';
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isEmpty) {
                    const overlay = e.currentTarget.querySelector('.delete-overlay');
                    if (overlay) {
                      (overlay as HTMLElement).style.opacity = '0';
                    }
                  }
                }}
              >
                {isEmpty && (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="w-2 h-2 rounded-full bg-current opacity-50" />
                  </div>
                )}
                {!isEmpty && (
                  <div className="delete-overlay absolute inset-0 rounded-full bg-destructive/80 opacity-0 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="text-white text-xs">×</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Right-click to remove
        </div>
      </div>

      {/* 커스텀 색상 입력 - 일렬로 배치 */}
      <div className="space-y-3">
        <div className="text-xs font-medium text-muted-foreground text-center">Custom Color</div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={selectedColor}
            onChange={handleColorInput}
            className="w-8 h-8 rounded border-2 border-border cursor-pointer bg-transparent flex-shrink-0"
            style={{ 
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              padding: '0',
              border: '2px solid hsl(var(--border))',
              borderRadius: '4px',
              outline: 'none'
            }}
          />
          <Input
            type="text"
            value={inputColor}
            onChange={(e) => handleColorChange(e.target.value)}
            placeholder="#FF0000"
            className="flex-1 font-mono text-xs h-8 text-center"
            maxLength={7}
          />
          {!customPresets.includes(selectedColor) && customPresets.length < MAX_CUSTOM_PRESETS && (
            <Button 
              size="sm" 
              variant="outline" 
              onClick={addToCustomPresets}
              className="h-8 text-xs px-3 flex-shrink-0"
            >
              Save
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};