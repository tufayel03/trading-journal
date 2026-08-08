import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';
import { Trade } from '../../types';

interface EquityCurveChartProps {
  trades: Trade[];
  initialBalance: number;
}

export const EquityCurveChart: React.FC<EquityCurveChartProps> = ({ trades, initialBalance }) => {
  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) {
      return [{ date: 'Start', balance: initialBalance, pnl: 0, tradeIndex: 0 }];
    }

    const sorted = [...trades].sort((a, b) => 
      new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    );

    let runningBalance = initialBalance;
    const points = [
      {
        date: 'Start',
        balance: initialBalance,
        pnl: 0,
        symbol: '',
        ticket: '',
        tradeIndex: 0
      }
    ];

    sorted.forEach((t, idx) => {
      runningBalance += t.netProfit;
      const dateStr = new Date(t.closeTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      points.push({
        date: `${dateStr} (#${idx + 1})`,
        balance: Number(runningBalance.toFixed(2)),
        pnl: t.netProfit,
        symbol: t.symbol,
        ticket: t.ticket || '',
        tradeIndex: idx + 1
      });
    });

    return points;
  }, [trades, initialBalance]);

  const minBalance = Math.min(...chartData.map(d => d.balance));
  const maxBalance = Math.max(...chartData.map(d => d.balance));
  const padding = Math.max((maxBalance - minBalance) * 0.1, 100);

  const yDomain = [
    Math.floor(minBalance - padding),
    Math.ceil(maxBalance + padding)
  ];

  const currentBalance = chartData[chartData.length - 1]?.balance || initialBalance;
  const totalReturn = currentBalance - initialBalance;
  const isPositive = totalReturn >= 0;

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md mb-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-base font-bold text-white">Account Equity Curve</h3>
            <p className="text-xs text-gray-400">Cumulative balance growth over chronologically executed trades</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-gray-400">Start: </span>
            <span className="text-gray-200 font-semibold">${initialBalance.toLocaleString()}</span>
          </div>
          <div className="h-4 w-px bg-gray-800" />
          <div>
            <span className="text-gray-400">Current: </span>
            <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGradientPositive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="equityGradientNegative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
            
            <XAxis 
              dataKey="date" 
              stroke="#6B7280" 
              fontSize={11} 
              tickLine={false}
              axisLine={{ stroke: '#1F2937' }}
            />
            
            <YAxis 
              domain={yDomain} 
              stroke="#6B7280" 
              fontSize={11} 
              tickFormatter={(val) => `$${val.toLocaleString()}`}
              tickLine={false}
              axisLine={{ stroke: '#1F2937' }}
            />

            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine 
              y={initialBalance} 
              stroke="#9CA3AF" 
              strokeDasharray="4 4" 
              label={{ value: 'Initial Capital', fill: '#9CA3AF', fontSize: 10, position: 'right' }} 
            />

            <Area 
              type="monotone" 
              dataKey="balance" 
              stroke={isPositive ? '#10B981' : '#EF4444'} 
              strokeWidth={2.5}
              fillOpacity={1} 
              fill={isPositive ? 'url(#equityGradientPositive)' : 'url(#equityGradientNegative)'} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isWin = data.pnl >= 0;

    return (
      <div className="bg-[#0B0F19] border border-[#374151] rounded-lg p-3 shadow-xl text-xs space-y-1 z-50">
        <div className="font-bold text-white flex items-center justify-between gap-3 border-b border-gray-800 pb-1">
          <span>Trade #{data.tradeIndex || 0}</span>
          <span className="text-gray-400">{data.date}</span>
        </div>
        {data.symbol && (
          <div className="flex justify-between gap-4 text-gray-300">
            <span>Symbol / Ticket:</span>
            <span className="font-semibold text-amber-400">{data.symbol} ({data.ticket || 'Manual'})</span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Trade P&L:</span>
          <span className={`font-mono font-bold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isWin ? '+' : ''}${data.pnl?.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-gray-400">Account Balance:</span>
          <span className="font-mono font-bold text-white">${data.balance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
    );
  }
  return null;
};
