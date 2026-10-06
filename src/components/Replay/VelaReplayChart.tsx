import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Scissors,
  Code,
  Sparkles,
  Check,
  ChevronDown,
  X
} from 'lucide-react';
import { VelaWorkspace } from '@luxalgo/vela/workspace';
import { PineEngine } from '@luxalgo/vela-pinets';
import { Trade } from '../../types';
import { getSymbolPrecision, Candle } from './TradingViewReplayChart';
import htfCandleCode from '../../htf candle pine sript.pine?raw';

interface Props {
  trade: Trade;
  candles?: Candle[];
  timeframe?: string;
  theme?: 'dark' | 'light';
  currentIndex?: number;
  onTimeframeChange?: (tf: string) => void;
  // Replay playback controls
  isPlaying?: boolean;
  speed?: number;
  onPlayToggle?: () => void;
  onStepForward?: () => void;
  onStepBackward?: () => void;
  onJumpToEntry?: () => void;
  onJumpToExit?: () => void;
  onReset?: () => void;
  onSpeedChange?: (speed: number) => void;
  onSeek?: (index: number) => void;
}

// Preset Pine Scripts for one-click testing & analysis
const PINE_SCRIPT_PRESETS = [
  {
    name: 'EMA Ribbon (20 & 50)',
    desc: 'Dual EMA trend indicator with shaded cloud',
    code: `//@version=5
indicator("EMA Ribbon", overlay=true)
fastLen = input.int(20, "Fast Length")
slowLen = input.int(50, "Slow Length")
fastEMA = ta.ema(close, fastLen)
slowEMA = ta.ema(close, slowLen)
p1 = plot(fastEMA, "Fast EMA", color=#00e676, linewidth=2)
p2 = plot(slowEMA, "Slow EMA", color=#ff5252, linewidth=2)
fill(p1, p2, color=fastEMA > slowEMA ? color.new(#00e676, 85) : color.new(#ff5252, 85), title="Trend Cloud")`
  },
  {
    name: 'SuperTrend',
    desc: 'ATR-based volatility trend breakout tracker',
    code: `//@version=5
indicator("Supertrend", overlay=true)
atrPeriod = input.int(10, "ATR Length")
factor = input.float(3.0, "Factor")
[supertrend, direction] = ta.supertrend(factor, atrPeriod)
plot(direction < 0 ? supertrend : na, "Up Trend", color=#00e676, style=plot.style_linebr, linewidth=2)
plot(direction > 0 ? supertrend : na, "Down Trend", color=#ff5252, style=plot.style_linebr, linewidth=2)`
  },
  {
    name: 'Relative Strength Index (RSI)',
    desc: 'Momentum oscillator with 70/30 bounds',
    code: `//@version=5
indicator("RSI Oscillator", overlay=false)
len = input.int(14, "RSI Length")
rsi = ta.rsi(close, len)
plot(rsi, "RSI", color=#8b5cf6, linewidth=2)
h1 = hline(70, "Overbought", color=#ef4444, linestyle=hline.style_dashed)
h2 = hline(30, "Oversold", color=#22c55e, linestyle=hline.style_dashed)
fill(h1, h2, color=color.new(#8b5cf6, 90))`
  },
  {
    name: 'Fair Value Gap (FVG)',
    desc: 'ICT smart money concept imbalance signals',
    code: `//@version=5
indicator("Fair Value Gap (FVG)", overlay=true)
bullishFVG = low > high[2]
bearishFVG = high < low[2]
plotshape(bullishFVG, "Bullish FVG", shape.triangleup, location.belowbar, color=#00e676, size=size.tiny)
plotshape(bearishFVG, "Bearish FVG", shape.triangledown, location.abovebar, color=#ff5252, size=size.tiny)`
  },
  {
    name: 'Multi HTF Candle Overlay',
    desc: 'Daily, Weekly, Monthly candle projections with 50% midpoint',
    code: htfCandleCode
  }
];

export const VelaReplayChart: React.FC<Props> = ({
  trade,
  candles = [],
  timeframe = '5m',
  theme = 'dark',
  currentIndex,
  onTimeframeChange,
  isPlaying = false,
  speed = 1,
  onPlayToggle,
  onStepForward,
  onStepBackward,
  onJumpToEntry,
  onJumpToExit,
  onReset,
  onSpeedChange,
  onSeek
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<VelaWorkspace | null>(null);
  const [isPineEditorOpen, setIsPineEditorOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [customPineCode, setCustomPineCode] = useState(PINE_SCRIPT_PRESETS[0].code);
  const [pineStatusMessage, setPineStatusMessage] = useState<string | null>(null);
  const [isExecutingPine, setIsExecutingPine] = useState(false);

  const cleanSymbol = trade.symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const precision = getSymbolPrecision(cleanSymbol);

  // Map timeframe to Vela standard timeframe string
  const velaTimeframe = useMemo(() => {
    const raw = String(timeframe || '5m').toLowerCase();
    if (raw === '1m') return '1';
    if (raw === '5m') return '5';
    if (raw === '15m') return '15';
    if (raw === '30m') return '30';
    if (raw === '1h') return '60';
    if (raw === '4h') return '240';
    if (raw === '1d') return 'D';
    if (raw === '1w') return 'W';
    if (raw === '1m' || raw === '1mn') return 'M';
    return '5';
  }, [timeframe]);

  // Convert candles to Vela OHLCV format (epoch ms)
  const ohlcvBars = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const limit = currentIndex !== undefined && currentIndex >= 0 ? currentIndex + 1 : candles.length;
    const subset = candles.slice(0, limit);
    return subset.map(c => ({
      time: c.time * 1000,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume || c.tick_volume || 0)
    })).sort((a, b) => a.time - b.time);
  }, [candles, currentIndex]);

  // Initialize Vela Workspace
  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    // Clear previous elements
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
    workspaceRef.current = null;

    const chartMount = document.createElement('div');
    chartMount.style.width = '100%';
    chartMount.style.height = '100%';
    parent.appendChild(chartMount);

    try {
      // In-memory candle cache for provider to prevent redundant network fetches
      const providerCache = new Map<string, any[]>();

      // Create custom MT5 broker data provider
      const mt5Provider = {
        info: () => ({
          name: 'mt5',
          displayName: 'MT5 Broker Feed',
          requiresApiKey: false,
          supportedTimeframes: ['1', '5', '15', '30', '60', '240', 'D', 'W', 'M'],
          capabilities: { enumerate: true, stream: true, symbolInfo: true }
        }),
        getBars: async (ticker: string, tf: string, range: any) => {
          const tfNorm = String(tf || '').toUpperCase();
          let reqTf = '5m';
          if (tfNorm === '1' || (tfNorm === '1M' && tf === '1m')) reqTf = '1m';
          else if (tfNorm === '5' || tfNorm === '5M') reqTf = '5m';
          else if (tfNorm === '15' || tfNorm === '15M') reqTf = '15m';
          else if (tfNorm === '30' || tfNorm === '30M') reqTf = '30m';
          else if (tfNorm === '60' || tfNorm === '1H') reqTf = '1h';
          else if (tfNorm === '240' || tfNorm === '4H') reqTf = '4h';
          else if (tfNorm === 'D' || tfNorm === '1D') reqTf = '1d';
          else if (tfNorm === 'W' || tfNorm === '1W') reqTf = '1w';
          else if (tfNorm === 'M' || tfNorm === '1MN' || (tfNorm === '1M' && tf !== '1m')) reqTf = '1mn';

          const sym = ticker.replace(/^mt5:/i, '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || cleanSymbol;
          const cacheKey = `${sym}_${reqTf}`;
          if (providerCache.has(cacheKey)) {
            return providerCache.get(cacheKey)!;
          }

          try {
            const res = await fetch(`/api/candles?symbol=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(reqTf)}&all=true`);
            if (res.ok) {
              const json = await res.json();
              if (json.candles && Array.isArray(json.candles) && json.candles.length > 0) {
                const bars = json.candles.map((c: any) => ({
                  time: c.time * 1000,
                  open: Number(c.open),
                  high: Number(c.high),
                  low: Number(c.low),
                  close: Number(c.close),
                  volume: Number(c.volume || c.tick_volume || 0)
                })).sort((a: any, b: any) => a.time - b.time);

                // Synthesize developing in-progress candle if chart candles are newer than the HTF series
                if (ohlcvBars && ohlcvBars.length > 0) {
                  const latestBar = ohlcvBars[ohlcvBars.length - 1];
                  const latestTime = latestBar.time;

                  let periodStart = 0;
                  if (reqTf === '1d') {
                    const d = new Date(latestTime);
                    d.setUTCHours(0, 0, 0, 0);
                    periodStart = d.getTime();
                  } else if (reqTf === '1w') {
                    const d = new Date(latestTime);
                    const day = d.getUTCDay();
                    const diff = d.getUTCDate() - day + (day === 0 ? -6 : 1);
                    d.setUTCDate(diff);
                    d.setUTCHours(0, 0, 0, 0);
                    periodStart = d.getTime();
                  } else if (reqTf === '1mn') {
                    const d = new Date(latestTime);
                    d.setUTCDate(1);
                    d.setUTCHours(0, 0, 0, 0);
                    periodStart = d.getTime();
                  }

                  if (periodStart > 0) {
                    const currentPeriodBars = ohlcvBars.filter(b => b.time >= periodStart);
                    if (currentPeriodBars.length > 0) {
                      const open = currentPeriodBars[0].open;
                      const close = currentPeriodBars[currentPeriodBars.length - 1].close;
                      let high = -Infinity;
                      let low = Infinity;
                      let volume = 0;
                      for (const b of currentPeriodBars) {
                        if (b.high > high) high = b.high;
                        if (b.low < low) low = b.low;
                        volume += (b.volume || 0);
                      }
                      const inProgressCandle = { time: periodStart, open, high, low, close, volume };
                      if (bars.length === 0 || bars[bars.length - 1].time < periodStart) {
                        bars.push(inProgressCandle);
                      } else if (bars[bars.length - 1].time === periodStart) {
                        bars[bars.length - 1] = inProgressCandle;
                      }
                    }
                  }
                }

                providerCache.set(cacheKey, bars);
                return bars;
              }
            }
          } catch (err) {
            console.warn('[Vela] Failed to fetch MT5 candles:', err);
          }

          providerCache.set(cacheKey, ohlcvBars);
          return ohlcvBars;
        },
        subscribe: () => () => {},
        listSymbols: async () => [{
          ticker: cleanSymbol,
          description: `${cleanSymbol} (MT5 Broker)`,
          type: 'forex',
          default: true
        }],
        getSymbolInfo: async (ticker: string) => ({
          ticker: cleanSymbol,
          description: `${cleanSymbol} (MT5 Broker)`,
          type: 'forex',
          pricescale: Math.pow(10, precision),
          minmov: 1
        })
      };

      // Instantiate VelaWorkspace with full PineTS scripting engine
      const ws = new VelaWorkspace(chartMount, {
        layout: false, // Single chart mode
        symbol: cleanSymbol,
        timeframe: velaTimeframe,
        live: false,
        theme: theme === 'dark' ? 'dark' : 'light',
        drawingToolbar: true,
        statusline: true,
        watermark: true,
        data: ohlcvBars,
        engines: {
          pine: () => new PineEngine()
        },
        providers: {
          mt5: () => mt5Provider
        }
      });

      workspaceRef.current = ws;

      // Plot Trade Executions (Entry Arrow, Exit Arrow, Connector Line)
      setTimeout(() => {
        try {
          const chart = ws.active?.chart || ws.chart;
          if (chart && chart.drawings) {
            const entryMs = new Date(trade.openTime).getTime();
            const exitMs = trade.closeTime ? new Date(trade.closeTime).getTime() : entryMs;
            const isBuy = trade.direction === 'BUY';
            const isWin = trade.netProfit > 0;

            // 1. Entry Arrow
            const entryArrowType = (isBuy ? 'arrowmarkup' : 'arrowmarkdown') as any;
            chart.drawings.add(entryArrowType, {
              anchors: [{ time: entryMs as any, price: trade.openPrice }],
              style: {
                lineColor: isBuy ? '#00e676' : '#ff5252',
                lineWidth: 2,
                lineStyle: 'solid'
              }
            });

            // 2. Exit Arrow & Connector if trade is closed
            if (trade.closeTime && trade.closePrice) {
              const exitArrowType = (isBuy ? 'arrowmarkdown' : 'arrowmarkup') as any;
              chart.drawings.add(exitArrowType, {
                anchors: [{ time: exitMs as any, price: trade.closePrice }],
                style: {
                  lineColor: isWin ? '#00e676' : '#ff5252',
                  lineWidth: 2,
                  lineStyle: 'solid'
                }
              });

              // Connector Trendline between entry and exit
              chart.drawings.add('trendline' as any, {
                anchors: [
                  { time: entryMs as any, price: trade.openPrice },
                  { time: exitMs as any, price: trade.closePrice }
                ],
                style: {
                  lineColor: isWin ? '#00e676' : '#ff5252',
                  lineWidth: 1.5,
                  lineStyle: 'dashed'
                }
              });
            }
          }
        } catch (err) {
          console.warn('[Vela] Could not add trade execution drawings:', err);
        }
      }, 300);

    } catch (err) {
      console.error('[Vela] Failed to initialize VelaWorkspace:', err);
    }

    return () => {
      if (workspaceRef.current) {
        try {
          workspaceRef.current.destroy();
        } catch {}
        workspaceRef.current = null;
      }
      while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
      }
    };
  }, [cleanSymbol, theme]);

  // Handle Pine Script Execution
  const handleRunPineScript = async () => {
    const ws = workspaceRef.current;
    if (!ws) return;

    setIsExecutingPine(true);
    setPineStatusMessage(null);

    try {
      const chart = ws.active?.chart || ws.chart;
      if (!chart) throw new Error('Active chart not ready');

      // Ensure chart market has symbol and timeframe explicitly set
      if (chart.setMarket && velaTimeframe) {
        try {
          await chart.setMarket({ symbol: cleanSymbol, timeframe: velaTimeframe });
        } catch {}
      }

      // Detect script title if specified in code (e.g. indicator("Name", ...))
      const titleMatch = customPineCode.match(/(?:indicator|strategy)\s*\(\s*["']([^"']+)["']/);
      const title = titleMatch ? titleMatch[1] : (PINE_SCRIPT_PRESETS[selectedPreset]?.name || 'Pine Script');

      await chart.addIndicator(customPineCode, {
        title
      });

      setPineStatusMessage(`"${title}" compiled & running successfully!`);
      setTimeout(() => setPineStatusMessage(null), 4000);
    } catch (err: any) {
      setPineStatusMessage(`Error: ${err.message || 'Script compilation failed'}`);
    } finally {
      setIsExecutingPine(false);
    }
  };

  // Replay Floating P&L calculation
  const currentCandle = candles && currentIndex !== undefined ? candles[currentIndex] : undefined;
  const isBuy = trade.direction === 'BUY';
  const entryPrice = trade.openPrice;
  const currentPrice = currentCandle ? currentCandle.close : (trade.closePrice || entryPrice);
  const lotSize = trade.lotSize || trade.lot || 0.01;

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
    } else if (trade.symbol.includes('BTC') || trade.symbol.includes('ETH')) {
      currentFloatingPips = Number(diff.toFixed(2));
      currentFloatingPnl = Number((diff * lotSize).toFixed(2));
    } else if (entryPrice < 5) {
      currentFloatingPips = Number((diff / 0.0001).toFixed(1));
      currentFloatingPnl = Number((diff * lotSize * 100000).toFixed(2));
    } else {
      currentFloatingPips = Number(diff.toFixed(2));
      currentFloatingPnl = Number((diff * lotSize).toFixed(2));
    }
  }

  const speedOptions = [
    { label: '0.1s', val: 10 },
    { label: '0.5s', val: 2 },
    { label: '1s', val: 1 },
    { label: '2s', val: 0.5 },
    { label: '3s', val: 0.33 }
  ];

  return (
    <div className="w-full h-full relative select-none flex flex-col overflow-hidden bg-[#131722] text-[#D1D4DC]">
      {/* VELA TOP REPLAY & PINE SCRIPT CONTROL BAR */}
      <div className="h-9 px-3 border-b border-[#2A2E39] bg-[#161A25] flex items-center justify-between text-xs font-sans shrink-0 z-30">
        {/* Left: Replay Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {onReset && (
            <button
              onClick={onReset}
              className="p-1 px-1.5 rounded hover:bg-[#2A2E39] text-gray-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-semibold"
              title="Jump to Trade Open"
            >
              <Scissors className="w-3.5 h-3.5 text-cyan-400" />
              <span>Jump</span>
            </button>
          )}

          {onJumpToEntry && (
            <button
              onClick={onJumpToEntry}
              className="px-1.5 py-0.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold font-mono transition-colors"
              title="Jump to Trade Entry Point"
            >
              Entry
            </button>
          )}
          {onJumpToExit && (
            <button
              onClick={onJumpToExit}
              className="px-1.5 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold font-mono transition-colors"
              title="Jump to Trade Exit Point"
            >
              Exit
            </button>
          )}

          <div className="w-[1px] h-3.5 mx-0.5 bg-[#2A2E39]" />

          {onStepBackward && (
            <button
              onClick={onStepBackward}
              className="p-1 rounded hover:bg-[#2A2E39] text-gray-400 hover:text-white transition-colors"
              title="Step Backward (Left Arrow)"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
          )}

          {onPlayToggle && (
            <button
              onClick={onPlayToggle}
              className="px-2.5 py-0.5 bg-[#2962FF] hover:bg-blue-600 text-white font-bold rounded text-[11px] flex items-center gap-1 shadow-sm transition-all active:scale-95"
              title={isPlaying ? "Pause Replay" : "Play Replay"}
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-white" /> : <Play className="w-3 h-3 fill-white" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
          )}

          {onStepForward && (
            <button
              onClick={onStepForward}
              className="p-1 rounded hover:bg-[#2A2E39] text-gray-400 hover:text-white transition-colors"
              title="Step Forward 1 Bar (Right Arrow)"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="w-[1px] h-3.5 mx-0.5 bg-[#2A2E39]" />

          {onSpeedChange && (
            <select
              value={speed || 1}
              onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
              className="bg-transparent text-[11px] font-mono font-bold rounded px-1 py-0.5 outline-none cursor-pointer text-gray-300 hover:bg-[#2A2E39]"
              title="Replay Speed"
            >
              {speedOptions.map(opt => (
                <option key={opt.val} value={opt.val} className="bg-[#1E222D] text-gray-200">
                  {opt.label}
                </option>
              ))}
            </select>
          )}

          {candles && candles.length > 0 && currentIndex !== undefined && onSeek && (
            <div className="hidden md:flex items-center gap-1.5 px-1">
              <input
                type="range"
                min={0}
                max={Math.max(0, candles.length - 1)}
                value={currentIndex}
                onChange={(e) => onSeek(parseInt(e.target.value, 10))}
                className="w-20 lg:w-28 h-1.5 bg-gray-700 rounded appearance-none cursor-pointer accent-[#2962FF]"
              />
              <span className="text-[10px] font-mono text-gray-400 whitespace-nowrap">
                {currentIndex + 1}/{candles.length}
              </span>
            </div>
          )}

          {/* Floating P&L Pill */}
          <div className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border flex items-center gap-1 ${
            currentFloatingPnl >= 0
              ? 'bg-[#089981]/15 text-[#089981] border-[#089981]/30'
              : 'bg-[#F23645]/15 text-[#F23645] border-[#F23645]/30'
          }`}>
            <span>{currentFloatingPnl >= 0 ? '+' : ''}${currentFloatingPnl.toFixed(2)}</span>
            <span className="text-[9px] opacity-75">({currentFloatingPips >= 0 ? '+' : ''}{currentFloatingPips}p)</span>
          </div>
        </div>

        {/* Right: Pine Script Editor Toggle & Status */}
        <div className="flex items-center gap-2">
          {pineStatusMessage && (
            <span className={`text-[10px] font-mono ${pineStatusMessage.startsWith('Error') ? 'text-rose-400' : 'text-emerald-400'}`}>
              {pineStatusMessage}
            </span>
          )}

          <button
            onClick={() => setIsPineEditorOpen(!isPineEditorOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold transition-all"
            title="Open Pine Script Editor & Compiler"
          >
            <Code className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pine Script</span>
            <ChevronDown className={`w-3 h-3 transition-transform ${isPineEditorOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* PINE SCRIPT COMPILER SLIDE-OVER DRAWER */}
      {isPineEditorOpen && (
        <div className="absolute top-9 right-0 w-full sm:w-[480px] z-50 bg-[#161A25] border-l border-b border-[#2A2E39] shadow-2xl p-4 flex flex-col gap-3 font-mono">
          <div className="flex items-center justify-between pb-2 border-b border-[#2A2E39]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-xs text-white">Vela Pine Script® Runner</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-sans">PineTS v5/v6</span>
            </div>
            <button
              onClick={() => setIsPineEditorOpen(false)}
              className="p-1 rounded text-gray-400 hover:text-white hover:bg-gray-700/50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Preset Selector */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 uppercase font-sans font-bold">Preset Scripts</span>
            <div className="grid grid-cols-2 gap-1.5">
              {PINE_SCRIPT_PRESETS.map((p, idx) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setSelectedPreset(idx);
                    setCustomPineCode(p.code);
                  }}
                  className={`px-2 py-1.5 rounded text-[11px] text-left transition-all border ${
                    selectedPreset === idx
                      ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-300 font-bold'
                      : 'bg-[#1C2030] border-[#2A2E39] text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="truncate">{p.name}</div>
                  <div className="text-[9px] text-gray-500 font-sans truncate">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Script Editor Area */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-gray-400 uppercase font-sans font-bold">Source Code</span>
            <textarea
              value={customPineCode}
              onChange={(e) => setCustomPineCode(e.target.value)}
              rows={9}
              className="w-full bg-[#0E1118] border border-[#2A2E39] rounded p-2.5 text-xs text-gray-200 outline-none focus:border-indigo-500 font-mono leading-relaxed resize-none"
              placeholder="Paste any Pine Script indicator or strategy here..."
            />
          </div>

          {/* Run Button */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-[10px] text-gray-500 font-sans">
              Executes in Web Worker via @luxalgo/vela-pinets
            </span>
            <button
              onClick={handleRunPineScript}
              disabled={isExecutingPine}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isExecutingPine ? (
                <span>Compiling...</span>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Run Indicator</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* VELA WORKSPACE CHART CANVAS */}
      <div className="flex-1 min-h-0 w-full h-full relative overflow-hidden">
        <div
          ref={containerRef}
          className="w-full h-full"
          style={{ minHeight: '400px' }}
        />
      </div>
    </div>
  );
};
