import React from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  BookOpen, 
  BrainCircuit, 
  Upload, 
  Plus, 
  Settings, 
  Keyboard, 
  DollarSign, 
  Download,
  Flame
} from 'lucide-react';
import { UserSettings } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'trades' | 'psychology' | 'playbook';
  setActiveTab: (tab: 'dashboard' | 'trades' | 'psychology' | 'playbook') => void;
  settings: UserSettings;
  netProfit: number;
  openManualModal: () => void;
  openImportModal: () => void;
  openSettingsModal: () => void;
  openShortcutsModal: () => void;
  onExportJSON: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  settings,
  netProfit,
  openManualModal,
  openImportModal,
  openSettingsModal,
  openShortcutsModal,
  onExportJSON
}) => {
  const currentEquity = settings.initialBalance + netProfit;
  const isPositive = netProfit >= 0;

  return (
    <header className="bg-[#111827] border-b border-[#1F2937] sticky top-0 z-30 shadow-lg">
      <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 bg-[#F59E0B] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] text-black">
              <Flame className="w-6 h-6 fill-black text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base text-white tracking-tight uppercase">HYPERTRADE</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30 tracking-wider">
                  PRO JOURNAL
                </span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5">Professional AI Trading Journal & Analytics</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-[#0B0F19] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-[#10B981] text-black font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-[#111827]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>

            <button
              onClick={() => setActiveTab('trades')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'trades'
                  ? 'bg-[#10B981] text-black font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-[#111827]'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Trade Log
            </button>

            <button
              onClick={() => setActiveTab('psychology')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'psychology'
                  ? 'bg-[#10B981] text-black font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-[#111827]'
              }`}
            >
              <BrainCircuit className="w-4 h-4" />
              Psychology Engine
            </button>

            <button
              onClick={() => setActiveTab('playbook')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'playbook'
                  ? 'bg-[#10B981] text-black font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-white hover:bg-[#111827]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Playbook Setups
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2.5">
            
            {/* Account Balance Widget */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#0B0F19] rounded-xl border border-slate-800">
              <DollarSign className="w-4 h-4 text-[#10B981]" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Current Equity</div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  ${currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className={`text-[10px] font-bold px-1 rounded ${
                    isPositive ? 'bg-[#10B981]/10 text-[#10B981]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                  }`}>
                    {isPositive ? '+' : ''}${netProfit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Manual Trade */}
            <button
              onClick={openManualModal}
              title="Add Trade Manually (Shortcut: N)"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1F2937] hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span className="hidden sm:inline">Manual Entry</span>
            </button>

            {/* Import Broker CSV */}
            <button
              onClick={openImportModal}
              title="Import MT4/MT5/Broker CSV or HTML (Shortcut: I)"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#F59E0B] hover:bg-[#d97706] text-black text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Import Broker CSV</span>
            </button>

            {/* Auxiliary Tools */}
            <div className="flex items-center gap-1 pl-1 border-l border-gray-800">
              <button
                onClick={onExportJSON}
                title="Export Backup JSON"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={openShortcutsModal}
                title="Keyboard Shortcuts"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors hidden sm:block"
              >
                <Keyboard className="w-4 h-4" />
              </button>

              <button
                onClick={openSettingsModal}
                title="Account & Tag Settings"
                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>

        {/* Mobile Navigation Bar */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-[#1F2937]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
              activeTab === 'dashboard' ? 'text-emerald-400' : 'text-gray-400'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
              activeTab === 'trades' ? 'text-emerald-400' : 'text-gray-400'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Trades
          </button>
          <button
            onClick={() => setActiveTab('psychology')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
              activeTab === 'psychology' ? 'text-purple-400' : 'text-gray-400'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            Psychology
          </button>
          <button
            onClick={() => setActiveTab('playbook')}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium ${
              activeTab === 'playbook' ? 'text-amber-400' : 'text-gray-400'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Playbook
          </button>
        </div>

      </div>
    </header>
  );
};
