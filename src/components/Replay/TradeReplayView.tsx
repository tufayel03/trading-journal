import React, { useState, useMemo } from 'react';
import { 
  Play, 
  Flame, 
  ArrowUpRight, 
  ArrowDownRight, 
  Search, 
  Filter, 
  Calendar, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Video
} from 'lucide-react';
import { Trade } from '../../types';
import { TradeReplayModal } from './TradeReplayModal';

interface Props {
  trades: Trade[];
}

export const TradeReplayView: React.FC<Props> = ({ trades }) => {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [isReplayModalOpen, setIsReplayModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'BREAK_EVEN'>('ALL');

  // Filter available symbols
  const uniqueSymbols = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => {
      if (t.symbol) set.add(t.symbol);
    });
    return Array.from(set);
  }, [trades]);

  // Filtered trades list for replay selection
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      if (symbolFilter !== 'ALL' && t.symbol !== symbolFilter) return false;
      
      if (outcomeFilter === 'WIN' && t.netProfit <= 0) return false;
      if (outcomeFilter === 'LOSS' && t.netProfit >= 0) return false;
      if (outcomeFilter === 'BREAK_EVEN' && t.netProfit !== 0) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchSym = (t.symbol || '').toLowerCase().includes(q);
        const matchTicket = (t.ticket || '').toLowerCase().includes(q);
        const matchStrat = (t.strategy || '').toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchSym && !matchTicket && !matchStrat && !matchNotes) return false;
      }

      return true;
    });
  }, [trades, symbolFilter, outcomeFilter, searchQuery]);

  const handleLaunchReplay = (trade: Trade) => {
    setSelectedTrade(trade);
    setIsReplayModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Top Hero Banner */}
      <div className="bg-[#111827] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl bg-gradient-to-r from-[#111827] via-emerald-950/20 to-[#111827] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-500/30 text-black shrink-0">
            <Video className="w-7 h-7 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Trade Replay Studio
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                TradeZella Mode
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-1 max-w-xl">
              Rewind time and watch your historical executions bar-by-bar on full TradingView candlestick charts with live floating P&L and market simulation.
            </p>
          </div>
        </div>

        {/* Quick Launch Most Recent Trade */}
        {trades.length > 0 && (
          <button
            onClick={() => handleLaunchReplay(trades[0])}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] shrink-0"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Replay Latest Trade (#{trades[0].ticket || '1'})</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-md">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbol, ticket, notes..."
            className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          
          {/* Symbol */}
          <select
            value={symbolFilter}
            onChange={(e) => setSymbolFilter(e.target.value)}
            className="bg-[#0B0F19] border border-[#1F2937] rounded-lg px-3 py-2 text-xs text-gray-300 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Symbols</option>
            {uniqueSymbols.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Outcome */}
          <select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value as any)}
            className="bg-[#0B0F19] border border-[#1F2937] rounded-lg px-3 py-2 text-xs text-gray-300 font-semibold focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Outcomes</option>
            <option value="WIN">Wins Only</option>
            <option value="LOSS">Losses Only</option>
            <option value="BREAK_EVEN">Breakeven Only</option>
          </select>

          <span className="text-xs text-gray-400 font-mono ml-auto md:ml-2">
            {filteredTrades.length} Trades Ready to Replay
          </span>

        </div>

      </div>

      {/* Trades Grid for Replay Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTrades.map((t) => {
          const isWin = t.netProfit > 0;
          const isLoss = t.netProfit < 0;
          const isCent = t.isCent || t.accountCurrency === 'USC';
          const displayProfit = isCent ? t.netProfit * 100 : t.netProfit;
          const isBuy = t.direction === 'BUY';

          const closeDateFormatted = new Date(t.closeTime).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={t.id}
              onClick={() => handleLaunchReplay(t)}
              className="group bg-[#111827] border border-[#1F2937] hover:border-emerald-500/50 rounded-xl p-4 shadow-md hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between space-y-3 relative overflow-hidden"
            >
              {/* Glow Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none ${
                isWin ? 'bg-emerald-500' : isLoss ? 'bg-rose-500' : 'bg-gray-500'
              }`} />

              {/* Card Header */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-white font-mono flex items-center gap-1">
                      {t.symbol === 'XAUUSD' && <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                      {t.symbol}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-0.5 ${
                      isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {t.direction} {t.lotSize}L
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    <span>{closeDateFormatted}</span>
                    {t.ticket && <span>· #{t.ticket}</span>}
                  </div>
                </div>

                {/* Outcome Badge */}
                <div className="text-right">
                  <div className={`text-sm font-black font-mono ${
                    isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-gray-400'
                  }`}>
                    {isWin ? '+' : ''}
                    {isCent ? `${displayProfit.toFixed(2)} USC` : `$${displayProfit.toFixed(2)}`}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    {t.pips >= 0 ? '+' : ''}{t.pips} pips {t.rMultiple ? `· ${t.rMultiple}R` : ''}
                  </div>
                </div>
              </div>

              {/* Middle: Strategy & Notes */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-gray-300 truncate">
                  {t.strategy || 'HyperTrade Execution'}
                </div>

                {t.mistakes && t.mistakes.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {t.mistakes.map(m => (
                      <span key={m} className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-semibold flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-[10px] text-emerald-400/80 font-medium italic">Clean Execution</span>
                )}
              </div>

              {/* Card Footer: Replay Button */}
              <div className="border-t border-[#1F2937] pt-3 flex items-center justify-between">
                <span className="text-[11px] text-gray-500 font-mono">
                  {t.session} Session
                </span>

                <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-black text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm">
                  <Play className="w-3 h-3 fill-current" />
                  <span>Replay Trade</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Trade Replay Modal */}
      <TradeReplayModal
        isOpen={isReplayModalOpen}
        trade={selectedTrade}
        allTrades={filteredTrades}
        onClose={() => setIsReplayModalOpen(false)}
        onSelectTrade={(t) => setSelectedTrade(t)}
      />

    </div>
  );
};
