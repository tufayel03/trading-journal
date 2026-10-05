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
  TrendingDown
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
  chartEngine?: 'kline' | 'standard' | 'official_tv';
  onCycleEngine?: () => void;
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
  chartEngine = 'kline',
  onCycleEngine
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

        {/* Engine Switcher (KLine Pro Zero-Lag / Standard / Official TV) */}
        {onCycleEngine && (
          <button
            onClick={onCycleEngine}
            title="Switch Chart Engine (KLine Pro Canvas / Standard / Official TV)"
            className={`px-2 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
              chartEngine === 'kline'
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30'
                : chartEngine === 'official_tv'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600/30'
                : isDarkTheme
                ? 'bg-gray-800/80 text-gray-300 border-gray-700 hover:bg-gray-700'
                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                chartEngine === 'kline' ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'
              }`}
            />
            <span>
              {chartEngine === 'kline' ? 'KLine Pro' : chartEngine === 'official_tv' ? 'TradingView TV' : 'Standard'}
            </span>
          </button>
        )}

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
