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
  ChevronUp,
  Activity,
  Zap,
  Upload,
  Plus,
  Play,
  Video
} from 'lucide-react';
import { Trade, OpenPosition } from '../../types';

interface TradeTableProps {
  trades: Trade[];
  openPositions?: OpenPosition[];
  selectedAccount?: string;
  onViewTrade: (trade: Trade) => void;
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
  onExportSelected: (trades: Trade[]) => void;
  onReplayTrade?: (trade: Trade) => void;
  onOpenMT5Sync?: () => void;
  onOpenImport?: () => void;
  onOpenManual?: () => void;
  onClearAllTrades?: () => void;
}

export const TradeTable: React.FC<TradeTableProps> = ({
  trades,
  openPositions = [],
  selectedAccount = 'ALL',
  onViewTrade,
  onEditTrade,
  onDeleteTrade,
  onExportSelected,
  onReplayTrade,
  onOpenMT5Sync,
  onOpenImport,
  onOpenManual,
  onClearAllTrades
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
    <div className="space-y-6">
      
      {/* 1. LIVE ACTIVE POSITIONS SECTION (When MT5 positions are open) */}
      {openPositions && openPositions.length > 0 && (
        <div className="bg-[#111827] border border-emerald-500/30 rounded-xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1F2937]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <Activity className="w-5 h-5 text-emerald-400" />
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  Live Open Positions ({openPositions.length})
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    MT5 Real-Time
                  </span>
                </h3>
                <p className="text-xs text-gray-400">Active market trades currently running on your MT5 account</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-[#1F2937] text-[10px] uppercase font-semibold">
                  <th className="pb-3 pl-2">Ticket</th>
                  <th className="pb-3">Symbol</th>
                  <th className="pb-3 text-center">Type</th>
                  <th className="pb-3 text-center">Lots</th>
                  <th className="pb-3 text-right">Open Price</th>
                  <th className="pb-3 text-right">Current Price</th>
                  <th className="pb-3 text-right">S / L</th>
                  <th className="pb-3 text-right">T / P</th>
                  <th className="pb-3 text-right pr-2">Floating P&L ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1F2937]">
                {openPositions.map((pos) => {
                  const isProfit = pos.profit >= 0;
                  const isPosCent = pos.isCent || pos.accountCurrency === 'USC';
                  return (
                    <tr key={pos.ticket} className="hover:bg-[#0B0F19] transition-colors">
                      <td className="py-3 pl-2 font-mono text-[11px] text-gray-400">
                        <div>#{pos.ticket}</div>
                        {pos.accountLogin && (
                          <span className={`text-[9px] font-sans px-1.5 py-0.2 rounded border ${
                            isPosCent ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                          }`}>
                            {isPosCent ? `Cent #${pos.accountLogin}` : `Acc #${pos.accountLogin}`}
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1.5 font-bold text-white">
                          {pos.symbol.includes('XAU') && <Flame className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{pos.symbol}</span>
                        </div>
                      </td>
                      <td className="py-3 text-center">
                        <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          pos.direction === 'BUY' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {pos.direction === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {pos.direction}
                        </span>
                      </td>
                      <td className="py-3 text-center font-mono font-semibold text-gray-200">
                        {pos.lotSize}
                      </td>
                      <td className="py-3 text-right font-mono text-gray-300">
                        {pos.openPrice}
                      </td>
                      <td className="py-3 text-right font-mono font-bold text-white">
                        {pos.currentPrice}
                      </td>
                      <td className="py-3 text-right font-mono text-gray-400">
                        {pos.stopLoss && pos.stopLoss > 0 ? pos.stopLoss : '-'}
                      </td>
                      <td className="py-3 text-right font-mono text-gray-400">
                        {pos.takeProfit && pos.takeProfit > 0 ? pos.takeProfit : '-'}
                      </td>
                      <td className="py-3 text-right pr-2 font-mono font-extrabold text-sm whitespace-nowrap">
                        <div className={`px-2 py-0.5 rounded ${
                          isProfit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {selectedAccount !== 'ALL' && isPosCent ? (
                            <>
                              <span>{isProfit ? '+' : ''}{(pos.nativeProfit !== undefined ? pos.nativeProfit : pos.profit * 100).toFixed(2)} USC</span>
                              <div className="text-[9px] text-gray-400 font-normal">
                                (≈ {isProfit ? '+' : ''}${pos.profit.toFixed(2)} USD)
                              </div>
                            </>
                          ) : (
                            <>
                              <span>{isProfit ? '+' : ''}${pos.profit.toFixed(2)}</span>
                              {isPosCent && (
                                <div className="text-[9px] text-amber-400/80 font-normal">
                                  {(pos.nativeProfit !== undefined ? pos.nativeProfit : pos.profit * 100).toFixed(2)} USC
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. HISTORICAL CLOSED TRADES LOG */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md">
        
        {/* Table Header Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#1F2937]">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Closed Trades History ({trades.length})</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center gap-1" title="Exness History Protection: All synced trades are permanently preserved in your local vault">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Permanent Vault
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 ? (
              <>
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
              </>
            ) : (
              trades.length > 0 && onClearAllTrades && (
                <button
                  onClick={onClearAllTrades}
                  className="text-xs text-gray-500 hover:text-rose-400 transition-colors px-2.5 py-1 rounded hover:bg-rose-500/10"
                  title="Clear all trades from journal"
                >
                  Clear All Trades
                </button>
              )
            )}
          </div>
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
                  <td colSpan={13} className="py-14 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="w-12 h-12 rounded-full bg-[#1F2937] flex items-center justify-center mx-auto text-gray-400">
                        <Layers className="w-6 h-6 text-gray-500" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">No Trades Recorded Yet</h4>
                        <p className="text-xs text-gray-400 mt-1">
                          Mock trades have been removed. Connect MT5 to auto-sync your real trades, import a Broker CSV, or enter a manual trade.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-3 pt-2">
                        {onOpenMT5Sync && (
                          <button
                            onClick={onOpenMT5Sync}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            Auto-Sync MT5
                          </button>
                        )}
                        {onOpenImport && (
                          <button
                            onClick={onOpenImport}
                            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Import Broker CSV
                          </button>
                        )}
                        {onOpenManual && (
                          <button
                            onClick={onOpenManual}
                            className="px-3.5 py-2 bg-[#1F2937] hover:bg-[#374151] text-gray-200 font-semibold rounded-lg text-xs flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            Manual Entry
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedTrades.map((t) => {
                  const isWin = t.netProfit > 0;
                  const isLoss = t.netProfit < 0;
                  const isSelected = selectedIds.has(t.id);
                  const closeDateFormatted = new Date(t.closeTime).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });

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
                        <div className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                          <span>#{t.ticket || 'Manual'}</span>
                          {t.accountLogin && (
                            <span className={`text-[9px] font-sans px-1 py-0.2 rounded border ${
                              t.isCent || t.accountCurrency === 'USC'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                            }`}>
                              {t.isCent || t.accountCurrency === 'USC' ? `Cent #${t.accountLogin}` : `Acc #${t.accountLogin}`}
                            </span>
                          )}
                        </div>
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
                        <div className={isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-gray-400'}>
                          {selectedAccount !== 'ALL' && (t.isCent || t.accountCurrency === 'USC') ? (
                            <>
                              <div>{isWin ? '+' : ''}{(t.nativeNetProfit !== undefined ? t.nativeNetProfit : t.netProfit * 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC</div>
                              <div className="text-[10px] text-gray-400 font-normal">
                                (≈ {isWin ? '+' : ''}${t.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD)
                              </div>
                            </>
                          ) : (
                            <>
                              <div>{isWin ? '+' : ''}${t.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                              {(t.isCent || t.accountCurrency === 'USC') && (
                                <div className="text-[10px] text-amber-400/80 font-normal">
                                  {(t.nativeNetProfit !== undefined ? t.nativeNetProfit : t.netProfit * 100).toFixed(2)} USC
                                </div>
                              )}
                            </>
                          )}
                        </div>
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
                            <button
                              onClick={() => onEditTrade(t)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 transition-all"
                              title={`Rated ${t.rating}/5 Stars - Click to edit`}
                            >
                              <Star className="w-3 h-3 fill-amber-400" />
                              <span className="text-[10px] font-bold text-amber-300 font-mono">{t.rating}★</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => onEditTrade(t)}
                              className="text-gray-600 hover:text-amber-400 text-[10px] px-2 py-0.5 rounded hover:bg-amber-500/10 transition-colors"
                              title="Click to rate this trade"
                            >
                              -
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 text-right pr-2">
                        <div className="flex items-center justify-end gap-1">
                          {onReplayTrade && (
                            <button
                              onClick={() => onReplayTrade(t)}
                              title="Replay Trade on TradingView Candlestick Chart (TradeZella Mode)"
                              className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500 hover:text-black text-emerald-400 border border-emerald-500/20 rounded-md transition-all flex items-center gap-1 font-bold text-[10px] shadow-sm"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span className="hidden xl:inline">Replay</span>
                            </button>
                          )}

                          <button
                            onClick={() => onViewTrade(t)}
                            title="View Trade Modal & Screenshots"
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" />
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
    </div>
  );
};
