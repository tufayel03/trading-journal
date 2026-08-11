export type TradeDirection = 'BUY' | 'SELL';

export type TradingSession = 
  | 'ASIAN' 
  | 'LONDON_OPEN' 
  | 'NY_AM' 
  | 'NY_PM' 
  | 'LONDON_CLOSE';

export type TradeEmotion = 
  | 'Disciplined' 
  | 'Greedy' 
  | 'Fearful' 
  | 'Revenge' 
  | 'FOMO'
  | 'Neutral';

export interface Trade {
  id: string;
  ticket?: string;
  symbol: string;
  direction: TradeDirection;
  openTime: string; // ISO string
  closeTime: string; // ISO string
  openPrice: number;
  closePrice: number;
  stopLoss?: number;
  takeProfit?: number;
  lotSize: number;
  netProfit: number; // in USD (normalized)
  nativeNetProfit?: number; // in original account currency (e.g. USC cents)
  pips: number;
  rMultiple?: number;
  commission?: number;
  swap?: number;
  nativeCommission?: number;
  nativeSwap?: number;
  
  // Multi-Account & Currency Tagging
  accountLogin?: string;
  accountServer?: string;
  accountCurrency?: string; // 'USD', 'USC', etc.
  isCent?: boolean;

  // Journaling & Qualitative Data
  session: TradingSession;
  strategy: string;
  confluences: string[];
  mistakes: string[];
  emotions: TradeEmotion;
  notes: string;
  beforeChartUrl?: string;
  afterChartUrl?: string;
  rating?: 1 | 2 | 3 | 4 | 5;
}

export interface PlaybookSetup {
  id: string;
  title: string;
  strategyName: string;
  description: string;
  rules: string[];
  mandatoryConfluences: string[];
  timeframes: string[];
  preferredSessions: TradingSession[];
  exampleBeforeChart?: string;
  exampleAfterChart?: string;
  grade: 'A+' | 'A' | 'B';
  createdAt: string;
}

export interface UserSettings {
  initialBalance: number;
  currency: string;
  defaultRiskPercent: number;
  strategies: string[];
  confluences: string[];
  mistakes: string[];
}

export interface FilterOptions {
  dateRange: 'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_WEEK' | 'TODAY' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  symbol: string;
  session: string;
  strategy: string;
  mistake: string;
  emotion: string;
  direction: 'ALL' | 'BUY' | 'SELL';
  outcome: 'ALL' | 'WIN' | 'LOSS' | 'BREAK_EVEN';
  searchQuery: string;
  account?: string; // 'ALL' or specific account login string
}

export interface KPIStats {
  netProfit: number;
  returnPercent: number;
  totalTrades: number;
  wins: number;
  losses: number;
  breakEvens: number;
  winRate: number; // percentage (0-100)
  profitFactor: number;
  expectancy: number; // $ per trade
  averageWin: number;
  averageLoss: number;
  averageRR: number;
  maxDrawdownAmount: number;
  maxDrawdownPercent: number;
  totalCommission: number;
  totalSwap: number;
  costOfMistakes: number;
  totalPips: number;
}

export interface DailyPnL {
  date: string; // YYYY-MM-DD
  netProfit: number;
  tradesCount: number;
  winsCount: number;
  lossesCount: number;
  winRate: number;
}

export interface MistakeSummary {
  mistake: string;
  count: number;
  totalLoss: number;
}

export interface SessionSummary {
  session: TradingSession;
  label: string;
  tradesCount: number;
  netProfit: number;
  winRate: number;
}

export interface SymbolSummary {
  symbol: string;
  tradesCount: number;
  netProfit: number;
  winRate: number;
}

export interface StrategySummary {
  strategy: string;
  tradesCount: number;
  netProfit: number;
  winRate: number;
  profitFactor: number;
  avgRR: number;
}

export interface OpenPosition {
  ticket: string;
  symbol: string;
  direction: TradeDirection;
  lotSize: number;
  openPrice: number;
  currentPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  profit: number; // in USD (normalized)
  nativeProfit?: number; // in native currency (e.g. USC)
  openTime: string;
  accountLogin?: string;
  accountServer?: string;
  accountCurrency?: string;
  isCent?: boolean;
}

export interface AccountStatus {
  login: number | string;
  server: string;
  balance: number; // native balance (e.g. 504.80 USC)
  equity: number; // native equity (e.g. 504.80 USC)
  usdBalance?: number; // normalized USD balance (e.g. $5.05 USD)
  usdEquity?: number; // normalized USD equity (e.g. $5.05 USD)
  initialDeposit?: number; // Initial starting deposit in USD (from MT5 initial deposit deal)
  nativeInitialDeposit?: number; // Initial starting deposit in native currency
  totalDeposits?: number;
  totalWithdrawals?: number;
  margin: number;
  freeMargin: number;
  currency: string;
  isCent?: boolean;
  lastUpdate: string;
  openPositionsCount?: number;
  totalSyncedDeals?: number;
  accountName?: string;
  status?: 'connected' | 'disconnected' | 'archived';
  disconnectedAt?: string;
  archivedAt?: string;
}

export interface MultiAccountPayload {
  accounts: Record<string, AccountStatus>;
  openPositions: OpenPosition[];
  totalSyncedDeals: number;
  lastSync: string;
  activeAccount?: string;
}


