import React from 'react';
import {
  MousePointer,
  TrendingUp,
  Minus,
  MoveRight,
  Square,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Type,
  Pencil,
  Undo2,
  Trash2,
  Eye,
  EyeOff,
  Calendar,
  Layers
} from 'lucide-react';
import { DrawingToolType } from './TradingViewDrawingTypes';

interface Props {
  activeTool: DrawingToolType;
  onSelectTool: (tool: DrawingToolType) => void;
  activeColor: string;
  onChangeColor: (color: string) => void;
  activeLineWidth: number;
  onChangeLineWidth: (width: number) => void;
  drawingsCount: number;
  onUndo: () => void;
  onClearAll: () => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
  onOpenGoTo?: () => void;
  isDarkTheme?: boolean;
}

const PRESET_COLORS = [
  '#0284C7', // Sky Blue
  '#10B981', // Emerald Green
  '#EF4444', // Rose Red
  '#F59E0B', // Amber Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFFFFF', // White
  '#1E293B'  // Dark Slate
];

export const TradingViewDrawingToolbar: React.FC<Props> = ({
  activeTool,
  onSelectTool,
  activeColor,
  onChangeColor,
  activeLineWidth,
  onChangeLineWidth,
  drawingsCount,
  onUndo,
  onClearAll,
  isVisible,
  onToggleVisibility,
  onOpenGoTo,
  isDarkTheme = false
}) => {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const tools: { id: DrawingToolType; label: string; shortcut: string; icon: React.ReactNode }[] = [
    { id: 'cursor', label: 'Crosshair / Select', shortcut: 'V', icon: <MousePointer className="w-4 h-4" /> },
    { id: 'trendline', label: 'Trendline', shortcut: 'T', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'horizontal', label: 'Horizontal Support / Resistance', shortcut: 'H', icon: <Minus className="w-4 h-4" /> },
    { id: 'ray', label: 'Horizontal Ray', shortcut: 'R', icon: <MoveRight className="w-4 h-4" /> },
    { id: 'rectangle', label: 'Rectangle / Order Block Zone', shortcut: 'B', icon: <Square className="w-4 h-4" /> },
    { id: 'fibonacci', label: 'Fibonacci Retracement', shortcut: 'F', icon: <Percent className="w-4 h-4" /> },
    { id: 'long_position', label: 'Long Position (R:R)', shortcut: 'L', icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" /> },
    { id: 'short_position', label: 'Short Position (R:R)', shortcut: 'S', icon: <ArrowDownRight className="w-4 h-4 text-rose-400" /> },
    { id: 'text', label: 'Text Note', shortcut: 'N', icon: <Type className="w-4 h-4" /> },
    { id: 'brush', label: 'Brush / Freehand', shortcut: 'P', icon: <Pencil className="w-4 h-4" /> }
  ];

  return (
    <div className={`w-11 shrink-0 h-full border-r flex flex-col items-center py-2 select-none z-30 transition-colors ${
      isDarkTheme 
        ? 'bg-[#131722] border-[#2A2E39] text-[#D1D4DC]' 
        : 'bg-[#F8FAFD] border-[#E0E3EB] text-[#131722]'
    }`}>
      {/* Top Drawing Tools */}
      <div className="flex flex-col gap-0.5 w-full px-1 items-center">
        {tools.map(tool => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={`w-9 h-9 rounded-lg transition-all relative group flex items-center justify-center ${
                isActive
                  ? 'bg-emerald-500 text-white shadow-md'
                  : isDarkTheme
                  ? 'hover:bg-[#1E222D] hover:text-white'
                  : 'hover:bg-gray-200 hover:text-black'
              }`}
              title={`${tool.label} (${tool.shortcut})`}
            >
              {tool.icon}
              
              {/* Tooltip */}
              <div className="absolute left-full ml-2 px-2.5 py-1 bg-[#1E222D] text-white text-[11px] font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-gray-700">
                <span className="font-semibold">{tool.label}</span>
                <span className="ml-1.5 opacity-60 font-mono text-[10px]">[{tool.shortcut}]</span>
              </div>
            </button>
          );
        })}
      </div>

      <div className={`w-6 my-1.5 border-t ${isDarkTheme ? 'border-[#2A2E39]' : 'border-gray-300'}`} />

      {/* Middle Tools: Color Picker, Go to Time, Visibility */}
      <div className="flex flex-col gap-0.5 w-full px-1 items-center">
        
        {/* "Go to Date & Time" Button (TradingView Alt+G) */}
        {onOpenGoTo && (
          <button
            onClick={onOpenGoTo}
            className={`w-9 h-9 rounded-lg transition-all relative group flex items-center justify-center text-cyan-400 ${
              isDarkTheme ? 'hover:bg-[#1E222D]' : 'hover:bg-gray-200'
            }`}
            title="Go to Date & Time (Alt+G)"
          >
            <Calendar className="w-4 h-4" />
            <div className="absolute left-full ml-2 px-2.5 py-1 bg-[#1E222D] text-white text-[11px] font-medium rounded-md shadow-xl whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 border border-gray-700">
              <span>Go to Date & Time</span>
              <span className="ml-1.5 opacity-60 font-mono text-[10px]">[Alt+G]</span>
            </div>
          </button>
        )}

        {/* Active Color & Stroke Picker */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center ${
              isDarkTheme ? 'hover:bg-[#1E222D]' : 'hover:bg-gray-200'
            }`}
            title="Drawing Color & Stroke Settings"
          >
            <div 
              className="w-4 h-4 rounded-full border border-gray-400 shadow-sm"
              style={{ backgroundColor: activeColor }}
            />
          </button>

          {/* Color Flyout */}
          {showColorPicker && (
            <div className={`absolute left-full ml-2 bottom-0 p-3 rounded-2xl border shadow-2xl backdrop-blur-md w-52 z-50 space-y-2.5 ${
              isDarkTheme ? 'bg-[#1E222D] border-[#2A2E39] text-white' : 'bg-white border-gray-200 text-gray-800'
            }`}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Drawing Color
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => {
                      onChangeColor(c);
                      setShowColorPicker(false);
                    }}
                    className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-transform hover:scale-110 ${
                      activeColor === c ? 'ring-2 ring-emerald-500 scale-105' : 'border-gray-600'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>

              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 pt-1 border-t border-gray-700/50">
                Stroke Thickness
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map(w => (
                  <button
                    key={w}
                    onClick={() => onChangeLineWidth(w)}
                    className={`flex-1 py-1 rounded text-xs font-bold font-mono transition-all ${
                      activeLineWidth === w
                        ? 'bg-emerald-500 text-white'
                        : isDarkTheme
                        ? 'bg-[#131722] text-gray-300 hover:text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Visibility Toggle */}
        <button
          onClick={onToggleVisibility}
          className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center ${
            !isVisible ? 'text-amber-500' : isDarkTheme ? 'hover:bg-[#1E222D]' : 'hover:bg-gray-200'
          }`}
          title={isVisible ? 'Hide Drawings' : 'Show Drawings'}
        >
          {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>

      </div>

      {/* Bottom Actions: Undo & Clear */}
      <div className="mt-auto flex flex-col gap-0.5 w-full px-1 items-center pt-2">
        <button
          onClick={onUndo}
          disabled={drawingsCount === 0}
          className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center disabled:opacity-20 ${
            isDarkTheme ? 'hover:bg-[#1E222D]' : 'hover:bg-gray-200'
          }`}
          title="Undo Last Drawing (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={onClearAll}
          disabled={drawingsCount === 0}
          className={`w-9 h-9 rounded-lg transition-all flex items-center justify-center text-rose-500 hover:bg-rose-500/10 disabled:opacity-20`}
          title={`Clear All Drawings (${drawingsCount})`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
