import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts';
import { Trade } from '../../types';
import { Candle } from './TradingViewReplayChart';

interface Props {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  trade: Trade;
  candles: Candle[];
  currentSlice: Candle[];
  precision: number;
  isLight: boolean;
}

export const MT5TradeOverlay: React.FC<Props> = ({
  chart,
  series,
  trade,
  candles,
  currentSlice,
  precision,
  isLight
}) => {
  const [, setTrigger] = useState<number>(0);
  const [hovered, setHovered] = useState<boolean>(false);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastCoordsRef = useRef<{ entryX: number; entryY: number; endX: number; endY: number } | null>(null);

  // Force re-render on chart zoom/pan/scroll with RAF to stay smooth
  const recompute = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      setTrigger(t => t + 1);
    });
  }, []);

  useEffect(() => {
    if (!chart) return;
    chart.timeScale().subscribeVisibleLogicalRangeChange(recompute);
    chart.timeScale().subscribeVisibleTimeRangeChange(recompute);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(recompute);
        chart.timeScale().unsubscribeVisibleTimeRangeChange(recompute);
      } catch {}
    };
  }, [chart, recompute]);

  if (!chart || !series || candles.length === 0 || currentSlice.length === 0) {
    if (lastCoordsRef.current) {
      // Keep displaying previous coords while new candles load during timeframe shift
    } else {
      return null;
    }
  }

  const isBuy = trade.direction === 'BUY';
  const isWin = trade.netProfit > 0;
  const isCent = trade.isCent || trade.accountCurrency === 'USC';
  const displayProfit = isCent ? trade.netProfit * 100 : trade.netProfit;

  const entrySec = Math.floor(new Date(trade.openTime).getTime() / 1000);
  const exitSec = trade.closeTime ? Math.floor(new Date(trade.closeTime).getTime() / 1000) : entrySec;

  // Find closest candles in full history
  let closestEntryCandle = candles[0];
  let minEntryDiff = candles[0] ? Math.abs(candles[0].time - entrySec) : 0;
  for (const c of candles) {
    const diff = Math.abs(c.time - entrySec);
    if (diff < minEntryDiff) {
      minEntryDiff = diff;
      closestEntryCandle = c;
    }
  }

  let closestExitCandle = candles[0];
  let minExitDiff = candles[0] ? Math.abs(candles[0].time - exitSec) : 0;
  for (const c of candles) {
    const diff = Math.abs(c.time - exitSec);
    if (diff < minExitDiff) {
      minExitDiff = diff;
      closestExitCandle = c;
    }
  }

  // Check if entry and exit are reached in current replay slice
  const isEntryReached = currentSlice.some(c => c.time >= (closestEntryCandle?.time ?? entrySec));
  const isExitReached = currentSlice.some(c => c.time >= (closestExitCandle?.time ?? exitSec));
  const currentCandle = currentSlice[currentSlice.length - 1];

  if (!isEntryReached && !lastCoordsRef.current) {
    return null;
  }

  // Convert Time & Price to Pixel Coordinates
  const rawEntryX = closestEntryCandle ? chart.timeScale().timeToCoordinate(closestEntryCandle.time as UTCTimestamp) : null;
  const entryY = series.priceToCoordinate(trade.openPrice);

  let rawEndX: number | null = null;
  let endY: number | null = null;

  if (isExitReached && closestExitCandle) {
    rawEndX = chart.timeScale().timeToCoordinate(closestExitCandle.time as UTCTimestamp);
    endY = series.priceToCoordinate(trade.closePrice || closestExitCandle.close);
  } else if (currentCandle) {
    rawEndX = chart.timeScale().timeToCoordinate(currentCandle.time as UTCTimestamp);
    endY = series.priceToCoordinate(currentCandle.close);
  }

  // If timeScale calculation is mid-frame or in-between, fall back to cached coordinates
  let finalEntryX = rawEntryX;
  let finalEntryY = entryY;
  let finalEndX = rawEndX;
  let finalEndY = endY;

  if (finalEntryX !== null && finalEntryY !== null && finalEndX !== null && finalEndY !== null) {
    lastCoordsRef.current = {
      entryX: finalEntryX,
      entryY: finalEntryY,
      endX: finalEndX,
      endY: finalEndY
    };
  } else if (lastCoordsRef.current) {
    finalEntryX = lastCoordsRef.current.entryX;
    finalEntryY = lastCoordsRef.current.entryY;
    finalEndX = lastCoordsRef.current.endX;
    finalEndY = lastCoordsRef.current.endY;
  } else {
    return null;
  }

  // If trade opened and closed within the exact same candle bar, apply a slight horizontal offset
  const isSameBar = isExitReached && Math.abs(finalEntryX - finalEndX) < 8;
  const entryX = isSameBar ? finalEntryX - 4.5 : finalEntryX;
  const endX = isSameBar ? finalEndX + 4.5 : finalEndX;

  // Authentic MT5 Colors
  const buyColor = '#0084FF';  // MT5 Sky Blue
  const sellColor = '#E11D48'; // MT5 Crimson Red
  const lineColor = isBuy ? '#0084FF' : '#E11D48';

  const entryColor = isBuy ? buyColor : sellColor;
  const exitColor = isBuy ? sellColor : buyColor;

  return (
    <svg
      className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-10"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        {/* Drop shadow filter for MT5 Tooltip badge */}
        <filter id="mt5Shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* 1. MT5 Dashed Execution Trendline connecting Entry to Exit / Current Replay Bar */}
      <g
        className="pointer-events-auto cursor-pointer"
        onMouseEnter={() => {
          setHovered(true);
          setMousePos({ x: (entryX + endX) / 2, y: (entryY + endY) / 2 });
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
          if (rect) {
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }
        }}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Thick invisible hover target for easy mouseover */}
        <line
          x1={entryX}
          y1={entryY}
          x2={endX}
          y2={endY}
          stroke="transparent"
          strokeWidth={16}
        />
        {/* Authentic MT5 Dashed Trendline */}
        <line
          x1={entryX}
          y1={entryY}
          x2={endX}
          y2={endY}
          stroke={lineColor}
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />
      </g>

      {/* 2. MT5 Entry Marker (Horizontal Notch + Triangle Arrow) */}
      <g
        className="pointer-events-auto cursor-pointer"
        onMouseEnter={() => {
          setHovered(true);
          setMousePos({ x: entryX, y: entryY });
        }}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Horizontal Price Notch at openPrice */}
        <line
          x1={entryX - 6}
          y1={entryY}
          x2={entryX + 6}
          y2={entryY}
          stroke={entryColor}
          strokeWidth={2}
          strokeLinecap="square"
        />

        {/* Small Triangle Arrow pointing to Entry Price */}
        {isBuy ? (
          // Blue Upward Arrow ▲ pointing UP at entry notch from below
          <polygon
            points={`${entryX},${entryY + 2} ${entryX - 4},${entryY + 8} ${entryX + 4},${entryY + 8}`}
            fill={buyColor}
            stroke="#FFFFFF"
            strokeWidth={0.5}
          />
        ) : (
          // Red Downward Arrow ▼ pointing DOWN at entry notch from above
          <polygon
            points={`${entryX},${entryY - 2} ${entryX - 4},${entryY - 8} ${entryX + 4},${entryY - 8}`}
            fill={sellColor}
            stroke="#FFFFFF"
            strokeWidth={0.5}
          />
        )}
      </g>

      {/* 3. MT5 Exit Marker (Horizontal Notch + Triangle Arrow) when exit is reached */}
      {isExitReached && (
        <g
          className="pointer-events-auto cursor-pointer"
          onMouseEnter={() => {
            setHovered(true);
            setMousePos({ x: endX, y: endY });
          }}
          onMouseLeave={() => setHovered(false)}
        >
          {/* Horizontal Price Notch at closePrice */}
          <line
            x1={endX - 6}
            y1={endY}
            x2={endX + 6}
            y2={endY}
            stroke={exitColor}
            strokeWidth={2}
            strokeLinecap="square"
          />

          {/* Small Triangle Arrow at Exit */}
          {isBuy ? (
            // Red Downward Arrow ▼ pointing DOWN at exit notch from above
            <polygon
              points={`${endX},${endY - 2} ${endX - 4},${endY - 8} ${endX + 4},${endY - 8}`}
              fill={sellColor}
              stroke="#FFFFFF"
              strokeWidth={0.5}
            />
          ) : (
            // Blue Upward Arrow ▲ pointing UP at exit notch from below
            <polygon
              points={`${endX},${endY + 2} ${endX - 4},${endY + 8} ${endX + 4},${endY + 8}`}
              fill={buyColor}
              stroke="#FFFFFF"
              strokeWidth={0.5}
            />
          )}
        </g>
      )}

      {/* 4. MT5 Floating Trade Tooltip on Hover */}
      {hovered && mousePos && (
        <g transform={`translate(${Math.max(10, Math.min(mousePos.x - 70, window.innerWidth - 200))}, ${Math.max(10, mousePos.y - 75)})`}>
          <rect
            width={165}
            height={66}
            rx={5}
            fill="#1E293B"
            stroke="#334155"
            strokeWidth={1}
            filter="url(#mt5Shadow)"
            opacity={0.96}
          />
          <text x={8} y={15} fill="#94A3B8" fontSize={9.5} fontFamily="monospace" fontWeight="bold">
            #{trade.ticket || trade.id} • <tspan fill={isBuy ? '#60A5FA' : '#F87171'}>{trade.direction}</tspan> {trade.lotSize || trade.lots} lots
          </text>
          <text x={8} y={30} fill="#E2E8F0" fontSize={9.5} fontFamily="monospace">
            Open: <tspan fill="#38BDF8" fontWeight="bold">{trade.openPrice.toFixed(precision)}</tspan>
          </text>
          <text x={8} y={44} fill="#E2E8F0" fontSize={9.5} fontFamily="monospace">
            Close: <tspan fill="#38BDF8" fontWeight="bold">{trade.closePrice ? trade.closePrice.toFixed(precision) : 'Open'}</tspan>
          </text>
          <text x={8} y={58} fill={isWin ? '#4ADE80' : trade.netProfit < 0 ? '#F87171' : '#94A3B8'} fontSize={10} fontFamily="monospace" fontWeight="bold">
            Profit: {isWin ? '+' : ''}${displayProfit.toFixed(2)} ({trade.pips >= 0 ? '+' : ''}{trade.pips} p)
          </text>
        </g>
      )}
    </svg>
  );
};
