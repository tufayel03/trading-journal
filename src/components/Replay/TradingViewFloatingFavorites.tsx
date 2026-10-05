import React, { useState } from 'react';
import {
  GripVertical,
  Crosshair,
  TrendingUp,
  MoveRight,
  Minus,
  Square,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Type,
  Ruler,
  Trash2,
  Palette
} from 'lucide-react';
import { DrawingToolType } from './TradingViewDrawingTypes';

interface Props {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  activeColor: string;
  onChangeColor: (color: string) => void;
  onClearAll: () => void;
  drawingsCount: number;
  isDarkTheme?: boolean;
}

const PRESET_COLORS = [
  '#0284C7', // Sky Blue
  '#10B981', // Emerald Green
  '#EF4444', // Rose Red
  '#F59E0B', // Amber Yellow
  '#8B5CF6', // Purple
  '#FFFFFF'  // White
];

export const TradingViewFloatingFavorites: React.FC<Props> = ({
  activeTool,
  onSelectTool,
  activeColor,
  onChangeColor,
  onClearAll,
  drawingsCount,
  isDarkTheme = true
}) => {
  const [position, setPosition] = useState({ x: 80, y: 70 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: Math.max(10, e.clientX - dragOffset.x),
      y: Math.max(10, e.clientY - dragOffset.y)
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const favoriteTools: { id: DrawingToolType; label: string; icon: React.ReactNode }[] = [
    { id: 'cursor', label: 'Crosshair', icon: <Crosshair className="w-3.5 h-3.5" /> },
    { id: 'trendline', label: 'Trend Line', icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { id: 'ray', label: 'Ray', icon: <MoveRight className="w-3.5 h-3.5" /> },
    { id: 'horizontal', label: 'Horizontal Line', icon: <Minus className="w-3.5 h-3.5" /> },
    { id: 'rectangle', label: 'Rectangle (Order Block)', icon: <Square className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'fibonacci', label: 'Fib Retracement', icon: <Percent className="w-3.5 h-3.5 text-blue-400" /> },
    { id: 'long_position', label: 'Long Position', icon: <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'short_position', label: 'Short Position', icon: <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'text', label: 'Text Note', icon: <Type className="w-3.5 h-3.5" /> },
    { id: 'measure', label: 'Ruler Measure', icon: <Ruler className="w-3.5 h-3.5 text-cyan-400" /> }
  ];

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className={`absolute z-30 flex items-center gap-0.5 px-1.5 py-1 rounded-lg shadow-2xl border backdrop-blur-md select-none transition-all ${
        isDarkTheme
          ? 'bg-[#1E222D]/95 border-[#2A2E39] text-[#D1D4DC]'
          : 'bg-[#FFFFFF]/95 border-[#E0E3EB] text-[#131722]'
      }`}
    >
      {/* Draggable Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="cursor-move p-1 text-gray-500 hover:text-gray-300 transition-colors"
        title="Drag Favorites Toolbar"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Tool Buttons */}
      <div className="flex items-center gap-0.5">
        {favoriteTools.map(tool => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={`p-1.5 rounded transition-all flex items-center justify-center ${
                isActive
                  ? 'bg-[#2962FF] text-white shadow'
                  : isDarkTheme
                  ? 'hover:bg-[#2A2E39] text-[#B2B5BE] hover:text-white'
                  : 'hover:bg-[#F0F3FA] text-[#434651] hover:text-[#131722]'
              }`}
              title={tool.label}
            >
              {tool.icon}
            </button>
          );
        })}
      </div>

      <div className={`w-[1px] h-4 mx-1 ${isDarkTheme ? 'bg-[#2A2E39]' : 'bg-[#E0E3EB]'}`} />

      {/* Color Swatch Picker */}
      <div className="relative">
        <button
          onClick={() => setShowColorPicker(!showColorPicker)}
          className="p-1.5 rounded hover:bg-[#2A2E39] flex items-center gap-1"
          title="Active Drawing Color"
        >
          <span
            className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm"
            style={{ backgroundColor: activeColor }}
          />
        </button>

        {showColorPicker && (
          <div
            className={`absolute bottom-full mb-2 left-0 p-2 rounded-lg border shadow-xl flex items-center gap-1.5 z-50 ${
              isDarkTheme ? 'bg-[#1E222D] border-[#2A2E39]' : 'bg-white border-[#E0E3EB]'
            }`}
          >
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => {
                  onChangeColor(c);
                  setShowColorPicker(false);
                }}
                className={`w-5 h-5 rounded-full border transition-transform hover:scale-110 ${
                  activeColor === c ? 'border-white ring-2 ring-blue-500 scale-110' : 'border-gray-600'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Clear All Drawings */}
      {drawingsCount > 0 && (
        <button
          onClick={() => {
            if (confirm(`Remove all ${drawingsCount} chart drawings?`)) {
              onClearAll();
            }
          }}
          className="p-1.5 rounded text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-0.5"
          title="Clear all drawings"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
