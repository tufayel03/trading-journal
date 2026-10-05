import React, { useState, useRef, useEffect } from 'react';
import {
  Crosshair,
  CircleDot,
  MousePointer,
  Eraser,
  TrendingUp,
  MoveRight,
  Minus,
  Split,
  Percent,
  Square,
  Circle,
  Pencil,
  Highlighter,
  Type,
  MessageSquare,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Ruler,
  Magnet,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Trash2,
  Star,
  ChevronRight,
  PenTool,
  CalendarRange
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
  isMagnetMode: boolean;
  onToggleMagnetMode: () => void;
  isStayInDrawingMode: boolean;
  onToggleStayInDrawingMode: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
  showFavoritesBar: boolean;
  onToggleFavoritesBar: () => void;
  isDarkTheme?: boolean;
}

interface ToolGroup {
  id: string;
  name: string;
  activeIcon: React.ReactNode;
  defaultTool: DrawingToolType;
  tools: {
    id: DrawingToolType;
    label: string;
    shortcut?: string;
    icon: React.ReactNode;
  }[];
}

export const TradingViewDrawingToolbar: React.FC<Props> = ({
  activeTool,
  onSelectTool,
  drawingsCount,
  onClearAll,
  isVisible,
  onToggleVisibility,
  isMagnetMode,
  onToggleMagnetMode,
  isStayInDrawingMode,
  onToggleStayInDrawingMode,
  isLocked,
  onToggleLock,
  showFavoritesBar,
  onToggleFavoritesBar,
  isDarkTheme = true
}) => {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [favoriteTools, setFavoriteTools] = useState<DrawingToolType[]>([
    'trendline',
    'ray',
    'horizontal',
    'rectangle',
    'fibonacci',
    'long_position',
    'short_position',
    'text',
    'measure'
  ]);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Close flyout when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setOpenGroupId(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toolGroups: ToolGroup[] = [
    // 1. Cursor group
    {
      id: 'cursor_group',
      name: 'Cursor Tools',
      activeIcon: <Crosshair className="w-4 h-4" />,
      defaultTool: 'cursor',
      tools: [
        { id: 'cursor', label: 'Crosshair', shortcut: 'Alt+C', icon: <Crosshair className="w-4 h-4" /> },
        { id: 'dot', label: 'Dot', shortcut: 'Alt+D', icon: <CircleDot className="w-4 h-4" /> },
        { id: 'arrow_cursor', label: 'Arrow', shortcut: 'V', icon: <MousePointer className="w-4 h-4" /> },
        { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: <Eraser className="w-4 h-4 text-rose-400" /> }
      ]
    },
    // 2. Trendline group
    {
      id: 'trend_group',
      name: 'Trend Line Tools',
      activeIcon: <TrendingUp className="w-4 h-4" />,
      defaultTool: 'trendline',
      tools: [
        { id: 'trendline', label: 'Trend Line', shortcut: 'Alt+T', icon: <TrendingUp className="w-4 h-4" /> },
        { id: 'ray', label: 'Ray', shortcut: 'Alt+R', icon: <MoveRight className="w-4 h-4" /> },
        { id: 'horizontal', label: 'Horizontal Line', shortcut: 'Alt+H', icon: <Minus className="w-4 h-4" /> },
        { id: 'horizontal_ray', label: 'Horizontal Ray', shortcut: 'Alt+J', icon: <MoveRight className="w-4 h-4 text-cyan-400" /> },
        { id: 'vertical', label: 'Vertical Line', shortcut: 'Alt+V', icon: <Split className="w-4 h-4 rotate-90" /> },
        { id: 'cross_line', label: 'Cross Line', shortcut: 'Alt+X', icon: <Crosshair className="w-4 h-4 text-amber-400" /> }
      ]
    },
    // 3. Gann and Fibonacci group
    {
      id: 'fib_group',
      name: 'Gann & Fibonacci Tools',
      activeIcon: <Percent className="w-4 h-4 text-blue-400" />,
      defaultTool: 'fibonacci',
      tools: [
        { id: 'fibonacci', label: 'Fib Retracement', shortcut: 'Alt+F', icon: <Percent className="w-4 h-4 text-blue-400" /> },
        { id: 'fib_extension', label: 'Trend-Based Fib Extension', shortcut: 'Alt+E', icon: <Percent className="w-4 h-4 text-emerald-400" /> },
        { id: 'pitchfork', label: 'Pitchfork', shortcut: 'Alt+P', icon: <PenTool className="w-4 h-4 text-purple-400" /> }
      ]
    },
    // 4. Geometric shapes group
    {
      id: 'shapes_group',
      name: 'Geometric Shapes',
      activeIcon: <Square className="w-4 h-4 text-amber-400" />,
      defaultTool: 'rectangle',
      tools: [
        { id: 'brush', label: 'Brush', shortcut: 'Alt+B', icon: <Pencil className="w-4 h-4 text-amber-400" /> },
        { id: 'highlighter', label: 'Highlighter', shortcut: 'Alt+U', icon: <Highlighter className="w-4 h-4 text-yellow-400" /> },
        { id: 'rectangle', label: 'Rectangle (Order Block)', shortcut: 'Alt+G', icon: <Square className="w-4 h-4 text-amber-400" /> },
        { id: 'circle', label: 'Circle', shortcut: 'Alt+O', icon: <Circle className="w-4 h-4 text-cyan-400" /> },
        { id: 'ellipse', label: 'Ellipse', shortcut: 'Alt+L', icon: <Circle className="w-4 h-4 text-purple-400" /> }
      ]
    },
    // 5. Annotation tools group
    {
      id: 'text_group',
      name: 'Annotation Tools',
      activeIcon: <Type className="w-4 h-4 text-indigo-400" />,
      defaultTool: 'text',
      tools: [
        { id: 'text', label: 'Text Note', shortcut: 'Alt+N', icon: <Type className="w-4 h-4" /> },
        { id: 'callout', label: 'Callout Bubble', shortcut: 'Alt+K', icon: <MessageSquare className="w-4 h-4 text-sky-400" /> },
        { id: 'price_label', label: 'Price Label', shortcut: 'Alt+Z', icon: <Tag className="w-4 h-4 text-amber-400" /> }
      ]
    },
    // 6. Prediction and measurement group
    {
      id: 'prediction_group',
      name: 'Prediction & Measurement',
      activeIcon: <ArrowUpRight className="w-4 h-4 text-emerald-400" />,
      defaultTool: 'long_position',
      tools: [
        { id: 'long_position', label: 'Long Position (R:R)', shortcut: 'Alt+L', icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" /> },
        { id: 'short_position', label: 'Short Position (R:R)', shortcut: 'Alt+S', icon: <ArrowDownRight className="w-4 h-4 text-rose-400" /> },
        { id: 'price_range', label: 'Price Range', shortcut: 'Alt+M', icon: <Ruler className="w-4 h-4 text-cyan-400" /> },
        { id: 'date_range', label: 'Date Range', shortcut: 'Alt+Q', icon: <CalendarRange className="w-4 h-4 text-purple-400" /> }
      ]
    },
    // 7. Measure tool
    {
      id: 'measure_group',
      name: 'Measure (Ruler)',
      activeIcon: <Ruler className="w-4 h-4 text-cyan-400" />,
      defaultTool: 'measure',
      tools: [
        { id: 'measure', label: 'Measure', shortcut: 'Shift+Click', icon: <Ruler className="w-4 h-4 text-cyan-400" /> }
      ]
    }
  ];

  const toggleFavorite = (toolId: DrawingToolType) => {
    if (favoriteTools.includes(toolId)) {
      setFavoriteTools(favoriteTools.filter(t => t !== toolId));
    } else {
      setFavoriteTools([...favoriteTools, toolId]);
    }
  };

  return (
    <div
      ref={toolbarRef}
      className={`w-11 shrink-0 h-full border-r flex flex-col items-center py-2 select-none z-30 transition-colors ${
        isDarkTheme 
          ? 'bg-[#131722] border-[#2A2E39] text-[#D1D4DC]' 
          : 'bg-[#FFFFFF] border-[#E0E3EB] text-[#131722]'
      }`}
    >
      {/* Top Drawing Tool Groups */}
      <div className="flex flex-col gap-0.5 w-full px-1 items-center relative">
        {toolGroups.map(group => {
          const isGroupActive = group.tools.some(t => t.id === activeTool);
          const activeToolInGroup = group.tools.find(t => t.id === activeTool) || group.tools[0];
          const isMenuOpen = openGroupId === group.id;

          return (
            <div key={group.id} className="relative w-full flex items-center justify-center">
              <button
                onClick={() => {
                  onSelectTool(activeToolInGroup.id);
                  setOpenGroupId(null);
                }}
                className={`w-9 h-9 rounded-md transition-all relative flex items-center justify-center group ${
                  isGroupActive
                    ? 'bg-[#2962FF] text-white shadow-md'
                    : isDarkTheme
                    ? 'hover:bg-[#1E222D] hover:text-white text-[#B2B5BE]'
                    : 'hover:bg-[#F0F3FA] hover:text-[#131722] text-[#434651]'
                }`}
                title={group.name}
              >
                {activeToolInGroup.icon}

                {/* TradingView Flyout Arrow Indicator (Small arrow bottom-right) */}
                {group.tools.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenGroupId(isMenuOpen ? null : group.id);
                    }}
                    className={`absolute bottom-0.5 right-0.5 w-2 h-2 flex items-center justify-center rounded-sm transition-opacity ${
                      isGroupActive ? 'opacity-80' : 'opacity-40 group-hover:opacity-100'
                    }`}
                  >
                    <ChevronRight className={`w-2.5 h-2.5 rotate-45 transform`} />
                  </span>
                )}
              </button>

              {/* Flyout Submenu */}
              {isMenuOpen && group.tools.length > 1 && (
                <div
                  className={`absolute left-full ml-1 top-0 min-w-56 py-1 rounded-lg shadow-2xl border z-50 animate-fadeIn ${
                    isDarkTheme
                      ? 'bg-[#1E222D] border-[#2A2E39] text-[#D1D4DC]'
                      : 'bg-[#FFFFFF] border-[#E0E3EB] text-[#131722]'
                  }`}
                >
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider opacity-50 border-b border-inherit">
                    {group.name}
                  </div>
                  {group.tools.map(tool => {
                    const isSelected = activeTool === tool.id;
                    const isFav = favoriteTools.includes(tool.id);

                    return (
                      <div
                        key={tool.id}
                        onClick={() => {
                          onSelectTool(tool.id);
                          setOpenGroupId(null);
                        }}
                        className={`flex items-center justify-between px-3 py-2 text-xs cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[#2962FF] text-white font-semibold'
                            : isDarkTheme
                            ? 'hover:bg-[#2A2E39]'
                            : 'hover:bg-[#F0F3FA]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="w-4 h-4 flex items-center justify-center">{tool.icon}</span>
                          <span>{tool.label}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {tool.shortcut && (
                            <span className="text-[10px] font-mono opacity-50">{tool.shortcut}</span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(tool.id);
                            }}
                            className="p-0.5 text-gray-500 hover:text-amber-400 transition-colors"
                            title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            <Star className={`w-3.5 h-3.5 ${isFav ? 'text-amber-400 fill-amber-400' : ''}`} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Divider */}
      <div className={`w-6 my-2 border-t ${isDarkTheme ? 'border-[#2A2E39]' : 'border-[#E0E3EB]'}`} />

      {/* Bottom TradingView Utilities: Magnet, Stay In Drawing, Lock, Hide, Trash, Star */}
      <div className="flex flex-col gap-0.5 w-full px-1 items-center">
        {/* Magnet Mode Toggle */}
        <button
          onClick={onToggleMagnetMode}
          className={`w-9 h-9 rounded-md transition-all flex items-center justify-center ${
            isMagnetMode
              ? 'bg-[#2962FF] text-white shadow-md'
              : isDarkTheme
              ? 'hover:bg-[#1E222D] text-[#B2B5BE] hover:text-white'
              : 'hover:bg-[#F0F3FA] text-[#434651] hover:text-[#131722]'
          }`}
          title="Magnet Mode (Snap to High/Low)"
        >
          <Magnet className="w-4 h-4" />
        </button>

        {/* Stay In Drawing Mode Toggle */}
        <button
          onClick={onToggleStayInDrawingMode}
          className={`w-9 h-9 rounded-md transition-all flex items-center justify-center ${
            isStayInDrawingMode
              ? 'bg-[#2962FF] text-white shadow-md'
              : isDarkTheme
              ? 'hover:bg-[#1E222D] text-[#B2B5BE] hover:text-white'
              : 'hover:bg-[#F0F3FA] text-[#434651] hover:text-[#131722]'
          }`}
          title="Stay in Drawing Mode (Keep tool selected)"
        >
          <Pencil className="w-4 h-4" />
        </button>

        {/* Lock All Drawings Toggle */}
        <button
          onClick={onToggleLock}
          className={`w-9 h-9 rounded-md transition-all flex items-center justify-center ${
            isLocked
              ? 'bg-[#2962FF] text-white shadow-md'
              : isDarkTheme
              ? 'hover:bg-[#1E222D] text-[#B2B5BE] hover:text-white'
              : 'hover:bg-[#F0F3FA] text-[#434651] hover:text-[#131722]'
          }`}
          title={isLocked ? "Unlock All Drawing Tools" : "Lock All Drawing Tools"}
        >
          {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
        </button>

        {/* Hide All Drawings Toggle */}
        <button
          onClick={onToggleVisibility}
          className={`w-9 h-9 rounded-md transition-all flex items-center justify-center ${
            !isVisible
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              : isDarkTheme
              ? 'hover:bg-[#1E222D] text-[#B2B5BE] hover:text-white'
              : 'hover:bg-[#F0F3FA] text-[#434651] hover:text-[#131722]'
          }`}
          title={isVisible ? "Hide All Drawings" : "Show All Drawings"}
        >
          {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-amber-400" />}
        </button>

        {/* Remove Drawings (Trash) */}
        <button
          onClick={() => {
            if (drawingsCount > 0 && confirm(`Remove all ${drawingsCount} chart drawings?`)) {
              onClearAll();
            }
          }}
          disabled={drawingsCount === 0}
          className={`w-9 h-9 rounded-md transition-all flex items-center justify-center disabled:opacity-30 disabled:pointer-events-none ${
            isDarkTheme
              ? 'hover:bg-rose-500/20 text-[#B2B5BE] hover:text-rose-400'
              : 'hover:bg-rose-100 text-[#434651] hover:text-rose-600'
          }`}
          title={`Remove Drawings (${drawingsCount})`}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Favorites Bar Toggle */}
        <button
          onClick={onToggleFavoritesBar}
          className={`w-9 h-9 rounded-md transition-all flex items-center justify-center ${
            showFavoritesBar
              ? 'text-amber-400'
              : isDarkTheme
              ? 'hover:bg-[#1E222D] text-[#B2B5BE] hover:text-white'
              : 'hover:bg-[#F0F3FA] text-[#434651] hover:text-[#131722]'
          }`}
          title="Toggle Favorite Drawings Toolbar"
        >
          <Star className={`w-4 h-4 ${showFavoritesBar ? 'fill-amber-400' : ''}`} />
        </button>
      </div>
    </div>
  );
};
