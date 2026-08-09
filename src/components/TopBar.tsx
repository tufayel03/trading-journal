import React, { useState } from 'react';
import { 
  Menu, 
  Upload, 
  Plus, 
  BarChart3, 
  TrendingUp, 
  BrainCircuit, 
  BookOpen,
  DollarSign,
  Zap,
  ZoomIn,
  Check,
  Globe,
  ChevronDown,
  Layers,
  Palette
} from 'lucide-react';
import { UserSettings, AccountStatus } from '../types';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ThemeId, ZoomLevel } from '../lib/theme';

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
  accountStatus?: AccountStatus | null;
  accounts?: AccountStatus[];
  selectedAccount?: string;
  onSelectAccount?: (login: string) => void;
  onToggleAccountStatus?: (login: string, action: 'connect' | 'disconnect') => void;
  currentZoom?: ZoomLevel;
  onZoomChange?: (zoom: ZoomLevel) => void;
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
  onThemeChange,
  accountStatus,
  accounts = [],
  selectedAccount = 'ALL',
  onSelectAccount,
  onToggleAccountStatus,
  currentZoom = 115,
  onZoomChange
}) => {
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const zoomOptions: ZoomLevel[] = [95, 100, 105, 110, 115, 120, 125];

  const currentSelectedAccountObj = accounts.find(a => String(a.login) === selectedAccount);
  const isCentAccount = selectedAccount !== 'ALL' && (currentSelectedAccountObj?.isCent || currentSelectedAccountObj?.currency === 'USC');

  const displayEquity = selectedAccount === 'ALL'
    ? (accounts.length > 0 
        ? accounts.reduce((sum, a) => sum + (a.usdEquity || (a.isCent || a.currency === 'USC' ? (a.equity / 100) : a.equity) || (a.isCent || a.currency === 'USC' ? (a.balance / 100) : a.balance) || 0), 0)
        : (accountStatus?.equity !== undefined ? (accountStatus.isCent || accountStatus.currency === 'USC' ? accountStatus.equity / 100 : accountStatus.equity) : (settings.initialBalance + netProfit)))
    : (currentSelectedAccountObj?.equity !== undefined 
        ? currentSelectedAccountObj.equity 
        : (accountStatus?.equity !== undefined ? accountStatus.equity : (settings.initialBalance + netProfit)));

  const displayProfit = isCentAccount ? (netProfit * 100) : netProfit;
  const isPositive = netProfit >= 0;

  const tabLabels = {
    dashboard: 'Analytics Dashboard',
    trades: 'Trade Log Table',
    psychology: 'Psychology Engine',
    playbook: 'Playbook Setups'
  };

  return (
    <header className="bg-[var(--bg-card)]/90 backdrop-blur-md border-b border-[var(--border-color)] sticky top-0 z-30">
      <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
        
        {/* Left Section: Page Title & Account Switcher */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={openMobileMenu}
            className="lg:hidden p-1.5 text-[var(--text-secondary)] hover:text-white rounded-lg hover:bg-[var(--bg-card-hover)]"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <h1 className="text-sm sm:text-base font-bold text-[var(--text-primary)] tracking-tight">
            {tabLabels[activeTab]}
          </h1>

          {/* Clean Account Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
              className="h-7 px-2 text-xs font-semibold rounded-md bg-[var(--bg-canvas)] hover:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-color)] flex items-center gap-1.5 transition-colors"
            >
              {selectedAccount === 'ALL' ? (
                <>
                  <Globe className="w-3 h-3 text-cyan-400" />
                  <span className="font-bold text-cyan-300">All Accounts</span>
                </>
              ) : (
                <>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    currentSelectedAccountObj?.status === 'disconnected' 
                      ? 'bg-slate-400' 
                      : (isCentAccount ? 'bg-amber-400' : 'bg-emerald-400')
                  }`} />
                  <span className="font-bold text-[var(--text-primary)]">#{selectedAccount}</span>
                  <span className="text-[10px] text-[var(--text-muted)] hidden md:inline">
                    ({isCentAccount ? 'Cent USC' : (currentSelectedAccountObj?.server?.replace('Exness-', '') || 'USD')})
                  </span>
                  {currentSelectedAccountObj?.status === 'disconnected' && (
                    <span className="text-[9px] px-1 bg-slate-500/20 text-slate-400 rounded">Saved Vault</span>
                  )}
                </>
              )}
              <ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
            </button>

            {/* Account Switcher Dropdown */}
            {isAccountMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsAccountMenuOpen(false)} />
                <div className="absolute left-0 mt-1 w-80 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 p-2 space-y-1.5">
                  <div className="px-2 py-1 text-[10px] uppercase font-bold text-[var(--text-muted)] flex items-center justify-between border-b border-[var(--border-color)] pb-1.5">
                    <span>Manage Accounts</span>
                    <span className="text-[9px] text-emerald-400 font-normal flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> History Saved Forever
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      onSelectAccount?.('ALL');
                      setIsAccountMenuOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      selectedAccount === 'ALL'
                        ? 'bg-cyan-500/15 text-cyan-300'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-cyan-400" />
                      <span>All Accounts (Combined USD)</span>
                    </div>
                    {selectedAccount === 'ALL' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>

                  {accounts.map(acc => {
                    const isAccCent = acc.isCent || acc.currency === 'USC' || String(acc.server).toLowerCase().includes('cent');
                    const isSelected = selectedAccount === String(acc.login);
                    const isDisconnected = acc.status === 'disconnected';

                    return (
                      <div
                        key={acc.login}
                        className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors border ${
                          isSelected
                            ? (isAccCent ? 'bg-amber-500/15 border-amber-500/30' : 'bg-emerald-500/15 border-emerald-500/30')
                            : 'border-transparent hover:bg-[var(--bg-card-hover)]'
                        }`}
                      >
                        <div 
                          className="flex items-center gap-2 flex-1 cursor-pointer"
                          onClick={() => {
                            onSelectAccount?.(String(acc.login));
                            setIsAccountMenuOpen(false);
                          }}
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            isDisconnected ? 'bg-slate-500' : (isAccCent ? 'bg-amber-400' : 'bg-emerald-400')
                          } ${!isDisconnected ? 'animate-pulse' : ''}`} />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-[var(--text-primary)]">Account #{acc.login}</span>
                              <span className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                                isDisconnected 
                                  ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30' 
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {isDisconnected ? 'Disconnected (Saved)' : 'Connected'}
                              </span>
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">
                              {isAccCent 
                                ? `${(acc.equity || acc.balance || 0).toFixed(2)} USC (≈ $${(((acc.equity || acc.balance || 0) / 100)).toFixed(2)})`
                                : `$${(acc.equity || acc.balance || 0).toFixed(2)} USD`}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          {onToggleAccountStatus && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleAccountStatus(String(acc.login), isDisconnected ? 'connect' : 'disconnect');
                              }}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                                isDisconnected 
                                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-slate-700/50 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-600'
                              }`}
                              title={isDisconnected ? 'Reconnect live MT5 sync' : 'Disconnect account (keeps all trade history saved)'}
                            >
                              {isDisconnected ? 'Reconnect' : 'Disconnect'}
                            </button>
                          )}
                          {isSelected && <Check className={`w-3.5 h-3.5 ${isAccCent ? 'text-amber-400' : 'text-emerald-400'}`} />}
                        </div>
                      </div>
                    );
                  })}

                  <div className="border-t border-[var(--border-color)] my-1.5" />

                  <button
                    onClick={() => {
                      setIsAccountMenuOpen(false);
                      openMT5SyncModal();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-bold text-[var(--accent-gold)] hover:bg-[var(--accent-gold)]/10 flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Connect Additional MT5 Account</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Center / Right: Clean Live Equity + Unified Utility Strip + Actions */}
        <div className="flex items-center gap-3">
          
          {/* Minimalist Live Equity Display (Clean Typography, No Heavy Box) */}
          <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
            <span className="text-[10px] uppercase font-semibold text-[var(--text-muted)]">Equity:</span>
            <span className="font-extrabold text-[var(--text-primary)] text-sm">
              {isCentAccount 
                ? `${displayEquity.toFixed(2)} USC`
                : `$${displayEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
            {isCentAccount && (
              <span className="text-[10px] text-gray-400 font-normal">
                (≈ ${(displayEquity / 100).toFixed(2)})
              </span>
            )}
            <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded ${
              isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
            }`}>
              {isPositive ? '+' : ''}{isCentAccount ? `${displayProfit.toFixed(2)} USC` : `$${displayProfit.toFixed(2)}`}
            </span>
          </div>

          {/* Unified Toolstrip (Puts MT5 Sync, Zoom, and Theme into ONE single sleek pill) */}
          <div className="flex items-center bg-[var(--bg-canvas)] border border-[var(--border-color)] rounded-lg p-0.5 text-xs text-[var(--text-secondary)]">
            {/* MT5 Status */}
            <button
              onClick={openMT5SyncModal}
              className="px-2 py-1 hover:text-emerald-400 flex items-center gap-1 transition-colors rounded-md hover:bg-[var(--bg-card-hover)]"
              title="MT5 Sync Status"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden md:inline text-[11px] font-medium text-emerald-400">Live</span>
            </button>

            <span className="w-px h-3.5 bg-[var(--border-color)]" />

            {/* Zoom */}
            {onZoomChange && (
              <div className="relative">
                <button
                  onClick={() => setIsZoomOpen(!isZoomOpen)}
                  className="px-2 py-1 hover:text-white flex items-center gap-1 transition-colors rounded-md hover:bg-[var(--bg-card-hover)] font-mono text-[11px]"
                  title="Display Zoom"
                >
                  <ZoomIn className="w-3 h-3 text-[var(--accent-gold)]" />
                  <span>{currentZoom}%</span>
                </button>

                {isZoomOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsZoomOpen(false)} />
                    <div className="absolute right-0 mt-1 w-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 p-1 space-y-0.5">
                      {zoomOptions.map((z) => (
                        <button
                          key={z}
                          onClick={() => {
                            onZoomChange(z);
                            setIsZoomOpen(false);
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-xs font-semibold flex items-center justify-between ${
                            currentZoom === z
                              ? 'text-[var(--accent-gold)] bg-[var(--accent-gold)]/10'
                              : 'text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-card-hover)]'
                          }`}
                        >
                          <span>{z}%</span>
                          {currentZoom === z && <Check className="w-3 h-3" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <span className="w-px h-3.5 bg-[var(--border-color)]" />

            {/* Theme */}
            <div className="p-0.5">
              <ThemeSwitcher
                currentTheme={currentTheme}
                onThemeChange={onThemeChange}
                variant="compact"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={openManualModal}
              className="h-8 px-2.5 bg-[var(--bg-canvas)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] text-xs font-semibold rounded-lg border border-[var(--border-color)] transition-colors hidden md:flex items-center gap-1"
              title="Manual Trade"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Trade</span>
            </button>

            <button
              onClick={openImportModal}
              className="h-8 px-3 bg-[var(--accent-gold)] hover:bg-[var(--accent-gold-hover)] text-black text-xs font-extrabold rounded-lg shadow-sm transition-all flex items-center gap-1.5"
              title="Import CSV"
            >
              <Upload className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Import</span>
            </button>
          </div>

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
