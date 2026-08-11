import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { 
  X, 
  Maximize2, 
  Minimize2, 
  ChevronLeft, 
  ChevronRight, 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Sliders, 
  BookOpen, 
  AlertTriangle, 
  Flame, 
  Camera, 
  Star, 
  CheckSquare, 
  Info,
  Calendar,
  Layers,
  Sparkles,
  Zap,
  RefreshCw,
  Database,
  Sun,
  Moon
} from 'lucide-react';
import { Trade } from '../../types';
import { TradingViewReplayChart, Candle, TradingViewReplayChartRef, ChartTheme, getSymbolPrecision } from './TradingViewReplayChart';
import { ReplayControls } from './ReplayControls';
import { TradingViewGoToModal } from './TradingViewGoToModal';

interface Props {
  isOpen: boolean;
  trade: Trade | null;
  allTrades?: Trade[];
  onClose: () => void;
  onSelectTrade?: (trade: Trade) => void;
}

export const TradeReplayModal: React.FC<Props> = ({
  isOpen,
  trade,
  allTrades = [],
  onClose,
  onSelectTrade
}) => {
  if (!isOpen || !trade) return null;

  const [timeframe, setTimeframe] = useState<string>('5m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showRightDrawer, setShowRightDrawer] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingMT5, setIsSyncingMT5] = useState<boolean>(false);
  const [isGoToOpen, setIsGoToOpen] = useState<boolean>(false);
  const [theme, setTheme] = useState<ChartTheme>('light'); // Default to pristine TradingView White theme

  const precision = getSymbolPrecision(trade.symbol);

  const [hoveredCandle, setHoveredCandle] = useState<{
    time: string;
    open: string;
    high: string;
    low: string;
    close: string;
  } | null>(null);

  const chartRef = useRef<TradingViewReplayChartRef>(null);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeReplayTimestampRef = useRef<number | null>(null);
  const activeReplayPriceRef = useRef<number | null>(null);
  const prevTradeIdRef = useRef<string | number | null>(null);

  // Full 9 timeframe options: 1m, 5m, 15m, 30m, 1h, 4h, 1d, 1w, 1M
  const timeframes = [
    { label: '1m', value: '1m', sec: 60 },
    { label: '5m', value: '5m', sec: 300 },
    { label: '15m', value: '15m', sec: 900 },
    { label: '30m', value: '30m', sec: 1800 },
    { label: '1h', value: '1h', sec: 3600 },
    { label: '4h', value: '4h', sec: 14400 },
    { label: '1D', value: '1d', sec: 86400 },
    { label: '1W', value: '1w', sec: 604800 },
    { label: '1M', value: '1M', sec: 2592000 }
  ];

  // Find index of current trade in allTrades to allow Next/Previous navigation
  const currentTradeIndex = useMemo(() => {
    return allTrades.findIndex(t => t.id === trade.id || (t.ticket && t.ticket === trade.ticket));
  }, [allTrades, trade]);

  const prevTrade = currentTradeIndex > 0 ? allTrades[currentTradeIndex - 1] : null;
  const nextTrade = currentTradeIndex >= 0 && currentTradeIndex < allTrades.length - 1 ? allTrades[currentTradeIndex + 1] : null;

  // Keep active replay timestamp and price synced with current bar
  useEffect(() => {
    if (candles[currentIndex]) {
      activeReplayTimestampRef.current = candles[currentIndex].time;
      activeReplayPriceRef.current = candles[currentIndex].close;
    }
  }, [currentIndex, candles]);

  // Load candles function with seamless timestamp & exact price preservation across timeframes
  const loadCandles = (force: boolean = false) => {
    if (force) setIsSyncingMT5(true);
    else setIsLoading(true);
    setIsPlaying(false);

    const entrySec = Math.floor(new Date(trade.openTime).getTime() / 1000);
    const closeSec = trade.closeTime ? Math.floor(new Date(trade.closeTime).getTime() / 1000) : entrySec;

    const currentTradeId = trade.ticket || trade.id;
    const isSameTrade = prevTradeIdRef.current === currentTradeId;
    if (!isSameTrade) {
      activeReplayTimestampRef.current = null;
      activeReplayPriceRef.current = null;
    }
    prevTradeIdRef.current = currentTradeId;

    // Preserve exact replay timestamp when switching timeframes
    const targetTimestamp = (isSameTrade && activeReplayTimestampRef.current)
      ? activeReplayTimestampRef.current
      : entrySec;

    // Request rich historical database with full depth (50,000+ bars cached)
    const url = `/api/candles?symbol=${encodeURIComponent(trade.symbol)}&timeframe=${timeframe}&all=true&force=${force}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.candles && Array.isArray(data.candles) && data.candles.length > 0) {
          const sorted = [...data.candles].sort((a, b) => a.time - b.time);

          // If trade close time is newer than available candles, automatically fetch latest live bars from MT5
          if (!force && closeSec > 0 && sorted[sorted.length - 1]?.time < closeSec) {
            loadCandles(true);
            return;
          }

          // Find exact candle corresponding to targetTimestamp in the new timeframe
          let targetIndex = sorted.findIndex(c => c.time >= targetTimestamp);
          if (targetIndex === -1) {
            targetIndex = sorted.length - 1;
          } else if (targetIndex > 0 && sorted[targetIndex].time > targetTimestamp) {
            targetIndex = targetIndex - 1;
          }

          // If brand new trade modal opening, provide a slight pre-trade context lead-in
          if (!isSameTrade) {
            targetIndex = Math.max(0, targetIndex - 15);
          } else if (activeReplayPriceRef.current && sorted[targetIndex]) {
            // Dynamic intra-bar developing candle: sync forming candle's price to exact replay price
            const activePrice = activeReplayPriceRef.current;
            const currentBar = { ...sorted[targetIndex] };
            currentBar.close = activePrice;
            currentBar.high = Math.max(currentBar.high, activePrice);
            currentBar.low = Math.min(currentBar.low, activePrice);
            sorted[targetIndex] = currentBar;
          }

          setCandles(sorted);
          setCurrentIndex(Math.max(0, Math.min(sorted.length - 1, targetIndex)));
        } else {
          setCandles([]);
        }
        setIsLoading(false);
        setIsSyncingMT5(false);
      })
      .catch(() => {
        setIsLoading(false);
        setIsSyncingMT5(false);
      });
  };

  // On-demand backward history pagination (when user scrolls/pans back towards the past)
  const handleFetchOlderCandles = (oldestTimestamp: number) => {
    if (isSyncingMT5 || oldestTimestamp <= 0) return;
    setIsSyncingMT5(true);

    const url = `/api/candles?symbol=${encodeURIComponent(trade.symbol)}&timeframe=${timeframe}&to=${oldestTimestamp}&force=true`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.candles && Array.isArray(data.candles) && data.candles.length > 0) {
          setCandles(prev => {
            const map = new Map<number, Candle>();
            data.candles.forEach((c: Candle) => map.set(c.time, c));
            prev.forEach(c => map.set(c.time, c));

            const merged = Array.from(map.values()).sort((a, b) => a.time - b.time);
            const addedCount = merged.length - prev.length;
            if (addedCount > 0) {
              setCurrentIndex(idx => idx + addedCount);
            }
            return merged;
          });
        }
        setIsSyncingMT5(false);
      })
      .catch(() => {
        setIsSyncingMT5(false);
      });
  };

  // Fetch Candles on trade or timeframe change
  useEffect(() => {
    loadCandles(false);

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [trade, timeframe]);

  // Replay Playback Timer
  useEffect(() => {
    if (playTimerRef.current) {
      clearInterval(playTimerRef.current);
      playTimerRef.current = null;
    }

    if (isPlaying) {
      const intervalMs = Math.max(80, Math.floor(600 / speed));
      playTimerRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= candles.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, intervalMs);
    }

    return () => {
      if (playTimerRef.current) clearInterval(playTimerRef.current);
    };
  }, [isPlaying, speed, candles.length]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.altKey && (e.key === 'g' || e.key === 'G')) || (e.ctrlKey && (e.key === 'g' || e.key === 'G'))) {
        e.preventDefault();
        setIsGoToOpen(true);
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentIndex(prev => Math.min(candles.length - 1, prev + 1));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setIsPlaying(false);
        setCurrentIndex(prev => Math.max(0, prev - 1));
      } else if (e.key === '[') {
        e.preventDefault();
        handleJumpToEntry();
      } else if (e.key === ']') {
        e.preventDefault();
        handleJumpToExit();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [candles, trade]);

  const handleGoToTime = (targetSec: number) => {
    if (candles.length === 0) return;
    
    setIsPlaying(false);
    const earliest = candles[0].time;

    if (targetSec < earliest) {
      // Need to query deeper historical data from MT5
      setIsSyncingMT5(true);
      const url = `/api/candles?symbol=${encodeURIComponent(trade.symbol)}&timeframe=${timeframe}&to=${targetSec}&force=true`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.candles && Array.isArray(data.candles) && data.candles.length > 0) {
            const map = new Map<number, Candle>();
            data.candles.forEach((c: Candle) => map.set(c.time, c));
            candles.forEach(c => map.set(c.time, c));
            const merged = Array.from(map.values()).sort((a, b) => a.time - b.time);
            setCandles(merged);

            let targetIdx = merged.findIndex(c => c.time >= targetSec);
            if (targetIdx === -1) targetIdx = 0;
            setCurrentIndex(targetIdx);
          }
          setIsSyncingMT5(false);
        })
        .catch(() => setIsSyncingMT5(false));
    } else {
      let closestIdx = 0;
      let minDiff = Math.abs(candles[0].time - targetSec);
      for (let i = 0; i < candles.length; i++) {
        const diff = Math.abs(candles[i].time - targetSec);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }
      setCurrentIndex(closestIdx);
    }
  };

  const handleJumpToEntry = () => {
    const entrySec = Math.floor(new Date(trade.openTime).getTime() / 1000);
    const idx = candles.findIndex(c => c.time >= entrySec);
    if (idx >= 0) {
      setIsPlaying(false);
      setCurrentIndex(idx);
    }
  };

  const handleJumpToExit = () => {
    const exitSec = Math.floor(new Date(trade.closeTime).getTime() / 1000);
    const idx = candles.findIndex(c => c.time >= exitSec);
    if (idx >= 0) {
      setIsPlaying(false);
      setCurrentIndex(idx);
    }
  };

  const isBuy = trade.direction === 'BUY';
  const isWin = trade.netProfit > 0;
  const isCent = trade.isCent || trade.accountCurrency === 'USC';
  const displayProfit = isCent ? trade.netProfit * 100 : trade.netProfit;

  const content = (
    <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-full h-full bg-[#0B0F19] text-[#F9FAFB] flex flex-col overflow-hidden select-none z-[99999] font-sans">
      {/* TOP BAR: Header, Quotes, Timeframes, Indicators, Controls */}
      <header className="h-13 bg-[#111827] border-b border-[#1F2937] px-4 py-2 flex items-center justify-between gap-3 shrink-0 z-20">
        
        {/* Left: Back Button, Trade Symbol, Direction & Navigation */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B0F19] hover:bg-[#1F2937] text-gray-300 hover:text-white rounded-lg border border-[#1F2937] text-xs font-bold transition-all shadow-sm"
            title="Return to Journal"
          >
            <ChevronLeft className="w-4 h-4 text-emerald-400" />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2 border-l border-[#1F2937] pl-3">
            <span className="font-extrabold text-sm text-white tracking-wider font-mono flex items-center gap-1">
              {trade.symbol === 'XAUUSD' && <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />}
              {trade.symbol}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
              isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {trade.direction} {trade.lotSize}L
            </span>
            {trade.ticket && (
              <span className="text-[10px] text-gray-400 font-mono hidden md:inline">
                #{trade.ticket}
              </span>
            )}
          </div>

          {/* Previous / Next Trade Switcher */}
          {allTrades.length > 1 && onSelectTrade && (
            <div className="hidden sm:flex items-center gap-1 border-l border-[#1F2937] pl-3">
              <button
                onClick={() => prevTrade && onSelectTrade(prevTrade)}
                disabled={!prevTrade}
                title="Previous Trade"
                className="p-1 text-gray-400 hover:text-white disabled:opacity-20 hover:bg-[#1F2937] rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-gray-500 font-mono">
                {currentTradeIndex + 1}/{allTrades.length}
              </span>
              <button
                onClick={() => nextTrade && onSelectTrade(nextTrade)}
                disabled={!nextTrade}
                title="Next Trade"
                className="p-1 text-gray-400 hover:text-white disabled:opacity-20 hover:bg-[#1F2937] rounded transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Center: Live Hover Quote / Timeframe Selector */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Timeframe Selector Tabs (1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W, 1M) */}
          <div className="flex items-center bg-[#0B0F19] p-0.5 rounded-lg border border-[#1F2937]">
            {timeframes.map(tf => (
              <button
                key={tf.value}
                onClick={() => {
                  if (timeframe === tf.value) return;
                  if (candles[currentIndex]) {
                    activeReplayTimestampRef.current = candles[currentIndex].time;
                    activeReplayPriceRef.current = candles[currentIndex].close;
                  }
                  setTimeframe(tf.value);
                }}
                className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                  timeframe === tf.value
                    ? 'bg-emerald-500 text-black shadow-md font-mono'
                    : 'text-gray-400 hover:text-white hover:bg-[#1F2937] font-mono'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>

          {/* TradingView "Go to..." Button */}
          <button
            onClick={() => setIsGoToOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#0B0F19] hover:bg-[#1F2937] border border-[#1F2937] text-cyan-400 hover:text-cyan-300 text-xs font-bold transition-all"
            title="Go to Date & Time (Alt+G)"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Go to</span>
          </button>

          {/* Live Crosshair Quote readout with exact 5-digit precision */}
          {hoveredCandle && (
            <div className="hidden 2xl:flex items-center gap-2 text-[11px] font-mono bg-[#0B0F19] px-3 py-1 rounded border border-[#1F2937]">
              <span className="text-gray-400">{hoveredCandle.time}</span>
              <span className="text-gray-300">O: <strong className="text-white">{hoveredCandle.open}</strong></span>
              <span className="text-gray-300">H: <strong className="text-emerald-400">{hoveredCandle.high}</strong></span>
              <span className="text-gray-300">L: <strong className="text-rose-400">{hoveredCandle.low}</strong></span>
              <span className="text-gray-300">C: <strong className="text-cyan-400">{hoveredCandle.close}</strong></span>
            </div>
          )}
        </div>

        {/* Right: Theme Toggle, MT5 Status Badge, Drawer Toggle, Close */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Chart Theme Selector (TradingView Light vs Dark vs MT5 Classic) */}
          <div className="flex items-center bg-[#0B0F19] p-0.5 rounded-lg border border-[#1F2937]">
            <button
              onClick={() => setTheme('light')}
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                theme === 'light'
                  ? 'bg-white text-gray-900 shadow-md font-medium'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="TradingView Clean White (Default)"
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('mt5')}
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                theme === 'mt5'
                  ? 'bg-blue-600 text-white shadow-md font-medium'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="MT5 Classic Candlestick Theme (White Bull / Solid Black Bear)"
            >
              <span className="font-mono text-[10px] font-bold">MT5</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                theme === 'dark'
                  ? 'bg-[#1F2937] text-white shadow-md font-medium'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="TradingView Dark Slate"
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exness MT5 Real Data Feed Badge & Manual Refresh */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">Exness MT5 Real Feed</span>
            <button
              onClick={() => loadCandles(true)}
              disabled={isSyncingMT5 || isLoading}
              className="p-0.5 hover:text-white transition-colors disabled:opacity-40 ml-1"
              title="Re-sync authentic candles directly from Exness MT5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingMT5 ? 'animate-spin text-emerald-300' : ''}`} />
            </button>
          </div>

          {/* Toggle Trade Journal Details Panel */}
          <button
            onClick={() => setShowRightDrawer(!showRightDrawer)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showRightDrawer
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-[#0B0F19] border-[#1F2937] text-gray-400 hover:text-white'
            }`}
            title={showRightDrawer ? "Hide Trade Details" : "Show Trade Details"}
          >
            <BookOpen className="w-4 h-4" />
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-1"
            title="Close Replay (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

        </div>

      </header>

      {/* MAIN BODY: Chart Canvas + Right Drawer */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
          
          {/* Replay Chart Container */}
          <div className="flex-1 min-h-0 flex flex-col h-full overflow-hidden relative">
            
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 bg-white dark:bg-[#0B0F19]">
                <Zap className="w-8 h-8 text-emerald-500 animate-spin" />
                <span className="text-xs font-bold font-mono text-gray-700 dark:text-gray-300">Loading Historical Broker Candles for {trade.symbol}...</span>
              </div>
            ) : candles.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400 bg-white dark:bg-[#0B0F19]">
                <AlertTriangle className="w-8 h-8 text-amber-500" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">No historical candle data available for this timeframe</span>
              </div>
            ) : (
              <div className="flex-1 min-h-0 w-full relative">
                <TradingViewReplayChart
                  ref={chartRef}
                  candles={candles}
                  visibleCount={currentIndex + 1}
                  trade={trade}
                  theme={theme}
                  onCrosshairMove={setHoveredCandle}
                  onScrollNearStart={handleFetchOlderCandles}
                  onOpenGoTo={() => setIsGoToOpen(true)}
                />
              </div>
            )}

            {/* TradingView "Go to" Modal */}
            <TradingViewGoToModal
              isOpen={isGoToOpen}
              onClose={() => setIsGoToOpen(false)}
              onGoTo={handleGoToTime}
              initialTimestamp={candles[currentIndex]?.time}
              isDarkTheme={theme === 'dark'}
            />

            {/* Bottom Replay Control Toolbar */}
            {candles.length > 0 && (
              <ReplayControls
                candles={candles}
                currentIndex={currentIndex}
                isPlaying={isPlaying}
                speed={speed}
                trade={trade}
                onPlayToggle={() => setIsPlaying(p => !p)}
                onStepForward={() => {
                  setIsPlaying(false);
                  setCurrentIndex(prev => Math.min(candles.length - 1, prev + 1));
                }}
                onStepBackward={() => {
                  setIsPlaying(false);
                  setCurrentIndex(prev => Math.max(0, prev - 1));
                }}
                onJumpToEntry={handleJumpToEntry}
                onJumpToExit={handleJumpToExit}
                onReset={() => {
                  setIsPlaying(false);
                  const entrySec = Math.floor(new Date(trade.openTime).getTime() / 1000);
                  const entryIdx = candles.findIndex(c => c.time >= entrySec);
                  setCurrentIndex(Math.max(0, entryIdx - 25));
                }}
                onSpeedChange={setSpeed}
                onSeek={(index) => {
                  setIsPlaying(false);
                  setCurrentIndex(index);
                }}
              />
            )}

          </div>

          {/* RIGHT DRAWER: Trade Details & Journal Notes (TradeZella Style) */}
          {showRightDrawer && (
            <aside className="w-80 lg:w-96 bg-[#111827] border-l border-[#1F2937] flex flex-col overflow-y-auto p-4 space-y-4 shrink-0 transition-all">
              
              {/* Outcome Header Box */}
              <div className={`p-4 rounded-xl border ${
                isWin 
                  ? 'bg-emerald-500/10 border-emerald-500/30' 
                  : trade.netProfit < 0 
                  ? 'bg-rose-500/10 border-rose-500/30' 
                  : 'bg-gray-800/50 border-gray-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Final Outcome</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded ${
                    isWin ? 'bg-emerald-500 text-black' : trade.netProfit < 0 ? 'bg-rose-500 text-white' : 'bg-gray-700 text-gray-300'
                  }`}>
                    {isWin ? 'WIN' : trade.netProfit < 0 ? 'LOSS' : 'BREAK EVEN'}
                  </span>
                </div>
                
                <div className="flex items-baseline justify-between">
                  <div className={`text-2xl font-black font-mono ${
                    isWin ? 'text-emerald-400' : trade.netProfit < 0 ? 'text-rose-400' : 'text-gray-300'
                  }`}>
                    {isWin ? '+' : ''}
                    {isCent ? `${displayProfit.toFixed(2)} USC` : `$${displayProfit.toFixed(2)}`}
                  </div>
                  <div className="text-xs font-mono font-bold text-gray-300">
                    {trade.pips >= 0 ? '+' : ''}{trade.pips} Pips
                  </div>
                </div>

                {trade.rMultiple !== undefined && (
                  <div className="text-xs font-bold text-amber-400 mt-1 font-mono">
                    R-Multiple: {trade.rMultiple >= 0 ? '+' : ''}{trade.rMultiple}R
                  </div>
                )}
              </div>

              {/* Execution Details Grid */}
              <div className="bg-[#0B0F19] rounded-xl border border-[#1F2937] p-3 space-y-2.5 text-xs font-mono">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider pb-1 border-b border-[#1F2937]">
                  Execution Prices
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Entry Price:</span>
                  <span className="font-bold text-cyan-400">{trade.openPrice.toFixed(precision)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Exit Price:</span>
                  <span className="font-bold text-white">{trade.closePrice.toFixed(precision)}</span>
                </div>

                {trade.stopLoss && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stop Loss:</span>
                    <span className="font-bold text-rose-400">{trade.stopLoss.toFixed(precision)}</span>
                  </div>
                )}

                {trade.takeProfit && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Take Profit:</span>
                    <span className="font-bold text-emerald-400">{trade.takeProfit.toFixed(precision)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-[#1F2937] pt-2 text-[11px]">
                  <span className="text-gray-500">Session:</span>
                  <span className="text-amber-400 font-semibold">{trade.session}</span>
                </div>
              </div>

              {/* Strategy & Confluences */}
              <div className="bg-[#0B0F19] rounded-xl border border-[#1F2937] p-3 space-y-2">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  Setup & Strategy
                </div>
                <div className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                  {trade.strategy || 'HyperTrade Execution'}
                </div>

                {trade.confluences && trade.confluences.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Confluences</span>
                    <div className="flex flex-wrap gap-1">
                      {trade.confluences.map(c => (
                        <span key={c} className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px] flex items-center gap-1 border border-gray-700">
                          <CheckSquare className="w-2.5 h-2.5 text-emerald-400" />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Mistakes & Psychology */}
              {(trade.mistakes && trade.mistakes.length > 0) && (
                <div className="bg-[#0B0F19] rounded-xl border border-rose-500/30 p-3 space-y-2 bg-rose-950/10">
                  <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Mistakes Made
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {trade.mistakes.map(m => (
                      <span key={m} className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Journal Notes */}
              {trade.notes && (
                <div className="bg-[#0B0F19] rounded-xl border border-[#1F2937] p-3 space-y-1.5">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                    Trade Journal Notes
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {trade.notes}
                  </p>
                </div>
              )}

              {/* Screenshots preview */}
              {(trade.beforeChartUrl || trade.afterChartUrl) && (
                <div className="space-y-2 pt-2">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Camera className="w-3 h-3 text-amber-400" />
                    Saved Trade Screenshots
                  </div>
                  {trade.beforeChartUrl && (
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-1">Entry Chart:</span>
                      <img src={trade.beforeChartUrl} alt="Before" className="w-full rounded-lg border border-[#1F2937] object-cover max-h-36" />
                    </div>
                  )}
                  {trade.afterChartUrl && (
                    <div>
                      <span className="text-[9px] text-gray-500 block mb-1">Outcome Chart:</span>
                      <img src={trade.afterChartUrl} alt="After" className="w-full rounded-lg border border-[#1F2937] object-cover max-h-36" />
                    </div>
                  )}
                </div>
              )}

            </aside>
          )}

        </div>

    </div>
  );

  return ReactDOM.createPortal(content, document.body);
};
