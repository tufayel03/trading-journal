import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Zap, 
  Scale, 
  ShieldAlert, 
  AlertOctagon, 
  Award,
  DollarSign
} from 'lucide-react';
import { KPIStats } from '../../types';

interface KPIOverviewProps {
  stats: KPIStats;
}

export const KPIOverview: React.FC<KPIOverviewProps> = ({ stats }) => {
  const isNetPositive = stats.netProfit >= 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Net P&L Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-md hover:border-[var(--accent-gold)]/50 transition-all">
        <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Total Net P&L</p>
        <h2 className={`text-2xl font-extrabold tracking-tight mt-1 ${isNetPositive ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
          {isNetPositive ? '+' : ''}${stats.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
        <p className={`text-[10px] mt-1 font-semibold ${stats.returnPercent >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
          {stats.returnPercent >= 0 ? '+' : ''}{stats.returnPercent}% return on starting balance
        </p>
      </div>

      {/* 2. Win Rate Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-md hover:border-[var(--accent-gold)]/50 transition-all">
        <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Win Rate</p>
        <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight mt-1">
          {stats.winRate}%
        </h2>
        <p className="text-[10px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5 font-mono">
          <span className="text-[var(--accent-green)] font-bold">{stats.wins}W</span>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="text-[var(--accent-red)] font-bold">{stats.losses}L</span>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="text-[var(--text-secondary)] font-bold">{stats.breakEvens}BE</span>
          <span className="text-[var(--text-muted)] ml-auto">({stats.totalTrades} Trades)</span>
        </p>
      </div>

      {/* 3. Profit Factor Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-md hover:border-[var(--accent-gold)]/50 transition-all">
        <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Profit Factor</p>
        <h2 className="text-2xl font-extrabold text-[var(--accent-gold)] tracking-tight mt-1">
          {stats.profitFactor >= 99 ? '∞' : stats.profitFactor}
        </h2>
        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
          {stats.profitFactor >= 1.5 ? 'Exceeds benchmark (1.5)' : 'Edge score'}
        </p>
      </div>

      {/* 4. Max Drawdown Card */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-md hover:border-[var(--accent-gold)]/50 transition-all">
        <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Max Drawdown</p>
        <h2 className="text-2xl font-extrabold text-[var(--accent-red)] tracking-tight mt-1">
          -${stats.maxDrawdownAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
          Peak DD: <span className="text-[var(--accent-red)] font-semibold">{stats.maxDrawdownPercent}%</span>
        </p>
      </div>

      {/* Secondary row for additional metrics */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-md">
        <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Expectancy</p>
        <h3 className={`text-xl font-bold tracking-tight mt-1 ${stats.expectancy >= 0 ? 'text-[var(--text-primary)]' : 'text-[var(--accent-red)]'}`}>
          {stats.expectancy >= 0 ? '+' : ''}${stats.expectancy.toFixed(2)} <span className="text-xs font-normal text-[var(--text-muted)]">/ trade</span>
        </h3>
        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
          Avg R:R Ratio: <span className="text-[var(--text-primary)] font-semibold">{stats.averageRR}R</span>
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-md">
        <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold flex items-center gap-1 text-[var(--accent-red)]">
          <AlertOctagon className="w-3.5 h-3.5" /> Cost of Mistakes
        </p>
        <h3 className="text-xl font-bold text-[var(--accent-red)] tracking-tight mt-1">
          -${stats.costOfMistakes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h3>
        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
          Execution errors total loss
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-md">
        <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Total Pips</p>
        <h3 className={`text-xl font-bold tracking-tight mt-1 ${stats.totalPips >= 0 ? 'text-[var(--accent-gold)]' : 'text-[var(--accent-red)]'}`}>
          {stats.totalPips >= 0 ? '+' : ''}{stats.totalPips} <span className="text-xs font-normal text-[var(--text-muted)]">pips</span>
        </h3>
        <p className="text-[10px] text-[var(--text-secondary)] mt-1">
          Fees: <span className="text-[var(--text-primary)] font-mono">${(stats.totalCommission + stats.totalSwap).toFixed(2)}</span>
        </p>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 shadow-md">
        <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold text-[var(--accent-gold)] flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5" /> Exness Gold Metric
        </p>
        <div className="mt-1 text-[11px] text-[var(--text-primary)] font-mono space-y-0.5">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Gold Pip Formula:</span>
            <span className="text-[var(--accent-gold)]">$0.10 = 1 Pip</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">1.0 Std Lot:</span>
            <span className="text-[var(--accent-gold)]">$10 / Pip</span>
          </div>
        </div>
      </div>

    </div>
  );
};
