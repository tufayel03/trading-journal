import React from 'react';
import {
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  X,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  SkipBack,
  SkipForward
} from 'lucide-react';
import { Trade } from '../../types';

interface Props {
  trade: Trade;
  timeframe?: string;
  onTimeframeChange?: (tf: string) => void;
  isDarkTheme: boolean;
  onThemeToggle: () => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onOpenGoTo?: () => void;
  onClose: () => void;
  allTrades?: Trade[];
  currentTradeIndex?: number;
  onSelectTrade?: (trade: Trade) => void;
  onRefreshCandles?: () => void;
  isSyncingCandles?: boolean;
  // Replay playback controls for top bar
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  onStepForward?: () => void;
  onStepBackward?: () => void;
  onJumpToEntry?: () => void;
  onJumpToExit?: () => void;
}

export const TradingViewTopBar: React.FC<Props> = ({
  trade,
  isDarkTheme,
  onThemeToggle,
  isFullscreen,
  onFullscreenToggle,
  onClose,
  allTrades = [],
  currentTradeIndex = 0,
  onSelectTrade,
  onRefreshCandles,
  isSyncingCandles = false,
  isPlaying = false,
  onPlayToggle,
  onStepForward,
  onStepBackward,
  onJumpToEntry,
  onJumpToExit
}) => {
  const isCent = trade.isCent || trade.accountCurrency === 'USC';
  const profitVal = isCent ? trade.netProfit * 100 : trade.netProfit;
  const isWin = profitVal > 0;
  const isBuy = trade.direction === 'BUY';

  const prevTrade = currentTradeIndex > 0 ? allTrades[currentTradeIndex - 1] : null;
  const nextTrade = currentTradeIndex >= 0 && currentTradeIndex < allTrades.length - 1 ? allTrades[currentTradeIndex + 1] : null;

  return (
    <header
      className={`h-10 px-3 border-b flex items-center justify-between text-xs font-sans select-none z-30 shrink-0 ${
        isDarkTheme
          ? 'bg-[#131722] border-[#2A2E39] text-[#D1D4DC]'
          : 'bg-[#FFFFFF] border-[#E0E3EB] text-[#131722]'
      }`}
    >
      {/* LEFT SECTION: Trade Info Badge, Engine Switcher, MT5 Refresh */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        
        {/* Trade Identity Badge */}
        <div className="flex items-center gap-1.5 font-mono">
          <span
            className={`px-1.5 py-0.5 rounded text-[11px] font-black uppercase flex items-center gap-1 ${
              isBuy
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}
          >
            {isBuy ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trade.direction}
          </span>

          <span className="font-bold text-sm tracking-wide text-white">
            {trade.symbol}
          </span>

          {trade.lot && (
            <span className="text-[11px] text-gray-400 font-medium">
              {trade.lot} lot
            </span>
          )}

          {/* Trade Net Profit */}
          <span
            className={`px-2 py-0.5 rounded font-black text-xs ${
              isWin
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-rose-500/15 text-rose-400'
            }`}
          >
            {isWin ? '+' : ''}
            {isCent ? `${profitVal.toFixed(2)} USC` : `$${profitVal.toFixed(2)}`}
          </span>

          {/* Price Range */}
          <span className="hidden lg:inline text-[11px] text-gray-400 font-sans ml-1">
            {trade.openPrice} → {trade.closePrice || 'Open'}
          </span>
        </div>

        <div className={`w-[1px] h-4 mx-1 ${isDarkTheme ? 'bg-[#2A2E39]' : 'bg-[#E0E3EB]'}`} />

        {/* Refresh / Sync MT5 Candles */}
        {onRefreshCandles && (
          <button
            onClick={onRefreshCandles}
            disabled={isSyncingCandles}
            title="Fetch Fresh Candles from MT5"
            className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              isDarkTheme
                ? 'hover:bg-[#1E222D] text-gray-400 hover:text-white'
                : 'hover:bg-[#F0F3FA] text-gray-600 hover:text-black'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCandles ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden md:inline">Sync MT5</span>
          </button>
        )}

        {/* Replay Controls in Top Bar */}
        {onPlayToggle && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#1E222D]/90 border border-[#2A2E39] shadow-sm">
            {onJumpToEntry && (
              <button
                type="button"
                onClick={onJumpToEntry}
                className="px-1.5 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold font-mono transition-colors"
                title="Jump to Trade Entry Point"
              >
                Entry
              </button>
            )}
            {onJumpToExit && (
              <button
                type="button"
                onClick={onJumpToExit}
                className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold font-mono transition-colors"
                title="Jump to Trade Exit Point"
              >
                Exit
              </button>
            )}
            <div className="w-[1px] h-3 mx-0.5 bg-[#2A2E39]" />
            {onStepBackward && (
              <button
                type="button"
                onClick={onStepBackward}
                className="p-1 rounded hover:bg-[#2A2E39] text-gray-400 hover:text-white transition-colors"
                title="Step Backward"
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onPlayToggle}
              className="px-2.5 py-0.5 bg-[#2962FF] hover:bg-blue-600 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-sm transition-all active:scale-95"
              title={isPlaying ? "Pause Replay" : "Play Replay"}
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            {onStepForward && (
              <button
                type="button"
                onClick={onStepForward}
                className="p-1 rounded hover:bg-[#2A2E39] text-gray-400 hover:text-white transition-colors"
                title="Step Forward"
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

      </div>

      {/* RIGHT SECTION: Trade Navigation, Theme, Fullscreen, Close */}
      <div className="flex items-center gap-1.5 shrink-0">
        
        {/* Trade Navigation (< 1 / 276 >) */}
        {allTrades.length > 1 && onSelectTrade && (
          <div className="flex items-center gap-0.5 px-1 py-0.5 rounded border border-inherit bg-black/10">
            <button
              onClick={() => prevTrade && onSelectTrade(prevTrade)}
              disabled={!prevTrade}
              className="p-1 rounded hover:bg-gray-700/30 text-gray-400 hover:text-white disabled:opacity-20"
              title="Previous Trade"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-gray-300 px-1 font-bold">
              {currentTradeIndex + 1} / {allTrades.length}
            </span>
            <button
              onClick={() => nextTrade && onSelectTrade(nextTrade)}
              disabled={!nextTrade}
              className="p-1 rounded hover:bg-gray-700/30 text-gray-400 hover:text-white disabled:opacity-20"
              title="Next Trade"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Theme Switcher Button */}
        <button
          onClick={onThemeToggle}
          className={`p-1.5 rounded transition-colors ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-gray-400 hover:text-amber-400' : 'hover:bg-[#F0F3FA] text-gray-600 hover:text-blue-500'
          }`}
          title={isDarkTheme ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDarkTheme ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onFullscreenToggle}
          className={`p-1.5 rounded transition-colors ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-gray-400 hover:text-white' : 'hover:bg-[#F0F3FA] text-gray-600'
          }`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Close Replay Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/15 rounded transition-colors ml-0.5"
          title="Close Replay (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

      </div>
    </header>
  );
};
