import React from 'react';
import { Eye, Settings, X, Flame } from 'lucide-react';
import { Trade } from '../../types';

interface Props {
  trade: Trade;
  hoveredCandle: {
    time: string;
    open: string;
    high: string;
    low: string;
    close: string;
  } | null;
  lastCandle: {
    open: number;
    high: number;
    low: number;
    close: number;
  } | null;
  timeframe: string;
  precision: number;
  isDarkTheme?: boolean;
}

export const TradingViewLegend: React.FC<Props> = ({
  trade,
  hoveredCandle,
  lastCandle,
  timeframe,
  precision,
  isDarkTheme = true
}) => {
  // Determine current display quote (hovered candle or latest replay candle)
  const openVal = hoveredCandle ? parseFloat(hoveredCandle.open) : lastCandle?.open || trade.openPrice;
  const highVal = hoveredCandle ? parseFloat(hoveredCandle.high) : lastCandle?.high || trade.openPrice;
  const lowVal = hoveredCandle ? parseFloat(hoveredCandle.low) : lastCandle?.low || trade.openPrice;
  const closeVal = hoveredCandle ? parseFloat(hoveredCandle.close) : lastCandle?.close || trade.closePrice || trade.openPrice;

  const change = closeVal - openVal;
  const percentChange = openVal ? (change / openVal) * 100 : 0;
  const isUp = change >= 0;

  // Simulate authentic bid/ask quotes based on current price
  const spreadPts = trade.symbol.includes('XAU') ? 18 : trade.symbol.includes('JPY') ? 12 : 8;
  const spreadUnit = precision === 5 ? 0.00001 : precision === 3 ? 0.001 : 0.01;
  const bidPrice = closeVal;
  const askPrice = closeVal + spreadPts * spreadUnit;

  const getSymbolFullName = (symbol: string) => {
    const s = symbol.toUpperCase();
    if (s.includes('XAU') || s.includes('GOLD')) return 'Gold / U.S. Dollar';
    if (s === 'EURUSD') return 'Euro / U.S. Dollar';
    if (s === 'GBPUSD') return 'British Pound / U.S. Dollar';
    if (s === 'USDJPY') return 'U.S. Dollar / Japanese Yen';
    if (s === 'USOIL') return 'Crude Oil WTI';
    if (s.includes('NAS') || s.includes('USTEC')) return 'US Tech 100';
    if (s.includes('BTC')) return 'Bitcoin / U.S. Dollar';
    return `${symbol} · Spot`;
  };

  const exchangeName = trade.accountServer?.includes('Exness') ? 'Exness MT5' : 'MetaTrader 5';

  return (
    <div className="absolute top-2 left-3 z-20 pointer-events-auto select-none space-y-1">
      {/* 1. Symbol Title Line with Settings & Visibility Icons */}
      <div className="flex items-center gap-2 flex-wrap text-xs font-sans">
        {/* Symbol Avatar / Round Icon */}
        <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-[10px] font-black text-black shadow-sm shrink-0">
          {trade.symbol.slice(0, 2)}
        </div>

        {/* Symbol & Exchange */}
        <div className="flex items-center gap-1.5 font-bold">
          <span className={`text-sm tracking-tight ${isDarkTheme ? 'text-[#D1D4DC]' : 'text-[#131722]'}`}>
            {trade.symbol}
          </span>
          <span className={`text-[11px] font-normal ${isDarkTheme ? 'text-[#787B86]' : 'text-[#787B86]'}`}>
            · {timeframe.toUpperCase()} · {exchangeName}
          </span>
        </div>

        {/* Quick Legend Actions */}
        <div className="hidden sm:flex items-center gap-1 text-[#787B86] hover:text-[#D1D4DC] transition-colors ml-1">
          <button className="p-0.5 hover:text-white rounded" title="Toggle Symbol Visibility">
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button className="p-0.5 hover:text-white rounded" title="Symbol Settings">
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. OHLC Readout & Change Percent */}
      <div className="flex items-center gap-3 text-[11px] font-mono flex-wrap">
        <span className={isDarkTheme ? 'text-[#787B86]' : 'text-[#787B86]'}>
          O <strong className={isDarkTheme ? 'text-[#D1D4DC]' : 'text-[#131722]'}>{openVal.toFixed(precision)}</strong>
        </span>
        <span className={isDarkTheme ? 'text-[#787B86]' : 'text-[#787B86]'}>
          H <strong className={isDarkTheme ? 'text-[#D1D4DC]' : 'text-[#131722]'}>{highVal.toFixed(precision)}</strong>
        </span>
        <span className={isDarkTheme ? 'text-[#787B86]' : 'text-[#787B86]'}>
          L <strong className={isDarkTheme ? 'text-[#D1D4DC]' : 'text-[#131722]'}>{lowVal.toFixed(precision)}</strong>
        </span>
        <span className={isDarkTheme ? 'text-[#787B86]' : 'text-[#787B86]'}>
          C <strong className={isUp ? 'text-[#089981]' : 'text-[#F23645]'}>{closeVal.toFixed(precision)}</strong>
        </span>
        <span className={`font-bold ${isUp ? 'text-[#089981]' : 'text-[#F23645]'}`}>
          {isUp ? '+' : ''}{change.toFixed(precision)} ({isUp ? '+' : ''}{percentChange.toFixed(2)}%)
        </span>
      </div>

      {/* 3. TradingView Dual Bid / Ask Order Execution Bar (Matching Image 1) */}
      <div className="pt-0.5 flex items-center gap-1">
        {/* Sell Button */}
        <button
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#F23645]/20 hover:bg-[#F23645]/30 text-[#F23645] border border-[#F23645]/30 text-[10px] font-mono font-bold transition-all shadow-sm"
          title="Instant Market Sell"
        >
          <span>{bidPrice.toFixed(precision)}</span>
          <span className="text-[9px] uppercase font-sans">SELL</span>
        </button>

        {/* Spread Pill */}
        <div className="px-1.5 py-0.5 rounded bg-[#1E222D] border border-[#2A2E39] text-[#787B86] text-[9px] font-mono font-bold">
          {spreadPts}
        </div>

        {/* Buy Button */}
        <button
          className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2962FF]/20 hover:bg-[#2962FF]/30 text-[#2962FF] border border-[#2962FF]/30 text-[10px] font-mono font-bold transition-all shadow-sm"
          title="Instant Market Buy"
        >
          <span>{askPrice.toFixed(precision)}</span>
          <span className="text-[9px] uppercase font-sans">BUY</span>
        </button>

        {/* Active Trade Tag */}
        <div className={`ml-2 px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 ${
          trade.direction === 'BUY'
            ? 'bg-[#089981]/15 text-[#089981] border-[#089981]/30'
            : 'bg-[#F23645]/15 text-[#F23645] border-[#F23645]/30'
        }`}>
          <span>{trade.direction}</span>
          <span>{trade.lotSize}L</span>
          {trade.ticket && <span className="opacity-70">#{trade.ticket}</span>}
        </div>
      </div>
    </div>
  );
};
