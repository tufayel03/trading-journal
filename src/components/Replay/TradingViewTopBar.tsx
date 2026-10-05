import React, { useState } from 'react';
import {
  Search,
  Plus,
  BarChart2,
  Bell,
  RotateCcw,
  Undo2,
  Redo2,
  Cloud,
  Settings,
  Maximize2,
  Minimize2,
  Camera,
  Sun,
  Moon,
  X,
  ChevronDown,
  Activity,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Trade } from '../../types';

interface Props {
  trade: Trade;
  timeframe: string;
  onTimeframeChange: (tf: string) => void;
  isDarkTheme: boolean;
  onThemeToggle: () => void;
  isFullscreen: boolean;
  onFullscreenToggle: () => void;
  onOpenGoTo: () => void;
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
  timeframe,
  onTimeframeChange,
  isDarkTheme,
  onThemeToggle,
  isFullscreen,
  onFullscreenToggle,
  onOpenGoTo,
  onClose,
  allTrades = [],
  currentTradeIndex = 0,
  onSelectTrade,
  onRefreshCandles,
  isSyncingCandles = false,
  chartEngine = 'kline',
  onCycleEngine
}) => {
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [chartStyle, setChartStyle] = useState<'candles' | 'bars' | 'line'>('candles');

  const timeframes = [
    { label: '1m', value: '1m' },
    { label: '5m', value: '5m' },
    { label: '15m', value: '15m' },
    { label: '30m', value: '30m' },
    { label: '1h', value: '1h' },
    { label: '4h', value: '4h' },
    { label: 'D', value: '1d' },
    { label: 'W', value: '1w' },
    { label: 'M', value: '1M' }
  ];

  const prevTrade = currentTradeIndex > 0 ? allTrades[currentTradeIndex - 1] : null;
  const nextTrade = currentTradeIndex >= 0 && currentTradeIndex < allTrades.length - 1 ? allTrades[currentTradeIndex + 1] : null;

  return (
    <header
      className={`h-11 px-3 border-b flex items-center justify-between text-xs font-sans select-none z-30 shrink-0 ${
        isDarkTheme
          ? 'bg-[#131722] border-[#2A2E39] text-[#D1D4DC]'
          : 'bg-[#FFFFFF] border-[#E0E3EB] text-[#131722]'
      }`}
    >
      {/* LEFT SECTION: Avatar, Symbol Search, Compare, Timeframes, Chart Style, Indicators, Replay, Undo/Redo */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        
        {/* User Profile Avatar */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center text-[11px] font-black text-white shadow-sm shrink-0 cursor-pointer hover:opacity-90">
          T
        </div>

        {/* Symbol Search Button (Authentic TradingView NAS100USD / XAUUSD Pill) */}
        <button
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors font-bold font-mono text-xs ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-white' : 'hover:bg-[#F0F3FA] text-[#131722]'
          }`}
          title="Symbol Search"
        >
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-extrabold">{trade.symbol}</span>
          <span className="text-[10px] text-gray-500 font-normal hidden md:inline">
            {trade.accountServer?.includes('Exness') ? 'EXNESS' : 'MT5'}
          </span>
        </button>

        {/* Compare (+) Button */}
        <button
          className={`p-1.5 rounded-md transition-colors ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-gray-400 hover:text-white' : 'hover:bg-[#F0F3FA] text-gray-600'
          }`}
          title="Compare or Add Symbol"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className={`w-[1px] h-4 mx-1 ${isDarkTheme ? 'bg-[#2A2E39]' : 'bg-[#E0E3EB]'}`} />

        {/* Timeframe Selector (1m, 5m, 15m, 30m, 1h, 4h, D, W, M) */}
        <div className="flex items-center gap-0.5">
          {timeframes.map(tf => {
            const isActive = timeframe === tf.value;
            return (
              <button
                key={tf.value}
                onClick={() => onTimeframeChange(tf.value)}
                className={`px-1.5 py-1 rounded-md font-mono text-xs font-bold transition-all ${
                  isActive
                    ? 'text-[#2962FF] font-black bg-blue-500/10'
                    : isDarkTheme
                    ? 'hover:bg-[#1E222D] text-gray-400 hover:text-white'
                    : 'hover:bg-[#F0F3FA] text-gray-600 hover:text-black'
                }`}
              >
                {tf.label}
              </button>
            );
          })}
          <button
            className={`p-1 rounded transition-colors ${
              isDarkTheme ? 'hover:bg-[#1E222D] text-gray-400' : 'hover:bg-[#F0F3FA] text-gray-600'
            }`}
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        <div className={`w-[1px] h-4 mx-1 ${isDarkTheme ? 'bg-[#2A2E39]' : 'bg-[#E0E3EB]'}`} />

        {/* Chart Style (Candles icon) */}
        <button
          className={`flex items-center gap-1 px-1.5 py-1 rounded-md transition-colors ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-gray-400 hover:text-white' : 'hover:bg-[#F0F3FA] text-gray-600'
          }`}
          title="Candles"
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>

        {/* Indicators Button (fx Indicators) */}
        <button
          onClick={() => setShowIndicatorsModal(!showIndicatorsModal)}
          className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors font-medium ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-gray-300 hover:text-white' : 'hover:bg-[#F0F3FA] text-gray-700'
          }`}
          title="Indicators, Metrics & Strategies"
        >
          <span className="font-serif italic font-bold text-xs text-blue-400">fx</span>
          <span className="hidden lg:inline text-xs">Indicators</span>
        </button>

        {/* Alert Button */}
        <button
          className={`hidden xl:flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-gray-400 hover:text-white' : 'hover:bg-[#F0F3FA] text-gray-600'
          }`}
          title="Create Alert (Alt+A)"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="text-xs">Alert</span>
        </button>

        {/* Replay Button (TradingView Replay Mode highlighted) */}
        <button
          className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#2962FF]/15 text-[#2962FF] border border-[#2962FF]/30 font-bold text-xs transition-colors"
          title="Bar Replay Active"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Replay</span>
        </button>

        {/* Engine Switcher (KLine Pro Zero-Lag Canvas / Standard / Official TV) */}
        {onCycleEngine && (
          <button
            onClick={onCycleEngine}
            title="Switch Chart Engine (KLineChart Pro Zero-Lag Canvas / Standard / Official TV)"
            className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 transition-all border ${
              chartEngine === 'kline'
                ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-600/30'
                : chartEngine === 'official_tv'
                ? 'bg-blue-600/20 text-blue-400 border-blue-500/40 hover:bg-blue-600/30'
                : isDarkTheme ? 'bg-gray-800/80 text-gray-300 border-gray-700 hover:bg-gray-700' : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              chartEngine === 'kline' ? 'bg-emerald-400 animate-pulse' : chartEngine === 'official_tv' ? 'bg-blue-400' : 'bg-gray-400'
            }`} />
            <span>
              {chartEngine === 'kline' ? 'KLine Pro (Zero-Lag)' : chartEngine === 'official_tv' ? 'Official TradingView' : 'Standard Chart'}
            </span>
          </button>
        )}

        {/* Undo / Redo */}
        <div className="hidden 2xl:flex items-center gap-0.5 ml-1">
          <button
            className={`p-1 rounded hover:bg-gray-700/30 text-gray-400 hover:text-white transition-colors`}
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            className={`p-1 rounded hover:bg-gray-700/30 text-gray-400 hover:text-white transition-colors`}
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* RIGHT SECTION: Layout Save, Settings, Fullscreen, Screenshot, Theme, Close */}
      <div className="flex items-center gap-1.5 shrink-0">
        
        {/* Trade Navigation (< 1 / 276 >) */}
        {allTrades.length > 1 && onSelectTrade && (
          <div className="hidden sm:flex items-center gap-0.5 px-1 py-0.5 rounded border border-inherit">
            <button
              onClick={() => prevTrade && onSelectTrade(prevTrade)}
              disabled={!prevTrade}
              className="p-1 rounded hover:bg-gray-700/30 text-gray-400 hover:text-white disabled:opacity-20"
              title="Previous Trade"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono text-gray-400 px-1">
              {currentTradeIndex + 1}/{allTrades.length}
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

        {/* Layout Save Name */}
        <div className="hidden md:flex items-center gap-1 px-2 py-1 rounded text-gray-400 hover:text-white cursor-pointer">
          <Cloud className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px] font-medium">Unnamed</span>
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </div>

        {/* Chart Settings Gear */}
        <button
          className={`p-1.5 rounded-md transition-colors ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-gray-400 hover:text-white' : 'hover:bg-[#F0F3FA] text-gray-600'
          }`}
          title="Chart Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={onFullscreenToggle}
          className={`p-1.5 rounded-md transition-colors ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-gray-400 hover:text-white' : 'hover:bg-[#F0F3FA] text-gray-600'
          }`}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Mode"}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>

        {/* Camera Screenshot Button */}
        <button
          className={`p-1.5 rounded-md transition-colors ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-gray-400 hover:text-white' : 'hover:bg-[#F0F3FA] text-gray-600'
          }`}
          title="Take a snapshot"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Theme Switcher Button */}
        <button
          onClick={onThemeToggle}
          className={`p-1.5 rounded-md transition-colors ${
            isDarkTheme ? 'hover:bg-[#1E222D] text-gray-400 hover:text-amber-400' : 'hover:bg-[#F0F3FA] text-gray-600 hover:text-blue-500'
          }`}
          title={isDarkTheme ? "Switch to TradingView Light" : "Switch to TradingView Dark"}
        >
          {isDarkTheme ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
        </button>

        {/* Blue Trade Button (TradingView Style) */}
        <button
          className="hidden sm:flex items-center gap-1 px-3 py-1 bg-[#2962FF] hover:bg-blue-600 text-white font-bold text-xs rounded-md shadow-sm transition-all"
          title="Live Account Connected"
        >
          <span>Trade</span>
        </button>

        {/* Return / Close Replay Button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-2.5 py-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors ml-1"
          title="Close Replay (Esc)"
        >
          <X className="w-4 h-4" />
        </button>

      </div>
    </header>
  );
};
