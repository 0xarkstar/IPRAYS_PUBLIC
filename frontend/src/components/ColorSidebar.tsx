import React from 'react';
import { 
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  useSidebar 
} from "@/components/ui/sidebar";
import { VerticalColorPicker } from "@/components/VerticalColorPicker";
import { Palette } from "lucide-react";

interface ColorSidebarProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
}

export const ColorSidebar = ({ selectedColor, onColorSelect }: ColorSidebarProps) => {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center justify-between">
          <SidebarTrigger />
          {!isCollapsed && (
            <span className="text-sm font-medium">Colors</span>
          )}
        </div>
        {isCollapsed && (
          <div className="flex justify-center mt-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <Palette className="h-5 w-5 text-accent" />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="p-4 flex flex-col items-center justify-start">
        {!isCollapsed && (
          <VerticalColorPicker 
            selectedColor={selectedColor} 
            onColorSelect={onColorSelect} 
          />
        )}
        {isCollapsed && (
          <div className="flex flex-col items-center gap-2">
            {/* Current color */}
            <div 
              className="w-8 h-8 rounded-full border-2 border-border"
              style={{ backgroundColor: selectedColor }}
              title={selectedColor.toUpperCase()}
            />
            
            {/* Mini color palette */}
            <div className="grid grid-cols-1 gap-1">
              {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map((color) => (
                <button
                  key={color}
                  className={`w-6 h-6 rounded-full border transition-all hover:scale-110 ${
                    selectedColor === color ? 'border-primary ring-1 ring-primary/50' : 'border-border'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => onColorSelect(color)}
                  title={color.toUpperCase()}
                />
              ))}
            </div>
          </div>
        )}
      </SidebarContent>
    </Sidebar>
  );
};