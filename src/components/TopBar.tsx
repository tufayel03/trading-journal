import React from 'react';
import { 
  Menu, 
  Search, 
  Download, 
  Upload, 
  Plus, 
  Flame, 
  BarChart3, 
  TrendingUp, 
  BrainCircuit, 
  BookOpen,
  DollarSign,
  Zap
} from 'lucide-react';
import { UserSettings } from '../types';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ThemeId } from '../lib/theme';

interface TopBarProps {
  activeTab: 'dashboard' | 'trades' | 'psychology' | 'playbook';
  setActiveTab: (tab: 'dashboard' | 'trades' | 'psychology' | 'playbook') => void;
  openMobileMenu: () => void;
  openManualModal: () => void;
  openImportModal: () => void;
  openMT5SyncModal: () => void;
  settings: UserSettings;
  netProfit: number;
  currentTheme: ThemeId;
  onThemeChange: (themeId: ThemeId) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  openMobileMenu,
  openManualModal,
  openImportModal,
  openMT5SyncModal,
  settings,
  netProfit,
  currentTheme,
  onThemeChange
}) => {
  const currentEquity = settings.initialBalance + netProfit;
  const isPositive = netProfit >= 0;

  const titles = {
    dashboard: { name: 'Analytics Dashboard', desc: 'Performance metrics, win rate, & equity growth engine' },
    trades: { name: 'Trade Log Table', desc: 'Detailed execution records & screenshot reviews' },
    psychology: { name: 'Psychology Engine', desc: 'Mindset analytics, tilt warning system, & emotional discipline' },
    playbook: { name: 'Playbook Setups', desc: 'High probability trading models & setup rules' }
  };

  return (
    <header className="bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-20 shadow-md">
      <div className="px-4 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        
        {/* Left: Mobile Drawer Trigger + Active Page Context */}
        <div className="flex items-center gap-3">
          <button
            onClick={openMobileMenu}
            className="lg:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors border border-[var(--border-color)]"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--accent-gold)] tracking-wider uppercase">
                EXNESS / {activeTab}
              </span>
            </div>
            <h1 className="text-lg font-extrabold text-[var(--text-primary)] tracking-tight">
              {titles[activeTab].name}
            </h1>
          </div>
        </div>

        {/* Right Action & Equity Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* MT5 Live Sync Button with pulsing green status */}
          <button
            onClick={openMT5SyncModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30 transition-all shadow-sm"
            title="Auto-Sync Trades directly from Exness MT5"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Auto-Sync MT5</span>
          </button>

          {/* Theme Selector Popover */}
          <ThemeSwitcher
            currentTheme={currentTheme}
            onThemeChange={onThemeChange}
            variant="popover"
          />

          {/* Top Equity Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-color)]">
            <DollarSign className="w-4 h-4 text-[var(--accent-green)]" />
            <div className="text-left">
              <div className="text-[9px] text-[var(--text-secondary)] uppercase font-semibold">Live Equity</div>
              <div className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5 font-mono">
                ${currentEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className={`text-[10px] font-bold px-1 rounded ${
                  isPositive ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]' : 'bg-[var(--accent-red)]/10 text-[var(--accent-red)]'
                }`}>
                  {isPositive ? '+' : ''}${netProfit.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <button
            onClick={openManualModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card-hover)] hover:opacity-90 text-[var(--text-primary)] text-xs font-medium rounded-lg border border-[var(--border-color)] transition-colors"
          >
            <Plus className="w-4 h-4 text-[var(--accent-green)] stroke-[2.5]" />
            <span>Manual Trade</span>
          </button>

          <button
            onClick={openImportModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-black text-xs font-bold rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Import Exness CSV</span>
            <span className="sm:hidden">Import</span>
          </button>

        </div>

      </div>

      {/* Mobile Tab Navigation Strip */}
      <div className="flex lg:hidden items-center justify-around py-2 bg-[var(--bg-canvas)] border-t border-[var(--border-color)] text-xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-1.5 font-bold ${
            activeTab === 'dashboard' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`flex items-center gap-1.5 font-bold ${
            activeTab === 'trades' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Trades</span>
        </button>
        <button
          onClick={() => setActiveTab('psychology')}
          className={`flex items-center gap-1.5 font-bold ${
            activeTab === 'psychology' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          <BrainCircuit className="w-4 h-4" />
          <span>Psychology</span>
        </button>
        <button
          onClick={() => setActiveTab('playbook')}
          className={`flex items-center gap-1.5 font-bold ${
            activeTab === 'playbook' ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Playbook</span>
        </button>
      </div>
    </header>
  );
};
