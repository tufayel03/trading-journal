import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Scissors,
  GripVertical,
  Sliders,
  X,
  Target,
  Clock
} from 'lucide-react';
import { Trade } from '../../types';
import { Candle } from './TradingViewReplayChart';

interface Props {
  candles: Candle[];
  currentIndex: number;
  isPlaying: boolean;
  speed: number;
  trade: Trade;
  onPlayToggle: () => void;
  onStepForward: () => void;
  onStepBackward: () => void;
  onJumpToEntry: () => void;
  onJumpToExit: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onSeek: (index: number) => void;
  onClose?: () => void;
  isDarkTheme?: boolean;
}

export const TradingViewReplayBar: React.FC<Props> = ({
  candles,
  currentIndex,
  isPlaying,
  speed,
  trade,
  onPlayToggle,
  onStepForward,
  onStepBackward,
  onJumpToEntry,
  onJumpToExit,
  onReset,
  onSpeedChange,
  onSeek,
  onClose,
  isDarkTheme = true
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Floating P&L calculation for current replay candle
  const currentCandle = candles[currentIndex];
  const isBuy = trade.direction === 'BUY';
  const entryPrice = trade.openPrice;
  const currentPrice = currentCandle ? currentCandle.close : entryPrice;
  const lotSize = trade.lotSize || 0.01;

  let currentFloatingPnl = 0;
  let currentFloatingPips = 0;

  if (entryPrice && currentPrice) {
    const diff = isBuy ? currentPrice - entryPrice : entryPrice - currentPrice;
    if (trade.symbol.includes('XAU') || trade.symbol.includes('GOLD')) {
      currentFloatingPips = Number((diff / 0.10).toFixed(1));
      currentFloatingPnl = Number((diff * lotSize * 100).toFixed(2));
    } else if (trade.symbol.includes('JPY')) {
      currentFloatingPips = Number((diff / 0.01).toFixed(1));
      currentFloatingPnl = Number((diff * lotSize * 1000).toFixed(2));
    } else {
      currentFloatingPips = Number((diff / 0.0001).toFixed(1));
      currentFloatingPnl = Number((diff * lotSize * 100000).toFixed(2));
    }
  }

  // Handle Dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const currentX = position ? position.x : (window.innerWidth / 2 - 250);
    const currentY = position ? position.y : (window.innerHeight - 110);
    setDragOffset({
      x: e.clientX - currentX,
      y: e.clientY - currentY
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: Math.max(20, Math.min(window.innerWidth - 500, e.clientX - dragOffset.x)),
      y: Math.max(60, Math.min(window.innerHeight - 60, e.clientY - dragOffset.y))
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragOffset]);

  const speedOptions = [
    { label: '0.1s', val: 10 },
    { label: '0.5s', val: 2 },
    { label: '1s', val: 1 },
    { label: '2s', val: 0.5 },
    { label: '3s', val: 0.33 }
  ];

  const currentDateFormatted = currentCandle
    ? new Date(currentCandle.time * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <div
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px` }
          : { bottom: '38px', left: '50%', transform: 'translateX(-50%)' }
      }
      className={`fixed z-[100000] flex items-center gap-2 px-3 py-1.5 rounded-xl shadow-2xl border backdrop-blur-md select-none transition-all ${
        isDarkTheme
          ? 'bg-[#1E222D]/95 border-[#2A2E39] text-[#D1D4DC]'
          : 'bg-[#FFFFFF]/95 border-[#E0E3EB] text-[#131722]'
      }`}
    >
      {/* Draggable Handle */}
      <div
        onMouseDown={handleMouseDown}
        className="cursor-move p-1 text-gray-500 hover:text-gray-300 transition-colors"
        title="Drag Replay Toolbar"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </div>

      {/* Jump To Bar / Cut Button (TradingView Scissor Icon) */}
      <button
        onClick={onReset}
        className={`p-1.5 rounded-lg border transition-colors flex items-center gap-1 text-xs font-semibold ${
          isDarkTheme
            ? 'bg-[#131722] border-[#2A2E39] hover:bg-[#2A2E39] text-gray-300 hover:text-white'
            : 'bg-[#F0F3FA] border-[#E0E3EB] hover:bg-gray-200 text-[#131722]'
        }`}
        title="Jump to beginning of trade"
      >
        <Scissors className="w-3.5 h-3.5 text-cyan-400" />
        <span className="text-[11px] hidden sm:inline">Jump</span>
      </button>

      {/* Jump to Entry and Exit Quick Buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={onJumpToEntry}
          className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold font-mono transition-colors"
          title="Jump to Trade Entry Point ([)"
        >
          Entry
        </button>
        <button
          onClick={onJumpToExit}
          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-md text-[10px] font-bold font-mono transition-colors"
          title="Jump to Trade Exit Point (])"
        >
          Exit
        </button>
      </div>

      <div className={`w-[1px] h-4 mx-0.5 ${isDarkTheme ? 'bg-[#2A2E39]' : 'bg-[#E0E3EB]'}`} />

      {/* Step Back, Play / Pause, Step Forward */}
      <div className="flex items-center gap-1">
        <button
          onClick={onStepBackward}
          className="p-1.5 rounded-lg hover:bg-gray-700/30 text-gray-400 hover:text-white transition-colors"
          title="Step Backward (Left Arrow)"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={onPlayToggle}
          className="px-3.5 py-1.5 bg-[#2962FF] hover:bg-blue-600 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
          title={isPlaying ? "Pause Replay (Space)" : "Play Replay (Space)"}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
          <span>{isPlaying ? 'Pause' : 'Play'}</span>
        </button>

        <button
          onClick={onStepForward}
          className="p-1.5 rounded-lg hover:bg-gray-700/30 text-gray-400 hover:text-white transition-colors"
          title="Step Forward 1 Bar (Right Arrow)"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      <div className={`w-[1px] h-4 mx-0.5 ${isDarkTheme ? 'bg-[#2A2E39]' : 'bg-[#E0E3EB]'}`} />

      {/* Speed Dropdown */}
      <select
        value={speed}
        onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
        className={`bg-transparent text-xs font-mono font-bold rounded px-1.5 py-1 outline-none cursor-pointer ${
          isDarkTheme ? 'text-gray-300' : 'text-gray-700'
        }`}
        title="Replay Speed"
      >
        {speedOptions.map(opt => (
          <option key={opt.val} value={opt.val} className={isDarkTheme ? 'bg-[#1E222D]' : 'bg-white'}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Progress Slider */}
      <div className="hidden lg:flex items-center gap-2 px-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, candles.length - 1)}
          value={currentIndex}
          onChange={(e) => onSeek(parseInt(e.target.value))}
          className="w-24 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#2962FF]"
        />
        <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap">
          {currentIndex + 1}/{candles.length}
        </span>
      </div>

      {/* Live Floating P&L Pill */}
      <div className={`px-2 py-0.5 rounded text-[11px] font-mono font-black border flex items-center gap-1 ${
        currentFloatingPnl >= 0
          ? 'bg-[#089981]/15 text-[#089981] border-[#089981]/30'
          : 'bg-[#F23645]/15 text-[#F23645] border-[#F23645]/30'
      }`}>
        <span>{currentFloatingPnl >= 0 ? '+' : ''}${currentFloatingPnl.toFixed(2)}</span>
        <span className="text-[9px] opacity-75">({currentFloatingPips >= 0 ? '+' : ''}{currentFloatingPips}p)</span>
      </div>

      {/* Close Replay Button */}
      {onClose && (
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-0.5"
          title="Close Replay (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
