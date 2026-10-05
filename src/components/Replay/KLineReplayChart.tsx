import React, { useEffect, useRef } from 'react';
import { KLineChartPro, Datafeed, SymbolInfo, Period, DatafeedSubscribeCallback } from '@klinecharts/pro';
import { KLineData } from 'klinecharts';
import '@klinecharts/pro/dist/klinecharts-pro.css';
import { Trade } from '../../types';
import { getSymbolPrecision } from './TradingViewReplayChart';

interface Props {
  trade: Trade;
  timeframe?: string;
  theme?: 'dark' | 'light';
  currentIndex?: number;
  onTimeframeChange?: (tf: string) => void;
}

export class KLineMT5Datafeed implements Datafeed {
  private trade: Trade;
  private currentReplayCutoff: number | null = null;
  private subscribers: Map<string, DatafeedSubscribeCallback> = new Map();

  constructor(trade: Trade) {
    this.trade = trade;
  }

  public setTrade(trade: Trade) {
    this.trade = trade;
  }

  public setReplayCutoff(cutoffSec: number | null) {
    this.currentReplayCutoff = cutoffSec;
  }

  public emitBar(bar: KLineData) {
    this.subscribers.forEach(cb => cb(bar));
  }

  async searchSymbols(): Promise<SymbolInfo[]> {
    const sym = this.trade.symbol.toUpperCase();
    const precision = getSymbolPrecision(sym);
    return [{
      ticker: sym,
      name: `${sym} MT5 Feed`,
      shortName: sym,
      exchange: 'MT5 Broker',
      market: 'forex',
      pricePrecision: precision,
      volumePrecision: 2
    }];
  }

  async getHistoryKLineData(symbol: SymbolInfo, period: Period): Promise<KLineData[]> {
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
      tf = '1mn';
    }

    const sym = symbol.ticker || this.trade.symbol;
    const url = `/api/candles?symbol=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(tf)}&all=true`;

    try {
      const res = await fetch(url);
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      let rawCandles: any[] = data;
      if (this.currentReplayCutoff !== null) {
        rawCandles = rawCandles.filter(c => c.time <= this.currentReplayCutoff!);
      }

      return rawCandles.map((c: any) => ({
        timestamp: Number(c.time) * 1000,
        open: Number(c.open),
        high: Number(c.high),
        low: Number(c.low),
        close: Number(c.close),
        volume: Number(c.volume || c.tick_volume || 0)
      })).sort((a, b) => a.timestamp - b.timestamp);
    } catch {
      return [];
    }
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

export const KLineReplayChart: React.FC<Props> = ({
  trade,
  timeframe = '5m',
  theme = 'dark',
  onTimeframeChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartProRef = useRef<KLineChartPro | null>(null);
  const datafeedRef = useRef<KLineMT5Datafeed | null>(null);

  const precision = getSymbolPrecision(trade.symbol);

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
    if (raw === '1m' || raw === '1mn') return { multiplier: 1, timespan: 'month', text: '1M' };
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

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous instance
    if (chartProRef.current) {
      containerRef.current.innerHTML = '';
      chartProRef.current = null;
    }

    const datafeed = new KLineMT5Datafeed(trade);
    datafeedRef.current = datafeed;

    const initialSymbol: SymbolInfo = {
      ticker: trade.symbol.toUpperCase(),
      name: `${trade.symbol.toUpperCase()} (MT5)`,
      shortName: trade.symbol.toUpperCase(),
      exchange: 'MT5 Broker',
      market: 'forex',
      pricePrecision: precision,
      volumePrecision: 2
    };

    const initialPeriod = tfToPeriod(timeframe);

    const chart = new KLineChartPro({
      container: containerRef.current,
      symbol: initialSymbol,
      period: initialPeriod,
      periods,
      datafeed,
      theme: theme === 'dark' ? 'dark' : 'light',
      locale: 'en-US',
      drawingBarVisible: true,
      watermark: `${trade.symbol} • ${trade.direction} Trade Replay`,
      mainIndicators: ['MA'],
      subIndicators: ['VOL'],
      styles: {
        grid: {
          show: true,
          horizontal: {
            show: true,
            size: 1,
            color: theme === 'dark' ? '#1F2937' : '#F3F4F6',
            style: 'solid'
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

    chartProRef.current = chart;

    return () => {
      chartProRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [trade.id, trade.symbol, theme]);

  // Sync timeframe when changed from external topbar
  useEffect(() => {
    if (chartProRef.current) {
      const p = tfToPeriod(timeframe);
      chartProRef.current.setPeriod(p);
    }
  }, [timeframe]);

  return (
    <div className="w-full h-full relative min-w-0 min-h-0 select-none overflow-hidden">
      <div 
        ref={containerRef} 
        className="w-full h-full min-w-0 min-h-0" 
        style={{ minHeight: '400px' }}
      />
    </div>
  );
};
