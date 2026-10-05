import React, { useMemo } from 'react';
import { Target, Award, ArrowUpRight } from 'lucide-react';
import { Trade } from '../../types';
import { aggregateByStrategy } from '../../lib/calculations';

interface StrategyBreakdownProps {
  trades: Trade[];
}

export const StrategyBreakdown: React.FC<StrategyBreakdownProps> = ({ trades }) => {
  const strategyStats = useMemo(() => aggregateByStrategy(trades), [trades]);

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-5 shadow-md mb-6">
      
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-base font-bold text-white">Setup & Strategy Edge Matrix</h3>
            <p className="text-xs text-[var(--text-secondary)]">Profitability, Profit Factor, and average Risk-to-Reward segmented by strategy</p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[var(--text-secondary)] border-b border-[var(--border-color)] text-[10px] uppercase font-semibold">
              <th className="pb-3 pl-2">Strategy / Model</th>
              <th className="pb-3 text-center">Trades</th>
              <th className="pb-3 text-center">Win Rate</th>
              <th className="pb-3 text-center">Profit Factor</th>
              <th className="pb-3 text-center">Avg R:R</th>
              <th className="pb-3 text-right pr-2">Net P&L ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-color)]">
            {strategyStats.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-[var(--text-muted)]">
                  No strategy data recorded yet.
                </td>
              </tr>
            ) : (
              strategyStats.map((s) => {
                const isProfitable = s.netProfit >= 0;
                return (
                  <tr key={s.strategy} className="hover:bg-[var(--bg-canvas)] transition-colors">
                    <td className="py-3 pl-2 font-semibold text-white flex items-center gap-2">
                      <Award className="w-4 h-4 text-indigo-400 shrink-0" />
                      {s.strategy}
                    </td>
                    <td className="py-3 text-center font-mono text-gray-300">{s.tradesCount}</td>
                    <td className="py-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                        s.winRate >= 60 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-[var(--bg-canvas)] border border-[var(--border-color)] text-gray-300'
                      }`}>
                        {s.winRate}%
                      </span>
                    </td>
                    <td className="py-3 text-center font-mono text-gray-200">
                      {s.profitFactor >= 99 ? '∞' : s.profitFactor}
                    </td>
                    <td className="py-3 text-center font-mono text-gray-300">
                      {s.avgRR}R
                    </td>
                    <td className="py-3 text-right pr-2 font-mono font-bold">
                      <span className={isProfitable ? 'text-emerald-400' : 'text-rose-400'}>
                        {isProfitable ? '+' : ''}${s.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
};
