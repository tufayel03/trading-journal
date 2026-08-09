import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { IChartApi, ISeriesApi } from 'lightweight-charts';
import { Trash2, Copy, X } from 'lucide-react';
import { ChartDrawing, DrawingPoint, DrawingToolType } from './TradingViewDrawingTypes';
import { Trade } from '../../types';

interface Props {
  chart: IChartApi | null;
  series: ISeriesApi<'Candlestick'> | null;
  trade: Trade;
  precision: number;
  activeTool: DrawingToolType;
  onFinishDrawing: () => void;
  activeColor: string;
  activeLineWidth: number;
  drawings: ChartDrawing[];
  onUpdateDrawings: (drawings: ChartDrawing[]) => void;
  isVisible: boolean;
  isLight: boolean;
  currentSlice: { time: number; open: number; high: number; low: number; close: number }[];
}

const PRESET_COLORS = [
  '#0284C7', // Sky Blue
  '#10B981', // Emerald Green
  '#EF4444', // Rose Red
  '#F59E0B', // Amber Yellow
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#FFFFFF', // White
  '#1E293B'  // Dark Slate
];

export const TradingViewDrawingLayer: React.FC<Props> = ({
  chart,
  series,
  trade,
  precision,
  activeTool,
  onFinishDrawing,
  activeColor,
  activeLineWidth,
  drawings,
  onUpdateDrawings,
  isVisible,
  isLight,
  currentSlice
}) => {
  const containerRef = useRef<SVGSVGElement>(null);
  const [currentDrawing, setCurrentDrawing] = useState<ChartDrawing | null>(null);
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);
  const [renderTrigger, setRenderTrigger] = useState<number>(0);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 500 });
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number; time: number; price: number } | null>(null);
  const [textInputValue, setTextInputValue] = useState<string>('');

  // Dragging State for Moving Whole Drawing or Endpoints
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    mode: 'move' | 'handle';
    handleIndex?: number;
    drawingId: string;
    startMouseTime: number;
    startMousePrice: number;
    initialPoints: DrawingPoint[];
  } | null>(null);

  // Update layer dimensions on resize
  useEffect(() => {
    if (!containerRef.current?.parentElement) return;
    const updateSize = () => {
      if (containerRef.current?.parentElement) {
        const { clientWidth, clientHeight } = containerRef.current.parentElement;
        setDimensions({ width: clientWidth, height: clientHeight });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef.current.parentElement);
    return () => observer.disconnect();
  }, []);

  // Listen to chart pan / zoom / visible range changes to trigger re-renders of drawing coordinates
  useEffect(() => {
    if (!chart) return;
    const handleRangeChange = () => {
      setRenderTrigger(t => t + 1);
    };

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
    chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);

    return () => {
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handleRangeChange);
      } catch { }
    };
  }, [chart]);

  useEffect(() => {
    setRenderTrigger(t => t + 1);
  }, [currentSlice.length, trade]);

  // Coordinate Conversion Helpers
  const timeToX = useCallback((time: number): number | null => {
    if (!chart) return null;
    const coord = chart.timeScale().timeToCoordinate(time as any);
    if (coord !== null) return coord;

    // Estimate coordinate if off visible scale to prevent disappearing rays/lines
    if (currentSlice.length > 0) {
      const firstCandle = currentSlice[0];
      const lastCandle = currentSlice[currentSlice.length - 1];
      if (time < firstCandle.time) {
        const firstX = chart.timeScale().timeToCoordinate(firstCandle.time as any);
        if (firstX !== null) {
          const avgBarDuration = (lastCandle.time - firstCandle.time) / Math.max(1, currentSlice.length - 1);
          const barsAway = (firstCandle.time - time) / (avgBarDuration || 60);
          return firstX - barsAway * 10;
        }
        return -100;
      }
      if (time > lastCandle.time) {
        const lastX = chart.timeScale().timeToCoordinate(lastCandle.time as any);
        if (lastX !== null) {
          const avgBarDuration = (lastCandle.time - firstCandle.time) / Math.max(1, currentSlice.length - 1);
          const barsAway = (time - lastCandle.time) / (avgBarDuration || 60);
          return lastX + barsAway * 10;
        }
        return dimensions.width + 100;
      }
    }
    return null;
  }, [chart, currentSlice, dimensions.width, renderTrigger]);

  const priceToY = useCallback((price: number): number | null => {
    if (!series) return null;
    const y = series.priceToCoordinate(price);
    return y;
  }, [series, renderTrigger]);

  const xToTime = useCallback((x: number): number => {
    if (!chart) return 0;
    const time = chart.timeScale().coordinateToTime(x) as number;
    if (time) return time;
    if (currentSlice.length > 0) {
      const ratio = Math.max(0, Math.min(1, x / (dimensions.width || 1)));
      const idx = Math.floor(ratio * (currentSlice.length - 1));
      return currentSlice[idx]?.time || currentSlice[0].time;
    }
    return Math.floor(Date.now() / 1000);
  }, [chart, currentSlice, dimensions.width]);

  const yToPrice = useCallback((y: number): number => {
    if (!series) return 0;
    const price = series.coordinateToPrice(y);
    return price !== null ? Number(price.toFixed(precision)) : 0;
  }, [series, precision]);

  // Delete / Escape key handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId && !textInputPos) {
        onUpdateDrawings(drawings.filter(d => d.id !== selectedDrawingId));
        setSelectedDrawingId(null);
      }
      if (e.key === 'Escape') {
        setSelectedDrawingId(null);
        setCurrentDrawing(null);
        setTextInputPos(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, drawings, onUpdateDrawings, textInputPos]);

  // Click outside / Chart click to deselect drawing & dismiss edit toolbar
  useEffect(() => {
    const handleDocumentMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | SVGElement;
      if (!target) return;
      if (target.closest('[data-floating-toolbar]') || target.closest('[data-drawing-element]')) {
        return;
      }
      setSelectedDrawingId(null);
      setTextInputPos(null);
    };

    window.addEventListener('mousedown', handleDocumentMouseDown);
    return () => window.removeEventListener('mousedown', handleDocumentMouseDown);
  }, []);

  // Subscribe to lightweight-charts chart pane click to deselect
  useEffect(() => {
    if (!chart) return;
    const handleChartClick = () => {
      setSelectedDrawingId(null);
    };
    chart.subscribeClick(handleChartClick);
    return () => {
      try {
        chart.unsubscribeClick(handleChartClick);
      } catch { }
    };
  }, [chart]);

  // Start Move whole drawing
  const handleStartMoveDrawing = (drawing: ChartDrawing, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDrawingId(drawing.id);

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mouseTime = xToTime(x);
    const mousePrice = yToPrice(y);

    setDragState({
      isDragging: true,
      mode: 'move',
      drawingId: drawing.id,
      startMouseTime: mouseTime,
      startMousePrice: mousePrice,
      initialPoints: drawing.points.map(p => ({ ...p }))
    });
  };

  // Start Dragging a specific handle point
  const handleStartDragHandle = (drawingId: string, handleIndex: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const drawing = drawings.find(d => d.id === drawingId);
    if (!drawing) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const mouseTime = xToTime(x);
    const mousePrice = yToPrice(y);

    setDragState({
      isDragging: true,
      mode: 'handle',
      handleIndex,
      drawingId,
      startMouseTime: mouseTime,
      startMousePrice: mousePrice,
      initialPoints: drawing.points.map(p => ({ ...p }))
    });
  };

  // Mouse Handlers for Interactive Drawing
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (activeTool === 'cursor') {
      setSelectedDrawingId(null);
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = xToTime(x);
    const price = yToPrice(y);

    if (activeTool === 'text') {
      setTextInputPos({ x, y, time, price });
      setTextInputValue('');
      return;
    }

    if (activeTool === 'horizontal' || activeTool === 'ray') {
      const newDrawing: ChartDrawing = {
        id: 'draw_' + Date.now(),
        type: activeTool,
        points: [{ time, price }],
        color: activeColor,
        lineWidth: activeLineWidth,
        lineStyle: activeTool === 'horizontal' ? 'dashed' : 'solid'
      };
      onUpdateDrawings([...drawings, newDrawing]);
      setSelectedDrawingId(newDrawing.id);
      onFinishDrawing();
      return;
    }

    // Start 2-point or multi-point drawing
    const newDrawing: ChartDrawing = {
      id: 'draw_' + Date.now(),
      type: activeTool,
      points: [{ time, price }],
      color: activeColor,
      fillColor: activeColor + '20',
      lineWidth: activeLineWidth,
      lineStyle: 'solid'
    };

    setCurrentDrawing(newDrawing);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const time = xToTime(x);
    const price = yToPrice(y);

    // 1. Dragging / moving an existing drawing
    if (dragState && dragState.isDragging) {
      const deltaTime = time - dragState.startMouseTime;
      const deltaPrice = price - dragState.startMousePrice;

      if (dragState.mode === 'move') {
        const updated = drawings.map(d => {
          if (d.id !== dragState.drawingId) return d;
          return {
            ...d,
            points: dragState.initialPoints.map(p => ({
              time: p.time + deltaTime,
              price: Number((p.price + deltaPrice).toFixed(precision))
            }))
          };
        });
        onUpdateDrawings(updated);
      } else if (dragState.mode === 'handle' && dragState.handleIndex !== undefined) {
        const updated = drawings.map(d => {
          if (d.id !== dragState.drawingId) return d;
          const newPts = [...d.points];
          newPts[dragState.handleIndex!] = { time, price };
          return {
            ...d,
            points: newPts
          };
        });
        onUpdateDrawings(updated);
      }
      return;
    }

    // 2. Creating a new drawing
    if (currentDrawing) {
      if (currentDrawing.type === 'brush') {
        setCurrentDrawing(prev => prev ? {
          ...prev,
          points: [...prev.points, { time, price }]
        } : null);
      } else {
        setCurrentDrawing(prev => prev ? {
          ...prev,
          points: [prev.points[0], { time, price }]
        } : null);
      }
    }
  };

  const handleMouseUp = () => {
    if (dragState) {
      setDragState(null);
    }

    if (currentDrawing) {
      if (currentDrawing.points.length >= 2 || currentDrawing.type === 'brush') {
        onUpdateDrawings([...drawings, currentDrawing]);
        setSelectedDrawingId(currentDrawing.id);
      }
      setCurrentDrawing(null);
      onFinishDrawing();
    }
  };

  const handleSaveTextNote = () => {
    if (textInputPos && textInputValue.trim() !== '') {
      const newDrawing: ChartDrawing = {
        id: 'draw_' + Date.now(),
        type: 'text',
        points: [{ time: textInputPos.time, price: textInputPos.price }],
        color: activeColor,
        text: textInputValue.trim()
      };
      onUpdateDrawings([...drawings, newDrawing]);
      setSelectedDrawingId(newDrawing.id);
    }
    setTextInputPos(null);
    setTextInputValue('');
    onFinishDrawing();
  };

  const handleDuplicateSelected = () => {
    if (!selectedDrawingId) return;
    const d = drawings.find(x => x.id === selectedDrawingId);
    if (!d) return;
    const newDrawing: ChartDrawing = {
      ...d,
      id: 'draw_' + Date.now(),
      points: d.points.map(p => ({ time: p.time + 300, price: p.price * 1.001 }))
    };
    onUpdateDrawings([...drawings, newDrawing]);
    setSelectedDrawingId(newDrawing.id);
  };

  const handleChangeSelectedColor = (newColor: string) => {
    if (!selectedDrawingId) return;
    onUpdateDrawings(drawings.map(d => d.id === selectedDrawingId ? { ...d, color: newColor, fillColor: newColor + '20' } : d));
  };

  const handleChangeSelectedLineWidth = (newWidth: number) => {
    if (!selectedDrawingId) return;
    onUpdateDrawings(drawings.map(d => d.id === selectedDrawingId ? { ...d, lineWidth: newWidth } : d));
  };

  // Selected Drawing Position for Floating Action Bar
  const selectedDrawing = drawings.find(d => d.id === selectedDrawingId);
  let toolbarX = 100;
  let toolbarY = 100;
  if (selectedDrawing && selectedDrawing.points.length > 0) {
    const px = timeToX(selectedDrawing.points[0].time);
    const py = priceToY(selectedDrawing.points[0].price);
    if (px !== null && py !== null) {
      toolbarX = Math.max(70, Math.min(px, dimensions.width - 240));
      toolbarY = Math.max(60, py - 48);
    }
  }

  // Render a Single Drawing
  const renderDrawing = (d: ChartDrawing, isPreview = false) => {
    if (d.points.length === 0) return null;
    const isSelected = selectedDrawingId === d.id && !isPreview;

    switch (d.type) {
      case 'horizontal': {
        const y = priceToY(d.points[0].price);
        if (y === null) return null;
        return (
          <g key={d.id} data-drawing-element="true">
            {/* Wider transparent hit-box line */}
            <line
              x1={0}
              y1={y}
              x2={dimensions.width}
              y2={y}
              stroke="transparent"
              strokeWidth={14}
              className="cursor-move pointer-events-auto"
              onMouseDown={(e) => handleStartMoveDrawing(d, e)}
            />
            {/* Visual Line */}
            <line
              x1={0}
              y1={y}
              x2={dimensions.width}
              y2={y}
              stroke={d.color}
              strokeWidth={d.lineWidth || 1.5}
              strokeDasharray={d.lineStyle === 'dashed' ? '4,4' : undefined}
              className={isSelected ? 'filter drop-shadow(0 0 4px rgba(2,132,199,0.8))' : ''}
            />
            {/* Center Handle */}
            {isSelected && (
              <circle
                cx={dimensions.width / 2}
                cy={y}
                r={6}
                fill={d.color}
                stroke="#FFFFFF"
                strokeWidth={2}
                className="cursor-ns-resize pointer-events-auto shadow-md"
                onMouseDown={(e) => handleStartDragHandle(d.id, 0, e)}
              />
            )}
            {/* Price Tag Pill on Right Axis */}
            <rect
              x={dimensions.width - 65}
              y={y - 10}
              width={60}
              height={20}
              rx={4}
              fill={d.color}
              className="cursor-move pointer-events-auto shadow-md"
              onMouseDown={(e) => handleStartMoveDrawing(d, e)}
            />
            <text
              x={dimensions.width - 35}
              y={y + 4}
              fill="#FFFFFF"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
              className="pointer-events-none"
            >
              {d.points[0].price.toFixed(precision)}
            </text>
          </g>
        );
      }

      case 'ray': {
        if (d.points.length === 0) return null;
        const x1Raw = timeToX(d.points[0].time);
        const y = priceToY(d.points[0].price);
        if (y === null) return null;

        // If start point is to the left of the screen, start from 0
        const startX = x1Raw !== null ? x1Raw : 0;
        const endX = dimensions.width;

        // Only hide if the start point is entirely off-screen to the right
        if (startX > dimensions.width) return null;

        const visibleStartX = Math.max(0, startX);

        return (
          <g key={d.id} data-drawing-element="true" className="group">
            {/* Wider transparent hit-box line spanning from start point all the way to right edge */}
            <line
              x1={visibleStartX}
              y1={y}
              x2={endX}
              y2={y}
              stroke="transparent"
              strokeWidth={24}
              className="cursor-move pointer-events-auto"
              onMouseDown={(e) => handleStartMoveDrawing(d, e)}
            />
            {/* Visible Horizontal Ray Line extending strictly to right edge */}
            <line
              x1={visibleStartX}
              y1={y}
              x2={endX}
              y2={y}
              stroke={d.color}
              strokeWidth={d.lineWidth || 2}
              strokeDasharray={d.lineStyle === 'dashed' ? '4,4' : d.lineStyle === 'dotted' ? '2,2' : undefined}
              className={`pointer-events-none transition-all ${isSelected ? 'filter drop-shadow(0 0 6px ' + d.color + ')' : ''
                }`}
            />
            {/* Anchor Handle at Start Point (when visible on screen) */}
            {x1Raw !== null && x1Raw >= 0 && x1Raw <= dimensions.width && (
              <circle
                cx={x1Raw}
                cy={y}
                r={isSelected ? 6 : 4.5}
                fill={d.color}
                stroke="#FFFFFF"
                strokeWidth={2}
                className="cursor-crosshair pointer-events-auto shadow-md"
                onMouseDown={(e) => handleStartDragHandle(d.id, 0, e)}
              />
            )}
            {/* Price Tag Pill on Right Axis (TradingView Style) */}
            <rect
              x={dimensions.width - 65}
              y={y - 10}
              width={60}
              height={20}
              rx={4}
              fill={d.color}
              className="cursor-move pointer-events-auto shadow-md"
              onMouseDown={(e) => handleStartMoveDrawing(d, e)}
            />
            <text
              x={dimensions.width - 35}
              y={y + 4}
              fill="#FFFFFF"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
              className="pointer-events-none select-none"
            >
              {d.points[0].price.toFixed(precision)}
            </text>
          </g>
        );
      }

      case 'trendline': {
        if (d.points.length < 2) return null;
        const x1 = timeToX(d.points[0].time);
        const y1 = priceToY(d.points[0].price);
        const x2 = timeToX(d.points[1].time);
        const y2 = priceToY(d.points[1].price);
        if (x1 === null || y1 === null || x2 === null || y2 === null) return null;
        return (
          <g key={d.id} data-drawing-element="true">
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="transparent"
              strokeWidth={14}
              className="cursor-move pointer-events-auto"
              onMouseDown={(e) => handleStartMoveDrawing(d, e)}
            />
            <line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={d.color}
              strokeWidth={d.lineWidth || 2}
              className={isSelected ? 'filter drop-shadow(0 0 4px rgba(2,132,199,0.8))' : ''}
            />
            {isSelected && (
              <>
                <circle
                  cx={x1}
                  cy={y1}
                  r={6}
                  fill={d.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="cursor-crosshair pointer-events-auto shadow-md"
                  onMouseDown={(e) => handleStartDragHandle(d.id, 0, e)}
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r={6}
                  fill={d.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="cursor-crosshair pointer-events-auto shadow-md"
                  onMouseDown={(e) => handleStartDragHandle(d.id, 1, e)}
                />
              </>
            )}
          </g>
        );
      }

      case 'rectangle': {
        if (d.points.length < 2) return null;
        const x1 = timeToX(d.points[0].time);
        const y1 = priceToY(d.points[0].price);
        const x2 = timeToX(d.points[1].time);
        const y2 = priceToY(d.points[1].price);
        if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

        const left = Math.min(x1, x2);
        const top = Math.min(y1, y2);
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);

        return (
          <g key={d.id}>
            <rect
              x={left}
              y={top}
              width={width}
              height={height}
              fill={d.fillColor || d.color + '22'}
              stroke={d.color}
              strokeWidth={d.lineWidth || 1.5}
              rx={2}
              className="cursor-move pointer-events-auto"
              onMouseDown={(e) => handleStartMoveDrawing(d, e)}
            />
            {isSelected && (
              <>
                <circle
                  cx={x1}
                  cy={y1}
                  r={6}
                  fill={d.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="cursor-crosshair pointer-events-auto shadow-md"
                  onMouseDown={(e) => handleStartDragHandle(d.id, 0, e)}
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r={6}
                  fill={d.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="cursor-crosshair pointer-events-auto shadow-md"
                  onMouseDown={(e) => handleStartDragHandle(d.id, 1, e)}
                />
              </>
            )}
          </g>
        );
      }

      case 'fibonacci': {
        if (d.points.length < 2) return null;
        const x1 = timeToX(d.points[0].time);
        const y1 = priceToY(d.points[0].price);
        const x2 = timeToX(d.points[1].time);
        const y2 = priceToY(d.points[1].price);
        if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

        const p1 = d.points[0].price;
        const p2 = d.points[1].price;
        const diff = p2 - p1;

        const fibLevels = [
          { level: 0.0, color: '#787B86' },
          { level: 0.236, color: '#F87171' },
          { level: 0.382, color: '#FBBF24' },
          { level: 0.500, color: '#34D399' },
          { level: 0.618, color: '#60A5FA' },
          { level: 0.786, color: '#A78BFA' },
          { level: 1.0, color: '#787B86' }
        ];

        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);

        return (
          <g key={d.id}>
            <rect
              x={left}
              y={Math.min(y1, y2)}
              width={Math.abs(right - left)}
              height={Math.abs(y2 - y1)}
              fill="transparent"
              className="cursor-move pointer-events-auto"
              onMouseDown={(e) => handleStartMoveDrawing(d, e)}
            />
            {fibLevels.map(fib => {
              const fibPrice = p1 + diff * fib.level;
              const fibY = priceToY(fibPrice);
              if (fibY === null) return null;
              return (
                <g key={fib.level}>
                  <line
                    x1={left}
                    y1={fibY}
                    x2={right}
                    y2={fibY}
                    stroke={fib.color}
                    strokeWidth={1.5}
                    strokeDasharray={fib.level === 0 || fib.level === 1 ? undefined : '3,3'}
                  />
                  <text
                    x={left + 5}
                    y={fibY - 4}
                    fill={fib.color}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {(fib.level * 100).toFixed(1)}% ({fibPrice.toFixed(precision)})
                  </text>
                </g>
              );
            })}
            {isSelected && (
              <>
                <circle
                  cx={x1}
                  cy={y1}
                  r={6}
                  fill={d.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="cursor-crosshair pointer-events-auto shadow-md"
                  onMouseDown={(e) => handleStartDragHandle(d.id, 0, e)}
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r={6}
                  fill={d.color}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="cursor-crosshair pointer-events-auto shadow-md"
                  onMouseDown={(e) => handleStartDragHandle(d.id, 1, e)}
                />
              </>
            )}
          </g>
        );
      }

      case 'long_position':
      case 'short_position': {
        if (d.points.length < 2) return null;
        const isLong = d.type === 'long_position';
        const x1 = timeToX(d.points[0].time);
        const y1 = priceToY(d.points[0].price);
        const x2 = timeToX(d.points[1].time);
        const y2 = priceToY(d.points[1].price);
        if (x1 === null || y1 === null || x2 === null || y2 === null) return null;

        const entryPrice = d.points[0].price;
        const targetPrice = d.points[1].price;
        const targetDiff = Math.abs(targetPrice - entryPrice);
        const stopPrice = isLong ? entryPrice - targetDiff / 2 : entryPrice + targetDiff / 2;
        const stopY = priceToY(stopPrice);
        if (stopY === null) return null;

        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const width = Math.max(60, right - left);

        const targetTop = isLong ? Math.min(y1, y2) : y1;
        const targetHeight = Math.abs(y2 - y1);
        const stopTop = isLong ? y1 : Math.min(y1, stopY);
        const stopHeight = Math.abs(stopY - y1);

        return (
          <g key={d.id}>
            {/* Target Green Zone */}
            <rect
              x={left}
              y={targetTop}
              width={width}
              height={targetHeight}
              fill="rgba(16, 185, 129, 0.25)"
              stroke="#10B981"
              strokeWidth={1.5}
              className="cursor-move pointer-events-auto"
              onMouseDown={(e) => handleStartMoveDrawing(d, e)}
            />
            {/* Stop Red Zone */}
            <rect
              x={left}
              y={stopTop}
              width={width}
              height={stopHeight}
              fill="rgba(239, 68, 68, 0.25)"
              stroke="#EF4444"
              strokeWidth={1.5}
              className="cursor-move pointer-events-auto"
              onMouseDown={(e) => handleStartMoveDrawing(d, e)}
            />
            {/* Entry Line */}
            <line x1={left} y1={y1} x2={left + width} y2={y1} stroke="#0284C7" strokeWidth={2} />

            {/* R:R Ratio Badge */}
            <rect
              x={left + width / 2 - 45}
              y={y1 - 10}
              width={90}
              height={20}
              rx={4}
              fill="#1E293B"
              stroke="#0284C7"
              strokeWidth={1}
            />
            <text
              x={left + width / 2}
              y={y1 + 4}
              fill="#38BDF8"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              R:R 2.00
            </text>

            {isSelected && (
              <>
                <circle
                  cx={x1}
                  cy={y1}
                  r={6}
                  fill="#0284C7"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="cursor-move pointer-events-auto shadow-md"
                  onMouseDown={(e) => handleStartDragHandle(d.id, 0, e)}
                />
                <circle
                  cx={x2}
                  cy={y2}
                  r={6}
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth={2}
                  className="cursor-ns-resize pointer-events-auto shadow-md"
                  onMouseDown={(e) => handleStartDragHandle(d.id, 1, e)}
                />
              </>
            )}
          </g>
        );
      }

      case 'brush': {
        if (d.points.length < 2) return null;
        const pts = d.points
          .map(p => {
            const px = timeToX(p.time);
            const py = priceToY(p.price);
            return px !== null && py !== null ? `${px},${py}` : null;
          })
          .filter(Boolean)
          .join(' ');

        if (!pts) return null;
        return (
          <g key={d.id}>
            <polyline
              points={pts}
              fill="none"
              stroke="transparent"
              strokeWidth={14}
              className="cursor-move pointer-events-auto"
              onMouseDown={(e) => handleStartMoveDrawing(d, e)}
            />
            <polyline
              points={pts}
              fill="none"
              stroke={d.color}
              strokeWidth={d.lineWidth || 2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isSelected ? 'filter drop-shadow(0 0 4px rgba(2,132,199,0.8))' : ''}
            />
          </g>
        );
      }

      case 'text': {
        const x = timeToX(d.points[0].time);
        const y = priceToY(d.points[0].price);
        if (x === null || y === null) return null;
        return (
          <g key={d.id} className="cursor-move pointer-events-auto" onMouseDown={(e) => handleStartMoveDrawing(d, e)}>
            <rect
              x={x - 6}
              y={y - 16}
              width={(d.text?.length || 5) * 8 + 16}
              height={24}
              rx={6}
              fill={isLight ? '#F1F5F9' : '#1E293B'}
              stroke={isSelected ? '#0284C7' : d.color}
              strokeWidth={isSelected ? 2 : 1}
              className="shadow-md"
            />
            <text
              x={x + 2}
              y={y + 1}
              fill={isLight ? '#0F172A' : '#F8FAFC'}
              fontSize="11"
              fontWeight="600"
              fontFamily="Inter, sans-serif"
            >
              {d.text}
            </text>
          </g>
        );
      }

      default:
        return null;
    }
  };

  const isDrawingActive = activeTool !== 'cursor';

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* SVG Canvas for Drawings: pointer-events-none in cursor mode so mouse dragging chart is 100% smooth */}
      <svg
        ref={containerRef}
        className={`w-full h-full ${isDrawingActive ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'
          }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Render Saved Drawings */}
        {isVisible && drawings.map(d => renderDrawing(d))}

        {/* Render Live Preview Drawing */}
        {currentDrawing && renderDrawing(currentDrawing, true)}
      </svg>

      {/* Floating Action Toolbar on Selected Drawing (TradingView Style) */}
      {selectedDrawing && !dragState?.isDragging && (
        <div
          data-floating-toolbar="true"
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute z-50 pointer-events-auto flex items-center gap-1.5 p-1 rounded-xl shadow-2xl border backdrop-blur-md transition-all bg-[#111827] border-[#1F2937] text-white"
          style={{ left: `${toolbarX}px`, top: `${toolbarY}px` }}
        >
          {/* Quick Color Picker */}
          <div className="flex items-center gap-1 px-1">
            {PRESET_COLORS.slice(0, 5).map(c => (
              <button
                key={c}
                onClick={() => handleChangeSelectedColor(c)}
                className={`w-4 h-4 rounded-full border transition-transform hover:scale-125 ${selectedDrawing.color === c ? 'ring-2 ring-white scale-110' : 'border-gray-600'
                  }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="w-px h-4 bg-gray-700" />

          {/* Stroke Width */}
          {[1, 2, 3].map(w => (
            <button
              key={w}
              onClick={() => handleChangeSelectedLineWidth(w)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono transition-colors ${(selectedDrawing.lineWidth || 2) === w ? 'bg-emerald-500 text-white' : 'text-gray-400 hover:text-white'
                }`}
            >
              {w}px
            </button>
          ))}

          <div className="w-px h-4 bg-gray-700" />

          {/* Duplicate */}
          <button
            onClick={handleDuplicateSelected}
            className="p-1 text-gray-300 hover:text-white rounded hover:bg-gray-800 transition-colors"
            title="Duplicate Drawing (Ctrl+D)"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* Delete */}
          <button
            onClick={() => {
              onUpdateDrawings(drawings.filter(d => d.id !== selectedDrawingId));
              setSelectedDrawingId(null);
            }}
            className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/20 transition-colors"
            title="Delete Drawing (Del / Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-gray-700" />

          {/* Close / Deselect */}
          <button
            onClick={() => setSelectedDrawingId(null)}
            className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-800 transition-colors"
            title="Close / Deselect (Esc or Click Chart)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Floating Text Note Input Box */}
      {textInputPos && (
        <div
          data-floating-toolbar="true"
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute z-40 bg-white dark:bg-gray-900 p-2 rounded-xl shadow-2xl border border-emerald-500 pointer-events-auto flex items-center gap-1.5"
          style={{ left: `${Math.min(textInputPos.x, dimensions.width - 220)}px`, top: `${Math.max(10, textInputPos.y - 45)}px` }}
        >
          <input
            type="text"
            autoFocus
            value={textInputValue}
            onChange={(e) => setTextInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveTextNote();
              if (e.key === 'Escape') setTextInputPos(null);
            }}
            placeholder="Type note & hit Enter..."
            className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg border focus:outline-none focus:border-emerald-500 w-44"
          />
          <button
            onClick={handleSaveTextNote}
            className="px-2 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold shadow"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};
