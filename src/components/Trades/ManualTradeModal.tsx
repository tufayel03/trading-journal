import React, { useState, useEffect } from 'react';
import { X, Flame, Plus, Calculator, DollarSign, Target, Star, AlertTriangle } from 'lucide-react';
import { Trade, TradeDirection, TradingSession, TradeEmotion, UserSettings } from '../../types';
import { calculatePips, calculatePlannedRisk, calculateRMultiple, autoDetectSession, normalizeSymbol } from '../../lib/calculations';

interface ManualTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTrade: (trade: Trade) => void;
  settings: UserSettings;
  tradeToEdit?: Trade | null;
}

export const ManualTradeModal: React.FC<ManualTradeModalProps> = ({
  isOpen,
  onClose,
  onSaveTrade,
  settings,
  tradeToEdit
}) => {
  if (!isOpen) return null;

  const [symbol, setSymbol] = useState<string>('XAUUSD');
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [ticket, setTicket] = useState<string>('');
  const [openTime, setOpenTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [closeTime, setCloseTime] = useState<string>(new Date().toISOString().slice(0, 16));
  
  const [openPrice, setOpenPrice] = useState<number>(2380.00);
  const [closePrice, setClosePrice] = useState<number>(2392.50);
  const [stopLoss, setStopLoss] = useState<number | undefined>(2374.00);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(2395.00);
  const [lotSize, setLotSize] = useState<number>(1.0);
  
  const [netProfit, setNetProfit] = useState<number>(1250.00);
  const [isAutoProfit, setIsAutoProfit] = useState<boolean>(true);

  const [commission, setCommission] = useState<number>(7.00);
  const [swap, setSwap] = useState<number>(0);

  const [session, setSession] = useState<TradingSession>('NY_AM');
  const [strategy, setStrategy] = useState<string>(settings.strategies[0] || 'ICT Silver Bullet + FVG');
  const [selectedConfluences, setSelectedConfluences] = useState<string[]>([]);
  const [selectedMistakes, setSelectedMistakes] = useState<string[]>([]);
  const [emotions, setEmotions] = useState<TradeEmotion>('Disciplined');
  const [notes, setNotes] = useState<string>('');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);

  useEffect(() => {
    if (tradeToEdit) {
      setSymbol(tradeToEdit.symbol);
      setDirection(tradeToEdit.direction);
      setTicket(tradeToEdit.ticket || '');
      setOpenTime(tradeToEdit.openTime.slice(0, 16));
      setCloseTime(tradeToEdit.closeTime.slice(0, 16));
      setOpenPrice(tradeToEdit.openPrice);
      setClosePrice(tradeToEdit.closePrice);
      setStopLoss(tradeToEdit.stopLoss);
      setTakeProfit(tradeToEdit.takeProfit);
      setLotSize(tradeToEdit.lotSize);
      setNetProfit(tradeToEdit.netProfit);
      setIsAutoProfit(false);
      setCommission(tradeToEdit.commission || 0);
      setSwap(tradeToEdit.swap || 0);
      setSession(tradeToEdit.session);
      setStrategy(tradeToEdit.strategy);
      setSelectedConfluences(tradeToEdit.confluences || []);
      setSelectedMistakes(tradeToEdit.mistakes || []);
      setEmotions(tradeToEdit.emotions);
      setNotes(tradeToEdit.notes || '');
      setRating(tradeToEdit.rating || 5);
    }
  }, [tradeToEdit]);

  // Recalculate pips, risk, and auto profit whenever price/lot/symbol changes
  const computedPips = calculatePips(symbol, direction, openPrice, closePrice);
  const plannedRisk = calculatePlannedRisk(symbol, openPrice, stopLoss, lotSize);

  useEffect(() => {
    if (isAutoProfit) {
      const norm = normalizeSymbol(symbol);
      let autoProfit = 0;
      if (norm === 'XAUUSD') {
        autoProfit = (direction === 'BUY' ? closePrice - openPrice : openPrice - closePrice) * lotSize * 100;
      } else {
        autoProfit = (direction === 'BUY' ? closePrice - openPrice : openPrice - closePrice) * lotSize * 100000;
      }
      setNetProfit(Number((autoProfit - commission - swap).toFixed(2)));
    }
  }, [openPrice, closePrice, lotSize, direction, symbol, commission, swap, isAutoProfit]);

  const computedR = calculateRMultiple(netProfit, plannedRisk);

  const toggleConfluence = (item: string) => {
    setSelectedConfluences(prev => 
      prev.includes(item) ? prev.filter(c => c !== item) : [...prev, item]
    );
  };

  const toggleMistake = (item: string) => {
    setSelectedMistakes(prev => 
      prev.includes(item) ? prev.filter(m => m !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trade: Trade = {
      id: tradeToEdit ? tradeToEdit.id : `trd-${Date.now()}`,
      ticket: ticket || tradeToEdit?.ticket || `man-${Date.now().toString().slice(-6)}`,
      symbol: normalizeSymbol(symbol),
      direction,
      openTime: new Date(openTime).toISOString(),
      closeTime: new Date(closeTime).toISOString(),
      openPrice,
      closePrice,
      stopLoss,
      takeProfit,
      lotSize,
      netProfit,
      nativeNetProfit: tradeToEdit?.nativeNetProfit !== undefined ? tradeToEdit.nativeNetProfit : netProfit,
      pips: computedPips,
      rMultiple: computedR,
      commission,
      swap,
      nativeCommission: tradeToEdit?.nativeCommission,
      nativeSwap: tradeToEdit?.nativeSwap,
      session: session || autoDetectSession(openTime),
      strategy,
      confluences: selectedConfluences,
      mistakes: selectedMistakes,
      emotions,
      notes,
      rating,
      accountLogin: tradeToEdit?.accountLogin,
      accountServer: tradeToEdit?.accountServer,
      accountCurrency: tradeToEdit?.accountCurrency,
      isCent: tradeToEdit?.isCent,
      beforeChartUrl: tradeToEdit?.beforeChartUrl,
      afterChartUrl: tradeToEdit?.afterChartUrl
    };

    onSaveTrade(trade);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B0F19] border-b border-[#1F2937] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-bold text-white">
              {tradeToEdit ? 'Edit Executed Trade' : 'Log New Executed Trade'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1F2937]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Row 1: Symbol, Direction, Ticket, Lot Size */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Symbol / Pair</label>
              <input
                type="text"
                required
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="XAUUSD, EURUSD..."
                className="w-full bg-[#0B0F19] border border-[#1F2937] focus:border-emerald-500 rounded-lg px-3 py-2 text-white font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Direction</label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as TradeDirection)}
                className="w-full bg-[#0B0F19] border border-[#1F2937] focus:border-emerald-500 rounded-lg px-3 py-2 text-white font-bold"
              >
                <option value="BUY">BUY (Long)</option>
                <option value="SELL">SELL (Short)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Ticket #</label>
              <input
                type="text"
                value={ticket}
                onChange={(e) => setTicket(e.target.value)}
                placeholder="e.g. 10849201"
                className="w-full bg-[#0B0F19] border border-[#1F2937] focus:border-emerald-500 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Lot Size</label>
              <input
                type="number"
                step="0.01"
                required
                value={lotSize}
                onChange={(e) => setLotSize(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0B0F19] border border-[#1F2937] focus:border-emerald-500 rounded-lg px-3 py-2 text-white font-mono font-bold"
              />
            </div>
          </div>

          {/* Row 2: Prices */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937]">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Entry Price</label>
              <input
                type="number"
                step="any"
                required
                value={openPrice}
                onChange={(e) => setOpenPrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Exit Price</label>
              <input
                type="number"
                step="any"
                required
                value={closePrice}
                onChange={(e) => setClosePrice(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-rose-400 block mb-1">Stop Loss (SL)</label>
              <input
                type="number"
                step="any"
                value={stopLoss || ''}
                onChange={(e) => setStopLoss(parseFloat(e.target.value) || undefined)}
                placeholder="Optional"
                className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white font-mono text-rose-300"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Take Profit (TP)</label>
              <input
                type="number"
                step="any"
                value={takeProfit || ''}
                onChange={(e) => setTakeProfit(parseFloat(e.target.value) || undefined)}
                placeholder="Optional"
                className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white font-mono text-emerald-300"
              />
            </div>
          </div>

          {/* Live Engine Calculation Preview Bar */}
          <div className="bg-gradient-to-r from-emerald-950/40 via-amber-950/20 to-purple-950/30 p-3 rounded-xl border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 font-mono">
            <div>
              <span className="text-[10px] text-gray-400 uppercase block">Calculated Pips</span>
              <span className={`font-bold ${computedPips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {computedPips >= 0 ? '+' : ''}{computedPips} pips
              </span>
            </div>

            <div>
              <span className="text-[10px] text-gray-400 uppercase block">Planned Risk ($)</span>
              <span className="font-bold text-rose-400">${plannedRisk.toFixed(2)}</span>
            </div>

            <div>
              <span className="text-[10px] text-gray-400 uppercase block">R-Multiple</span>
              <span className="font-bold text-amber-400">{computedR !== undefined ? `${computedR}R` : 'N/A'}</span>
            </div>

            <div>
              <label className="text-[10px] text-gray-400 uppercase block">Net Profit ($)</label>
              <input
                type="number"
                step="any"
                value={netProfit}
                onChange={(e) => {
                  setNetProfit(parseFloat(e.target.value) || 0);
                  setIsAutoProfit(false);
                }}
                className="w-28 bg-[#0B0F19] border border-[#1F2937] rounded px-2 py-0.5 text-right font-bold text-emerald-400"
              />
            </div>
          </div>

          {/* Row 3: Timestamps & Session */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Open Time</label>
              <input
                type="datetime-local"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Close Time</label>
              <input
                type="datetime-local"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Trading Session</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value as TradingSession)}
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-2.5 py-1.5 text-white"
              >
                <option value="ASIAN">Asian Session</option>
                <option value="LONDON_OPEN">London Open</option>
                <option value="NY_AM">NY AM (Morning)</option>
                <option value="NY_PM">NY PM (Afternoon)</option>
                <option value="LONDON_CLOSE">London Close</option>
              </select>
            </div>
          </div>

          {/* Strategy & Emotion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Strategy / Setup Model</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-3 py-2 text-white"
              >
                {settings.strategies.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Emotional State</label>
              <select
                value={emotions}
                onChange={(e) => setEmotions(e.target.value as TradeEmotion)}
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-3 py-2 text-white"
              >
                <option value="Disciplined">Disciplined</option>
                <option value="Greedy">Greedy</option>
                <option value="Fearful">Fearful</option>
                <option value="Revenge">Revenge</option>
                <option value="Neutral">Neutral</option>
              </select>
            </div>
          </div>

          {/* Confluence Checkboxes */}
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5">Confluence Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {settings.confluences.map(c => {
                const active = selectedConfluences.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleConfluence(c)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      active ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-[#0B0F19] text-gray-400 border-gray-800'
                    }`}
                  >
                    {active ? '✓ ' : ''}{c}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mistakes Tag Multi-Select */}
          <div>
            <label className="text-[10px] uppercase font-bold text-rose-400 block mb-1.5">Execution Mistakes (If Any)</label>
            <div className="flex flex-wrap gap-1.5">
              {settings.mistakes.map(m => {
                const active = selectedMistakes.includes(m);
                return (
                  <button
                    type="button"
                    key={m}
                    onClick={() => toggleMistake(m)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                      active ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold' : 'bg-[#0B0F19] text-gray-400 border-gray-800'
                    }`}
                  >
                    {active ? '⚠ ' : ''}{m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Execution Quality (Star Rating) */}
          <div className="bg-[#0B0F19] p-3.5 rounded-xl border border-[#1F2937] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1.5 mb-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                Execution Quality (Star Rating)
              </label>
              <p className="text-[11px] text-gray-400">
                {rating === 5 && '⭐⭐⭐⭐⭐ 5 Stars - Flawless Execution (A+ Setup, Followed All Rules)'}
                {rating === 4 && '⭐⭐⭐⭐ 4 Stars - Solid Execution (Minor Plan Deviation)'}
                {rating === 3 && '⭐⭐⭐ 3 Stars - Average (Hesitant / Incomplete Rules)'}
                {rating === 2 && '⭐⭐ 2 Stars - Poor Execution (Significant Rule Violations)'}
                {rating === 1 && '⭐ 1 Star - Terrible Execution (Tilt / Impulsive Trade)'}
                {!rating && 'Click a star to grade your trade execution'}
              </p>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star as 1 | 2 | 3 | 4 | 5)}
                  className={`p-1.5 rounded-lg transition-all ${
                    (rating || 0) >= star
                      ? 'text-amber-400 hover:scale-110'
                      : 'text-gray-600 hover:text-amber-400/60'
                  }`}
                  title={`Rate ${star} Star${star > 1 ? 's' : ''}`}
                >
                  <Star className={`w-5 h-5 ${(rating || 0) >= star ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
              ))}
              {rating && (
                <button
                  type="button"
                  onClick={() => setRating(undefined as any)}
                  className="ml-2 text-[10px] text-gray-500 hover:text-gray-300 underline"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Journal Notes & Execution Analysis</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why did you take this entry? How was market structure?"
              className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg p-2.5 text-white placeholder-gray-600 outline-none focus:border-emerald-500"
            />
          </div>

          {/* Submit */}
          <div className="pt-2 flex justify-end gap-3 border-t border-[#1F2937]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1F2937] text-gray-300 rounded-lg text-xs font-medium hover:bg-[#374151]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-600/20"
            >
              {tradeToEdit ? 'Save Changes' : 'Save Trade to Journal'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
