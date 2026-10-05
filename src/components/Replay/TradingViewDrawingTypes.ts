export type DrawingToolType = 
  | 'cursor'
  | 'dot'
  | 'arrow_cursor'
  | 'eraser'
  | 'trendline'
  | 'ray'
  | 'info_line'
  | 'horizontal'
  | 'horizontal_ray'
  | 'vertical'
  | 'cross_line'
  | 'fibonacci'
  | 'fib_extension'
  | 'pitchfork'
  | 'rectangle'
  | 'circle'
  | 'ellipse'
  | 'path'
  | 'brush'
  | 'highlighter'
  | 'text'
  | 'anchored_text'
  | 'callout'
  | 'price_label'
  | 'arrow_marker'
  | 'long_position'
  | 'short_position'
  | 'date_range'
  | 'price_range'
  | 'date_price_range'
  | 'measure';

export interface DrawingPoint {
  time: number; // Unix timestamp in seconds
  price: number; // Price level
}

export interface ChartDrawing {
  id: string;
  type: DrawingToolType;
  points: DrawingPoint[];
  color: string;
  fillColor?: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  text?: string;
  isLocked?: boolean;
  extra?: {
    entryPrice?: number;
    tpPrice?: number;
    slPrice?: number;
    riskReward?: number;
    targetPips?: number;
    stopPips?: number;
    bars?: number;
    percentChange?: number;
    priceDiff?: number;
  };
}

export interface DrawingToolCategory {
  id: string;
  name: string;
  icon: string;
  tools: {
    id: DrawingToolType;
    label: string;
    shortcut?: string;
    icon: string;
    description?: string;
  }[];
}
