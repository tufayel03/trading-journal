import React, { useState } from 'react';
import { 
  BookOpen, 
  Award, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Flame, 
  Maximize2, 
  X,
  Target
} from 'lucide-react';
import { PlaybookSetup, Trade, TradingSession } from '../../types';

interface PlaybookViewProps {
  playbook: PlaybookSetup[];
  trades: Trade[];
  onAddSetup: (setup: PlaybookSetup) => void;
  onDeleteSetup: (setupId: string) => void;
}

export const PlaybookView: React.FC<PlaybookViewProps> = ({
  playbook,
  trades,
  onAddSetup,
  onDeleteSetup
}) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

  // New setup state
  const [title, setTitle] = useState('');
  const [strategyName, setStrategyName] = useState('ICT Silver Bullet + FVG');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState<string>('');
  const [mandatoryConfluences, setMandatoryConfluences] = useState<string>('');
  const [grade, setGrade] = useState<'A+' | 'A' | 'B'>('A+');

  const handleCreateSetup = (e: React.FormEvent) => {
    e.preventDefault();
    const newSetup: PlaybookSetup = {
      id: `pb-${Date.now()}`,
      title,
      strategyName,
      description,
      rules: rules.split('\n').filter(r => r.trim() !== ''),
      mandatoryConfluences: mandatoryConfluences.split(',').map(c => c.trim()).filter(c => c !== ''),
      timeframes: ['15M', '5M'],
      preferredSessions: ['NY_AM', 'LONDON_OPEN'],
      grade,
      createdAt: new Date().toISOString()
    };
    onAddSetup(newSetup);
    setIsAddModalOpen(false);
    setTitle('');
    setDescription('');
    setRules('');
    setMandatoryConfluences('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-[#111827] border border-amber-500/30 rounded-2xl p-6 shadow-xl bg-gradient-to-r from-[#111827] via-amber-950/20 to-[#111827] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              Trade Playbook & Grade-A Setups
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Document your highest probability edge models, rules, mandatory confluences, and chart markups
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-xl shadow-lg shadow-amber-500/20 shrink-0 transition-all"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          New Playbook Model
        </button>
      </div>

      {/* Playbook Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {playbook.map((setup) => {
          // Calculate live win rate for this strategy from real trades
          const matchingTrades = trades.filter(t => t.strategy === setup.strategyName);
          const totalMatching = matchingTrades.length;
          const winsMatching = matchingTrades.filter(t => t.netProfit > 0).length;
          const liveWinRate = totalMatching > 0 ? ((winsMatching / totalMatching) * 100).toFixed(1) : 'N/A';
          const livePnL = matchingTrades.reduce((sum, t) => sum + t.netProfit, 0);

          return (
            <div key={setup.id} className="bg-[#111827] border border-[#1F2937] rounded-xl p-5 shadow-md space-y-4 hover:border-amber-500/30 transition-all">
              
              {/* Header */}
              <div className="flex items-start justify-between border-b border-[#1F2937] pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-black ${
                      setup.grade === 'A+' ? 'bg-amber-500 text-black' : setup.grade === 'A' ? 'bg-emerald-500 text-black' : 'bg-blue-500 text-white'
                    }`}>
                      {setup.grade} SETUP
                    </span>
                    <h3 className="text-base font-bold text-white">{setup.title}</h3>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{setup.description}</p>
                </div>

                <button
                  onClick={() => onDeleteSetup(setup.id)}
                  className="text-gray-500 hover:text-rose-400 text-xs p-1"
                >
                  Delete
                </button>
              </div>

              {/* Live Journal Performance */}
              <div className="bg-[#0B0F19] p-3 rounded-lg border border-[#1F2937] flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Journaled Executions</span>
                  <span className="text-white font-bold">{totalMatching} Trades</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Live Win Rate</span>
                  <span className="text-amber-400 font-bold">{liveWinRate}%</span>
                </div>
                <div>
                  <span className="text-gray-400 text-[10px] uppercase block">Cumulative Net P&L</span>
                  <span className={`font-bold ${livePnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {livePnL >= 0 ? '+' : ''}${livePnL.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Rules List */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block">Execution Rules Checklist</span>
                <ul className="space-y-1">
                  {setup.rules.map((rule, idx) => (
                    <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                      <span className="text-amber-400 font-mono font-bold">{idx + 1}.</span>
                      <span>{rule}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mandatory Confluences */}
              <div>
                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-1.5">Mandatory Confluences</span>
                <div className="flex flex-wrap gap-1.5">
                  {setup.mandatoryConfluences.map(c => (
                    <span key={c} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Chart Screenshots */}
              {(setup.exampleBeforeChart || setup.exampleAfterChart) && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1F2937]">
                  {setup.exampleBeforeChart && (
                    <div 
                      onClick={() => setFullscreenImage(setup.exampleBeforeChart!)}
                      className="relative group rounded-lg overflow-hidden border border-[#1F2937] cursor-pointer"
                    >
                      <img src={setup.exampleBeforeChart} alt="Setup Before" className="w-full h-24 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold">
                        View Before
                      </div>
                    </div>
                  )}

                  {setup.exampleAfterChart && (
                    <div 
                      onClick={() => setFullscreenImage(setup.exampleAfterChart!)}
                      className="relative group rounded-lg overflow-hidden border border-[#1F2937] cursor-pointer"
                    >
                      <img src={setup.exampleAfterChart} alt="Setup After" className="w-full h-24 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold">
                        View After
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Add Setup Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#111827] border border-[#1F2937] rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 text-xs">
            
            <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-400" /> Create New Playbook Model
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSetup} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Model / Setup Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Gold NY AM Silver Bullet (10 AM)"
                  className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Linked Strategy Tag</label>
                  <input
                    type="text"
                    required
                    value={strategyName}
                    onChange={(e) => setStrategyName(e.target.value)}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg p-2.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Grade</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value as any)}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg p-2.5 text-white font-bold"
                  >
                    <option value="A+">A+ Setup (Highest Quality)</option>
                    <option value="A">A Setup</option>
                    <option value="B">B Setup</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of when this setup forms..."
                  className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Rules (One per line)</label>
                <textarea
                  rows={3}
                  value={rules}
                  onChange={(e) => setRules(e.target.value)}
                  placeholder="Rule 1: Sweep Asian High/Low&#10;Rule 2: Wait for 15M FVG displacement..."
                  className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Mandatory Confluences (Comma-separated)</label>
                <input
                  type="text"
                  value={mandatoryConfluences}
                  onChange={(e) => setMandatoryConfluences(e.target.value)}
                  placeholder="15M FVG, Asian High Sweep, Killzone Time"
                  className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2937]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-[#1F2937] text-gray-300 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-xs"
                >
                  Create Setup
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Fullscreen Image View */}
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
