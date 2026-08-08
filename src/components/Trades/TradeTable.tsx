import React, { useState } from 'react';
import { 
  Flame, 
  ArrowUpRight, 
  ArrowDownRight, 
  Eye, 
  Trash2, 
  Edit2, 
  Star, 
  AlertTriangle, 
  Download, 
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Trade } from '../../types';

interface TradeTableProps {
  trades: Trade[];
  onViewTrade: (trade: Trade) => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
  onExportSelected: (trades: Trade[]) => void;
}

export const TradeTable: React.FC<TradeTableProps> = ({
  trades,
  onViewTrade,
  onEditTrade,
  onDeleteTrade,
  onExportSelected
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'closeTime' | 'netProfit' | 'rMultiple' | 'pips'>('closeTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const toggleSelectAll = () => {
    if (selectedIds.size === trades.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(trades.map(t => t.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSort = (field: 'closeTime' | 'netProfit' | 'rMultiple' | 'pips') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedTrades = [...trades].sort((a, b) => {
    let valA = a[sortField] || 0;
    let valB = b[sortField] || 0;

    if (sortField === 'closeTime') {
      valA = new Date(a.closeTime).getTime();
      valB = new Date(b.closeTime).getTime();
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const selectedTradesList = trades.filter(t => selectedIds.has(t.id));

  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md mb-6">
      
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Trade History Log ({trades.length})</h3>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onExportSelected(selectedTradesList)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export Selected ({selectedIds.size})
            </button>

            <button
              onClick={() => {
                if (confirm(`Delete ${selectedIds.size} selected trades?`)) {
                  selectedIds.forEach(id => onDeleteTrade(id));
                  setSelectedIds(new Set());
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-medium transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedIds.size})
            </button>
          </div>
        )}
      </div>

      {/* Table Element */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-[#1F2937] text-[10px] uppercase font-semibold">
              <th className="pb-3 pl-2 w-8">
                <input
                  type="checkbox"
                  checked={trades.length > 0 && selectedIds.size === trades.length}
                  onChange={toggleSelectAll}
                  className="rounded bg-[#0B0F19] border-gray-700 text-emerald-500 focus:ring-0"
                />
              </th>
              <th 
                className="pb-3 cursor-pointer hover:text-white"
                onClick={() => handleSort('closeTime')}
              >
                <div className="flex items-center gap-1">
                  Date / Time
                  {sortField === 'closeTime' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="pb-3">Symbol / Ticket</th>
              <th className="pb-3 text-center">Type</th>
              <th className="pb-3 text-center">Lots</th>
              <th className="pb-3 text-right">Entry / Exit</th>
              <th 
                className="pb-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('pips')}
              >
                <div className="flex items-center justify-end gap-1">
                  Pips
                  {sortField === 'pips' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th 
                className="pb-3 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('rMultiple')}
              >
                <div className="flex items-center justify-end gap-1">
                  R:R
                  {sortField === 'rMultiple' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th 
                className="pb-3 text-right cursor-pointer hover:text-white pr-2"
                onClick={() => handleSort('netProfit')}
              >
                <div className="flex items-center justify-end gap-1">
                  Net P&L ($)
                  {sortField === 'netProfit' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </div>
              </th>
              <th className="pb-3">Strategy / Session</th>
              <th className="pb-3">Mistakes</th>
              <th className="pb-3 text-center">Rating</th>
              <th className="pb-3 text-right pr-2">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1F2937]">
            {sortedTrades.length === 0 ? (
              <tr>
                <td colSpan={13} className="py-12 text-center text-gray-500">
                  No trades match the active filter criteria.
                </td>
              </tr>
            ) : (
              sortedTrades.map((t) => {
                const isWin = t.netProfit >= 0.5;
                const isLoss = t.netProfit <= -0.5;
                const isSelected = selectedIds.has(t.id);
                const closeDateFormatted = new Date(t.closeTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

                return (
                  <tr 
                    key={t.id} 
                    className={`hover:bg-[#0B0F19] transition-colors ${isSelected ? 'bg-emerald-950/20' : ''}`}
                  >
                    <td className="py-3 pl-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(t.id)}
                        className="rounded bg-[#0B0F19] border-gray-700 text-emerald-500 focus:ring-0"
                      />
                    </td>

                    {/* Close Date */}
                    <td className="py-3 font-mono text-[11px] text-gray-300 whitespace-nowrap">
                      {closeDateFormatted}
                    </td>

                    {/* Symbol & Ticket */}
                    <td className="py-3">
                      <div className="flex items-center gap-1.5 font-bold text-white">
                        {t.symbol === 'XAUUSD' && <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        <span>{t.symbol}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">#{t.ticket || 'Manual'}</div>
                    </td>

                    {/* Direction */}
                    <td className="py-3 text-center">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                        t.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {t.direction === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {t.direction}
                      </span>
                    </td>

                    {/* Lot Size */}
                    <td className="py-3 text-center font-mono font-semibold text-gray-200">
                      {t.lotSize}
                    </td>

                    {/* Entry / Exit Price */}
                    <td className="py-3 text-right font-mono text-[11px]">
                      <div className="text-gray-300">{t.openPrice}</div>
                      <div className="text-gray-400 text-[10px]">{t.closePrice}</div>
                    </td>

                    {/* Pips */}
                    <td className="py-3 text-right font-mono font-semibold">
                      <span className={t.pips >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {t.pips >= 0 ? '+' : ''}{t.pips}
                      </span>
                    </td>

                    {/* R-Multiple */}
                    <td className="py-3 text-right font-mono text-gray-300">
                      {t.rMultiple !== undefined ? `${t.rMultiple}R` : '-'}
                    </td>

                    {/* Net Profit ($) */}
                    <td className="py-3 text-right pr-2 font-mono font-extrabold text-sm whitespace-nowrap">
                      <span className={isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-gray-400'}>
                        {isWin ? '+' : ''}${t.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Strategy & Session */}
                    <td className="py-3">
                      <div className="font-medium text-gray-200 text-[11px] truncate max-w-28">{t.strategy}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{t.session}</div>
                    </td>

                    {/* Mistakes Tags */}
                    <td className="py-3">
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
                        <span className="text-[10px] text-emerald-400/80 font-medium italic">Clean Trade</span>
                      )}
                    </td>

                    {/* Rating */}
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center text-amber-400">
                        {t.rating ? (
                          <div className="flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-amber-400" />
                            <span className="text-[10px] font-bold">{t.rating}</span>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-[10px]">-</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 text-right pr-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onViewTrade(t)}
                          title="View Trade Modal & Screenshots"
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        </button>

                        <button
                          onClick={() => onEditTrade(t)}
                          title="Edit Trade"
                          className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Delete trade #${t.ticket || t.id}?`)) {
                              onDeleteTrade(t.id);
                            }
                          }}
                          title="Delete Trade"
                          className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
