import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Palette, Pipette, History } from "lucide-react";

interface ColorPaletteProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

const PRESET_COLORS = [
  '#ffffff', '#e5e5e5', '#c0c0c0', '#808080', '#404040', '#000000',
  '#ff0000', '#ff8000', '#ffff00', '#80ff00', '#00ff00', '#00ff80',
  '#00ffff', '#0080ff', '#0000ff', '#8000ff', '#ff00ff', '#ff0080',
  '#800000', '#804000', '#808000', '#408000', '#008000', '#008040',
  '#008080', '#004080', '#000080', '#400080', '#800080', '#800040'
];

const RGB_GROUPS = {
  'Reds': ['#ff0000', '#ff3333', '#ff6666', '#ff9999', '#ffcccc'],
  'Blues': ['#0000ff', '#3333ff', '#6666ff', '#9999ff', '#ccccff'],
  'Greens': ['#00ff00', '#33ff33', '#66ff66', '#99ff99', '#ccffcc'],
  'Purples': ['#800080', '#9933cc', '#b366ff', '#cc99ff', '#e5ccff'],
  'Oranges': ['#ff8000', '#ff9933', '#ffb366', '#ffcc99', '#ffe5cc'],
  'Cyans': ['#00ffff', '#33ffff', '#66ffff', '#99ffff', '#ccffff']
};

export const ColorPalette = ({ selectedColor, onColorSelect }: ColorPaletteProps) => {
  const [customColor, setCustomColor] = useState(selectedColor);
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'preset' | 'custom' | 'groups'>('preset');

  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    
    // Add to history if not already present
    if (!colorHistory.includes(color)) {
      setColorHistory(prev => [color, ...prev.slice(0, 9)]); // Keep last 10 colors
    }
  };

  const handleCustomColorChange = (value: string) => {
    setCustomColor(value);
    if (/^#[0-9A-F]{6}$/i.test(value)) {
      handleColorSelect(value);
    }
  };

  return (
    <Card className="p-4 border-border bg-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-accent/10">
          <Palette className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Color Palette</h3>
          <p className="text-sm text-muted-foreground">Choose your pixel color</p>
        </div>
      </div>

      {/* Current Color Preview */}
      <div className="mb-4 flex items-center gap-3">
        <div 
          className="w-12 h-12 rounded-lg border-2 border-border shadow-md"
          style={{ backgroundColor: selectedColor }}
        ></div>
        <div>
          <div className="text-sm font-medium text-foreground">Current Color</div>
          <div className="text-xs text-muted-foreground font-mono">
            {selectedColor.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg">
        <Button
          variant={activeTab === 'preset' ? 'neon' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('preset')}
          className="flex-1 text-xs"
        >
          Presets
        </Button>
        <Button
          variant={activeTab === 'groups' ? 'neon' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('groups')}
          className="flex-1 text-xs"
        >
          Groups
        </Button>
        <Button
          variant={activeTab === 'custom' ? 'neon' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('custom')}
          className="flex-1 text-xs"
        >
          Custom
        </Button>
      </div>

      {/* Preset Colors */}
      {activeTab === 'preset' && (
        <div className="grid grid-cols-6 gap-2 mb-4">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                selectedColor === color ? 'border-primary ring-2 ring-primary/50' : 'border-border'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
              title={color.toUpperCase()}
            />
          ))}
        </div>
      )}

      {/* Color Groups */}
      {activeTab === 'groups' && (
        <div className="space-y-3 mb-4">
          {Object.entries(RGB_GROUPS).map(([groupName, colors]) => (
            <div key={groupName}>
              <div className="text-xs font-medium text-muted-foreground mb-2">
                {groupName}
              </div>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    className={`w-8 h-8 rounded border-2 transition-all hover:scale-110 ${
                      selectedColor === color ? 'border-primary ring-2 ring-primary/50' : 'border-border'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorSelect(color)}
                    title={color.toUpperCase()}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Color */}
      {activeTab === 'custom' && (
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-2">
            <Pipette className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Custom Color</span>
          </div>
          <div className="flex gap-2">
            <Input
              type="color"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              className="w-16 h-10 p-1 border-border"
            />
            <Input
              type="text"
              value={customColor}
              onChange={(e) => handleCustomColorChange(e.target.value)}
              placeholder="#FF0000"
              className="flex-1 font-mono text-sm"
              maxLength={7}
            />
          </div>
        </div>
      )}

      {/* Color History */}
      {colorHistory.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Recent Colors</span>
          </div>
          <div className="flex gap-1">
            {colorHistory.map((color, index) => (
              <button
                key={`${color}-${index}`}
                className={`w-6 h-6 rounded border transition-all hover:scale-110 ${
                  selectedColor === color ? 'border-primary ring-1 ring-primary/50' : 'border-border'
                }`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={color.toUpperCase()}
              />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};