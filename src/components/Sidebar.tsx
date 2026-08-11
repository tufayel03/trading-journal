import React, { useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  BrainCircuit, 
  BookOpen, 
  Upload, 
  Plus, 
  Settings, 
  Keyboard, 
  Download, 
  Flame, 
  ChevronLeft, 
  ChevronRight,
  DollarSign,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
  Zap,
  Video
} from 'lucide-react';
import { UserSettings, AccountStatus } from '../types';

interface SidebarProps {
  activeTab: 'dashboard' | 'trades' | 'replay' | 'psychology' | 'playbook';
  setActiveTab: (tab: 'dashboard' | 'trades' | 'replay' | 'psychology' | 'playbook') => void;
  settings: UserSettings;
  netProfit: number;
  openManualModal: () => void;
  openImportModal: () => void;
  openMT5SyncModal: () => void;
  openSettingsModal: () => void;
  openShortcutsModal: () => void;
  onExportJSON: () => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  accountStatus?: AccountStatus | null;
  accounts?: AccountStatus[];
  selectedAccount?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  settings,
  netProfit,
  openManualModal,
  openImportModal,
  openMT5SyncModal,
  openSettingsModal,
  openShortcutsModal,
  onExportJSON,
  isCollapsed,
  setIsCollapsed,
  accountStatus,
  accounts = [],
  selectedAccount = 'ALL'
}) => {
  const currentSelectedAccountObj = selectedAccount !== 'ALL' 
    ? accounts.find(a => String(a.login) === selectedAccount) || accountStatus
    : accountStatus;

  const isCentAccount = selectedAccount !== 'ALL' && (currentSelectedAccountObj?.isCent || currentSelectedAccountObj?.currency === 'USC');

  const liveEquity = selectedAccount === 'ALL'
    ? (accounts.length > 0 
        ? accounts.reduce((sum, a) => sum + (a.usdEquity || (a.isCent || a.currency === 'USC' ? (a.equity / 100) : a.equity) || (a.isCent || a.currency === 'USC' ? (a.balance / 100) : a.balance) || 0), 0)
        : (accountStatus?.equity !== undefined ? (accountStatus.isCent || accountStatus.currency === 'USC' ? accountStatus.equity / 100 : accountStatus.equity) : (settings.initialBalance + netProfit)))
    : (currentSelectedAccountObj 
        ? (isCentAccount ? currentSelectedAccountObj.equity : (currentSelectedAccountObj.usdEquity || currentSelectedAccountObj.equity))
        : (settings.initialBalance + netProfit));

  const startingCapital = selectedAccount === 'ALL'
    ? (accounts.length > 0 
        ? (accounts.some(a => a.status !== 'archived' && a.initialDeposit && a.initialDeposit > 0)
            ? accounts.reduce((sum, a) => a.status === 'archived' ? sum : (sum + (a.initialDeposit || a.usdBalance || (a.isCent || a.currency === 'USC' ? a.balance / 100 : a.balance) || 0)), 0)
            : Math.max(0, Number((accounts.reduce((sum, a) => a.status === 'archived' ? sum : (sum + (a.usdBalance || (a.isCent || a.currency === 'USC' ? (a.balance / 100) : a.balance) || 0)), 0) - netProfit).toFixed(2))))
        : (accountStatus?.initialDeposit && accountStatus.initialDeposit > 0 ? accountStatus.initialDeposit : (accountStatus?.balance !== undefined ? Math.max(0, Number(((accountStatus.isCent || accountStatus.currency === 'USC' ? accountStatus.balance / 100 : accountStatus.balance) - netProfit).toFixed(2))) : settings.initialBalance)))
    : (currentSelectedAccountObj 
        ? (currentSelectedAccountObj.initialDeposit && currentSelectedAccountObj.initialDeposit > 0
            ? (isCentAccount ? (currentSelectedAccountObj.nativeInitialDeposit || currentSelectedAccountObj.initialDeposit * 100) : currentSelectedAccountObj.initialDeposit)
            : Math.max(0, Number((currentSelectedAccountObj.balance - (isCentAccount ? netProfit * 100 : netProfit)).toFixed(2))))
        : settings.initialBalance);

  const displayProfit = isCentAccount ? (netProfit * 100) : netProfit;
  const isPositive = netProfit >= 0;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Analytics Dashboard',
      shortLabel: 'Analytics',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'trades',
      label: 'Trade Log Table',
      shortLabel: 'Trade Log',
      icon: TrendingUp,
      badge: null
    },
    {
      id: 'replay',
      label: 'Trade Replay Studio',
      shortLabel: 'Replay',
      icon: Video,
      badge: 'PRO'
    },
    {
      id: 'psychology',
      label: 'Psychology Engine',
      shortLabel: 'Psychology',
      icon: BrainCircuit,
      badge: 'AI'
    },
    {
      id: 'playbook',
      label: 'Playbook Setups',
      shortLabel: 'Playbook',
      icon: BookOpen,
      badge: null
    }
  ] as const;

  return (
    <aside className={`bg-[var(--bg-canvas)] border-r border-[var(--border-color)] flex flex-col justify-between transition-all duration-300 z-30 shrink-0 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      
      {/* Top Brand Section */}
      <div>
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-[var(--accent-gold)] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.35)] shrink-0 text-black">
              <Flame className="w-6 h-6 fill-black text-black" />
            </div>
            
            {!isCollapsed && (
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-[var(--text-primary)] tracking-tight uppercase">HYPERTRADE</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 tracking-wider">
                    PRO
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] truncate">AI Trading Journal</p>
              </div>
            )}
          </div>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Quick Actions Panel */}
        <div className="p-3 border-b border-[var(--border-color)] space-y-2">
          
          {/* MT5 Real-time Auto-sync */}
          <button
            onClick={openMT5SyncModal}
            title="Auto-Sync Trades from MT5"
            className={`w-full flex items-center justify-center gap-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs rounded-xl border border-emerald-500/30 transition-all ${
              isCollapsed ? 'px-0' : 'px-3'
            }`}
          >
            <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
            {!isCollapsed && <span>Auto-Sync MT5</span>}
          </button>

          <button
            onClick={openImportModal}
            title="Import MT4/MT5/Broker CSV or HTML (Shortcut: I)"
            className={`w-full flex items-center justify-center gap-2 py-2 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-black font-bold text-xs rounded-xl shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all ${
              isCollapsed ? 'px-0' : 'px-3'
            }`}
          >
            <Upload className="w-4 h-4 stroke-[2.5] shrink-0" />
            {!isCollapsed && <span>Import Broker CSV</span>}
          </button>

          <button
            onClick={openManualModal}
            title="Add Trade Manually (Shortcut: N)"
            className={`w-full flex items-center justify-center gap-2 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] border border-[var(--border-color)] text-xs font-semibold rounded-xl transition-all ${
              isCollapsed ? 'px-0' : 'px-3'
            }`}
          >
            <Plus className="w-4 h-4 text-[var(--accent-green)] stroke-[2.5] shrink-0" />
            {!isCollapsed && <span>Manual Entry</span>}
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="p-2 space-y-1">
          <div className={`px-3 py-1.5 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest ${
            isCollapsed ? 'text-center' : ''
          }`}>
            {isCollapsed ? '•••' : 'Main Menu'}
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all relative ${
                  isActive
                    ? 'bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-md'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]/60'
                }`}
                title={item.label}
              >
                {/* Active glow indicator strip */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-[var(--accent-gold)] rounded-r-full shadow-[0_0_8px_var(--accent-gold)]" />
                )}

                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-[var(--accent-gold)]' : 'text-[var(--text-secondary)]'}`} />

                {!isCollapsed && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Account Equity Widget & System Controls */}
      <div className="p-3 border-t border-[var(--border-color)] space-y-3">
        
        {/* Account Balance Widget */}
        {!isCollapsed ? (
          <div className="bg-[var(--bg-card)] p-3 rounded-xl border border-[var(--border-color)] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-[var(--accent-green)]" /> Equity
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                isPositive ? 'bg-[var(--accent-green)]/15 text-[var(--accent-green)]' : 'bg-[var(--accent-red)]/15 text-[var(--accent-red)]'
              }`}>
                {isPositive ? '+' : ''}{isCentAccount ? `${displayProfit.toFixed(2)} USC` : `$${displayProfit.toFixed(2)}`}
              </span>
            </div>

            <div className="text-base font-extrabold text-[var(--text-primary)] font-mono tracking-tight flex items-baseline gap-1.5 flex-wrap">
              <span>{isCentAccount ? `${liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USC` : `$${liveEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</span>
              {isCentAccount && (
                <span className="text-[10px] text-gray-400 font-normal">
                  (≈ ${(liveEquity / 100).toFixed(2)} USD)
                </span>
              )}
            </div>

            <div className="text-[10px] text-[var(--text-muted)] flex justify-between items-center">
              <span>Capital: {isCentAccount ? `${startingCapital.toLocaleString()} USC` : `$${startingCapital.toLocaleString()}`}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                isCentAccount ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}>
                {selectedAccount === 'ALL' ? (accounts.length > 0 ? `${accounts.length} Accounts` : 'All Accounts') : (isCentAccount ? `Cent #${selectedAccount}` : `Acc #${selectedAccount}`)}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-2 bg-[var(--bg-card)] rounded-xl border border-[var(--border-color)] text-center" title={`Equity: ${isCentAccount ? `${liveEquity.toFixed(2)} USC` : `$${liveEquity.toFixed(2)}`}`}>
            <DollarSign className="w-4 h-4 text-[var(--accent-green)]" />
            <span className={`text-[10px] font-bold ${isPositive ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
              {netProfit >= 0 ? '+' : ''}{isCentAccount ? `${Math.round(displayProfit)} USC` : `$${Math.round(netProfit)}`}
            </span>
          </div>
        )}

        {/* System Settings & Utilities */}
        <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col justify-center' : 'justify-between'}`}>
          <button
            onClick={openSettingsModal}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors flex items-center gap-2 text-xs"
            title="Account Configuration"
          >
            <Settings className="w-4 h-4" />
            {!isCollapsed && <span>Settings</span>}
          </button>

          <button
            onClick={openShortcutsModal}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors flex items-center gap-2 text-xs"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="w-4 h-4" />
            {!isCollapsed && <span>Keys</span>}
          </button>

          <button
            onClick={onExportJSON}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] rounded-lg transition-colors"
            title="Export Backup JSON"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

      </div>

    </aside>
  );
};
