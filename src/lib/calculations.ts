import { Trade, KPIStats, DailyPnL, MistakeSummary, SessionSummary, SymbolSummary, StrategySummary, TradingSession } from '../types';

/**
 * Normalizes trading symbol identifiers (e.g. 'XAUUSDm', 'GOLD', 'EURUSD.m' -> 'XAUUSD', 'EURUSD')
 */
export function normalizeSymbol(symbol: string): string {
  if (!symbol) return 'OTHER';
  let cleaned = symbol.trim().toUpperCase();
  
  // Handle Gold variations
  if (cleaned.includes('XAU') || cleaned.includes('GOLD')) {
    return 'XAUUSD';
  }

  // Remove common MetaTrader suffixes like 'm', '.m', '_m', 'ecn', '#', 'c'
  cleaned = cleaned.replace(/(\.M|_M|ECN|#|C|m)$/i, '');
  cleaned = cleaned.replace(/[^A-Z0-9]/g, '');

  return cleaned;
}

/**
 * Calculates pips for a trade based on symbol, direction, entry, and exit
 */
export function calculatePips(
  symbol: string,
  direction: 'BUY' | 'SELL',
  openPrice: number,
  closePrice: number
): number {
  if (!openPrice || !closePrice) return 0;
  const norm = normalizeSymbol(symbol);
  const diff = direction === 'BUY' ? closePrice - openPrice : openPrice - closePrice;

  if (norm === 'XAUUSD') {
    // Gold: 1 Pip = $0.10 move
    return Number((diff / 0.10).toFixed(1));
  } else if (norm.includes('JPY')) {
    // JPY pairs: 1 Pip = 0.01 move
    return Number((diff / 0.01).toFixed(1));
  } else {
    // Standard Forex pairs (EURUSD, GBPUSD, etc.): 1 Pip = 0.00010 move
    return Number((diff / 0.0001).toFixed(1));
  }
}

/**
 * Estimates monetary risk ($) based on Stop Loss and lot size
 */
export function calculatePlannedRisk(
  symbol: string,
  openPrice: number,
  stopLoss: number | undefined,
  lotSize: number
): number {
  if (!stopLoss || stopLoss <= 0 || !openPrice || !lotSize) return 0;
  const norm = normalizeSymbol(symbol);
  const priceDiff = Math.abs(openPrice - stopLoss);

  if (norm === 'XAUUSD') {
    // $1.00 move = $100 per 1.00 lot
    return priceDiff * lotSize * 100;
  } else if (norm.includes('JPY')) {
    // Approximate $10 per pip per std lot
    return (priceDiff / 0.01) * lotSize * 10;
  } else {
    // Standard forex contract size = 100,000
    return priceDiff * lotSize * 100000;
  }
}

/**
 * Calculates R-Multiple (Profit / Planned Risk)
 */
export function calculateRMultiple(
  netProfit: number,
  plannedRisk: number
): number | undefined {
  if (!plannedRisk || plannedRisk <= 0) return undefined;
  return Number((netProfit / plannedRisk).toFixed(2));
}

/**
 * Automatically determines session from ISO openTime timestamp (UTC)
 */
export function autoDetectSession(openTimeISO: string): TradingSession {
  try {
    const date = new Date(openTimeISO);
    const utcHour = date.getUTCHours();

    // UTC Hours roughly corresponding to ICT Killzones & Major Sessions:
    // Asian: 00:00 - 06:59 UTC
    // London Open: 07:00 - 11:59 UTC
    // NY AM (Morning): 12:00 - 16:59 UTC
    // NY PM (Afternoon): 17:00 - 19:59 UTC
    // London Close / Late NY: 20:00 - 23:59 UTC
    if (utcHour >= 0 && utcHour < 7) return 'ASIAN';
    if (utcHour >= 7 && utcHour < 12) return 'LONDON_OPEN';
    if (utcHour >= 12 && utcHour < 17) return 'NY_AM';
    if (utcHour >= 17 && utcHour < 20) return 'NY_PM';
    return 'LONDON_CLOSE';
  } catch {
    return 'NY_AM';
  }
}

/**
 * Main Analytics Engine - Computes aggregate KPIs from trades
 */
export function calculateKPIStats(trades: Trade[], initialBalance: number = 10000): KPIStats {
  if (!trades || trades.length === 0) {
    return {
      netProfit: 0,
      returnPercent: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      breakEvens: 0,
      winRate: 0,
      profitFactor: 0,
      expectancy: 0,
      averageWin: 0,
      averageLoss: 0,
      averageRR: 0,
      maxDrawdownAmount: 0,
      maxDrawdownPercent: 0,
      totalCommission: 0,
      totalSwap: 0,
      costOfMistakes: 0,
      totalPips: 0
    };
  }

  let netProfit = 0;
  let wins = 0;
  let losses = 0;
  let breakEvens = 0;
  let grossProfit = 0;
  let grossLoss = 0;
  let totalCommission = 0;
  let totalSwap = 0;
  let costOfMistakes = 0;
  let totalPips = 0;

  let totalR = 0;
  let rCount = 0;

  trades.forEach(t => {
    netProfit += t.netProfit;
    totalCommission += t.commission || 0;
    totalSwap += t.swap || 0;
    totalPips += t.pips || 0;

    if (t.netProfit > 0.5) {
      wins++;
      grossProfit += t.netProfit;
    } else if (t.netProfit < -0.5) {
      losses++;
      grossLoss += Math.abs(t.netProfit);
      
      // Calculate mistake cost on losing trades
      if (t.mistakes && t.mistakes.length > 0) {
        costOfMistakes += Math.abs(t.netProfit);
      }
    } else {
      breakEvens++;
    }

    if (t.rMultiple !== undefined && !isNaN(t.rMultiple)) {
      totalR += t.rMultiple;
      rCount++;
    }
  });

  const totalTrades = trades.length;
  const returnPercent = (netProfit / initialBalance) * 100;
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
  const lossRate = totalTrades > 0 ? (losses / totalTrades) * 100 : 0;
  
  const profitFactor = grossLoss > 0 
    ? Number((grossProfit / grossLoss).toFixed(2)) 
    : (grossProfit > 0 ? 999 : 0);

  const averageWin = wins > 0 ? grossProfit / wins : 0;
  const averageLoss = losses > 0 ? grossLoss / losses : 0;

  // Expectancy formula: (Win Rate * Avg Win) - (Loss Rate * Avg Loss)
  const expectancy = ((winRate / 100) * averageWin) - ((lossRate / 100) * averageLoss);

  const averageRR = rCount > 0 ? Number((totalR / rCount).toFixed(2)) : 0;

  // Max Drawdown calculation
  // Sort chronologically by close time
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
  );

  let currentBalance = initialBalance;
  let peakBalance = initialBalance;
  let maxDrawdownAmount = 0;
  let maxDrawdownPercent = 0;

  sortedTrades.forEach(t => {
    currentBalance += t.netProfit;
    if (currentBalance > peakBalance) {
      peakBalance = currentBalance;
    } else {
      const ddAmount = peakBalance - currentBalance;
      const ddPercent = peakBalance > 0 ? (ddAmount / peakBalance) * 100 : 0;
      if (ddAmount > maxDrawdownAmount) {
        maxDrawdownAmount = ddAmount;
      }
      if (ddPercent > maxDrawdownPercent) {
        maxDrawdownPercent = ddPercent;
      }
    }
  });

  return {
    netProfit: Number(netProfit.toFixed(2)),
    returnPercent: Number(returnPercent.toFixed(2)),
    totalTrades,
    wins,
    losses,
    breakEvens,
    winRate: Number(winRate.toFixed(1)),
    profitFactor,
    expectancy: Number(expectancy.toFixed(2)),
    averageWin: Number(averageWin.toFixed(2)),
    averageLoss: Number(averageLoss.toFixed(2)),
    averageRR,
    maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdownPercent.toFixed(2)),
    totalCommission: Number(totalCommission.toFixed(2)),
    totalSwap: Number(totalSwap.toFixed(2)),
    costOfMistakes: Number(costOfMistakes.toFixed(2)),
    totalPips: Number(totalPips.toFixed(1))
  };
}

/**
 * Aggregates trades by daily closed date for Calendar Heatmap
 */
export function aggregateDailyPnL(trades: Trade[]): Map<string, DailyPnL> {
  const map = new Map<string, DailyPnL>();

  trades.forEach(t => {
    if (!t.closeTime) return;
    const dateStr = t.closeTime.split('T')[0]; // YYYY-MM-DD

    const existing = map.get(dateStr) || {
      date: dateStr,
      netProfit: 0,
      tradesCount: 0,
      winsCount: 0,
      lossesCount: 0,
      winRate: 0
    };

    existing.netProfit += t.netProfit;
    existing.tradesCount += 1;
    if (t.netProfit > 0.5) existing.winsCount += 1;
    else if (t.netProfit < -0.5) existing.lossesCount += 1;

    existing.winRate = existing.tradesCount > 0 
      ? (existing.winsCount / existing.tradesCount) * 100 
      : 0;

    map.set(dateStr, existing);
  });

  return map;
}

/**
 * Aggregates losses & frequencies by Mistake type
 */
export function aggregateMistakes(trades: Trade[]): MistakeSummary[] {
  const map = new Map<string, { count: number; totalLoss: number }>();

  trades.forEach(t => {
    if (!t.mistakes || t.mistakes.length === 0) return;

    t.mistakes.forEach(m => {
      const existing = map.get(m) || { count: 0, totalLoss: 0 };
      existing.count += 1;
      
      // If the trade was a loss, add to totalLoss
      if (t.netProfit < 0) {
        existing.totalLoss += Math.abs(t.netProfit);
      }
      map.set(m, existing);
    });
  });

  const list: MistakeSummary[] = [];
  map.forEach((val, mistake) => {
    list.push({
      mistake,
      count: val.count,
      totalLoss: Number(val.totalLoss.toFixed(2))
    });
  });

  // Sort by highest total loss first
  return list.sort((a, b) => b.totalLoss - a.totalLoss);
}

/**
 * Aggregates performance by Session
 */
export function aggregateBySession(trades: Trade[]): SessionSummary[] {
  const sessions: { key: TradingSession; label: string }[] = [
    { key: 'ASIAN', label: 'Asian Session' },
    { key: 'LONDON_OPEN', label: 'London Open' },
    { key: 'NY_AM', label: 'NY AM (Morning)' },
    { key: 'NY_PM', label: 'NY PM (Afternoon)' },
    { key: 'LONDON_CLOSE', label: 'London Close' }
  ];

  return sessions.map(s => {
    const sessionTrades = trades.filter(t => t.session === s.key);
    const count = sessionTrades.length;
    const netProfit = sessionTrades.reduce((sum, t) => sum + t.netProfit, 0);
    const wins = sessionTrades.filter(t => t.netProfit > 0.5).length;
    const winRate = count > 0 ? (wins / count) * 100 : 0;

    return {
      session: s.key,
      label: s.label,
      tradesCount: count,
      netProfit: Number(netProfit.toFixed(2)),
      winRate: Number(winRate.toFixed(1))
    };
  });
}

/**
 * Aggregates performance by Symbol (e.g. XAUUSD vs Forex)
 */
export function aggregateBySymbol(trades: Trade[]): SymbolSummary[] {
  const map = new Map<string, { count: number; netProfit: number; wins: number }>();

  trades.forEach(t => {
    const norm = normalizeSymbol(t.symbol);
    const existing = map.get(norm) || { count: 0, netProfit: 0, wins: 0 };
    existing.count += 1;
    existing.netProfit += t.netProfit;
    if (t.netProfit > 0.5) existing.wins += 1;
    map.set(norm, existing);
  });

  const list: SymbolSummary[] = [];
  map.forEach((val, sym) => {
    list.push({
      symbol: sym,
      tradesCount: val.count,
      netProfit: Number(val.netProfit.toFixed(2)),
      winRate: val.count > 0 ? Number(((val.wins / val.count) * 100).toFixed(1)) : 0
    });
  });

  return list.sort((a, b) => b.tradesCount - a.tradesCount);
}

/**
 * Aggregates performance by Strategy
 */
export function aggregateByStrategy(trades: Trade[]): StrategySummary[] {
  const map = new Map<string, { count: number; netProfit: number; wins: number; grossProfit: number; grossLoss: number; totalR: number; rCount: number }>();

  trades.forEach(t => {
    const strat = t.strategy || 'Uncategorized';
    const existing = map.get(strat) || { count: 0, netProfit: 0, wins: 0, grossProfit: 0, grossLoss: 0, totalR: 0, rCount: 0 };
    existing.count += 1;
    existing.netProfit += t.netProfit;
    if (t.netProfit > 0.5) {
      existing.wins += 1;
      existing.grossProfit += t.netProfit;
    } else if (t.netProfit < -0.5) {
      existing.grossLoss += Math.abs(t.netProfit);
    }

    if (t.rMultiple !== undefined && !isNaN(t.rMultiple)) {
      existing.totalR += t.rMultiple;
      existing.rCount += 1;
    }

    map.set(strat, existing);
  });

  const list: StrategySummary[] = [];
  map.forEach((val, strat) => {
    const pf = val.grossLoss > 0 
      ? Number((val.grossProfit / val.grossLoss).toFixed(2)) 
      : (val.grossProfit > 0 ? 999 : 0);

    list.push({
      strategy: strat,
      tradesCount: val.count,
      netProfit: Number(val.netProfit.toFixed(2)),
      winRate: val.count > 0 ? Number(((val.wins / val.count) * 100).toFixed(1)) : 0,
      profitFactor: pf,
      avgRR: val.rCount > 0 ? Number((val.totalR / val.rCount).toFixed(2)) : 0
    });
  });

  return list.sort((a, b) => b.netProfit - a.netProfit);
}
