import React from 'react';
import { Filter, Search, RotateCcw, Calendar, Coins, Clock, Target, AlertTriangle } from 'lucide-react';
import { FilterOptions, UserSettings } from '../types';

interface FilterBarProps {
  filters: FilterOptions;
  setFilters: React.Dispatch<React.SetStateAction<FilterOptions>>;
  settings: UserSettings;
  symbols: string[];
  totalMatches: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  settings,
  symbols,
  totalMatches
}) => {
  const isFiltered = 
    filters.dateRange !== 'ALL' ||
    filters.symbol !== 'ALL' ||
    filters.session !== 'ALL' ||
    filters.strategy !== 'ALL' ||
    filters.mistake !== 'ALL' ||
    filters.emotion !== 'ALL' ||
    filters.direction !== 'ALL' ||
    filters.outcome !== 'ALL' ||
    filters.searchQuery !== '';

  const resetFilters = () => {
    setFilters({
      dateRange: 'ALL',
      symbol: 'ALL',
      session: 'ALL',
      strategy: 'ALL',
      mistake: 'ALL',
      emotion: 'ALL',
      direction: 'ALL',
      outcome: 'ALL',
      searchQuery: ''
    });
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 mb-6 shadow-md">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
        
        {/* Title & Active Filter Count */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[var(--accent-gold)]" />
          <span className="text-sm font-semibold text-[var(--text-primary)]">Filter & Segment Trades</span>
          <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/20">
            {totalMatches} Trades Found
          </span>
        </div>

        {/* Search Keyword & Reset */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes, ticket, tags..."
              value={filters.searchQuery}
              onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-color)] focus:border-[var(--accent-gold)] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none transition-colors"
            />
          </div>

          {isFiltered && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Filter Dropdowns Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* Date Range */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[var(--accent-gold)]" /> Date Range
          </label>
          <select
            value={filters.dateRange}
            onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
            className="bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent-gold)]"
          >
            <option value="ALL">All Time</option>
            <option value="THIS_MONTH">This Month</option>
            <option value="LAST_MONTH">Last Month</option>
            <option value="THIS_WEEK">This Week</option>
            <option value="TODAY">Today</option>
          </select>
        </div>

        {/* Symbol */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] flex items-center gap-1">
            <Coins className="w-3 h-3 text-[var(--accent-gold)]" /> Symbol
          </label>
          <select
            value={filters.symbol}
            onChange={(e) => setFilters(prev => ({ ...prev, symbol: e.target.value }))}
            className="bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent-gold)]"
          >
            <option value="ALL">All Symbols</option>
            <option value="XAUUSD">Gold (XAUUSD)</option>
            <option value="FOREX">All Forex Pairs</option>
            {symbols.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Session */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] flex items-center gap-1">
            <Clock className="w-3 h-3 text-[var(--accent-blue)]" /> Session
          </label>
          <select
            value={filters.session}
            onChange={(e) => setFilters(prev => ({ ...prev, session: e.target.value }))}
            className="bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent-gold)]"
          >
            <option value="ALL">All Sessions</option>
            <option value="ASIAN">Asian Session</option>
            <option value="LONDON_OPEN">London Open</option>
            <option value="NY_AM">NY AM (Morning)</option>
            <option value="NY_PM">NY PM (Afternoon)</option>
            <option value="LONDON_CLOSE">London Close</option>
          </select>
        </div>

        {/* Strategy */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] flex items-center gap-1">
            <Target className="w-3 h-3 text-indigo-400" /> Strategy
          </label>
          <select
            value={filters.strategy}
            onChange={(e) => setFilters(prev => ({ ...prev, strategy: e.target.value }))}
            className="bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent-gold)]"
          >
            <option value="ALL">All Strategies</option>
            {settings.strategies.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Mistake Tag */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-[var(--accent-red)]" /> Mistakes
          </label>
          <select
            value={filters.mistake}
            onChange={(e) => setFilters(prev => ({ ...prev, mistake: e.target.value }))}
            className="bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent-gold)]"
          >
            <option value="ALL">All Trades</option>
            <option value="NONE">Clean Trades (No Mistakes)</option>
            {settings.mistakes.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Outcome / Result */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase font-semibold text-[var(--text-secondary)]">Outcome</label>
          <select
            value={filters.outcome}
            onChange={(e) => setFilters(prev => ({ ...prev, outcome: e.target.value as any }))}
            className="bg-[var(--bg-canvas)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs rounded-lg px-2.5 py-1.5 outline-none focus:border-[var(--accent-gold)]"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">Wins Only</option>
            <option value="LOSS">Losses Only</option>
            <option value="BREAK_EVEN">Break-Even</option>
          </select>
        </div>

      </div>
    </div>
  );
};
