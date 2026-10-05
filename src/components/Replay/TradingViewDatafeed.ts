import { Trade } from '../../types';
import { getSymbolPrecision } from './TradingViewReplayChart';

export interface DatafeedCandle {
  time: number; // in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export class TradingViewMT5Datafeed {
  private trade: Trade | null = null;
  private subscribers: Map<string, (bar: any) => void> = new Map();
  private resetCallbacks: Map<string, () => void> = new Map();
  private replayCutoffTimestamp: number | null = null; // in seconds
  private cachedBars: Map<string, DatafeedCandle[]> = new Map();

  constructor(trade?: Trade | null) {
    if (trade) this.trade = trade;
  }

  public setTrade(trade: Trade) {
    this.trade = trade;
    this.cachedBars.clear();
    this.resetCallbacks.forEach(cb => cb());
  }

  public setReplayCutoff(cutoffSec: number | null) {
    this.replayCutoffTimestamp = cutoffSec;
    this.resetCallbacks.forEach(cb => cb());
  }

  public emitNewBar(bar: DatafeedCandle) {
    this.subscribers.forEach(cb => {
      cb({
        time: bar.time * 1000,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume || 0
      });
    });
  }

  private resolutionToTf(resolution: string): string {
    const res = String(resolution).trim().toUpperCase();
    if (res === '1') return '1m';
    if (res === '5') return '5m';
    if (res === '15') return '15m';
    if (res === '30') return '30m';
    if (res === '60' || res === '1H') return '1h';
    if (res === '240' || res === '4H') return '4h';
    if (res === '1D' || res === 'D') return '1d';
    if (res === '1W' || res === 'W') return '1w';
    if (res === '1M' || res === 'M') return '1mn';
    return '5m';
  }

  public onReady(callback: (config: any) => void) {
    setTimeout(() => {
      callback({
        supports_search: false,
        supports_group_request: false,
        supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
        supports_marks: true,
        supports_timescale_marks: true,
        supports_time: true
      });
    }, 0);
  }

  public searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResultReadyCallback: (result: any[]) => void
  ) {
    onResultReadyCallback([]);
  }

  public resolveSymbol(
    symbolName: string,
    onSymbolResolvedCallback: (symbolInfo: any) => void,
    onResolveErrorCallback: (reason: string) => void
  ) {
    const cleanSym = (symbolName || this.trade?.symbol || 'XAUUSD').toUpperCase();
    const precision = getSymbolPrecision(cleanSym);
    const pricescale = Math.pow(10, precision);

    setTimeout(() => {
      onSymbolResolvedCallback({
        name: cleanSym,
        ticker: cleanSym,
        description: `${cleanSym} (MT5 Broker Feed)`,
        type: cleanSym.includes('XAU') || cleanSym.includes('OIL') ? 'commodity' : cleanSym.includes('USD') || cleanSym.includes('EUR') ? 'forex' : 'index',
        session: '24x7',
        timezone: 'Etc/UTC',
        exchange: 'MT5 Direct',
        minmov: 1,
        pricescale: pricescale,
        has_intraday: true,
        has_daily: true,
        has_weekly_and_monthly: true,
        supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
        intraday_multipliers: ['1', '5', '15', '30', '60', '240'],
        volume_precision: 2,
        data_status: 'streaming'
      });
    }, 0);
  }

  public async getBars(
    symbolInfo: any,
    resolution: string,
    periodParams: { from: number; to: number; firstDataRequest: boolean; countBack?: number },
    onHistoryCallback: (bars: any[], meta: { noData: boolean }) => void,
    onErrorCallback: (error: string) => void
  ) {
    const tf = this.resolutionToTf(resolution);
    const sym = symbolInfo.name || this.trade?.symbol || 'XAUUSD';
    const cacheKey = `${sym}_${tf}`;

    try {
      let allCandles = this.cachedBars.get(cacheKey);

      if (!allCandles || periodParams.firstDataRequest) {
        const url = `/api/candles?symbol=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(tf)}&all=true`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            allCandles = data.map((c: any) => ({
              time: Number(c.time),
              open: Number(c.open),
              high: Number(c.high),
              low: Number(c.low),
              close: Number(c.close),
              volume: Number(c.volume || c.tick_volume || 0)
            })).sort((a, b) => a.time - b.time);
            this.cachedBars.set(cacheKey, allCandles);
          }
        }
      }

      if (!allCandles || allCandles.length === 0) {
        onHistoryCallback([], { noData: true });
        return;
      }

      // Filter by replay cutoff if active
      let eligible = allCandles;
      if (this.replayCutoffTimestamp !== null) {
        eligible = eligible.filter(c => c.time <= this.replayCutoffTimestamp!);
      }

      // Filter by requested time window
      const filtered = eligible.filter(c => c.time >= periodParams.from && c.time <= periodParams.to);

      const tvBars = (filtered.length > 0 ? filtered : eligible.slice(-Math.min(periodParams.countBack || 500, eligible.length))).map(c => ({
        time: c.time * 1000, // TradingView expects milliseconds
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 0
      }));

      onHistoryCallback(tvBars, { noData: tvBars.length === 0 });
    } catch (err: any) {
      onErrorCallback(err?.message || 'Failed to fetch historical candles');
    }
  }

  public subscribeBars(
    symbolInfo: any,
    resolution: string,
    onRealtimeCallback: (bar: any) => void,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void
  ) {
    this.subscribers.set(subscriberUID, onRealtimeCallback);
    this.resetCallbacks.set(subscriberUID, onResetCacheNeededCallback);
  }

  public unsubscribeBars(subscriberUID: string) {
    this.subscribers.delete(subscriberUID);
    this.resetCallbacks.delete(subscriberUID);
  }

  public getMarks(
    symbolInfo: any,
    from: number,
    to: number,
    onDataCallback: (marks: any[]) => void,
    resolution: string
  ) {
    if (!this.trade) {
      onDataCallback([]);
      return;
    }

    const marks: any[] = [];
    const entrySec = Math.floor(new Date(this.trade.openTime).getTime() / 1000);
    const exitSec = this.trade.closeTime ? Math.floor(new Date(this.trade.closeTime).getTime() / 1000) : null;
    const isBuy = this.trade.direction === 'BUY';
    const isWin = this.trade.netProfit > 0;

    if (entrySec >= from && entrySec <= to) {
      marks.push({
        id: `entry-${this.trade.id}`,
        time: entrySec,
        color: isBuy ? '#22c55e' : '#f43f5e',
        text: `${this.trade.direction} Entry @ ${this.trade.openPrice}`,
        label: isBuy ? 'BUY' : 'SELL',
        labelFontColor: '#ffffff',
        minSize: 24
      });
    }

    if (exitSec && exitSec >= from && exitSec <= to) {
      marks.push({
        id: `exit-${this.trade.id}`,
        time: exitSec,
        color: isWin ? '#10b981' : '#f43f5e',
        text: `Exit @ ${this.trade.closePrice} (${isWin ? '+' : ''}$${this.trade.netProfit.toFixed(2)})`,
        label: isWin ? 'WIN' : 'LOSS',
        labelFontColor: '#ffffff',
        minSize: 24
      });
    }

    onDataCallback(marks);
  }

  public getServerTime(callback: (serverTime: number) => void) {
    callback(Math.floor(Date.now() / 1000));
  }
}
