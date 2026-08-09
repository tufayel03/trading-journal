import React, { useMemo } from 'react';
import { 
  BrainCircuit, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  Star, 
  TrendingUp, 
  Flame, 
  Award,
  Zap
} from 'lucide-react';
import { Trade } from '../../types';
import { aggregateMistakes } from '../../lib/calculations';

interface PsychologyDashboardProps {
  trades: Trade[];
}

export const PsychologyDashboard: React.FC<PsychologyDashboardProps> = ({ trades }) => {
  const mistakesList = useMemo(() => aggregateMistakes(trades), [trades]);

  const mistakeTrades = useMemo(() => trades.filter(t => t.mistakes && t.mistakes.length > 0), [trades]);
  const cleanTrades = useMemo(() => trades.filter(t => !t.mistakes || t.mistakes.length === 0), [trades]);

  const totalMistakeLoss = useMemo(() => {
    return mistakeTrades
      .filter(t => t.netProfit < 0)
      .reduce((sum, t) => sum + Math.abs(t.netProfit), 0);
  }, [mistakeTrades]);

  // Aggregate stats by Emotional State
  const emotionStats = useMemo(() => {
    const emotions = ['Disciplined', 'Greedy', 'Fearful', 'Revenge', 'Neutral'] as const;
    return emotions.map(emo => {
      const emoTrades = trades.filter(t => t.emotions === emo);
      const count = emoTrades.length;
      const netProfit = emoTrades.reduce((sum, t) => sum + t.netProfit, 0);
      const wins = emoTrades.filter(t => t.netProfit > 0.5).length;
      const winRate = count > 0 ? (wins / count) * 100 : 0;

      return {
        emotion: emo,
        count,
        netProfit: Number(netProfit.toFixed(2)),
        winRate: Number(winRate.toFixed(1))
      };
    });
  }, [trades]);

  // Aggregate stats by Execution Rating
  const ratingStats = useMemo(() => {
    const ratings = [5, 4, 3, 2, 1] as const;
    return ratings.map(star => {
      const starTrades = trades.filter(t => t.rating === star);
      const count = starTrades.length;
      const netProfit = starTrades.reduce((sum, t) => sum + t.netProfit, 0);
      const wins = starTrades.filter(t => t.netProfit > 0.5).length;
      const winRate = count > 0 ? (wins / count) * 100 : 0;

      return {
        rating: star,
        count,
        netProfit: Number(netProfit.toFixed(2)),
        winRate: Number(winRate.toFixed(1))
      };
    });
  }, [trades]);

  const cleanTradesCount = cleanTrades.length;
  const cleanTradesProfit = cleanTrades.reduce((sum, t) => sum + t.netProfit, 0);
  const cleanWinRate = cleanTradesCount > 0 
    ? (cleanTrades.filter(t => t.netProfit > 0.5).length / cleanTradesCount) * 100 
    : 0;

  return (
    <div className="space-y-6">
      
      {/* Title Header Banner */}
      <div className="bg-[#111827] border border-purple-500/30 rounded-2xl p-6 shadow-xl bg-gradient-to-r from-[#111827] via-purple-950/20 to-[#111827] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
            <BrainCircuit className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              Trading Psychology & Discipline Engine
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Quantifying emotional leakages, FOMO cost, and execution rating impact on account equity growth
            </p>
          </div>
        </div>

        <div className="bg-[#0B0F19] p-3 rounded-xl border border-rose-500/30 text-right shrink-0">
          <span className="text-[10px] text-gray-400 uppercase font-semibold block">Total Cost of Mistakes</span>
          <span className="text-xl font-mono font-extrabold text-rose-400">
            -${totalMistakeLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Clean vs Mistake Comparison Callout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Disciplined / Clean Trades */}
        <div className="bg-[#111827] border border-emerald-500/30 rounded-xl p-5 shadow-md bg-gradient-to-br from-[#111827] to-emerald-950/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Disciplined Trades (No Mistakes)
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">
              {cleanTradesCount} Trades
            </span>
          </div>

          <div className="flex items-baseline justify-between font-mono mt-2">
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">Disciplined P&L</span>
              <span className="text-2xl font-extrabold text-emerald-400">+${cleanTradesProfit.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase block">Disciplined Win Rate</span>
              <span className="text-xl font-extrabold text-white">{cleanWinRate.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Mistake Trades */}
        <div className="bg-[#111827] border border-rose-500/30 rounded-xl p-5 shadow-md bg-gradient-to-br from-[#111827] to-rose-950/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Mistake Trades
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
              {trades.length - cleanTradesCount} Trades
            </span>
          </div>

          <div className="flex items-baseline justify-between font-mono mt-2">
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">Capital Leakage</span>
              <span className="text-2xl font-extrabold text-rose-400">-${totalMistakeLoss.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase block">Potential Net Account</span>
              <span className="text-xl font-extrabold text-amber-400">+${(cleanTradesProfit).toFixed(2)}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Top Quantified Mistakes Cards */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[#1F2937]">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <h3 className="text-base font-bold text-white">Quantified Cost per Mistake Type</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mistakesList.map((m) => (
            <div key={m.mistake} className="bg-[#0B0F19] p-4 rounded-xl border border-rose-500/20 space-y-2">
              <div className="flex items-center justify-between font-bold text-white text-xs">
                <span className="flex items-center gap-1.5 text-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  {m.mistake}
                </span>
                <span className="text-[10px] font-mono text-gray-400">{m.count}x</span>
              </div>
              <div className="flex justify-between items-baseline font-mono">
                <span className="text-xs text-gray-400">Total Loss:</span>
                <span className="text-base font-bold text-rose-400">-${m.totalLoss.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emotional State Performance & Execution Quality Rating */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Emotional Matrix */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1F2937]">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
              <h3 className="text-base font-bold text-white">Emotional State Matrix</h3>
            </div>
          </div>

          <div className="space-y-2.5">
            {emotionStats.map((e) => (
              <div key={e.emotion} className="bg-[#0B0F19] p-3 rounded-lg border border-[#1F2937] flex items-center justify-between text-xs">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    e.emotion === 'Disciplined' ? 'bg-emerald-400' : e.emotion === 'FOMO' || e.emotion === 'Revenge' ? 'bg-rose-400' : 'bg-amber-400'
                  }`} />
                  {e.emotion} ({e.count} trades)
                </div>

                <div className="flex items-center gap-4 font-mono">
                  <span className="text-gray-400 text-[11px]">{e.winRate}% WR</span>
                  <span className={`font-bold ${e.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {e.netProfit >= 0 ? '+' : ''}${e.netProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Execution Quality Stars */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#1F2937]">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">Execution Quality Correlation</h3>
            </div>
          </div>

          <div className="space-y-2.5">
            {ratingStats.map((r) => (
              <div key={r.rating} className="bg-[#0B0F19] p-3 rounded-lg border border-[#1F2937] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <span>{r.rating}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span className="text-gray-400 text-[11px] font-normal">({r.count} trades)</span>
                </div>

                <div className="flex items-center gap-4 font-mono">
                  <span className="text-gray-400 text-[11px]">{r.winRate}% WR</span>
                  <span className={`font-bold ${r.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {r.netProfit >= 0 ? '+' : ''}${r.netProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
