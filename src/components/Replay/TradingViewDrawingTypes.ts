export type DrawingToolType = 
  | 'cursor'
  | 'trendline'
  | 'horizontal'
  | 'ray'
  | 'rectangle'
  | 'fibonacci'
  | 'long_position'
  | 'short_position'
  | 'text'
  | 'brush';

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
  extra?: {
    entryPrice?: number;
    tpPrice?: number;
    slPrice?: number;
    riskReward?: number;
    targetPips?: number;
    stopPips?: number;
  };
}
