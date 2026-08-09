import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { Coins, Clock, Flame } from 'lucide-react';
import { Trade } from '../../types';
import { aggregateBySymbol, aggregateBySession } from '../../lib/calculations';

interface PairAndSessionChartsProps {
  trades: Trade[];
}

export const PairAndSessionCharts: React.FC<PairAndSessionChartsProps> = ({ trades }) => {
  const symbolStats = useMemo(() => aggregateBySymbol(trades), [trades]);
  const sessionStats = useMemo(() => aggregateBySession(trades), [trades]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      
      {/* 1. Symbol Breakdown */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1F2937]">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-white">Symbol Performance (Gold vs Forex)</h3>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Traded Assets
          </span>
        </div>

        <div className="h-56 w-full mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={symbolStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="symbol" stroke="#9CA3AF" fontSize={11} tickLine={false} />
              <YAxis stroke="#6B7280" fontSize={10} tickFormatter={(val) => `$${val}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="netProfit" radius={[4, 4, 0, 0]}>
                {symbolStats.map((entry) => (
                  <Cell 
                    key={entry.symbol} 
                    fill={entry.symbol === 'XAUUSD' ? '#F59E0B' : entry.netProfit >= 0 ? '#10B981' : '#EF4444'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Symbol Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {symbolStats.slice(0, 6).map(s => (
            <div key={s.symbol} className="bg-[#0B0F19] p-2.5 rounded-lg border border-[#1F2937] text-xs">
              <div className="flex items-center justify-between font-bold text-white">
                <span className="flex items-center gap-1">
                  {s.symbol === 'XAUUSD' && <Flame className="w-3 h-3 text-amber-400" />}
                  {s.symbol}
                </span>
                <span className="text-[10px] text-gray-400">{s.tradesCount}T</span>
              </div>
              <div className="flex justify-between items-baseline mt-1 font-mono">
                <span className={s.netProfit >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {s.netProfit >= 0 ? '+' : ''}${s.netProfit.toFixed(0)}
                </span>
                <span className="text-gray-400 text-[10px]">{s.winRate}% WR</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Session Breakdown */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#1F2937]">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Trading Session Performance</h3>
          </div>
          <span className="text-xs text-gray-400">ICT Killzones</span>
        </div>

        <div className="h-56 w-full mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sessionStats} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis dataKey="session" stroke="#9CA3AF" fontSize={10} tickLine={false} />
              <YAxis stroke="#6B7280" fontSize={10} tickFormatter={(val) => `$${val}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="netProfit" radius={[4, 4, 0, 0]}>
                {sessionStats.map((entry) => (
                  <Cell 
                    key={entry.session} 
                    fill={entry.netProfit >= 0 ? '#10B981' : '#EF4444'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Session List */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {sessionStats.map(s => (
            <div key={s.session} className="bg-[#0B0F19] p-2.5 rounded-lg border border-[#1F2937] text-xs">
              <div className="font-semibold text-gray-300 text-[11px] truncate">{s.label}</div>
              <div className="flex justify-between items-baseline mt-1 font-mono">
                <span className={s.netProfit >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {s.netProfit >= 0 ? '+' : ''}${s.netProfit.toFixed(0)}
                </span>
                <span className="text-gray-400 text-[10px]">{s.winRate}% ({s.tradesCount}T)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isWin = data.netProfit >= 0;
    return (
      <div className="bg-[#0B0F19] border border-[#374151] rounded-lg p-2.5 shadow-xl text-xs space-y-1">
        <div className="font-bold text-white">{data.symbol || data.label || data.session}</div>
        <div className={`font-mono font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
          Net P&L: {isWin ? '+' : ''}${data.netProfit?.toFixed(2)}
        </div>
        <div className="text-gray-400">Win Rate: {data.winRate}% ({data.tradesCount} Trades)</div>
      </div>
    );
  }
  return null;
};
