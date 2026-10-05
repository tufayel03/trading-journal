import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Scissors
} from 'lucide-react';
import { KLineChartPro, Datafeed, SymbolInfo, Period, DatafeedSubscribeCallback } from '@klinecharts/pro';
import { KLineData, dispose, registerIndicator } from 'klinecharts';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import { Trade } from '../../types';
import { getSymbolPrecision, Candle } from './TradingViewReplayChart';

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

// Global active trade pointer for canvas drawing
let activeTradeForKLine: Trade | null = null;

// Detect intrinsic timeframe from candle timestamps
function detectCandlesTimeframe(candles?: Candle[]): string | null {
  if (!candles || candles.length < 2) return null;
  let minDiff = Infinity;
  for (let i = 1; i < Math.min(candles.length, 30); i++) {
    const diff = Math.abs(candles[i].time - candles[i - 1].time);
    if (diff > 0 && diff < minDiff) {
      minDiff = diff;
    }
  }
  if (minDiff <= 70) return '1m';
  if (minDiff <= 350) return '5m';
  if (minDiff <= 1000) return '15m';
  if (minDiff <= 2000) return '30m';
  if (minDiff <= 4000) return '1h';
  if (minDiff <= 15000) return '4h';
  if (minDiff <= 90000) return '1d';
  if (minDiff <= 650000) return '1w';
  return null;
}

// Register native custom indicator to draw clean execution markers without covering text
registerIndicator({
  name: 'TRADE_EXECUTIONS',
  shortName: '',
  // @ts-expect-error series 'price' draws directly on candle pane
  series: 'price',
  calc: () => [],
  createTooltipDataSource: () => ({ name: '', calcParamsText: '', icons: [], values: [] }),
  draw: ({ ctx, kLineDataList, xAxis, yAxis }) => {
    if (!activeTradeForKLine || !kLineDataList || kLineDataList.length === 0) return true;
    const trade = activeTradeForKLine;
    const entryMs = new Date(trade.openTime).getTime();
    const exitMs = trade.closeTime ? new Date(trade.closeTime).getTime() : null;
    const latestBar = kLineDataList[kLineDataList.length - 1];

    const barIntervalMs = kLineDataList.length > 1
      ? Math.abs(kLineDataList[1].timestamp - kLineDataList[0].timestamp)
      : 60000;

    // Check if the current visible replay bars have reached the trade entry
    if (!latestBar || (latestBar.timestamp + barIntervalMs < entryMs)) {
      return true;
    }

    let entryIdx = -1;
    let minDiff = Infinity;
    for (let i = 0; i < kLineDataList.length; i++) {
      const diff = Math.abs(kLineDataList[i].timestamp - entryMs);
      if (diff < minDiff) {
        minDiff = diff;
        entryIdx = i;
      }
    }
    if (entryIdx === -1) return true;

    const entryX = xAxis.convertToPixel(entryIdx);
    const entryY = yAxis.convertToPixel(trade.openPrice);
    const isBuy = trade.direction === 'BUY';
    const isWin = trade.netProfit > 0;

    ctx.save();

    // 1. Draw Entry Arrow Marker (Crisp triangle, NO text covering candle)
    const arrowColor = isBuy ? '#22c55e' : '#ef4444';
    ctx.fillStyle = arrowColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    if (isBuy) {
      // BUY entry: Upward pointing triangle ▲ placed below candle
      ctx.moveTo(entryX, entryY + 4);
      ctx.lineTo(entryX - 6, entryY + 18);
      ctx.lineTo(entryX + 6, entryY + 18);
    } else {
      // SELL entry: Downward pointing triangle ▼ placed above candle
      ctx.moveTo(entryX, entryY - 4);
      ctx.lineTo(entryX - 6, entryY - 18);
      ctx.lineTo(entryX + 6, entryY - 18);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Check if trade exit is reached or if position is live
    const hasExited = exitMs && (latestBar.timestamp + barIntervalMs >= exitMs);

    if (hasExited) {
      let exitIdx = -1;
      let minExitDiff = Infinity;
      for (let i = 0; i < kLineDataList.length; i++) {
        const diff = Math.abs(kLineDataList[i].timestamp - exitMs);
        if (diff < minExitDiff) {
          minExitDiff = diff;
          exitIdx = i;
        }
      }

      if (exitIdx >= 0) {
        const exitX = xAxis.convertToPixel(exitIdx);
        const exitPrice = trade.closePrice || latestBar.close;
        const exitY = yAxis.convertToPixel(exitPrice);

        // Dashed Connector Line between entry and exit
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = isWin ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.moveTo(entryX, entryY);
        ctx.lineTo(exitX, exitY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Exit Arrow Marker (Opposite triangle, NO text covering candle)
        ctx.fillStyle = isWin ? '#22c55e' : '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        if (isBuy) {
          // BUY trade close (sell action): downward pointing triangle ▼
          ctx.moveTo(exitX, exitY - 4);
          ctx.lineTo(exitX - 6, exitY - 18);
          ctx.lineTo(exitX + 6, exitY - 18);
        } else {
          // SELL trade close (buy action): upward pointing triangle ▲
          ctx.moveTo(exitX, exitY + 4);
          ctx.lineTo(exitX - 6, exitY + 18);
          ctx.lineTo(exitX + 6, exitY + 18);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      // Replay is between trade open and close (Live active position)
      const latestX = xAxis.convertToPixel(kLineDataList.length - 1);
      ctx.beginPath();
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = isBuy ? '#22c55e' : '#ef4444';
      ctx.lineWidth = 1.2;
      ctx.moveTo(entryX, entryY);
      ctx.lineTo(latestX, entryY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 3. Partial Closes if any (dashed connector line + subtle dot, NO text covering candle)
    if (trade.partialCloses && trade.partialCloses.length > 0) {
      trade.partialCloses.forEach((pc) => {
        const pcTime = new Date(pc.closeTime).getTime();
        if (latestBar.timestamp + barIntervalMs >= pcTime) {
          let pcIdx = -1;
          let minPcDiff = Infinity;
          for (let i = 0; i < kLineDataList.length; i++) {
            const diff = Math.abs(kLineDataList[i].timestamp - pcTime);
            if (diff < minPcDiff) {
              minPcDiff = diff;
              pcIdx = i;
            }
          }
          if (pcIdx >= 0) {
            const pcX = xAxis.convertToPixel(pcIdx);
            const pcY = yAxis.convertToPixel(pc.closePrice);
            ctx.beginPath();
            ctx.setLineDash([2, 3]);
            ctx.strokeStyle = pc.netProfit >= 0 ? '#22c55e' : '#ef4444';
            ctx.lineWidth = 1.2;
            ctx.moveTo(entryX, entryY);
            ctx.lineTo(pcX, pcY);
            ctx.stroke();
            ctx.setLineDash([]);

            // Small circle dot marker
            ctx.beginPath();
            ctx.fillStyle = pc.netProfit >= 0 ? '#22c55e' : '#ef4444';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.arc(pcX, pcY, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
        }
      });
    }

    ctx.restore();
    return true;
  }
});

export class KLineMT5Datafeed implements Datafeed {
  private trade: Trade;
  private currentReplayCutoff: number | null = null;
  private subscribers: Map<string, DatafeedSubscribeCallback> = new Map();
  private propCandles: Candle[] | null = null;
  private propTimeframe: string = '5m';
  private currentTf: string = '5m';
  private onTimeframeChange?: (tf: string) => void;

  constructor(
    trade: Trade,
    propCandles?: Candle[],
    timeframe: string = '5m',
    onTimeframeChange?: (tf: string) => void
  ) {
    this.trade = trade;
    this.setCandles(propCandles, timeframe);
    this.currentTf = timeframe;
    this.onTimeframeChange = onTimeframeChange;
  }

  public setTrade(trade: Trade) {
    this.trade = trade;
  }

  public setCandles(candles?: Candle[], timeframe?: string) {
    if (candles && candles.length > 0) {
      this.propCandles = candles;
      const detected = detectCandlesTimeframe(candles);
      this.propTimeframe = detected || timeframe || '5m';
    } else {
      this.propCandles = null;
    }
    if (timeframe) {
      this.currentTf = timeframe;
    }
  }

  public setReplayCutoff(cutoffSec: number | null) {
    this.currentReplayCutoff = cutoffSec;
  }

  public emitBar(bar: KLineData) {
    this.subscribers.forEach(cb => cb(bar));
  }

  async searchSymbols(): Promise<SymbolInfo[]> {
    const cleanSym = this.trade.symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const precision = getSymbolPrecision(cleanSym);
    return [{
      ticker: cleanSym,
      name: cleanSym,
      shortName: cleanSym,
      exchange: 'MT5 Broker',
      market: 'forex',
      pricePrecision: precision,
      volumePrecision: 2
    }];
  }

  async getHistoryKLineData(symbol: SymbolInfo, period: Period, _from?: number, _to?: number): Promise<KLineData[]> {
    let tf = '5m';
    if (period.timespan === 'minute') {
      tf = `${period.multiplier}m`;
    } else if (period.timespan === 'hour') {
      tf = `${period.multiplier}h`;
    } else if (period.timespan === 'day') {
      tf = '1d';
    } else if (period.timespan === 'week') {
      tf = '1w';
    } else if (period.timespan === 'month') {
      tf = '1M';
    }

    // Check if current propCandles match the requested period
    const detectedPropTf = detectCandlesTimeframe(this.propCandles || undefined);
    const matchesTf = detectedPropTf === tf;

    let rawCandles: any[] = [];
    if (this.propCandles && this.propCandles.length > 0 && matchesTf) {
      rawCandles = this.propCandles;
    } else {
      // Dynamically fetch candles for this timeframe from API
      const cleanSym = this.trade.symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const url = `/api/candles?symbol=${encodeURIComponent(cleanSym)}&timeframe=${encodeURIComponent(tf)}&all=true`;

      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          rawCandles = Array.isArray(data?.candles)
            ? data.candles
            : (Array.isArray(data) ? data : []);
          this.propCandles = rawCandles;
          this.propTimeframe = tf;
        }
      } catch {
        rawCandles = [];
      }
    }

    // Notify parent modal asynchronously if user shifted timeframe inside KLine toolbar
    if (this.currentTf !== tf) {
      this.currentTf = tf;
      setTimeout(() => {
        this.onTimeframeChange?.(tf);
      }, 0);
    }

    if (!rawCandles || rawCandles.length === 0) return [];

    let filteredCandles = rawCandles;
    if (this.currentReplayCutoff !== null && this.currentReplayCutoff > 0) {
      const subset = rawCandles.filter(c => c.time <= this.currentReplayCutoff!);
      if (subset.length >= 5) {
        filteredCandles = subset;
      }
    }

    return filteredCandles.map((c: any) => ({
      timestamp: Number(c.time) * 1000,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume || c.tick_volume || 0)
    })).sort((a, b) => a.timestamp - b.timestamp);
  }

  subscribe(symbol: SymbolInfo, period: Period, callback: DatafeedSubscribeCallback): void {
    const key = `${symbol.ticker}_${period.timespan}_${period.multiplier}`;
    this.subscribers.set(key, callback);
  }

  unsubscribe(symbol: SymbolInfo, period: Period): void {
    const key = `${symbol.ticker}_${period.timespan}_${period.multiplier}`;
    this.subscribers.delete(key);
  }
}

// Inline replay bar embedded directly inside .klinecharts-pro-period-bar next to "Full Screen"
const KLineReplayBarInline: React.FC<{
  candles?: Candle[];
  currentIndex?: number;
  isPlaying?: boolean;
  speed?: number;
  trade: Trade;
  onPlayToggle?: () => void;
  onStepForward?: () => void;
  onStepBackward?: () => void;
  onJumpToEntry?: () => void;
  onJumpToExit?: () => void;
  onReset?: () => void;
  onSpeedChange?: (speed: number) => void;
  onSeek?: (index: number) => void;
}> = ({
  candles = [],
  currentIndex,
  isPlaying = false,
  speed = 1,
  trade,
  onPlayToggle,
  onStepForward,
  onStepBackward,
  onJumpToEntry,
  onJumpToExit,
  onReset,
  onSpeedChange,
  onSeek
}) => {
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
    <div className="flex items-center gap-1.5 ml-2.5 px-2 py-0.5 border-l border-[#2A2E39] select-none text-xs font-sans h-full">
      {/* Jump Button */}
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="p-1 px-1.5 rounded hover:bg-[#2A2E39] text-gray-300 hover:text-white transition-colors flex items-center gap-1 text-[11px] font-semibold"
          title="Jump to Trade Open"
        >
          <Scissors className="w-3.5 h-3.5 text-cyan-400" />
          <span>Jump</span>
        </button>
      )}

      {/* Entry & Exit Jump Quick Buttons */}
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

      <div className="w-[1px] h-3.5 mx-0.5 bg-[#2A2E39]" />

      {/* Step Back, Play / Pause, Step Forward */}
      {onStepBackward && (
        <button
          type="button"
          onClick={onStepBackward}
          className="p-1 rounded hover:bg-[#2A2E39] text-gray-400 hover:text-white transition-colors"
          title="Step Backward (Left Arrow)"
        >
          <SkipBack className="w-3.5 h-3.5" />
        </button>
      )}

      {onPlayToggle && (
        <button
          type="button"
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
          type="button"
          onClick={onStepForward}
          className="p-1 rounded hover:bg-[#2A2E39] text-gray-400 hover:text-white transition-colors"
          title="Step Forward 1 Bar (Right Arrow)"
        >
          <SkipForward className="w-3.5 h-3.5" />
        </button>
      )}

      <div className="w-[1px] h-3.5 mx-0.5 bg-[#2A2E39]" />

      {/* Speed Dropdown */}
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

      {/* Progress Slider */}
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
  );
};

export const KLineReplayChart: React.FC<Props> = ({
  trade,
  candles,
  timeframe = '5m',
  theme = 'dark',
  currentIndex,
  onTimeframeChange,
  isPlaying,
  speed,
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
  const chartProRef = useRef<KLineChartPro | null>(null);
  const datafeedRef = useRef<KLineMT5Datafeed | null>(null);
  const prevIndexRef = useRef<number | undefined>(currentIndex);
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

  const cleanSymbol = trade.symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const precision = getSymbolPrecision(cleanSymbol);

  // Map timeframe string ('1m', '5m', '15m', '1h', '4h', '1d', etc.) to KLine Period
  const tfToPeriod = (tf: string): Period => {
    const raw = String(tf || '5m').toLowerCase();
    if (raw === '1m') return { multiplier: 1, timespan: 'minute', text: '1m' };
    if (raw === '5m') return { multiplier: 5, timespan: 'minute', text: '5m' };
    if (raw === '15m') return { multiplier: 15, timespan: 'minute', text: '15m' };
    if (raw === '30m') return { multiplier: 30, timespan: 'minute', text: '30m' };
    if (raw === '1h') return { multiplier: 1, timespan: 'hour', text: '1h' };
    if (raw === '4h') return { multiplier: 4, timespan: 'hour', text: '4h' };
    if (raw === '1d') return { multiplier: 1, timespan: 'day', text: '1D' };
    if (raw === '1w') return { multiplier: 1, timespan: 'week', text: '1W' };
    if (raw === '1mn' || raw === '1mon' || raw === 'month' || raw === '1m-mon') return { multiplier: 1, timespan: 'month', text: '1M' };
    return { multiplier: 5, timespan: 'minute', text: '5m' };
  };

  const periods: Period[] = [
    { multiplier: 1, timespan: 'minute', text: '1m' },
    { multiplier: 5, timespan: 'minute', text: '5m' },
    { multiplier: 15, timespan: 'minute', text: '15m' },
    { multiplier: 30, timespan: 'minute', text: '30m' },
    { multiplier: 1, timespan: 'hour', text: '1h' },
    { multiplier: 4, timespan: 'hour', text: '4h' },
    { multiplier: 1, timespan: 'day', text: '1D' },
    { multiplier: 1, timespan: 'week', text: '1W' },
    { multiplier: 1, timespan: 'month', text: '1M' }
  ];

  // Initialize or re-create KLineChartPro
  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    activeTradeForKLine = trade;

    // Purge existing children
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
    chartProRef.current = null;
    setPortalHost(null);

    const chartDiv = document.createElement('div');
    chartDiv.style.width = '100%';
    chartDiv.style.height = '100%';
    parent.appendChild(chartDiv);

    const datafeed = new KLineMT5Datafeed(trade, candles, timeframe, onTimeframeChange);
    if (currentIndex !== undefined && currentIndex >= 0 && candles && candles[currentIndex]) {
      datafeed.setReplayCutoff(candles[currentIndex].time);
    }
    datafeedRef.current = datafeed;

    const initialSymbol: SymbolInfo = {
      ticker: cleanSymbol,
      name: cleanSymbol,
      shortName: cleanSymbol,
      exchange: 'MT5 Broker',
      market: 'forex',
      pricePrecision: precision,
      volumePrecision: 2
    };

    const initialPeriod = tfToPeriod(timeframe);

    const chart = new KLineChartPro({
      container: chartDiv,
      symbol: initialSymbol,
      period: initialPeriod,
      periods,
      datafeed,
      timezone: 'America/New_York',
      theme: theme === 'dark' ? 'dark' : 'light',
      locale: 'en-US',
      drawingBarVisible: true,
      watermark: '',
      mainIndicators: ['TRADE_EXECUTIONS'],
      subIndicators: [],
      styles: {
        indicator: {
          tooltip: {
            showRule: 'none' as any
          }
        },
        grid: {
          show: true,
          horizontal: {
            show: true,
            size: 1,
            color: theme === 'dark' ? '#1F2937' : '#F3F4F6',
            style: 'solid' as any
          },
          vertical: {
            show: false
          }
        },
        candle: {
          bar: {
            upColor: '#22c55e',
            downColor: '#ef4444',
            noChangeColor: '#888888',
            upBorderColor: '#22c55e',
            downBorderColor: '#ef4444',
            noChangeBorderColor: '#888888',
            upWickColor: '#22c55e',
            downWickColor: '#ef4444',
            noChangeWickColor: '#888888'
          }
        }
      }
    });

    try {
      chart.setTimezone('America/New_York');
    } catch {}

    chartProRef.current = chart;

    // Mount portal host inside .klinecharts-pro-period-bar next to "Full Screen" tab
    const periodBar = chartDiv.querySelector('.klinecharts-pro-period-bar') as HTMLElement | null;
    if (periodBar) {
      let host = periodBar.querySelector('#kline-replay-bar-host') as HTMLDivElement | null;
      if (!host) {
        host = document.createElement('div');
        host.id = 'kline-replay-bar-host';
        host.style.display = 'flex';
        host.style.alignItems = 'center';
        host.style.height = '100%';
        periodBar.appendChild(host);
      }
      setPortalHost(host);
    }

    return () => {
      chartProRef.current = null;
      setPortalHost(null);
      try {
        dispose(chartDiv);
      } catch { }
      while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
      }
    };
  }, [trade.id, cleanSymbol, theme]);

  // Keep active trade updated for canvas renderer
  useEffect(() => {
    activeTradeForKLine = trade;
  }, [trade]);

  // Sync timeframe when changed from outside
  useEffect(() => {
    if (!chartProRef.current) return;
    const targetPeriod = tfToPeriod(timeframe);
    const curPeriod = chartProRef.current.getPeriod();
    if (curPeriod.timespan !== targetPeriod.timespan || curPeriod.multiplier !== targetPeriod.multiplier) {
      chartProRef.current.setPeriod(targetPeriod);
    }
  }, [timeframe]);

  // Update datafeed when candles change
  useEffect(() => {
    if (datafeedRef.current) {
      datafeedRef.current.setTrade(trade);
      datafeedRef.current.setCandles(candles, timeframe);
      if (currentIndex !== undefined && candles && candles[currentIndex]) {
        datafeedRef.current.setReplayCutoff(candles[currentIndex].time);
      }
    }
  }, [candles, timeframe, trade, currentIndex]);

  // Sync replay progress when currentIndex changes
  useEffect(() => {
    if (!datafeedRef.current || !candles || currentIndex === undefined) return;

    const prevIndex = prevIndexRef.current;
    prevIndexRef.current = currentIndex;

    const currentCandle = candles[currentIndex];
    if (!currentCandle) return;

    datafeedRef.current.setReplayCutoff(currentCandle.time);

    // If stepping forward by 1 candle (normal play), emit bar smoothly
    if (prevIndex !== undefined && currentIndex === prevIndex + 1) {
      datafeedRef.current.emitBar({
        timestamp: currentCandle.time * 1000,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
        volume: currentCandle.volume || 0
      });
    } else if (prevIndex !== currentIndex) {
      // Jumped or scrubbed: apply new visible slice directly to underlying chart
      const subset = candles.slice(0, currentIndex + 1);
      const kLineDataList: KLineData[] = subset.map(c => ({
        timestamp: c.time * 1000,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0
      }));
      const chartApi = (chartProRef.current as any)?._chartApi;
      if (chartApi && typeof chartApi.applyNewData === 'function') {
        chartApi.applyNewData(kLineDataList);
      }
    }
  }, [currentIndex, candles]);

  return (
    <div className="w-full h-full relative min-w-0 min-h-0 select-none overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full min-w-0 min-h-0"
        style={{ minHeight: '400px' }}
      />
      {/* Portal replay bar directly into .klinecharts-pro-period-bar next to "Full Screen" */}
      {portalHost && ReactDOM.createPortal(
        <KLineReplayBarInline
          candles={candles}
          currentIndex={currentIndex}
          isPlaying={isPlaying}
          speed={speed}
          trade={trade}
          onPlayToggle={onPlayToggle}
          onStepForward={onStepForward}
          onStepBackward={onStepBackward}
          onJumpToEntry={onJumpToEntry}
          onJumpToExit={onJumpToExit}
          onReset={onReset}
          onSpeedChange={onSpeedChange}
          onSeek={onSeek}
        />,
        portalHost
      )}
    </div>
  );
};
