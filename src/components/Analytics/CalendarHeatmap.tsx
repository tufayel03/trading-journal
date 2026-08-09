import React, { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Trade } from '../../types';
import { aggregateDailyPnL } from '../../lib/calculations';

interface CalendarHeatmapProps {
  trades: Trade[];
  onSelectDate: (dateStr: string | null) => void;
  selectedDate: string | null;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  trades,
  onSelectDate,
  selectedDate
}) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const dailyMap = useMemo(() => aggregateDailyPnL(trades), [trades]);

  // Generate days for the current displayed month grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const startDayOfWeek = firstDayOfMonth.getDay(); // 0 (Sun) to 6 (Sat)
    const totalDays = lastDayOfMonth.getDate();

    const days = [];

    // Empty padding cells before 1st of month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }

    // Actual day cells
    for (let day = 1; day <= totalDays; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const stats = dailyMap.get(dateStr) || {
        date: dateStr,
        netProfit: 0,
        tradesCount: 0,
        winsCount: 0,
        lossesCount: 0,
        winRate: 0
      };
      days.push({ dayNumber: day, dateStr, stats });
    }

    return days;
  }, [currentMonth, dailyMap]);

  // Calculate monthly total P&L
  const monthTotalPnL = useMemo(() => {
    let sum = 0;
    calendarDays.forEach(cell => {
      if (cell && cell.stats) {
        sum += cell.stats.netProfit;
      }
    });
    return sum;
  }, [calendarDays]);

  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const todayMonth = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md mb-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-amber-400" />
          <div>
            <h3 className="text-base font-bold text-white">Performance Calendar Heatmap</h3>
            <p className="text-xs text-gray-400">Daily P&L performance matrix. Click any day to view trade details.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Month P&L</span>
            <span className={`text-sm font-bold font-mono ${monthTotalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {monthTotalPnL >= 0 ? '+' : ''}${monthTotalPnL.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#0B0F19] p-1 rounded-lg border border-[#1F2937]">
            <button
              onClick={prevMonth}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#111827] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-semibold text-white px-3 min-w-28 text-center">
              {monthName}
            </span>

            <button
              onClick={nextMonth}
              className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#111827] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={todayMonth}
            className="px-2.5 py-1 text-xs font-medium text-gray-300 bg-[#1F2937] hover:bg-[#374151] rounded-lg transition-colors"
          >
            Today
          </button>

          {selectedDate && (
            <button
              onClick={() => onSelectDate(null)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-colors"
            >
              <Filter className="w-3 h-3" />
              Clear Day
            </button>
          )}
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 gap-1.5 mb-2 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
        <span>Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span>Sat</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {calendarDays.map((cell, idx) => {
          if (!cell) {
            return <div key={`empty-${idx}`} className="h-20 bg-[#0B0F19]/40 rounded-lg border border-transparent" />;
          }

          const { dayNumber, dateStr, stats } = cell;
          const hasTrades = stats.tradesCount > 0;
          const isProfitable = stats.netProfit > 0;
          const isLoss = stats.netProfit < 0;
          const isSelected = selectedDate === dateStr;

          // Color intensity calculation
          let bgStyle = 'bg-[#0B0F19] border-[#1F2937] hover:border-gray-600';
          if (hasTrades) {
            if (isProfitable) {
              if (stats.netProfit > 1000) bgStyle = 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300';
              else if (stats.netProfit > 300) bgStyle = 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300';
              else bgStyle = 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400';
            } else if (isLoss) {
              if (Math.abs(stats.netProfit) > 1000) bgStyle = 'bg-rose-950/70 border-rose-500/50 text-rose-300';
              else if (Math.abs(stats.netProfit) > 300) bgStyle = 'bg-rose-950/40 border-rose-500/30 text-rose-300';
              else bgStyle = 'bg-rose-950/20 border-rose-500/20 text-rose-400';
            } else {
              bgStyle = 'bg-gray-800/40 border-gray-700 text-gray-300';
            }
          }

          if (isSelected) {
            bgStyle += ' ring-2 ring-amber-400 shadow-lg scale-[1.02] z-10';
          }

          return (
            <div
              key={dateStr}
              onClick={() => hasTrades && onSelectDate(isSelected ? null : dateStr)}
              className={`h-20 rounded-lg border p-1.5 flex flex-col justify-between transition-all cursor-pointer ${bgStyle}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300">{dayNumber}</span>
                {hasTrades && (
                  <span className="text-[9px] font-semibold px-1 rounded bg-black/40 text-gray-300">
                    {stats.tradesCount}T
                  </span>
                )}
              </div>

              {hasTrades ? (
                <div className="text-right">
                  <div className="text-xs font-bold font-mono">
                    {isProfitable ? '+' : ''}${stats.netProfit.toFixed(0)}
                  </div>
                  <div className="text-[9px] font-mono text-gray-400 opacity-80">
                    {stats.winsCount}W-{stats.lossesCount}L
                  </div>
                </div>
              ) : (
                <div className="text-[9px] text-gray-600 text-center italic">No Trades</div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};
