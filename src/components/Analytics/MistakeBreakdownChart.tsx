import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, ShieldCheck } from 'lucide-react';
import { Trade } from '../../types';
import { aggregateMistakes } from '../../lib/calculations';

interface MistakeBreakdownChartProps {
  trades: Trade[];
}

export const MistakeBreakdownChart: React.FC<MistakeBreakdownChartProps> = ({ trades }) => {
  const mistakesList = useMemo(() => aggregateMistakes(trades), [trades]);

  const totalMistakeLoss = useMemo(() => {
    return mistakesList.reduce((sum, item) => sum + item.totalLoss, 0);
  }, [mistakesList]);

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md mb-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <div>
            <h3 className="text-base font-bold text-white">Cost of Mistakes Breakdown</h3>
            <p className="text-xs text-gray-400">Quantified dollar losses attributed to psychological & execution errors</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-rose-400" />
          <span>Total Leakage: -${totalMistakeLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {mistakesList.length === 0 ? (
        <div className="py-12 text-center text-gray-500 text-xs">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
          No execution mistakes recorded in filtered trades. Pristine discipline!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Bar Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mistakesList} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" horizontal={false} />
                <XAxis type="number" stroke="#6B7280" fontSize={10} tickFormatter={(val) => `$${val}`} />
                <YAxis dataKey="mistake" type="category" stroke="#9CA3AF" fontSize={11} width={120} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="totalLoss" radius={[0, 4, 4, 0]}>
                  {mistakesList.map((_, index) => (
                    <Cell key={`cell-${index}`} fill="#EF4444" opacity={0.85 - index * 0.1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table & Elimination Impact */}
          <div className="flex flex-col justify-between space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-[#1F2937] text-[10px] uppercase">
                    <th className="pb-2">Mistake Type</th>
                    <th className="pb-2 text-center">Frequency</th>
                    <th className="pb-2 text-right">Total Loss ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F2937]">
                  {mistakesList.map((m) => (
                    <tr key={m.mistake} className="hover:bg-[#0B0F19]">
                      <td className="py-2.5 font-medium text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        {m.mistake}
                      </td>
                      <td className="py-2.5 text-center font-mono text-gray-300">{m.count} trades</td>
                      <td className="py-2.5 text-right font-mono font-bold text-rose-400">
                        -${m.totalLoss.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Savings Callout */}
            <div className="bg-[#0B0F19] border border-amber-500/20 rounded-lg p-3 text-xs text-gray-300 flex items-start gap-2.5">
              <TrendingUp className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-400">Psychology Insight:</span> By eliminating these execution mistakes, you would immediately save <span className="text-emerald-400 font-bold font-mono">+${totalMistakeLoss.toFixed(2)}</span> in drawdown capital!
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#0B0F19] border border-rose-500/30 rounded-lg p-2.5 shadow-xl text-xs space-y-1">
        <div className="font-bold text-white">{data.mistake}</div>
        <div className="text-rose-400 font-mono font-bold">
          Total Loss: -${data.totalLoss.toFixed(2)}
        </div>
        <div className="text-gray-400">Occurrences: {data.count} trades</div>
      </div>
    );
  }
  return null;
};
