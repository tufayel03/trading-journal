import React, { useEffect, useRef, useState, useImperativeHandle } from 'react';
import ReactDOM from 'react-dom';
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Scissors,
  Code,
  Eye,
  EyeOff,
  Settings,
  X,
  Plus,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { KLineChartPro, Datafeed, SymbolInfo, Period, DatafeedSubscribeCallback } from '@klinecharts/pro';
import { KLineData, dispose, registerIndicator, IndicatorSeries } from 'klinecharts';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import { Trade } from '../../types';
import { getSymbolPrecision, Candle } from './TradingViewReplayChart';
import { KLinePineModal } from './KLinePineModal';
import {
  drawPineScene,
  executePineScript,
  PineSceneModel,
  PineInputSchema,
  PineExecutionResult
} from './KLinePineRunner';
import { TradingViewIndicatorSettingsModal } from './TradingViewIndicatorSettingsModal';

export interface ActivePineIndicator {
  id: string;
  title: string;
  code: string;
  model: PineSceneModel;
  visible: boolean;
  inputSchema: PineInputSchema[];
  userInputs: Record<string, any>;
  createdAt: number;
}

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

// Global active trade and core chart pointer for canvas drawing & direct replay navigation
let activeTradeForKLine: Trade | null = null;
let currentKLineChartInstance: any = null;

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
  series: IndicatorSeries.Price,
  calc: () => [],
  createTooltipDataSource: () => ({ name: '', calcParamsText: '', icons: [], values: [] }),
  draw: ({ ctx, kLineDataList, xAxis, yAxis }) => {
    // Capture underlying core chart instance for instant replay seek/jump and direct scrolling
    const coreChart = (xAxis as any)?.getParent?.()?.getChart?.();
    if (coreChart) {
      currentKLineChartInstance = coreChart;
    }

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

    // 1. Draw Entry Arrow Marker (Crisp triangle, reduced subtle size)
    const arrowColor = isBuy ? '#22c55e' : '#ef4444';
    ctx.fillStyle = arrowColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    ctx.beginPath();
    if (isBuy) {
      // BUY entry: Upward pointing triangle ▲ placed cleanly below candle
      ctx.moveTo(entryX, entryY + 3);
      ctx.lineTo(entryX - 3.5, entryY + 10);
      ctx.lineTo(entryX + 3.5, entryY + 10);
    } else {
      // SELL entry: Downward pointing triangle ▼ placed cleanly above candle
      ctx.moveTo(entryX, entryY - 3);
      ctx.lineTo(entryX - 3.5, entryY - 10);
      ctx.lineTo(entryX + 3.5, entryY - 10);
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
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = isWin ? '#22c55e' : '#ef4444';
        ctx.lineWidth = 1.2;
        ctx.moveTo(entryX, entryY);
        ctx.lineTo(exitX, exitY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Exit Arrow Marker (Opposite triangle, reduced subtle size)
        ctx.fillStyle = isWin ? '#22c55e' : '#ef4444';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (isBuy) {
          // BUY trade close (sell action): downward pointing triangle ▼
          ctx.moveTo(exitX, exitY - 3);
          ctx.lineTo(exitX - 3.5, exitY - 10);
          ctx.lineTo(exitX + 3.5, exitY - 10);
        } else {
          // SELL trade close (buy action): upward pointing triangle ▲
          ctx.moveTo(exitX, exitY + 3);
          ctx.lineTo(exitX - 3.5, exitY + 10);
          ctx.lineTo(exitX + 3.5, exitY + 10);
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

            // Small circle dot marker (subtle 2.5px radius)
            ctx.beginPath();
            ctx.fillStyle = pc.netProfit >= 0 ? '#22c55e' : '#ef4444';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.arc(pcX, pcY, 2.5, 0, Math.PI * 2);
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

// Global active pine indicators pointers for canvas drawing (supports multiple indicators simultaneously)
let activePineOverlayModels: PineSceneModel[] = [];
let activePineSubpaneModel: PineSceneModel | null = null;

// Register native Pine Script overlay indicator (incorporates HTF candle bounds into price scale)
registerIndicator({
  name: 'PINETS_OVERLAY',
  shortName: '',
  series: IndicatorSeries.Price,
  calc: (kLineDataList, indicator) => {
    if (activePineOverlayModels && activePineOverlayModels.length > 0) {
      let pineMin = Infinity;
      let pineMax = -Infinity;
      for (const model of activePineOverlayModels) {
        if (!model) continue;
        if (model.boxes) {
          for (const b of model.boxes) {
            if (Number.isFinite(b.top)) pineMax = Math.max(pineMax, b.top);
            if (Number.isFinite(b.bottom)) pineMin = Math.min(pineMin, b.bottom);
          }
        }
        if (model.lines) {
          for (const l of model.lines) {
            if (Number.isFinite(l.y1)) {
              pineMin = Math.min(pineMin, l.y1);
              pineMax = Math.max(pineMax, l.y1);
            }
            if (Number.isFinite(l.y2)) {
              pineMin = Math.min(pineMin, l.y2);
              pineMax = Math.max(pineMax, l.y2);
            }
          }
        }
        if (model.labels) {
          for (const lbl of model.labels) {
            if (Number.isFinite(lbl.y)) {
              pineMin = Math.min(pineMin, lbl.y);
              pineMax = Math.max(pineMax, lbl.y);
            }
          }
        }
      }
      if (pineMin !== Infinity && pineMax !== -Infinity) {
        indicator.minValue = pineMin;
        indicator.maxValue = pineMax;
      }
    }
    return [];
  },
  createTooltipDataSource: () => ({ name: '', calcParamsText: '', icons: [], values: [] }),
  draw: ({ ctx, kLineDataList, xAxis, yAxis, bounding, barSpace }) => {
    if (!activePineOverlayModels || activePineOverlayModels.length === 0) return true;
    return drawPineScene(activePineOverlayModels, ctx, kLineDataList, xAxis, yAxis, bounding, barSpace);
  }
});

// Register native Pine Script sub-pane indicator (for oscillators like RSI)
registerIndicator({
  name: 'PINETS_SUBPANE',
  shortName: 'Pine Script',
  series: IndicatorSeries.Normal,
  calc: (kLineDataList) => {
    if (!activePineSubpaneModel || !activePineSubpaneModel.series || activePineSubpaneModel.series.length === 0) return [];
    const timeToVal = new Map<number, number>();
    for (const s of activePineSubpaneModel.series) {
      for (const pt of s.points) {
        if (pt.value !== null && Number.isFinite(pt.value)) {
          timeToVal.set(pt.time, pt.value);
        }
      }
    }
    return kLineDataList.map(bar => ({ val: timeToVal.get(bar.timestamp) ?? null }));
  },
  figures: [{ key: 'val', title: '', type: 'line' }],
  createTooltipDataSource: () => ({
    name: activePineSubpaneModel?.title || 'Pine Indicator',
    calcParamsText: '',
    icons: [],
    values: []
  }),
  draw: ({ ctx, kLineDataList, xAxis, yAxis, bounding, barSpace }) => {
    if (!activePineSubpaneModel) return true;
    return drawPineScene(activePineSubpaneModel, ctx, kLineDataList, xAxis, yAxis, bounding, barSpace);
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
  onOpenPineEditor?: () => void;
  hasActivePine?: boolean;
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
  onSeek,
  onOpenPineEditor,
  hasActivePine = false
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
      {/* Pine Script Indicator Studio Button */}
      {onOpenPineEditor && (
        <button
          type="button"
          onClick={onOpenPineEditor}
          className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-sm ${
            hasActivePine
              ? 'bg-blue-600/25 hover:bg-blue-600/35 text-blue-400 border border-blue-500/40'
              : 'bg-[#2A2E39] hover:bg-[#363C4E] text-gray-300 hover:text-white border border-transparent'
          }`}
          title="Open Pine Script Indicator Studio (Compile & Add Indicators)"
        >
          <Code className="w-3.5 h-3.5 text-blue-400" />
          <span>Pine Script</span>
          {hasActivePine && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>
      )}

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

export interface KLineReplayChartRef {
  scrollToTime: (timestampSec: number) => void;
  scrollToRealTime: () => void;
  autoFit: () => void;
  jumpToEntry: () => void;
  jumpToExit: () => void;
}

export const KLineReplayChart = React.forwardRef<KLineReplayChartRef, Props>(({
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
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartProRef = useRef<KLineChartPro | null>(null);
  const datafeedRef = useRef<KLineMT5Datafeed | null>(null);
  const prevIndexRef = useRef<number | undefined>(currentIndex);
  const [portalHost, setPortalHost] = useState<HTMLDivElement | null>(null);

  // TradingView Auto-fit & Log Scale State
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [isLogScale, setIsLogScale] = useState(false);

  // Dynamically sync right-space distance so future HTF candles count as part of the chart and never get cut off
  const syncHtfRightOffset = (chart?: any, models?: PineSceneModel[]) => {
    const targetChart = chart || currentKLineChartInstance;
    if (!targetChart) return;

    const overlayModels = models || activePineOverlayModels;
    const dataList = targetChart.getDataList?.() || [];
    const lastBarIdx = dataList.length - 1;

    let maxFutureBars = 0;
    if (overlayModels && overlayModels.length > 0 && lastBarIdx >= 0) {
      for (const model of overlayModels) {
        if (!model) continue;
        if (model.boxes) {
          for (const b of model.boxes) {
            if (b.xloc === 'bar_index' || !b.xloc) {
              const r = Math.max(b.left, b.right);
              if (r > lastBarIdx) {
                maxFutureBars = Math.max(maxFutureBars, r - lastBarIdx);
              }
            }
          }
        }
        if (model.lines) {
          for (const l of model.lines) {
            if (l.xloc === 'bar_index' || !l.xloc) {
              const r = Math.max(l.x1, l.x2);
              if (r > lastBarIdx) {
                maxFutureBars = Math.max(maxFutureBars, r - lastBarIdx);
              }
            }
          }
        }
        if (model.labels) {
          for (const lbl of model.labels) {
            if ((lbl.xloc === 'bar_index' || !lbl.xloc) && lbl.x > lastBarIdx) {
              maxFutureBars = Math.max(maxFutureBars, lbl.x - lastBarIdx);
            }
          }
        }
      }
    }

    const bs = targetChart.getBarSpace?.();
    const curBarSpace = typeof bs === 'number' ? bs : (bs?.bar || 8);
    const containerWidth = containerRef.current?.clientWidth || 1000;

    let neededDistance = 120; // default comfortable right margin
    if (maxFutureBars > 0) {
      // Add 8 bars of breathing room so rightmost labels/wicks aren't pressed against the scale
      const totalFutureBars = maxFutureBars + 8;
      const calculatedPx = totalFutureBars * curBarSpace;
      neededDistance = Math.max(160, Math.min(containerWidth - 150, calculatedPx + 24));
    }

    try {
      targetChart.setMaxOffsetRightDistance(Math.max(neededDistance * 2, 800));
      targetChart.setOffsetRightDistance(neededDistance, true);
    } catch {}
  };

  // TradingView "Auto (fits data to screen)" handler
  const handleAutoFit = () => {
    setIsAutoFit(true);
    const targetChart = currentKLineChartInstance;
    if (!targetChart) return;

    try {
      // 1. Sync right space so HTF candles have full room
      syncHtfRightOffset(targetChart);

      // 2. Override indicator min/max to incorporate HTF candle bounds
      if (activePineOverlayModels && activePineOverlayModels.length > 0) {
        let pineMin = Infinity;
        let pineMax = -Infinity;
        for (const m of activePineOverlayModels) {
          if (!m) continue;
          if (m.boxes) {
            for (const b of m.boxes) {
              if (Number.isFinite(b.top)) pineMax = Math.max(pineMax, b.top);
              if (Number.isFinite(b.bottom)) pineMin = Math.min(pineMin, b.bottom);
            }
          }
          if (m.lines) {
            for (const l of m.lines) {
              if (Number.isFinite(l.y1)) {
                pineMin = Math.min(pineMin, l.y1);
                pineMax = Math.max(pineMax, l.y1);
              }
              if (Number.isFinite(l.y2)) {
                pineMin = Math.min(pineMin, l.y2);
                pineMax = Math.max(pineMax, l.y2);
              }
            }
          }
        }
        if (pineMin !== Infinity && pineMax !== -Infinity) {
          targetChart.overrideIndicator?.({
            name: 'PINETS_OVERLAY',
            minValue: pineMin,
            maxValue: pineMax
          });
        }
      }

      // 3. Reset Y-axis auto calc flag on all draw panes
      const panes = targetChart.getAllDrawPanes?.() || [];
      for (const p of panes) {
        const yAxis = (p as any)?.getYAxis?.() || (p as any)?.getAxis?.();
        if (yAxis && typeof yAxis.setAutoCalcTickFlag === 'function') {
          yAxis.setAutoCalcTickFlag(true);
        }
      }

      // 4. Scroll to real-time with required right offset
      targetChart.scrollToRealTime();

      // 5. Force pane viewport adjustment for clean auto fit
      targetChart.adjustPaneViewport(true, true, true, true, true);
    } catch (e) {
      console.warn('Auto fit error:', e);
    }
  };

  // TradingView Logarithmic scale toggle handler
  const handleToggleLog = () => {
    const nextLog = !isLogScale;
    setIsLogScale(nextLog);
    const targetChart = currentKLineChartInstance;
    if (!targetChart) return;

    try {
      targetChart.setStyles({
        yAxis: {
          type: nextLog ? 'log' : 'normal'
        }
      });
      targetChart.adjustPaneViewport(false, false, true, true, true);
    } catch (e) {
      console.warn('Toggle log scale error:', e);
    }
  };

  // Expose imperative chart controls to parent modal
  useImperativeHandle(ref, () => ({
    scrollToTime: (timestampSec: number) => {
      if (currentKLineChartInstance) {
        try {
          syncHtfRightOffset(currentKLineChartInstance);
          currentKLineChartInstance.scrollToTimestamp(timestampSec * 1000);
        } catch {}
      }
    },
    scrollToRealTime: () => {
      if (currentKLineChartInstance) {
        try {
          syncHtfRightOffset(currentKLineChartInstance);
          currentKLineChartInstance.scrollToRealTime();
        } catch {}
      }
    },
    autoFit: handleAutoFit,
    jumpToEntry: () => {
      onJumpToEntry?.();
    },
    jumpToExit: () => {
      onJumpToExit?.();
    }
  }));

  // Keyboard shortcut listener for Auto-fit (Alt+A or Alt+R)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.altKey && e.code === 'KeyA') || (e.altKey && e.code === 'KeyR')) {
        e.preventDefault();
        handleAutoFit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Pine Script Indicator Studio Multi-Indicator State
  const [isPineModalOpen, setIsPineModalOpen] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState<ActivePineIndicator[]>(() => {
    try {
      const savedV2 = localStorage.getItem('kline_active_pine_indicators_v2');
      if (savedV2) {
        const parsed = JSON.parse(savedV2);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item: any) => ({
            ...item,
            model: item.model || { id: item.id, title: item.title, overlay: true, series: [], boxes: [], lines: [], labels: [], fills: [], priceLines: [], backgrounds: [] },
            visible: item.visible ?? true,
            inputSchema: item.inputSchema || [],
            userInputs: item.userInputs || {}
          }));
        }
      }
      // Migrate from old single-code storage if present
      const oldCode = localStorage.getItem('kline_active_pine_code');
      const oldTitle = localStorage.getItem('kline_active_pine_title') || 'Pine Script';
      if (oldCode && oldCode.trim()) {
        return [{
          id: `pine_${Date.now()}`,
          title: oldTitle,
          code: oldCode,
          model: { id: 'old', title: oldTitle, overlay: true, series: [], boxes: [], lines: [], labels: [], fills: [], priceLines: [], backgrounds: [] },
          visible: true,
          inputSchema: [],
          userInputs: {},
          createdAt: Date.now()
        }];
      }
    } catch {}
    return [];
  });

  const [editingIndicator, setEditingIndicator] = useState<ActivePineIndicator | null>(null);
  const [editorInitialCode, setEditorInitialCode] = useState<string | null>(null);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);

  const [isCompilingPine, setIsCompilingPine] = useState(false);
  const [pineStatusMessage, setPineStatusMessage] = useState<string | null>(null);
  const [pineStatusType, setPineStatusType] = useState<'success' | 'error' | null>(null);

  const cleanSymbol = trade.symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const precision = getSymbolPrecision(cleanSymbol);

  // Sync canvas overlay models from indicators list
  const syncGlobalOverlayModels = (indicators: ActivePineIndicator[]) => {
    activePineOverlayModels = indicators
      .filter(i => i.visible && i.model && i.model.overlay)
      .map(i => i.model);

    syncHtfRightOffset(currentKLineChartInstance, activePineOverlayModels);

    try {
      const toSave = indicators.map(i => ({
        id: i.id,
        title: i.title,
        code: i.code,
        visible: i.visible,
        inputSchema: i.inputSchema,
        userInputs: i.userInputs,
        createdAt: i.createdAt
      }));
      localStorage.setItem('kline_active_pine_indicators_v2', JSON.stringify(toSave));
    } catch {}
  };

  // Repaint KLine chart
  const triggerChartRedraw = () => {
    if (currentKLineChartInstance && typeof currentKLineChartInstance.applyNewData === 'function') {
      try {
        syncHtfRightOffset(currentKLineChartInstance);
        const curData = currentKLineChartInstance.getDataList();
        if (curData && curData.length > 0) {
          currentKLineChartInstance.applyNewData(curData);
        }
      } catch {}
    }
  };

  // Helper to extract recent candles window for fast execution
  const getCandlesWindow = (candleList: Candle[], targetIndex?: number, maxBars = 500) => {
    const limit = targetIndex !== undefined && targetIndex >= 0 ? targetIndex + 1 : candleList.length;
    const startIdx = Math.max(0, limit - maxBars);
    const subset = candleList.slice(startIdx, limit);
    const bars = subset.map(c => ({
      time: c.time * 1000,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume || c.tick_volume || 0)
    })).sort((a, b) => a.time - b.time);
    return { bars, startIdx };
  };

  // Execute single script against current candles
  const executeIndicator = async (
    code: string,
    userInputs?: Record<string, any>,
    targetCandles?: Candle[],
    targetIndex?: number
  ): Promise<PineExecutionResult> => {
    let candleList = targetCandles || candles;

    if (!candleList || candleList.length === 0) {
      const chartApi = (chartProRef.current as any)?._chartApi;
      const chartData = chartApi?.getDataList?.();
      if (chartData && Array.isArray(chartData) && chartData.length > 0) {
        candleList = chartData.map((d: any) => ({
          time: Math.floor(d.timestamp / 1000),
          open: Number(d.open),
          high: Number(d.high),
          low: Number(d.low),
          close: Number(d.close),
          volume: Number(d.volume || 0)
        }));
      }
    }

    if (!candleList || candleList.length === 0) {
      try {
        const res = await fetch(`/api/candles?symbol=${encodeURIComponent(cleanSymbol)}&timeframe=${encodeURIComponent(timeframe)}&all=true`);
        if (res.ok) {
          const json = await res.json();
          if (json.candles && Array.isArray(json.candles) && json.candles.length > 0) {
            candleList = json.candles;
          }
        }
      } catch (err) {
        console.warn('[KLinePine] Fallback candle fetch failed:', err);
      }
    }

    if (!candleList || candleList.length === 0) {
      throw new Error(`No candle data loaded for ${cleanSymbol} (${timeframe}). Please wait for chart bars to load before compiling.`);
    }

    const { bars, startIdx } = getCandlesWindow(candleList, targetIndex);
    return await executePineScript(code, bars, timeframe, cleanSymbol, precision, startIdx, userInputs);
  };

  const handleRunPineScript = async (codeToRun: string) => {
    setIsCompilingPine(true);
    setPineStatusMessage('Compiling Pine Script & executing on replay candles...');
    setPineStatusType(null);

    await new Promise(r => setTimeout(r, 60));

    try {
      const result = await executeIndicator(codeToRun, undefined, candles, currentIndex);
      const title = result.model.title || 'Pine Script';
      const id = `pine_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

      setActiveIndicators(prev => {
        const existingIdx = prev.findIndex(i => i.id === id || i.title === title);
        const newEntry: ActivePineIndicator = {
          id,
          title,
          code: codeToRun,
          model: result.model,
          visible: true,
          inputSchema: result.inputSchema,
          userInputs: result.defaultInputs,
          createdAt: Date.now()
        };

        let updated: ActivePineIndicator[];
        if (existingIdx >= 0) {
          updated = [...prev];
          updated[existingIdx] = newEntry;
        } else {
          updated = [...prev, newEntry];
        }

        syncGlobalOverlayModels(updated);
        return updated;
      });

      triggerChartRedraw();

      const plotsCount = result.model.series?.length || 0;
      const boxesCount = result.model.boxes?.length || 0;
      const linesCount = result.model.lines?.length || 0;
      const tablesCount = result.model.tables?.length || 0;
      const labelsCount = result.model.labels?.length || 0;

      const details = [];
      if (linesCount > 0) details.push(`${linesCount} lines`);
      if (boxesCount > 0) details.push(`${boxesCount} boxes`);
      if (tablesCount > 0) details.push(`${tablesCount} HUD table${tablesCount > 1 ? 's' : ''}`);
      if (labelsCount > 0) details.push(`${labelsCount} labels`);
      if (plotsCount > 0) details.push(`${plotsCount} plots`);

      setPineStatusType('success');
      setPineStatusMessage(`✓ "${title}" added to chart successfully${details.length > 0 ? ` (${details.join(', ')})` : ''}!`);
    } catch (err: any) {
      console.error('[KLinePine] Compilation failed:', err);
      setPineStatusType('error');
      setPineStatusMessage(`Error: ${err.message || 'Script compilation failed'}`);
    } finally {
      setIsCompilingPine(false);
    }
  };

  const handleApplyIndicatorInputs = async (newInputs: Record<string, any>) => {
    if (!editingIndicator) return;
    const targetId = editingIndicator.id;

    try {
      setIsCompilingPine(true);
      setPineStatusMessage(`Applying settings to "${editingIndicator.title}"...`);
      const result = await executeIndicator(
        editingIndicator.code,
        newInputs,
        candles,
        currentIndex
      );

      setActiveIndicators(prev => {
        const updated = prev.map(ind => {
          if (ind.id === targetId) {
            return {
              ...ind,
              model: result.model,
              inputSchema: result.inputSchema,
              userInputs: newInputs
            };
          }
          return ind;
        });
        syncGlobalOverlayModels(updated);
        return updated;
      });

      triggerChartRedraw();
      setPineStatusType('success');
      setPineStatusMessage(`✓ Updated "${editingIndicator.title}" settings!`);
    } catch (err: any) {
      setPineStatusType('error');
      setPineStatusMessage(`Failed to update settings: ${err.message}`);
    } finally {
      setIsCompilingPine(false);
    }
  };

  const handleToggleIndicatorVisibility = (id: string) => {
    setActiveIndicators(prev => {
      const updated = prev.map(ind => ind.id === id ? { ...ind, visible: !ind.visible } : ind);
      syncGlobalOverlayModels(updated);
      triggerChartRedraw();
      return updated;
    });
  };

  const handleRemoveIndicator = (id: string) => {
    setActiveIndicators(prev => {
      const updated = prev.filter(ind => ind.id !== id);
      syncGlobalOverlayModels(updated);
      triggerChartRedraw();
      return updated;
    });
  };

  const handleRemoveAllIndicators = () => {
    setActiveIndicators([]);
    activePineOverlayModels = [];
    activePineSubpaneModel = null;
    localStorage.removeItem('kline_active_pine_indicators_v2');
    localStorage.removeItem('kline_active_pine_code');
    localStorage.removeItem('kline_active_pine_title');

    const chartApi = (chartProRef.current as any)?._chartApi;
    if (chartApi) {
      try {
        const panes = chartApi.getIndicatorByPaneId();
        if (panes) {
          panes.forEach((_: any, paneId: string) => {
            if (paneId !== 'candle_pane') {
              chartApi.removeIndicator(paneId, 'PINETS_SUBPANE');
            }
          });
        }
      } catch {}
      if (typeof chartApi.applyNewData === 'function') {
        chartApi.applyNewData(chartApi.getDataList());
      }
    }

    setPineStatusType('success');
    setPineStatusMessage('All indicators removed from chart');
    setTimeout(() => {
      setPineStatusMessage(null);
      setPineStatusType(null);
    }, 2000);
  };

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
      mainIndicators: ['TRADE_EXECUTIONS', 'PINETS_OVERLAY'],
      subIndicators: [],
      styles: {
        indicator: {
          tooltip: {
            showRule: 'none' as any
          }
        },
        grid: {
          show: false,
          horizontal: {
            show: false,
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
            upColor: '#78C279',
            downColor: '#4E525D',
            noChangeColor: '#888888',
            upBorderColor: '#78C279',
            downBorderColor: '#4E525D',
            noChangeBorderColor: '#888888',
            upWickColor: '#78C279',
            downWickColor: '#4E525D',
            noChangeWickColor: '#888888'
          }
        }
      }
    });

    try {
      chart.setTimezone('America/New_York');
    } catch {}

    chartProRef.current = chart;

    setTimeout(() => {
      syncHtfRightOffset(chart);
      chart.scrollToRealTime();
    }, 120);

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
      syncHtfRightOffset(currentKLineChartInstance);
      datafeedRef.current.emitBar({
        timestamp: currentCandle.time * 1000,
        open: currentCandle.open,
        high: currentCandle.high,
        low: currentCandle.low,
        close: currentCandle.close,
        volume: currentCandle.volume || 0
      });
      if ((isAutoFit || isPlaying) && currentKLineChartInstance) {
        currentKLineChartInstance.scrollToRealTime?.();
      }
    } else if (prevIndex !== currentIndex) {
      // Jumped or scrubbed: apply new visible slice directly to underlying chart
      const subset = candles.slice(0, currentIndex + 1);
      const kLineDataList: KLineData[] = subset.map(c => ({
        timestamp: c.time * 1000,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || c.tick_volume || 0)
      }));

      if (currentKLineChartInstance && typeof currentKLineChartInstance.applyNewData === 'function') {
        syncHtfRightOffset(currentKLineChartInstance);
        currentKLineChartInstance.applyNewData(kLineDataList);
        setTimeout(() => {
          try {
            syncHtfRightOffset(currentKLineChartInstance);
            currentKLineChartInstance.scrollToRealTime();
            currentKLineChartInstance.adjustPaneViewport(false, false, true, true, true);
          } catch {}
        }, 15);
      } else if (chartProRef.current) {
        try {
          const curPeriod = chartProRef.current.getPeriod();
          chartProRef.current.setPeriod({ ...curPeriod });
        } catch {}
      }
    }
  }, [currentIndex, candles]);

  // Re-evaluate all active indicators when replay position changes
  const isEvaluatingPineRef = useRef(false);
  const pendingPineIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (activeIndicators.length === 0 || !candles || candles.length === 0) return;

    const executeAllStep = async (targetIdx?: number) => {
      if (isEvaluatingPineRef.current) {
        pendingPineIndexRef.current = targetIdx ?? null;
        return;
      }
      isEvaluatingPineRef.current = true;

      try {
        const visibleInds = activeIndicators.filter(i => i.visible);
        if (visibleInds.length > 0) {
          const { bars, startIdx } = getCandlesWindow(candles, targetIdx);
          const updatedModels: PineSceneModel[] = [];

          for (const ind of visibleInds) {
            try {
              const res = await executePineScript(
                ind.code,
                bars,
                timeframe,
                cleanSymbol,
                precision,
                startIdx,
                ind.userInputs
              );
              ind.model = res.model;
              if (res.model.overlay) {
                updatedModels.push(res.model);
              }
            } catch (e) {
              console.warn(`[KLinePine] Eval error for ${ind.title}:`, e);
            }
          }

          activePineOverlayModels = updatedModels;
          syncHtfRightOffset(currentKLineChartInstance, updatedModels);

          // Dynamically adapt price scale to include HTF candle highs and lows
          let pineMin = Infinity;
          let pineMax = -Infinity;
          for (const m of updatedModels) {
            if (!m) continue;
            if (m.boxes) {
              for (const b of m.boxes) {
                if (Number.isFinite(b.top)) pineMax = Math.max(pineMax, b.top);
                if (Number.isFinite(b.bottom)) pineMin = Math.min(pineMin, b.bottom);
              }
            }
            if (m.lines) {
              for (const l of m.lines) {
                if (Number.isFinite(l.y1)) {
                  pineMin = Math.min(pineMin, l.y1);
                  pineMax = Math.max(pineMax, l.y1);
                }
                if (Number.isFinite(l.y2)) {
                  pineMin = Math.min(pineMin, l.y2);
                  pineMax = Math.max(pineMax, l.y2);
                }
              }
            }
          }
          if (pineMin !== Infinity && pineMax !== -Infinity && currentKLineChartInstance?.overrideIndicator) {
            try {
              currentKLineChartInstance.overrideIndicator({
                name: 'PINETS_OVERLAY',
                minValue: pineMin,
                maxValue: pineMax
              });
            } catch {}
          }

          if ((isAutoFit || isPlaying) && currentKLineChartInstance) {
            try {
              currentKLineChartInstance.scrollToRealTime();
            } catch {}
          }
          triggerChartRedraw();
        }
      } catch (err) {
        console.warn('[KLinePine] Replay eval error:', err);
      } finally {
        isEvaluatingPineRef.current = false;
        if (pendingPineIndexRef.current !== null) {
          const nextIdx = pendingPineIndexRef.current;
          pendingPineIndexRef.current = null;
          executeAllStep(nextIdx);
        }
      }
    };

    if (isPlaying) {
      executeAllStep(currentIndex);
    } else {
      const timer = setTimeout(() => {
        executeAllStep(currentIndex);
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, candles, activeIndicators.length, timeframe, isPlaying]);

  // Initial load evaluation for active indicators
  useEffect(() => {
    if (activeIndicators.length > 0 && candles && candles.length > 0) {
      const visibleInds = activeIndicators.filter(i => i.visible);
      if (visibleInds.length > 0) {
        const { bars, startIdx } = getCandlesWindow(candles, currentIndex);
        Promise.all(
          visibleInds.map(ind =>
            executePineScript(ind.code, bars, timeframe, cleanSymbol, precision, startIdx, ind.userInputs)
              .then(res => {
                ind.model = res.model;
                return res.model;
              })
              .catch(() => null)
          )
        ).then(models => {
          activePineOverlayModels = models.filter((m): m is PineSceneModel => m !== null && !!m.overlay);
          triggerChartRedraw();
        });
      }
    }
  }, [timeframe]);

  return (
    <div className="w-full h-full relative min-w-0 min-h-0 select-none overflow-hidden">
      <div
        ref={containerRef}
        className="w-full h-full min-w-0 min-h-0"
        style={{ minHeight: '400px' }}
      />

      {/* Authentic TradingView Indicator Legend (Picture 1 style: NO bg, NO rounded box) */}
      {activeIndicators.length > 0 && (
        <div className="absolute top-9 left-12 z-20 flex flex-col gap-0.5 select-none pointer-events-auto">
          {!isLegendCollapsed && (
            <div className="flex flex-col gap-0.5">
              {activeIndicators.map((ind) => (
                <div
                  key={ind.id}
                  className="group flex items-center gap-1.5 py-0.5 px-0.5 bg-transparent cursor-default"
                >
                  {/* Indicator Title */}
                  <span
                    className={`text-[13px] font-medium tracking-normal transition-colors select-none ${
                      ind.visible
                        ? 'text-[#D1D4DC] hover:text-white'
                        : 'text-[#787B86]'
                    }`}
                    title={ind.title}
                  >
                    {ind.title}
                  </span>

                  {/* If indicator is hidden and not hovered, show the EyeOff icon permanently (like Picture 1) */}
                  {!ind.visible && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleIndicatorVisibility(ind.id);
                      }}
                      className="group-hover:hidden text-[#787B86] hover:text-[#D1D4DC] transition-colors p-0.5"
                      title="Show indicator"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Action Icons (TradingView hover buttons: Eye, Settings ⚙️, Code {}, Remove ✕) */}
                  <div className="hidden group-hover:flex items-center gap-1 transition-opacity">
                    {/* Visibility Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleIndicatorVisibility(ind.id);
                      }}
                      className="text-[#787B86] hover:text-[#D1D4DC] transition-colors p-0.5"
                      title={ind.visible ? "Hide indicator" : "Show indicator"}
                    >
                      {ind.visible ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-[#787B86]" />
                      )}
                    </button>

                    {/* Settings Gear ⚙️ -> TradingView Indicator Settings Modal */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingIndicator(ind);
                      }}
                      className="text-[#787B86] hover:text-[#D1D4DC] transition-colors p-0.5"
                      title="Settings"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>

                    {/* View / Edit Code in Studio */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditorInitialCode(ind.code);
                        setIsPineModalOpen(true);
                      }}
                      className="text-[#787B86] hover:text-[#D1D4DC] transition-colors p-0.5"
                      title="Source code"
                    >
                      <Code className="w-3.5 h-3.5" />
                    </button>

                    {/* Remove Indicator ✕ */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveIndicator(ind.id);
                      }}
                      className="text-[#787B86] hover:text-red-400 transition-colors p-0.5"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TradingView Collapse / Expand Chevron (shown in Picture 1) */}
          <button
            type="button"
            onClick={() => setIsLegendCollapsed(!isLegendCollapsed)}
            className="w-5 h-5 flex items-center justify-center text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]/40 rounded transition-colors"
            title={isLegendCollapsed ? "Show indicator list" : "Hide indicator list"}
          >
            {isLegendCollapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      )}

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
          onOpenPineEditor={() => {
            setEditorInitialCode(null);
            setIsPineModalOpen(true);
          }}
          hasActivePine={activeIndicators.length > 0}
        />,
        portalHost
      )}

      {/* TradingView Authentic Indicator Settings Modal */}
      {editingIndicator && (
        <TradingViewIndicatorSettingsModal
          isOpen={true}
          title={editingIndicator.title}
          inputSchema={editingIndicator.inputSchema}
          currentInputs={editingIndicator.userInputs}
          onClose={() => setEditingIndicator(null)}
          onApply={handleApplyIndicatorInputs}
        />
      )}

      {/* TradingView Authentic "Auto" [A] and "Log" [L] buttons on bottom-right price scale */}
      <div
        className="absolute bottom-1 right-14 z-20 flex items-center gap-0.5 bg-[#1E222D]/95 border border-[#2A2E39] rounded px-0.5 py-0.5 shadow-md select-none"
        title="Scale options"
      >
        <button
          type="button"
          onClick={handleAutoFit}
          className={`w-4 h-4 flex items-center justify-center rounded text-[10px] font-bold font-mono transition-all ${
            isAutoFit
              ? 'bg-[#2962FF] text-white shadow-sm'
              : 'text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]'
          }`}
          title="Auto (fits data to screen) [Alt+A]"
        >
          A
        </button>
        <button
          type="button"
          onClick={handleToggleLog}
          className={`w-4 h-4 flex items-center justify-center rounded text-[10px] font-bold font-mono transition-all ${
            isLogScale
              ? 'bg-[#2962FF] text-white shadow-sm'
              : 'text-[#787B86] hover:text-[#D1D4DC] hover:bg-[#2A2E39]'
          }`}
          title="Toggle logarithmic scale"
        >
          L
        </button>
      </div>

      {/* Pine Script Indicator Studio Modal */}
      <KLinePineModal
        isOpen={isPineModalOpen}
        onClose={() => {
          setIsPineModalOpen(false);
          setEditorInitialCode(null);
        }}
        onRunScript={handleRunPineScript}
        onRemoveScript={handleRemoveAllIndicators}
        hasActiveIndicator={activeIndicators.length > 0}
        activeIndicatorTitle={activeIndicators.map(i => i.title).join(', ') || null}
        isCompiling={isCompilingPine}
        statusMessage={pineStatusMessage}
        statusType={pineStatusType}
        initialCode={editorInitialCode}
      />
    </div>
  );
});

KLineReplayChart.displayName = 'KLineReplayChart';
