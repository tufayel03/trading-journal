import React, { useState } from 'react';
import { X, Settings, RotateCcw, Download, Plus, Trash2, DollarSign, Palette } from 'lucide-react';
import { UserSettings, Trade, PlaybookSetup } from '../../types';
import { ThemeSwitcher } from '../ThemeSwitcher';
import { ThemeId } from '../../lib/theme';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
  onResetToSample: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  currentTheme: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetToSample,
  onExportJSON,
  onExportCSV,
  currentTheme,
  onThemeChange
}) => {
  if (!isOpen) return null;

  const [initialBalance, setInitialBalance] = useState<number>(settings.initialBalance);
  const [currency, setCurrency] = useState<string>(settings.currency);
  const [defaultRiskPercent, setDefaultRiskPercent] = useState<number>(settings.defaultRiskPercent);

  const [strategies, setStrategies] = useState<string[]>(settings.strategies);
  const [newStrategy, setNewStrategy] = useState<string>('');

  const [confluences, setConfluences] = useState<string[]>(settings.confluences);
  const [newConfluence, setNewConfluence] = useState<string>('');

  const [mistakes, setMistakes] = useState<string[]>(settings.mistakes);
  const [newMistake, setNewMistake] = useState<string>('');

  const handleSave = () => {
    onSaveSettings({
      initialBalance,
      currency,
      defaultRiskPercent,
      strategies,
      confluences,
      mistakes
    });
    onClose();
  };

  const addStrategy = () => {
    if (newStrategy.trim() && !strategies.includes(newStrategy.trim())) {
      setStrategies([...strategies, newStrategy.trim()]);
      setNewStrategy('');
    }
  };

  const addConfluence = () => {
    if (newConfluence.trim() && !confluences.includes(newConfluence.trim())) {
      setConfluences([...confluences, newConfluence.trim()]);
      setNewConfluence('');
    }
  };

  const addMistake = () => {
    if (newMistake.trim() && !mistakes.includes(newMistake.trim())) {
      setMistakes([...mistakes, newMistake.trim()]);
      setNewMistake('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0B0F19] border-b border-[#1F2937] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-white">Account & System Configuration</h3>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1F2937]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          
          {/* Color Theme Selector Section */}
          <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937]">
            <ThemeSwitcher
              currentTheme={currentTheme}
              onThemeChange={onThemeChange}
              variant="inline"
            />
          </div>

          {/* Account Capital */}
          <div className="bg-[#0B0F19] p-4 rounded-xl border border-[#1F2937] space-y-3">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Capital & Risk Parameters
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Starting Capital ($)</label>
                <input
                  type="number"
                  value={initialBalance}
                  onChange={(e) => setInitialBalance(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Base Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-white font-bold"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Default Risk % / Trade</label>
                <input
                  type="number"
                  step="0.1"
                  value={defaultRiskPercent}
                  onChange={(e) => setDefaultRiskPercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#111827] border border-[#1F2937] rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Custom Strategies */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-gray-400 block">Manage Strategy Options</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New strategy name..."
                value={newStrategy}
                onChange={(e) => setNewStrategy(e.target.value)}
                className="flex-1 bg-[#0B0F19] border border-[#1F2937] rounded-lg px-3 py-1.5 text-white"
              />
              <button onClick={addStrategy} className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {strategies.map(s => (
                <span key={s} className="px-2.5 py-1 rounded-lg bg-[#0B0F19] text-gray-200 border border-gray-800 text-xs font-medium flex items-center gap-1.5">
                  {s}
                  <button onClick={() => setStrategies(strategies.filter(x => x !== s))} className="text-gray-500 hover:text-rose-400">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Custom Confluences */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-gray-400 block">Manage Confluence Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New confluence..."
                value={newConfluence}
                onChange={(e) => setNewConfluence(e.target.value)}
                className="flex-1 bg-[#0B0F19] border border-[#1F2937] rounded-lg px-3 py-1.5 text-white"
              />
              <button onClick={addConfluence} className="px-3 py-1.5 bg-emerald-600 text-white font-bold rounded-lg">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {confluences.map(c => (
                <span key={c} className="px-2.5 py-1 rounded-lg bg-[#0B0F19] text-emerald-400 border border-emerald-950 text-xs font-medium flex items-center gap-1.5">
                  {c}
                  <button onClick={() => setConfluences(confluences.filter(x => x !== c))} className="text-gray-500 hover:text-rose-400">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Custom Mistakes */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-rose-400 block">Manage Mistake Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New mistake tag..."
                value={newMistake}
                onChange={(e) => setNewMistake(e.target.value)}
                className="flex-1 bg-[#0B0F19] border border-[#1F2937] rounded-lg px-3 py-1.5 text-white"
              />
              <button onClick={addMistake} className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-lg">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {mistakes.map(m => (
                <span key={m} className="px-2.5 py-1 rounded-lg bg-[#0B0F19] text-rose-400 border border-rose-950 text-xs font-medium flex items-center gap-1.5">
                  {m}
                  <button onClick={() => setMistakes(mistakes.filter(x => x !== m))} className="text-gray-500 hover:text-rose-400">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Export & Reset Actions */}
          <div className="pt-4 border-t border-[#1F2937] space-y-3">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Backup & Sample Data Reset</h4>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onExportJSON}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0B0F19] hover:bg-[#111827] text-gray-200 rounded-lg border border-gray-700"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" /> Export JSON Backup
              </button>

              <button
                onClick={onExportCSV}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#0B0F19] hover:bg-[#111827] text-gray-200 rounded-lg border border-gray-700"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" /> Export CSV Spreadsheet
              </button>

              <button
                onClick={() => {
                  if (confirm('Reset journal to sample starter dataset? Current edits will be replaced.')) {
                    onResetToSample();
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 ml-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset to Sample Data
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-2 border-t border-[#1F2937]">
            <button onClick={onClose} className="px-4 py-2 bg-[#1F2937] text-gray-300 rounded-lg">Cancel</button>
            <button onClick={handleSave} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg">Save Configuration</button>
          </div>

        </div>

      </div>
    </div>
  );
};

