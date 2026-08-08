import React, { useState, useEffect, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { FilterBar } from './components/FilterBar';
import { KPIOverview } from './components/Analytics/KPIOverview';
import { EquityCurveChart } from './components/Analytics/EquityCurveChart';
import { CalendarHeatmap } from './components/Analytics/CalendarHeatmap';
import { MistakeBreakdownChart } from './components/Analytics/MistakeBreakdownChart';
import { PairAndSessionCharts } from './components/Analytics/PairAndSessionCharts';
import { StrategyBreakdown } from './components/Analytics/StrategyBreakdown';
import { TradeTable } from './components/Trades/TradeTable';
import { TradeDetailModal } from './components/Trades/TradeDetailModal';
import { ManualTradeModal } from './components/Trades/ManualTradeModal';
import { CSVImporterModal } from './components/Trades/CSVImporterModal';
import { MT5SyncModal } from './components/Trades/MT5SyncModal';
import { PsychologyDashboard } from './components/Psychology/PsychologyDashboard';
import { PlaybookView } from './components/Playbook/PlaybookView';
import { SettingsModal } from './components/Settings/SettingsModal';
import { KeyboardShortcutsModal } from './components/Common/KeyboardShortcutsModal';
import { X, Zap } from 'lucide-react';

import { Trade, PlaybookSetup, UserSettings, FilterOptions } from './types';
import { loadTrades, saveTrades, loadPlaybook, savePlaybook, loadSettings, saveSettings, exportBackupJSON, exportTradesCSV, resetToSampleData } from './lib/storage';
import { calculateKPIStats, normalizeSymbol } from './lib/calculations';
import { ThemeId, applyTheme, loadSavedTheme } from './lib/theme';

export default function App() {
  const [trades, setTrades] = useState<Trade[]>(() => loadTrades());
  const [playbook, setPlaybook] = useState<PlaybookSetup[]>(() => loadPlaybook());
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => loadSavedTheme());

  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'trades' | 'psychology' | 'playbook'>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'ALL',
    symbol: 'ALL',
    session: 'ALL',
    strategy: 'ALL',
    mistake: 'ALL',
    emotion: 'ALL',
    direction: 'ALL',
    outcome: 'ALL',
    searchQuery: ''
  });

  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null);

  // Modals state
  const [selectedTradeForDetail, setSelectedTradeForDetail] = useState<Trade | null>(null);
  const [tradeToEdit, setTradeToEdit] = useState<Trade | null>(null);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isMT5SyncModalOpen, setIsMT5SyncModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [liveSyncToast, setLiveSyncToast] = useState<string | null>(null);

  // Auto-sync polling: Checks local server for trades pushed by MT5 EA
  useEffect(() => {
    const checkLiveTrades = async () => {
      try {
        const res = await fetch('/api/webhook/trade');
        if (res.ok) {
          const syncedTrades: Trade[] = await res.json();
          if (Array.isArray(syncedTrades) && syncedTrades.length > 0) {
            setTrades(current => {
              let updated = false;
              const next = [...current];
              syncedTrades.forEach(st => {
                const exists = next.some(t => (st.ticket && t.ticket === st.ticket) || t.id === st.id);
                if (!exists) {
                  next.unshift(st);
                  updated = true;
                }
              });
              if (updated) {
                saveTrades(next);
                setLiveSyncToast(`Auto-synced new trade from Exness MT5!`);
                setTimeout(() => setLiveSyncToast(null), 4000);
                return next;
              }
              return current;
            });
          }
        }
      } catch {
        // Dev server or endpoint offline
      }
    };

    const interval = setInterval(checkLiveTrades, 3000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setTradeToEdit(null);
        setIsManualModalOpen(true);
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setIsImportModalOpen(true);
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        setIsMT5SyncModalOpen(true);
      } else if (e.key === '1') {
        setActiveTab('dashboard');
      } else if (e.key === '2') {
        setActiveTab('trades');
      } else if (e.key === '3') {
        setActiveTab('psychology');
      } else if (e.key === '4') {
        setActiveTab('playbook');
      } else if (e.key === 'Escape') {
        setSelectedTradeForDetail(null);
        setTradeToEdit(null);
        setIsManualModalOpen(false);
        setIsImportModalOpen(false);
        setIsMT5SyncModalOpen(false);
        setIsSettingsModalOpen(false);
        setIsShortcutsModalOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save changes to localStorage when updated
  const updateTradesState = (newTrades: Trade[]) => {
    setTrades(newTrades);
    saveTrades(newTrades);
  };

  const updatePlaybookState = (newPlaybook: PlaybookSetup[]) => {
    setPlaybook(newPlaybook);
    savePlaybook(newPlaybook);
  };

  const updateSettingsState = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  // Filtered symbols list for filter bar
  const availableSymbols = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => set.add(normalizeSymbol(t.symbol)));
    return Array.from(set);
  }, [trades]);

  // Main Trade Filter Engine
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      // Date Range Filter
      if (filters.dateRange !== 'ALL') {
        const tradeDate = new Date(t.closeTime);
        const now = new Date();
        
        if (filters.dateRange === 'TODAY') {
          if (tradeDate.toDateString() !== now.toDateString()) return false;
        } else if (filters.dateRange === 'THIS_WEEK') {
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          if (tradeDate < startOfWeek) return false;
        } else if (filters.dateRange === 'THIS_MONTH') {
          if (tradeDate.getMonth() !== now.getMonth() || tradeDate.getFullYear() !== now.getFullYear()) return false;
        } else if (filters.dateRange === 'LAST_MONTH') {
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          if (tradeDate.getMonth() !== lastMonth.getMonth() || tradeDate.getFullYear() !== lastMonth.getFullYear()) return false;
        }
      }

      // Calendar Heatmap Day Selection
      if (selectedCalendarDate) {
        const tDate = t.closeTime.split('T')[0];
        if (tDate !== selectedCalendarDate) return false;
      }

      // Symbol
      if (filters.symbol !== 'ALL') {
        const norm = normalizeSymbol(t.symbol);
        if (filters.symbol === 'XAUUSD' && norm !== 'XAUUSD') return false;
        if (filters.symbol === 'FOREX' && norm === 'XAUUSD') return false;
        if (filters.symbol !== 'XAUUSD' && filters.symbol !== 'FOREX' && norm !== filters.symbol) return false;
      }

      // Session
      if (filters.session !== 'ALL' && t.session !== filters.session) return false;

      // Strategy
      if (filters.strategy !== 'ALL' && t.strategy !== filters.strategy) return false;

      // Mistake
      if (filters.mistake !== 'ALL') {
        if (filters.mistake === 'NONE') {
          if (t.mistakes && t.mistakes.length > 0) return false;
        } else {
          if (!t.mistakes || !t.mistakes.includes(filters.mistake)) return false;
        }
      }

      // Outcome
      if (filters.outcome !== 'ALL') {
        if (filters.outcome === 'WIN' && t.netProfit <= 0.5) return false;
        if (filters.outcome === 'LOSS' && t.netProfit >= -0.5) return false;
        if (filters.outcome === 'BREAK_EVEN' && (t.netProfit > 0.5 || t.netProfit < -0.5)) return false;
      }

      // Search Query
      if (filters.searchQuery.trim() !== '') {
        const q = filters.searchQuery.toLowerCase();
        const matchSymbol = t.symbol.toLowerCase().includes(q);
        const matchTicket = (t.ticket || '').toLowerCase().includes(q);
        const matchStrategy = (t.strategy || '').toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchSymbol && !matchTicket && !matchStrategy && !matchNotes) return false;
      }

      return true;
    });
  }, [trades, filters, selectedCalendarDate]);

  // Overall KPI Stats
  const kpiStats = useMemo(() => {
    return calculateKPIStats(filteredTrades, settings.initialBalance);
  }, [filteredTrades, settings.initialBalance]);

  // Overall Net Profit across all trades for Equity pill
  const overallNetProfit = useMemo(() => {
    return trades.reduce((sum, t) => sum + t.netProfit, 0);
  }, [trades]);

  // Trade Actions
  const handleSaveTrade = (savedTrade: Trade) => {
    const index = trades.findIndex(t => t.id === savedTrade.id);
    if (index >= 0) {
      const next = [...trades];
      next[index] = savedTrade;
      updateTradesState(next);
    } else {
      updateTradesState([savedTrade, ...trades]);
    }
  };

  const handleDeleteTrade = (tradeId: string) => {
    updateTradesState(trades.filter(t => t.id !== tradeId));
    if (selectedTradeForDetail?.id === tradeId) setSelectedTradeForDetail(null);
  };

  const handleConfirmCSVImport = (importedTrades: Trade[], replaceExisting: boolean) => {
    if (replaceExisting) {
      updateTradesState(importedTrades);
    } else {
      updateTradesState([...importedTrades, ...trades]);
    }
  };

  const handleAddPlaybookSetup = (setup: PlaybookSetup) => {
    updatePlaybookState([setup, ...playbook]);
  };

  const handleDeletePlaybookSetup = (id: string) => {
    updatePlaybookState(playbook.filter(p => p.id !== id));
  };

  const handleResetToSample = () => {
    const res = resetToSampleData();
    setTrades(res.trades);
    setPlaybook(res.playbook);
    setSettings(res.settings);
  };

  return (
    <div className="flex h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans overflow-hidden transition-colors duration-300">
      
      {/* Live Sync Toast Banner */}
      {liveSyncToast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-2xl animate-bounce text-xs font-bold">
          <Zap className="w-4 h-4 fill-white" />
          <span>{liveSyncToast}</span>
        </div>
      )}

      {/* Desktop Vertical Sidepanel */}
      <div className="hidden lg:flex shrink-0 h-full">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setIsMobileMenuOpen(false);
          }}
          settings={settings}
          netProfit={overallNetProfit}
          openManualModal={() => {
            setTradeToEdit(null);
            setIsManualModalOpen(true);
          }}
          openImportModal={() => setIsImportModalOpen(true)}
          openMT5SyncModal={() => setIsMT5SyncModalOpen(true)}
          openSettingsModal={() => setIsSettingsModalOpen(true)}
          openShortcutsModal={() => setIsShortcutsModalOpen(true)}
          onExportJSON={() => exportBackupJSON(trades, playbook, settings)}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
      </div>

      {/* Mobile Slide-over Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-72 h-full bg-[var(--bg-canvas)] flex flex-col">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsMobileMenuOpen(false);
              }}
              settings={settings}
              netProfit={overallNetProfit}
              openManualModal={() => {
                setTradeToEdit(null);
                setIsManualModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              openImportModal={() => {
                setIsImportModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              openMT5SyncModal={() => {
                setIsMT5SyncModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              openSettingsModal={() => {
                setIsSettingsModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              openShortcutsModal={() => {
                setIsShortcutsModalOpen(true);
                setIsMobileMenuOpen(false);
              }}
              onExportJSON={() => exportBackupJSON(trades, playbook, settings)}
              isCollapsed={false}
              setIsCollapsed={() => {}}
            />
          </div>
        </div>
      )}

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header Navbar */}
        <TopBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          openMobileMenu={() => setIsMobileMenuOpen(true)}
          openManualModal={() => {
            setTradeToEdit(null);
            setIsManualModalOpen(true);
          }}
          openImportModal={() => setIsImportModalOpen(true)}
          openMT5SyncModal={() => setIsMT5SyncModalOpen(true)}
          settings={settings}
          netProfit={overallNetProfit}
          currentTheme={currentTheme}
          onThemeChange={setCurrentTheme}
        />

        {/* Main Workspace Canvas */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          
          {/* Global Filter Bar */}
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            settings={settings}
            symbols={availableSymbols}
            totalMatches={filteredTrades.length}
          />

          {/* TAB 1: ANALYTICS DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fadeIn">
              <KPIOverview stats={kpiStats} />
              <EquityCurveChart trades={filteredTrades} initialBalance={settings.initialBalance} />
              <CalendarHeatmap
                trades={trades}
                selectedDate={selectedCalendarDate}
                onSelectDate={setSelectedCalendarDate}
              />
              <PairAndSessionCharts trades={filteredTrades} />
              <MistakeBreakdownChart trades={filteredTrades} />
              <StrategyBreakdown trades={filteredTrades} />
            </div>
          )}

          {/* TAB 2: TRADE LOG TABLE */}
          {activeTab === 'trades' && (
            <div className="animate-fadeIn space-y-6">
              <KPIOverview stats={kpiStats} />
              <TradeTable
                trades={filteredTrades}
                onViewTrade={(trade) => setSelectedTradeForDetail(trade)}
                onEditTrade={(trade) => {
                  setTradeToEdit(trade);
                  setIsManualModalOpen(true);
                }}
                onDeleteTrade={handleDeleteTrade}
                onExportSelected={(selectedList) => exportTradesCSV(selectedList)}
              />
            </div>
          )}

          {/* TAB 3: PSYCHOLOGY ENGINE */}
          {activeTab === 'psychology' && (
            <div className="animate-fadeIn">
              <PsychologyDashboard trades={filteredTrades} />
            </div>
          )}

          {/* TAB 4: PLAYBOOK SETUPS */}
          {activeTab === 'playbook' && (
            <div className="animate-fadeIn">
              <PlaybookView
                playbook={playbook}
                trades={trades}
                onAddSetup={handleAddPlaybookSetup}
                onDeleteSetup={handleDeletePlaybookSetup}
              />
            </div>
          )}

        </main>
      </div>

      {/* MODALS */}
      <TradeDetailModal
        trade={selectedTradeForDetail}
        onClose={() => setSelectedTradeForDetail(null)}
        onUpdateTrade={handleSaveTrade}
      />

      <ManualTradeModal
        isOpen={isManualModalOpen}
        onClose={() => {
          setIsManualModalOpen(false);
          setTradeToEdit(null);
        }}
        onSaveTrade={handleSaveTrade}
        settings={settings}
        tradeToEdit={tradeToEdit}
      />

      <CSVImporterModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirmImport={handleConfirmCSVImport}
      />

      <MT5SyncModal
        isOpen={isMT5SyncModalOpen}
        onClose={() => setIsMT5SyncModalOpen(false)}
        onSyncNewTrades={(newTrades) => {
          updateTradesState([...newTrades, ...trades]);
        }}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSaveSettings={updateSettingsState}
        onResetToSample={handleResetToSample}
        onExportJSON={() => exportBackupJSON(trades, playbook, settings)}
        onExportCSV={() => exportTradesCSV(trades)}
        currentTheme={currentTheme}
        onThemeChange={setCurrentTheme}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

    </div>
  );
}
