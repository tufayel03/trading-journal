import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import {
  createChart,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp
} from 'lightweight-charts';
import { Trade } from '../../types';
import { ChartDrawing, DrawingToolType } from './TradingViewDrawingTypes';
import { TradingViewDrawingToolbar } from './TradingViewDrawingToolbar';
import { TradingViewDrawingLayer } from './TradingViewDrawingLayer';

export interface Candle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TradingViewReplayChartRef {
  fitContent: () => void;
  scrollToTime: (timestamp: number) => void;
}

export type ChartTheme = 'light' | 'dark' | 'white-hollow';

interface Props {
  candles: Candle[];
  visibleCount: number; // How many candles from the start are currently visible
  trade: Trade;
  theme?: ChartTheme;
  onCrosshairMove?: (candleInfo: { time: string; open: string; high: string; low: string; close: string } | null) => void;
  onScrollNearStart?: (oldestTimestamp: number) => void;
  onOpenGoTo?: () => void;
}

export const getSymbolPrecision = (symbol: string): number => {
  const s = String(symbol || '').toUpperCase().trim();
  if (s.includes('XAU') || s.includes('GOLD') || s.includes('BTC') || s.includes('ETH') || ['META', 'ORCL', 'AAPL', 'TSLA', 'NVDA', 'AMZN', 'MSFT'].includes(s)) {
    return 2;
  }
  if (s.includes('JPY')) {
    return 3;
  }
  // EURUSD, GBPUSD, AUDUSD, NZDUSD, USDCAD, USDCHF etc. -> Minimum 5 digits after dot
  return 5;
};

export const TradingViewReplayChart = forwardRef<TradingViewReplayChartRef, Props>(({
  candles,
  visibleCount,
  trade,
  theme = 'light',
  onCrosshairMove,
  onScrollNearStart,
  onOpenGoTo
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<any[]>([]);

  // State to pass chart/series instance to drawing layer
  const [, setChartReady] = useState<number>(0);

  // Drawing Tools State
  const [activeTool, setActiveTool] = useState<DrawingToolType>('cursor');
  const [activeColor, setActiveColor] = useState<string>('#0284C7');
  const [activeLineWidth, setActiveLineWidth] = useState<number>(2);
  const [isDrawingsVisible, setIsDrawingsVisible] = useState<boolean>(true);

  // Local storage persistence for drawings
  const storageKey = `drawings_${trade.symbol}`;
  const [drawings, setDrawings] = useState<ChartDrawing[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveDrawings = (newDrawings: ChartDrawing[]) => {
    setDrawings(newDrawings);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newDrawings));
    } catch {}
  };

  const handleUndo = () => {
    if (drawings.length > 0) {
      saveDrawings(drawings.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    saveDrawings([]);
  };

  const precision = getSymbolPrecision(trade.symbol);
  const minMove = precision === 5 ? 0.00001 : precision === 3 ? 0.001 : 0.01;

  useImperativeHandle(ref, () => ({
    fitContent: () => {
      chartRef.current?.timeScale().fitContent();
    },
    scrollToTime: (_timestamp: number) => {
      if (!chartRef.current) return;
      chartRef.current.timeScale().scrollToPosition(0, true);
    }
  }));

  // Theme configuration palette
  const isLight = theme === 'light' || theme === 'white-hollow';

  const themeColors = {
    background: isLight ? '#FFFFFF' : '#0B0F19',
    textColor: isLight ? '#131722' : '#9CA3AF',
    gridColor: isLight ? '#F0F3FA' : 'rgba(31, 41, 55, 0.4)',
    borderColor: isLight ? '#E0E3EB' : '#1F2937',
    crosshairLine: isLight ? '#9598A1' : '#6366F1',
    crosshairLabel: isLight ? '#131722' : '#4F46E5',
    // Exact TradingView Custom Colors matching screenshot: Green Bullish & Charcoal Bearish
    upColor: '#78C279',
    upWick: '#78C279',
    upBorder: '#78C279',
    downColor: theme === 'white-hollow' ? '#FFFFFF' : '#4E525D',
    downWick: '#4E525D',
    downBorder: '#4E525D',
    entryLine: isLight ? '#0284C7' : '#06B6D4',
    slLine: isLight ? '#DC2626' : '#EF4444',
    tpLine: isLight ? '#16A34A' : '#10B981'
  };

  // Keyboard Shortcuts for Drawing Tools
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when inside inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v': setActiveTool('cursor'); break;
        case 't': setActiveTool('trendline'); break;
        case 'h': setActiveTool('horizontal'); break;
        case 'r': setActiveTool('ray'); break;
        case 'b': setActiveTool('rectangle'); break;
        case 'f': setActiveTool('fibonacci'); break;
        case 'l': setActiveTool('long_position'); break;
        case 's': setActiveTool('short_position'); break;
        case 'n': setActiveTool('text'); break;
        case 'p': setActiveTool('brush'); break;
        case 'escape': setActiveTool('cursor'); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawings]);

  // Setup Chart Instance
  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous chart instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: themeColors.background },
        textColor: themeColors.textColor,
        fontSize: 11,
        fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      },
      grid: {
        vertLines: { color: themeColors.gridColor },
        horzLines: { color: themeColors.gridColor }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: themeColors.crosshairLine,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: themeColors.crosshairLabel
        },
        horzLine: {
          color: themeColors.crosshairLine,
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: themeColors.crosshairLabel
        }
      },
      rightPriceScale: {
        borderColor: themeColors.borderColor,
        autoScale: true,
        scaleMargins: {
          top: 0.15,
          bottom: 0.15
        },
        alignLabels: true
      },
      timeScale: {
        borderColor: themeColors.borderColor,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 12,
        barSpacing: 10,
        minBarSpacing: 2
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true
      }
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: themeColors.upColor,
      downColor: themeColors.downColor,
      borderVisible: true,
      wickVisible: true,
      borderUpColor: themeColors.upBorder,
      borderDownColor: themeColors.downBorder,
      wickUpColor: themeColors.upWick,
      wickDownColor: themeColors.downWick,
      priceFormat: {
        type: 'price',
        precision: precision,
        minMove: minMove
      }
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = series;
    setChartReady(Date.now());

    // Crosshair move subscription for live OHLC info badge
    chart.subscribeCrosshairMove((param) => {
      if (!onCrosshairMove) return;
      if (!param || !param.time || !param.seriesData.get(series)) {
        onCrosshairMove(null);
        return;
      }

      const data = param.seriesData.get(series) as CandlestickData;
      if (data && data.open !== undefined) {
        const timeVal = typeof param.time === 'number' 
          ? new Date(param.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : String(param.time);

        onCrosshairMove({
          time: timeVal,
          open: Number(data.open).toFixed(precision),
          high: Number(data.high).toFixed(precision),
          low: Number(data.low).toFixed(precision),
          close: Number(data.close).toFixed(precision)
        });
      } else {
        onCrosshairMove(null);
      }
    });

    // Resize observer
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [theme, precision, minMove]);

  // Backward history scroll listener
  useEffect(() => {
    if (!chartRef.current || !onScrollNearStart || candles.length === 0) return;
    
    let isFetching = false;
    const handleRangeChange = (range: any) => {
      if (!range || isFetching) return;
      if (range.from < 30 && candles.length > 0) {
        isFetching = true;
        onScrollNearStart(candles[0].time);
        setTimeout(() => { isFetching = false; }, 3000);
      }
    };

    chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    return () => {
      try {
        chartRef.current?.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      } catch {}
    };
  }, [candles, onScrollNearStart]);

  // Current slice of visible candles
  const currentSlice = candles.slice(0, Math.max(1, visibleCount));

  // Update visible candles, markers, and trade levels
  useEffect(() => {
    if (!chartRef.current || !candlestickSeriesRef.current || candles.length === 0) {
      return;
    }

    if (currentSlice.length === 0) return;

    // 1. Set Candle Data for current visible slice
    const formattedCandles: CandlestickData[] = currentSlice.map(c => ({
      time: c.time as UTCTimestamp,
      open: Number(c.open.toFixed(precision)),
      high: Number(c.high.toFixed(precision)),
      low: Number(c.low.toFixed(precision)),
      close: Number(c.close.toFixed(precision))
    }));
    candlestickSeriesRef.current.setData(formattedCandles);

    // 2. Update Clean Markers (Only crisp arrows on candle)
    const entrySec = Math.floor(new Date(trade.openTime).getTime() / 1000);
    const exitSec = Math.floor(new Date(trade.closeTime).getTime() / 1000);
    
    const markers: any[] = [];
    const isBuy = trade.direction === 'BUY';
    const isWin = trade.netProfit > 0;

    // Check if Entry candle is visible in current slice
    const hasEntryReached = currentSlice.some(c => c.time >= entrySec);
    if (hasEntryReached) {
      let closestEntryCandle = currentSlice[0];
      let minDiff = Math.abs(currentSlice[0].time - entrySec);
      for (const c of currentSlice) {
        const diff = Math.abs(c.time - entrySec);
        if (diff < minDiff) {
          minDiff = diff;
          closestEntryCandle = c;
        }
      }

      markers.push({
        time: closestEntryCandle.time as UTCTimestamp,
        position: isBuy ? 'belowBar' : 'aboveBar',
        color: isBuy ? '#16A34A' : '#DC2626',
        shape: isBuy ? 'arrowUp' : 'arrowDown'
      });
    }

    // Check if Exit candle is reached in current slice
    const hasExitReached = currentSlice.some(c => c.time >= exitSec);
    if (hasExitReached) {
      let closestExitCandle = currentSlice[0];
      let minDiff = Math.abs(currentSlice[0].time - exitSec);
      for (const c of currentSlice) {
        const diff = Math.abs(c.time - exitSec);
        if (diff < minDiff) {
          minDiff = diff;
          closestExitCandle = c;
        }
      }

      markers.push({
        time: closestExitCandle.time as UTCTimestamp,
        position: isBuy ? 'aboveBar' : 'belowBar',
        color: isWin ? '#16A34A' : trade.netProfit < 0 ? '#DC2626' : '#787B86',
        shape: 'circle'
      });
    }

    // Set markers on candle series
    try {
      createSeriesMarkers(candlestickSeriesRef.current, markers);
    } catch {}

    // 3. Update Price Lines (Entry, SL, TP)
    priceLinesRef.current.forEach(pl => {
      try {
        candlestickSeriesRef.current?.removePriceLine(pl);
      } catch {}
    });
    priceLinesRef.current = [];

    if (hasEntryReached && candlestickSeriesRef.current) {
      // Entry Price Line
      const entryLine = candlestickSeriesRef.current.createPriceLine({
        price: trade.openPrice,
        color: themeColors.entryLine,
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `ENTRY (${trade.openPrice.toFixed(precision)})`
      });
      priceLinesRef.current.push(entryLine);

      // Stop Loss Price Line (if set)
      if (trade.stopLoss && trade.stopLoss > 0) {
        const slLine = candlestickSeriesRef.current.createPriceLine({
          price: trade.stopLoss,
          color: themeColors.slLine,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `SL (${trade.stopLoss.toFixed(precision)})`
        });
        priceLinesRef.current.push(slLine);
      }

      // Take Profit Price Line (if set)
      if (trade.takeProfit && trade.takeProfit > 0) {
        const tpLine = candlestickSeriesRef.current.createPriceLine({
          price: trade.takeProfit,
          color: themeColors.tpLine,
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: `TP (${trade.takeProfit.toFixed(precision)})`
        });
        priceLinesRef.current.push(tpLine);
      }
    }

  }, [candles, visibleCount, trade, precision, theme, themeColors.entryLine, themeColors.slLine, themeColors.tpLine]);

  return (
    <div className={`relative w-full h-full min-w-0 min-h-0 select-none overflow-hidden flex ${isLight ? 'bg-white' : 'bg-[#0B0F19]'}`}>
      
      {/* TradingView Docked Left Sidepanel Drawing Toolbar (Matching TradingView Desktop) */}
      <TradingViewDrawingToolbar
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        activeColor={activeColor}
        onChangeColor={setActiveColor}
        activeLineWidth={activeLineWidth}
        onChangeLineWidth={setActiveLineWidth}
        drawingsCount={drawings.length}
        onUndo={handleUndo}
        onClearAll={handleClearAll}
        isVisible={isDrawingsVisible}
        onToggleVisibility={() => setIsDrawingsVisible(!isDrawingsVisible)}
        onOpenGoTo={onOpenGoTo}
        isDarkTheme={!isLight}
      />

      {/* Chart Canvas Area + Interactive Drawing Layer */}
      <div className="flex-1 min-w-0 min-h-0 h-full relative">
        <div ref={containerRef} className="w-full h-full min-w-0 min-h-0" />

        <TradingViewDrawingLayer
          chart={chartRef.current}
          series={candlestickSeriesRef.current}
          trade={trade}
          precision={precision}
          activeTool={activeTool}
          onFinishDrawing={() => setActiveTool('cursor')}
          activeColor={activeColor}
          activeLineWidth={activeLineWidth}
          drawings={drawings}
          onUpdateDrawings={saveDrawings}
          isVisible={isDrawingsVisible}
          isLight={isLight}
          currentSlice={currentSlice}
        />
      </div>

    </div>
  );
});
