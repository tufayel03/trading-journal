import React, { useState } from 'react';
import { 
  X, 
  Flame, 
  ArrowUpRight, 
  ArrowDownRight, 
  Star, 
  AlertTriangle, 
  Image as ImageIcon, 
  CheckCircle2, 
  BrainCircuit, 
  BarChart2, 
  FileText,
  Upload,
  Maximize2
} from 'lucide-react';
import { Trade } from '../../types';

interface TradeDetailModalProps {
  trade: Trade | null;
  onClose: () => void;
  onUpdateTrade: (updatedTrade: Trade) => void;
}

export const TradeDetailModal: React.FC<TradeDetailModalProps> = ({
  trade,
  onClose,
  onUpdateTrade
}) => {
  if (!trade) return null;

  const [activeTab, setActiveTab] = useState<'overview' | 'confluences' | 'psychology' | 'charts'>('overview');
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  const isWin = trade.netProfit >= 0.5;
  const isLoss = trade.netProfit <= -0.5;

  const handleBeforeChartUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        onUpdateTrade({ ...trade, beforeChartUrl: url });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAfterChartUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        onUpdateTrade({ ...trade, afterChartUrl: url });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0B0F19] border-b border-[#1F2937] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${trade.direction === 'BUY' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              {trade.direction === 'BUY' ? <ArrowUpRight className="w-5 h-5 stroke-[2.5]" /> : <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white flex items-center gap-1.5">
                  {trade.symbol === 'XAUUSD' && <Flame className="w-4 h-4 text-amber-400" />}
                  {trade.symbol}
                </span>
                <span className={`text-xs font-extrabold px-2 py-0.5 rounded ${
                  trade.direction === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                }`}>
                  {trade.direction} {trade.lotSize} Lots
                </span>
                <span className="text-xs text-gray-400 font-mono">#{trade.ticket || 'Manual'}</span>
              </div>
              <p className="text-xs text-gray-400">
                Closed {new Date(trade.closeTime).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Net Profit</span>
              <span className={`text-xl font-mono font-extrabold ${isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-gray-300'}`}>
                {isWin ? '+' : ''}${trade.netProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-[#1F2937] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 bg-[#0B0F19] border-b border-[#1F2937] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 py-3 border-b-2 transition-colors ${
              activeTab === 'overview' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Overview & Metrics
          </button>

          <button
            onClick={() => setActiveTab('confluences')}
            className={`flex items-center gap-1.5 py-3 border-b-2 transition-colors ${
              activeTab === 'confluences' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-indigo-400" />
            Execution & Confluences
          </button>

          <button
            onClick={() => setActiveTab('psychology')}
            className={`flex items-center gap-1.5 py-3 border-b-2 transition-colors ${
              activeTab === 'psychology' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-purple-400" />
            Psychology & Mistakes
          </button>

          <button
            onClick={() => setActiveTab('charts')}
            className={`flex items-center gap-1.5 py-3 border-b-2 transition-colors ${
              activeTab === 'charts' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-amber-400" />
            Chart Markups (Before / After)
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937]">
                  <span className="text-[10px] text-gray-400 uppercase block font-semibold">Pips Gained</span>
                  <span className={`text-base font-mono font-bold ${trade.pips >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {trade.pips >= 0 ? '+' : ''}{trade.pips} pips
                  </span>
                </div>

                <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937]">
                  <span className="text-[10px] text-gray-400 uppercase block font-semibold">R-Multiple</span>
                  <span className="text-base font-mono font-bold text-white">
                    {trade.rMultiple !== undefined ? `${trade.rMultiple}R` : 'N/A'}
                  </span>
                </div>

                <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937]">
                  <span className="text-[10px] text-gray-400 uppercase block font-semibold">Trading Session</span>
                  <span className="text-xs font-semibold text-amber-400 mt-1 block">
                    {trade.session}
                  </span>
                </div>

                <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1F2937]">
                  <span className="text-[10px] text-gray-400 uppercase block font-semibold">Commission / Swap</span>
                  <span className="text-xs font-mono text-gray-300 mt-1 block">
                    ${(trade.commission || 0) + (trade.swap || 0)}
                  </span>
                </div>
              </div>

              {/* Price Parameters Table */}
              <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937] space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Execution Price Parameters</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Open Price</span>
                    <span className="text-white font-bold">{trade.openPrice}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Close Price</span>
                    <span className="text-white font-bold">{trade.closePrice}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Stop Loss</span>
                    <span className="text-rose-400 font-bold">{trade.stopLoss || 'None'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Take Profit</span>
                    <span className="text-emerald-400 font-bold">{trade.takeProfit || 'None'}</span>
                  </div>
                </div>
              </div>

              {/* Journal Notes */}
              <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937] space-y-2">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-emerald-400" /> Trade Notes & Context
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {trade.notes || 'No detailed notes entered for this trade.'}
                </p>
              </div>

            </div>
          )}

          {/* TAB 2: CONFLUENCES */}
          {activeTab === 'confluences' && (
            <div className="space-y-6">
              <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937] space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Strategy & Confluence Tags</h4>
                <div className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 inline-block">
                  Strategy: {trade.strategy}
                </div>

                <div className="mt-4">
                  <label className="text-[11px] text-gray-400 font-medium block mb-2">Technical Confluences Present:</label>
                  <div className="flex flex-wrap gap-2">
                    {trade.confluences && trade.confluences.length > 0 ? (
                      trade.confluences.map(c => (
                        <span key={c} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          {c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 italic">No specific confluences tagged.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Execution Rating */}
              <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937] space-y-2">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Execution Quality Rating</h4>
                <div className="flex items-center gap-2 text-amber-400">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      onClick={() => onUpdateTrade({ ...trade, rating: star as any })}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star className={`w-6 h-6 ${star <= (trade.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-700'}`} />
                    </button>
                  ))}
                  <span className="text-xs text-gray-400 ml-2">({trade.rating || 0} / 5 Stars)</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PSYCHOLOGY */}
          {activeTab === 'psychology' && (
            <div className="space-y-6">
              
              {/* Emotional State */}
              <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937] space-y-3">
                <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Emotional State During Trade</h4>
                <div className="flex flex-wrap gap-2">
                  {(['Disciplined', 'Greedy', 'Fearful', 'Revenge', 'Neutral'] as const).map(emo => (
                    <button
                      key={emo}
                      onClick={() => onUpdateTrade({ ...trade, emotions: emo })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        trade.emotions === emo
                          ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/20'
                          : 'bg-[#111827] text-gray-400 border-gray-800 hover:text-white'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mistakes Engine */}
              <div className="bg-[#0B0F19] p-4 rounded-xl border border-rose-500/20 space-y-3">
                <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" /> Quantified Execution Mistakes
                </h4>
                {trade.mistakes && trade.mistakes.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {trade.mistakes.map(m => (
                        <span key={m} className="px-3 py-1 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          {m}
                        </span>
                      ))}
                    </div>
                    {trade.netProfit < 0 && (
                      <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300">
                        <strong>Mistake Impact:</strong> This error cost you <span className="font-mono font-bold">${Math.abs(trade.netProfit).toFixed(2)}</span> in drawdown capital!
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-emerald-400 font-medium">
                    ✓ Clean Execution: No execution errors or FOMO recorded for this trade!
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 4: CHARTS */}
          {activeTab === 'charts' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Before Chart */}
                <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Before Entry Chart Markup</h4>
                    <label className="cursor-pointer text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> Upload Image
                      <input type="file" accept="image/*" onChange={handleBeforeChartUpload} className="hidden" />
                    </label>
                  </div>

                  {trade.beforeChartUrl ? (
                    <div className="relative group rounded-lg overflow-hidden border border-[#1F2937] bg-black">
                      <img src={trade.beforeChartUrl} alt="Before Entry" className="w-full h-48 object-cover" />
                      <button
                        onClick={() => setFullscreenImage(trade.beforeChartUrl!)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-2 transition-opacity"
                      >
                        <Maximize2 className="w-5 h-5" /> Expand View
                      </button>
                    </div>
                  ) : (
                    <div className="h-48 border-2 border-dashed border-[#1F2937] rounded-lg flex flex-col items-center justify-center text-gray-500 text-xs p-4 text-center">
                      <ImageIcon className="w-8 h-8 text-gray-600 mb-2" />
                      No pre-trade chart markup uploaded yet.
                    </div>
                  )}
                </div>

                {/* After Chart */}
                <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937] space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">After Outcome Chart Result</h4>
                    <label className="cursor-pointer text-[11px] font-semibold text-emerald-400 hover:underline flex items-center gap-1">
                      <Upload className="w-3.5 h-3.5" /> Upload Image
                      <input type="file" accept="image/*" onChange={handleAfterChartUpload} className="hidden" />
                    </label>
                  </div>

                  {trade.afterChartUrl ? (
                    <div className="relative group rounded-lg overflow-hidden border border-[#1F2937] bg-black">
                      <img src={trade.afterChartUrl} alt="After Outcome" className="w-full h-48 object-cover" />
                      <button
                        onClick={() => setFullscreenImage(trade.afterChartUrl!)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold gap-2 transition-opacity"
                      >
                        <Maximize2 className="w-5 h-5" /> Expand View
                      </button>
                    </div>
                  ) : (
                    <div className="h-48 border-2 border-dashed border-[#1F2937] rounded-lg flex flex-col items-center justify-center text-gray-500 text-xs p-4 text-center">
                      <ImageIcon className="w-8 h-8 text-gray-600 mb-2" />
                      No post-trade outcome screenshot uploaded yet.
                    </div>
                  )}
                </div>

              </div>

            </div>
          )}

        </div>

      </div>

      {/* Fullscreen Image Preview Modal */}
      {fullscreenImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setFullscreenImage(null)}>
          <div className="relative max-w-5xl max-h-[90vh]">
            <img src={fullscreenImage} alt="Fullscreen Chart" className="max-w-full max-h-[85vh] rounded-lg border border-gray-700 shadow-2xl" />
            <button
              onClick={() => setFullscreenImage(null)}
              className="absolute top-2 right-2 p-2 bg-black/80 text-white rounded-full hover:bg-gray-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
