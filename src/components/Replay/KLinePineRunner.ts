import { PineEngine } from '@luxalgo/vela-pinets';
import { KLineData } from 'klinecharts';

export interface PineSeriesPoint {
  time: number;
  value: number | null;
  color?: string;
}

export interface PineSeries {
  id: string;
  title: string;
  kind?: string;
  points: PineSeriesPoint[];
  style?: {
    color?: string;
    width?: number;
    lineStyle?: 'solid' | 'dashed' | 'dotted';
    base?: number;
  };
}

export interface PineBox {
  id: string;
  xloc?: 'bar_index' | 'bar_time';
  left: number;
  top: number;
  right: number;
  bottom: number;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  text?: string;
  textColor?: string;
  textSize?: string;
  hAlign?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'center' | 'bottom';
  overlay?: boolean;
}

export interface PineLine {
  id: string;
  xloc?: 'bar_index' | 'bar_time';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  width?: number;
  style?: 'solid' | 'dashed' | 'dotted';
  extend?: 'none' | 'left' | 'right' | 'both';
  arrowLeft?: boolean;
  arrowRight?: boolean;
  overlay?: boolean;
}

export interface PineLabel {
  id: string;
  xloc?: 'bar_index' | 'bar_time';
  yloc?: 'price' | 'abovebar' | 'belowbar' | 'top' | 'bottom';
  x: number;
  y: number;
  text?: string;
  color?: string;
  textColor?: string;
  style?: string;
  size?: string;
  textAlign?: 'left' | 'center' | 'right';
  overlay?: boolean;
}

export interface PineFill {
  id: string;
  fromSeriesId?: string;
  toSeriesId?: string;
  color?: string;
  colors?: (string | null)[];
}

export interface PinePriceLine {
  id: string;
  price: number;
  color?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  width?: number;
  title?: string;
}

export interface PineBackground {
  id: string;
  from: number;
  to: number;
  color: string;
}

export interface PineTableCell {
  text?: string;
  textColor?: string;
  bgColor?: string;
  hAlign?: 'left' | 'center' | 'right';
  vAlign?: 'top' | 'center' | 'bottom';
  textSize?: string;
  fontFamily?: string;
  bold?: boolean;
  italic?: boolean;
  width?: number;
  height?: number;
  merged?: boolean;
}

export interface PineTable {
  id: string;
  position?: 'top_left' | 'top_center' | 'top_right' | 'middle_left' | 'middle_center' | 'middle_right' | 'bottom_left' | 'bottom_center' | 'bottom_right';
  columns: number;
  rows: number;
  bgColor?: string;
  frameColor?: string;
  frameWidth?: number;
  borderColor?: string;
  borderWidth?: number;
  cells: (PineTableCell | null)[][];
}

export interface PineSceneModel {
  id: string;
  title: string;
  overlay: boolean;
  series: PineSeries[];
  boxes: PineBox[];
  lines: PineLine[];
  labels: PineLabel[];
  fills: PineFill[];
  priceLines: PinePriceLine[];
  backgrounds: PineBackground[];
  tables?: PineTable[];
}

export interface PineInputSchema {
  key: string;
  title: string;
  type: string;
  defval: any;
  min?: number;
  max?: number;
  step?: number;
  options?: any[];
  group?: string;
  inline?: string;
  tooltip?: string;
}

export interface PineExecutionResult {
  model: PineSceneModel;
  inputSchema: PineInputSchema[];
  defaultInputs: Record<string, any>;
}

// Convert timestamp or bar_index to canvas X coordinate
export function timeToPixelX(
  val: number,
  xloc: string | undefined,
  kLineDataList: KLineData[],
  xAxis: any,
  barSpace: any
): number {
  if (!kLineDataList || kLineDataList.length === 0) return 0;

  const barWidth = (barSpace?.bar || 6) + (barSpace?.gapBar || 2);

  // If xloc is bar_index (or val is a small integer index)
  if (xloc === 'bar_index') {
    const lastIdx = kLineDataList.length - 1;
    const baseIdx = Math.floor(val);
    const frac = val - baseIdx;

    if (val >= 0 && val <= lastIdx) {
      const px = xAxis.convertToPixel(baseIdx);
      if (frac === 0 || baseIdx === lastIdx) return px;
      const nextPx = xAxis.convertToPixel(baseIdx + 1);
      return px + frac * (nextPx - px);
    } else if (val > lastIdx) {
      const lastPx = xAxis.convertToPixel(lastIdx);
      const step = kLineDataList.length > 1
        ? (xAxis.convertToPixel(lastIdx) - xAxis.convertToPixel(lastIdx - 1))
        : barWidth;
      return lastPx + (val - lastIdx) * step;
    } else {
      const firstPx = xAxis.convertToPixel(0);
      const step = kLineDataList.length > 1
        ? (xAxis.convertToPixel(1) - xAxis.convertToPixel(0))
        : barWidth;
      return firstPx + val * step;
    }
  }

  // Otherwise, xloc is bar_time (epoch ms)
  const timeMs = val < 1e11 ? val * 1000 : val;
  const firstBar = kLineDataList[0];
  const lastBar = kLineDataList[kLineDataList.length - 1];

  const intervalMs = kLineDataList.length > 1
    ? Math.max(1, (lastBar.timestamp - firstBar.timestamp) / (kLineDataList.length - 1))
    : 60000;

  if (timeMs <= firstBar.timestamp) {
    const firstPx = xAxis.convertToPixel(0);
    const step = kLineDataList.length > 1
      ? (xAxis.convertToPixel(1) - xAxis.convertToPixel(0))
      : barWidth;
    const diffBars = (timeMs - firstBar.timestamp) / intervalMs;
    return firstPx + diffBars * step;
  }

  if (timeMs >= lastBar.timestamp) {
    const lastIdx = kLineDataList.length - 1;
    const lastPx = xAxis.convertToPixel(lastIdx);
    const step = kLineDataList.length > 1
      ? (xAxis.convertToPixel(lastIdx) - xAxis.convertToPixel(lastIdx - 1))
      : barWidth;
    const diffBars = (timeMs - lastBar.timestamp) / intervalMs;
    return lastPx + diffBars * step;
  }

  // Binary search to find surrounding bars
  let low = 0;
  let high = kLineDataList.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const midTime = kLineDataList[mid].timestamp;
    if (midTime === timeMs) {
      return xAxis.convertToPixel(mid);
    } else if (midTime < timeMs) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const prevIdx = Math.max(0, high);
  const nextIdx = Math.min(kLineDataList.length - 1, low);
  const t1 = kLineDataList[prevIdx].timestamp;
  const t2 = kLineDataList[nextIdx].timestamp;
  const frac = t2 > t1 ? (timeMs - t1) / (t2 - t1) : 0;

  const x1 = xAxis.convertToPixel(prevIdx);
  const x2 = xAxis.convertToPixel(nextIdx);
  return x1 + frac * (x2 - x1);
}

// Convert Pine Script lineStyle string to canvas setLineDash pattern
function applyLineStyle(ctx: CanvasRenderingContext2D, style?: string) {
  if (style === 'dashed') {
    ctx.setLineDash([5, 5]);
  } else if (style === 'dotted') {
    ctx.setLineDash([2, 3]);
  } else {
    ctx.setLineDash([]);
  }
}

// Draw Pine Script scene(s) onto KLineChart canvas (supports multiple indicators simultaneously)
export function drawPineScene(
  modelsInput: PineSceneModel | PineSceneModel[] | null,
  ctx: CanvasRenderingContext2D,
  kLineDataList: KLineData[],
  xAxis: any,
  yAxis: any,
  bounding: any,
  barSpace: any
): boolean {
  if (!modelsInput || !kLineDataList || kLineDataList.length === 0) return true;
  const models = Array.isArray(modelsInput) ? modelsInput : [modelsInput];
  if (models.length === 0) return true;

  for (const model of models) {
    if (!model) continue;
    drawSinglePineScene(model, ctx, kLineDataList, xAxis, yAxis, bounding, barSpace);
  }
  return true;
}

function drawSinglePineScene(
  model: PineSceneModel,
  ctx: CanvasRenderingContext2D,
  kLineDataList: KLineData[],
  xAxis: any,
  yAxis: any,
  bounding: any,
  barSpace: any
) {
  ctx.save();

  const boundW = bounding?.width || ctx.canvas.width;
  const boundH = bounding?.height || ctx.canvas.height;

  // 1. Draw Backgrounds
  if (model.backgrounds && model.backgrounds.length > 0) {
    for (const bg of model.backgrounds) {
      const x1 = timeToPixelX(bg.from, 'bar_time', kLineDataList, xAxis, barSpace);
      const x2 = timeToPixelX(bg.to, 'bar_time', kLineDataList, xAxis, barSpace);
      ctx.fillStyle = bg.color;
      ctx.fillRect(Math.min(x1, x2), 0, Math.abs(x2 - x1), boundH);
    }
  }

  // 2. Draw Fills (between series)
  if (model.fills && model.fills.length > 0 && model.series && model.series.length > 1) {
    const seriesMap = new Map<string, PineSeries>();
    for (const s of model.series) {
      seriesMap.set(s.id, s);
    }

    for (const fill of model.fills) {
      const s1 = fill.fromSeriesId ? seriesMap.get(fill.fromSeriesId) : undefined;
      const s2 = fill.toSeriesId ? seriesMap.get(fill.toSeriesId) : undefined;
      if (s1 && s2 && s1.points.length > 0 && s2.points.length > 0) {
        ctx.fillStyle = fill.color || 'rgba(0, 230, 118, 0.15)';
        ctx.beginPath();
        let started = false;

        // Path forward along s1
        for (const pt of s1.points) {
          if (pt.value !== null && Number.isFinite(pt.value)) {
            const px = timeToPixelX(pt.time, 'bar_time', kLineDataList, xAxis, barSpace);
            const py = yAxis.convertToPixel(pt.value);
            if (!started) {
              ctx.moveTo(px, py);
              started = true;
            } else {
              ctx.lineTo(px, py);
            }
          }
        }

        // Path backward along s2
        for (let i = s2.points.length - 1; i >= 0; i--) {
          const pt = s2.points[i];
          if (pt.value !== null && Number.isFinite(pt.value)) {
            const px = timeToPixelX(pt.time, 'bar_time', kLineDataList, xAxis, barSpace);
            const py = yAxis.convertToPixel(pt.value);
            ctx.lineTo(px, py);
          }
        }

        ctx.closePath();
        ctx.fill();
      }
    }
  }

  // 3. Draw Boxes (HTF candle bodies, FVGs, order blocks, zones)
  if (model.boxes && model.boxes.length > 0) {
    const defaultBarW = (barSpace?.bar || 6);
    for (const box of model.boxes) {
      const x1 = timeToPixelX(box.left, box.xloc, kLineDataList, xAxis, barSpace);
      const x2 = timeToPixelX(box.right, box.xloc, kLineDataList, xAxis, barSpace);
      const y1 = yAxis.convertToPixel(box.top);
      const y2 = yAxis.convertToPixel(box.bottom);

      const rawMinX = Math.min(x1, x2);
      const rawMaxX = Math.max(x1, x2);
      const isSingleBar = Math.abs(rawMaxX - rawMinX) < 1;
      const minX = isSingleBar ? rawMinX - defaultBarW / 2 : rawMinX;
      const w = isSingleBar ? defaultBarW : Math.max(1, rawMaxX - rawMinX);

      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      const h = Math.max(1, maxY - minY);

      // Fill background
      if (box.bgColor && box.bgColor !== 'transparent' && !box.bgColor.endsWith('00')) {
        ctx.fillStyle = box.bgColor;
        ctx.fillRect(minX, minY, w, h);
      }

      // Border outline
      const borderWidth = box.borderWidth ?? 1;
      const strokeColor = (box.borderColor && box.borderColor !== 'transparent' && !box.borderColor.endsWith('00'))
        ? box.borderColor
        : (box.bgColor ? undefined : (box.textColor || '#2962FF'));

      if (borderWidth > 0 && strokeColor && strokeColor !== 'transparent') {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = borderWidth;
        applyLineStyle(ctx, box.borderStyle);
        ctx.strokeRect(minX, minY, w, h);
        ctx.setLineDash([]);
      }

      // Text label inside box
      if (box.text) {
        ctx.save();
        ctx.fillStyle = box.textColor || '#ffffff';
        const fontSize = box.textSize === 'tiny' ? 9 : box.textSize === 'small' ? 10 : box.textSize === 'large' ? 13 : 11;
        ctx.font = `bold ${fontSize}px sans-serif`;

        let textX = minX + w / 2;
        let textAlign: CanvasTextAlign = 'center';
        if (box.hAlign === 'left') {
          textX = minX + 4;
          textAlign = 'left';
        } else if (box.hAlign === 'right') {
          textX = minX + w - 4;
          textAlign = 'right';
        }

        let textY = minY + h / 2;
        let textBaseline: CanvasTextBaseline = 'middle';
        if (box.vAlign === 'top') {
          textY = minY + 4;
          textBaseline = 'top';
        } else if (box.vAlign === 'bottom') {
          textY = maxY - 4;
          textBaseline = 'bottom';
        }

        ctx.textAlign = textAlign;
        ctx.textBaseline = textBaseline;
        ctx.fillText(box.text, textX, textY);
        ctx.restore();
      }
    }
  }

  // 4. Draw Lines (HTF wicks, 50% midpoint lines, trendlines)
  if (model.lines && model.lines.length > 0) {
    for (const line of model.lines) {
      let x1 = timeToPixelX(line.x1, line.xloc, kLineDataList, xAxis, barSpace);
      let x2 = timeToPixelX(line.x2, line.xloc, kLineDataList, xAxis, barSpace);
      const y1 = yAxis.convertToPixel(line.y1);
      const y2 = yAxis.convertToPixel(line.y2);

      // Extend logic
      if (line.extend === 'right' || line.extend === 'both') {
        x2 = boundW;
      }
      if (line.extend === 'left' || line.extend === 'both') {
        x1 = 0;
      }

      ctx.beginPath();
      ctx.strokeStyle = line.color || '#2962FF';
      ctx.lineWidth = line.width || 1;
      applyLineStyle(ctx, line.style);
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // 5. Draw Series Plots (EMA, Supertrend, RSI, etc.)
  if (model.series && model.series.length > 0) {
    for (const s of model.series) {
      if (!s.points || s.points.length === 0) continue;

      const defaultColor = s.style?.color || '#2962FF';
      const lineWidth = s.style?.width || 1.5;
      const isHistogram = s.kind === 'histogram' || s.kind === 'columns';
      const isStep = s.kind === 'step';

      if (isHistogram) {
        const baseY = yAxis.convertToPixel(s.style?.base ?? 0);
        const colW = Math.max(1, (barSpace?.bar || 5) * 0.8);
        for (const pt of s.points) {
          if (pt.value !== null && Number.isFinite(pt.value)) {
            const px = timeToPixelX(pt.time, 'bar_time', kLineDataList, xAxis, barSpace);
            const py = yAxis.convertToPixel(pt.value);
            ctx.fillStyle = pt.color || defaultColor;
            ctx.fillRect(px - colW / 2, Math.min(py, baseY), colW, Math.abs(py - baseY));
          }
        }
      } else {
        // Continuous line or step line
        ctx.lineWidth = lineWidth;
        applyLineStyle(ctx, s.style?.lineStyle);

        let inSegment = false;
        let lastX = 0;
        let lastY = 0;

        for (let i = 0; i < s.points.length; i++) {
          const pt = s.points[i];
          if (pt.value === null || !Number.isFinite(pt.value)) {
            if (inSegment) {
              ctx.stroke();
              inSegment = false;
            }
            continue;
          }

          const px = timeToPixelX(pt.time, 'bar_time', kLineDataList, xAxis, barSpace);
          const py = yAxis.convertToPixel(pt.value);

          if (!inSegment) {
            ctx.beginPath();
            ctx.strokeStyle = pt.color || defaultColor;
            ctx.moveTo(px, py);
            inSegment = true;
          } else {
            if (isStep) {
              ctx.lineTo(px, lastY);
            }
            ctx.lineTo(px, py);
          }

          lastX = px;
          lastY = py;
        }

        if (inSegment) {
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }
    }
  }

  // 6. Draw Price Lines (Horizontal levels like RSI 70/30)
  if (model.priceLines && model.priceLines.length > 0) {
    for (const pl of model.priceLines) {
      const py = yAxis.convertToPixel(pl.price);
      ctx.beginPath();
      ctx.strokeStyle = pl.color || '#888888';
      ctx.lineWidth = pl.width || 1;
      applyLineStyle(ctx, pl.lineStyle || 'dashed');
      ctx.moveTo(0, py);
      ctx.lineTo(boundW, py);
      ctx.stroke();
      ctx.setLineDash([]);

      if (pl.title) {
        ctx.fillStyle = pl.color || '#888888';
        ctx.font = '10px monospace';
        ctx.fillText(pl.title, boundW - 60, py - 3);
      }
    }
  }

  // 7. Draw Labels / Shapes
  if (model.labels && model.labels.length > 0) {
    const occupiedLabels: { x: number; y: number; w: number; h: number }[] = [];

    for (const label of model.labels) {
      const px = timeToPixelX(label.x, label.xloc || 'bar_time', kLineDataList, xAxis, barSpace);
      const py = yAxis.convertToPixel(label.y);
      const color = label.color || '#2962FF';
      const textColor = label.textColor || '#ffffff';

      // Triangle up or down
      if (label.style === 'triangleup' || label.style === 'arrowup') {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py - 4);
        ctx.lineTo(px - 5, py + 6);
        ctx.lineTo(px + 5, py + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (label.style === 'triangledown' || label.style === 'arrowdown') {
        ctx.fillStyle = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py + 4);
        ctx.lineTo(px - 5, py - 6);
        ctx.lineTo(px + 5, py - 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // Text marker or badge
      if (label.text) {
        const rawLines = String(label.text)
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 0);
        if (rawLines.length === 0) continue;

        const fontSize = label.size === 'tiny' ? 9 : label.size === 'small' ? 10 : label.size === 'large' ? 13 : 11;
        const lineHeight = fontSize + 4;
        ctx.font = `bold ${fontSize}px sans-serif`;

        let maxTextW = 0;
        for (const line of rawLines) {
          const w = ctx.measureText(line).width;
          if (w > maxTextW) maxTextW = w;
        }

        const padX = 8;
        const padY = 4;
        const boxW = maxTextW + padX * 2;
        const boxH = rawLines.length * lineHeight + padY * 2;

        let boxX = px - boxW / 2;
        let boxY = py - boxH / 2;

        const isLabelDown = label.style === 'label_down';
        const isLabelUp = label.style === 'label_up';
        const isLabelLeft = label.style === 'label_left';
        const isLabelRight = label.style === 'label_right';

        if (isLabelDown) {
          // Label pointing down at high: floats cleanly above anchor
          boxY = py - boxH - 6;
        } else if (isLabelUp) {
          // Label pointing up at low: floats cleanly below anchor
          boxY = py + 6;
        } else if (isLabelLeft) {
          boxX = px + 6;
        } else if (isLabelRight) {
          boxX = px - boxW - 6;
        }

        // Anti-collision: stack if another label shares the same spot
        for (const occ of occupiedLabels) {
          if (Math.abs(occ.x - boxX) < boxW * 0.75 && Math.abs(occ.y - boxY) < boxH) {
            if (isLabelDown) {
              boxY = occ.y - boxH - 3;
            } else {
              boxY = occ.y + occ.h + 3;
            }
          }
        }
        occupiedLabels.push({ x: boxX, y: boxY, w: boxW, h: boxH });

        ctx.save();

        // Sleek translucent badge for crisp text readability
        const isTransparent = !label.color || label.color === 'transparent' || label.color.endsWith('00');
        const badgeBg = isTransparent ? 'rgba(19, 23, 34, 0.88)' : label.color;
        const badgeBorder = isTransparent ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.3)';

        ctx.fillStyle = badgeBg;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, 4);
        ctx.fill();

        ctx.strokeStyle = badgeBorder;
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
        ctx.shadowBlur = 2;

        let curY = boxY + padY + lineHeight / 2;
        for (const line of rawLines) {
          ctx.fillText(line, boxX + boxW / 2, curY);
          curY += lineHeight;
        }

        ctx.restore();
      }
    }
  }

  // 8. Draw Tables (Session Sweeps Table, HUD panels, stats)
  if (model.tables && model.tables.length > 0) {
    for (const table of model.tables) {
      drawPineTable(table, ctx, boundW, boundH);
    }
  }

  ctx.restore();
}

// Render Pine Script tables (e.g. Session Sweeps Table) on canvas
function drawPineTable(table: PineTable, ctx: CanvasRenderingContext2D, boundW: number, boundH: number) {
  if (!table || !table.cells || table.cells.length === 0) return;

  const rows = table.rows || table.cells.length;
  const cols = table.columns || (table.cells[0]?.length || 0);
  if (rows === 0 || cols === 0) return;

  ctx.save();

  // Dynamically compute column widths
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const colWidths = new Array(cols).fill(72);

  for (let r = 0; r < rows; r++) {
    const row = table.cells[r];
    if (!row) continue;
    for (let c = 0; c < cols; c++) {
      const cell = row[c];
      if (cell && cell.text) {
        const textWidth = ctx.measureText(cell.text).width;
        colWidths[c] = Math.max(colWidths[c], textWidth + 18);
      }
    }
  }

  const rowHeight = 22;
  const tableWidth = colWidths.reduce((a, b) => a + b, 0);
  const tableHeight = rows * rowHeight;

  // Determine table position - keeping clear of right price scale (width ~75px)
  let startX = boundW - tableWidth - 75;
  let startY = 42;

  const pos = table.position || 'top_right';
  if (pos.includes('left')) {
    startX = 55;
  } else if (pos.includes('center')) {
    startX = Math.max(55, (boundW - tableWidth) / 2);
  }

  if (pos.includes('bottom')) {
    startY = boundH - tableHeight - 28;
  } else if (pos.includes('middle')) {
    startY = Math.max(42, (boundH - tableHeight) / 2);
  }

  // Background frame
  const bgCol = table.bgColor || 'rgba(19, 23, 34, 0.94)';
  ctx.fillStyle = bgCol;
  ctx.beginPath();
  ctx.roundRect(startX, startY, tableWidth, tableHeight, 6);
  ctx.fill();

  ctx.strokeStyle = table.frameColor || 'rgba(54, 60, 78, 0.6)';
  ctx.lineWidth = table.frameWidth || 1.5;
  ctx.stroke();

  // Draw cells
  let currentY = startY;
  for (let r = 0; r < rows; r++) {
    const row = table.cells[r];
    let currentX = startX;

    for (let c = 0; c < cols; c++) {
      const cell = row ? row[c] : null;
      const cellW = colWidths[c];
      const cellH = rowHeight;

      if (cell) {
        // Cell background
        if (cell.bgColor && cell.bgColor !== 'transparent' && !cell.bgColor.endsWith('00')) {
          ctx.fillStyle = cell.bgColor;
          ctx.fillRect(currentX, currentY, cellW, cellH);
        }

        // Cell border
        ctx.strokeStyle = table.borderColor || 'rgba(54, 60, 78, 0.4)';
        ctx.lineWidth = table.borderWidth || 0.5;
        ctx.strokeRect(currentX, currentY, cellW, cellH);

        // Cell text
        if (cell.text) {
          ctx.fillStyle = cell.textColor || '#d1d4dc';
          const fontSize = cell.textSize === 'tiny' ? 9 : cell.textSize === 'large' ? 12 : 10;
          ctx.font = `${cell.bold ? 'bold ' : ''}${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

          let textX = currentX + cellW / 2;
          let textAlign: CanvasTextAlign = 'center';
          if (cell.hAlign === 'left') {
            textX = currentX + 6;
            textAlign = 'left';
          } else if (cell.hAlign === 'right') {
            textX = currentX + cellW - 6;
            textAlign = 'right';
          }

          ctx.textAlign = textAlign;
          ctx.textBaseline = 'middle';
          ctx.fillText(cell.text, textX, currentY + cellH / 2);
        }
      }

      currentX += cellW;
    }
    currentY += rowHeight;
  }

  ctx.restore();
}

// Higher-Timeframe candle cache for request.security
const htfCandleCache = new Map<string, any[]>();

// Normalize timeframe for PineTS
export function toVelaTimeframe(tf?: string): string {
  const raw = String(tf || '5m').toLowerCase();
  if (raw === '1m') return '1';
  if (raw === '5m') return '5';
  if (raw === '15m') return '15';
  if (raw === '30m') return '30';
  if (raw === '1h') return '60';
  if (raw === '4h') return '240';
  if (raw === '1d') return 'D';
  if (raw === '1w') return 'W';
  if (raw === '1mn' || raw === '1mon' || raw === '1m-mon' || raw === 'm') return 'M';
  return '5';
}

// In-memory cache for prepared Pine scripts to allow fast ~20ms re-evaluations during replay playback
const preparedEngineCache = new Map<string, { engine: PineEngine; prepared: any }>();

export function clearPineEngineCache() {
  preparedEngineCache.clear();
}

// Execute Pine Script source against OHLCV bars using PineEngine with custom user inputs
export async function executePineScript(
  code: string,
  bars: { time: number; open: number; high: number; low: number; close: number; volume?: number }[],
  timeframe: string,
  symbol: string,
  precision: number = 2,
  offsetBarIndex: number = 0,
  userInputs?: Record<string, any>
): Promise<PineExecutionResult> {
  let engineObj = preparedEngineCache.get(code);
  if (!engineObj) {
    const engine = new PineEngine();
    const instanceId = `kline_pine_${Date.now()}`;
    const prepared = await engine.prepare(code, instanceId);
    engineObj = { engine, prepared };
    preparedEngineCache.set(code, engineObj);
  }
  const { engine, prepared } = engineObj;

  const inputSchema: PineInputSchema[] = (prepared.inputs || []).map((inp: any) => ({
    key: inp.key,
    title: inp.title || inp.key,
    type: inp.type,
    defval: inp.defval,
    min: inp.min,
    max: inp.max,
    step: inp.step,
    options: inp.options,
    group: inp.group,
    inline: inp.inline,
    tooltip: inp.tooltip
  }));

  const defaultInputs: Record<string, any> = {};
  inputSchema.forEach(inp => {
    defaultInputs[inp.key] = inp.defval;
  });

  const mergedInputs = { ...defaultInputs, ...(userInputs || {}) };
  const velaTf = toVelaTimeframe(timeframe);

  return new Promise<PineExecutionResult>((resolve, reject) => {
    let resolvedModel: PineSceneModel | null = null;

    engine.execute({
      prepared,
      bars,
      inputs: mergedInputs,
      mode: 'static',
      market: {
        symbol,
        timeframe: velaTf,
        symbolInfo: {
          ticker: symbol,
          pricescale: Math.pow(10, precision),
          minmov: 1
        }
      },
      fetchSeries: async (sym, tf) => {
        const cacheKey = `${sym}_${tf}_${bars[bars.length - 1]?.time || 0}`;
        if (htfCandleCache.has(cacheKey)) {
          return htfCandleCache.get(cacheKey)!;
        }

        const tfLower = String(tf).toLowerCase();
        const reqTf = (tfLower === 'd' || tfLower === '1d') ? '1d'
          : (tfLower === 'w' || tfLower === '1w') ? '1w'
          : (tfLower === 'm' || tfLower === '1m' || tfLower === '1mn') ? '1mn'
          : `${tf}m`;

        try {
          const res = await fetch(`/api/candles?symbol=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(reqTf)}&all=true`);
          if (res.ok) {
            const json = await res.json();
            if (json.candles && Array.isArray(json.candles) && json.candles.length > 0) {
              const fetchedBars = json.candles.map((c: any) => ({
                time: c.time * 1000,
                open: Number(c.open),
                high: Number(c.high),
                low: Number(c.low),
                close: Number(c.close),
                volume: Number(c.volume || c.tick_volume || 0)
              })).sort((a: any, b: any) => a.time - b.time);

              // Synthesize developing in-progress candle if current chart candles are newer
              if (bars.length > 0) {
                const latestBar = bars[bars.length - 1];
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
                  const currentPeriodBars = bars.filter(b => b.time >= periodStart);
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
                    if (fetchedBars.length === 0 || fetchedBars[fetchedBars.length - 1].time < periodStart) {
                      fetchedBars.push(inProgressCandle);
                    } else if (fetchedBars[fetchedBars.length - 1].time === periodStart) {
                      fetchedBars[fetchedBars.length - 1] = inProgressCandle;
                    }
                  }
                }
              }

              htfCandleCache.set(cacheKey, fetchedBars);
              return fetchedBars;
            }
          }
        } catch (err) {
          console.warn('[PineRunner] Failed to fetch MT5 candles:', err);
        }

        htfCandleCache.set(cacheKey, bars);
        return bars;
      }
    }, {
      onModel: (m: any) => {
        resolvedModel = m as PineSceneModel;
      },
      onDone: () => {
        if (resolvedModel) {
          // Adjust bar_index coordinates if windowed slice was used
          if (offsetBarIndex > 0) {
            if (resolvedModel.boxes) {
              for (const b of resolvedModel.boxes) {
                if (b.xloc === 'bar_index') {
                  b.left += offsetBarIndex;
                  b.right += offsetBarIndex;
                }
              }
            }
            if (resolvedModel.lines) {
              for (const l of resolvedModel.lines) {
                if (l.xloc === 'bar_index') {
                  l.x1 += offsetBarIndex;
                  l.x2 += offsetBarIndex;
                }
              }
            }
            if (resolvedModel.labels) {
              for (const lbl of resolvedModel.labels) {
                if (lbl.xloc === 'bar_index') {
                  lbl.x += offsetBarIndex;
                }
              }
            }
          }
          resolve({
            model: resolvedModel,
            inputSchema,
            defaultInputs
          });
        } else {
          // If no model was produced (e.g., bare script with no plots)
          resolve({
            model: {
              id: instanceId,
              title: prepared.meta.title || 'Pine Script',
              overlay: prepared.meta.overlay ?? true,
              series: [],
              boxes: [],
              lines: [],
              labels: [],
              fills: [],
              priceLines: [],
              backgrounds: []
            },
            inputSchema,
            defaultInputs
          });
        }
      },
      onError: (err: any) => {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  });
}
